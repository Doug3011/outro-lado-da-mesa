// Volume do som de dado (DiceRollFX cria um <audio> novo a cada rolagem, então
// não há elemento persistente pra sincronizar — só lê isso na hora de rolar).
const KEY = 'ordem:dice-sound-volume';
const DEFAULT_VOLUME = 0.18;

export function loadDiceSoundVolume(): number {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === null) return DEFAULT_VOLUME;
    const raw = Number(stored);
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function saveDiceSoundVolume(v: number): void {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* ignora */
  }
}
