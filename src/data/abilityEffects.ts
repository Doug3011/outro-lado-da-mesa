// Efeito numérico de uma habilidade (poder de origem, de classe, de trilha,
// geral ou paranormal) sobre a ficha — pedido do usuário: habilidades e
// poderes devem alterar os valores da ficha automaticamente, sem depender
// do texto. Cobre só poderes PASSIVOS (sempre ativos, sem gastar PE nem
// durar "até o fim da cena") — poderes que exigem gastar PE/ação pra um
// bônus pontual continuam só como texto na aba Habilidades (não fazem
// sentido como bônus permanente na ficha).
//
// Chave = NOME da habilidade exatamente como aparece em `Ability.name`
// ANTES do sufixo "(NEX N%)" que poderes de trilha/classe sempre ganham
// (ver `syncTrilhaAbilities`/`addClassPower` em domain/character.ts) — os
// agregadores em character.ts tiram esse sufixo antes de procurar aqui
// (`stripNexSuffix`). Poder de origem nunca tem esse sufixo.
//
// IMPORTANTE (causa raiz do bug corrigido nesta leva): antes desta leva, a
// busca aqui comparava `a.name` direto, sem tirar o sufixo "(NEX N%)" —
// então TODO poder de trilha/classe (que sempre tem esse sufixo) nunca
// batia com nada neste mapa, mesmo quando já existia uma entrada certa
// pra ele (ex. "Iniciativa Aprimorada"). Só poder de ORIGEM (sem sufixo)
// chegava a funcionar — e "Dedicação" nunca tinha sido cadastrado aqui.

export type AttrKey = 'AGI' | 'FOR' | 'INT' | 'PRE' | 'VIG';

export interface AbilityEffect {
  // Bônus fixo numa perícia (ex. "+5 em Iniciativa").
  skillBonus?: { skill: string; amount: number };
  // Igual acima, mas pra mais de uma perícia de uma vez (ex. "+2 em
  // Defesa e em testes de resistência" = Fortitude + Reflexos + Vontade,
  // os três testes de resistência do livro).
  skillBonuses?: { skill: string; amount: number }[];
  // 'fogo' = arma de disparo balístico ou de chamas (pistola, fuzil,
  // lança-chamas...); 'disparo' = arco/besta (Pontaria, mas não é arma de
  // fogo); 'corpo-a-corpo' = perícia Luta. Ver weaponCategory() em
  // character.ts.
  weaponDamageBonus?: { category: 'fogo' | 'disparo' | 'corpo-a-corpo'; amount: number };
  // Igual acima, mas pra mais de uma categoria de uma vez (ex. Ninja
  // Urbano: "+2 em rolagens de dano com armas de corpo a corpo e de
  // disparo" — duas categorias, mesmo valor cada).
  weaponDamageBonuses?: { category: 'fogo' | 'disparo' | 'corpo-a-corpo'; amount: number }[];
  // Bônus fixo de Defesa.
  defenseBonus?: number;
  // PV máximo: fixo + por "cada 5% de NEX" (steps = floor(nex/5) — mesma
  // conta já usada em Casca Grossa).
  pvMaxBonus?: number;
  pvMaxPerNexStep?: number;
  // Sanidade máxima: mesmo padrão de PV acima.
  sanMaxBonus?: number;
  sanMaxPerNexStep?: number;
  // Sanidade máxima da classe pela metade (Traços do Outro Lado) — aplicado
  // só na parte base (classe + NEX), antes de somar outros bônus fixos.
  sanMaxHalved?: boolean;
  // PE máximo: fixo + "mais 1 PE a cada NEX ímpar" (steps = floor(max(0,
  // nex-5)/10) — conta certa pra 15/25/35.../95, conferida contra o livro).
  peMaxBonus?: number;
  peMaxPerOddNexStep?: number;
  // Limite de PE por turno: bônus fixo (soma ao pePerTurn(nex) normal).
  pePerTurnBonus?: number;
  // Deslocamento (m): bônus fixo.
  displacementBonus?: number;
  // Espaços de carga: bônus fixo (ex. Mochileiro).
  loadLimitBonus?: number;
  // Resistência a dano por tipo — valor fixo OU igual a um atributo (ex.
  // "resistência a dano mental igual ao seu Intelecto").
  damageResistance?: { type: string; amount?: number; fromAttr?: AttrKey }[];
}

