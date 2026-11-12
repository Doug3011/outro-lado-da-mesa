// Catálogo de equipamentos, modificações e itens amaldiçoados do livro de
// regras de Ordem Paranormal (Capítulo 3: Equipamento, e Itens Amaldiçoados)
// — pedido do usuário: "clicar no item e ele ser adicionado ao inventário",
// cobrindo tanto equipamento comum quanto modificações (melhorias) e
// maldições. Extraído direto do PDF do livro (capítulo de Equipamento,
// páginas 50-67 do livro; Itens Amaldiçoados, páginas 144-151) — números e
// nomes conferidos contra o texto original.
//
// Cada entrada vira uma linha de inventário ao ser clicada (ver
// EquipmentCatalogDialog.tsx) — `category` é a categoria do item (0/I/II/
// III/IV) pra itens de verdade, ou o AUMENTO de categoria ("+I"/"+II") pra
// modificações/maldições, que não são itens próprios — modificam um item já
// existente (some ao total de categoria dele, não ocupam espaço próprio).

// Estatísticas estruturadas de uma arma (Capítulo 3, Tabela 3.3 — já
// conferidas contra o livro) — antes só existiam em prosa dentro de
// `notes`. Pedido do usuário: equipar a arma já monta o ataque
// (dano/crítico/tipo) pra rolar com um clique, em vez de digitar à mão.
export interface WeaponStats {
  damage: string; // ex. "1d12" — ou "1d6/1d8" (uma mão/duas mãos, usa a 2ª quando empunhada com as duas)
  critRange?: number; // 18 | 19 — omitido = margem padrão (20)
  critMult?: number; // 3 | 4 — omitido = multiplicador padrão (x2)
  damageType: string; // corte | impacto | perfuração | balístico | fogo...
  range?: 'curto' | 'médio' | 'longo' | 'extremo'; // omitido = só corpo a corpo
  skill: 'luta' | 'pontaria';
  addsForce: boolean; // soma Força do personagem ao dano (corpo a corpo/arremesso = sim; disparo/fogo = não, salvo exceção)
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string; // '0' | 'I' | 'II' | 'III' | 'IV' (item) ou '+I' / '+II' (modificação/maldição — aumento de categoria)
  slots: number;
  notes: string;
  weapon?: WeaponStats;
}

export interface CatalogGroup {
  id: string;
  label: string;
  items: CatalogItem[];
}

