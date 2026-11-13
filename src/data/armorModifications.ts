// Modificações de proteção (Capítulo 3, Tabela 3.6 do livro de regras) —
// mesmo mecanismo das modificações de arma (ver weaponModifications.ts):
// pedido do usuário, "colocar modificações em itens de defesa tipo
// coletes". `scope` é só informativo (tooltip), igual ao de
// WeaponModDef — não é validado aqui. Só "Reforçada" tem efeito NUMÉRICO
// conhecido (bate 1:1 com `defenseBonus` de deriveStats em
// domain/character.ts); as outras (Antibombas, Blindada, Discreta) têm
// efeito só narrativo (resistência a dano/área, espaço, ocultar) — sem
// campo correspondente na ficha hoje, continuam só como texto, igual já
// acontece com boa parte das modificações de arma.
export interface ArmorModEffect {
  defenseBonus?: number;
}

export interface ArmorModDef {
  key: string;
  name: string;
  scope: string;
  description: string;
  effect: ArmorModEffect;
}

export const ARMOR_MODIFICATIONS: ArmorModDef[] = [
  {
    key: 'antibombas',
    name: 'Antibombas',
    scope: 'só proteção pesada',
    description: '+5 em resistência contra efeitos de área.',
    effect: {},
  },
  {
    key: 'blindada',
    name: 'Blindada',
    scope: 'só proteção pesada',
    description: 'Resistência a dano 5 e +1 espaço.',
    effect: {},
  },
  {
    key: 'discreta-protecao',
    name: 'Discreta',
    scope: 'só proteção leve',
    description: '–1 espaço, +5 em Crime pra ocultar (mesmo sem treino).',
    effect: {},
  },
  {
    key: 'reforcada',
    name: 'Reforçada',
    scope: 'proteção leve ou pesada',
    description: '+2 na Defesa e +1 espaço. Não acumula com Discreta.',
    effect: { defenseBonus: 2 },
  },
];

export const ARMOR_MOD_BY_KEY: Record<string, ArmorModDef> = Object.fromEntries(
  ARMOR_MODIFICATIONS.map((m) => [m.key, m]),
);
