import { useEffect, useState } from 'react';
import {
  DAILY_DICE_COUNT,
  canPlayDaily,
  commitDaily,
  loadDailyChallenge,
  msUntilNextDaily,
  rollDaily,
  type DailyChallengeState,
} from '../lib/dailyChallenge';
import { unlockNextMenuTrack } from '../lib/menuTracks';
import type { MenuTrack } from '../data/menuTracks';

type Phase = 'idle' | 'rolling' | 'done';

const SPIN_MS = 550;
const PAUSE_MS = 350;

function formatCountdown(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}min`;
}

export function DailyChallengePanel({ onBack }: { onBack: () => void }) {
  const initial = loadDailyChallenge();
  const [state, setState] = useState<DailyChallengeState>(initial);
  const [remaining, setRemaining] = useState(() => msUntilNextDaily(initial));
  const [phase, setPhase] = useState<Phase>(initial.lastDice ? 'done' : 'idle');
  const [revealed, setRevealed] = useState<number[]>(initial.lastDice ?? []);
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [unlockedTrack, setUnlockedTrack] = useState<MenuTrack | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setRemaining(msUntilNextDaily(state)), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  const canPlay = canPlayDaily(state);

  // Sorteia os dados de uma vez (justo — não dá pra "escolher" o resultado
  // rolando de novo), mas revela um de cada vez com uma pausa entre eles,
  // pra dar suspense — só grava o resultado (localStorage) depois de revelar
  // todos.
  const roll = () => {
    const dice = rollDaily();
    setPhase('rolling');
    setRevealed([]);
    setUnlockedTrack(null);

    const revealNext = (i: number) => {
      setRollingIndex(i);
      window.setTimeout(() => {
        setRevealed((r) => [...r, dice[i]]);
        setRollingIndex(null);
        if (i + 1 < dice.length) {
          window.setTimeout(() => revealNext(i + 1), PAUSE_MS);
        } else {
          window.setTimeout(() => {
            const next = commitDaily(dice);
            setState(next);
            setRemaining(msUntilNextDaily(next));
            setPhase('done');
            if (next.lastWon) {
              const unlocked = unlockNextMenuTrack();
              if (unlocked) setUnlockedTrack(unlocked);
            }
          }, PAUSE_MS);
        }
      }, SPIN_MS);
    };
    revealNext(0);
  };

  return (
    <div className="daily-page daily-challenge-page">
      <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <D20Icon size={22} />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="daily-content">
        <button className="daily-back" onClick={onBack}>
          ← Voltar
        </button>

        <h1 className="daily-title">Desafio Diário</h1>
        <div className="daily-title-rule" />

        <p className="daily-rule-box">
          De <b>3 em 3 horas</b>: role {DAILY_DICE_COUNT} dados, um de cada vez, e tire um{' '}
          <b>20 natural</b> em pelo menos um deles pra ganhar — e desbloquear uma música nova
          pro menu.
        </p>

        {(phase === 'rolling' || phase === 'done') && (
          <div className="daily-result">
            <div className="dice-pills">
              {Array.from({ length: DAILY_DICE_COUNT }).map((_, i) => {
                if (i < revealed.length) {
                  const d = revealed[i];
                  return (
                    <span key={i} className={'die ' + (d === 20 ? 'max' : '')}>
                      {d}
                    </span>
                  );
                }
                if (i === rollingIndex) return <RollingDie key={i} />;
                return (
                  <span key={i} className="die pending">
                    —
                  </span>
                );
              })}
            </div>
            {phase === 'done' && (
              <p className={state.lastWon ? 'log-total crit' : 'log-total'}>
                {state.lastWon
                  ? '🎉 Você tirou 20! Ganhou o desafio.'
                  : 'Não saiu nenhum 20 desta vez.'}
              </p>
            )}
            {unlockedTrack && (
              <p className="daily-unlock">
                🎵 Música nova desbloqueada pro menu: <b>{unlockedTrack.name}</b> — escolha ela
                em "Músicas" quando quiser.
              </p>
            )}
          </div>
        )}

        {phase === 'rolling' ? (
          <button className="daily-cta" disabled>
            <D20Icon size={22} />
            <span>Rolando…</span>
          </button>
        ) : canPlay ? (
          <button className="daily-cta" onClick={roll}>
            <D20Icon size={22} />
            <span>Rolar {DAILY_DICE_COUNT} dados</span>
            <span className="daily-cta-arrow">→</span>
          </button>
        ) : (
          <p className="daily-cooldown">
            Já tentou — próxima tentativa em <b>{formatCountdown(remaining)}</b>.
          </p>
        )}

        <div className="daily-stats-rule" />
        <p className="daily-stats">
          <TrophyIcon />
          Vitórias: {state.wins} / {state.attempts} tentativa{state.attempts === 1 ? '' : 's'}
        </p>
      </div>

      <div className="daily-sigil-small">
        <D20Icon size={20} />
        <span className="daily-sigil-line" />
      </div>
    </div>
  );
}

function RollingDie() {
  const [n, setN] = useState(20);
  useEffect(() => {
    const t = window.setInterval(() => setN(1 + Math.floor(Math.random() * 20)), 80);
    return () => window.clearInterval(t);
  }, []);
  return <span className="die rolling">{n}</span>;
}

function D20Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l9 5.2v9.6L12 22l-9-5.2V7.2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 2v20M3 7.2l9 5.2 9-5.2M3 16.8l9-4.4 9 4.4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.75"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 13v4M9 20h6M10 20v-3h4v3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
