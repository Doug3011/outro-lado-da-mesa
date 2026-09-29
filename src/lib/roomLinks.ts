// Lembra, por código de mesa, qual ficha da biblioteca o jogador vinculou —
// assim ao reabrir/reconectar na mesma mesa ele não precisa escolher de novo.
// Local, por navegador/instalação (igual identidade e perfil).

const KEY = 'ordem:room-links';

function loadAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persist(map: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignora */
  }
}

export function getLinkedCharacterId(code: string): string | null {
  return loadAll()[code.toUpperCase()] ?? null;
}

export function setLinkedCharacterId(code: string, characterId: string | null): void {
  const map = loadAll();
  const key = code.toUpperCase();
  if (characterId) map[key] = characterId;
  else delete map[key];
  persist(map);
}
