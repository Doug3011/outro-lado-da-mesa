import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { CloseFloatIcon, MaximizeWinIcon, MinimizeWinIcon, RestoreWinIcon } from './icons';

const MIN_W = 220;
const MIN_H = 160;

// Contador global de z-index — cada janela flutuante aberta/focada sobe pra
// frente das outras (clicar na barra de título ou na alça de resize já traz
// pra frente). Módulo inteiro, não por instância: precisa ser único entre
// todas as janelas da mesa (Mestre, Tokens, Mapas, Ficha...).
let zCounter = 50;

// Janela flutuante reutilizável — barra de título arrastável (grip de
// pontinhos), botão fechar, alça de redimensionar no canto inferior
// direito, fundo escuro translúcido com blur. Portada do protótipo Godot
// (FloatingWindow.cs) pro mapa 2D em React.
//
// Nasce numa posição/tamanho relativos ao container real (ver
// `containerRef`, a camada flutuante dentro de `.map-area` em
// BattleMap.tsx) — não um pixel fixo assumindo uma resolução.
export function FloatingWindow({
  containerRef,
  title,
  open,
  onClose,
  leftFrac,
  topFrac,
  defaultWidth,
  defaultHeight,
  children,
  dock,
  icon,
  minimizable,
  maximizable,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  title: string;
  open: boolean;
  onClose: () => void;
  leftFrac: number;
  topFrac: number;
  defaultWidth: number;
  defaultHeight: number;
  children: ReactNode;
  // ---- REDESIGN Passo 4 (Mesa do mestre) ----
  // Mesmo espírito do `dock` de FloatingButton.tsx: só troca a casca
  // (cabeçalho com chip de ícone + título maior, fechar em SVG, corpo com
  // o respiro novo) quando a tela que chama passa a prop — Prototype2D.tsx/
  // Prototype3D.tsx continuam sem ela e mantêm o visual antigo. Arrastar/
  // fechar/redimensionar não mudam.
  dock?: boolean;
  // Ícone mostrado no chip do cabeçalho (modo dock) — normalmente o MESMO
  // ícone do FloatingButton que abre essa janela.
  icon?: ReactNode;
  // ---- REDESIGN Passo 5 (Ficha de personagem) ----
  // Botões extra de minimizar/maximizar no cabeçalho (modo dock) — opt-in
  // porque só a janela "Ficha" (BattleMap.tsx/Battle3D.tsx) pede isso na
  // referência (Mesa-Ficha.dc.html); as outras janelas (Mestre, Tokens,
  // Mapas, Dados...) continuam só com fechar, sem mudar nada pra elas.
  minimizable?: boolean;
  maximizable?: boolean;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [z, setZ] = useState(() => ++zCounter);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  // Guarda posição/tamanho de antes de maximizar/minimizar pra restaurar
  // no toggle seguinte — não precisa (nem deve) sobreviver a fechar/abrir
  // a janela de novo, por isso é só um ref local, não estado persistido.
  const restoreRef = useRef<{ pos: { left: number; top: number }; size: { width: number; height: number } } | null>(
    null,
  );
  const minimizedHeightRef = useRef<number | null>(null);

  const containerSize = () => {
    const el = containerRef.current;
    return { w: el?.clientWidth || window.innerWidth, h: el?.clientHeight || window.innerHeight };
  };

  const clampPos = (left: number, top: number, w: number) => {
    const { w: cw, h: ch } = containerSize();
    return {
      left: Math.max(0, Math.min(Math.max(0, cw - Math.min(w, 60)), left)),
      top: Math.max(0, Math.min(Math.max(0, ch - 34), top)),
    };
  };

  // Posição/tamanho iniciais — só na primeira vez que a janela abre.
  useLayoutEffect(() => {
    if (!open || pos) return;
    const { w: cw, h: ch } = containerSize();
    const width = Math.min(defaultWidth, Math.max(MIN_W, cw - 24));
    const height = Math.min(defaultHeight, Math.max(MIN_H, ch - 24));
    const left = cw * leftFrac;
    const top = ch * topFrac;
    setSize({ width, height });
    setPos(clampPos(left, top, width));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    const onResize = () => {
      const cur = posRef.current;
      const s = sizeRef.current;
      if (!cur || !s) return;
      setPos(clampPos(cur.left, cur.top, s.width));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bringToFront = () => setZ(++zCounter);

  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bringToFront();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = posRef.current ?? { left: 0, top: 0 };
    const s = sizeRef.current ?? { width: defaultWidth, height: defaultHeight };
    const onMove = (ev: PointerEvent) => {
      setPos(clampPos(origin.left + ev.clientX - startX, origin.top + ev.clientY - startY, s.width));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    bringToFront();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = sizeRef.current ?? { width: defaultWidth, height: defaultHeight };
    const onMove = (ev: PointerEvent) => {
      setSize({
        width: Math.max(MIN_W, origin.width + ev.clientX - startX),
        height: Math.max(MIN_H, origin.height + ev.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Maximizar guarda pos/tamanho de antes (restoreRef) pra voltar no toggle
  // seguinte; some com o minimizado se as duas estivessem ligadas (não dá
  // pra estar minimizado E maximizado ao mesmo tempo).
  const toggleMaximize = () => {
    if (!pos || !size) return;
    bringToFront();
    if (maximized) {
      const r = restoreRef.current;
      if (r) {
        setPos(r.pos);
        setSize(r.size);
      }
      setMaximized(false);
      return;
    }
    restoreRef.current = { pos, size };
    const { w, h } = containerSize();
    setPos({ left: 8, top: 8 });
    setSize({ width: Math.max(MIN_W, w - 16), height: Math.max(MIN_H, h - 16) });
    setMaximized(true);
    setMinimized(false);
  };

  // Minimizar só encolhe a altura pro tamanho do cabeçalho (mantém
  // posição/largura) — guarda a altura anterior em ref pra voltar.
  const toggleMinimize = () => {
    if (!size) return;
    bringToFront();
    if (minimized) {
      setSize({ width: size.width, height: minimizedHeightRef.current ?? defaultHeight });
      setMinimized(false);
      return;
    }
    minimizedHeightRef.current = size.height;
    setSize({ width: size.width, height: 52 });
    setMinimized(true);
  };

  if (!open || !pos || !size) return null;

  return (
    <div
      className={'floating-window' + (dock ? ' dock' : '') + (minimized ? ' minimized' : '')}
      style={{ left: pos.left, top: pos.top, width: size.width, height: size.height, zIndex: z }}
      onPointerDownCapture={bringToFront}
    >
      <div
        className={'floating-window-titlebar' + (dock ? ' dock' : '')}
        onPointerDown={onTitlePointerDown}
      >
        <div className="floating-window-titlewrap">
          <span className="floating-window-grip" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          {dock && icon && <span className="floating-window-icon-chip">{icon}</span>}
          <span className={'floating-window-title' + (dock ? ' dock' : '')}>{title}</span>
        </div>
        {dock && maximizable && (
          <button
            type="button"
            className="floating-window-tool dock"
            aria-label={maximized ? 'Restaurar janela' : 'Maximizar janela'}
            onClick={toggleMaximize}
          >
            {maximized ? <RestoreWinIcon /> : <MaximizeWinIcon />}
          </button>
        )}
        {dock && minimizable && (
          <button
            type="button"
            className="floating-window-tool dock"
            aria-label={minimized ? 'Restaurar janela' : 'Minimizar janela'}
            onClick={toggleMinimize}
          >
            <MinimizeWinIcon />
          </button>
        )}
        <button
          type="button"
          className={'floating-window-close' + (dock ? ' dock' : '')}
          aria-label="Fechar janela"
          onClick={onClose}
        >
          {dock ? <CloseFloatIcon /> : '✕'}
        </button>
      </div>
      <div className={'floating-window-body' + (dock ? ' dock' : '') + (minimized ? ' minimized' : '')}>
        {children}
      </div>
      <div
        className={'floating-window-resize' + (minimized ? ' minimized' : '')}
        aria-hidden="true"
        onPointerDown={onResizePointerDown}
      >
        <svg width="11" height="11" viewBox="0 0 10 10">
          <path d="M8 1 1 8M8 5 5 8" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
