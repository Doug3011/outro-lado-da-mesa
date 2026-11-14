import type { AttrKey } from '../data/ordem';
import { uid } from '../lib/ids';

// Ficha de ameaça (Capítulo 7: Ameaças, do livro de regras) — pedido do
// usuário: "quero poder criar fichas de criaturas" pra organizar combates
// na mesa. Bem mais simples que a ficha de personagem de propósito — o
// próprio livro trata ameaças como "simplificadas" (sem bloqueio/esquiva/
// treino em perícia por grau, por exemplo): aqui a maioria dos campos é
// só o NÚMERO final já pronto (ex. "Defesa 18"), igual aparece impresso
// na ficha de uma ameaça do livro, em vez de recalcular a partir de
// perícia treinada/atributo como a ficha de personagem faz. O mestre
// preenche os valores já prontos (copiando de uma ameaça do livro, ou
// inventando uma própria) em vez de "montar" a ficha passo a passo.
//
// Diferença chave pra ficha de personagem: NEX vira VD (valor de desafio,
// só usado pra comparar dificuldade de combate — não é progressão), e o
// livro não define uma fórmula de "pontos pra gastar" — VD de ameaças
// prontas é uma escolha editorial. Por isso aqui VD é só um número livre.
export const CREATURE_SIZES = ['Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal'] as const;
export type CreatureSize = (typeof CREATURE_SIZES)[number];

// Espaço ocupado (Tabela 7.1) — só informativo, mostrado ao lado do
// tamanho escolhido.
export const CREATURE_SIZE_SPACE: Record<CreatureSize, string> = {
  Minúsculo: '1,5m',
  Pequeno: '1,5m',
  Médio: '1,5m',
  Grande: '3m',
  Enorme: '4,5m',
  Colossal: '9m',
};

// Perícia rolável de verdade (pedido do usuário: "perícias para eu girar"
// em vez do texto livre que só documentava o bônus) — mesmo mecanismo das
// perícias de personagem: `key` vem do catálogo SKILLS (data/ordem.ts), que
// já sabe o atributo certo de cada perícia; aqui só guarda o bônus total
// (o "+5" de "Crime 2O+5" no livro — o "2O" é o atributo da própria
// criatura, não precisa guardar de novo).
export interface CreatureSkill {
  id: string;
  key: string; // SkillDef.key (data/ordem.ts)
  bonus: number;
}

// Habilidade com dado opcional pra rolar — mesmo padrão de Ability.rollDice
// (domain/character.ts), pedido do usuário pra funcionar "igual é com os
// players": cria a habilidade, anexa um dado (ex. "2d6") e já tem um botão
// pra rolar direto da ficha.
export interface CreatureHability {
  id: string;
  name: string;
  description: string;
  rollDice?: string;
}

export interface CreatureAction {
  id: string;
  cost: string; // 'Padrão' | 'Livre' | 'Completa' | 'Reação' — ou texto livre
  name: string;
  range: string; // 'Corpo a corpo' | 'À distância (curto)'... — vazio se não for ataque
  // Teste de ataque usa o mesmo mecanismo de teste da Ordem (rola Nd20,
  // N = valor do atributo, fica com o maior) — ver rollOrdem em
  // useTableStore.ts. `testBonus` é o bônus fixo somado (ex.: "2O+10" no
  // livro = atributo 2 + testBonus 10).
  testAttribute: AttrKey;
  testBonus: number;
  damage: string; // ex. "2d8+9" — vazio se a ação não causa dano em dado
  damageType: string;
  crit: string; // ex. "19/x3" — padrão do livro é "20/x2" quando vazio
  description: string; // efeito adicional, ou a habilidade inteira quando não é ataque
}

export interface Creature {
  id: string;
  name: string;
  vd: number;
  descriptor: string; // ex. "Pessoa", "Sangue"... — texto livre
  size: CreatureSize;
  image?: string; // retrato/token — mesmo formato de Character.portrait
  flavor: string; // texto descritivo curto

  perception: number; // bônus total de Percepção
  initiative: number; // bônus total de Iniciativa
  defense: number;
  fortitude: number;
  reflexes: number;
  will: number;

  pvMax: number;
  pvCurrent: number;
  pvTemp: number;
  damageResistance: string; // texto livre, ex. "RD 10/Morte"

  attributes: Record<AttrKey, number>;
  skills: CreatureSkill[];
  displacement: number; // metros por ação de movimento
  abilities: CreatureHability[];
  actions: CreatureAction[];

  notes: string;
  updatedAt: number;
}

export function emptyCreatureAction(): CreatureAction {
  return {
    id: uid(),
    cost: 'Padrão',
    name: '',
    range: 'Corpo a corpo',
    testAttribute: 'FOR',
    testBonus: 0,
    damage: '',
    damageType: '',
    crit: '',
    description: '',
  };
}

export function emptyCreature(): Creature {
  return {
    id: uid(),
    name: 'Nova ameaça',
    vd: 20,
    descriptor: '',
    size: 'Médio',
    flavor: '',
    perception: 0,
    initiative: 0,
    defense: 10,
    fortitude: 0,
    reflexes: 0,
    will: 0,
    pvMax: 10,
    pvCurrent: 10,
    pvTemp: 0,
    damageResistance: '',
    attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
    skills: [],
    displacement: 9,
    abilities: [],
    actions: [],
    notes: '',
    updatedAt: Date.now(),
  };
}

export function emptyCreatureSkill(key: string): CreatureSkill {
  return { id: uid(), key, bonus: 0 };
}

export function emptyCreatureHability(): CreatureHability {
  return { id: uid(), name: '', description: '', rollDice: undefined };
}

// Normaliza criaturas criadas antes desta versão (campos antigos
// `skillsText`/`abilitiesText` em texto livre) pra não quebrar ao ler uma
// ficha salva antes dessa mudança — vira lista vazia, o mestre reconstrói
// clicando em "+ Perícia"/"+ Habilidade" (o texto antigo não é perdido na
// hora, mas também não migra sozinho, já que não dá pra adivinhar atributo
// e bônus de cada perícia a partir do texto livre com segurança).
export function normalizeCreature(c: Creature): Creature {
  if (Array.isArray(c.skills) && Array.isArray(c.abilities)) return c;
  return { ...c, skills: Array.isArray(c.skills) ? c.skills : [], abilities: Array.isArray(c.abilities) ? c.abilities : [] };
}

// PV machucado (metade do máximo, arredondado pra baixo) — só exibido como
// referência (a ficha impressa das ameaças sempre mostra esse número ao
// lado do PV máximo), não é um campo guardado à parte.
export function creatureBloodied(c: Creature): number {
  return Math.floor(c.pvMax / 2);
}
