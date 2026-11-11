// Poderes Paranormais — Ordem Paranormal RPG (livro básico, p. 114-117).
// Lista usada pelo poder de classe Transcender. Resumos são paráfrase própria.
// "Afinidade": ao atingir NEX 50% o personagem escolhe um elemento (Conhecimento/
// Energia/Morte/Sangue); na primeira vez que Transcender depois disso, os poderes
// desse elemento podem ser escolhidos de novo pelo benefício extra de "Afinidade".

import type { Element } from './ordem';

export interface ParanormalPowerDef {
  key: string;
  name: string;
  element: Element | 'geral';
  summary: string;
  affinitySummary?: string;
  prereq?: string;
  needsElement?: boolean; // Resistir a [Elemento]
}

export const PARANORMAL_POWERS: ParanormalPowerDef[] = [
  {
    key: 'aprender-ritual',
    name: 'Aprender Ritual',
    element: 'geral',
    summary:
      'Aprende um ritual de 1º círculo à escolha (2º a partir de NEX 45%, 3º a partir de 75%); pode trocar um ritual já conhecido por outro. Pode escolher quantas vezes quiser, dentro do limite de rituais conhecidos.',
  },
  {
    key: 'resistir-elemento',
    name: 'Resistir a [Elemento]',
    element: 'geral',
    summary: 'Escolha um elemento (Conhecimento/Energia/Morte/Sangue); ganha resistência 10 contra ele.',
    affinitySummary: 'A resistência aumenta para 20.',
    needsElement: true,
  },
  // ---- Conhecimento ----
  {
    key: 'expansao-conhecimento',
    name: 'Expansão de Conhecimento',
    element: 'conhecimento',
    summary: 'Aprende um poder de classe de outra classe (cumprindo os pré-requisitos dele).',
    affinitySummary: 'Aprende um segundo poder de classe de outra classe.',
    prereq: 'Conhecimento 1',
  },
  {
    key: 'percepcao-paranormal',
    name: 'Percepção Paranormal',
    element: 'conhecimento',
    summary: 'Em cenas de investigação, ao procurar pistas pode rolar de novo um dado com resultado menor que 10 (deve aceitar o novo resultado).',
    affinitySummary: 'Pode rolar de novo até dois dados menores que 10.',
  },
  {
    key: 'precognicao',
    name: 'Precognição',
    element: 'conhecimento',
    summary: '+2 em Defesa e em testes de resistência.',
    affinitySummary: 'Fica imune à condição desprevenido.',
    prereq: 'Conhecimento 1',
  },
  {
    key: 'sensitivo',
    name: 'Sensitivo',
    element: 'conhecimento',
    summary: '+5 em Diplomacia, Intimidação e Intuição.',
    affinitySummary: 'Em testes opostos com essas perícias, o oponente sofre −O.',
  },
  {
    key: 'visao-oculto',
    name: 'Visão do Oculto',
    element: 'conhecimento',
    summary: '+5 em Percepção e enxerga no escuro.',
    affinitySummary: 'Ignora camuflagem.',
  },
  // ---- Energia ----
  {
    key: 'afortunado',
    name: 'Afortunado',
    element: 'energia',
    summary: 'Uma vez por rolagem, pode rolar de novo um resultado 1 em qualquer dado que não seja d20.',
    affinitySummary: 'Uma vez por teste, também pode rolar de novo um 1 no d20.',
  },
  {
    key: 'campo-protetor',
    name: 'Campo Protetor',
    element: 'energia',
    summary: 'Ao usar esquiva, gaste 1 PE para +5 em Defesa.',
    affinitySummary: 'Também +5 em Reflexos; se passar num teste de Reflexos que reduziria o dano à metade, não sofre nenhum dano.',
    prereq: 'Energia 1',
  },
  {
    key: 'causalidade-fortuita',
    name: 'Causalidade Fortuita',
    element: 'energia',
    summary: 'Em cenas de investigação, a DT para procurar pistas cai −5 até encontrar uma pista.',
    affinitySummary: 'A DT cai −5 sempre.',
  },
  {
    key: 'golpe-sorte',
    name: 'Golpe de Sorte',
    element: 'energia',
    summary: '+1 na margem de ameaça dos seus ataques.',
    affinitySummary: '+1 no multiplicador de crítico.',
    prereq: 'Energia 1',
  },
  {
    key: 'manipular-entropia',
    name: 'Manipular Entropia',
    element: 'energia',
    summary: 'Gaste 2 PE para forçar um ser em alcance curto a rolar de novo um dado de um teste de perícia.',
    affinitySummary: 'O alvo rola de novo todos os dados que você escolher.',
    prereq: 'Energia 1',
  },
  // ---- Morte ----
  {
    key: 'encarar-morte',
    name: 'Encarar a Morte',
    element: 'morte',
    summary: 'Em cenas de ação, seu limite de gasto de PE por turno aumenta em +1.',
    affinitySummary: 'Aumenta em +2 (total +3).',
  },
  {
    key: 'escapar-morte',
    name: 'Escapar da Morte',
    element: 'morte',
    summary: 'Uma vez por cena, um dano que te deixaria com 0 PV te deixa com 1 PV (não funciona com dano massivo).',
    affinitySummary: 'Evita completamente o dano; com dano massivo, fica com 1 PV.',
    prereq: 'Morte 1',
  },
  {
    key: 'potencial-aprimorado',
    name: 'Potencial Aprimorado',
    element: 'morte',
    summary: 'Ganha +1 PE por NEX (escala conforme sobe de NEX depois de escolher).',
    affinitySummary: 'Ganha +1 PE adicional por NEX (total +2 por NEX).',
  },
  {
    key: 'potencial-reaproveitado',
    name: 'Potencial Reaproveitado',
    element: 'morte',
    summary: 'Uma vez por rodada, ao passar num teste de resistência, ganha 2 PE temporários (somem no fim da cena).',
    affinitySummary: 'Ganha 3 PE temporários em vez de 2.',
  },
  {
    key: 'surto-temporal',
    name: 'Surto Temporal',
    element: 'morte',
    summary: 'Uma vez por cena, gaste 3 PE para uma ação padrão adicional no seu turno.',
    affinitySummary: 'Pode usar uma vez por turno em vez de uma vez por cena.',
    prereq: 'Morte 2',
  },
  // ---- Sangue ----
  {
    key: 'anatomia-insana',
    name: 'Anatomia Insana',
    element: 'sangue',
    summary: '50% de chance de ignorar o dano extra de um crítico ou ataque furtivo.',
    affinitySummary: 'Fica imune aos efeitos de críticos e ataques furtivos.',
    prereq: 'Sangue 2',
  },
  {
    key: 'arma-sangue',
    name: 'Arma de Sangue',
    element: 'sangue',
    summary: 'Gaste ação de movimento + 2 PE para criar uma arma de sangue (leve, 1d6, dura a cena).',
    affinitySummary: 'A arma vira permanente e causa 1d10.',
  },
  {
    key: 'sangue-ferro',
    name: 'Sangue de Ferro',
    element: 'sangue',
    summary: 'Ganha +2 PV por NEX (escala conforme sobe de NEX depois de escolher).',
    affinitySummary: '+5 em Fortitude e imunidade a venenos e doenças.',
  },
  {
    key: 'sangue-fervente',
    name: 'Sangue Fervente',
    element: 'sangue',
    summary: 'Enquanto machucado, +1 em Agilidade ou Força (à escolha).',
    affinitySummary: 'O bônus aumenta para +2.',
    prereq: 'Sangue 2',
  },
  {
    key: 'sangue-vivo',
    name: 'Sangue Vivo',
    element: 'sangue',
    summary: 'Na primeira vez que ficar machucado numa cena, ganha cura acelerada 2 (não cura acima da metade do PV).',
    affinitySummary: 'A cura acelerada sobe para 5.',
    prereq: 'Sangue 1',
  },
  // ---- Suplemento "Sobrevivendo ao Horror" ----
  {
    key: 'espreitar-besta',
    name: 'Espreitar da Besta',
    element: 'sangue',
    summary: '+5 em Furtividade. Em perseguição (caçador): pode usar Furtividade em vez de Atletismo. Em cenas de furtividade: ações discretas sem penalidade de –O.',
    affinitySummary: 'O bônus em Furtividade aumenta para +10.',
  },
  {
    key: 'instintos-sanguinarios',
    name: 'Instintos Sanguinários',
    element: 'sangue',
    summary: 'Recebe visão no escuro e faro.',
    affinitySummary: 'Não pode mais ser flanqueado, não fica desprevenido e +5 contra armadilhas da realidade/paranormais.',
  },
  {
    key: 'antecipar-vitalidade',
    name: 'Antecipar Vitalidade',
    element: 'morte',
    summary: 'Acumula cargas de antecipação (máx. = Vigor) pra +O num teste; perde uma carga se dormir em vez de recuperar PV com carga ativa.',
    affinitySummary: 'Limite de cargas +2; perde 2 cargas por ação dormir.',
  },
  {
    key: 'aura-pavor',
    name: 'Aura de Pavor',
    element: 'morte',
    summary: '2 PE + ação de movimento: deixa alguém em alcance médio apavorado (Vontade DT Pre reduz pra abalado). 1x/dia por alvo.',
    affinitySummary: 'DT +5 e pode afetar qualquer pessoa/animal escolhido no alcance.',
  },
  {
    key: 'absorver-conhecimento',
    name: 'Absorver Conhecimento',
    element: 'conhecimento',
    summary: 'Empunhando uma fonte de conhecimento escrito: 1 PE + ação completa pra obter uma resposta automática. Com a ação de interlúdio ler: sobe o dado de bônus um passo.',
    affinitySummary: 'Ritual de Conhecimento contra 1 pessoa tocada: custa –1 PE.',
  },
  {
    key: 'apatia-herege',
    name: 'Apatia Herege',
    element: 'conhecimento',
    summary: 'Contra condição de medo: 2 PE pra rolar de novo o teste (deve aceitar o segundo resultado).',
    affinitySummary: 'Pode usar depois de saber o primeiro resultado e escolher o melhor dos dois.',
    prereq: 'Conhecimento 1',
  },
  {
    key: 'conexao-empatica',
    name: 'Conexão Empática',
    element: 'energia',
    summary: '2 PE + ação completa: conversa com um objeto elétrico ligado como se fosse senciente até o fim da cena.',
    affinitySummary: '+5 em perícias de Intelecto/Presença com o item.',
    prereq: 'Energia 1',
  },
  {
    key: 'valer-se-caos',
    name: 'Valer-se do Caos',
    element: 'energia',
    summary: 'Pode tentar controlar o caos num teste pra +O; se falhar (ou d20 extra ≤5), perde 1d4 de Sanidade.',
    affinitySummary: 'Perde Sanidade só em falha ou se o extra for 1 ou 2.',
  },
];

export const PARANORMAL_BY_KEY: Record<string, ParanormalPowerDef> = Object.fromEntries(
  PARANORMAL_POWERS.map((p) => [p.key, p]),
);

export const PARANORMAL_BY_ELEMENT: Record<Element | 'geral', ParanormalPowerDef[]> = {
  geral: PARANORMAL_POWERS.filter((p) => p.element === 'geral'),
  conhecimento: PARANORMAL_POWERS.filter((p) => p.element === 'conhecimento'),
  energia: PARANORMAL_POWERS.filter((p) => p.element === 'energia'),
  morte: PARANORMAL_POWERS.filter((p) => p.element === 'morte'),
  sangue: PARANORMAL_POWERS.filter((p) => p.element === 'sangue'),
  medo: [],
};
