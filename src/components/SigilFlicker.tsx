import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { uid } from '../lib/ids';

// Sigilos rituais que piscam sozinhos, de vez em quando, em cima do vídeo de
// fundo do menu — o vídeo nunca para; só os sigilos aparecem do nada, brilham
// rápido e somem, em posição e horário aleatórios (nunca no mesmo lugar duas
// vezes seguidas).
const SIGILS = [
  '/sigils/sigil-skull.png',
  '/sigils/sigil-red.png',
  '/sigils/sigil-white.png',
  '/sigils/sigil-eldritch.png',
  '/sigils/sigil-crimson.png',
  '/sigils/sigil-circle.png',
  '/sigils/sigil-mark.png',
  '/sigils/sigil-ornate.png',
];

const MIN_GAP_MS = 3500;
const MAX_GAP_MS = 11000;
const FLASH_MS = 1100;

interface Flicker {
  id: string;
  src: string;
  xPct: number;
  yPct: number;
  size: number;
  rotate: number;
}

export function SigilFlicker() {
  const [flicker, setFlicker] = useState<Flicker | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const scheduleNext = () => {
      const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
      timerRef.current = window.setTimeout(() => {
        const next: Flicker = {
          id: uid(),
          src: SIGILS[Math.floor(Math.random() * SIGILS.length)],
          xPct: 6 + Math.random() * 88,
          yPct: 6 + Math.random() * 82,
          size: 60 + Math.random() * 70, // pequeno — 60 a 130px
          rotate: -12 + Math.random() * 24,
        };
        setFlicker(next);
        window.setTimeout(() => {
          setFlicker((cur) => (cur?.id === next.id ? null : cur));
        }, FLASH_MS);
        scheduleNext();
      }, gap);
    };
    scheduleNext();
    return () => window.clearTimeout(timerRef.current);
  }, []);

  if (!flicker) return null;

  return (
    <img
      key={flicker.id}
      className="sigil-flicker"
      src={flicker.src}
      alt=""
      aria-hidden
      style={
        {
          left: `${flicker.xPct}%`,
          top: `${flicker.yPct}%`,
          width: flicker.size,
          '--r': `${flicker.rotate}deg`,
        } as CSSProperties
      }
    />
  );
}