export const ABILITY_EFFECTS: Record<string, AbilityEffect> = {
  // ---------------- Poderes de classe (já existiam) ----------------
  // Especialista (pg 39 do livro) — "+2 em rolagens de dano com armas de fogo".
  'Balística Avançada': { weaponDamageBonus: { category: 'fogo', amount: 2 } },
  // Operações Especiais (trilha de Combatente), NEX 10% — "+5 em
  // Iniciativa [...]" (a ação de movimento extra na 1ª rodada é só-cena,
  // fica de fora; o +5 fixo é a parte passiva).
  'Iniciativa Aprimorada': { skillBonus: { skill: 'iniciativa', amount: 5 } },

  // ---------------- Poderes de origem (livro básico, Tabela 1.1) ----------------
  // Universitário — pág. 21: "Você recebe +1 PE, e mais 1 PE adicional a
  // cada NEX ímpar (15%, 25%…). Além disso, seu limite de PE por turno
  // aumenta em 1". Bug relatado pelo usuário — exemplo usado pra achar a
  // causa raiz.
  Dedicação: { peMaxBonus: 1, peMaxPerOddNexStep: 1, pePerTurnBonus: 1 },
  // Desgarrado — pág. 18: "Você recebe +1 PV para cada 5% de NEX."
  Calejado: { pvMaxPerNexStep: 1 },
  // Vítima — pág. 21: "Você recebe +1 de Sanidade para cada 5% de NEX."
  'Cicatrizes Psicológicas': { sanMaxPerNexStep: 1 },
  // Lutador — pág. 19: "Você recebe +2 em rolagens de dano com ataques
  // corpo a corpo."
  'Mão Pesada': { weaponDamageBonus: { category: 'corpo-a-corpo', amount: 2 } },
  // Militar — pág. 20: "Você recebe +2 em rolagens de dano com armas de
  // fogo."
  'Para Bellum': { weaponDamageBonus: { category: 'fogo', amount: 2 } },
  // Policial — pág. 20: "Você recebe +2 em Defesa."
  Patrulha: { defenseBonus: 2 },
  // Teórico da Conspiração — pág. 21: "Você recebe resistência a dano
  // mental igual ao seu Intelecto."
  'Eu Já Sabia': { damageResistance: [{ type: 'mental', fromAttr: 'INT' }] },
  // Cultista Arrependido — pág. 18: "Você possui um poder paranormal à
  // sua escolha. Porém, começa o jogo com metade da Sanidade normal para
  // sua classe." O poder paranormal em si (Traços do Outro Lado) fica
  // como texto — o jogador escolhe manualmente e adiciona a habilidade do
  // poder escolhido à parte; aqui só a metade de Sanidade, que É
  // automatizável.
  'Traços do Outro Lado': { sanMaxHalved: true },

  // ---------------- Poderes de classe (livro básico) ----------------
  // Combatente, pág. 25: "Você recebe +2 em Defesa e em testes de
  // resistência." — testes de resistência do livro são Fortitude/
  // Reflexos/Vontade.
  'Reflexos Defensivos': {
    defenseBonus: 2,
    skillBonuses: [
      { skill: 'fortitude', amount: 2 },
      { skill: 'reflexos', amount: 2 },
      { skill: 'vontade', amount: 2 },
    ],
  },
  // Combatente (Sobrevivendo ao Horror, pág. 14): "Seu limite de carga
  // aumenta em 5 espaços e você pode se beneficiar de uma vestimenta
  // adicional." (a vestimenta extra não tem campo pra automatizar —
  // teria que mexer no limite de "só 2 vestimentas ativas" do catálogo,
  // fica de fora por enquanto).
  Mochileiro: { loadLimitBonus: 5 },
  // Combatente (Sobrevivendo ao Horror, pág. 14): "Você recebe +3m em seu
  // deslocamento e +O em testes de perícia para fugir em uma perseguição"
  // — só a parte do deslocamento é sempre-ativa; o +O em fuga é limitado
  // à cena de perseguição (texto).
  'Correria Desesperada': { displacementBonus: 3 },
  // Especialista, pág. 29: "Você recebe proficiência com armas táticas de
  // ataque corpo a corpo e de disparo (exceto de fogo) e +2 em rolagens
  // de dano com armas de corpo a corpo e de disparo."
  'Ninja Urbano': {
    weaponDamageBonuses: [
      { category: 'corpo-a-corpo', amount: 2 },
      { category: 'disparo', amount: 2 },
    ],
  },

  // ---------------- Poderes de origem (Sobrevivendo ao Horror) ----------------
  // Diplomata, pág. 9: "Você recebe +2 em Diplomacia. [...]" (o resto do
  // poder — substituir um teste por Diplomacia gastando PE — é texto).
  Conexões: { skillBonus: { skill: 'diplomacia', amount: 2 } },
  // Mergulhador, pág. 12: "Você recebe +5 PV e pode prender a respiração
  // [...]" (prender a respiração e nadar sem penalidade ficam de fora,
  // não têm campo na ficha).
  'Fôlego de Nadador': { pvMaxBonus: 5 },
  // Profetizado, pág. 13-14: "Você recebe +2 em Vontade. [...]" (o bônus
  // de PE temporário ao ver uma referência à própria premonição é
  // condicional, fica como texto).
  'Luta ou Fuga': { skillBonus: { skill: 'vontade', amount: 2 } },

  // ---------------- Poderes paranormais (livro básico, pág. 114-115) ----------------
  // Conhecimento, pág. 114: "Você recebe +2 em Defesa e em testes de
  // resistência." — mesmo padrão de Reflexos Defensivos.
  Precognição: {
    defenseBonus: 2,
    skillBonuses: [
      { skill: 'fortitude', amount: 2 },
      { skill: 'reflexos', amount: 2 },
      { skill: 'vontade', amount: 2 },
    ],
  },
  // Conhecimento, pág. 114: "[...] recebendo +5 em testes de Diplomacia,
  // Intimidação e Intuição."
  Sensitivo: {
    skillBonuses: [
      { skill: 'diplomacia', amount: 5 },
      { skill: 'intimidacao', amount: 5 },
      { skill: 'intuicao', amount: 5 },
    ],
  },
  // Conhecimento, pág. 115: "Você recebe +5 em testes de Percepção e
  // enxerga no escuro." (enxergar no escuro não tem campo na ficha).
  'Visão do Oculto': { skillBonus: { skill: 'percepcao', amount: 5 } },
};
