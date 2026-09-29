// Mesma ideia de fileToDownscaledDataURL, mas a partir de uma URL já servida
// (ex.: um token da biblioteca do mestre, `/tokens/:id`) em vez de um File —
// usado ao arrastar um token da biblioteca pro mapa: a imagem também vira
// data URL embutida no token (mesmo formato de sempre), não uma referência
// de rede, então continua funcionando pros jogadores mesmo que o arquivo
// original na biblioteca do mestre depois seja apagado/renomeado.
export function urlToDownscaledDataURL(url: string, maxDim: number, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve('');
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) return resolve('');
      if (Math.max(w, h) > maxDim) {
        const k = maxDim / Math.max(w, h);
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) return resolve('');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        let out = cv.toDataURL('image/webp', quality);
        if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', quality);
        resolve(out);
      } catch {
        resolve('');
      }
    };
    img.src = url;
  });
}

// Lê qualquer arquivo binário (ex.: um modelo .glb) como data URL cru, sem
// passar por canvas/imagem — usado pra embutir modelos 3D do mesmo jeito que
// imagens (mesmo motivo: precisa funcionar sem depender de rede entre
// máquinas, ver nota em urlToDownscaledDataURL acima).
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}

// Acha o retângulo de pixels não-transparentes de um canvas já desenhado —
// usado por fileToStandingDataURL abaixo pra descobrir onde o desenho de
// verdade começa/termina dentro da imagem (ela pode ter uma margem
// transparente generosa ao redor, comum em clipart/renders exportados).
function opaqueBounds(ctx: CanvasRenderingContext2D, w: number, h: number) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  } catch {
    // getImageData pode falhar (canvas "contaminado" por CORS) — devolve a
    // imagem inteira sem recortar em vez de quebrar a importação.
    return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1 };
  }
  if (maxX < minX || maxY < minY) return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1 }; // totalmente transparente
  return { minX, minY, maxX, maxY };
}

// Igual fileToDownscaledDataURL, mas primeiro recorta a margem transparente
// ao redor do desenho — pensado pra objetos "em pé" (árvore, poste) e tokens
// na mesa 3D: como a altura deles é calculada assumindo que o desenho ocupa
// a imagem INTEIRA de cima a baixo, uma margem transparente embaixo faz o
// objeto "flutuar" (a base do desenho fica acima do y=0 do chão). Recortando
// aqui, a base do desenho passa a coincidir com a borda de baixo da imagem —
// e portanto com o chão. Não usar em fundo de mapa/decalque/textura de chão
// (esses querem a imagem exatamente como importada, sem recorte).
export function fileToStandingDataURL(file: File, maxDim: number, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      if (!raw) return resolve('');
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        const fullW = img.naturalWidth || img.width;
        const fullH = img.naturalHeight || img.height;
        if (!fullW || !fullH) return resolve(raw);

        // acha a margem numa versão reduzida (rápido de escanear pixel a
        // pixel), depois mapeia o recorte de volta pra imagem em tamanho cheio.
        const probeMax = 512;
        const pk = Math.min(1, probeMax / Math.max(fullW, fullH));
        const probeW = Math.max(1, Math.round(fullW * pk));
        const probeH = Math.max(1, Math.round(fullH * pk));
        const probe = document.createElement('canvas');
        probe.width = probeW;
        probe.height = probeH;
        const pctx = probe.getContext('2d');
        if (!pctx) return resolve(raw);
        pctx.drawImage(img, 0, 0, probeW, probeH);
        const b = opaqueBounds(pctx, probeW, probeH);
        const sx = fullW / probeW;
        const sy = fullH / probeH;
        const minX = Math.max(0, Math.floor(b.minX * sx));
        const minY = Math.max(0, Math.floor(b.minY * sy));
        const maxX = Math.min(fullW - 1, Math.ceil((b.maxX + 1) * sx) - 1);
        const maxY = Math.min(fullH - 1, Math.ceil((b.maxY + 1) * sy) - 1);
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        let w = cropW;
        let h = cropH;
        if (Math.max(w, h) > maxDim) {
          const k = maxDim / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
        }
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) return resolve(raw);
        ctx.drawImage(img, minX, minY, cropW, cropH, 0, 0, w, h);
        try {
          let out = cv.toDataURL('image/webp', quality);
          if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', quality);
          resolve(out);
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

// Converte um arquivo de imagem (qualquer formato que o navegador decodifique:
// png, jpg, webp, gif, bmp, svg...) para um data URL já reduzido, de modo que
// caiba no localStorage / no JSONB da sala. Formatos que o canvas não decodifica
// (ex.: heic) caem no data URL cru.
export function fileToDownscaledDataURL(file: File, maxDim: number, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      if (!raw) return resolve('');
      const img = new Image();
      img.onerror = () => resolve(raw);
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) return resolve(raw);
        if (Math.max(w, h) > maxDim) {
          const k = maxDim / Math.max(w, h);
          w = Math.round(w * k);
          h = Math.round(h * k);
        }
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) return resolve(raw);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          let out = cv.toDataURL('image/webp', quality);
          if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', quality);
          resolve(out);
        } catch {
          resolve(raw);
        }
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
