// Persistência local de quais faixas de menu já foram desbloqueadas e qual
// está selecionada pra tocar agora. Por instalação, independente de mesa.

import { ALL_MENU_TRACKS, DEFAULT_MENU_TRACK, UNLOCKABLE_MENU_TRACKS, type MenuTrack } from '../data/menuTracks';

const UNLOCKED_KEY = 'ordem:menu-tracks-unlocked';
const SELECTED_KEY = 'ordem:menu-track-selected';

export function loadUnlockedIds(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isTrackUnlocked(id: string): boolean {
  if (id === DEFAULT_MENU_TRACK.id) return true;
  return loadUnlockedIds().includes(id);
}

// Desbloqueia a próxima faixa ainda bloqueada, na ordem de UNLOCKABLE_MENU_TRACKS.
// Devolve a faixa desbloqueada, ou null se já desbloqueou todas.
export function unlockNextMenuTrack(): MenuTrack | null {
  const unlocked = new Set(loadUnlockedIds());
  const next = UNLOCKABLE_MENU_TRACKS.find((t) => !unlocked.has(t.id));
  if (!next) return null;
  unlocked.add(next.id);
  try {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...unlocked]));
  } catch {
    /* ignora */
  }
  return next;
}

export function loadSelectedMenuTrack(): MenuTrack {
  try {
    const id = localStorage.getItem(SELECTED_KEY);
    const found = id ? ALL_MENU_TRACKS.find((t) => t.id === id) : null;
    if (found && isTrackUnlocked(found.id)) return found;
  } catch {
    /* ignora */
  }
  return DEFAULT_MENU_TRACK;
}

export function selectMenuTrack(id: string): void {
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignora */
  }
}
