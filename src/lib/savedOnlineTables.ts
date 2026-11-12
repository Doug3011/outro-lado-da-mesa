// Mesas pela internet que o mestre já criou por aqui — pedido do usuário:
// "a mesa online tem que ficar salva em algum lugar, pq toda vez que eu
// saio sem querer eu perco tudo que tinha feito". Diferente de
// savedTables.ts (rede local): lá o "nome" é só uma etiqueta de conveniência
// (o servidor local sempre recarrega o MESMO arquivo de save, não importa o
// nome) — aqui o CÓDIGO em si é a identidade real da mesa (cada código é um
// canal/linha de banco Supabase diferente, ver schema.sql), então precisa
// ser guardado de verdade pra dar pra reabrir sem o mestre ter que decorar/
// anotar o código em algum lugar.

export interface SavedOnlineTable {
  code: string;
  name: string;
  masterName: string;
  masterColor: string;
  timesHosted: number;
  createdAt: number;
  lastHostedAt: number;
}

const KEY = 'ordem:saved-online-tables';

export function loadSavedOnlineTables(): SavedOnlineTable[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedOnlineTable[]) : [];
    return list.sort((a, b) => b.lastHostedAt - a.lastHostedAt);
  } catch {
    return [];
  }
}

function persist(list: SavedOnlineTable[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignora */
  }
}

// Chamado ao criar uma mesa pela internet (código novo) — sempre um
// registro NOVO (o código é sempre novo nesse momento, nunca colide com um
// já existente, diferente de savedTables.ts que mescla por nome).
export function recordSavedOnlineTable(input: {
  code: string;
  name: string;
  masterName: string;
  masterColor: string;
}): SavedOnlineTable[] {
  const list = loadSavedOnlineTables();
  const now = Date.now();
  list.push({
    code: input.code,
    name: input.name.trim() || 'Mesa',
    masterName: input.masterName,
    masterColor: input.masterColor,
    timesHosted: 1,
    createdAt: now,
    lastHostedAt: now,
  });
  persist(list);
  return loadSavedOnlineTables();
}

// Chamado ao REABRIR uma mesa já salva (botão "Reabrir" na lista) — só
// atualiza o contador/data, não cria outra entrada.
export function touchSavedOnlineTable(code: string): SavedOnlineTable[] {
  const list = loadSavedOnlineTables();
  const idx = list.findIndex((t) => t.code === code);
  if (idx >= 0) {
    list[idx] = { ...list[idx], timesHosted: list[idx].timesHosted + 1, lastHostedAt: Date.now() };
    persist(list);
  }
  return loadSavedOnlineTables();
}

export function deleteSavedOnlineTable(code: string): SavedOnlineTable[] {
  const next = loadSavedOnlineTables().filter((t) => t.code !== code);
  persist(next);
  return next;
}
