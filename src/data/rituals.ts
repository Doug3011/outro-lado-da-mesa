// Compêndio de rituais — Ordem Paranormal RPG (livro básico, 1º ao 4º círculo).
// Índice de referência: nome, círculo, elemento(s) e um resumo curto do efeito
// (descrição própria; a regra completa — execução, alcance, alvo, resistência,
// custo de PE por versão — está no livro).

import type { Element } from './ordem';

export type RitualCircle = 1 | 2 | 3 | 4;

export interface RitualDef {
  name: string;
  circle: RitualCircle;
  elements: Element[];
  summary: string;
  trilhaOnly?: boolean; // exige um poder de trilha específico
}

export const RITUALS: RitualDef[] = [
  /* ---------------- 1º CÍRCULO ---------------- */
  {
    name: 'Amaldiçoar Arma',
    circle: 1,
    elements: ['conhecimento', 'energia', 'morte', 'sangue'],
    summary: 'A arma alvo passa a causar dano paranormal adicional do elemento usado.',
  },
  {
    name: 'Compreensão Paranormal',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'Você entende qualquer linguagem escrita ou falada enquanto durar.',
  },
  {
    name: 'Enfeitiçar',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'O alvo passa a te tratar como um aliado prestativo.',
  },
  {
    name: 'Perturbação',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'Força o alvo a obedecer uma ordem simples de uma palavra.',
  },
  {
    name: 'Ouvir os Sussurros',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'Consulta vozes do Outro Lado para obter uma informação.',
  },
  {
    name: 'Tecer Ilusão',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'Cria uma pequena ilusão visual ou sonora.',
  },
  {
    name: 'Terceiro Olho',
    circle: 1,
    elements: ['conhecimento'],
    summary: 'Permite enxergar manifestações e rastros paranormais.',
  },
  {
    name: 'Amaldiçoar Tecnologia',
    circle: 1,
    elements: ['energia'],
    summary: 'Aprimora temporariamente um item tecnológico.',
  },
  {
    name: 'Coincidência Forçada',
    circle: 1,
    elements: ['energia'],
    summary: 'Manipula a sorte para dar bônus em um teste.',
  },
  {
    name: 'Eletrocussão',
    circle: 1,
    elements: ['energia'],
    summary: 'Uma descarga elétrica atinge o alvo, causando dano.',
  },
  {
    name: 'Embaralhar',
    circle: 1,
    elements: ['energia'],
    summary: 'Cria duplicatas ilusórias suas que confundem inimigos e aumentam sua Defesa.',
  },
  {
    name: 'Luz',
    circle: 1,
    elements: ['energia'],
    summary: 'Faz um objeto brilhar como uma lanterna.',
  },
  {
    name: 'Polarização Caótica',
    circle: 1,
    elements: ['energia'],
    summary: 'Atrai ou repele objetos metálicos conforme sua vontade.',
  },
  {
    name: 'Cicatrização',
    circle: 1,
    elements: ['morte'],
    summary: 'Acelera a regeneração de um ferimento (cura ao longo do tempo).',
  },
  {
    name: 'Consumir Manancial',
    circle: 1,
    elements: ['morte'],
    summary: 'Drena a vitalidade de seres próximos e concede PV temporários.',
  },
  {
    name: 'Decadência',
    circle: 1,
    elements: ['morte'],
    summary: 'Envelhece os órgãos internos do alvo, fazendo o corpo definhar.',
  },
  {
    name: 'Definhar',
    circle: 1,
    elements: ['morte'],
    summary: 'Deixa o alvo fatigado ou vulnerável.',
  },
  {
    name: 'Espirais da Perdição',
    circle: 1,
    elements: ['morte'],
    summary: 'Inimigos na área sofrem penalidade em testes de ataque.',
  },
  {
    name: 'Nuvem de Cinzas',
    circle: 1,
    elements: ['morte'],
    summary: 'Cria uma nuvem que concede camuflagem a quem estiver dentro.',
  },
  {
    name: 'Arma Atroz',
    circle: 1,
    elements: ['sangue'],
    summary: 'Uma arma corpo a corpo ganha bônus de ataque e margem de ameaça.',
  },
  {
    name: 'Armadura de Sangue',
    circle: 1,
    elements: ['sangue'],
    summary: 'Recobre o corpo com placas de sangue endurecido, aumentando a Defesa.',
  },
  {
    name: 'Corpo Adaptado',
    circle: 1,
    elements: ['sangue'],
    summary: 'Ignora frio e calor extremos e permite respirar debaixo d’água.',
  },
  {
    name: 'Distorcer Aparência',
    circle: 1,
    elements: ['sangue'],
    summary: 'Altera a aparência de um ou mais alvos.',
  },
  {
    name: 'Fortalecimento Sensorial',
    circle: 1,
    elements: ['sangue'],
    summary: 'Aguça seus sentidos e sua percepção.',
  },
  {
    name: 'Ódio Incontrolável',
    circle: 1,
    elements: ['sangue'],
    summary: 'Aumenta dano corpo a corpo e perícias físicas, mas impede calma e concentração.',
  },
  {
    name: 'Cinerária',
    circle: 1,
    elements: ['medo'],
    summary: 'Uma névoa que fortalece rituais conjurados dentro da área.',
  },

  /* ---------------- 2º CÍRCULO ---------------- */
  {
    name: 'Aprimorar Mente',
    circle: 2,
    elements: ['conhecimento'],
    summary: 'Concede bônus temporário em Intelecto ou Presença.',
  },
  {
    name: 'Detecção de Ameaças',
    circle: 2,
    elements: ['conhecimento'],
    summary: 'Detecta seres hostis e armadilhas na área.',
  },
  {
    name: 'Esconder dos Olhos',
    circle: 2,
    elements: ['conhecimento'],
    summary: 'Torna você invisível a olhos comuns por um tempo.',
  },
  {
    name: 'Invadir Mente',
    circle: 2,
    elements: ['conhecimento'],
    summary: 'Dispara uma rajada mental de dano ou estabelece conexão telepática.',
  },
  {
    name: 'Localização',
    circle: 2,
    elements: ['conhecimento'],
    summary: 'Indica a direção de um objeto ou ser conhecido.',
  },
  {
    name: 'Chamas do Caos',
    circle: 2,
    elements: ['energia'],
    summary: 'Permite controlar o fogo.',
  },
  {
    name: 'Contenção Fantasmagórica',
    circle: 2,
    elements: ['energia'],
    summary: 'Laços de energia prendem o alvo no lugar.',
  },
  {
    name: 'Dissonância Acústica',
    circle: 2,
    elements: ['energia'],
    summary: 'Cria uma área onde nenhum som pode ser ouvido.',
  },
  {
    name: 'Sopro do Caos',
    circle: 2,
    elements: ['energia'],
    summary: 'Move o ar de formas impossíveis (empurra, sustenta, sufoca).',
  },
  {
    name: 'Tela de Ruído',
    circle: 2,
    elements: ['energia'],
    summary: 'Cria uma película protetora que absorve dano.',
  },
  {
    name: 'Desacelerar Impacto',
    circle: 2,
    elements: ['morte'],
    summary: 'Reduz dano de queda e corta pela metade o dano de projéteis.',
  },
  {
    name: 'Eco Espiral',
    circle: 2,
    elements: ['morte'],
    summary: 'Repete, ao longo das rodadas, o dano que o alvo sofreu.',
  },
  {
    name: 'Paradoxo',
    circle: 2,
    elements: ['morte'],
    summary: 'Cria uma área de tempo paradoxal capaz de envelhecer corpo e alma.',
  },
  {
    name: 'Miasma Entrópico',
    circle: 2,
    elements: ['morte'],
    summary: 'Nuvem tóxica que enjoa e sufoca quem está dentro.',
  },
  {
    name: 'Velocidade Mortal',
    circle: 2,
    elements: ['morte'],
    summary: 'O alvo acelera no tempo e realiza ações adicionais.',
  },
  {
    name: 'Aprimorar Físico',
    circle: 2,
    elements: ['sangue'],
    summary: 'Concede bônus temporário em Agilidade ou Força.',
  },
  {
    name: 'Descarnar',
    circle: 2,
    elements: ['sangue'],
    summary: 'Dilacera a pele do alvo, abrindo cortes profundos (dano + sangramento).',
  },
  {
    name: 'Flagelo de Sangue',
    circle: 2,
    elements: ['sangue'],
    summary: 'Obriga o alvo a obedecer uma ordem sob pena de dano.',
  },
  {
    name: 'Hemofagia',
    circle: 2,
    elements: ['sangue'],
    summary: 'Absorve o sangue do alvo, causando dano e recuperando seus PV.',
  },
  {
    name: 'Transfusão Vital',
    circle: 2,
    elements: ['sangue'],
    summary: 'Transfere vida sua para curar outro ser instantaneamente.',
  },
  {
    name: 'Proteção contra Rituais',
    circle: 2,
    elements: ['medo'],
    summary: 'O alvo recebe resistência contra efeitos e criaturas paranormais.',
  },
  {
    name: 'Rejeitar Névoa',
    circle: 2,
    elements: ['medo'],
    summary: 'Enfraquece a conjuração de rituais na área.',
  },

  /* ---------------- 3º CÍRCULO ---------------- */
  {
    name: 'Alterar Memória',
    circle: 3,
    elements: ['conhecimento'],
    summary: 'Apaga ou modifica a memória recente do alvo.',
  },
  {
    name: 'Contato Paranormal',
    circle: 3,
    elements: ['conhecimento'],
    summary: 'Barganha com o Outro Lado para obter ajuda ou informação.',
  },
  {
    name: 'Mergulho Mental',
    circle: 3,
    elements: ['conhecimento'],
    summary: 'Infiltra-se na mente do alvo para vasculhar seus pensamentos.',
  },
  {
    name: 'Vidência',
    circle: 3,
    elements: ['conhecimento'],
    summary: 'Permite observar e escutar um alvo à distância.',
  },
  {
    name: 'Convocação Instantânea',
    circle: 3,
    elements: ['energia'],
    summary: 'Teletransporta um objeto previamente marcado para suas mãos.',
  },
  {
    name: 'Salto Fantasma',
    circle: 3,
    elements: ['energia'],
    summary: 'Teletransporta você e outros seres para um ponto dentro do alcance.',
  },
  {
    name: 'Transfigurar Água',
    circle: 3,
    elements: ['energia'],
    summary: 'Faz água e gelo se comportarem de forma caótica.',
  },
  {
    name: 'Transfigurar Terra',
    circle: 3,
    elements: ['energia'],
    summary: 'Faz rocha, lama e areia se comportarem de forma caótica.',
  },
  {
    name: 'Âncora Temporal',
    circle: 3,
    elements: ['morte'],
    summary: 'Impede o alvo de se afastar de um ponto fixo.',
  },
  {
    name: 'Poeira da Podridão',
    circle: 3,
    elements: ['morte'],
    summary: 'Nuvem de poeira que apodrece tudo que toca.',
  },
  {
    name: 'Tentáculos de Lodo',
    circle: 3,
    elements: ['morte'],
    summary: 'Tentáculos negros surgem na área para atacar e agarrar seres.',
  },
  {
    name: 'Zerar Entropia',
    circle: 3,
    elements: ['morte'],
    summary: 'Deixa o alvo lento ou paralisado.',
  },
  {
    name: 'Ferver Sangue',
    circle: 3,
    elements: ['sangue'],
    summary: 'Faz o sangue do alvo entrar em ebulição, causando dano e deixando-o fraco.',
  },
  {
    name: 'Forma Monstruosa',
    circle: 3,
    elements: ['sangue'],
    summary: 'Você assume a aparência e a forma de uma criatura monstruosa.',
  },
  {
    name: 'Purgatório',
    circle: 3,
    elements: ['sangue'],
    summary: 'Área de sangue que deixa alvos vulneráveis e fere quem tenta sair.',
  },
  {
    name: 'Vomitar Pestes',
    circle: 3,
    elements: ['sangue'],
    summary: 'Vomita um enxame de pequenas criaturas de Sangue.',
  },
  {
    name: 'Dissipar Ritual',
    circle: 3,
    elements: ['medo'],
    summary: 'Cancela os efeitos de rituais em um alvo ou área.',
  },

  /* ---------------- 4º CÍRCULO ---------------- */
  {
    name: 'Controle Mental',
    circle: 4,
    elements: ['conhecimento'],
    summary: 'A mente da vítima passa a ser controlada por outra pessoa.',
  },
  {
    name: 'Inexistir',
    circle: 4,
    elements: ['conhecimento'],
    summary: 'Você toca um alvo e o apaga completamente da existência.',
  },
  {
    name: 'Possessão',
    circle: 4,
    elements: ['conhecimento'],
    summary: 'Transfere sua consciência para o corpo do alvo.',
  },
  {
    name: 'Alterar Destino',
    circle: 4,
    elements: ['energia'],
    summary: 'Enxerga o futuro próximo e pode alterar o resultado de um teste.',
  },
  {
    name: 'Deflagração de Energia',
    circle: 4,
    elements: ['energia'],
    summary: 'Explosão de energia bruta que causa dano e afeta itens amaldiçoados.',
  },
  {
    name: 'Teletransporte',
    circle: 4,
    elements: ['energia'],
    summary: 'Teletransporta você e outros seres por longas distâncias.',
  },
  {
    name: 'Convocar o Algoz',
    circle: 4,
    elements: ['morte'],
    summary: 'Conjura o maior medo do alvo, que passa a persegui-lo e tentar matá-lo.',
  },
  {
    name: 'Distorção Temporal',
    circle: 4,
    elements: ['morte'],
    summary: 'Você age livremente enquanto o tempo fica quase parado por um instante.',
  },
  {
    name: 'Fim Inevitável',
    circle: 4,
    elements: ['morte'],
    summary: 'Abre uma ruptura no espaço que suga tudo ao redor.',
  },
  {
    name: 'Capturar o Coração',
    circle: 4,
    elements: ['sangue'],
    summary: 'Manipula as emoções e a vontade do alvo, tornando-o seu aliado.',
  },
  {
    name: 'Invólucro de Carne',
    circle: 4,
    elements: ['sangue'],
    summary: 'Cria um clone de carne e sangue com as mesmas estatísticas do alvo.',
  },
  {
    name: 'Vínculo de Sangue',
    circle: 4,
    elements: ['sangue'],
    summary: 'O alvo sofre todo o dano que você sofrer.',
  },
  {
    name: 'Canalizar o Medo',
    circle: 4,
    elements: ['medo'],
    trilhaOnly: true,
    summary: 'Transfere parte do seu poder paranormal para um alvo.',
  },
  {
    name: 'Conhecendo o Medo',
    circle: 4,
    elements: ['medo'],
    trilhaOnly: true,
    summary: 'Manifesta o Medo absoluto na mente do alvo.',
  },
  {
    name: 'Lâmina do Medo',
    circle: 4,
    elements: ['medo'],
    trilhaOnly: true,
    summary: 'Golpeia o alvo com uma lâmina feita de medo puro.',
  },
  {
    name: 'Medo Tangível',
    circle: 4,
    elements: ['medo'],
    trilhaOnly: true,
    summary: 'Concede a você uma série de imunidades.',
  },
  {
    name: 'Presença do Medo',
    circle: 4,
    elements: ['medo'],
    trilhaOnly: true,
    summary: 'Você assume uma forma impossível dentro da Realidade.',
  },
];

export const RITUALS_BY_CIRCLE: Record<RitualCircle, RitualDef[]> = {
  1: RITUALS.filter((r) => r.circle === 1),
  2: RITUALS.filter((r) => r.circle === 2),
  3: RITUALS.filter((r) => r.circle === 3),
  4: RITUALS.filter((r) => r.circle === 4),
};
