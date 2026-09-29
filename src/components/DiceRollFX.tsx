import { useEffect, useRef, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { loadDiceSoundVolume } from '../lib/diceSound';

// Animação flutuante de d20 rolando, canto inferior esquerdo — toca sempre que
// uma rolagem nova chega no rollLog (própria ou de outro participante): mostra
// o d20 "girando" com números aleatórios por um instante, depois assenta no
// resultado de verdade. Mesmo padrão de "não repetir histórico" que o
// NotificationToasts já usa (senão o sync inicial da sala tocaria tudo de uma vez).
const ROLL_MS = 650;
const RESULT_MS = 1800;

interface FxItem {
  id: string;
  total: number;
  label: string;
  critical: boolean;
  fumble: boolean;
  phase: 'rolling' | 'result';
  dice: number[];
  diceLabel: string;
}

export function DiceRollFX() {
  const rollLog = useTableStore((s) => s.rollLog);
  const code = useTableStore((s) => s.code);
  const [items, setItems] = useState<FxItem[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const seededCode = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (seededCode.current !== code) {
      seen.current = new Set(rollLog.map((e) => e.id));
      seededCode.current = code;
      return;
    }
    const fresh = rollLog.filter((e) => !seen.current.has(e.id));
    if (fresh.length === 0) return;
    for (const e of fresh) seen.current.add(e.id);

    for (const e of fresh) {
      const id = e.id;
      const critical = e.result.kind === 'ordem-test' && e.result.critical;
      const fumble = e.result.kind === 'ordem-test' && e.result.fumble;
      // dados individuais — só interessa mostrar quando tem mais de 1 (ver
      // render abaixo), mas já calcula aqui pros dois tipos de rolagem.
      const dice =
        e.result.kind === 'ordem-test' ? e.result.dice : e.result.terms.flatMap((t) => t.results);
      const diceLabel = e.result.kind === 'ordem-test' ? `${e.result.diceCount}d20` : e.result.expression;

      setItems((cur) => [
        ...cur,
        { id, total: e.result.total, label: e.label, critical, fumble, phase: 'rolling', dice, diceLabel },
      ]);
      try {
        const audio = new Audio('/dice.mp3');
        audio.volume = loadDiceSoundVolume();
        audio.play().catch(() => {});
      } catch {
        /* ambiente sem Audio (ex.: SSR) — sem problema, só não toca */
      }

      window.setTimeout(() => {
        setItems((cur) => cur.map((it) => (it.id === id ? { ...it, phase: 'result' } : it)));
      }, ROLL_MS);
      window.setTimeout(() => {
        setItems((cur) => cur.filter((it) => it.id !== id));
      }, ROLL_MS + RESULT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollLog, code]);

  if (items.length === 0) return null;

  return (
    <div className="dice-fx-stack">
      {items.map((it) => (
        <div key={it.id} className={`dice-fx ${it.critical ? 'crit' : ''} ${it.fumble ? 'fumble' : ''}`}>
          {it.phase === 'rolling' ? <RollingD20 /> : <div className="dice-fx-result">{it.total}</div>}
          <div className="dice-fx-text">
            <span className="dice-fx-label">{it.label}</span>
            {it.phase === 'result' && it.dice.length > 1 && (
              <span className="dice-fx-breakdown">
                [{it.dice.join(', ')}] <span className="faint">{it.diceLabel}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RollingD20() {
  const [n, setN] = useState(20);
  useEffect(() => {
    const t = window.setInterval(() => setN(1 + Math.floor(Math.random() * 20)), 80);
    return () => window.clearInterval(t);
  }, []);
  return <div className="dice-fx-d20 spinning">{n}</div>;
}
