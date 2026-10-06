import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { randomColor, uid } from '../lib/ids';
import { fileToDownscaledDataURL, urlToDownscaledDataURL } from '../lib/image';
import { askText } from '../state/promptDialog';
import { TOKEN_DRAG_MIME, tokenAssetUrl, type TokenDragPayload } from '../lib/tokenLibrary';
import { useKeybinds } from '../lib/keybinds';
import { MapPickerDialog } from './MapPickerDialog';
import { PlacePickerDialog } from './PlacePickerDialog';
import type { Token, TokenSprite } from '../types';

const SEND_EVERY_MS = 45;

export function BattleMap() {
  const { me } = useIdentity();
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const characters = useTableStore((s) => s.characters);
  const users = useTableStore((s) => s.users);
  const upsertToken = useTableStore((s) => s.upsertToken);
  const moveToken = useTableStore((s) => s.moveToken);
  const deleteToken = useTableStore((s) => s.deleteToken);
  const updateMap = useTableStore((s) => s.updateMap);
  const addScene = useTableStore((s) => s.addScene);
  const addScene3d = useTableStore((s) => s.addScene3d);
  const renameScene = useTableStore((s) => s.renameScene);
  const deleteScene = useTableStore((s) => s.deleteScene);
  const switchScene = useTableStore((s) => s.switchScene);

  const scene = activeScene({ scenes, activeSceneId });
  const map = scene.map;
  const tokens = scene.tokens;

  const [zoom, setZoom] = useState(1);
  const [selId, setSelId] = useState<string | null>(null);
  // Separado de `selId` de propósito — pedido do usuário: arrastar um
  // token seleciona ele (atalhos de teclado continuam funcionando) mas
  // NÃO deve abrir a ficha na tela; só um clique de verdade (sem
  // arrastar) ou a tecla configurada pra isso (padrão Enter) abre.
  const [panelOpen, setPanelOpen] = useState(false);
  const keybinds = useKeybinds();
  const [measure, setMeasure] = useState(false);
  const [measureLine, setMeasureLine] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);
  const [fogMode, setFogMode] = useState(false);
  const [fogWorking, setFogWorking] = useState<Set<string> | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const lastSentRef = useRef(0);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);
  // Acesso direto ao <div> de cada token na tela, pra mutar left/top sem
  // passar pelo React durante o arraste — ver onTokenPointerDown abaixo.
  const tokenElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const W = map.cols * map.cellSize;
  const H = map.rows * map.cellSize;
  const selected = selId ? tokens[selId] : null;
  // Cenário 2D (peças de parede/móveis/textura) plantado na Área do Mestre
  // (ver Prototype2D.tsx) — dentro da mesa fica só exibido, travado: o
  // pedido foi manter a mesa "limpa, só pra jogar", edição só fora de mesa.
  const objects2d = map.objects2d ?? [];

  const clientToCell = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      cx: (clientX - rect.left) / zoom / map.cellSize,
      cy: (clientY - rect.top) / zoom / map.cellSize,
    };
  };

  /* -------- arraste de token (listeners em window: não perde o mouse em movimento rápido) --------
     Achado numa varredura de bugs (usuário: "travamento ao arrastar o
     token rápido"): a posição ao vivo vinha de `setDrag(...)` chamado em
     TODO `pointermove` cru, sem throttle nenhum — cada pixel de mouse
     movido disparava um re-render do BattleMap inteiro (todos os tokens,
     peças de cenário, névoa, grade). Arrastando rápido, o navegador gera
     muito mais eventos de pointermove por segundo do que a UI dava conta
     de re-renderizar, travando visivelmente. Mesmo problema já resolvido
     no lado 3D (ref direto do three.js em vez de setState) — aqui o
     equivalente é mutar `style.left/top` do próprio <div> do token direto
     via `tokenElsRef`, sem passar pelo React. O envio pela rede continua
     throttled em SEND_EVERY_MS, só a atualização VISUAL local que deixou
     de depender de re-render. */
  const onTokenPointerDown = (e: React.PointerEvent, t: Token) => {
    if (measure || fogMode) return;
    e.stopPropagation();
    e.preventDefault();
    setSelId(t.id);
    setPanelOpen(false);

    const startX = e.clientX;
    const startY = e.clientY;
    const cell = map.cellSize;
    const cols = map.cols;
    const rows = map.rows;
    const size = t.size;
    const originX = t.x;
    const originY = t.y;
    let moved = false;
    let cur = { x: originX, y: originY };

    const clamp = (x: number, y: number) => ({
      x: Math.max(0, Math.min(cols - size, x)),
      y: Math.max(0, Math.min(rows - size, y)),
    });

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom / cell;
      const dy = (ev.clientY - startY) / zoom / cell;
      cur = clamp(originX + dx, originY + dy);
      moved = true;
      const el = tokenElsRef.current.get(t.id);
      if (el) {
        el.style.left = `${cur.x * cell}px`;
        el.style.top = `${cur.y * cell}px`;
      }
      const now = performance.now();
      if (now - lastSentRef.current > SEND_EVERY_MS) {
        lastSentRef.current = now;
        moveToken(t.id, cur.x, cur.y);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        // posição final via upsert: persiste no cache/BD além de sincronizar
        // — o re-render disparado por isso já traz left/top certinho de
        // volta (vindo de t.x/t.y), sem precisar "desfazer" a mutação direta.
        upsertToken({ ...t, x: Math.round(cur.x * 2) / 2, y: Math.round(cur.y * 2) / 2 });
      } else {
        // clique sem arrastar nenhum pixel = abre a ficha de verdade
        setPanelOpen(true);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* -------- mover a câmera arrastando o fundo do mapa (botão esquerdo) --------
     Antes só dava pra reposicionar usando as barras de rolagem, o que é ruim
     de mirar; agora clicar e arrastar no vazio do mapa (não num token — o
     token já para a propagação em onTokenPointerDown) move a visão. Um clique
     sem arrastar continua desselecionando o token, igual antes. */
  const onStagePan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const scrollEl = mapScrollRef.current;
    if (!scrollEl) {
      setSelId(null);
      return;
    }
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = scrollEl.scrollLeft;
    const startScrollTop = scrollEl.scrollTop;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 3) {
        moved = true;
        setPanning(true);
      }
      if (moved) {
        scrollEl.scrollLeft = startScrollLeft - dx;
        scrollEl.scrollTop = startScrollTop - dy;
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPanning(false);
      if (!moved) setSelId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* -------- medição -------- */
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (fogMode && me.isGM) {
      onFogPointerDown(e);
      return;
    }
    if (!measure) {
      onStagePan(e);
      return;
    }
    const start = clientToCell(e.clientX, e.clientY);
    setMeasureLine({ x1: start.cx, y1: start.cy, x2: start.cx, y2: start.cy });
    const onMove = (ev: PointerEvent) => {
      const p = clientToCell(ev.clientX, ev.clientY);
      setMeasureLine((l) => (l ? { ...l, x2: p.cx, y2: p.cy } : l));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMeasureLine(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* -------- fog of war (só mestre) -------- */
  const cellKey = (x: number, y: number) => `${x},${y}`;
  const onFogPointerDown = (e: React.PointerEvent) => {
    const start = clientToCell(e.clientX, e.clientY);
    const sx = Math.floor(start.cx);
    const sy = Math.floor(start.cy);
    const base = new Set(map.fogHidden ?? []);
    const paint: 'hide' | 'show' = base.has(cellKey(sx, sy)) ? 'show' : 'hide';
    const working = new Set(base);
    const applyCell = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return;
      const k = cellKey(x, y);
      if (paint === 'hide') working.add(k);
      else working.delete(k);
    };
    applyCell(sx, sy);
    setFogWorking(new Set(working));
    const onMove = (ev: PointerEvent) => {
      const p = clientToCell(ev.clientX, ev.clientY);
      applyCell(Math.floor(p.cx), Math.floor(p.cy));
      setFogWorking(new Set(working));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setFogWorking(null);
      updateMap({ fogHidden: [...working] });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const fogSet = fogWorking ?? new Set(map.fogHidden ?? []);
  const tokenHidden = (t: Token) => {
    if (fogSet.size === 0) return false;
    for (let dx = 0; dx < t.size; dx++) {
      for (let dy = 0; dy < t.size; dy++) {
        if (fogSet.has(cellKey(Math.floor(t.x) + dx, Math.floor(t.y) + dy))) return true;
      }
    }
    return false;
  };

  /* -------- tokens -------- */
  const addBlank = () => {
    const t: Token = {
      id: uid(),
      label: 'Token',
      color: randomColor(),
      x: Math.floor(map.cols / 2),
      y: Math.floor(map.rows / 2),
      size: 1,
      ownerId: me.id,
    };
    upsertToken(t);
    setSelId(t.id);
  };

  const addFromCharacter = (charId: string) => {
    const c = characters[charId];
    if (!c) return;
    const t: Token = {
      id: uid(),
      label: c.name,
      color: randomColor(c.id),
      image: c.image,
      x: Math.floor(map.cols / 2),
      y: Math.floor(map.rows / 2),
      size: 1,
      ownerId: me.id,
      characterId: c.id,
      hp: { current: c.pv.current, max: c.pv.max },
    };
    upsertToken(t);
    setSelId(t.id);
  };

  // Arrastar um token da biblioteca do mestre (aba Tokens, TokenLibraryManager)
  // e soltar aqui cria um token novo no ponto exato onde soltou. A imagem
  // vira data URL embutida (mesmo formato de sempre) — não fica dependendo
  // do arquivo continuar existindo na biblioteca depois.
  const onStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!me.isGM) return;
    const raw = e.dataTransfer.getData(TOKEN_DRAG_MIME);
    if (!raw) return;
    let payload: TokenDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const { cx, cy } = clientToCell(e.clientX, e.clientY);
    const size = 1;
    const x = Math.max(0, Math.min(map.cols - size, Math.round((cx - size / 2) * 2) / 2));
    const y = Math.max(0, Math.min(map.rows - size, Math.round((cy - size / 2) * 2) / 2));
    void urlToDownscaledDataURL(tokenAssetUrl(payload.id), 320).then((image) => {
      const t: Token = {
        id: uid(),
        label: payload.name,
        color: randomColor(),
        image: image || undefined,
        x,
        y,
        size,
        ownerId: me.id,
      };
      upsertToken(t);
      setSelId(t.id);
    });
  };

  const patchToken = (p: Partial<Token>) => {
    if (!selected) return;
    upsertToken({ ...selected, ...p });
  };

  // Tamanho de verdade em px do token na tela: usa o ajuste fino (`sizePx`)
  // se já foi mexido, senão cai no múltiplo de célula do seletor "Tamanho".
  const tokenPxSize = (t: Token) => t.sizePx ?? t.size * map.cellSize - 6;

  // Alterna pra próxima variante de imagem do token selecionado (ver
  // TokenSprite em types.ts) — cicla pela lista, voltando pro começo. Sem
  // efeito se o token não tem variante nenhuma registrada ainda.
  const cycleSprite = () => {
    if (!selected?.sprites?.length) return;
    const sprites = selected.sprites;
    const curIdx = sprites.findIndex((s) => s.id === selected.activeSpriteId);
    const next = sprites[(curIdx + 1) % sprites.length];
    patchToken({ image: next.image, activeSpriteId: next.id });
  };

  // Sempre aponta pro token selecionado MAIS RECENTE, sem precisar que o
  // loop de animação abaixo dependa dele (ver por quê no comentário do
  // useEffect principal) — lido a cada frame/evento, nunca fica obsoleto.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const patchSelectedLive = (p: Partial<Token>) => {
    const cur = selectedRef.current;
    if (!cur) return;
    upsertToken({ ...cur, ...p });
  };

  // Atalhos de teclado pro token selecionado — teclas configuráveis (⚙
  // Configurações → Controles, ver lib/keybinds.ts), padrão ←/→ gira e
  // ↑/↓ redimensiona. Achado numa varredura de bugs (usuário: "quero que
  // ele gire mais fluido, está travado"): a versão antiga pulava um
  // ângulo FIXO a cada `keydown`, então segurar a tecla dependia do
  // repeat do sistema operacional (sempre com uma pausa inicial e um
  // ritmo irregular — nunca fica "fluido" de verdade). Agora é um loop de
  // animação (`requestAnimationFrame`) que gira/redimensiona de forma
  // CONTÍNUA enquanto a tecla está pressionada, à base de graus/px por
  // segundo. A posição "ao vivo" muta o DOM direto (mesmo padrão já usado
  // no arraste, `tokenElsRef`/`.tk-img`) — só o COMMIT pra store/rede fica
  // throttled em SEND_EVERY_MS, senão viraria o mesmo tipo de travamento
  // já corrigido no arraste (gravar o estado inteiro a cada frame).
  // V (padrão) alterna pra próxima variante de imagem, Enter (padrão)
  // abre a ficha — ambos de disparo único, não contínuo.
  useEffect(() => {
    if (!selected) return;
    const heldCodes = new Set<string>();
    const ROTATE_DEG_PER_SEC = 240;
    const RESIZE_PX_PER_SEC = 160;
    let liveRotation = selected.rotation ?? 0;
    let liveSizePx = tokenPxSize(selected);
    let lastFrame = performance.now();
    let lastCommit = 0;

    // `setInterval`, não `requestAnimationFrame` — de propósito. rAF é
    // pausado pelo Chromium em janela oculta/minimizada/sem foco (achado
    // na hora de testar: numa janela `show:false` o giro simplesmente
    // parava depois do 1º tick), então um giro que depende dele também
    // travaria de verdade se a pessoa minimizar a janela no meio do jogo.
    // setInterval roda independente de composição visual — usa o tempo
    // decorrido de verdade (`dt`) a cada tique, então o RITMO continua
    // certo mesmo se o intervalo entre chamadas não for perfeitamente
    // regular.
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.1); // clamp: 2º plano não "pula"
      lastFrame = now;
      if (heldCodes.size === 0) return;
      let changed = false;
      if (heldCodes.has(keybinds['token-rotate-left'])) {
        liveRotation = (((liveRotation - ROTATE_DEG_PER_SEC * dt) % 360) + 360) % 360;
        changed = true;
      }
      if (heldCodes.has(keybinds['token-rotate-right'])) {
        liveRotation = (((liveRotation + ROTATE_DEG_PER_SEC * dt) % 360) + 360) % 360;
        changed = true;
      }
      if (heldCodes.has(keybinds['token-resize-up'])) {
        liveSizePx = Math.min(liveSizePx + RESIZE_PX_PER_SEC * dt, map.cellSize * 10);
        changed = true;
      }
      if (heldCodes.has(keybinds['token-resize-down'])) {
        liveSizePx = Math.max(liveSizePx - RESIZE_PX_PER_SEC * dt, 8);
        changed = true;
      }
      if (!changed) return;
      const cur = selectedRef.current;
      const el = cur ? tokenElsRef.current.get(cur.id) : null;
      if (el) {
        const img = el.querySelector<HTMLElement>('.tk-img');
        if (img) img.style.transform = `rotate(${liveRotation}deg)`;
        el.style.width = `${liveSizePx}px`;
        el.style.height = `${liveSizePx}px`;
      }
      if (now - lastCommit > SEND_EVERY_MS) {
        lastCommit = now;
        patchSelectedLive({ rotation: liveRotation, sizePx: liveSizePx });
      }
    };
    const intervalId = window.setInterval(tick, 16);

    const rotateResizeKeys = [
      keybinds['token-rotate-left'],
      keybinds['token-rotate-right'],
      keybinds['token-resize-up'],
      keybinds['token-resize-down'],
    ];
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (rotateResizeKeys.includes(e.code)) {
        e.preventDefault();
        heldCodes.add(e.code);
      } else if (e.code === keybinds['token-cycle-sprite']) {
        e.preventDefault();
        cycleSprite();
      } else if (e.code === keybinds['token-open-panel']) {
        e.preventDefault();
        setPanelOpen(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!heldCodes.delete(e.code)) return;
      // commit final na hora de soltar — não espera o próximo throttle
      patchSelectedLive({ rotation: liveRotation, sizePx: liveSizePx });
    };
    // solta tudo se a janela perder o foco com alguma tecla presa (alt-tab
    // no meio do giro, por exemplo) — senão o estado "preso" nunca solta.
    const onBlur = () => heldCodes.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, keybinds]);

  const onPickTokenImage = async (file: File | undefined) => {
    if (!file || !selected) return;
    const url = await fileToDownscaledDataURL(file, 320);
    if (url) patchToken({ image: url });
  };

  // Adiciona uma nova variante de imagem — se o token ainda não tinha
  // `sprites` registrado (token "clássico", só `image` solta), promove a
  // imagem atual pra "Padrão" primeiro, pra não perder ela da lista.
  const addSprite = async (file: File | undefined) => {
    if (!file || !selected) return;
    const url = await fileToDownscaledDataURL(file, 320);
    if (!url) return;
    const name = await askText('Nome dessa variante (ex.: "Com espada"):');
    if (name === null) return;
    let sprites = selected.sprites ?? [];
    if (sprites.length === 0 && selected.image) {
      sprites = [{ id: uid(), name: 'Padrão', image: selected.image }];
    }
    const sprite: TokenSprite = { id: uid(), name: name.trim() || 'Sem nome', image: url };
    sprites = [...sprites, sprite];
    patchToken({ sprites, image: sprite.image, activeSpriteId: sprite.id });
  };

  const selectSprite = (sprite: TokenSprite) => {
    if (!selected) return;
    patchToken({ image: sprite.image, activeSpriteId: sprite.id });
  };

  const renameSprite = async (sprite: TokenSprite) => {
    if (!selected) return;
    const name = await askText('Nome da variante:', sprite.name);
    if (!name?.trim() || name === sprite.name) return;
    const sprites = (selected.sprites ?? []).map((s) => (s.id === sprite.id ? { ...s, name: name.trim() } : s));
    patchToken({ sprites });
  };

  const removeSprite = (sprite: TokenSprite) => {
    if (!selected) return;
    const sprites = (selected.sprites ?? []).filter((s) => s.id !== sprite.id);
    const patch: Partial<Token> = { sprites };
    // se removeu a variante que tava ativa, cai pra primeira que sobrou (ou
    // tira a imagem de vez se não sobrou nenhuma)
    if (selected.activeSpriteId === sprite.id) {
      patch.image = sprites[0]?.image;
      patch.activeSpriteId = sprites[0]?.id;
    }
    patchToken(patch);
  };

  const onPickBackground = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDownscaledDataURL(file, 2400);
    if (url) updateMap({ background: url });
  };

  /* -------- zoom com Ctrl + scroll -------- */
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, +(z - Math.sign(e.deltaY) * 0.1).toFixed(2))));
  };

  const measureDist = measureLine
    ? Math.hypot(measureLine.x2 - measureLine.x1, measureLine.y2 - measureLine.y1)
    : 0;

  return (
    <>
      <div className="map-toolbar">
        {me.isGM ? (
          <>
            <select
              className="small"
              style={{ width: 120, padding: '4px 6px' }}
              value={activeSceneId}
              onChange={(e) => switchScene(e.target.value)}
            >
              {scenes.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
            <button className="small" title="Novo cenário" onClick={() => setShowMapPicker(true)}>
              ＋ cenário
            </button>
            <button
              className="small"
              title="Renomear cenário"
              onClick={async () => {
                const n = await askText('Nome do cenário:', scene.name);
                if (n !== null) renameScene(scene.id, n.trim() || scene.name);
              }}
            >
              ✎
            </button>
            <button
              className="small"
              title="Excluir cenário"
              disabled={scenes.length <= 1}
              onClick={() => {
                if (confirm(`Excluir o cenário "${scene.name}" e seus tokens?`))
                  deleteScene(scene.id);
              }}
            >
              🗑
            </button>
            <span className="toolbar-sep" />
          </>
        ) : (
          <>
            <span className="live-badge" title="Você está vendo o mapa do mestre ao vivo">
              <span className="live-dot" /> AO VIVO · {scene.name}
            </span>
            <span className="toolbar-sep" />
          </>
        )}

        <button className="small" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}>
          −
        </button>
        <button className="small" onClick={() => setZoom(1)} title="Ctrl + scroll no mapa também dá zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button className="small" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
          +
        </button>
        {me.isGM && (
          <button
            className={'small ' + (map.showGrid ? 'primary' : '')}
            onClick={() => updateMap({ showGrid: !map.showGrid })}
          >
            Grid
          </button>
        )}
        <button
          className={'small ' + (measure ? 'primary' : '')}
          onClick={() => {
            setMeasure((m) => !m);
            setMeasureLine(null);
            setFogMode(false);
            setSelId(null);
          }}
        >
          📏 Medir
        </button>
        {me.isGM && (
          <button
            className={'small ' + (fogMode ? 'primary' : '')}
            title="Clique/arraste no mapa pra esconder ou revelar células dos jogadores"
            onClick={() => {
              setFogMode((f) => !f);
              setMeasure(false);
              setSelId(null);
            }}
          >
            🌫 Névoa
          </button>
        )}
        {me.isGM && fogMode && (
          <details style={{ position: 'relative' }}>
            <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 6px' }}>▾</summary>
            <div className="map-cfg" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 140 }}>
              <button className="small" onClick={() => updateMap({ fogHidden: [] })}>
                revelar tudo
              </button>
              <button
                className="small"
                onClick={() => {
                  const all: string[] = [];
                  for (let x = 0; x < map.cols; x++)
                    for (let y = 0; y < map.rows; y++) all.push(cellKey(x, y));
                  updateMap({ fogHidden: all });
                }}
              >
                cobrir tudo
              </button>
            </div>
          </details>
        )}

        <span className="toolbar-sep" />

        <button className="small" onClick={addBlank}>
          ＋ Token
        </button>
        {Object.keys(characters).length > 0 && (
          <select
            className="small"
            style={{ width: 130, padding: '4px 6px' }}
            value=""
            onChange={(e) => e.target.value && addFromCharacter(e.target.value)}
          >
            <option value="">＋ do personagem…</option>
            {Object.values(characters).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {me.isGM && (
          <>
            <button className="small" onClick={() => bgInputRef.current?.click()}>
              🖼 Fundo
            </button>
            {map.background && (
              <button className="small" onClick={() => updateMap({ background: undefined })}>
                limpar fundo
              </button>
            )}
            <details style={{ position: 'relative' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 6px' }}>
                ⚙︎ Grade
              </summary>
              <div className="map-cfg">
            <div className="row">
              <div>
                <label>Colunas</label>
                <input
                  type="number"
                  value={map.cols}
                  onChange={(e) => updateMap({ cols: Math.max(5, Number(e.target.value)) })}
                />
              </div>
              <div>
                <label>Linhas</label>
                <input
                  type="number"
                  value={map.rows}
                  onChange={(e) => updateMap({ rows: Math.max(5, Number(e.target.value)) })}
                />
              </div>
            </div>
            <div className="field" style={{ marginTop: 6 }}>
              <label>Tamanho da célula (px)</label>
              <input
                type="number"
                value={map.cellSize}
                onChange={(e) => updateMap({ cellSize: Math.max(20, Number(e.target.value)) })}
              />
            </div>
                <div className="field">
                  <label>Metros por célula</label>
                  <input
                    type="number"
                    step={0.5}
                    value={map.metersPerCell}
                    onChange={(e) => updateMap({ metersPerCell: Number(e.target.value) })}
                  />
                </div>
              </div>
            </details>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void onPickBackground(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
        <input
          ref={tokenInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void onPickTokenImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {selected && panelOpen && (
        <div className="token-editor">
          <div className="row">
            <input value={selected.label} onChange={(e) => patchToken({ label: e.target.value })} />
            <input
              type="color"
              value={selected.color}
              style={{ flex: 'none', width: 38, padding: 2 }}
              onChange={(e) => patchToken({ color: e.target.value })}
            />
          </div>
          <p className="faint" style={{ fontSize: 11, margin: '6px 0 0' }}>
            Atalhos do token funcionam mesmo com a ficha fechada — configure em ⚙ Configurações
            → Controles.
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Tamanho</label>
              <select
                value={selected.size}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchToken({ size: n, sizePx: n * map.cellSize - 6 });
                }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}
                  </option>
                ))}
              </select>
              {selected.sizePx != null && selected.sizePx !== selected.size * map.cellSize - 6 && (
                <button
                  className="small ghost"
                  style={{ marginTop: 4 }}
                  title="Volta pro tamanho padrão dessa célula"
                  onClick={() => patchToken({ sizePx: undefined })}
                >
                  resetar tamanho
                </button>
              )}
            </div>
            <div>
              <label>PV atual</label>
              <input
                type="number"
                value={selected.hp?.current ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: {
                      current: Number(e.target.value),
                      max: selected.hp?.max ?? Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label>PV máx</label>
              <input
                type="number"
                value={selected.hp?.max ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: {
                      current: selected.hp?.current ?? Number(e.target.value),
                      max: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Dono / quem controla</label>
              <select
                value={selected.ownerId}
                onChange={(e) => patchToken({ ownerId: e.target.value })}
              >
                <option value="">— ninguém (livre) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.isGM ? ' (Mestre)' : ''}
                  </option>
                ))}
                {!users.some((u) => u.id === selected.ownerId) && selected.ownerId && (
                  <option value={selected.ownerId}>{selected.ownerId} (desconectado)</option>
                )}
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => tokenInputRef.current?.click()}>
              🖼 Importar imagem
            </button>
            {selected.image && (
              <button className="small ghost" onClick={() => patchToken({ image: undefined })}>
                tirar imagem
              </button>
            )}
          </div>
          {selected.image && (
            <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
              <label style={{ flex: 'none' }}>Virar pra</label>
              <button
                className="small"
                title="Girar pra esquerda"
                onClick={() =>
                  patchToken({ rotation: (((selected.rotation ?? 0) - 15) % 360 + 360) % 360 })
                }
              >
                ↺ Esquerda
              </button>
              <button
                className="small"
                title="Girar pra direita"
                onClick={() =>
                  patchToken({ rotation: (((selected.rotation ?? 0) + 15) % 360 + 360) % 360 })
                }
              >
                ↻ Direita
              </button>
              {(selected.rotation ?? 0) !== 0 && (
                <button className="small ghost" onClick={() => patchToken({ rotation: 0 })}>
                  resetar
                </button>
              )}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <label>Variantes de imagem</label>
            {selected.sprites && selected.sprites.length > 0 && (
              <p className="faint" style={{ fontSize: 11, margin: '0 0 4px' }}>
                Tecla <b>V</b> alterna rápido pra próxima.
              </p>
            )}
            <div className="token-sprite-list">
              {(selected.sprites ?? []).map((s) => (
                <div
                  key={s.id}
                  className={'token-sprite-chip' + (selected.activeSpriteId === s.id ? ' on' : '')}
                  title={s.name}
                  onClick={() => selectSprite(s)}
                >
                  <span className="token-sprite-thumb" style={{ backgroundImage: `url(${s.image})` }} />
                  <span className="token-sprite-name">{s.name}</span>
                  <button
                    className="token-sprite-x"
                    title="Renomear"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameSprite(s);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="token-sprite-x"
                    title="Excluir"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSprite(s);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="small ghost" onClick={() => spriteInputRef.current?.click()}>
                + variante
              </button>
            </div>
            <input
              ref={spriteInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void addSprite(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => setPanelOpen(false)}>
              Fechar
            </button>
            <button
              className="small ghost"
              onClick={() => {
                deleteToken(selected.id);
                setSelId(null);
                setPanelOpen(false);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      )}

      <div className={'map-scroll' + (panning ? ' panning' : '')} ref={mapScrollRef} onWheel={onWheel}>
        <div
          className="grid-stage"
          ref={stageRef}
          style={{ width: W, height: H, transform: `scale(${zoom})` }}
          onPointerDown={onStagePointerDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onStageDrop}
        >
          {map.background && (
            <div className="grid-bg" style={{ backgroundImage: `url(${map.background})` }} />
          )}

          {[...objects2d]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((o) => (
              <div
                key={o.id}
                className="map-object2d"
                style={{
                  left: o.x * map.cellSize,
                  top: o.y * map.cellSize,
                  width: o.width * map.cellSize,
                  height: o.height * map.cellSize,
                  transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
                  backgroundImage: `url(${o.imageUrl})`,
                  backgroundSize:
                    o.mode === 'tile'
                      ? `${map.cellSize * (o.repeat || 1)}px ${map.cellSize * (o.repeat || 1)}px`
                      : '100% 100%',
                  backgroundRepeat: o.mode === 'tile' ? 'repeat' : 'no-repeat',
                }}
              />
            ))}

          {map.showGrid && (
            <div
              className="grid-lines"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px),' +
                  'linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px)',
                backgroundSize: `${map.cellSize}px ${map.cellSize}px`,
              }}
            />
          )}

          {[...fogSet].map((k) => {
            const [fx, fy] = k.split(',').map(Number);
            return (
              <div
                key={`fog-${k}`}
                className={'fog-tile ' + (me.isGM ? 'fog-gm' : 'fog-player')}
                style={{
                  left: fx * map.cellSize,
                  top: fy * map.cellSize,
                  width: map.cellSize,
                  height: map.cellSize,
                }}
              />
            );
          })}

          {Object.values(tokens)
            .filter((t) => me.isGM || !tokenHidden(t))
            .map((t) => {
            // Token com imagem sempre mostra ela como foi importada (sem recortar
            // em círculo) — só o token "vazio" (sem imagem) usa o círculo colorido.
            const free = !!t.image;
            return (
            <div
              key={t.id}
              ref={(el) => {
                if (el) tokenElsRef.current.set(t.id, el);
                else tokenElsRef.current.delete(t.id);
              }}
              className={'token ' + (free ? 'token-free ' : '') + (selId === t.id ? 'selected' : '')}
              onPointerDown={(e) => onTokenPointerDown(e, t)}
              style={{
                left: t.x * map.cellSize,
                top: t.y * map.cellSize,
                width: tokenPxSize(t),
                height: tokenPxSize(t),
                margin: 3,
                background: t.image ? undefined : t.color,
                borderColor: free ? 'transparent' : t.color,
                fontSize: Math.min(18, tokenPxSize(t) * 0.3),
              }}
            >
              {t.image && (
                <span
                  className="tk-img"
                  style={{
                    backgroundImage: `url(${t.image})`,
                    backgroundSize: free ? 'contain' : 'cover',
                    transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                  }}
                />
              )}
              {!t.image && t.label.slice(0, 2).toUpperCase()}
              {t.hp && t.hp.max > 0 && (
                <span className="tk-hp">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, (t.hp.current / t.hp.max) * 100))}%`,
                      background: t.hp.current / t.hp.max < 0.3 ? 'var(--blood)' : 'var(--green)',
                    }}
                  />
                </span>
              )}
              <span className="tk-label">{t.label}</span>
            </div>
            );
          })}

          {measureLine && (
            <>
              <div
                className="measure-line"
                style={{
                  left: measureLine.x1 * map.cellSize,
                  top: measureLine.y1 * map.cellSize,
                  width:
                    Math.hypot(
                      measureLine.x2 - measureLine.x1,
                      measureLine.y2 - measureLine.y1,
                    ) * map.cellSize,
                  transform: `rotate(${Math.atan2(
                    measureLine.y2 - measureLine.y1,
                    measureLine.x2 - measureLine.x1,
                  )}rad)`,
                }}
              />
              <div
                className="measure-label"
                style={{
                  left: measureLine.x2 * map.cellSize + 6,
                  top: measureLine.y2 * map.cellSize - 6,
                }}
              >
                {measureDist.toFixed(1)} q · {(measureDist * map.metersPerCell).toFixed(1)} m
              </div>
            </>
          )}
        </div>
      </div>

      {showMapPicker && (
        <MapPickerDialog
          onClose={() => setShowMapPicker(false)}
          onBlank={() => {
            addScene();
            setShowMapPicker(false);
          }}
          onPick={(dataUrl) => {
            addScene();
            if (dataUrl) updateMap({ background: dataUrl });
            setShowMapPicker(false);
          }}
          onAdd3d={() => {
            setShowMapPicker(false);
            setShowPlacePicker(true);
          }}
        />
      )}

      {showPlacePicker && (
        <PlacePickerDialog
          onClose={() => setShowPlacePicker(false)}
          onBlank={() => {
            addScene3d(null);
            setShowPlacePicker(false);
          }}
          onPick={(place) => {
            addScene3d(place);
            setShowPlacePicker(false);
          }}
        />
      )}
    </>
  );
}
