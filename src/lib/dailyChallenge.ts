// "Desafio diário": de 3 em 3 horas, rola 3d20 — ganha se tirar 20 natural em
// pelo menos um dado. Local, por navegador/instalação.

export interface DailyChallengeState {
  lastAttemptAt: number | null;
  lastDice: number[] | null;
  lastWon: boolean | null;
  wins: number;
  attempts: number;
}

const KEY = 'ordem:daily-challenge';
export const DAILY_COOLDOWN_MS = 3 * 60 * 60 * 1000;
export const DAILY_DICE_COUNT = 3;

function emptyState(): DailyChallengeState {
  return { lastAttemptAt: null, lastDice: null, lastWon: null, wins: 0, attempts: 0 };
}

export function loadDailyChallenge(): DailyChallengeState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyState(), ...(JSON.parse(raw) as Partial<DailyChallengeState>) };
  } catch {
    /* ignora */
  }
  return emptyState();
}

function persist(s: DailyChallengeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignora */
  }
}

export function msUntilNextDaily(state: DailyChallengeState): number {
  if (!state.lastAttemptAt) return 0;
  return Math.max(0, state.lastAttemptAt + DAILY_COOLDOWN_MS - Date.now());
}

export function canPlayDaily(state: DailyChallengeState): boolean {
  return msUntilNextDaily(state) <= 0;
}

// Sorteia os 3 dados de uma tentativa, sem gravar nada ainda — a UI revela um
// de cada vez (suspense) e só chama `commitDaily` depois de mostrar todos.
export function rollDaily(): number[] {
  return Array.from({ length: DAILY_DICE_COUNT }, () => 1 + Math.floor(Math.random() * 20));
}

// Grava o resultado de uma tentativa já sorteada (via `rollDaily`). Não checa
// o cooldown sozinho — quem chama (a UI) já só deixa rolar quando
// `canPlayDaily` for true.
export function commitDaily(dice: number[]): DailyChallengeState {
  const won = dice.includes(20);
  const prev = loadDailyChallenge();
  const next: DailyChallengeState = {
    lastAttemptAt: Date.now(),
    lastDice: dice,
    lastWon: won,
    wins: prev.wins + (won ? 1 : 0),
    attempts: prev.attempts + 1,
  };
  persist(next);
  return next;
}
