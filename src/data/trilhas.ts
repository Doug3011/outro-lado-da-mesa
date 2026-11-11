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

  /* ---------------- Sobrevivendo ao Horror (suplemento) ---------------- */
  {
    classe: 'combatente',
    name: 'Agente Secreto',
    flavor: 'Trabalha sozinho ou em pequenos grupos a serviço de uma agência, com documentos que dão privilégios jurídicos especiais.',
    powers: [
      { nex: 10, name: 'Carteirada', summary: 'Treina (ou +2) em Diplomacia ou Enganação à escolha; recebe documentos falsos que garantem privilégios jurídicos (acesso a locais restritos, portar armas, autoridade de investigação) a cada missão, como item operacional sem espaço.' },
      { nex: 40, name: 'O Sorriso', summary: '+2 em Diplomacia e Enganação; ao falhar nessas perícias, gasta 2 PE pra repetir o teste (aceita o novo resultado), 1x/cena.' },
      { nex: 65, name: 'Método Investigativo', summary: 'Urgência de cenas de investigação aumenta em 1 rodada; gasta PE (2, +2 por uso adicional na cena) pra transformar um resultado da tabela de eventos de investigação em "sem evento".' },
      { nex: 99, name: 'Multifacetado', summary: '1x/cena, gasta 5 de Sanidade (só recupera no fim da missão) pra receber todas as habilidades até NEX 65% de uma trilha de combatente ou especialista à escolha até o fim da cena, sem repetir a mesma trilha na missão.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Caçador',
    flavor: 'Reúne informações sobre criaturas paranormais pra caçá-las metodicamente.',
    powers: [
      { nex: 10, name: 'Rastrear o Paranormal', summary: 'Treina (ou +2) em Sobrevivência; pode usar Sobrevivência no lugar de Ocultismo pra identificar criaturas, e no lugar de Investigação/Percepção pra achar rastros e pistas paranormais.' },
      { nex: 40, name: 'Estudar Fraquezas', summary: 'Com uma ação de interlúdio e uma pista sobre um ser específico, descobre uma informação útil sobre ele e ganha +1 em testes de perícia contra ele até o fim da missão (acumulável por pista).' },
      { nex: 65, name: 'Atacar das Sombras', summary: 'Sem penalidade de Furtividade ao se mover no deslocamento normal; penalidade por atacar na mesma rodada é reduzida com arma silenciosa; visibilidade inicial em cenas de furtividade começa 1 ponto mais baixa.' },
      { nex: 99, name: 'Estudar a Presa', summary: 'Ao usar Estudar Fraquezas, pode marcar o alvo como "presa" (só uma por vez): contra ele, +O em perícias, +1 na margem de ameaça e multiplicador de crítico, e resistência a dano 5.' },
    ],
  },
  {
    classe: 'combatente',
    name: 'Monstruoso',
    flavor: 'Desfigura e altera o próprio corpo pra deixar as Entidades invadirem com mais força, com um custo final: a partir de NEX 75% fica permanentemente perturbado e é caçado pela Ordem (equipamento 1 patente abaixo), e em NEX 99% a Sanidade cai pra 1 e enlouquecer o transforma numa criatura do Outro Lado. Ao escolher, define um elemento (Sangue, Morte, Conhecimento ou Energia) que dita os efeitos de cada poder.',
    powers: [
      { nex: 10, name: 'Ser Amaldiçoado', summary: '1x/dia precisa cumprir um ritual pessoal do elemento escolhido (ex. beber sangue, inalar cinzas, tatuar palavras de medo, levar choques) ou sofre fome e sede; cumprindo, ganha resistência a dano 5 e um benefício (faro, imunidade a fadiga, visão no escuro ou resistência adicional conforme o elemento) somando um atributo numa defesa, mas sofre –O em duas perícias ligadas ao elemento. Também treina (ou +2) em Ocultismo.' },
      { nex: 40, name: 'Ser Macabro', summary: 'Resistência do ritual pessoal sobe pra 10 e a penalidade de perícia cai pra –2O; ganha um benefício extra por elemento (cura por PE, +O em Intimidação, usar Intelecto em Enganação/esforço, ou dano extra de Energia por PE) e troca o atributo usado em pontos de esforço.' },
      { nex: 65, name: 'Ser Assustador', summary: 'Resistência sobe pra 15 e Presença cai –1 permanente; ganha mais um benefício por elemento (mordida natural, recuperar de estar morrendo, abrir mão de treino por dados de Intelecto, ou recarregar PE em fontes elétricas).' },
      { nex: 99, name: 'Ser Aterrorizante', summary: 'Efeitos do ritual pessoal viram permanentes e passa a contar como criatura paranormal; resistência sobe pra 20; ganha o benefício final do elemento (mordida curativa + ritual Forma Monstruosa, imortalidade + ritual Fim Inevitável, Percepção às Cegas + um ritual de Conhecimento de 4º círculo, ou voo/incorporeidade + ritual Deflagração de Energia), cada um com uma desvantagem associada.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Bibliotecário',
    flavor: 'Conhecimento vasto reunido de uma vida inteira de leitura é frequentemente a única solução pra situações desesperadoras.',
    powers: [
      { nex: 10, name: 'Conhecimento Prático', summary: 'Em testes de perícia (exceto Luta/Pontaria), gasta 2 PE pra trocar o atributo-base da perícia por Intelecto (custo –1 PE com Conhecimento Aplicado).' },
      { nex: 40, name: 'Leitor Contumaz', summary: 'O dado de bônus da ação de interlúdio ler sobe pra 1d8 e pode ser aplicado em qualquer perícia; gastando 2 PE no teste, o dado sobe pra 2d8.' },
      { nex: 65, name: 'Rato de Biblioteca', summary: 'Em ambiente cheio de livros, gasta minutos (ou 1 rodada em cena de investigação) pra ganhar os benefícios de ler ou revisar caso como ação de interlúdio, 1x/cena.' },
      { nex: 99, name: 'A Força do Saber', summary: 'Intelecto +1 e soma Intelecto ao total de PE; escolhe uma perícia qualquer e troca seu atributo-base por Intelecto.' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Perseverante',
    flavor: 'Sobreviveu a coisas que deveriam tê-lo matado — e tem certeza que sobreviverá de novo.',
    powers: [
      { nex: 10, name: 'Soluções Improvisadas', summary: 'Gasta 2 PE pra rolar de novo 1 dado de um teste recém-feito (1x por teste), ficando com o melhor resultado.' },
      { nex: 40, name: 'Fuga Obstinada', summary: '+O em perícia pra fugir de um inimigo; em cena de perseguição como presa, pode acumular até 4 falhas antes de ser pego (em vez do padrão).' },
      { nex: 65, name: 'Determinação Inquestionável', summary: '1x/cena, gasta 5 PE + ação padrão pra remover uma condição de medo, mental ou paralisia de si mesmo.' },
      { nex: 99, name: 'Só Mais um Passo...', summary: '1x/rodada, ao sofrer dano que reduziria PV a 0, gasta 5 PE pra ficar com 1 PV em vez disso (não funciona contra dano massivo).' },
    ],
  },
  {
    classe: 'especialista',
    name: 'Muambeiro',
    flavor: 'Sabe produzir ou achar o equipamento certo pra manter a equipe viva.',
    powers: [
      { nex: 10, name: 'Mascate', summary: 'Treina em uma Profissão (armeiro, engenheiro ou químico) à escolha; +5 na capacidade de carga; DT de fabricar item improvisado reduzida em –10 (em vez de –5).' },
      { nex: 40, name: 'Fabricação Própria', summary: 'Leva metade do tempo pra fabricar itens mundanos (2 munições/explosivos/consumíveis por ação de manutenção; 1 ação de manutenção pra armas/proteções/equipamento geral); não afeta itens modificados ou paranormais.' },
      { nex: 65, name: 'Laboratório de Campo', summary: 'Treina (ou +5 se já treinado) numa Profissão armeiro/engenheiro/químico; pode fabricar e consertar itens paranormais em campo, usando 3 ações de interlúdio não-consecutivas.' },
      { nex: 99, name: 'Achado Conveniente', summary: 'Gasta ação completa + 5 PE pra "produzir" um item de até categoria III (exceto paranormal), que some ao fim da cena.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Exorcista',
    flavor: 'Fé como escudo, palavras como espada — enfrenta o paranormal armado de crença, qualquer que seja sua religião.',
    powers: [
      { nex: 10, name: 'Revelação do Mal', summary: 'Treina (ou +2) em Religião; pode usar Religião no lugar de Investigação/Percepção pra notar seres, rastros e pistas paranormais, e no lugar de Ocultismo.' },
      { nex: 40, name: 'Poder da Fé', summary: 'Vira veterano em Religião (ou +O se já veterano); ao falhar um teste de resistência, gasta 2 PE pra repeti-lo usando Religião (aceita o novo resultado).' },
      { nex: 65, name: 'Parareligiosidade', summary: 'Ao conjurar um ritual, gasta +2 PE pra adicionar um efeito equivalente a um catalisador ritualístico à escolha.' },
      { nex: 99, name: 'Chagas da Resistência', summary: 'Quando a Sanidade cai a 0, pode gastar 10 PV pra ficar com Sanidade 1 em vez disso.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Possuído',
    flavor: 'O paranormal escolheu você antes mesmo de nascer — uma entidade cresce em seu interior e exige seguir o caminho dela.',
    powers: [
      { nex: 10, name: 'Poder Não Desejado', summary: 'Todo novo poder de ocultista que receberia vira Transcender em vez disso; ganha uma reserva de Pontos de Possessão (PP) = 3 + 2 por Transcender que possui, gastando até Presença de PP por turno (cada PP recupera 10 PV ou 2 PE) e recuperando 1 PP por ação de interlúdio dormir.' },
      { nex: 40, name: 'As Sombras Dentro de Mim', summary: 'Recuperação de PP sobe pra 2 por ação dormir; gasta 2 PE pra deixar a Entidade controlar os músculos por 1 rodada, dando +O em Acrobacia/Atletismo/Furtividade e reduzindo em –1 o aumento de visibilidade nessa rodada em cena de furtividade.' },
      { nex: 65, name: 'Ele Me Ensina', summary: 'Escolhe entre Transcender de novo ou ganhar o primeiro poder (NEX 10%) de uma trilha de ocultista que não a sua, cumprindo pré-requisitos.' },
      { nex: 99, name: 'Tornamo-nos Um', summary: 'Ganha um poder final conforme a afinidade elemental (1x/rodada, 6 PE, mesmo inconsciente, exceto o de Conhecimento que é 1x/cena e exige teste de Vontade): Sangue recupera 50 PV e troca bônus de perícia; Morte dá turno extra na última iniciativa da rodada; Conhecimento concede qualquer poder à escolha até o fim da cena; Energia teletransporta pra um ponto em alcance médio.' },
    ],
  },
  {
    classe: 'ocultista',
    name: 'Parapsicólogo',
    flavor: 'Expulso da academia por falar de paranormal, decidiu curar a mente sozinho — a diferença entre remédio e veneno é a dosagem. Só pode ser escolhida se o personagem for treinado em Profissão (psicólogo).',
    powers: [
      { nex: 10, name: 'Terapia', summary: 'Pode usar Profissão (psicólogo) como Diplomacia; 1x/rodada, quando você ou aliado em alcance curto falha um teste de resistência contra dano mental, gasta 2 PE pra usar Profissão (psicólogo) no lugar do teste (repetindo o poder, custo cai –1 PE e +2 na perícia).' },
      { nex: 40, name: 'Palavras-chave', summary: 'Ao passar num teste de perícia pra acalmar, pode gastar PE (até seu limite) pra recuperar 1 ponto de Sanidade (ou PD) de quem está sendo tratado por PE gasto.' },
      { nex: 65, name: 'Reprogramação Mental', summary: 'Gasta 5 PE + ação de interlúdio (o alvo também gasta a dele) pra manipular um voluntário em alcance curto: até o próximo interlúdio, ele ganha um poder geral, um poder da própria classe ou o 1º poder de uma trilha que não a dele (cumprindo pré-requisitos), achando que sempre teve esse poder.' },
      { nex: 99, name: 'A Sanidade Está Lá Fora', summary: 'Gasta ação de movimento + 5 PE pra remover todas as condições de medo/mentais de alguém adjacente, incluso você mesmo.' },
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
