import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

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
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [z, setZ] = useState(() => ++zCounter);
  const posRef = useRef(pos);
  posRef.current = pos;
  const sizeRef = useRef(size);
  sizeRef.current = size;

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

  if (!open || !pos || !size) return null;

  return (
    <div
      className="floating-window"
      style={{ left: pos.left, top: pos.top, width: size.width, height: size.height, zIndex: z }}
      onPointerDownCapture={bringToFront}
    >
      <div className="floating-window-titlebar" onPointerDown={onTitlePointerDown}>
        <div className="floating-window-titlewrap">
          <span className="floating-window-grip" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="floating-window-title">{title}</span>
        </div>
        <button type="button" className="floating-window-close" aria-label="Fechar janela" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="floating-window-body">{children}</div>
      <div
        className="floating-window-resize"
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
