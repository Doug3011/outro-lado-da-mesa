// Biblioteca local de fichas de monstro do MESTRE — fora de qualquer mesa
// (chave de localStorage global, mesmo padrão de characterLibrary.ts). O
// mestre monta/edita aqui (Área do Mestre → Criaturas) e importa uma CÓPIA
// pra dentro de uma mesa (ver Tarefa 6, "Importar monstro").

import type { Creature } from '../domain/creature';

const KEY = 'ordem:my-creatures';

export function loadMyCreatures(): Creature[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Creature[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Creature[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota cheia (retrato grande) — a lista segue funcionando na memória atual */
  }
}

export function saveMyCreature(c: Creature): Creature[] {
  const list = loadMyCreatures();
  const idx = list.findIndex((x) => x.id === c.id);
  const next = idx >= 0 ? list.map((x, i) => (i === idx ? c : x)) : [...list, c];
  persist(next);
  return next;
}

export function deleteMyCreature(id: string): Creature[] {
  const next = loadMyCreatures().filter((c) => c.id !== id);
  persist(next);
  return next;
}
