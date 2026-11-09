import { useEffect, useState, type CSSProperties } from 'react';
import {
  DAILY_DICE_COUNT,
  canPlayDaily,
  commitDaily,
  loadDailyChallenge,
  msUntilNextDaily,
  rollDaily,
  type DailyChallengeState,
} from '../lib/dailyChallenge';
import { loadUnlockedIds, unlockNextMenuTrack } from '../lib/menuTracks';
import { UNLOCKABLE_MENU_TRACKS, type MenuTrack } from '../data/menuTracks';

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

// Faíscas de fundo (Passo 10B) — mesmo truque determinístico já usado na
// Área do Mestre (Home.tsx, `GM_SPARKS`): reaproveita as classes
// `.rd-gm-bg`/`.rd-gm-glow-*`/`.rd-gm-core*`/`.rd-gm-rays`/`.rd-gm-sparks`/
// `.rd-gm-static` (tema Energia, Passo 8) sem precisar de CSS novo pro
// fundo — Desafio Diário já É tema Energia (sorte/acaso), só não tinha
// ganho esse fundo animado ainda.
const DAILY_SPARK_COLORS = ['#b57cff', '#00e5ff', '#ff2bd6', '#d6a8ff'];
const DAILY_SPARKS: CSSProperties[] = Array.from({ length: 14 }, (_, i) => {
  const left = 42 + ((i * 29) % 56);
  const dur = 4 + (i % 4) * 1.5;
  const delay = -((i * 0.9) % dur);
  const dx = ((i % 5) - 2) * 28;
  const color = DAILY_SPARK_COLORS[i % DAILY_SPARK_COLORS.length];
  return {
    left: `${left}%`,
    background: color,
    boxShadow: `0 0 8px ${color}`,
    animationDuration: `${dur}s`,
    animationDelay: `${delay.toFixed(1)}s`,
    '--rd-drift-x': `${dx}px`,
  } as unknown as CSSProperties;
});

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

  const won = revealed.includes(20);
  // Estatísticas reais (nada inventado, nem os números aproximados da
  // referência): vitórias/tentativas vêm do estado persistido de sempre;
  // faixas bloqueadas e chance por rodada são DERIVADAS dos dados reais do
  // jogo (lib/menuTracks + DAILY_DICE_COUNT), não valores fixos copiados
  // do .dc.html (que tinha "5" e "14,3%" fixos — aqui recalculado).
  const lockedLeft = UNLOCKABLE_MENU_TRACKS.length - loadUnlockedIds().length;
  const chancePct = (1 - Math.pow(19 / 20, DAILY_DICE_COUNT)) * 100;

  let message = 'Pronto pra testar sua sorte?';
  let subMessage = `Role os ${DAILY_DICE_COUNT} dados. Um 20 basta.`;
  if (phase === 'done') {
    message = won ? 'VINTE NATURAL!' : 'Não saiu nenhum 20 desta vez.';
    subMessage = won ? 'Uma faixa nova foi desbloqueada no menu.' : 'Os dados se calam. Volte quando o cooldown acabar.';
  } else if (revealed.length > 0) {
    message = `Saiu ${revealed[revealed.length - 1]}.`;
    subMessage = `Ainda restam ${DAILY_DICE_COUNT - revealed.length} dado(s).`;
  }

  return (
    <div className="daily-page daily-challenge-page">
      <div className="rd-gm-bg" aria-hidden="true">
        <div className="rd-gm-glow-a" />
        <div className="rd-gm-glow-b" />
        <div className="rd-gm-core">
          <svg className="rd-gm-core-ring-a" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="180" fill="none" stroke="#5a2db0" strokeWidth="1" strokeDasharray="40 14 4 14" opacity="0.7" />
            <circle cx="200" cy="200" r="150" fill="none" stroke="#7b45e0" strokeWidth="0.6" strokeDasharray="2 8" opacity="0.6" />
          </svg>
          <svg className="rd-gm-core-ring-b" viewBox="0 0 400 400">
            <path d="M200 70A130 130 0 0 1 330 200" fill="none" stroke="#b57cff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
            <path d="M200 330A130 130 0 0 1 70 200" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          </svg>
          <svg className="rd-gm-core-ring-c" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="90" fill="none" stroke="#9b5cff" strokeWidth="1.4" strokeDasharray="6 10" opacity="0.7" />
          </svg>
          <div className="rd-gm-core-center" />
        </div>
        <div className="rd-gm-sparks">
          {DAILY_SPARKS.map((style, i) => (
            <span key={i} className="rd-gm-spark" style={style} />
          ))}
        </div>
        <svg className="rd-gm-static" aria-hidden>
          <filter id="dd-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 .8  0 0 0 0 .6  0 0 0 0 1  0 0 0 1.4 -0.2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#dd-noise)" />
        </svg>
        <div className="rd-vignette" />
      </div>
      <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <D20Icon size={22} />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="daily-content dd-layout">
        <section className="dd-text">
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

          <div className="dd-stats-row">
            <div className="dd-stat-chip">
              <span className="dd-stat-label">Vitórias</span>
              <span className="dd-stat-value">
                {state.wins} <span className="dd-stat-value-sub">/ {state.attempts} tentativa{state.attempts === 1 ? '' : 's'}</span>
              </span>
            </div>
            <div className="dd-stat-chip">
              <span className="dd-stat-label">Faixas bloqueadas</span>
              <span className="dd-stat-value">
                {lockedLeft} <span className="dd-stat-value-sub">de {UNLOCKABLE_MENU_TRACKS.length}</span>
              </span>
            </div>
            <div className="dd-stat-chip">
              <span className="dd-stat-label">Chance por rodada</span>
              <span className="dd-stat-value">{chancePct.toFixed(1)}%</span>
            </div>
          </div>
        </section>

        <section className="dd-table" aria-label="Dados">
          <div className="dd-dice-row">
            {Array.from({ length: DAILY_DICE_COUNT }).map((_, i) => {
              const revealedVal = i < revealed.length ? revealed[i] : null;
              const isMax = revealedVal === 20;
              const isRolling = i === rollingIndex;
              const isNext = phase !== 'done' && !isRolling && revealedVal === null && i === revealed.length;
              return <DieFace key={i} n={i + 1} value={revealedVal} rolling={isRolling} next={isNext} max={isMax} />;
            })}
          </div>

          <div className="dd-message-wrap">
            <span className={'dd-message' + (won && phase === 'done' ? ' win' : '')}>{message}</span>
            <span className="dd-submessage">{subMessage}</span>
          </div>

          {unlockedTrack && (
            <p className="daily-unlock dd-unlock">
              <MusicNoteIcon /> Música nova desbloqueada pro menu: <b>{unlockedTrack.name}</b> — escolha ela
              em "Músicas" quando quiser.
            </p>
          )}

          {phase === 'rolling' ? (
            <button className="daily-cta dd-cta" disabled>
              <D20Icon size={22} />
              <span>Rolando…</span>
            </button>
          ) : canPlay ? (
            <button className="daily-cta dd-cta" onClick={roll}>
              <D20Icon size={22} />
              <span>Rolar {DAILY_DICE_COUNT} dados</span>
              <span className="daily-cta-arrow">→</span>
            </button>
          ) : (
            <span className="dd-cooldown-chip">
              <ClockIcon />
              Próxima tentativa em <b>{formatCountdown(remaining)}</b>
            </span>
          )}
        </section>
      </div>

      <div className="daily-sigil-small">
        <D20Icon size={20} />
        <span className="daily-sigil-line" />
      </div>
    </div>
  );
}

