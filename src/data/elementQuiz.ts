// Teste de personalidade "qual elemento combina com você" — pro Meu Perfil
// (é sobre a PESSOA, não sobre uma ficha; diferente do "Elemento de
// Afinidade" que cada personagem escolhe na ficha a partir de NEX 50%).
//
// De propósito, as perguntas são sobre a vida/personalidade real da pessoa
// (fim de semana, decisões, discussões, medo bobo...), não sobre o
// paranormal em si — a ligação com cada elemento fica por baixo dos panos
// (Sangue = instinto/corpo/intensidade · Morte = frieza/aceitação/fim ·
// Energia = acaso/imprevisto/sorte · Conhecimento = curiosidade/análise ·
// Medo = vigilância/intensidade emocional guardada), então quem responde
// não fica "escolhendo o elemento" na cara, só respondendo sobre si mesmo.

import type { Element } from './ordem';

export interface QuizOption {
  text: string;
  element: Element;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export const ELEMENT_QUIZ: QuizQuestion[] = [
  {
    question: 'Num fim de semana livre, sem compromisso nenhum, você prefere...',
    options: [
      { text: 'Fazer alguma atividade física, gastar energia.', element: 'sangue' },
      { text: 'Ficar em casa, sozinho, no seu próprio ritmo.', element: 'morte' },
      { text: 'Topar um plano de última hora, sem programar nada.', element: 'energia' },
      { text: 'Aprender algo novo, ler, pesquisar sobre um assunto.', element: 'conhecimento' },
      { text: 'Assistir algo pesado e intenso, tipo um filme de terror.', element: 'medo' },
    ],
  },
  {
    question: 'Quando alguém te decepciona de verdade, o que costuma acontecer?',
    options: [
      { text: 'Eu reajo na hora — não guardo pra depois.', element: 'sangue' },
      { text: 'Desligo emocionalmente e sigo em frente, sem drama.', element: 'morte' },
      { text: 'Deixo passar rápido, não gosto de ficar remoendo.', element: 'energia' },
      { text: 'Fico analisando o que aconteceu, tento entender o porquê.', element: 'conhecimento' },
      { text: 'Guardo por dentro — mas não esqueço tão fácil.', element: 'medo' },
    ],
  },
  {
    question: 'Qual desses "medos bobos" (que todo mundo tem algum) mais combina com você?',
    options: [
      { text: 'Me machucar de verdade, sentir dor.', element: 'sangue' },
      { text: 'Perder alguém importante pra mim.', element: 'morte' },
      { text: 'Ficar preso numa rotina sem nenhum imprevisto.', element: 'energia' },
      { text: 'Não entender algo importante, ficar no escuro sobre isso.', element: 'conhecimento' },
      { text: 'Ficar sozinho no escuro, sem saber o que tem por perto.', element: 'medo' },
    ],
  },
  {
    question: 'Na hora de tomar uma decisão importante, como você funciona?',
    options: [
      { text: 'No instinto — confio no que sinto na hora.', element: 'sangue' },
      { text: 'Já aceitei que nem toda escolha tem volta, então eu sigo.', element: 'morte' },
      { text: 'Um pouco no impulso — gosto de me surpreender também.', element: 'energia' },
      { text: 'Pesquiso e penso bastante antes de decidir qualquer coisa.', element: 'conhecimento' },
      { text: 'Penso em tudo que pode dar errado antes de escolher.', element: 'medo' },
    ],
  },
  {
    question: 'O que te deixa mais confortável no dia a dia?',
    options: [
      { text: 'Estar em movimento, fazendo alguma coisa com as mãos.', element: 'sangue' },
      { text: 'Silêncio e rotina, sem muita novidade.', element: 'morte' },
      { text: 'Estar rodeado de gente, num lugar animado.', element: 'energia' },
      { text: 'Um lugar tranquilo pra pensar sozinho.', element: 'conhecimento' },
      { text: 'Um ambiente bem familiar, onde eu conheço cada canto.', element: 'medo' },
    ],
  },
  {
    question: 'Numa discussão (com amigo, família, quem for), você costuma ser aquele(a) que...',
    options: [
      { text: 'Fala o que pensa na hora, sem muito filtro.', element: 'sangue' },
      { text: 'Fica quieto até não dar mais, e aí encerra o assunto de vez.', element: 'morte' },
      { text: 'Tenta aliviar o clima, não gosta de climão.', element: 'energia' },
      { text: 'Traz fatos e argumentos, tenta convencer com lógica.', element: 'conhecimento' },
      { text: 'Observa tudo com atenção antes de falar qualquer coisa.', element: 'medo' },
    ],
  },
  {
    question: 'O que as pessoas mais próximas de você costumam notar primeiro?',
    options: [
      { text: 'Minha energia física — sempre fazendo alguma coisa.', element: 'sangue' },
      { text: 'Minha calma — quase nada me tira do sério.', element: 'morte' },
      { text: 'Meu bom humor e sorte com as coisas.', element: 'energia' },
      { text: 'Minha curiosidade por tudo, sempre perguntando.', element: 'conhecimento' },
      { text: 'Meu jeito intenso de olhar pras coisas.', element: 'medo' },
    ],
  },
  {
    question: 'Se sua vida fosse um filme, qual seria o clima dele?',
    options: [
      { text: 'Ação — sem tempo pra respirar.', element: 'sangue' },
      { text: 'Drama, com um final que faz pensar.', element: 'morte' },
      { text: 'Comédia, cheio de acaso e confusão.', element: 'energia' },
      { text: 'Suspense — tentando desvendar alguma coisa o filme inteiro.', element: 'conhecimento' },
      { text: 'Terror psicológico, tenso do início ao fim.', element: 'medo' },
    ],
  },
  {
    question: 'E o seu jeito de lidar com uma perda (de qualquer tipo — não precisa ser morte)?',
    options: [
      { text: 'Sinto tudo com muita intensidade, e depois passa.', element: 'sangue' },
      { text: 'Aceito rápido — sei que faz parte.', element: 'morte' },
      { text: 'Sigo em frente, não fico muito preso ao passado.', element: 'energia' },
      { text: 'Preciso entender o motivo pra conseguir aceitar de verdade.', element: 'conhecimento' },
      { text: 'Carrego por bastante tempo, mesmo sem mostrar muito.', element: 'medo' },
    ],
  },
  {
    question: 'Qual desses lugares combina mais com você?',
    options: [
      { text: 'Uma academia, uma trilha, qualquer lugar pra gastar energia.', element: 'sangue' },
      { text: 'Um cemitério antigo e tranquilo, sem ninguém por perto.', element: 'morte' },
      { text: 'Uma cidade grande, cheia de gente, luz e imprevisto.', element: 'energia' },
      { text: 'Uma biblioteca ou arquivo cheio de coisa pra descobrir.', element: 'conhecimento' },
      { text: 'Uma casa velha e abandonada — dá medo, mas também atrai.', element: 'medo' },
    ],
  },
  {
    question: 'Pra fechar: o que mais pesa quando você julga uma pessoa?',
    options: [
      { text: 'Se ela é de atitude, ou só de conversa.', element: 'sangue' },
      { text: 'Se ela é honesta, mesmo quando a verdade dói.', element: 'morte' },
      { text: 'Se ela é divertida de estar por perto.', element: 'energia' },
      { text: 'Se ela é inteligente, se tem o que ensinar.', element: 'conhecimento' },
      { text: 'Se ela é leal, mesmo quando ninguém tá vendo.', element: 'medo' },
    ],
  },
];