export const EQUIPMENT_CATALOG: CatalogGroup[] = [
  {
    id: 'armas',
    label: '⚔️ Armas',
    items: [
      // Armas Simples
      { id: 'faca', name: 'Faca', category: '0', slots: 1, notes: 'Corpo a corpo leve (ágil). Dano 1d4, crítico 19, corte. Pode ser arremessada (alcance curto).', weapon: { damage: '1d4', critRange: 19, damageType: 'corte', range: 'curto', skill: 'luta', addsForce: true } },
      { id: 'martelo', name: 'Martelo', category: '0', slots: 1, notes: 'Corpo a corpo leve. Dano 1d6, crítico x2, impacto.', weapon: { damage: '1d6', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'punhal', name: 'Punhal', category: '0', slots: 1, notes: 'Corpo a corpo leve (ágil). Dano 1d4, crítico x3, perfuração. Usado por cultistas em rituais.', weapon: { damage: '1d4', critMult: 3, damageType: 'perfuração', skill: 'luta', addsForce: true } },
      { id: 'bastao', name: 'Bastão', category: '0', slots: 1, notes: 'Corpo a corpo uma mão (1d6) ou duas mãos (1d8), crítico x2, impacto.', weapon: { damage: '1d6/1d8', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'machete', name: 'Machete', category: '0', slots: 1, notes: 'Corpo a corpo uma mão. Dano 1d6, crítico 19, corte.', weapon: { damage: '1d6', critRange: 19, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'lanca', name: 'Lança', category: '0', slots: 1, notes: 'Corpo a corpo uma mão. Dano 1d6, crítico x2, perfuração. Pode ser arremessada (alcance curto).', weapon: { damage: '1d6', damageType: 'perfuração', range: 'curto', skill: 'luta', addsForce: true } },
      { id: 'cajado', name: 'Cajado', category: '0', slots: 2, notes: 'Corpo a corpo duas mãos (ágil). Dano 1d6, crítico x2, impacto. Pode ser usado como arma de uma mão + leve com Combater com Duas Armas.', weapon: { damage: '1d6', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'arco', name: 'Arco', category: '0', slots: 2, notes: 'Disparo, duas mãos. Dano 1d6, crítico x3, alcance médio, perfuração. Usa Flechas (categoria 0, 1 espaço).', weapon: { damage: '1d6', critMult: 3, damageType: 'perfuração', range: 'médio', skill: 'pontaria', addsForce: false } },
      { id: 'besta', name: 'Besta', category: '0', slots: 2, notes: 'Disparo, duas mãos. Dano 1d8, crítico 19, alcance médio, perfuração. Recarregar exige ação de movimento. Usa Flechas.', weapon: { damage: '1d8', critRange: 19, damageType: 'perfuração', range: 'médio', skill: 'pontaria', addsForce: false } },
      { id: 'pistola', name: 'Pistola', category: 'I', slots: 1, notes: 'Fogo, leve. Dano 1d12, crítico 18, alcance curto, balístico. Usa Balas curtas (categoria 0, 1 espaço).', weapon: { damage: '1d12', critRange: 18, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'revolver', name: 'Revólver', category: 'I', slots: 1, notes: 'Fogo, leve. Dano 2d6, crítico 19/x3, alcance curto, balístico. Usa Balas curtas.', weapon: { damage: '2d6', critRange: 19, critMult: 3, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'fuzil-caca-livro', name: 'Fuzil de Caça', category: 'I', slots: 2, notes: 'Fogo, duas mãos. Dano 2d8, crítico 19/x3, alcance médio, balístico. Usa Balas longas (categoria I, 1 espaço).', weapon: { damage: '2d8', critRange: 19, critMult: 3, damageType: 'balístico', range: 'médio', skill: 'pontaria', addsForce: false } },
      // Armas Táticas
      { id: 'machadinha', name: 'Machadinha', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve. Dano 1d6, crítico x3, corte. Pode ser arremessada (alcance curto).', weapon: { damage: '1d6', critMult: 3, damageType: 'corte', range: 'curto', skill: 'luta', addsForce: true } },
      { id: 'nunchaku', name: 'Nunchaku', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve (ágil). Dano 1d8, crítico x2, impacto.', weapon: { damage: '1d8', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'corrente', name: 'Corrente', category: '0', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 1d8, crítico x2, impacto. +2 em testes de desarmar e derrubar.', weapon: { damage: '1d8', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'espada', name: 'Espada', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão (1d8) ou duas mãos (1d10), crítico 19, corte.', weapon: { damage: '1d8/1d10', critRange: 19, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'florete', name: 'Florete', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão (ágil). Dano 1d6, crítico 18, corte.', weapon: { damage: '1d6', critRange: 18, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'machado', name: 'Machado', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 1d8, crítico x3, corte.', weapon: { damage: '1d8', critMult: 3, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'maca', name: 'Maça', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 2d4, crítico x2, impacto.', weapon: { damage: '2d4', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'acha', name: 'Acha', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 1d12, crítico x3, corte.', weapon: { damage: '1d12', critMult: 3, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'gadanho', name: 'Gadanho', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 2d4, crítico x4, corte.', weapon: { damage: '2d4', critMult: 4, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'katana', name: 'Katana', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos (ágil; veterano em Luta pode usar como uma mão). Dano 1d10, crítico 19, corte.', weapon: { damage: '1d10', critRange: 19, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'marreta', name: 'Marreta', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 3d4, crítico x2, impacto.', weapon: { damage: '3d4', damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'montante', name: 'Montante', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 2d6, crítico 19, corte.', weapon: { damage: '2d6', critRange: 19, damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'motosserra', name: 'Motosserra', category: 'I', slots: 2, notes: 'Tática, corpo a corpo duas mãos. Dano 3d6, crítico x2, corte. Rolou 6? Role +1 dado de dano. –O em testes de ataque. Ligar gasta ação de movimento.', weapon: { damage: '3d6', damageType: 'corte', skill: 'luta', addsForce: true } },
      { id: 'arco-composto', name: 'Arco Composto', category: 'I', slots: 2, notes: 'Tática, disparo duas mãos. Dano 1d10, crítico x3, alcance médio, perfuração. Soma Força ao dano (diferente de arcos comuns). Usa Flechas.', weapon: { damage: '1d10', critMult: 3, damageType: 'perfuração', range: 'médio', skill: 'pontaria', addsForce: true } },
      { id: 'balestra', name: 'Balestra', category: 'I', slots: 2, notes: 'Tática, disparo duas mãos. Dano 1d12, crítico 19, alcance médio, perfuração. Recarregar exige ação de movimento. Usa Flechas.', weapon: { damage: '1d12', critRange: 19, damageType: 'perfuração', range: 'médio', skill: 'pontaria', addsForce: false } },
      { id: 'submetralhadora', name: 'Submetralhadora', category: 'I', slots: 1, notes: 'Tática, fogo uma mão, automática. Dano 2d6, crítico 19/x3, alcance curto, balístico. Usa Balas curtas.', weapon: { damage: '2d6', critRange: 19, critMult: 3, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'espingarda', name: 'Espingarda', category: 'I', slots: 2, notes: 'Tática, fogo duas mãos. Dano 4d6, crítico x3, alcance curto, balístico (metade do dano além do alcance médio). Usa Cartuchos (categoria I, 1 espaço).', weapon: { damage: '4d6', critMult: 3, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'fuzil-assalto-livro', name: 'Fuzil de Assalto', category: 'II', slots: 2, notes: 'Tática, fogo duas mãos, automática. Dano 2d10, crítico 19/x3, alcance médio, balístico. Usa Balas longas.', weapon: { damage: '2d10', critRange: 19, critMult: 3, damageType: 'balístico', range: 'médio', skill: 'pontaria', addsForce: false } },
      { id: 'fuzil-precisao-livro', name: 'Fuzil de Precisão', category: 'III', slots: 2, notes: 'Tática, fogo duas mãos. Dano 2d10, crítico 19/x3, alcance longo, balístico. Veterano em Pontaria mirando: +5 na margem de ameaça. Usa Balas longas.', weapon: { damage: '2d10', critRange: 19, critMult: 3, damageType: 'balístico', range: 'longo', skill: 'pontaria', addsForce: false } },
      // Armas Pesadas
      { id: 'bazuca', name: 'Bazuca', category: 'III', slots: 2, notes: 'Pesada, fogo duas mãos. Dano 10d8, crítico x2, alcance médio, impacto. Atinge um raio de 3m (Reflexos DT Agi reduz à metade pra quem não for o alvo direto). Recarregar exige ação de movimento. Usa Foguete (categoria I, 1 espaço, dura 1 disparo).', weapon: { damage: '10d8', damageType: 'impacto', range: 'médio', skill: 'pontaria', addsForce: false } },
      { id: 'lanca-chamas-livro', name: 'Lança-chamas', category: 'III', slots: 2, notes: 'Pesada, fogo duas mãos. Dano 6d6, crítico x2, alcance curto, fogo. Atinge todos numa linha de 1,5m de largura; alvos pegam fogo. Usa Combustível (categoria I, 1 espaço).', weapon: { damage: '6d6', damageType: 'fogo', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'metralhadora-livro', name: 'Metralhadora', category: 'II', slots: 2, notes: 'Pesada, fogo duas mãos, automática. Dano 2d12, crítico 19/x3, alcance médio, balístico. Exige Força 4+ ou apoiar em tripé (ação de movimento), senão –5 nos ataques. Usa Balas longas.', weapon: { damage: '2d12', critRange: 19, critMult: 3, damageType: 'balístico', range: 'médio', skill: 'pontaria', addsForce: false } },
      // Suplemento "Sobrevivendo ao Horror" — Tabela 1.4 "Novas Armas"
      { id: 'sah-pregador-pneumatico', name: 'Pregador Pneumático', category: '0', slots: 1, notes: 'Simples, disparo uma mão. Dano 1d4, crítico x4, alcance curto, perfuração. Conta como arma de fogo pra poderes. Armazena 300 pregos (dura 1 missão).', weapon: { damage: '1d4', critMult: 4, damageType: 'perfuração', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'sah-estilingue', name: 'Estilingue', category: '0', slots: 1, notes: 'Simples, disparo duas mãos. Dano 1d4, crítico x2, alcance curto, impacto. Soma Força ao dano. Pode lançar granadas (alcance longo).', weapon: { damage: '1d4', damageType: 'impacto', range: 'curto', skill: 'pontaria', addsForce: true } },
      { id: 'sah-revolver-compacto', name: 'Revólver Compacto', category: 'I', slots: 1, notes: 'Fogo leve. Dano 2d4, crítico 19/x3, alcance curto, balístico. Treinado em Crime: não ocupa espaço. Usa Balas curtas.', weapon: { damage: '2d4', critRange: 19, critMult: 3, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'sah-baioneta', name: 'Baioneta', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve. Dano 1d4, crítico 19, perfuração. Ação de movimento pra fixar numa arma de fogo de duas mãos (vira arma de duas mãos ágil, dano 1d6, mas –O em ataques à distância com a arma de fogo).', weapon: { damage: '1d4', critRange: 19, damageType: 'perfuração', skill: 'luta', addsForce: true } },
      { id: 'sah-faca-tatica', name: 'Faca Tática', category: 'I', slots: 1, notes: 'Tática, corpo a corpo leve (ágil). Dano 1d6, crítico 19, alcance curto, corte. Contra-ataque: +2 no teste. Bloqueio: 2 PE + sacrificar a faca pra +20 na RD do bloqueio.', weapon: { damage: '1d6', critRange: 19, damageType: 'corte', range: 'curto', skill: 'luta', addsForce: true } },
      { id: 'sah-gancho-carne', name: 'Gancho de Carne', category: '0', slots: 1, notes: 'Tática, corpo a corpo leve. Dano 1d4, crítico x4, perfuração. Com corda/corrente: alcance 4,5m e vira item de espaço 2.', weapon: { damage: '1d4', critMult: 4, damageType: 'perfuração', skill: 'luta', addsForce: true } },
      { id: 'sah-bastao-policial', name: 'Bastão Policial', category: 'I', slots: 1, notes: 'Tática, corpo a corpo uma mão (ágil). Dano 1d6, crítico x2, alcance curto, impacto. Esquiva com ele: +1 adicional na Defesa.', weapon: { damage: '1d6', damageType: 'impacto', range: 'curto', skill: 'luta', addsForce: true } },
      { id: 'sah-picareta', name: 'Picareta', category: '0', slots: 1, notes: 'Tática, corpo a corpo uma mão. Dano 1d6, crítico x4, impacto.', weapon: { damage: '1d6', critMult: 4, damageType: 'impacto', skill: 'luta', addsForce: true } },
      { id: 'sah-shuriken', name: 'Shuriken', category: 'I', slots: 0.5, notes: 'Tática, arremesso. Dano 1d4, crítico x2, alcance curto, perfuração. Veterano em Pontaria: 1 PE pra ataque adicional de shuriken no mesmo alvo (1x/rodada). 1 shuriken = pacote pra 2 cenas.', weapon: { damage: '1d4', damageType: 'perfuração', range: 'curto', skill: 'pontaria', addsForce: true } },
      { id: 'sah-pistola-pesada', name: 'Pistola Pesada', category: 'I', slots: 1, notes: 'Tática, fogo uma mão. Dano 2d8, crítico 18, alcance curto, balístico. –O no ataque (anula empunhando com duas mãos). Usa Balas curtas.', weapon: { damage: '2d8', critRange: 18, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
      { id: 'sah-espingarda-cano-duplo', name: 'Espingarda de Cano Duplo', category: 'II', slots: 2, notes: 'Tática, fogo duas mãos. Dano 4d6, crítico x3, alcance curto, balístico. Recarregar: ação de movimento. Pode disparar os dois canos juntos no mesmo alvo: –O no ataque, dano sobe pra 6d6. Usa Cartuchos.', weapon: { damage: '4d6', critMult: 3, damageType: 'balístico', range: 'curto', skill: 'pontaria', addsForce: false } },
    ],
  },
  {
    id: 'municoes',
    label: '🔫 Munições',
    items: [
      { id: 'balas-curtas', name: 'Balas Curtas (pacote)', category: '0', slots: 1, notes: 'Pistolas, revólveres, submetralhadoras. 1 pacote dura 2 cenas.' },
      { id: 'balas-longas', name: 'Balas Longas (pacote)', category: 'I', slots: 1, notes: 'Fuzis e metralhadoras. 1 pacote dura 1 cena.' },
      { id: 'cartuchos', name: 'Cartuchos (pacote)', category: 'I', slots: 1, notes: 'Espingardas. 1 pacote dura 1 cena.' },
      { id: 'combustivel', name: 'Combustível (tanque)', category: 'I', slots: 1, notes: 'Lança-chamas. Dura 1 cena.' },
      { id: 'flechas', name: 'Flechas (pacote)', category: '0', slots: 1, notes: 'Arcos e bestas. Reaproveitadas após o combate — 1 pacote dura a missão inteira.' },
      { id: 'foguete', name: 'Foguete', category: 'I', slots: 1, notes: 'Bazuca. Cada foguete dura só 1 disparo (não 1 cena).' },
    ],
  },
  {
    id: 'protecoes',
    label: '🛡️ Proteções',
    items: [
      { id: 'protecao-leve', name: 'Proteção Leve', category: 'I', slots: 2, notes: 'Defesa +5. Jaqueta de couro pesada ou colete de kevlar — uso comum de seguranças e policiais.' },
      { id: 'protecao-pesada', name: 'Proteção Pesada', category: 'II', slots: 5, notes: 'Defesa +10. Resistência a balístico, corte, impacto e perfuração 2. –5 em testes de perícia com penalidade de carga (desconfortável/volumosa).' },
      { id: 'escudo', name: 'Escudo', category: 'I', slots: 2, notes: 'Defesa +2 (acumula com proteção). Precisa ser empunhado numa mão. Conta como proteção pesada pra proficiência.' },
    ],
  },
  {
    id: 'geral',
    label: '🎒 Equipamento Geral',
    items: [
      // Acessórios
      { id: 'kit-pericia', name: 'Kit de Perícia', category: '0', slots: 1, notes: 'Ferramentas necessárias pra certas perícias/usos. Sem o kit: –5 no teste. Especifique a perícia ao adicionar.' },
      { id: 'utensilio', name: 'Utensílio', category: 'I', slots: 1, notes: '+2 numa perícia à escolha (exceto Luta/Pontaria) — ex.: smartphone (Ciências), notebook (Tecnologia). Precisa ser empunhado. Especifique a perícia ao adicionar.' },
      { id: 'vestimenta', name: 'Vestimenta', category: 'I', slots: 1, notes: '+2 numa perícia à escolha (exceto Luta/Pontaria) — ex.: botas (Atletismo), terno (Diplomacia). Máximo 2 vestimentas ativas ao mesmo tempo. Especifique a perícia ao adicionar.' },
      // Explosivos
      { id: 'granada-atordoamento', name: 'Granada de Atordoamento', category: '0', slots: 1, notes: 'Raio 6m. Atordoado 1 rodada (Fortitude DT Agi reduz pra ofuscado+surdo 1 rodada).' },
      { id: 'granada-fragmentacao', name: 'Granada de Fragmentação', category: 'I', slots: 1, notes: 'Raio 6m. 8d6 de dano de perfuração (Reflexos DT Agi reduz à metade).' },
      { id: 'granada-fumaca', name: 'Granada de Fumaça', category: '0', slots: 1, notes: 'Raio 6m. Cego + camuflagem total por 2 rodadas.' },
      { id: 'granada-incendiaria', name: 'Granada Incendiária', category: 'I', slots: 1, notes: 'Raio 6m. 6d6 de dano de fogo + fica em chamas (Reflexos DT Agi reduz dano à metade e evita a condição).' },
      { id: 'mina-antipessoal', name: 'Mina Antipessoal', category: 'I', slots: 1, notes: 'Ativada por controle remoto (alcance longo). Cone de 6m, 12d6 de dano de perfuração (Reflexos DT Int reduz à metade). Instalar: ação completa + Tática DT 15.' },
      // Itens Operacionais
      { id: 'algemas', name: 'Algemas', category: '0', slots: 1, notes: 'Par de algemas de aço. Prender os dois pulsos: –5 em testes com as mãos, impede conjuração. Escapar: Acrobacia DT 30.' },
      { id: 'arpeu', name: 'Arpéu', category: '0', slots: 1, notes: 'Prender exige Pontaria DT 15. Subir com corda: +5 em Atletismo.' },
      { id: 'bandoleira', name: 'Bandoleira', category: 'I', slots: 1, notes: '1x por rodada, saca ou guarda um item do inventário como ação livre.' },
      { id: 'binoculos', name: 'Binóculos', category: '0', slots: 1, notes: '+5 em Percepção pra observar coisas distantes.' },
      { id: 'bloqueador-sinal', name: 'Bloqueador de Sinal', category: 'I', slots: 1, notes: 'Impede celulares em alcance médio de se conectar.' },
      { id: 'cicatrizante', name: 'Cicatrizante', category: 'I', slots: 1, notes: 'Ação padrão: cura 2d8+2 PV em você ou ser adjacente.' },
      { id: 'corda', name: 'Corda', category: '0', slots: 1, notes: '10m de corda resistente. +5 em Atletismo pra descer buraco/prédio; amarrar pessoas etc.' },
      { id: 'equip-sobrevivencia', name: 'Equipamento de Sobrevivência', category: '0', slots: 2, notes: 'Mochila com saco de dormir, panelas, GPS etc. +5 em Sobrevivência pra acampar/orientar-se, mesmo sem treino.' },
      { id: 'lanterna-tatica', name: 'Lanterna Tática', category: 'I', slots: 1, notes: 'Ilumina cone de 9m. Ação de movimento: mira nos olhos (alcance curto) — ofusca 1 rodada, alvo fica imune pelo resto da cena.' },
      { id: 'mascara-gas', name: 'Máscara de Gás', category: '0', slots: 1, notes: '+10 em Fortitude contra efeitos que dependam de respiração.' },
      { id: 'mochila-militar', name: 'Mochila Militar', category: 'I', slots: 0, notes: 'Não ocupa espaço. Aumenta a capacidade de carga em +2 espaços.' },
      { id: 'oculos-visao-termica', name: 'Óculos de Visão Térmica', category: 'I', slots: 1, notes: 'Elimina penalidade em testes por camuflagem.' },
      { id: 'pe-de-cabra', name: 'Pé de Cabra', category: '0', slots: 1, notes: '+5 em Força pra arrombar portas. Pode ser usado em combate como bastão.' },
      { id: 'pistola-dardos', name: 'Pistola de Dardos', category: 'I', slots: 1, notes: 'Leve, alcance curto. Acerto: inconsciente até o fim da cena (Fortitude DT Agi reduz pra desprevenido+lento 1 rodada). Vem com 2 dardos.' },
      { id: 'pistola-sinalizadora', name: 'Pistola Sinalizadora', category: '0', slots: 1, notes: 'Disparo leve, alcance curto, 2d6 de dano de fogo. Vem com 2 cargas.' },
      { id: 'soqueira', name: 'Soqueira', category: '0', slots: 1, notes: '+1 em dano desarmado e torna o dano letal. Pode receber modificações/maldições de arma corpo a corpo.', weapon: { damage: '1d3+1', damageType: 'impacto', skill: 'luta', addsForce: false } },
      { id: 'spray-pimenta', name: 'Spray de Pimenta', category: '0', slots: 1, notes: 'Ação padrão contra adjacente: cego por 1d4 rodadas (Fortitude DT Agi evita). Dura 2 usos.' },
      { id: 'taser', name: 'Taser', category: 'I', slots: 1, notes: 'Ação padrão contra adjacente: 1d6 de dano de eletricidade + atordoado 1 rodada (Fortitude DT Agi evita). Dura 2 usos.' },
      { id: 'traje-hazmat', name: 'Traje Hazmat', category: 'I', slots: 2, notes: '+5 em resistência contra efeitos ambientais. Resistência a químico 10.' },
      // Suplemento "Sobrevivendo ao Horror" — várias tabelas (acessórios,
      // explosivos, itens operacionais, medicamentos, sobrevivência)
      { id: 'sah-amuleto-sagrado', name: 'Amuleto Sagrado', category: '0', slots: 1, notes: 'Utensílio especial. +2 em Religião e Vontade.' },
      { id: 'sah-celular', name: 'Celular', category: '0', slots: 1, notes: 'Utensílio especial (comum). Com internet: +2 em perícias de buscar informação. Lanterna fraca, cone de 4,5m.' },
      { id: 'sah-chave-fenda-universal', name: 'Chave de Fenda Universal', category: '0', slots: 1, notes: '+2 em perícias pra criar/reparar objetos, inclusive como apoio em situações especiais (ex.: hackear com cabos).' },
      { id: 'sah-chaves', name: 'Chaves', category: '0', slots: 1, notes: 'Molho de chaves. Jogar fazendo barulho pra distrair: +2 em Furtividade na mesma rodada.' },
      { id: 'sah-documentos-falsos', name: 'Documentos Falsos', category: 'I', slots: 1, notes: '+2 em Diplomacia, Enganação e Intimidação pra se passar pela identidade falsa.' },
      { id: 'sah-manual-operacional', name: 'Manual Operacional', category: 'I', slots: 1, notes: 'Ação de interlúdio lendo: usa aquela perícia como treinado até o próximo interlúdio (manual aprimorado: +5 na perícia). Só 1 manual ativo por vez.' },
      { id: 'sah-notebook', name: 'Notebook', category: '0', slots: 2, notes: 'Como celular (+2 em perícias de informação com internet). Interlúdio de relaxar: +1 Sanidade adicional. Ilumina cone de 4,5m. Inclui tablets.' },
      { id: 'sah-dinamite', name: 'Dinamite', category: 'I', slots: 1, notes: 'Raio 6m. 4d6 de dano de impacto + 4d6 de fogo, fica em chamas (Reflexos DT Agi reduz à metade e evita).' },
      { id: 'sah-explosivo-plastico', name: 'Explosivo Plástico', category: 'I', slots: 1, notes: 'Prepara em 2 rodadas, detona por controle remoto ou dano de fogo/eletricidade. 16d6 de impacto em raio de 3m (Reflexos DT Int reduz à metade). Especialista em explosivos: dobra dano em objetos/estruturas e ignora RD.' },
      { id: 'sah-galao-vermelho', name: 'Galão Vermelho', category: '0', slots: 2, notes: 'Explode com dano de fogo/balístico: 12d6 de fogo em raio de 6m + fica em chamas (Reflexos DT 25). Área pega fogo (1d6/rodada) até apagar.' },
      { id: 'sah-granada-gas-sonifero', name: 'Granada de Gás Sonífero', category: 'I', slots: 1, notes: 'Raio 6m, 2 rodadas. Quem começa o turno na área fica inconsciente e caído (ou exausto→fatigado se em combate; Fortitude DT Agi reduz).' },
      { id: 'sah-granada-pem', name: 'Granada de PEM', category: 'I', slots: 1, notes: 'Raio 18m até o fim da cena, desativa elétricos. Criaturas de Energia: 6d6 de impacto + paralisadas 1 rodada (Fortitude DT Agi reduz).' },
      { id: 'sah-alarme-movimento', name: 'Alarme de Movimento', category: '0', slots: 1, notes: 'Ação completa pra posicionar. Avisa um dispositivo quando há movimento num cone de 30m.' },
      { id: 'sah-alimento-energetico', name: 'Alimento Energético', category: 'II', slots: 1, notes: 'Ação padrão: recupera 1d4 PE.' },
      { id: 'sah-aplicador-medicamentos', name: 'Aplicador de Medicamentos', category: 'I', slots: 1, notes: 'Aplica substância (cicatrizante/medicamento) como ação de movimento. Espaço pra 3 doses.' },
      { id: 'sah-bracadeira-reforcada', name: 'Braçadeira Reforçada', category: 'I', slots: 1, notes: '+2 na RD recebida ao usar bloqueio.' },
      { id: 'sah-cao-adestrado', name: 'Cão Adestrado', category: 'I', slots: 1, notes: 'Aliado. Com treino em Adestramento, funciona como aliado: +2 em Investigação e Percepção; 1 PE pra +2 de Defesa por 1 rodada.' },
      { id: 'sah-coldre-saque-rapido', name: 'Coldre Saque Rápido', category: 'I', slots: 1, notes: '1x/rodada, sacar/guardar arma de fogo leve como ação livre.' },
      { id: 'sah-equipamento-escuta', name: 'Equipamento de Escuta', category: 'I', slots: 1, notes: 'Receptor (alcance 90m) + 3 transmissores (raio 9m). Instalar: Crime DT 20.' },
      { id: 'sah-estrepes', name: 'Estrepes (saco)', category: '0', slots: 1, notes: 'Cobre 1,5m de lado (ação padrão). Quem pisa: 1d4 de perfuração + lento por 1 dia (Reflexos DT Agi evita).' },
      { id: 'sah-faixa-pregos', name: 'Faixa de Pregos', category: 'I', slots: 2, notes: 'Como estrepes, mas linha de 9m; fura pneus de veículos (metade do deslocamento).' },
      { id: 'sah-isqueiro', name: 'Isqueiro', category: '0', slots: 0.5, notes: 'Ação de movimento pra chama pequena. Ilumina raio de 3m.' },
      { id: 'sah-antibiotico', name: 'Antibiótico', category: 'I', slots: 0.5, notes: 'Medicamento. +5 no próximo teste de Fortitude contra doença até o fim do dia.' },
      { id: 'sah-antidoto', name: 'Antídoto', category: 'I', slots: 0.5, notes: 'Medicamento. +5 no próximo teste de Fortitude contra veneno (ou remove veneno específico).' },
      { id: 'sah-antiemetico', name: 'Antiemético', category: 'I', slots: 0.5, notes: 'Medicamento. Remove enjoado + 5 contra essa condição até o fim da cena.' },
      { id: 'sah-antihistaminico', name: 'Antihistamínico', category: 'I', slots: 0.5, notes: 'Medicamento. +5 contra efeitos de alergia até o fim do dia.' },
      { id: 'sah-anti-inflamatorio', name: 'Anti-inflamatório', category: 'I', slots: 0.5, notes: 'Medicamento. 1d8+2 PV temporários.' },
      { id: 'sah-antitermico', name: 'Antitérmico', category: 'I', slots: 0.5, notes: 'Medicamento. Novo teste contra condição mental, 1x/cena.' },
      { id: 'sah-broncodilatador', name: 'Broncodilatador', category: 'I', slots: 0.5, notes: 'Medicamento. +5 contra asfixiado/fatigado até o fim do dia.' },
      { id: 'sah-coagulante', name: 'Coagulante', category: 'I', slots: 0.5, notes: 'Medicamento. +5 pra estabilizar sangrando (e +5 em Medicina contra morrendo, se combinado).' },
      { id: 'sah-oculos-visao-noturna', name: 'Óculos de Visão Noturna', category: 'I', slots: 1, notes: 'Visão no escuro, mas –O em resistência a ofuscado/luz.' },
      { id: 'sah-oculos-escuros', name: 'Óculos Escuros', category: '0', slots: 1, notes: 'Imune a ofuscado por luz.' },
      { id: 'sah-pa', name: 'Pá', category: '0', slots: 2, notes: '+5 em Força pra cavar/mover detritos. Pode ser usada como bastão em combate.' },
      { id: 'sah-paraquedas', name: 'Paraquedas', category: 'I', slots: 2, notes: 'Anula dano de queda (Reflexos DT 20 se não treinado/veterano nas perícias certas).' },
      { id: 'sah-traje-mergulho', name: 'Traje de Mergulho', category: 'I', slots: 2, notes: '1h de oxigênio. +5 contra efeitos ambientais, resistência a químico 5.' },
      { id: 'sah-traje-espacial', name: 'Traje Espacial', category: 'II', slots: 5, notes: '8h de água/oxigênio. +10 contra efeitos ambientais, resistência a químico 20.' },
      { id: 'sah-ligacao-direta-infernal', name: 'Ligação Direta Infernal', category: 'II', slots: 1, notes: 'Item paranormal. Ação completa: liga um veículo automaticamente, +RD 20 e imunidade a Sangue nele, +5 em Pilotagem, mas falhas são amplificadas.' },
      { id: 'sah-medidor-condicao-vertebral', name: 'Medidor de Condição Vertebral', category: 'II', slots: 1, notes: 'Item paranormal. Conectar: ação completa, atordoa 1 rodada. Conta como vestimenta (+2 Fortitude), indica saúde por cor, +5 em Medicina pra ajudar o usuário.' },
      { id: 'sah-pe-de-morto', name: 'Pé de Morto', category: 'II', slots: 1, notes: 'Item paranormal (bota). +5 em Furtividade; ações chamativas de movimento aumentam visibilidade em só +1.' },
      { id: 'sah-pendrive-selado', name: 'Pendrive Selado', category: 'II', slots: 0.5, notes: 'Item paranormal. Imune a invasão/rituais/efeitos de Energia.' },
      { id: 'sah-valete-salvacao', name: 'Valete da Salvação', category: 'I', slots: 0.5, notes: 'Item paranormal (carta). Ação padrão: voa indicando rota de fuga em alcance médio e se consome.' },
    ],
  },
  {
    id: 'paranormais',
    label: '🔮 Itens Paranormais',
    items: [
      { id: 'amarras-elemento', name: 'Amarras de (Elemento)', category: 'II', slots: 1, notes: 'Armadilha 3x3m (2 PE, ação completa: Reflexos DT Int ou fica imóvel até o fim da cena) ou Laçar (1 PE, ação padrão, alcance curto: Vontade DT Agi ou fica paralisado; manter custa 1 PE/rodada). Especifique o elemento.' },
      { id: 'camera-aura', name: 'Câmera de Aura Paranormal', category: 'II', slots: 1, notes: 'Amaldiçoada com Energia. Ação padrão + 1 PE: tira foto que revela auras paranormais (cor = elemento) em pessoas/objetos.' },
      { id: 'componentes-ritualisticos', name: 'Componentes Ritualísticos de (Elemento)', category: '0', slots: 1, notes: 'Necessários pra conjurar rituais do elemento (Sangue/Morte/Conhecimento/Energia — não existe de Medo). Especifique o elemento.' },
      { id: 'emissor-pulsos', name: 'Emissor de Pulsos Paranormais', category: 'II', slots: 1, notes: 'Ação completa + 1 PE: emite pulso de um elemento, atrai criaturas desse elemento e afasta do elemento oposto (Vontade DT Pre evita).' },
      { id: 'escuta-ruidos', name: 'Escuta de Ruídos Paranormais', category: 'II', slots: 1, notes: 'Ação completa + 2 PE: grava ruídos paranormais por até 24h. Ouvir: +5 em Ocultismo pra identificar criatura.' },
      { id: 'medidor-membrana', name: 'Medidor de Estabilidade da Membrana', category: 'II', slots: 1, notes: 'Treinado em Ocultismo: avalia a Membrana de uma área, indicando chance de manifestação (não é definitivo).' },
      { id: 'scanner-manifestacao', name: 'Scanner de Manifestação Paranormal de (Elemento)', category: 'II', slots: 1, notes: 'Ação padrão pra ativar, 1 PE/rodada: sabe a direção de manifestações ativas do elemento escolhido em alcance longo. Especifique o elemento.' },
    ],
  },
  {
    id: 'mods-armas',
    label: '🔧 Melhoria: Armas',
    items: [
      { id: 'mod-certeira', name: 'Certeira', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em testes de ataque.' },
      { id: 'mod-cruel', name: 'Cruel', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em rolagens de dano.' },
      { id: 'mod-discreta-arma', name: 'Discreta', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo, disparo e fogo). +5 em testes pra ocultar e reduz o espaço em –1.' },
      { id: 'mod-perigosa', name: 'Perigosa', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo e disparo). +2 em margem de ameaça.' },
      { id: 'mod-tatica', name: 'Tática', category: '+I', slots: 0, notes: 'Modificação (corpo a corpo, disparo e fogo). Pode sacar como ação livre.' },
      { id: 'mod-alongada', name: 'Alongada', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). +2 em testes de ataque.' },
      { id: 'mod-calibre-grosso', name: 'Calibre Grosso', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Aumenta o dano em mais 1 dado do mesmo tipo. Exige munição própria de calibre grosso.' },
      { id: 'mod-compensador', name: 'Compensador', category: '+I', slots: 0, notes: 'Modificação (só armas automáticas). Anula a penalidade por disparar rajadas.' },
      { id: 'mod-ferrolho-automatico', name: 'Ferrolho Automático', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). A arma se torna automática.' },
      { id: 'mod-mira-laser', name: 'Mira Laser', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). +2 em margem de ameaça.' },
      { id: 'mod-mira-telescopica', name: 'Mira Telescópica', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Aumenta o alcance em 1 categoria e permite Ataque Furtivo em qualquer alcance.' },
      { id: 'mod-silenciador', name: 'Silenciador', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Reduz em –OO a penalidade em Furtividade pra se esconder após atacar.' },
      { id: 'mod-visao-calor', name: 'Visão de Calor', category: '+I', slots: 0, notes: 'Modificação (só armas de fogo). Ignora camuflagem do alvo ao disparar.' },
      { id: 'mod-explosiva', name: 'Explosiva', category: '+I', slots: 0, notes: 'Modificação de munição (balas curtas/longas). Aumenta o dano em +2d6.' },
      { id: 'mod-dum-dum', name: 'Dum Dum', category: '+I', slots: 0, notes: 'Modificação de munição (balas curtas/longas). +1 no multiplicador de crítico.' },
      { id: 'sah-mod-carregador-rapido', name: 'Carregador Rápido', category: '+I', slots: 0, notes: 'Modificação (armas de fogo, bestas, balestras). Arma de fogo: recarrega como ação livre 1x/rodada. Besta/balestra: até 5 recargas como ação livre com 1 mão.' },
    ],
  },
  {
    id: 'mods-protecoes',
    label: '🔧 Melhoria: Proteções',
    items: [
      { id: 'mod-antibombas', name: 'Antibombas', category: '+I', slots: 0, notes: 'Só proteção pesada. +5 em resistência contra efeitos de área.' },
      { id: 'mod-blindada', name: 'Blindada', category: '+I', slots: 0, notes: 'Só proteção pesada. Resistência a dano 5 e +1 espaço.' },
      { id: 'mod-discreta-protecao', name: 'Discreta', category: '+I', slots: 0, notes: 'Só proteção leve. –1 espaço, +5 em Crime pra ocultar (mesmo sem treino).' },
      { id: 'mod-reforcada', name: 'Reforçada', category: '+I', slots: 0, notes: '+2 na Defesa e +1 espaço. Não acumula com Discreta.' },
    ],
  },
  {
    id: 'mods-acessorios',
    label: '🔧 Melhoria: Acessórios',
    items: [
      { id: 'mod-aprimorado', name: 'Aprimorado', category: '+I', slots: 0, notes: 'O bônus em perícia do acessório sobe pra +5.' },
      { id: 'mod-discreto-acessorio', name: 'Discreto', category: '+I', slots: 0, notes: '–1 espaço, +5 em Crime pra ocultar (mesmo sem treino).' },
      { id: 'mod-funcao-adicional', name: 'Função Adicional', category: '+I', slots: 0, notes: '+2 numa perícia adicional à escolha (sujeito à aprovação do mestre).' },
      { id: 'mod-instrumental', name: 'Instrumental', category: '+I', slots: 0, notes: 'O acessório funciona como um kit de perícia específico.' },
    ],
  },
  {
    id: 'maldicoes-armas',
    label: '💀 Maldição: Armas',
    items: [
      { id: 'maldicao-antielemento', name: 'Antielemento', category: '+II', slots: 0, notes: '[Conhecimento] Contra criatura de um elemento (role 1d4 ou escolha): gaste 2 PE e, se acertar, +4d8 de dano.' },
      { id: 'maldicao-ritualistica', name: 'Ritualística', category: '+II', slots: 0, notes: '[Conhecimento] Armazena um ritual (pagando o PE normal) pra descarregar como ação livre ao acertar um ataque.' },
      { id: 'maldicao-senciente', name: 'Senciente', category: '+II', slots: 0, notes: '[Conhecimento] 2 PE + ação de movimento: a arma flutua e ataca sozinha 1x/rodada (precisa 1 PE/rodada pra manter).' },
      { id: 'maldicao-empuxo', name: 'Empuxo', category: '+II', slots: 0, notes: '[Energia] Só corpo a corpo. Pode ser arremessada em alcance curto, +1 dado de dano ao arremessar, e volta voando pra você no mesmo turno.' },
      { id: 'maldicao-energetica', name: 'Energética', category: '+II', slots: 0, notes: '[Energia] 2 PE/ataque: +5 em ataque, ignora RD e converte todo o dano pra Energia.' },
      { id: 'maldicao-vibrante', name: 'Vibrante', category: '+II', slots: 0, notes: '[Energia] Concede Ataque Extra (Operações Especiais); se já tem, reduz o custo em –1 PE.' },
      { id: 'maldicao-consumidora', name: 'Consumidora', category: '+II', slots: 0, notes: '[Morte] 2 PE ao atacar; se acertar, alvo fica imóvel por 1 rodada.' },
      { id: 'maldicao-erosiva', name: 'Erosiva', category: '+II', slots: 0, notes: '[Morte] +1d8 de dano de Morte. 2 PE ao atacar; se acertar, +2d4 de dano de Morte no início dos 2 próximos turnos do alvo.' },
      { id: 'maldicao-repulsora', name: 'Repulsora', category: '+II', slots: 0, notes: '[Morte] +2 de Defesa empunhada. 2 PE num bloqueio: +5 adicional de Defesa.' },
      { id: 'maldicao-lancinante', name: 'Lancinante', category: '+II', slots: 0, notes: '[Sangue] +1d8 de dano de Sangue (multiplicado em crítico).' },
      { id: 'maldicao-predadora', name: 'Predadora', category: '+II', slots: 0, notes: '[Sangue] Anula camuflagem/cobertura leves, dobra a margem de ameaça; se à distância, +1 categoria de alcance.' },
      { id: 'maldicao-sanguinaria', name: 'Sanguinária', category: '+II', slots: 0, notes: '[Sangue] Alvo sangra (2d6/rodada por acerto, cumulativo). Crítico: drena sangue, +2d10 PV temporários pra você.' },
    ],
  },
  {
    id: 'maldicoes-protecoes',
    label: '💀 Maldição: Proteções',
    items: [
      { id: 'maldicao-abascanta', name: 'Abascanta', category: '+II', slots: 0, notes: '[Conhecimento] +5 em resistência contra rituais. 1x/cena, reação: reflete um ritual de volta ao conjurador (pagando o custo em PE dele).' },
      { id: 'maldicao-profetica', name: 'Profética', category: '+II', slots: 0, notes: '[Conhecimento] Resistência a Conhecimento 10. 2 PE num teste de resistência: role de novo.' },
      { id: 'maldicao-cinetica', name: 'Cinética', category: '+II', slots: 0, notes: '[Energia] +2 de Defesa e resistência a dano 2 (leve/escudo) ou 5 (pesada).' },
      { id: 'maldicao-lepida', name: 'Lépida', category: '+II', slots: 0, notes: '[Energia] +10 em Atletismo e +3m de deslocamento. 2 PE: até o fim do turno ignora terreno difícil, ganha deslocamento de escalada e imunidade a queda até 9m.' },
      { id: 'maldicao-voltaica', name: 'Voltaica', category: '+II', slots: 0, notes: '[Energia] Resistência a Energia 10. 2 PE + ação de movimento: até o fim da cena, causa 2d6 de dano de Energia em adjacentes no fim de cada turno.' },
      { id: 'maldicao-letargica', name: 'Letárgica', category: '+II', slots: 0, notes: '[Morte] +2 de Defesa. 25% (leve/escudo) ou 50% (pesada) de chance de ignorar dano extra de crítico/furtivo.' },
      { id: 'maldicao-repulsiva', name: 'Repulsiva', category: '+II', slots: 0, notes: '[Morte] Resistência a Morte 10. 2 PE + ação de movimento: até o fim da cena, quem atacar você corpo a corpo sofre 2d8 de dano de Morte.' },
      { id: 'maldicao-regenerativa', name: 'Regenerativa', category: '+II', slots: 0, notes: '[Sangue] Resistência a Sangue 10. 1 PE + ação de movimento: recupera 1d12 PV.' },
      { id: 'maldicao-sadica', name: 'Sádica', category: '+II', slots: 0, notes: '[Sangue] +1 em ataque e dano pra cada 10 pontos de dano sofridos desde o fim do seu último turno.' },
    ],
  },
  {
    id: 'maldicoes-acessorios',
    label: '💀 Maldição: Acessórios',
    items: [
      { id: 'maldicao-carisma', name: 'Carisma', category: '+II', slots: 0, notes: '[Conhecimento] +1 em Presença (sem PE adicional).' },
      { id: 'maldicao-conjuracao', name: 'Conjuração', category: '+II', slots: 0, notes: '[Conhecimento] Tem um ritual de 1º círculo embutido — conjure como se conhecesse (ou –1 PE se já conhece).' },
      { id: 'maldicao-escudo-mental', name: 'Escudo Mental', category: '+II', slots: 0, notes: '[Conhecimento] Resistência mental 10.' },
      { id: 'maldicao-reflexao', name: 'Reflexão', category: '+II', slots: 0, notes: '[Conhecimento] 1x/rodada: reflete um ritual de volta ao conjurador (pagando o custo em PE dele).' },
      { id: 'maldicao-sagacidade', name: 'Sagacidade', category: '+II', slots: 0, notes: '[Conhecimento] +1 em Intelecto (sem perícias/treinamentos adicionais).' },
      { id: 'maldicao-defesa', name: 'Defesa', category: '+II', slots: 0, notes: '[Energia] +5 de Defesa.' },
      { id: 'maldicao-destreza', name: 'Destreza', category: '+II', slots: 0, notes: '[Energia] +1 em Agilidade.' },
      { id: 'maldicao-potencia', name: 'Potência', category: '+II', slots: 0, notes: '[Energia] +1 na DT de suas habilidades, poderes e rituais.' },
      { id: 'maldicao-esforco-adicional', name: 'Esforço Adicional', category: '+II', slots: 0, notes: '[Morte] +5 PE (ativa só após 1 dia de uso).' },
      { id: 'maldicao-disposicao', name: 'Disposição', category: '+II', slots: 0, notes: '[Sangue] +1 em Vigor.' },
      { id: 'maldicao-pujanca', name: 'Pujança', category: '+II', slots: 0, notes: '[Sangue] +1 em Força.' },
      { id: 'maldicao-vitalidade', name: 'Vitalidade', category: '+II', slots: 0, notes: '[Sangue] +15 PV (ativa só após 1 dia de uso).' },
      { id: 'maldicao-protecao-elemental', name: 'Proteção Elemental', category: '+II', slots: 0, notes: '[Varia] Resistência 10 contra um elemento à escolha. Conta como item desse elemento.' },
    ],
  },
  {
    id: 'amaldicoados-sangue',
    label: '🩸 Amaldiçoado: Sangue',
    items: [
      { id: 'coracao-pulsante', name: 'Coração Pulsante', category: 'II', slots: 1, notes: 'Reação: esprema o coração pra reduzir um dano sofrido à metade. Cada uso: Fortitude DT 15 (+5 por uso adicional no dia) ou o item é destruído.' },
      { id: 'coroa-espinhos', name: 'Coroa de Espinhos', category: 'II', slots: 1, notes: '1x/rodada, reação: transforma dano mental que sofreria em dano de Sangue. Enquanto vestida, não recupera sanidade por descanso. Precisa vestir 1 semana pra ativar.' },
      { id: 'frasco-vitalidade', name: 'Frasco de Vitalidade', category: 'II', slots: 1, notes: '1 minuto + até 20 PV de dano: enche o frasco com seu sangue. Ação padrão: bebe e recupera o mesmo tanto de PV (Fortitude DT 20 ou fica enjoado 1 rodada).' },
      { id: 'perola-sangue', name: 'Pérola de Sangue', category: 'II', slots: 1, notes: 'Ação de movimento: absorve a pérola, +5 em Agilidade/Força/Vigor até o fim da cena. Depois: Fortitude DT 20 ou fica fatigado (falhar por 5+: parada cardíaca, morrendo).' },
      { id: 'punhos-enraivecidos', name: 'Punhos Enraivecidos', category: 'II', slots: 1, notes: 'Par de soqueiras. Desarmado +1d8 de dano de Sangue, letal. Acerto desarmado: pode atacar de novo pagando 2 PE a mais a cada vez.' },
      { id: 'seringa-transfiguracao', name: 'Seringa de Transfiguração', category: 'II', slots: 1, notes: 'Ação padrão: suga sangue de um alvo adjacente (ataque corpo a corpo se não-voluntário). Outra ação padrão: injeta em outra pessoa, transfigurando a aparência dela (como Distorcer Aparência, duração 1 dia).' },
      // Suplemento "Sobrevivendo ao Horror" — Tabela 1.6
      { id: 'sah-conector-membros', name: 'Conector de Membros', category: 'III', slots: 1, notes: 'Ação padrão: reconecta braço/perna/cabeça decepados (até 3 rodadas depois do corte). Não cura PV, mas tira de morrendo/morto (fica com 1 PV). 25% de "vida própria" na parte (efeitos colaterais variam por parte).' },
      { id: 'sah-dose-praga', name: 'Dose d\'A Praga', category: 'III', slots: 1, notes: 'Ação padrão: você ou adjacente ganha Arma de Sangue, Sangue de Ferro e Sangue Vivo até o fim da cena. Ao acabar: Fortitude (DT 20 + 5 por dose anterior no dia) ou 2d4 de dano mental e mantém os poderes + Ódio Incontrolável.' },
      { id: 'sah-mandibula-agonizante', name: 'Mandíbula Agonizante', category: 'II', slots: 1, notes: 'Ação padrão: arremessa (alcance médio); grita alto, encobre som num raio de 30m até o fim da cena. Criaturas de Sangue são atraídas (Vontade DT 35 evita).' },
      { id: 'sah-retalho-tenebroso', name: 'Retalho Tenebroso', category: 'II', slots: 1, notes: 'Máscara de carne. Dá faro e visão no escuro, mas vulnerabilidade a Morte e –2O em interação social. +1 cumulativo em dano por dia de uso seguido; custa 1d6 PV por dia (Fortitude DT 15 evita).' },
    ],
  },
  {
    id: 'amaldicoados-morte',
    label: '☠️ Amaldiçoado: Morte',
    items: [
      { id: 'amarras-mortais', name: 'Amarras Mortais', category: 'II', slots: 1, notes: '1x/rodada, ação padrão + 2 PE: agarra alvo Grande ou menor em alcance curto com +10 no teste oposto. Ação de movimento: puxa um alvo agarrado pra adjacente.' },
      { id: 'casaco-lodo', name: 'Casaco de Lodo', category: 'II', slots: 1, notes: 'Resistência a corte, impacto, Morte e perfuração 5. Vulnerabilidade a dano balístico e de Energia.' },
      { id: 'coletora', name: 'Coletora', category: 'II', slots: 1, notes: 'Punhal. Ação completa: apunhala alguém morrendo, mata e absorve 1d8 PE (armazena até 20). Usa o PE armazenado como seu após 1 semana portando. Pesadelos constantes enquanto porta (descanso sempre ruim).' },
      { id: 'cranio-espiral', name: 'Crânio Espiral', category: 'II', slots: 1, notes: '1x/rodada, ação livre: ganha uma ação padrão adicional na rodada. Cada uso: Vontade DT 15 (+5 por uso adicional no dia) ou envelhece 1d4 anos e não pode mais usar nesse dia.' },
      { id: 'frasco-lodo', name: 'Frasco de Lodo', category: 'II', slots: 1, notes: 'Ação padrão: aplica em ferimento. Recente (até 1 rodada): cura 6d8+20 PV. Antigo: 1d par cura 3d8+10, ímpar infecciona e causa 3d8+10 de dano de Morte. Uso único.' },
      { id: 'vislumbre-fim', name: 'Vislumbre do Fim', category: 'II', slots: 1, notes: 'Ação de movimento, mirando um ser visível: revela info sobre a morte dele (contador de tempo pra pessoas comuns; pior resistência + vulnerabilidades pra Marcados/criaturas).' },
      // Suplemento "Sobrevivendo ao Horror"
      { id: 'sah-ampulheta-tempo-sofrido', name: 'Ampulheta do Tempo Sofrido', category: 'II', slots: 1, notes: '5 PE: benefícios imediatos de uma ação de interlúdio à escolha. Recarrega só gastando uma ação de interlúdio pra "devolver" o tempo.' },
      { id: 'sah-injecao-lodo', name: 'Injeção de Lodo', category: 'II', slots: 0.5, notes: 'Ação padrão: você/adjacente ganha vulnerabilidade a balístico e Energia até o fim da cena, mas a próxima vez que cair a 0 PV na cena, fica com 1 PV em vez disso.' },
      { id: 'sah-instantaneo-mortal', name: 'Instantâneo Mortal', category: 'II', slots: 0.5, notes: 'Foto de alguém morrendo. Ao procurar pistas relacionadas à causa da morte retratada: gasta 1 PE pra +O no teste.' },
      { id: 'sah-projetil-lodo-curto', name: 'Projétil de Lodo, curto', category: 'I', slots: 1, notes: 'Munição. Troca o dano da arma pra Morte; a arma some ao fim da cena.' },
      { id: 'sah-projetil-lodo-longo', name: 'Projétil de Lodo, longo', category: 'II', slots: 1, notes: 'Munição. Igual ao curto, pra armas de categoria maior.' },
      { id: 'sah-radio-chiador', name: 'Rádio Chiador', category: 'II', slots: 1, notes: 'Pilhas duram 12h. Ligado: chia se tiver criatura Paranormal em alcance extremo (mais alto quanto mais perto); atrai essas criaturas.' },
    ],
  },
  {
    id: 'amaldicoados-conhecimento',
    label: '📖 Amaldiçoado: Conhecimento',
    items: [
      { id: 'aneis-elo-mental', name: 'Anéis do Elo Mental', category: 'II', slots: 1, notes: 'Par de anéis — 24h de uso por 2 pessoas ativa uma ligação telepática (Invadir Mente) enquanto usarem. Testes de Vontade usam o melhor dos dois; dano mental de uma é sofrido por ambas; condições mentais/medo afetam as duas.' },
      { id: 'lanterna-reveladora', name: 'Lanterna Reveladora', category: 'II', slots: 1, notes: 'Ação padrão + 1 PE: liga por 1 cena, emite luz com propriedades de Terceiro Olho. Incomoda criaturas de Sangue iluminadas (atacam você antes de outros alvos na mesma categoria de alcance).' },
      { id: 'mascara-pessoas-sombras', name: 'Máscara das Pessoas nas Sombras', category: 'II', slots: 1, notes: 'Resistência a Conhecimento 10. Ação de movimento + 2 PE: teletransporta entre sombras em alcance médio. Vestir é como assinar um acordo com a Seita das Máscaras — consequências a critério do mestre.' },
      { id: 'municao-jurada', name: 'Munição Jurada', category: 'II', slots: 1, notes: 'Ritual de 1h vincula a bala a um alvo conhecido. Contra ele: +10 em ataque, dobra margem de ameaça, +6d12 de dano de Conhecimento. Enquanto a possuir: –2 em Defesa e ataque contra qualquer outro alvo.' },
      { id: 'pergaminho-pertinacia', name: 'Pergaminho da Pertinácia', category: 'II', slots: 1, notes: 'Ação padrão: +5 PE temporários até o fim da cena. Cada uso: Ocultismo DT 15 (+5 por uso adicional no dia) ou o pergaminho se desfaz.' },
      // Suplemento "Sobrevivendo ao Horror"
      { id: 'sah-camera-obscura', name: 'Câmera Obscura', category: 'III', slots: 1, notes: 'Câmera de aura com lente de revelação paranormal; DT pra resistir +10, e se falhar causa 6d6 de dano de frio (só em invisíveis/incorpóreos/camuflados).' },
      { id: 'sah-enxame-fantasmagorico', name: 'Enxame Fantasmagórico', category: 'III', slots: 1, notes: 'Manto que deixa invisível enquanto vestido, mas causa 1 de dano mental (ignora resistência) no início de cada turno seu.' },
      { id: 'sah-repositorio-fracasso', name: 'Repositório do Fracasso', category: 'II', slots: 1, notes: 'Acumula carga quando criatura Paranormal próxima tira 1 no d20 (máx 6). 1x/rodada: gasta uma carga pra recuperar 1d4 PE, com –1 cumulativo em Vontade até o próximo interlúdio.' },
      { id: 'sah-tablet-saber-custoso', name: 'Tablet do Saber Custoso', category: 'II', slots: 1, notes: 'Vira treinado numa perícia por 1 teste, perdendo Sanidade igual ao atributo-chave dela.' },
    ],
  },
  {
    id: 'amaldicoados-energia',
    label: '⚡ Amaldiçoado: Energia',
    items: [
      { id: 'arcabuz-moretti', name: 'Arcabuz dos Moretti', category: 'II', slots: 1, notes: 'Arma simples, fogo, uma mão. +2 em ataque, dano de Energia, alcance curto, crítico x3, sem munição. Ao disparar, role 1d6 pro dano: 1) 2d4, 2) 2d6, 3) 2d8, 4) 2d10, 5) 2d12, 6) 2d20.' },
      { id: 'bateria-reversa', name: 'Bateria Reversa', category: 'II', slots: 1, notes: 'Ação padrão + 2 PE: absorve carga de um dispositivo eletrônico em alcance curto (descarrega ele). Se cheia, ação padrão transfere a carga pra outro dispositivo descarregado. Cada uso: Ocultismo DT 15 (+5/uso no dia) ou explode (12d6 de dano de Energia em 3m).' },
      { id: 'peitoral-segunda-chance', name: 'Peitoral da Segunda Chance', category: 'II', slots: 1, notes: 'Se reduzido a 0 PV: gasta 5 PE automaticamente pra reanimar com 4d10 PV. Falha se não tiver PE suficiente. 1 em 1d10 de chance de matar instantaneamente em vez disso.' },
      { id: 'relogio-arnaldo', name: 'Relógio de Arnaldo', category: 'II', slots: 1, notes: '1x/rodada, 1 PE: role de novo qualquer dado com resultado 1. Custo sobe +1 a cada ativação no mesmo dia. Item único.' },
      { id: 'talisma-sorte', name: 'Talismã da Sorte', category: 'II', slots: 1, notes: 'Ao sofrer dano vestindo: reação + 3 PE, role 1d4. 2-3: evita o dano. 4: evita mas o talismã se desfaz. 1: sofre o DOBRO do dano e o talismã se desfaz.' },
      { id: 'teclado-conexao-neural', name: 'Teclado de Conexão Neural', category: 'II', slots: 1, notes: 'Plugado (ação de movimento): usa o computador sem impedimento de idioma/tecnologia, +10 em hackear, metade do tempo pra localizar arquivo. Sofre 1d6 de dano mental por rodada de uso.' },
      { id: 'tela-pesadelo', name: 'Tela do Pesadelo', category: 'II', slots: 1, notes: 'Ação padrão + 2 PE pra ativar. Próxima pessoa que tocar: Vontade DT (sua escolha +5) ou atordoada + 4d6 de dano mental, repetindo o teste toda rodada até passar ou alguém destruir a tela.' },
      { id: 'veiculo-energizado', name: 'Veículo Energizado', category: 'II', slots: 1, notes: 'Não precisa de combustível. Reação + Pilotagem DT 25: veículo e ocupantes viram energia por um instante, atravessando um obstáculo pra evitar colisão.' },
    ],
  },
  {
    id: 'amaldicoados-medo',
    label: '😱 Amaldiçoado: Medo',
    items: [
      { id: 'jaqueta-verissimo', name: 'Jaqueta de Veríssimo', category: 'IV', slots: 1, notes: 'Item único. Resistência a dano paranormal 15. Reação + 2 PE: vira o alvo do dano que um aliado adjacente ia sofrer, no lugar dele.' },
      { id: 'dedo-decepado', name: 'Dedo Decepado', category: 'II', slots: 1, notes: 'Concede um poder paranormal do dono original (elemento = elemento da maldição). Dormir/relaxar: 1 em 1d4 chance de não recuperar PV/PE/sanidade (memórias do antigo dono) + –10 em Diplomacia se visto usando. Precisa vestir 1 semana pra ativar.' },
      { id: 'selos-paranormais', name: 'Selos Paranormais', category: 'variável', slots: 1, notes: 'Cada selo tem um ritual embutido — categoria = círculo do ritual. Ativar: empunhar + ler em voz alta (ação padrão ou a do ritual). Sem conhecer o ritual: Ocultismo DT 20 + custo em PE. Selo se desfaz em cinzas após o uso.' },
      // Suplemento "Sobrevivendo ao Horror"
      { id: 'sah-primeira-adaga', name: 'A Primeira Adaga', category: 'III', slots: 1, notes: 'Componente ritualístico. Concede os 4 catalisadores de uma vez (ampliador+perturbador+potencializador+prolongador) e reduz o tempo de conjuração pra 1 rodada, mas custa metade dos PV totais do conjurador.' },
    ],
  },
];
