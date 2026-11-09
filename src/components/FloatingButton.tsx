import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 3;

// Botão circular flutuante — azul-escuro translúcido, achatado (sem
// brilho/glossy), arrastável livremente pela tela (não é um dock fixo).
// Portado do protótipo Godot (FloatingButton.cs) pro mapa 2D em React.
//
// Nasce numa posição relativa ao tamanho REAL do container (não um pixel
// fixo assumindo uma resolução) — `containerRef` aponta pra camada
// flutuante dentro de `.map-area` (ver BattleMap.tsx), cuja largura/altura
// são lidas em runtime. `topFrac`/`rightFrac` são frações (0–1) relativas a
// essa área, ancoradas no canto superior direito por padrão (mesmo layout
// do mockup aprovado).
//
// Clique vs. arraste: mesmo limiar em pixels já usado no resto do app (ver
// onStagePan em BattleMap.tsx) — só dispara `onActivate` se o ponteiro não
// se moveu além do limiar entre o pointerdown e o pointerup.
export function FloatingButton({
  containerRef,
  label,
  icon,
  active,
  onActivate,
  topFrac,
  rightFrac,
  dock,
  shortcutKey,
  badge,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onActivate: () => void;
  topFrac: number;
  rightFrac: number;
  // ---- REDESIGN Passo 4 (Mesa do mestre) ----
  // `dock`: troca a casca pro visual "dock de vidro" (vermelho, tooltip com
  // nome+atalho só no hover, barrinha lateral quando ativo, badge
  // pulsando) — SEM mudar o mecanismo de arraste acima. Default (sem a
  // prop) mantém o visual azulado antigo intocado, porque Prototype2D.tsx/
  // Prototype3D.tsx (Área do mestre, ainda não redesenhada) usam o MESMO
  // componente e não devem herdar essa aparência nova.
  dock?: boolean;
  // Atalho de teclado mostrado no tooltip (ex.: "F") — só exibição; quem
  // de fato registra o `keydown` é a tela (BattleMap.tsx/Battle3D.tsx).
  shortcutKey?: string;
  // Contagem de "novidade" (ex.: rolagens novas desde a última vez que a
  // janela abriu) — `undefined`/0 não mostra nada.
  badge?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const containerSize = () => {
    const el = containerRef.current;
    return { w: el?.clientWidth || window.innerWidth, h: el?.clientHeight || window.innerHeight };
  };

  const clamp = (left: number, top: number) => {
    const { w, h } = containerSize();
    const bw = rootRef.current?.offsetWidth ?? 140;
    const bh = rootRef.current?.offsetHeight ?? 48;
    return {
      left: Math.max(0, Math.min(Math.max(0, w - bw), left)),
      top: Math.max(0, Math.min(Math.max(0, h - bh), top)),
    };
  };

  // Posição inicial, calculada só uma vez (depois disso o botão é livre —
  // o usuário pode arrastar pra qualquer canto, igual ao Godot).
  useLayoutEffect(() => {
    const { w, h } = containerSize();
    const bw = rootRef.current?.offsetWidth ?? 140;
    const left = w - w * rightFrac - bw;
    const top = h * topFrac;
    setPos(clamp(left, top));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se a janela/área mudar de tamanho (ex.: redimensionar a janela do
  // Electron), só reclampa pra não sumir da tela — não reseta a posição
  // escolhida pelo usuário.
  useLayoutEffect(() => {
    const onResize = () => {
      const cur = posRef.current;
      if (!cur) return;
      setPos((p) => (p ? clamp(p.left, p.top) : p));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = posRef.current ?? { left: 0, top: 0 };
    let dragging = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragging = true;
      if (dragging) setPos(clamp(origin.left + dx, origin.top + dy));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!dragging) onActivate();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!pos) return null;

  if (dock) {
    return (
      <div ref={rootRef} className="floating-btn dock" style={{ left: pos.left, top: pos.top }}>
        <button
          type="button"
          className={'floating-btn-circle dock' + (active ? ' active' : '')}
          aria-label={label}
          aria-pressed={active}
          onPointerDown={onPointerDown}
        >
          {icon}
          {active && <span className="floating-btn-bar" aria-hidden="true" />}
          {!!badge && (
            <span className="floating-btn-badge" aria-hidden="true">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>
        <span className="floating-btn-tip" aria-hidden="true">
          {label}
          {shortcutKey && <span className="floating-btn-tip-key">{shortcutKey}</span>}
        </span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="floating-btn" style={{ left: pos.left, top: pos.top }}>
      <span className="floating-btn-label">{label}</span>
      <button
        type="button"
        className="floating-btn-circle"
        aria-label={label}
        onPointerDown={onPointerDown}
      >
        {icon}
        {active && <span className="floating-btn-dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
