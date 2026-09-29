import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { randomColor, uid } from '../lib/ids';
import { fileToDownscaledDataURL, urlToDownscaledDataURL } from '../lib/image';
import { askText } from '../state/promptDialog';
import { TOKEN_DRAG_MIME, tokenAssetUrl, type TokenDragPayload } from '../lib/tokenLibrary';
import { MapPickerDialog } from './MapPickerDialog';
import { PlacePickerDialog } from './PlacePickerDialog';
import type { Token } from '../types';

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
  const [measure, setMeasure] = useState(false);
  const [measureLine, setMeasureLine] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
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

  const W = map.cols * map.cellSize;
  const H = map.rows * map.cellSize;
  const selected = selId ? tokens[selId] : null;

  const clientToCell = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      cx: (clientX - rect.left) / zoom / map.cellSize,
      cy: (clientY - rect.top) / zoom / map.cellSize,
    };
  };

  /* -------- arraste de token (listeners em window: não perde o mouse em movimento rápido) -------- */
  const onTokenPointerDown = (e: React.PointerEvent, t: Token) => {
    if (measure || fogMode) return;
    e.stopPropagation();
    e.preventDefault();
    setSelId(t.id);

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
      setDrag({ id: t.id, x: cur.x, y: cur.y });
      const now = performance.now();
      if (now - lastSentRef.current > SEND_EVERY_MS) {
        lastSentRef.current = now;
        moveToken(t.id, cur.x, cur.y);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (moved) {
        // posição final via upsert: persiste no cache/BD além de sincronizar
        upsertToken({ ...t, x: Math.round(cur.x * 2) / 2, y: Math.round(cur.y * 2) / 2 });
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

  // Atalhos de teclado pro token selecionado — ←/→ giram 15° (mesmo passo
  // dos botões "Virar pra"), ↑/↓ ajustam o tamanho PIXEL A PIXEL (liberdade
  // fina, independente dos múltiplos de célula do seletor). Ignora quando o
  // foco tá num campo de texto/número (ex.: digitando o nome do token),
  // senão roubaria a seta do cursor/digitação.
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        patchToken({ rotation: (((selected.rotation ?? 0) - 15) % 360 + 360) % 360 });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        patchToken({ rotation: (((selected.rotation ?? 0) + 15) % 360 + 360) % 360 });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        patchToken({ sizePx: Math.min(tokenPxSize(selected) + 1, map.cellSize * 10) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        patchToken({ sizePx: Math.max(tokenPxSize(selected) - 1, 8) });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, map.cellSize]);

  const onPickTokenImage = async (file: File | undefined) => {
    if (!file || !selected) return;
    const url = await fileToDownscaledDataURL(file, 320);
    if (url) patchToken({ image: url });
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

  const renderX = (t: Token) => (drag && drag.id === t.id ? drag.x : t.x);
  const renderY = (t: Token) => (drag && drag.id === t.id ? drag.y : t.y);

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

      {selected && (
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
            Token selecionado: <b>←/→</b> gira, <b>↑/↓</b> ajusta o tamanho pixel a pixel.
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
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => setSelId(null)}>
              Fechar
            </button>
            <button
              className="small ghost"
              onClick={() => {
                deleteToken(selected.id);
                setSelId(null);
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
              className={'token ' + (free ? 'token-free ' : '') + (selId === t.id ? 'selected' : '')}
              onPointerDown={(e) => onTokenPointerDown(e, t)}
              style={{
                left: renderX(t) * map.cellSize,
                top: renderY(t) * map.cellSize,
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
