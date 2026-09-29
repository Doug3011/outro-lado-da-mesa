// Persistência local (por navegador/instalação) do perfil do jogador — igual
// à identidade (useIdentity), não depende de nenhuma mesa.

import { emptyProfile, type PlayerProfile } from '../domain/profile';

const KEY = 'ordem:profile';

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyProfile(), ...(JSON.parse(raw) as Partial<PlayerProfile>) };
  } catch {
    /* ignora */
  }
  return emptyProfile();
}

export function saveProfile(p: PlayerProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}
