import type { WeaponModEffect } from './weaponModifications';

// Maldições de arma (capítulo "Itens Amaldiçoados" do livro de regras) —
// mesmo mecanismo de WEAPON_MODIFICATIONS (ver weaponModifications.ts),
// só que pra maldições em vez de melhorias comuns: pedido do usuário, "as
// melhorias das armas já conseguimos colocar, mas as maldições não".
// Reaproveita `WeaponModEffect` (mesmos campos: atkBonus/dmgBonus/
// critThreatBonus/critMultBonus/extraDieSameType/extraDamageDie) — só os
// poucos efeitos que são bônus FIXO (sempre ativo, sem gastar PE nem
// depender de condição de combate) viram campo numérico; o resto (gasto
// de PE por ataque, efeito condicional a elemento do inimigo, concede um
// poder novo etc.) fica só narrativo em `description`, igual já acontece
// com boa parte das modificações comuns.
export interface WeaponCurseDef {
  key: string;
  name: string;
  element: string; // elemento da maldição (Conhecimento/Energia/Morte/Sangue)
  description: string;
  effect: WeaponModEffect;
}

export const WEAPON_CURSES: WeaponCurseDef[] = [
  {
    key: 'antielemento',
    name: 'Antielemento',
    element: 'Conhecimento',
    description: 'Contra criatura de um elemento (role 1d4 ou escolha): gaste 2 PE e, se acertar, +4d8 de dano.',
    effect: {},
  },
  {
    key: 'ritualistica',
    name: 'Ritualística',
    element: 'Conhecimento',
    description: 'Armazena um ritual (pagando o PE normal) pra descarregar como ação livre ao acertar um ataque.',
    effect: {},
  },
  {
    key: 'senciente',
    name: 'Senciente',
    element: 'Conhecimento',
    description: '2 PE + ação de movimento: a arma flutua e ataca sozinha 1x/rodada (precisa 1 PE/rodada pra manter).',
    effect: {},
  },
  {
    key: 'empuxo',
    name: 'Empuxo',
    element: 'Energia',
    description:
      'Só corpo a corpo. Pode ser arremessada em alcance curto, +1 dado de dano ao arremessar, e volta voando pra você no mesmo turno.',
    effect: {},
  },
  {
    key: 'energetica',
    name: 'Energética',
    element: 'Energia',
    description: '2 PE/ataque: +5 em ataque, ignora RD e converte todo o dano pra Energia.',
    effect: {},
  },
  {
    key: 'vibrante',
    name: 'Vibrante',
    element: 'Energia',
    description: 'Concede Ataque Extra (Operações Especiais); se já tem, reduz o custo em –1 PE.',
    effect: {},
  },
  {
    key: 'consumidora',
    name: 'Consumidora',
    element: 'Morte',
    description: '2 PE ao atacar; se acertar, alvo fica imóvel por 1 rodada.',
    effect: {},
  },
  {
    key: 'erosiva',
    name: 'Erosiva',
    element: 'Morte',
    description: '+1d8 de dano de Morte sempre. 2 PE ao atacar; se acertar, +2d4 de dano de Morte no início dos 2 próximos turnos do alvo.',
    effect: { extraDamageDie: '1d8' },
  },
  {
    key: 'repulsora',
    name: 'Repulsora',
    element: 'Morte',
    description: '+2 de Defesa empunhada. 2 PE num bloqueio: +5 adicional de Defesa.',
    effect: {},
  },
  {
    key: 'lancinante',
    name: 'Lancinante',
    element: 'Sangue',
    description: '+1d8 de dano de Sangue sempre (multiplicado em crítico).',
    effect: { extraDamageDie: '1d8' },
  },
  {
    key: 'predadora',
    name: 'Predadora',
    element: 'Sangue',
    description: 'Anula camuflagem/cobertura leves, dobra a margem de ameaça; se à distância, +1 categoria de alcance.',
    effect: {},
  },
  {
    key: 'sanguinaria',
    name: 'Sanguinária',
    element: 'Sangue',
    description: 'Alvo sangra (2d6/rodada por acerto, cumulativo). Crítico: drena sangue, +2d10 PV temporários pra você.',
    effect: {},
  },
];

export const WEAPON_CURSE_BY_KEY: Record<string, WeaponCurseDef> = Object.fromEntries(
  WEAPON_CURSES.map((c) => [c.key, c]),
);
