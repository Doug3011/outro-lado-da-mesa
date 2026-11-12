// Modificações de arma (Capítulo 3, Tabela 3.5 do livro de regras — já
// conferida) — pedido do usuário: modificar uma arma recalcula o ataque
// sozinho (ex.: uma modificação que aumenta a margem de ameaça em 1 faz o
// crítico cair de 20 para 19). `scope` diz em que tipo de arma a
// modificação pode ser aplicada — só informativo pra UI, não é validado
// aqui. `effect` é só o que tem efeito NUMÉRICO no ataque — cada campo bate
// 1:1 com uma coluna da tabela do livro:
//   - atkBonus: soma ao teste de ataque
//   - dmgBonus: soma fixo à rolagem de dano
//   - critThreatBonus: abaixa a margem de ameaça necessária nesse tanto
//     (ex.: 2 faz 20 virar 18) — é a mesma unidade que o livro usa
//   - critMultBonus: soma ao multiplicador de crítico
//   - extraDieSameType: +1 dado do MESMO tipo do dado base da arma
//     (Calibre Grosso: 2d6 vira 3d6)
//   - extraDamageDie: dado extra de tipo PRÓPRIO somado ao dano (Explosiva:
//     +2d6, sem importar o dado base da arma)
// Modificações sem nenhum desses campos (Tática, Discreta, Compensador...)
// têm efeito só narrativo/de outra mecânica (sacar de graça, ocultar
// melhor...) — não mexem no ataque calculado pela ficha.
export interface WeaponModEffect {
  atkBonus?: number;
  dmgBonus?: number;
  critThreatBonus?: number;
  critMultBonus?: number;
  extraDieSameType?: number; // quantos dados a mais do mesmo tipo
  extraDamageDie?: string; // ex. "2d6"
}

export interface WeaponModDef {
  key: string;
  name: string;
  scope: string; // onde pode ser aplicada (texto curto, só pra UI)
  description: string;
  effect: WeaponModEffect;
}

export const WEAPON_MODIFICATIONS: WeaponModDef[] = [
  {
    key: 'certeira',
    name: 'Certeira',
    scope: 'corpo a corpo e disparo',
    description: '+2 em testes de ataque.',
    effect: { atkBonus: 2 },
  },
  {
    key: 'cruel',
    name: 'Cruel',
    scope: 'corpo a corpo e disparo',
    description: '+2 em rolagens de dano.',
    effect: { dmgBonus: 2 },
  },
  {
    key: 'discreta-arma',
    name: 'Discreta',
    scope: 'corpo a corpo, disparo e fogo',
    description: '+5 em testes pra ocultar e reduz o espaço em –1.',
    effect: {},
  },
  {
    key: 'perigosa',
    name: 'Perigosa',
    scope: 'corpo a corpo e disparo',
    description: '+2 em margem de ameaça.',
    effect: { critThreatBonus: 2 },
  },
  {
    key: 'tatica',
    name: 'Tática',
    scope: 'corpo a corpo, disparo e fogo',
    description: 'Pode sacar como ação livre.',
    effect: {},
  },
  {
    key: 'alongada',
    name: 'Alongada',
    scope: 'só armas de fogo',
    description: '+2 em testes de ataque.',
    effect: { atkBonus: 2 },
  },
  {
    key: 'calibre-grosso',
    name: 'Calibre Grosso',
    scope: 'só armas de fogo',
    description: 'Aumenta o dano em mais um dado do mesmo tipo. Exige munição própria de calibre grosso.',
    effect: { extraDieSameType: 1 },
  },
  {
    key: 'compensador',
    name: 'Compensador',
    scope: 'só armas automáticas',
    description: 'Anula a penalidade por disparar rajadas.',
    effect: {},
  },
  {
    key: 'ferrolho-automatico',
    name: 'Ferrolho Automático',
    scope: 'só armas de fogo',
    description: 'A arma se torna automática.',
    effect: {},
  },
  {
    key: 'mira-laser',
    name: 'Mira Laser',
    scope: 'só armas de fogo',
    description: '+2 em margem de ameaça.',
    effect: { critThreatBonus: 2 },
  },
  {
    key: 'mira-telescopica',
    name: 'Mira Telescópica',
    scope: 'só armas de fogo',
    description: 'Aumenta o alcance da arma em uma categoria e permite Ataque Furtivo em qualquer alcance.',
    effect: {},
  },
  {
    key: 'silenciador',
    name: 'Silenciador',
    scope: 'só armas de fogo',
    description: 'Reduz em –OO a penalidade em Furtividade pra se esconder após atacar.',
    effect: {},
  },
  {
    key: 'visao-calor',
    name: 'Visão de Calor',
    scope: 'só armas de fogo',
    description: 'Ignora camuflagem do alvo ao disparar.',
    effect: {},
  },
  {
    key: 'explosiva',
    name: 'Explosiva',
    scope: 'munição (balas curtas/longas)',
    description: 'Aumenta o dano em +2d6.',
    effect: { extraDamageDie: '2d6' },
  },
  {
    key: 'dum-dum',
    name: 'Dum Dum',
    scope: 'munição (balas curtas/longas)',
    description: '+1 no multiplicador de crítico.',
    effect: { critMultBonus: 1 },
  },
  {
    key: 'carregador-rapido',
    name: 'Carregador Rápido',
    scope: 'armas de fogo, bestas e balestras',
    description: 'Arma de fogo: recarrega como ação livre 1x/rodada. Besta/balestra: até 5 recargas como ação livre com 1 mão.',
    effect: {},
  },
];

export const WEAPON_MOD_BY_KEY: Record<string, WeaponModDef> = Object.fromEntries(
  WEAPON_MODIFICATIONS.map((m) => [m.key, m]),
);
