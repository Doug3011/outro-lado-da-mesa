// Trilhas — Ordem Paranormal RPG (livro básico). Cada classe tem 5 trilhas;
// escolhida em NEX 10%, ganha um novo poder da trilha em NEX 40%, 65% e 99%.
// Resumos são descrições próprias (paráfrase) — o texto integral de cada poder
// está no livro.

import type { ClassKey } from './ordem';

export type TrilhaNex = 10 | 40 | 65 | 99;

export interface TrilhaPower {
  nex: TrilhaNex;
  name: string;
  summary: string;
}

export interface TrilhaDef {
  classe: ClassKey;
  name: string;
  flavor: string;
  powers: TrilhaPower[];
}

export const TRILHAS: TrilhaDef[] = [
  /* ---------------- COMBATENTE ---------------- */
  {
    classe: 'combatente',
    name: 'Aniquilador',
    flavor: 'Especialista em uma arma favorita, que fica cada vez mais mortal.',
    powers: [
      { nex: 10, name: 'A Favorita', summary: 'Escolhe uma arma favorita; a categoria dela é reduzida em I.' },
      { nex: 40, name: 'Técnica Secreta', summary: 'Categoria da favorita reduzida em II; gasta PE em ataques com ela pra somar efeitos extras (atingir alvo adicional, aumentar multiplicador de crítico).' },
      { nex: 65, name: 'Técnica Sublime', summary: 'Ganha mais opções de efeito: aumentar margem de ameaça ou ignorar resistência a dano do alvo.' },
      { nex: 99, name: 'Máquina de Matar', summary: 'Categoria da favorita reduzida em III; +2 na margem de ameaça e +1 dado de dano.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Comandante de Campo',
    flavor: 'Lidera e potencializa os aliados em combate.',
    powers: [
      { nex: 10, name: 'Inspirar Confiança', summary: 'Gasta reação e PE pra um aliado próximo repetir um teste recém-feito.' },
      { nex: 40, name: 'Estrategista', summary: 'Gasta ação e PE pra dar ação de movimento extra a aliados próximos no turno deles.' },
      { nex: 65, name: 'Brecha na Guarda', summary: 'Quando um aliado causa dano, permite um ataque adicional contra o mesmo alvo; alcance das habilidades da trilha aumenta.' },
      { nex: 99, name: 'Oficial Comandante', summary: 'Gasta ação e PE pra dar uma ação padrão extra a todos os aliados visíveis em alcance médio.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Guerreiro',
    flavor: 'Corpo transformado em arma; combate corpo a corpo é sua especialidade.',
    powers: [
      { nex: 10, name: 'Técnica Letal', summary: '+2 na margem de ameaça em ataques corpo a corpo.' },
      { nex: 40, name: 'Revidar', summary: 'Ao bloquear um ataque, pode gastar reação e PE pra revidar corpo a corpo.' },
      { nex: 65, name: 'Força Opressora', summary: 'Ao acertar corpo a corpo, gasta PE pra empurrar ou derrubar o alvo como ação livre, com bônus.' },
      { nex: 99, name: 'Potência Máxima', summary: 'Bônus numéricos do Ataque Especial em armas corpo a corpo dobram.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Operações Especiais',
    flavor: 'Ações calculadas e otimizadas em campo de batalha.',
    powers: [
      { nex: 10, name: 'Iniciativa Aprimorada', summary: '+5 em Iniciativa e ação de movimento extra na primeira rodada.' },
      { nex: 40, name: 'Ataque Extra', summary: 'Uma vez por rodada, gasta PE pra fazer um ataque adicional.' },
      { nex: 65, name: 'Surto de Adrenalina', summary: 'Uma vez por rodada, gasta PE pra uma ação padrão ou de movimento extra.' },
      { nex: 99, name: 'Sempre Alerta', summary: 'Ação padrão adicional no início de cada cena de combate.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Tropa de Choque',
    flavor: 'Corpo duro como aço; sempre na linha de frente protegendo os aliados.',
    powers: [
      { nex: 10, name: 'Casca Grossa', summary: '+1 PV para cada 5% de NEX; soma Vigor na resistência a dano ao bloquear.' },
      { nex: 40, name: 'Cai Dentro', summary: 'Gasta reação e PE pra forçar um inimigo próximo a atacar você em vez de um aliado.' },
      { nex: 65, name: 'Duro de Matar', summary: 'Gasta reação e PE pra reduzir à metade o dano sofrido (paranormal incluso a partir de NEX 85%).' },
      { nex: 99, name: 'Inquebrável', summary: 'Machucado dá +5 de Defesa e resistência a dano; morrendo, continua agindo normalmente.' },
    ],
  },

  /* ---------------- ESPECIALISTA ---------------- */
  {
    classe: 'especialista',
    name: 'Atirador de Elite',
    flavor: 'Neutraliza ameaças à distância com precisão cirúrgica.',
    powers: [
      { nex: 10, name: 'Mira de Elite', summary: 'Proficiência com armas de bala longa; soma Intelecto no dano com elas.' },
      { nex: 40, name: 'Disparo Letal', summary: 'Ao mirar, gasta PE pra aumentar a margem de ameaça do próximo ataque.' },
      { nex: 65, name: 'Disparo Impactante', summary: 'Gasta PE pra trocar o dano de um tiro por uma manobra (derrubar, desarmar, empurrar, quebrar).' },
      { nex: 99, name: 'Atirar para Matar', summary: 'Acerto crítico com arma de fogo causa dano máximo automaticamente.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Infiltrador',
    flavor: 'Entra e sai sem deixar rastro, neutralizando alvos distraídos.',
    powers: [
      { nex: 10, name: 'Ataque Furtivo', summary: 'Gasta PE pra dano extra contra alvo desprevenido/flanqueado; o dado de bônus cresce com o NEX.' },
      { nex: 40, name: 'Gatuno', summary: '+5 em Atletismo e Crime; pode se esconder sem penalidade de deslocamento.' },
      { nex: 65, name: 'Assassinar', summary: 'Gasta ação e PE pra dobrar o dano extra do próximo Ataque Furtivo contra um alvo analisado.' },
      { nex: 99, name: 'Sombra Fugaz', summary: 'Gasta PE pra não sofrer penalidade de Furtividade após atacar ou chamar atenção.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Médico de Campo',
    flavor: 'Primeiros socorros e decisões rápidas em meio ao caos.',
    powers: [
      { nex: 10, name: 'Paramédico', summary: 'Gasta ação e PE pra curar PV de si ou de um aliado adjacente; a cura cresce com o NEX.' },
      { nex: 40, name: 'Equipe de Trauma', summary: 'Gasta ação e PE pra remover uma condição negativa de um aliado adjacente.' },
      { nex: 65, name: 'Resgate', summary: 'Move-se de graça até um aliado ferido; curar/remover condição dá +5 de Defesa temporário para os dois.' },
      { nex: 99, name: 'Reanimação', summary: 'Uma vez por cena, gasta ação completa e PE pra reviver um personagem morto na mesma cena.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Negociador',
    flavor: 'Convence, engana ou intimida melhor do que qualquer arma.',
    powers: [
      { nex: 10, name: 'Eloquência', summary: 'Gasta ação e PE por alvo pra deixá-los fascinados via Diplomacia, Enganação ou Intimidação.' },
      { nex: 40, name: 'Discurso Motivador', summary: 'Gasta ação e PE pra dar bônus em perícia a si e aliados próximos até o fim da cena.' },
      { nex: 65, name: 'Eu Conheço um Cara', summary: 'Uma vez por missão, aciona contatos pra conseguir favores (a critério do mestre).' },
      { nex: 99, name: 'Truque de Mestre', summary: 'Gasta PE pra imitar uma habilidade que viu um aliado usar na cena.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Técnico',
    flavor: 'Mantém, repara e improvisa equipamento em campo.',
    powers: [
      { nex: 10, name: 'Inventário Otimizado', summary: 'Soma Intelecto à Força para calcular a capacidade de carga.' },
      { nex: 40, name: 'Remendão', summary: 'Gasta ação e PE pra consertar um equipamento quebrado; categoria de equipamentos gerais reduzida em I.' },
      { nex: 65, name: 'Improvisar', summary: 'Gasta ação e PE pra criar uma versão funcional e temporária de um equipamento geral.' },
      { nex: 99, name: 'Preparado para Tudo', summary: 'Gasta PE pra "lembrar" que já tinha um item comum guardado.' },
    ],
  },

  /* ---------------- OCULTISTA ---------------- */
  {
    classe: 'ocultista',
    name: 'Conduíte',
    flavor: 'Domina os fundamentos da conjuração — alcance, velocidade e contramedidas.',
    powers: [
      { nex: 10, name: 'Ampliar Ritual', summary: 'Gasta PE pra aumentar o alcance em um passo ou dobrar a área de um ritual.' },
      { nex: 40, name: 'Acelerar Ritual', summary: 'Uma vez por rodada, gasta PE extra pra conjurar um ritual como ação livre.' },
      { nex: 65, name: 'Anular Ritual', summary: 'Ao ser alvo de um ritual, gasta PE e testa Ocultismo contra o conjurador pra anulá-lo.' },
      { nex: 99, name: 'Canalizar o Medo', summary: 'Aprende o ritual Canalizar o Medo.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Flagelador',
    flavor: 'Transforma dor e sofrimento em combustível para os rituais.',
    powers: [
      { nex: 10, name: 'Poder do Flagelo', summary: 'Pode pagar o custo de PE de um ritual usando PV (2 PV por PE).' },
      { nex: 40, name: 'Abraçar a Dor', summary: 'Gasta reação e PE pra reduzir à metade dano não paranormal sofrido.' },
      { nex: 65, name: 'Absorver Agonia', summary: 'Ao reduzir inimigos a 0 PV com ritual, ganha PE temporário igual ao círculo do ritual.' },
      { nex: 99, name: 'Medo Tangível', summary: 'Aprende o ritual Medo Tangível.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Graduado',
    flavor: 'Estuda para conhecer mais rituais que qualquer outro ocultista.',
    powers: [
      { nex: 10, name: 'Saber Ampliado', summary: 'Aprende um ritual extra de 1º círculo (e outro a cada novo círculo liberado) fora do limite normal.' },
      { nex: 40, name: 'Grimório Ritualístico', summary: 'Grimório especial guarda rituais extras (quantidade = Intelecto), fora do limite normal; precisa consultá-lo para conjurar.' },
      { nex: 65, name: 'Rituais Eficientes', summary: '+5 na DT de resistência de todos os seus rituais.' },
      { nex: 99, name: 'Conhecendo o Medo', summary: 'Aprende o ritual Conhecendo o Medo.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Intuitivo',
    flavor: 'Mente treinada para resistir aos efeitos do Outro Lado.',
    powers: [
      { nex: 10, name: 'Mente Sã', summary: '+5 de resistência paranormal (testes de resistência contra efeitos paranormais).' },
      { nex: 40, name: 'Presença Poderosa', summary: 'Soma Presença ao limite de PE por turno, só para conjurar rituais.' },
      { nex: 65, name: 'Inabalável', summary: 'Resistência a dano mental/paranormal 10; testes de Vontade bem-sucedidos anulam o dano por completo.' },
      { nex: 99, name: 'Presença do Medo', summary: 'Aprende o ritual Presença do Medo.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Lâmina Paranormal',
    flavor: 'Usa o paranormal como arma, misturando conjuração com combate.',
    powers: [
      { nex: 10, name: 'Lâmina Maldita', summary: 'Aprende Amaldiçoar Arma; pode usar Ocultismo em vez de Luta/Pontaria com a arma amaldiçoada.' },
      { nex: 40, name: 'Gladiador Paranormal', summary: 'Acertos corpo a corpo dão PE temporário (limitado por cena).' },
      { nex: 65, name: 'Conjuração Marcial', summary: 'Uma vez por rodada, gasta PE pra fazer um ataque corpo a corpo de graça após conjurar um ritual padrão.' },
      { nex: 99, name: 'Lâmina do Medo', summary: 'Aprende o ritual Lâmina do Medo.' },
    ],
  },
];

export const TRILHAS_BY_CLASS: Record<ClassKey, TrilhaDef[]> = {
  combatente: TRILHAS.filter((t) => t.classe === 'combatente'),
  especialista: TRILHAS.filter((t) => t.classe === 'especialista'),
  ocultista: TRILHAS.filter((t) => t.classe === 'ocultista'),
};

export function trilhaByName(classe: ClassKey, name: string): TrilhaDef | undefined {
  return TRILHAS_BY_CLASS[classe].find((t) => t.name === name);
}

// Poderes da trilha já desbloqueados pelo NEX atual (10/40/65/99).
export function unlockedTrilhaPowers(classe: ClassKey, trilhaName: string, nex: number): TrilhaPower[] {
  const t = trilhaByName(classe, trilhaName);
  if (!t) return [];
  return t.powers.filter((p) => p.nex <= nex);
}
