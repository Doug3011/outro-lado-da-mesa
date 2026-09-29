import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import type { SceneKind } from '../types';

// Tela de transição entre mesa 2D e 3D (pedido do usuário: trocar de mesa
// hoje é um corte seco — o componente antigo desmonta e o novo já aparece
// pela metade enquanto texturas/modelos ainda carregam). Amarrada ao
// carregamento DE VERDADE, não é só uma animação de duração fixa:
// - mesa 3D: `useProgress` (drei) lê o `THREE.DefaultLoadingManager`, que
//   TODO carregamento de textura/modelo do projeto já passa por baixo dos
//   panos via `useLoader` (ver `scene3d.tsx`/`Battle3D.tsx`) — funciona sem
//   nenhuma instrumentação extra.
// - mesa 2D: não passa pelo three.js nenhuma, então pré-carregamos a imagem
//   de fundo do mapa manualmente com `new Image()`.
// Duração mínima (`MIN_VISIBLE_MS`) garante que a animação sempre apareça
// de verdade mesmo quando tudo já está em cache (senão pisca e some).
const MIN_VISIBLE_MS = 900;
const SIGIL_COUNT = 5;
// tempo de graça pra decidir "essa cena não tinha nada pra carregar" (3D
// sem asset novo — ex. reentrar numa cena já vista) em vez de esperar pra
// sempre por um `active=true` que nunca vai vir.
const NOTHING_TO_LOAD_GRACE_MS = 220;
// duração do fade de saída (`.scene-transition.leaving`) — some suave em vez
// de sumir seco quando o carregamento termina, simétrico ao fade de entrada.
const FADE_OUT_MS = 280;
// teto de segurança: se por qualquer motivo o carregamento real nunca sinalizar
// "terminou" (asset que trava, evento que nunca dispara), força a virada de
// qualquer jeito em vez de deixar a tela presa pra sempre atrás do overlay.
const MAX_WAIT_MS = 15000;

export function SceneTransition({
  kind,
  mapImageUrl,
  onReady,
}: {
  kind: SceneKind;
  mapImageUrl?: string;
  onReady: () => void;
}) {
  const { progress: threeProgress, active: threeActive } = useProgress();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const startRef = useRef(Date.now());
  const hasStartedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (threeActive) hasStartedRef.current = true;
  }, [threeActive]);

  useEffect(() => {
    if (kind !== '2d') return;
    if (!mapImageUrl) {
      setImgLoaded(true);
      return;
    }
    setImgLoaded(false);
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setImgLoaded(true);
    // se a imagem falhar, não trava a transição pra sempre — segue igual
    img.onerror = () => !cancelled && setImgLoaded(true);
    img.src = mapImageUrl;
    return () => {
      cancelled = true;
    };
  }, [kind, mapImageUrl]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const timeFrac = Math.min(1, elapsed / MIN_VISIBLE_MS);
      const realFrac = kind === '3d' ? threeProgress / 100 : imgLoaded ? 1 : 0;
      const next = Math.min(realFrac, timeFrac);
      setDisplayProgress((p) => (next > p ? next : p));

      const nothingToLoad = kind === '3d' && !hasStartedRef.current && elapsed > NOTHING_TO_LOAD_GRACE_MS;
      const realLoadFinished = kind === '3d' ? (!threeActive && threeProgress >= 100) || nothingToLoad : imgLoaded;
      const loadFinished = realLoadFinished || elapsed > MAX_WAIT_MS;

      if (loadFinished && timeFrac >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          setLeaving(true);
          window.setTimeout(onReady, FADE_OUT_MS);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, threeProgress, threeActive, imgLoaded, onReady]);

  const litCount = Math.round(displayProgress * SIGIL_COUNT);

  return (
    <div className={'scene-transition' + (leaving ? ' leaving' : '')}>
      <div className="scene-transition-sigils">
        {Array.from({ length: SIGIL_COUNT }).map((_, i) => (
          <img
            key={i}
            src={`/sigils/loading-sigil-${i + 1}.png`}
            alt=""
            aria-hidden
            className={'scene-transition-sigil' + (i < litCount ? ' lit' : '')}
          />
        ))}
      </div>
      <p className="scene-transition-label">Preparando a mesa…</p>
    </div>
  );
}
