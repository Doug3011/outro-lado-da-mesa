// Mesas que o mestre já hospedou por aqui — lista local pra re-hospedar rápido
// sem redigitar nome/cor na tela "Entrar numa mesa" (view 'connect' de
// Home.tsx, redesign Passo 3). Mesmo espírito de matchHistory.ts e
// characterLibrary.ts: chave própria de localStorage, tentativa/captura em
// toda leitura/escrita, nada de servidor envolvido.
//
// Guarda só o que o mestre digitou pra hospedar (nome da mesa, nome/cor do
// mestre) + quantas vezes essa mesa já foi hospedada — não guarda nada sobre
// jogadores que entraram (isso é por sessão/por rede, não existe um registro
// confiável disso aqui pra listar "nº de agentes" sem inventar dado).

export interface SavedTable {
  id: string;
  name: string; // nome da mesa
  masterName: string;
  masterColor: string;
  timesHosted: number; // quantas vezes essa mesa já foi hospedada por aqui
  createdAt: number;
  lastHostedAt: number;
}

const KEY = 'ordem:saved-tables';

export function loadSavedTables(): SavedTable[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedTable[]) : [];
    return list.sort((a, b) => b.lastHostedAt - a.lastHostedAt);
  } catch {
    return [];
  }
}

function persist(list: SavedTable[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignora */
  }
}

// Registra que o mestre acabou de hospedar essa mesa com sucesso — chamado
// pelo onHosting de Home.tsx. Mesa com o mesmo nome (sem diferenciar
// maiúsculas) atualiza o registro existente em vez de duplicar.
export function recordSavedTable(input: {
  name: string;
  masterName: string;
  masterColor: string;
}): SavedTable[] {
  const name = input.name.trim() || 'Mesa';
  const list = loadSavedTables();
  const idx = list.findIndex((t) => t.name.toLowerCase() === name.toLowerCase());
  const now = Date.now();
  if (idx >= 0) {
    const cur = list[idx];
    list[idx] = {
      ...cur,
      name,
      masterName: input.masterName,
      masterColor: input.masterColor,
      timesHosted: cur.timesHosted + 1,
      lastHostedAt: now,
    };
  } else {
    list.push({
      id: `tbl_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      masterName: input.masterName,
      masterColor: input.masterColor,
      timesHosted: 1,
      createdAt: now,
      lastHostedAt: now,
    });
  }
  persist(list);
  return loadSavedTables();
}

export function deleteSavedTable(id: string): SavedTable[] {
  const next = loadSavedTables().filter((t) => t.id !== id);
  persist(next);
  return next;
}
