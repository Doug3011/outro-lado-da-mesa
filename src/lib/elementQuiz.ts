import { ELEMENTS, type Element } from '../data/ordem';

// Conta os elementos escolhidos e devolve o que mais apareceu. Empate:
// desempata pela ordem fixa de ELEMENTS (determinístico, sem sorteio) —
// mesmo espírito do desbloqueio de faixas do menu (unlockNextMenuTrack).
export function scoreElementQuiz(picks: Element[]): Element {
  const counts = new Map<Element, number>();
  for (const el of picks) counts.set(el, (counts.get(el) ?? 0) + 1);

  let winner: Element = ELEMENTS[0].key;
  let best = -1;
  for (const { key } of ELEMENTS) {
    const n = counts.get(key) ?? 0;
    if (n > best) {
      best = n;
      winner = key;
    }
  }
  return winner;
}
