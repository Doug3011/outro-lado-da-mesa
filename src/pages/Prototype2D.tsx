import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { uid } from '../lib/ids';
import { fileToDownscaledDataURL, urlToDownscaledDataURL } from '../lib/image';
import { sceneryAssetUrl } from '../lib/sceneryLibrary';
import { fetchMap2D, saveMap2D, type Map2D } from '../lib/map2dLibrary';
import { SCENERY_DRAG_MIME, SceneryLibraryManager, type SceneryDragPayload } from '../components/SceneryLibraryManager';
import type { MapObject2D, SceneryAsset } from '../types';
import { DEFAULT_MAP } from '../types';

const SEND_EVERY_MS = 45;

// Proporção largura/altura de uma imagem — usada só pra dar um tamanho
// inicial sensato a uma peça de cenário plantada (altura fixa, largura pela
// proporção real da imagem). Mesma função que existia em BattleMap.tsx
// quando a edição de cenário ainda vivia lá dentro da mesa.
function probeImageAspect(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve((img.naturalWidth || 1) / (img.naturalHeight || 1));
    img.onerror = () => resolve(1);
    img.src = url;
  });
}

// Editor de mapa 2D a partir de assets de cenário (paredes, móveis, texturas
// de chão) — Área do Mestre, fora de mesa. Composição salva aqui vira o
// ponto de partida de uma mesa 2D ao hospedar (ver map2dToScene em
// lib/map2dLibrary.ts). Pedido explícito do usuário: a CRIAÇÃO do mapa
// acontece só aqui — dentro da mesa de verdade (BattleMap.tsx) o cenário
// plantado fica travado, só os tokens continuam livres, pra manter a mesa
// "limpa, só pra jogar".
//
// Mesma mecânica de arraste/seleção/atalhos que a edição em mesa já tinha
// (ver histórico de BattleMap.tsx), só que operando em estado local (sem
// store/realtime nenhum) — mesmo padrão de isolamento do Prototype3D.tsx
// pro lado 3D.
export function Prototype2D() {
  const navigate = useNavigate();
  const { map2dId: routeMap2DId } = useParams<{ map2dId?: string }>();
  const map2dIdRef = useRef(routeMap2DId ?? uid());
  const map2dId = map2dIdRef.current;

  const [loading, setLoading] = useState(!!routeMap2DId);
  const [name, setName] = useState('Novo mapa');
  const [cols, setCols] = useState(DEFAULT_MAP.cols);
  const [rows, setRows] = useState(DEFAULT_MAP.rows);
  const [cellSize, setCellSize] = useState(DEFAULT_MAP.cellSize);
  const [background, setBackground] = useState<string | undefined>(undefined);
  const [objects2d, setObjects2d] = useState<MapObject2D[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const lastSentRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!routeMap2DId) return;
    void fetchMap2D(routeMap2DId).then((map2d) => {
      if (map2d) {
        setName(map2d.name);
        setCols(map2d.cols);
        setRows(map2d.rows);
        setCellSize(map2d.cellSize);
        setBackground(map2d.background);
        setObjects2d(map2d.objects2d);
      }
      setLoading(false);
    });
  }, [routeMap2DId]);

  const selected = selId ? objects2d.find((o) => o.id === selId) ?? null : null;
  const W = cols * cellSize;
  const H = rows * cellSize;

  const clientToCell = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      cx: (clientX - rect.left) / zoom / cellSize,
      cy: (clientY - rect.top) / zoom / cellSize,
    };
  };

  const nextZIndex = () => (objects2d.length ? Math.max(...objects2d.map((o) => o.zIndex)) + 1 : 1);
  const patchObject = (id: string, patch: Partial<MapObject2D>) => {
    setObjects2d((cur) => cur.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const removeObject = (id: string) => setObjects2d((cur) => cur.filter((o) => o.id !== id));

  const plantAssetAt = (assetId: string, cx: number, cy: number) => {
    void urlToDownscaledDataURL(sceneryAssetUrl(assetId), 480).then((image) => {
      if (!image) return;
      void probeImageAspect(image).then((ratio) => {
        const height = 2;
        const width = Math.max(0.3, +(height * ratio).toFixed(2));
        const o: MapObject2D = {
          id: uid(),
          imageUrl: image,
          x: Math.max(0, Math.min(cols - width, cx - width / 2)),
          y: Math.max(0, Math.min(rows - height, cy - height / 2)),
          width,
          height,
          rotation: 0,
          zIndex: nextZIndex(),
          mode: 'stretch',
        };
        setObjects2d((cur) => [...cur, o]);
        setSelId(o.id);
      });
    });
  };

  const plantAsset = (asset: SceneryAsset) => {
    const scrollEl = mapScrollRef.current;
    let cx = cols / 2;
    let cy = rows / 2;
    if (scrollEl) {
      cx = (scrollEl.scrollLeft + scrollEl.clientWidth / 2) / zoom / cellSize;
      cy = (scrollEl.scrollTop + scrollEl.clientHeight / 2) / zoom / cellSize;
    }
    plantAssetAt(asset.id, cx, cy);
  };

  const onObjectPointerDown = (e: React.PointerEvent, o: MapObject2D) => {
    if (o.locked) return;
    e.stopPropagation();
    e.preventDefault();
    setSelId(o.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const originX = o.x;
    const originY = o.y;
    let moved = false;
    let cur = { x: originX, y: originY };

    const clamp = (x: number, y: number) => ({
      x: Math.max(0, Math.min(cols - o.width, x)),
      y: Math.max(0, Math.min(rows - o.height, y)),
    });

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom / cellSize;
      const dy = (ev.clientY - startY) / zoom / cellSize;
      cur = clamp(originX + dx, originY + dy);
      moved = true;
      setDrag({ id: o.id, x: cur.x, y: cur.y });
      const now = performance.now();
      if (now - lastSentRef.current > SEND_EVERY_MS) {
        lastSentRef.current = now;
        patchObject(o.id, { x: cur.x, y: cur.y });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (moved) patchObject(o.id, { x: Math.round(cur.x * 2) / 2, y: Math.round(cur.y * 2) / 2 });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

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

  const onStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(SCENERY_DRAG_MIME);
    if (!raw) return;
    let payload: SceneryDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const { cx, cy } = clientToCell(e.clientX, e.clientY);
    plantAssetAt(payload.id, cx, cy);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, +(z - Math.sign(e.deltaY) * 0.1).toFixed(2))));
  };

  const onPickBackground = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDownscaledDataURL(file, 2400);
    if (url) setBackground(url);
  };

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        patchObject(selected.id, { rotation: (((selected.rotation ?? 0) - 15) % 360 + 360) % 360 });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        patchObject(selected.id, { rotation: (((selected.rotation ?? 0) + 15) % 360 + 360) % 360 });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const ratio = selected.width / selected.height;
        const h = Math.min(selected.height + 0.1, 20);
        patchObject(selected.id, { height: h, width: +(h * ratio).toFixed(2) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const ratio = selected.width / selected.height;
        const h = Math.max(selected.height - 0.1, 0.2);
        patchObject(selected.id, { height: h, width: +(h * ratio).toFixed(2) });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const onSave = async () => {
    setSaving('saving');
    const map2d: Map2D = {
      id: map2dId,
      name: name.trim() || 'Mapa sem nome',
      updatedAt: Date.now(),
      cols,
      rows,
      cellSize,
      background,
      objects2d,
    };
    const saved = await saveMap2D(map2d);
    setSaving(saved ? 'saved' : 'error');
    window.setTimeout(() => setSaving('idle'), saved ? 1600 : 5000);
  };

  const renderX = (o: MapObject2D) => (drag && drag.id === o.id ? drag.x : o.x);
  const renderY = (o: MapObject2D) => (drag && drag.id === o.id ? drag.y : o.y);

  if (loading) {
    return (
      <div className="cine-page">
        <div className="cine-topbar">
          <button className="small ghost" onClick={() => navigate('/')}>
            ← Sair
          </button>
          <span className="cine-title">Carregando mapa…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cine-page">
      <div className="cine-topbar">
        <button className="small ghost" onClick={() => navigate('/')}>
          ← Sair do editor
        </button>
        <input
          className="proto3d-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do mapa"
        />
        <div className="row" style={{ flex: 'none', gap: 6, flexWrap: 'wrap' }}>
          <button className="small" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}>
            −
          </button>
          <button className="small" onClick={() => setZoom(1)} title="Ctrl + scroll no mapa também dá zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button className="small" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
            +
          </button>
          <button className="small" onClick={() => bgInputRef.current?.click()}>
            🖼 {background ? 'Trocar fundo' : 'Importar fundo'}
          </button>
          {background && (
            <button className="small ghost" onClick={() => setBackground(undefined)}>
              limpar fundo
            </button>
          )}
          <details style={{ position: 'relative' }}>
            <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 6px' }}>⚙︎ Grade</summary>
            <div className="map-cfg">
              <div className="row">
                <div>
                  <label>Colunas</label>
                  <input type="number" value={cols} onChange={(e) => setCols(Math.max(5, Number(e.target.value)))} />
                </div>
                <div>
                  <label>Linhas</label>
                  <input type="number" value={rows} onChange={(e) => setRows(Math.max(5, Number(e.target.value)))} />
                </div>
              </div>
              <div className="field" style={{ marginTop: 6 }}>
                <label>Tamanho da célula (px)</label>
                <input
                  type="number"
                  value={cellSize}
                  onChange={(e) => setCellSize(Math.max(20, Number(e.target.value)))}
                />
              </div>
            </div>
          </details>
          <button
            className="small primary"
            onClick={onSave}
            disabled={saving === 'saving'}
            title={saving === 'error' ? 'A gravação falhou — o mapa provavelmente ficou grande demais' : undefined}
          >
            {saving === 'saved' ? '✓ Salvo' : saving === 'saving' ? 'Salvando…' : saving === 'error' ? '✗ Erro ao salvar' : '💾 Salvar'}
          </button>
        </div>
        {saving === 'error' && (
          <p className="faint" style={{ color: 'var(--blood-bright)', fontSize: 12, marginTop: 4 }}>
            Não deu pra salvar — o mapa provavelmente ficou grande demais (muitas peças de alta
            resolução). Tente remover alguma peça ou usar imagens menores.
          </p>
        )}
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
      </div>

      <div className="cine-body">
        <div className={'map-scroll' + (panning ? ' panning' : '')} ref={mapScrollRef} onWheel={onWheel}>
          <div
            className="grid-stage"
            ref={stageRef}
            style={{ width: W, height: H, transform: `scale(${zoom})` }}
            onPointerDown={onStagePan}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onStageDrop}
          >
            {background && <div className="grid-bg" style={{ backgroundImage: `url(${background})` }} />}

            {[...objects2d]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((o) => (
                <div
                  key={o.id}
                  className={'map-object2d editable' + (selId === o.id ? ' selected' : '') + (o.locked ? ' locked' : '')}
                  onPointerDown={(e) => onObjectPointerDown(e, o)}
                  style={{
                    left: renderX(o) * cellSize,
                    top: renderY(o) * cellSize,
                    width: o.width * cellSize,
                    height: o.height * cellSize,
                    transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
                    backgroundImage: `url(${o.imageUrl})`,
                    backgroundSize:
                      o.mode === 'tile' ? `${cellSize * (o.repeat || 1)}px ${cellSize * (o.repeat || 1)}px` : '100% 100%',
                    backgroundRepeat: o.mode === 'tile' ? 'repeat' : 'no-repeat',
                  }}
                />
              ))}

            <div
              className="grid-lines"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px),' +
                  'linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px)',
                backgroundSize: `${cellSize}px ${cellSize}px`,
              }}
            />
          </div>
          {objects2d.length === 0 && !background && (
            <p className="cine-scene-hint">
              Sem nada ainda — escolha uma peça na lista à direita pra plantar no centro da tela,
              ou arraste ela pro lugar exato. "🖼 Importar fundo" pra uma imagem de fundo única (ex.:
              planta baixa pronta). Botão esquerdo arrasta a câmera, Ctrl+scroll dá zoom.
            </p>
          )}
        </div>

        <div className="cine-hud">
          <div className="cine-hud-title">Peças de cenário</div>
          <p className="faint" style={{ fontSize: 11 }}>
            Clique numa peça pra plantar no centro da tela, ou arraste pro mapa.
          </p>
          <SceneryLibraryManager onPlant={plantAsset} />

          {selected && (
            <div className="cine-editor">
              <div className="cine-editor-title">Peça selecionada</div>
              <p className="faint" style={{ fontSize: 11, margin: 0 }}>
                <b>←/→</b> gira, <b>↑/↓</b> redimensiona (mantém proporção).
              </p>
              <div className="row" style={{ marginTop: 4 }}>
                <div>
                  <label>Largura</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.2}
                    value={selected.width}
                    onChange={(e) => patchObject(selected.id, { width: Math.max(0.2, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label>Altura</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.2}
                    value={selected.height}
                    onChange={(e) => patchObject(selected.id, { height: Math.max(0.2, Number(e.target.value)) })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Rotação</label>
                <input
                  type="number"
                  step={5}
                  value={selected.rotation}
                  onChange={(e) => patchObject(selected.id, { rotation: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Modo</label>
                <select
                  value={selected.mode ?? 'stretch'}
                  onChange={(e) => patchObject(selected.id, { mode: e.target.value as 'stretch' | 'tile' })}
                >
                  <option value="stretch">Esticar</option>
                  <option value="tile">Repetir (textura)</option>
                </select>
              </div>
              {selected.mode === 'tile' && (
                <div className="field">
                  <label>Tamanho do ladrilho</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={selected.repeat ?? 1}
                    onChange={(e) => patchObject(selected.id, { repeat: Math.max(0.1, Number(e.target.value)) })}
                  />
                </div>
              )}
              <div className="row" style={{ marginTop: 4 }}>
                <button className="small" onClick={() => patchObject(selected.id, { zIndex: nextZIndex() })}>
                  pra frente
                </button>
                <button
                  className="small"
                  onClick={() => {
                    const minZ = objects2d.length ? Math.min(...objects2d.map((o) => o.zIndex)) - 1 : 0;
                    patchObject(selected.id, { zIndex: minZ });
                  }}
                >
                  pra trás
                </button>
              </div>
              <div className="row">
                <button
                  className={'small' + (selected.locked ? ' primary' : '')}
                  onClick={() => patchObject(selected.id, { locked: !selected.locked })}
                >
                  🔒 {selected.locked ? 'travada' : 'travar'}
                </button>
                <button className="small ghost" onClick={() => removeObject(selected.id)}>
                  Remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
