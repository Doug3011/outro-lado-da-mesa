// Modificações de proteção (Capítulo 3, Tabela 3.6 do livro de regras) —
// mesmo mecanismo das modificações de arma (ver weaponModifications.ts):
// pedido do usuário, "colocar modificações em itens de defesa tipo
// coletes". `scope` é só informativo (tooltip), igual ao de
// WeaponModDef — não é validado aqui. "Reforçada" e "Blindada" têm efeito
// NUMÉRICO conhecido (defenseBonus/rdBonus, batem com `deriveStats` em
// domain/character.ts); todas as quatro mudam o espaço ocupado
// (`slotsDelta`). "Antibombas" continua só narrativa (resistência contra
// efeitos de área) — sem campo correspondente na ficha hoje.
export interface ArmorModEffect {
  defenseBonus?: number;
  rdBonus?: number; // resistência a dano fixa (Blindada: vira RD 5)
  slotsDelta?: number; // mudança no espaço ocupado
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
    effect: { rdBonus: 5, slotsDelta: 1 },
  },
  {
    key: 'discreta-protecao',
    name: 'Discreta',
    scope: 'só proteção leve',
    description: '–1 espaço, +5 em Crime pra ocultar (mesmo sem treino).',
    effect: { slotsDelta: -1 },
  },
  {
    key: 'reforcada',
    name: 'Reforçada',
    scope: 'proteção leve ou pesada',
    description: '+2 na Defesa e +1 espaço. Não acumula com Discreta.',
    effect: { defenseBonus: 2, slotsDelta: 1 },
  },
];

export const ARMOR_MOD_BY_KEY: Record<string, ArmorModDef> = Object.fromEntries(
  ARMOR_MODIFICATIONS.map((m) => [m.key, m]),
);