// Face do dado (Passo 10B) — losango/d20 em SVG com traço, no lugar do
// `<span>` quadrado antigo. Estados: pendente (cinza, "?"), rolando (número
// trocando rápido via `RollingDie` abaixo, borda roxa pulsando) e revelado
// (branco; dourado + anel pulsante quando é 20 natural — `rd-pulse-ring`,
// reaproveitado do Passo 1, com `--rd-pulse-rgb` setado pro dourado local).
function DieFace({ n, value, rolling, next, max }: { n: number; value: number | null; rolling: boolean; next: boolean; max: boolean }) {
  const fill = max ? '#3a2a08' : value !== null ? '#1e1438' : '#120c22';
  const stroke = max ? '#ffd166' : value !== null ? '#b57cff' : next ? '#7b45e0' : '#3a2a60';
  return (
    <div className="dd-die-col">
      <div className={'dd-die-wrap' + (rolling ? ' rolling' : '') + (next ? ' next' : '') + (max ? ' max' : '')} style={max ? ({ '--rd-pulse-rgb': '255, 209, 102' } as CSSProperties) : undefined}>
        {max && <span className="dd-die-ring" aria-hidden />}
        <svg className="dd-die-svg" viewBox="0 0 100 100" aria-hidden>
          <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill={fill} stroke={stroke} strokeWidth="2.5" />
          <polygon points="50,22 76,66 24,66" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.6" />
          <path
            d="M50 4 50 22M92 28 76 66M8 28 24 66M50 96 76 66M50 96 24 66M92 72 76 66M8 72 24 66M8 28 50 22 92 28"
            stroke={stroke}
            strokeWidth="1"
            opacity="0.4"
            fill="none"
          />
        </svg>
        <span className={'dd-die-num' + (max ? ' max' : value === null ? ' pending' : '')}>
          {rolling ? <RollingDieNumber /> : value ?? '?'}
        </span>
      </div>
      <span className="dd-die-label">Dado {n}</span>
    </div>
  );
}

function RollingDieNumber() {
  const [n, setN] = useState(20);
  useEffect(() => {
    const t = window.setInterval(() => setN(1 + Math.floor(Math.random() * 20)), 80);
    return () => window.clearInterval(t);
  }, []);
  return <>{n}</>;
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

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
