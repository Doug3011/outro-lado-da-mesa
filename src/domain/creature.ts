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
  skillsText: string; // lista livre, ex. "Crime 2O+5, Furtividade 2O+5"
  displacement: number; // metros por ação de movimento
  abilitiesText: string; // habilidades passivas, texto livre
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
    skillsText: '',
    displacement: 9,
    abilitiesText: '',
    actions: [],
    notes: '',
    updatedAt: Date.now(),
  };
}

// PV machucado (metade do máximo, arredondado pra baixo) — só exibido como
// referência (a ficha impressa das ameaças sempre mostra esse número ao
// lado do PV máximo), não é um campo guardado à parte.
export function creatureBloodied(c: Creature): number {
  return Math.floor(c.pvMax / 2);
}
