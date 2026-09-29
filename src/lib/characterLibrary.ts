// Biblioteca local de fichas do JOGADOR — separada de qualquer mesa (chave de
// localStorage global, não por código de sala). É aqui que as fichas moram de
// verdade agora; uma mesa só recebe uma "cópia vinculada" de uma ficha daqui
// (veja roomLinks.ts).

import type { Character } from '../domain/character';

const KEY = 'ordem:my-characters';

export function loadMyCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Character[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Character[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota cheia (retrato grande) — a lista segue funcionando na memória atual */
  }
}

export function saveMyCharacter(c: Character): Character[] {
  const list = loadMyCharacters();
  const idx = list.findIndex((x) => x.id === c.id);
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? c : x)) : [...list, c];
  persist(next);
  return next;
}

export function deleteMyCharacter(id: string): Character[] {
  const next = loadMyCharacters().filter((c) => c.id !== id);
  persist(next);
  return next;
}
