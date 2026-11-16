import { useEffect, useRef, useState } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { fileToDownscaledDataURL } from '../lib/image';
import { boardImageSrc, dataUrlToBlob, registerLocalBoardImage, uploadBoardImage } from '../lib/boardImages';
import { uid } from '../lib/ids';
import type { BoardItem, BoardItemType, BoardLink, BoardStroke } from '../types';

// Quadro de investigação — cork board compartilhado da mesa, pedido do
// usuário (referência visual: Quadro-Investigacao.dc.html). Um componente
// só, usado igual nas duas mesas (2D e 3D) — ver BattleMap.tsx/Battle3D.tsx.
//
// Mostra "Arquivo do mestre" (vault de provas ocultas) só pro mestre, lendo
// `useIdentity()` direto aqui dentro — mesmo espírito do GmCharacterTabs,
// sem precisar de prop vinda de fora.

type Tool = 'mover' | 'ligar' | 'desenhar' | 'nota' | 'borracha';

const TOOLS: { key: Tool; label: string; icon: string }[] = [
  { key: 'mover', label: 'Mover', icon: 'M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3' },
  { key: 'ligar', label: 'Ligar com fio', icon: 'M4 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M16 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.5 7.5Q9 15 16.5 16.5' },
  { key: 'desenhar', label: 'Desenhar', icon: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3' },
  { key: 'nota', label: 'Anotação', icon: 'M5 4h14v10l-6 6H5zM13 20v-6h6' },
  { key: 'borracha', label: 'Borracha', icon: 'M8 20h12M5 15l8-8 6 6-5 5H9z' },
];
const PENS = [
  { c: '#E0161E', label: 'Vermelho' },
  { c: '#141414', label: 'Preto' },
  { c: '#F2EEE6', label: 'Branco' },
  { c: '#E8B730', label: 'Amarelo' },
];
const NOTE_COLORS = ['#F5D547', '#F4A6B8', '#9FD8A8', '#A8CFF2'];
const BASE_W: Record<'photo' | 'doc', number> = { photo: 156, doc: 190 };
const NOTE_W = 150;
const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
const SEND_EVERY_MS = 45;
const UNDO_LIMIT = 20;

type UndoEntry =
  | { kind: 'move'; id: string; x: number; y: number }
  | { kind: 'resize'; id: string; sc: number }
  | { kind: 'create-item'; id: string }
  | { kind: 'create-link'; id: string }
  | { kind: 'create-stroke'; id: string }
  | { kind: 'delete-item'; item: BoardItem; links: BoardLink[] };

function itemWidth(it: BoardItem): number {
  return it.type === 'note' ? NOTE_W : BASE_W[it.type as 'photo' | 'doc'] * it.sc;
}
function pin(it: BoardItem): [number, number] {
  return [it.x + itemWidth(it) / 2, it.y + 8];
}
function curve(a: [number, number], b: [number, number]): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  return `M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + d * 0.14} ${b[0]} ${b[1]}`;
}
function pt(e: { clientX: number; clientY: number }, el: HTMLElement): [number, number] {
  const r = el.getBoundingClientRect();
  const k = el.offsetWidth / (r.width || 1);
  return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
}
function pathOfPoints(pts: [number, number][]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

const TOOL_HINTS: Record<Tool, (linking: boolean, isGM: boolean) => string> = {
  mover: () => 'Arraste para organizar; clique para selecionar e use a lixeira (ou Delete) para apagar',
  ligar: (linking) =>
    linking ? 'Agora clique na outra prova para esticar o fio' : 'Clique em uma prova e depois em outra para ligar com fio',
  desenhar: () => 'Desenhe e circule direto no quadro',
  nota: () => 'Clique em um espaço vazio para colar uma anotação',
  borracha: () => 'Clique em um fio ou desenho para apagar',
};

interface VaultEntry {
  id: string;
  title: string;
  dataUrl: string;
  kind: 'photo' | 'doc';
}

export function InvestigationBoard() {
  const { me } = useIdentity();
  const board = useTableStore((s) => s.board);
  const roomMode = useTableStore((s) => s.mode);
  const roomCode = useTableStore((s) => s.code);
  const upsertBoardItem = useTableStore((s) => s.upsertBoardItem);
  const moveBoardItemLive = useTableStore((s) => s.moveBoardItemLive);
  const resizeBoardItemLive = useTableStore((s) => s.resizeBoardItemLive);
  const deleteBoardItem = useTableStore((s) => s.deleteBoardItem);
  const addBoardLink = useTableStore((s) => s.addBoardLink);
  const deleteBoardLink = useTableStore((s) => s.deleteBoardLink);
  const addBoardStroke = useTableStore((s) => s.addBoardStroke);
  const deleteBoardStroke = useTableStore((s) => s.deleteBoardStroke);

  const [tool, setTool] = useState<Tool>('mover');
  const [pen, setPen] = useState(PENS[0].c);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [live, setLive] = useState<{ pts: [number, number][]; color: string } | null>(null);
  const [liveDrag, setLiveDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [liveResize, setLiveResize] = useState<{ id: string; sc: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [editingText, setEditingText] = useState<Record<string, string>>({});
  const [undoCount, setUndoCount] = useState(0);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; fromX: number; fromY: number } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startSc: number; baseW: number } | null>(null);
  const inkRef = useRef<[number, number][] | null>(null);
  const undoRef = useRef<UndoEntry[]>([]);
  const lastMoveSentRef = useRef(0);
  const lastResizeSentRef = useRef(0);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const noteColorRef = useRef(0);
  const textTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setLinkFrom(null);
    setCursor(null);
    setConfirmClear(false);
  }, [tool]);

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2800);
  };

  const pushUndo = (entry: UndoEntry) => {
    undoRef.current = [...undoRef.current, entry].slice(-UNDO_LIMIT);
    setUndoCount(undoRef.current.length);
  };

  const undo = () => {
    const stack = undoRef.current;
    if (!stack.length) return;
    const last = stack[stack.length - 1];
    undoRef.current = stack.slice(0, -1);
    setUndoCount(undoRef.current.length);
    switch (last.kind) {
      case 'move': {
        const it = board.items.find((x) => x.id === last.id);
        if (it) upsertBoardItem({ ...it, x: last.x, y: last.y });
        break;
      }
      case 'resize': {
        const it = board.items.find((x) => x.id === last.id);
        if (it) upsertBoardItem({ ...it, sc: last.sc });
        break;
      }
      case 'create-item':
        deleteBoardItem(last.id);
        break;
      case 'create-link':
        deleteBoardLink(last.id);
        break;
      case 'create-stroke':
        deleteBoardStroke(last.id);
        break;
      case 'delete-item':
        upsertBoardItem(last.item);
        for (const l of last.links) addBoardLink(l);
        break;
    }
  };

  const byId = (id: string) => board.items.find((it) => it.id === id);

  // ---- item: mover / ligar / borracha (desenhar/nota passam direto pro
  // quadro por baixo, ver onBoardPointerDown) ----
  const onItemPointerDown = (e: React.PointerEvent, it: BoardItem) => {
    if (tool === 'mover') {
      setSelectedId(it.id);
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return; // deixa focar a nota pra digitar, sem iniciar arraste
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const p = pt(e, boardEl);
      dragRef.current = { id: it.id, dx: p[0] - it.x, dy: p[1] - it.y, fromX: it.x, fromY: it.y };
      try {
        boardEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignora */
      }
      if (it.fresh) upsertBoardItem({ ...it, fresh: false });
    } else if (tool === 'ligar') {
      if (linkFrom == null) {
        setLinkFrom(it.id);
        setCursor(pin(it));
      } else if (linkFrom !== it.id) {
        const exists = board.links.some(
          (l) => (l.a === linkFrom && l.b === it.id) || (l.a === it.id && l.b === linkFrom),
        );
        if (!exists) {
          const link: BoardLink = { id: uid(), a: linkFrom, b: it.id, createdBy: me.id };
          addBoardLink(link);
          pushUndo({ kind: 'create-link', id: link.id });
        }
        setLinkFrom(null);
        setCursor(null);
      }
    }
  };

  // ---- apagar item selecionado (lixeira sempre visível + tecla Delete) ----
  const deleteSelected = () => {
    const id = selectedId;
    if (!id) return;
    const it = byId(id);
    if (!it) {
      setSelectedId(null);
      return;
    }
    if (it.type !== 'note' && !me.isGM) {
      showToast('Só o mestre pode apagar provas do quadro');
      return;
    }
    const removedLinks = board.links.filter((l) => l.a === it.id || l.b === it.id);
    deleteBoardItem(it.id);
    pushUndo({ kind: 'delete-item', item: it, links: removedLinks });
    setSelectedId(null);
  };
  const deleteSelectedRef = useRef(deleteSelected);
  deleteSelectedRef.current = deleteSelected;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;
      if (!selectedId) return;
      e.preventDefault();
      deleteSelectedRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !board.items.some((it) => it.id === selectedId)) setSelectedId(null);
  }, [board.items, selectedId]);

  const onResizeHandleDown = (e: React.PointerEvent, it: BoardItem) => {
    e.stopPropagation();
    const boardEl = boardRef.current;
    if (!boardEl || it.type === 'note') return;
    const p = pt(e, boardEl);
    resizeRef.current = { id: it.id, startX: p[0], startSc: it.sc, baseW: BASE_W[it.type as 'photo' | 'doc'] };
    try {
      boardEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
  };

  // ---- quadro (fundo): desenhar / colar anotação / cancelar fio ----
  const onBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const boardEl = e.currentTarget;
    const onItemEl = (e.target as HTMLElement).closest('[data-inv-item]');
    const p = pt(e, boardEl);
    if (tool === 'desenhar') {
      inkRef.current = [p];
      try {
        boardEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignora */
      }
      setLive({ pts: [p], color: pen });
    } else if (tool === 'nota' && !onItemEl) {
      const color = NOTE_COLORS[noteColorRef.current % NOTE_COLORS.length];
      noteColorRef.current += 1;
      const item: BoardItem = {
        id: uid(),
        type: 'note',
        x: Math.round(p[0] - 75),
        y: Math.round(p[1] - 20),
        rot: Math.round(Math.random() * 14 - 7),
        sc: 1,
        text: '',
        color,
        fresh: true,
        createdBy: me.id,
      };
      upsertBoardItem(item);
      pushUndo({ kind: 'create-item', id: item.id });
    } else if (tool === 'ligar' && !onItemEl && linkFrom != null) {
      setLinkFrom(null);
      setCursor(null);
    } else if (tool === 'mover' && !onItemEl) {
      setSelectedId(null);
    }
  };

  const onBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current && !resizeRef.current && !inkRef.current && linkFrom == null) return;
    const p = pt(e, e.currentTarget);
    if (dragRef.current) {
      const { id, dx, dy } = dragRef.current;
      const nx = Math.round(p[0] - dx);
      const ny = Math.round(p[1] - dy);
      setLiveDrag({ id, x: nx, y: ny });
      const now = performance.now();
      if (now - lastMoveSentRef.current > SEND_EVERY_MS) {
        lastMoveSentRef.current = now;
        moveBoardItemLive(id, nx, ny);
      }
    } else if (resizeRef.current) {
      const { id, startX, startSc, baseW } = resizeRef.current;
      const sc = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startSc + (p[0] - startX) / baseW));
      setLiveResize({ id, sc });
      const now = performance.now();
      if (now - lastResizeSentRef.current > SEND_EVERY_MS) {
        lastResizeSentRef.current = now;
        resizeBoardItemLive(id, sc);
      }
    } else if (inkRef.current) {
      const last = inkRef.current[inkRef.current.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > 2) {
        inkRef.current = [...inkRef.current, p];
        setLive({ pts: inkRef.current, color: pen });
      }
    } else if (linkFrom != null) {
      setCursor(p);
    }
  };

  const onBoardPointerUp = () => {
    if (dragRef.current) {
      const { id, fromX, fromY } = dragRef.current;
      dragRef.current = null;
      const moved = liveDrag && liveDrag.id === id;
      setLiveDrag(null);
      if (moved) {
        const it = byId(id);
        if (it) {
          const finalItem = { ...it, x: liveDrag!.x, y: liveDrag!.y };
          upsertBoardItem(finalItem);
          if (finalItem.x !== fromX || finalItem.y !== fromY) pushUndo({ kind: 'move', id, x: fromX, y: fromY });
        }
      }
    }
    if (resizeRef.current) {
      const { id, startSc } = resizeRef.current;
      resizeRef.current = null;
      const resized = liveResize && liveResize.id === id;
      setLiveResize(null);
      if (resized) {
        const it = byId(id);
        if (it) {
          const finalItem = { ...it, sc: liveResize!.sc };
          upsertBoardItem(finalItem);
          if (finalItem.sc !== startSc) pushUndo({ kind: 'resize', id, sc: startSc });
        }
      }
    }
    if (inkRef.current) {
      const pts = inkRef.current;
      inkRef.current = null;
      setLive(null);
      if (pts.length > 1) {
        const stroke: BoardStroke = { id: uid(), color: pen, points: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), createdBy: me.id };
        addBoardStroke(stroke);
        pushUndo({ kind: 'create-stroke', id: stroke.id });
      }
    }
  };

  // ---- texto da nota (debounce de 350ms antes de sincronizar, mesmo
  // idioma de CharacterSheet.tsx) ----
  const onNoteTextChange = (it: BoardItem, text: string) => {
    setEditingText((d) => ({ ...d, [it.id]: text }));
    const timers = textTimersRef.current;
    window.clearTimeout(timers.get(it.id));
    const t = window.setTimeout(() => {
      upsertBoardItem({ ...it, text });
      setEditingText((d) => {
        const next = { ...d };
        delete next[it.id];
        return next;
      });
      timers.delete(it.id);
    }, 350);
    timers.set(it.id, t);
  };

  // ---- apagar todos os desenhos (confirmação própria, não window.confirm) ----
  const confirmClearInk = () => {
    setConfirmClear(false);
    const toRemove = board.strokes.filter((k) => me.isGM || k.createdBy === me.id);
    for (const k of toRemove) deleteBoardStroke(k.id);
  };

  // ---- vault (provas guardadas, ocultas — só local, ver lib/boardImages.ts) ----
  const onVaultFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const dataUrl = await fileToDownscaledDataURL(f, 1600, 0.85);
    if (!dataUrl) return;
    setVault((v) => [...v, { id: uid(), title: f.name.replace(/\.[^.]+$/, '').slice(0, 40), dataUrl, kind: 'photo' }]);
  };

  const sendVaultEntry = (entry: VaultEntry) => {
    // A própria tela de quem envia já tem a imagem em memória (não precisa
    // esperar o upload pra ver) — o upload é só pros OUTROS conseguirem
    // buscar essa mesma imagem depois (ver lib/boardImages.ts).
    registerLocalBoardImage(entry.id, entry.dataUrl);
    const item: BoardItem = {
      id: uid(),
      type: entry.kind,
      x: 60 + ((board.items.length * 47) % 420),
      y: 60 + ((board.items.length * 61) % 260),
      rot: Math.round(Math.random() * 18 - 9),
      sc: 1,
      title: entry.title,
      imageId: entry.id,
      fresh: true,
      createdBy: me.id,
    };
    upsertBoardItem(item);
    pushUndo({ kind: 'create-item', id: item.id });
    setVault((v) => v.filter((x) => x.id !== entry.id));
    showToast(`O mestre enviou uma nova prova: ${entry.title}`);
    void (async () => {
      const blob = await dataUrlToBlob(entry.dataUrl);
      const ok = await uploadBoardImage(entry.id, blob, roomMode, roomCode);
      if (!ok) showToast(`Não consegui enviar a imagem de "${entry.title}" pros outros — tenta de novo`);
    })();
  };

  const pendingD = linkFrom != null && cursor ? (() => {
    const from = byId(linkFrom);
    return from ? curve(pin(from), cursor) : '';
  })() : '';

  const nPhotos = board.items.filter((x) => x.type !== 'note').length;
  const nNotes = board.items.filter((x) => x.type === 'note').length;

  return (
    <div className="inv-root">
      <div role="toolbar" aria-label="Ferramentas do quadro" aria-orientation="vertical" className="inv-tools">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`inv-tool-btn${tool === t.key ? ' on' : ''}`}
            aria-pressed={tool === t.key}
            aria-label={t.label}
            title={t.label}
            onClick={() => setTool(t.key)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
          </button>
        ))}
        {tool === 'desenhar' && (
          <div className="inv-pen-row">
            {PENS.map((p) => (
              <button
                key={p.c}
                type="button"
                aria-label={`Caneta ${p.label}`}
                aria-pressed={pen === p.c}
                className={`inv-pen-dot${pen === p.c ? ' on' : ''}`}
                style={{ background: p.c }}
                onClick={() => setPen(p.c)}
              />
            ))}
          </div>
        )}
        <div className="inv-tool-sep" />
        <button
          type="button"
          className="inv-tool-btn"
          aria-label="Desfazer"
          title="Desfazer"
          disabled={undoCount === 0}
          style={undoCount === 0 ? { opacity: 0.35 } : undefined}
          onClick={undo}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
          </svg>
        </button>
        <button
          type="button"
          className="inv-tool-btn inv-trash-btn"
          aria-label="Apagar item selecionado"
          title="Apagar item selecionado (Delete)"
          disabled={!selectedId}
          style={!selectedId ? { opacity: 0.35 } : undefined}
          onClick={deleteSelected}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
          </svg>
        </button>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="inv-tool-btn"
            aria-label="Apagar todos os desenhos"
            title="Apagar todos os desenhos"
            onClick={() => setConfirmClear((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
          </button>
          {confirmClear && (
            <div className="inv-confirm-pop">
              <span>Apagar {me.isGM ? 'TODOS os desenhos' : 'seus desenhos'}?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="small" onClick={confirmClearInk}>
                  Apagar
                </button>
                <button className="small ghost" onClick={() => setConfirmClear(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="inv-board-outer">
        <div className="inv-board-frame">
          <div
            ref={boardRef}
            data-inv-board="1"
            className={`inv-board tool-${tool}`}
            onPointerDown={onBoardPointerDown}
            onPointerMove={onBoardPointerMove}
            onPointerUp={onBoardPointerUp}
            onPointerLeave={onBoardPointerUp}
          >
            <div className="inv-cork-texture" aria-hidden="true" />
            <div className="inv-lamp-light" aria-hidden="true" />
            <div className="inv-vignette" aria-hidden="true" />
            {DUST.map((style, i) => (
              <span key={i} className="inv-dust-mote" aria-hidden="true" style={style} />
            ))}

            {board.items.map((raw) => {
              const it =
                liveDrag && liveDrag.id === raw.id
                  ? { ...raw, x: liveDrag.x, y: liveDrag.y }
                  : liveResize && liveResize.id === raw.id
                    ? { ...raw, sc: liveResize.sc }
                    : raw;
              const w = itemWidth(it);
              const canResize = tool === 'mover' && it.type !== 'note';
              const src = boardImageSrc(it.imageId, roomMode, roomCode);
              return (
                <div
                  key={it.id}
                  data-inv-item="1"
                  className={`inv-item${it.fresh ? ' fresh' : ''}`}
                  style={{
                    left: it.x,
                    top: it.y,
                    width: w,
                    transform: `rotate(${it.rot}deg)`,
                    zIndex: board.items.findIndex((x) => x.id === it.id) + 1,
                    cursor: tool === 'mover' ? 'grab' : tool === 'ligar' ? 'crosshair' : undefined,
                  }}
                  onPointerDown={(e) => onItemPointerDown(e, it)}
                >
                  {it.type === 'photo' && (
                    <div className="inv-item-photo">
                      <div className="inv-item-photo-img">
                        {src ? <img src={src} alt={it.title ?? ''} draggable={false} /> : <div style={{ width: '100%', height: '100%' }} />}
                      </div>
                      <div className="inv-item-photo-title">{it.title}</div>
                    </div>
                  )}
                  {it.type === 'doc' && (
                    <div className="inv-item-doc">
                      <span className="inv-item-doc-kicker">PROVA</span>
                      <span className="inv-item-doc-title">{it.title}</span>
                      {src && (
                        <div className="inv-item-doc-img">
                          <img src={src} alt={it.title ?? ''} draggable={false} />
                        </div>
                      )}
                    </div>
                  )}
                  {it.type === 'note' && (
                    <div className="inv-item-note" style={{ background: it.color }}>
                      <textarea
                        aria-label="Anotação"
                        spellCheck={false}
                        value={editingText[it.id] ?? it.text ?? ''}
                        onChange={(e) => onNoteTextChange(it, e.target.value)}
                      />
                    </div>
                  )}
                  <span className="inv-pin" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${PIN_COLOR[it.type]} 45%, #000 140%)` }} />
                  {it.fresh && <span className="inv-fresh-badge">NOVA</span>}
                  {linkFrom === it.id && <span className="inv-linking-outline" />}
                  {selectedId === it.id && <span className="inv-selected-outline" />}
                  {canResize && <span className="inv-resize-handle" onPointerDown={(e) => onResizeHandleDown(e, it)} />}
                  {liveResize && liveResize.id === it.id && <span className="inv-resize-label">{Math.round(liveResize.sc * 100)}%</span>}
                </div>
              );
            })}

            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 50 }}>
              <defs>
                <filter id="inv-shadow" x="-10%" y="-10%" width="120%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>
              {board.links.map((l) => {
                const a = byId(l.a);
                const b = byId(l.b);
                if (!a || !b) return null;
                return (
                  <path
                    key={l.id}
                    d={curve(pin(a), pin(b))}
                    fill="none"
                    stroke="var(--inv-red)"
                    strokeWidth={tool === 'borracha' ? 6 : 2.4}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    filter="url(#inv-shadow)"
                    style={{
                      animation: 'inv-draw 0.9s ease-out both',
                      pointerEvents: tool === 'borracha' ? 'stroke' : 'none',
                      cursor: tool === 'borracha' ? 'not-allowed' : undefined,
                    }}
                    onClick={() => {
                      if (tool === 'borracha') deleteBoardLink(l.id);
                    }}
                  />
                );
              })}
              {pendingD && (
                <path d={pendingD} fill="none" stroke="var(--inv-red-bright)" strokeWidth={2.2} strokeDasharray="6 5" style={{ animation: 'inv-dash 0.6s linear infinite' }} />
              )}
              {board.strokes.map((k) => (
                <path
                  key={k.id}
                  d={pathOfPoints(k.points)}
                  fill="none"
                  stroke={k.color}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: tool === 'borracha' ? 'stroke' : 'none', cursor: tool === 'borracha' ? 'not-allowed' : undefined }}
                  onClick={() => {
                    if (tool === 'borracha') deleteBoardStroke(k.id);
                  }}
                />
              ))}
              {live && live.pts.length > 1 && (
                <path d={pathOfPoints(live.pts)} fill="none" stroke={live.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
              )}
            </svg>

            <div className="inv-hint">
              <span className="inv-hint-dot" />
              {TOOL_HINTS[tool](linkFrom != null, me.isGM)}
            </div>
            {toast && <div className="inv-toast" role="status">{toast}</div>}
          </div>
        </div>
        <div className="inv-lamp" aria-hidden="true">
          <svg width="68" height="46" viewBox="0 0 68 46">
            <rect x="31" y="0" width="6" height="12" fill="#2a2420" />
            <path d="M14 40 C14 20 54 20 54 40z" fill="#2e2822" stroke="#4a4036" strokeWidth="1.5" />
            <ellipse cx="34" cy="40" rx="20" ry="4" fill="#ffe2a0" />
          </svg>
        </div>
      </div>

      {me.isGM && (
        <aside aria-label="Arquivo do mestre" className="inv-vault">
          <div className="inv-vault-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span>ARQUIVO DO MESTRE</span>
          </div>
          <span className="inv-vault-sub">Só você vê esta área. As provas só aparecem pros jogadores quando você envia.</span>
          <label className="inv-vault-drop">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#E8B730" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Adicionar prova</span>
            <span style={{ fontSize: 11, color: '#a8916a' }}>Imagem do computador</span>
            <input type="file" accept="image/*" onChange={onVaultFile} />
          </label>
          <span className="inv-vault-label">GUARDADAS ({vault.length})</span>
          {vault.length === 0 && (
            <span style={{ fontSize: 12, color: '#6e6252', textAlign: 'center', padding: '10px 0' }}>Nenhuma prova guardada ainda.</span>
          )}
          {vault.map((v) => (
            <div key={v.id} className="inv-vault-item">
              <div className="inv-vault-thumb">
                <img src={v.dataUrl} alt="" />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <input
                  className="inv-vault-title-input"
                  value={v.title}
                  placeholder="Título"
                  onChange={(e) => setVault((list) => list.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)))}
                />
                <select
                  value={v.kind}
                  onChange={(e) => setVault((list) => list.map((x) => (x.id === v.id ? { ...x, kind: e.target.value as 'photo' | 'doc' } : x)))}
                  style={{ fontSize: 11, height: 22, background: 'transparent', color: '#a8916a', border: '1px solid #2e2418', borderRadius: 6 }}
                >
                  <option value="photo">Foto</option>
                  <option value="doc">Documento</option>
                </select>
              </div>
              <button className="inv-vault-send" onClick={() => sendVaultEntry(v)} aria-label={`Enviar ${v.title} pro quadro`}>
                ENVIAR
              </button>
            </div>
          ))}
          <div className="inv-vault-footer">
            <span className="inv-vault-label">NO QUADRO</span>
            <span style={{ fontSize: 13, color: '#d8cbb4' }}>
              {nPhotos} prova{nPhotos === 1 ? '' : 's'} · {nNotes} anotaç{nNotes === 1 ? 'ão' : 'ões'} · {board.links.length} fio
              {board.links.length === 1 ? '' : 's'} · {board.strokes.length} desenho{board.strokes.length === 1 ? '' : 's'}
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}

const PIN_COLOR: Record<BoardItemType, string> = { photo: '#E0161E', doc: '#E8B730', note: '#4A8BF0' };

const DUST = Array.from({ length: 8 }, (_, i) => ({
  left: `${38 + ((i * 13) % 26)}%`,
  top: `${(i * 7) % 20}%`,
  animation: `inv-dust ${9 + (i % 3) * 3}s linear ${(-(i * 1.7)).toFixed(1)}s infinite`,
})) as unknown as React.CSSProperties[];
