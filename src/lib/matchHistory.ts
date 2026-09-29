// Histórico de mesas jogadas — local, por navegador/instalação, independente
// de qualquer mesa específica (mesmo espírito de characterLibrary.ts).

export interface MatchEntry {
  code: string; // código da mesa (ou "host:porta" no modo rede local)
  role: 'gm' | 'player';
  name: string; // nome da mesa se soubermos, senão o próprio código/endereço
  firstPlayed: number;
  lastPlayed: number;
}

const KEY = 'ordem:match-history';
const MAX_ENTRIES = 60;

export function loadMatchHistory(): MatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MatchEntry[]) : [];
    return list.sort((a, b) => b.lastPlayed - a.lastPlayed);
  } catch {
    return [];
  }
}

function persist(list: MatchEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignora */
  }
}

// Registra (ou atualiza) uma entrada — chamado sempre que se entra numa mesa,
// como mestre ou jogador. `name`, quando informado, atualiza o nome guardado
// (útil pra quando descobrimos o nome da mesa depois, ex.: lista de LAN).
export function recordMatch(code: string, role: 'gm' | 'player', name?: string): void {
  const key = code.toUpperCase();
  const list = loadMatchHistory();
  const idx = list.findIndex((m) => m.code.toUpperCase() === key);
  const now = Date.now();
  if (idx >= 0) {
    const cur = list[idx];
    list[idx] = { ...cur, role, name: name?.trim() || cur.name, lastPlayed: now };
  } else {
    list.push({ code, role, name: name?.trim() || code, firstPlayed: now, lastPlayed: now });
  }
  persist(list);
}

export function removeMatch(code: string): void {
  const key = code.toUpperCase();
  persist(loadMatchHistory().filter((m) => m.code.toUpperCase() !== key));
}
