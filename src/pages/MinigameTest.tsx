import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { rollExpression, rollOrdemTest, type OrdemTestResult } from '../domain/dice';
import { fileToDownscaledDataURL } from '../lib/image';
import {
  ATTRIBUTES,
  CLASS_BY_KEY,
  CLASSES,
  SKILL_BY_KEY,
  TRAINING_LEVELS,
  maxAttributeForNex,
  nexSteps,
  pePerTurn,
  type AttrKey,
  type ClassKey,
  type Training,
} from '../data/ordem';

// PROTÓTIPO EXPERIMENTAL — teste de combate do mini-jogo deckbuilder (ver
// memória do projeto: ideia anotada de um roguelike estilo Slay the
// Spire/Dicemancer usando as regras de Ordem Paranormal). Isolado de
// propósito, rota própria, sem sincronizar com sala nenhuma — só validar o
// FLUXO (criar ficha simplificada → iniciativa → ataque vs Defesa → dano) e
// o visual de referência (fundo + sprite do inimigo + carta), igual o
// Prototype3D.tsx foi o primeiro teste isolado da mesa 3D.
//
// Ficha simplificada: nome, aparência, classe, atributos e SÓ as perícias de
// combate (iniciativa, luta, pontaria, ocultismo, fortitude, vontade — as
// duas últimas pensadas pra resistir a efeitos de futuros inimigos, o Zumbi
// de Sangue ainda não usa nenhuma). Sem trilha, sem origem, sem sanidade —
// só PV e PE, exatamente como pedido. NEX fixo em 20% por enquanto (subiu de
// 10% — o usuário achou 10% baixo demais, quase impossível vencer o Zumbi de
// Sangue; a escalada "conforme passa de andar" é parte do loop maior do
// roguelike, ainda não existe aqui — por enquanto é uma luta só).
//
// Monstros: 4 variantes de zumbi de sangue (`MONSTERS`), todas de fichas
// REAIS do livro — Emergente (VD5), Zumbi de Sangue "base" (VD10), Dentado
// (VD15) e Espinhento (VD15). Sorteado um aleatoriamente a cada
// "Confirmar baralho" (início de uma luta nova) — ideia original do usuário:
// "cada inimigo é aleatório". Ações com múltiplos golpes (ex.: "Duas
// Garras") usam `attackCount` — cada golpe é uma rolagem de ataque+dano
// INDEPENDENTE (`resolveMonsterAttack` faz um loop). "Rasgar" (ação livre,
// em TODAS as variantes: +1D de dano de sangue em alvo machucado/sangrando)
// é bônus condicional aplicado por golpe que acerta, usando o TAMANHO DO
// DADO da própria ação (`dieSizeOf`) — não um "1d8" fixo, já que "+1D" no
// livro significa "mais um dado igual ao da arma", e cada ação tem um dado
// diferente. Percepção/Reflexos/deslocamento/"Presença Perturbadora" (dano
// mental — mexe com sanidade, que esse mini-jogo explicitamente NÃO tem) e
// "Percepção Sensorial" (imune a condições de sentido) do livro não entram
// no combate ainda. Resistência/vulnerabilidade também ficam guardadas mas
// sem lógica aplicada (nenhuma carta do jogador tem TIPO de dano definido
// ainda pra cruzar com isso). Sprite do "Zumbi de Sangue" base (VD10) ainda
// é o mesmo do Emergente (nenhuma imagem distinta chegou pra ele ainda).
//
// Mini-boss (VD 20, ainda NÃO ligado ao sorteio normal — usuário disse que
// aparece especificamente "na décima batalha", que é parte do loop de
// progressão por andares que esse protótipo ainda não tem — fica guardado
// em `ZUMBI_SANGUE_CHEFE` pra quando essa estrutura existir) e a mecânica de
// HORDA (o Emergente pode vir em grupo de até 3, jogador escolhe o alvo)
// também foram pedidos nessa mesma leva — horda ainda NÃO implementada
// (combate hoje só suporta 1 monstro por vez), é a próxima tarefa.
//
// Armas: dano de Manoplas/Fuzil de Assalto/Fuzil de Caça/Fuzil de Precisão/
// Metralhadora Leve/Metralhadora Pesada/Lança-chamas vieram direto do que o
// usuário passou (valores do livro). PLACEHOLDER ainda: o CUSTO EM PE de
// toda carta de arma (nenhum valor de PE foi dado ainda, só dano) e
// "Cicatrização" (cura — número totalmente inventado, ritual real ainda não
// conferido). "Soco" seguiu com 1d4 (arma "base" sem entrada própria na
// lista). Resto da lista de armas do usuário (martelo, maça, granada,
// machado/acha, arco, arco composto, bastão, bazuca, besta, cajado,
// corrente, espada, espingarda, faca, florete, katana, gadanho, lança,
// machadinha, machete, nunchaku, pistola, submetralhadora, revólver) ainda
// sem dano — perguntei ao usuário.
//
// Crítico/falha crítica (regra geral do sistema, `resolveDamageAttack`): 20
// natural no ataque SEMPRE acerta e dobra o dano (`atk.critical`,
// independente do total vs Defesa); 1 natural SEMPRE erra
// (`atk.fumble`), mesmo que o bônus fizesse o total bater a Defesa —
// aplicado tanto no jogador quanto no monstro. Lança-chamas tem uma falha
// crítica especial em cima disso (`fumbleBackfire`): em vez de só errar, a
// arma causa metade do próprio dano nela mesma em quem atacou (a chama
// "volta"). Note: com dado de ataque = 1 (atributo baixo), falha crítica
// exige o ÚNICO d20 sair 1; com vários dados (atributo alto, pega o maior),
// só falha se TODOS saírem 1 — fica astronomicamente raro, é assim que a
// regra de Ordem Paranormal favorece atributo alto de propósito.
//
// O ritual "Amaldiçoar Arma" (escolhe elemento + arma, escala pelo círculo
// de ritual desbloqueado — 1d6/2d6/4d6) continua fora de escopo por enquanto
// — é um BUFF permanente numa arma escolhida, não ataque/cura direto, e
// consome a carta do baralho pra sempre ao usar; precisa de um conceito de
// "círculo de ritual desbloqueado" que a ficha simplificada ainda não tem.
// Fica pra quando o resto da lista de cartas chegar.
//
// Rituais de DANO (kind:'ritual') — extraídos direto do PDF do livro básico
// (capítulo de Rituais, p.122-138). 7 até agora, cobrindo 4 dos 5 elementos
// (só falta Medo, cujas opções de dano no livro são todas trancadas atrás de
// trilha específica — fora de escopo por enquanto): **Sangue** — Descarnar,
// Hemofagia (com lifesteal), Ferver Sangue, Purgatório, Vomitar Pestes;
// **Energia** — Eletrocussão, Chamas do Caos, Transfigurar Terra (Amolecer);
// **Morte** — Paradoxo, Miasma Entrópico, Decadência, Eco Espiral, Poeira da
// Podridão, Convocar o Algoz; **Conhecimento** — Invadir Mente (Rajada
// Mental), Perturbação (Sofra), Tecer Ilusão (Verdadeira). 17 rituais de
// dano no total, cobrindo o capítulo inteiro do livro (1º ao 4º círculo) —
// Medo foi deixado de fora de propósito (pedido do usuário: "sem medo") já
// que aqueles rituais de dano de Medo são todos trava-por-poder-de-trilha.
//
// Mecânica é DIFERENTE de arma: no livro, quem ataca com ritual não rola
// "ataque vs Defesa" — em vez disso o ALVO faz um teste de resistência
// (Fortitude na maioria, mas Invadir Mente/Perturbação/Tecer Ilusão são por
// VONTADE, e Chamas do Caos/Vomitar Pestes/Transfigurar Terra são por
// REFLEXOS — daí o campo `saveSkill: 'fortitude'|'vontade'|'reflexos'` na
// carta, e `Monster` ganhou `vontadeDice`/`vontadeBonus` e
// `reflexosDice`/`reflexosBonus` além de `fortitudeDice`/`fortitudeBonus`;
// como as fichas que o usuário mandou não anotavam Reflexos à parte, os
// valores de Reflexos foram aproximados copiando os da Iniciativa de cada
// monstro — ambas vêm de Agilidade) contra uma DT calculada pelo conjurador
// (fórmula do livro, p.128: DT = 10 + [mesmo valor de pePerTurn(NEX), a
// tabela é a mesma] + Presença). Se o alvo passar no teste
// ("parcial"/"reduz à metade", todos os rituais escolhidos até agora são
// assim), sofre metade do dano; se falhar, sofre o dano cheio. Por isso não
// usa `resolveDamageAttack` (que é pro modelo "ataque vs Defesa" das armas)
// — tem resolução própria em `playCard`. Custo em PE = círculo do ritual
// (1º=1, 2º=2, 3º=3, 4º=4 — regra confirmada no livro).
// Hemorragia/dano contínuo/área/mecânicas de múltiplos turnos (grande parte
// dos rituais no livro afeta "todos na área", dura várias rodadas, ou exige
// setup como Eco Espiral e Convocar o Algoz) foi OMITIDO/SIMPLIFICADO —
// cada carta virou um golpe direto de único alvo/única rodada, pegando
// sempre o número de dano mais direto do texto do ritual (base, discente ou
// verdadeiro, o que tiver o efeito de dano mais simples de portar). Vai
// ficar mais relevante de verdade quando a horda (vários inimigos ao mesmo
// tempo) existir.
// Rituais só a classe Ocultista pode escolher no baralho (regra que o
// usuário deu lá no início da ideia do mini-jogo) — filtrado na oferta de
// cartas em `DeckSelect`, não uma trava dura no tipo. Além disso, pra
// Ocultista o peso de sorteio de cartas do tipo 'ritual' é multiplicado por
// `OCULTISTA_RITUAL_WEIGHT_BOOST` (pedido do usuário: "quando a ficha for de
// ocultista tem mais facilidade pra vir rituais") — reflete a afinidade da
// classe com o paranormal sem tornar as armas impossíveis de aparecer.
//
// RARIDADE: pedido do usuário — quanto mais dano a carta causa, mais rara é
// de aparecer na oferta de cartas pra escolher o baralho (não é sorteio
// dentro da luta, é só na hora de montar o baralho). 4 níveis
// (comum/incomum/rara/lendária) com peso decrescente numa amostragem sem
// reposição (`weightedSample`) — a oferta mostra OFFER_SIZE cartas do total
// disponível em `CARDS`, puxadas com viés pelas raridades, e a pessoa
// escolhe DECK_SIZE dessa oferta (não das cartas inteiras do jogo — então
// cartas lendárias podem nem aparecer numa oferta, de propósito).
//
// Baralho: no início da aventura, a pessoa escolhe DECK_SIZE cartas dentre
// todas as disponíveis (`CARDS`) — essas formam o baralho embaralhado da
// luta inteira. A MÃO mostra só HAND_SIZE cartas por vez, puxadas do
// baralho; jogar uma carta manda ela pra pilha de descarte e puxa uma nova
// na hora pra repor a mão ("fica rotacionando" — não é "descarta tudo e
// compra de novo só no próximo turno", é reposição imediata a cada jogada).
// Quando o baralho de compra esvazia, a pilha de descarte é embaralhada de
// volta nele (padrão de deckbuilder). Por turno, ainda pode jogar até
// MAX_CARDS_PER_TURN cartas (contanto que tenha PE), depois disso (ou
// clicando "Encerrar turno" antes) passa a vez — o monstro sempre faz só 1
// ação por turno, pra balancear.

const DECK_SIZE = 5;
const HAND_SIZE = 3;
const MAX_CARDS_PER_TURN = 3;
const OFFER_SIZE = 10;

export type Rarity = 'comum' | 'incomum' | 'rara' | 'lendaria';

const RARITY_WEIGHT: Record<Rarity, number> = { comum: 10, incomum: 5, rara: 2, lendaria: 1 };
// Multiplicador aplicado ao peso de sorteio de cartas 'ritual' quando a
// classe é Ocultista — ver comentário acima de `CARDS`.
const OCULTISTA_RITUAL_WEIGHT_BOOST = 2.5;
const RARITY_LABEL: Record<Rarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  rara: 'Rara',
  lendaria: 'Lendária',
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Amostragem sem reposição ponderada pelo peso de cada item — usada pra
// sortear a OFERTA de cartas (não a mão em combate): quanto maior o peso,
// mais chance de sair, mas nunca garantido (mesmo uma carta comum pode faltar
// numa oferta se o azar quiser).
function weightedSample<T>(items: T[], weightOf: (item: T) => number, count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length > 0 && out.length < count) {
    const weights = pool.map(weightOf);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Puxa `count` cartas do baralho de compra `deck`; se ele esvaziar no meio
// do caminho, embaralha a pilha de descarte `discard` e vira o novo baralho
// de compra antes de continuar. Devolve as cartas puxadas + os dois montes
// já atualizados (função pura — quem chama decide o que fazer com o resultado).
function drawCards(
  count: number,
  deck: CombatCard[],
  discard: CombatCard[],
): { drawn: CombatCard[]; deck: CombatCard[]; discard: CombatCard[] } {
  let d = [...deck];
  let disc = [...discard];
  const drawn: CombatCard[] = [];
  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break; // nada mais pra puxar (baralho+descarte vazios)
      d = shuffle(disc);
      disc = [];
    }
    drawn.push(d.shift()!);
  }
  return { drawn, deck: d, discard: disc };
}

const START_NEX = 20;
// BALANCEAMENTO (pedido do usuário): cada nó de Descanso sobe o NEX do
// personagem em 10% DE GRAÇA (não compete com Descansar/Evoluir Ritual —
// ver `applyRestNexGain`), o que sobe PV/PE máximos (mesma fórmula do jogo
// de verdade, `nexSteps`/`CLASS_BY_KEY[...].pvPerNex`) e dá 1 ponto de
// atributo + 1 de perícia pra distribuir, igual o jogo real dá em NEX
// 20/50/80/95 — só que aqui é a cada Descanso, não em marcos fixos, pra
// combinar com o ritmo do mapa. Isso fecha o buraco que o balanceamento
// anterior tinha deixado (monstro fica mais robusto com a profundidade,
// mas o jogador não crescia em NADA além do baralho).
const LEVEL_UP_NEX_STEP = 10;

const COMBAT_SKILL_KEYS = ['iniciativa', 'luta', 'pontaria', 'ocultismo', 'fortitude', 'vontade'] as const;
type CombatSkillKey = (typeof COMBAT_SKILL_KEYS)[number];

// Regra real (`domain/character.ts` deriveStats.maxAttribute): teto de
// atributo sobe pra 4 a partir de NEX 20%. E o "Aumento de Atributo" (NEX
// 20/50/80/95) dá +1 ponto extra além dos 9 da criação — como esse
// protótipo já nasce direto em NEX 20% (sem simular a subida 5→20 passo a
// passo), aproximei somando esse +1 ao orçamento de criação. O teto sobe
// de novo (pra 5) quando o NEX passa de 50% durante a run — ver
// `maxAttributeForNex`, reaproveitada da regra real do jogo.
const ATTR_BUDGET = 10;
const ATTR_MAX = 4;
// Regra real (`CharacterWizard.tsx`: skillBudget = classBase + INT + 2) —
// aqui não tem classBase (ficha simplificada, só 6 perícias de combate),
// então uso só o +2 fixo + INT. Antes disso era uma constante fixa (4) que
// IGNORAVA o atributo inteiro — bug reportado pelo usuário ("quanto mais
// intelecto mais perícias pode ser colocadas... aqui não tá funcionando").
const SKILL_BUDGET_BASE = 2;

function trainingIndex(t: Training): number {
  return TRAINING_LEVELS.findIndex((l) => l.value === t);
}

interface MinigameCharacter {
  name: string;
  appearance: string;
  classe: ClassKey;
  // NEX sobe durante a run (10% por nó de Descanso, ver `applyRestNexGain`)
  // — começa em START_NEX, nunca reseta (só cresce, igual o resto da run).
  nex: number;
  attributes: Record<AttrKey, number>;
  skills: Record<CombatSkillKey, Training>;
  // retrato opcional (data URL, mesmo esquema de `fileToDownscaledDataURL`
  // que a ficha de verdade já usa) — pedido do usuário pro HUD novo. Sem
  // foto, o HUD cai num ícone genérico (`GenericPortrait`), sem precisar
  // de asset novo nenhum.
  portrait?: string;
}

function deriveMinigameStats(classe: ClassKey, attributes: Record<AttrKey, number>, nex: number) {
  const c = CLASS_BY_KEY[classe];
  const steps = nexSteps(nex);
  return {
    pvMax: c.pvBase + attributes.VIG + c.pvPerNex * steps,
    peMax: c.peBase + attributes.PRE + c.pePerNex * steps,
    defense: 10 + attributes.AGI,
  };
}

interface MonsterAction {
  id: string;
  label: string;
  icon: string;
  attackDiceCount: number; // nº de d20 rolados, pega o maior (ex.: 2 pra "2d20+5")
  attackBonus: number;
  damageDice: string; // expressão pra rollExpression, ex.: "1d8+2"
  damageType: string;
  // "Duas Garras" etc. — a ação faz vários golpes independentes (cada um com
  // seu próprio teste de ataque e rolagem de dano). Default 1 se omitido.
  attackCount?: number;
}

interface Monster {
  name: string;
  vd: number;
  maxHp: number;
  defense: number;
  initiativeDiceCount: number; // nº de d20 da Iniciativa (= AGI da ficha)
  initiativeBonus: number;
  fortitudeDice: number; // pra resistir a rituais que pedem Fortitude
  fortitudeBonus: number;
  vontadeDice: number; // pra resistir a rituais que pedem Vontade (ex.: Invadir Mente)
  vontadeBonus: number;
  // pra resistir a rituais que pedem Reflexos (ex.: Vomitar Pestes). As fichas
  // que o usuário mandou não tinham esse valor anotado à parte — Reflexos e
  // Iniciativa são as duas baseadas em Agilidade, então aproximamos usando os
  // mesmos números da Iniciativa do monstro (é um protótipo, não a ficha 100%
  // oficial nesse campo específico).
  reflexosDice: number;
  reflexosBonus: number;
  resistances: Record<string, number>;
  vulnerabilities: string[];
  sprite: string;
  actions: MonsterAction[];
  // "Armadura de espinhos" (pedido do usuário, ideia tipo Thornmail de
  // LoL): acertar esse monstro com uma carta de ATAQUE do tipo indicado
  // reflete de volta uma fração do dano causado — só o Zumbi Espinhento usa
  // isso por enquanto (faz sentido com o nome/aparência dele). Só afeta
  // cartas 'attack' (têm `damageType`); rituais não acionam.
  thorns?: { againstType: 'Balístico' | 'Impacto' | 'Energia'; fraction: number };
}

// Extrai o tamanho do PRIMEIRO dado de uma expressão de dano ("1d10+2" → 10)
// — usado pra Rasgar, cujo "+1D" no livro significa "mais um dado do MESMO
// tamanho do dano da própria ação", não um valor fixo.
function dieSizeOf(dice: string): number {
  const m = /d(\d+)/.exec(dice);
  return m ? parseInt(m[1], 10) : 6;
}

// 4 variantes de zumbi de sangue, todas da ficha real do livro (VD crescente).
// Sorteada aleatoriamente uma por luta (`MONSTERS`, ver mais abaixo) — igual
// à ideia original do usuário ("cada inimigo é aleatório").
const ZUMBI_EMERGENTE: Monster = {
  name: 'Zumbi de Sangue Emergente',
  vd: 5,
  maxHp: 45,
  defense: 15,
  initiativeDiceCount: 1,
  initiativeBonus: 5,
  fortitudeDice: 1,
  fortitudeBonus: 0,
  vontadeDice: 1,
  vontadeBonus: 5,
  reflexosDice: 1,
  reflexosBonus: 5,
  resistances: { Sangue: 2 },
  vulnerabilities: ['Morte'],
  sprite: '/minigame/zumbi-sangue-idle.png',
  actions: [
    {
      id: 'garrada',
      label: 'Garrada',
      icon: '🩸',
      attackDiceCount: 2,
      attackBonus: 5,
      // BALANCEAMENTO (usuário: "o segundo inimigo me deu hit kill" — dano
      // de monstro reduzido de forma geral nesta leva): era 1d8+2.
      damageDice: '1d6+2',
      damageType: 'Sangue',
    },
  ],
};

const ZUMBI_BASE: Monster = {
  name: 'Zumbi de Sangue',
  vd: 10,
  maxHp: 60,
  defense: 18,
  initiativeDiceCount: 2,
  initiativeBonus: 5,
  fortitudeDice: 1,
  fortitudeBonus: 5,
  vontadeDice: 1,
  vontadeBonus: 5,
  reflexosDice: 2,
  reflexosBonus: 5,
  resistances: { Balístico: 2, Corte: 2, Impacto: 2, Perfuração: 2, Sangue: 2 },
  vulnerabilities: ['Morte'],
  // sem sprite próprio ainda (o usuário só mandou ficha, sem imagem
  // distinta) — reaproveita o do Emergente até chegar um sprite dedicado.
  sprite: '/minigame/zumbi-sangue-idle.png',
  actions: [
    {
      id: 'duas-garras',
      label: 'Duas Garras',
      icon: '🩸',
      attackDiceCount: 2,
      attackBonus: 5,
      // BALANCEAMENTO: era 1d10+2, depois 1d8+2 — usuário ainda levou hit
      // kill de um inimigo cedo na run, cortado mais uma vez pra 1d6+2 (dois
      // golpes = até 16 em vez de 20, média 11 em vez de 13). É o zumbi VD10
      // que já pode aparecer na 1ª luta do mapa, dano tem que ser contido.
      damageDice: '1d6+2',
      damageType: 'Sangue',
      attackCount: 2,
    },
  ],
};

const ZUMBI_DENTADO: Monster = {
  name: 'Zumbi de Sangue Dentado',
  vd: 15,
  maxHp: 60,
  defense: 18,
  initiativeDiceCount: 3,
  initiativeBonus: 5,
  fortitudeDice: 1,
  fortitudeBonus: 10,
  vontadeDice: 1,
  vontadeBonus: 5,
  reflexosDice: 3,
  reflexosBonus: 5,
  resistances: { Balístico: 5, Corte: 5, Impacto: 5, Perfuração: 5, Sangue: 5 },
  vulnerabilities: ['Morte'],
  sprite: '/minigame/zumbi-sangue-dentado.png',
  actions: [
    {
      id: 'duas-garras',
      label: 'Duas Garras',
      icon: '🩸',
      attackDiceCount: 2,
      attackBonus: 5,
      // BALANCEAMENTO: era 1d10+2 — reduzido pra 1d8+2 (dois golpes = até
      // 20 em vez de 24). Dentado é Elite (só a partir da fileira 2), então
      // continua batendo mais forte que os zumbis normais de propósito.
      damageDice: '1d8+2',
      damageType: 'Sangue',
      attackCount: 2,
    },
    {
      id: 'mordida-voraz',
      label: 'Mordida Voraz',
      icon: '🦷',
      attackDiceCount: 1,
      attackBonus: 5,
      // BALANCEAMENTO: era 2d12+2 (até 26 num golpe só) — reduzido pra 2d8+2 (até 18).
      damageDice: '2d8+2',
      damageType: 'Sangue',
    },
  ],
};

const ZUMBI_ESPINHENTO: Monster = {
  name: 'Zumbi de Sangue Espinhento',
  vd: 15,
  maxHp: 60,
  defense: 20,
  initiativeDiceCount: 3,
  initiativeBonus: 10,
  fortitudeDice: 1,
  fortitudeBonus: 5,
  vontadeDice: 1,
  vontadeBonus: 5,
  reflexosDice: 3,
  reflexosBonus: 10,
  resistances: { Balístico: 2, Corte: 2, Impacto: 2, Sangue: 2 },
  vulnerabilities: ['Morte'],
  sprite: '/minigame/zumbi-sangue-ataque.png',
  // "Armadura de espinhos" (pedido do usuário, tipo Thornmail de LoL): ele
  // não precisa bater tão forte (dano reduzido abaixo, igual os outros)
  // porque acertar ele com dano de Impacto (Soco, Manoplas) devolve 30% do
  // dano causado — pune quem insiste em arma de porrada nele especificamente.
  thorns: { againstType: 'Impacto', fraction: 0.3 },
  actions: [
    {
      id: 'duas-garras-espinhentas',
      label: 'Duas Garras Espinhentas',
      icon: '🩸',
      attackDiceCount: 2,
      attackBonus: 5,
      // BALANCEAMENTO: era 3d4+2 — reduzido pra 2d4+2 por golpe.
      damageDice: '2d4+2',
      damageType: 'Sangue',
      attackCount: 2,
    },
    {
      id: 'mordida-espinhenta',
      label: 'Mordida Espinhenta',
      icon: '🦷',
      attackDiceCount: 3,
      attackBonus: 5,
      // BALANCEAMENTO: era 6d4+2 (até 26 num golpe só) — reduzido pra 4d4+2.
      damageDice: '4d4+2',
      damageType: 'Sangue',
    },
  ],
};

const MONSTERS: Monster[] = [ZUMBI_EMERGENTE, ZUMBI_BASE, ZUMBI_DENTADO, ZUMBI_ESPINHENTO];

// Mini-boss (VD 20) — usuário disse que aparece especificamente "na décima
// batalha" (progressão por andar que esse protótipo ainda não tem) — por
// isso NÃO entra em `MONSTERS` (o sorteio aleatório de todo combate normal)
// ainda. Sprite: a imagem que o usuário mandou junto dessa ficha não chegou
// nos arquivos desta sessão a tempo de eu copiar — usando o sprite do
// Emergente como placeholder até ele reenviar.
const ZUMBI_SANGUE_CHEFE: Monster = {
  name: 'Zumbi de Sangue (Chefe)',
  vd: 20,
  maxHp: 45,
  defense: 17,
  initiativeDiceCount: 2,
  initiativeBonus: 5,
  fortitudeDice: 2,
  fortitudeBonus: 5,
  vontadeDice: 2,
  vontadeBonus: 5,
  reflexosDice: 2,
  reflexosBonus: 5,
  resistances: { Balístico: 5, Impacto: 5, Perfuração: 5, Sangue: 10 },
  vulnerabilities: ['Morte'],
  sprite: '/minigame/zumbi-sangue-idle.png',
  actions: [
    {
      id: 'agredir',
      label: 'Agredir (Garras)',
      icon: '🩸',
      attackDiceCount: 2,
      attackBonus: 5,
      // BALANCEAMENTO: era 1d6+5 — reduzido pra 1d4+4 por golpe (o PV dele
      // já escala bastante com a profundidade do mapa, não precisa bater
      // tão forte também).
      damageDice: '1d4+4',
      damageType: 'Corte',
      attackCount: 2,
    },
  ],
};
void ZUMBI_SANGUE_CHEFE; // ainda não usado em lugar nenhum — ver comentário acima

// Tier de evolução de uma carta (nó de Descanso) — genérico o bastante pra
// servir arma E ritual (pedido do usuário: "dar upgrade nas armas da mesma
// forma que nos rituais"). Rituais usam os nomes do livro (Base/Discente/
// Verdadeiro); armas usam nomenclatura de equipamento (Padrão/Modificada/
// Lendária, ecoando o sistema real de "modificações" que aumentam categoria
// do item). `saveSkill` só é preenchido em tiers de ritual (raríssimo mudar
// de perícia de resistência entre tiers, mas o campo existe pra isso).
interface CardTier {
  label: string;
  peCost: number;
  damageDice: string;
  saveSkill?: 'fortitude' | 'vontade' | 'reflexos';
}

type CombatCard =
  | {
      id: string;
      name: string;
      icon: string;
      peCost: number;
      rarity: Rarity;
      requiresClass?: ClassKey;
      kind: 'attack';
      attackSkill: CombatSkillKey; // qual perícia (e o atributo dela) rola o ataque
      damageDice: string;
      // tipo de dano (pra resistência/vulnerabilidade E pra mecânicas como o
      // reflexo de dano do Zumbi Espinhento — ver `Monster.thorns`).
      damageType: 'Balístico' | 'Impacto' | 'Energia';
      // falha crítica (1 natural) especial dessa arma: em vez de só errar, o
      // dano dela (metade, arredondado pra cima) volta pra quem atacou — ex.:
      // lança-chamas, a chama vira pro atirador. Crítico (20 natural) já é
      // regra geral do motor (dobra o dano), não precisa de campo por carta.
      fumbleBackfire?: boolean;
      description: string;
      // mesmo esquema de tier que os rituais têm (ver `CardTier`) — arma
      // começa mais fraca que antes (pedido de balanceamento) e recupera (e
      // supera) o dano antigo conforme evolui em nós de Descanso.
      baseId?: string;
      tiers: CardTier[];
    }
  | {
      id: string;
      name: string;
      icon: string;
      peCost: number;
      rarity: Rarity;
      requiresClass?: ClassKey;
      // Esquiva (pedido do usuário: "tipo esquiva comum 1d10, essa esquiva é
      // somada na sua defesa por um turno"). Joga no clique (não mira o
      // inimigo), rola `dodgeDice` e soma o resultado à Defesa efetiva só
      // pro PRÓXIMO ataque do monstro — consumido e zerado em
      // `resolveMonsterAttack` independente de acertar ou errar.
      kind: 'dodge';
      dodgeDice: string;
      description: string;
    }
  | {
      id: string;
      name: string;
      icon: string;
      peCost: number;
      rarity: Rarity;
      requiresClass?: ClassKey;
      kind: 'heal';
      healDice: string;
      description: string;
    }
  | {
      id: string;
      name: string;
      icon: string;
      peCost: number;
      rarity: Rarity;
      requiresClass?: ClassKey;
      kind: 'ritual';
      // só presente em cópias duplicadas ganhas de Tesouro/Desconhecido (o
      // `id` delas leva um sufixo tipo "#2" só pra servir de `key` única no
      // React) — aponta pro `id` original, que é a chave usada em
      // `cardTiers` (evoluir uma cópia evolui todas, é o mesmo ritual/arma).
      baseId?: string;
      element: string;
      // o ALVO (não quem conjura) testa Fortitude, Vontade ou Reflexos
      // (depende do ritual) contra a DT do conjurador — oposto do modelo de
      // arma. Todos os rituais escolhidos são "reduz à metade"/"parcial":
      // passa = metade do dano, falha = dano cheio.
      saveSkill: 'fortitude' | 'vontade' | 'reflexos';
      damageDice: string;
      lifestealFraction?: number; // Hemofagia: cura o conjurador nessa fração do dano causado
      description: string;
      // Evolução do ritual (nós de Descanso no mapa): Base → Discente →
      // Verdadeiro, igual o livro descreve — só que cada ritual só ganha um
      // tier a mais quando o livro dá uma versão "mesmo golpe, dado maior"
      // pro efeito de alvo único que a gente já implementa (quando a
      // evolução do livro muda a FORMA do efeito — vira autobuff, exige
      // ataque corpo a corpo, vira multialvo sem aumentar o dano etc — esse
      // tier fica de fora). tiers[0] sempre espelha os campos acima
      // (peCost/damageDice/saveSkill de cima = tiers[0], por conveniência
      // de exibição só). O tier ATUAL de cada carta mora fora dela, em
      // `cardTiers` (ver comentário lá) — não aqui.
      tiers: CardTier[];
    };

// BALANCEAMENTO (usuário: "diminuir os danos das armas, assim podendo dar
// upgrade nas armas da mesma forma que nos rituais"): toda arma teve o dano
// BASE reduzido e ganhou `tiers` (evoluível em nó de Descanso, igual
// ritual) — o tier do meio geralmente já recupera o dano antigo, e o
// último tier supera. Nomenclatura de tier própria pra arma (não é do
// livro como a dos rituais): Padrão → Modificada → Lendária, ecoando o
// sistema real de "modificações" de equipamento que aumentam categoria.
const CARDS: CombatCard[] = [
  {
    id: 'soco',
    name: 'Soco',
    icon: '👊',
    peCost: 0,
    rarity: 'comum',
    kind: 'attack',
    attackSkill: 'luta',
    damageDice: '1d4',
    damageType: 'Impacto',
    description: 'Ataque desarmado corpo a corpo. Testa Luta contra a Defesa do alvo; se acertar, causa 1d4.',
    tiers: [
      { label: 'Padrão', peCost: 0, damageDice: '1d4' },
      { label: 'Modificada', peCost: 1, damageDice: '1d6' },
      { label: 'Lendária', peCost: 2, damageDice: '1d8' },
    ],
  },
  {
    id: 'metralhadora-leve',
    name: 'Metralhadora Leve',
    icon: '🔫',
    peCost: 1,
    rarity: 'incomum',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '2d6',
    damageType: 'Balístico',
    description: 'Arma de fogo automática. Testa Pontaria contra a Defesa do alvo; se acertar, causa 2d6.',
    tiers: [
      { label: 'Padrão', peCost: 1, damageDice: '2d6' },
      { label: 'Modificada', peCost: 2, damageDice: '3d6' },
      { label: 'Lendária', peCost: 3, damageDice: '4d6' },
    ],
  },
  {
    id: 'metralhadora-pesada',
    name: 'Metralhadora Pesada',
    icon: '🔫',
    peCost: 2,
    rarity: 'incomum',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '2d8',
    damageType: 'Balístico',
    description: 'Arma de fogo automática pesada. Testa Pontaria contra a Defesa do alvo; se acertar, causa 2d8.',
    tiers: [
      { label: 'Padrão', peCost: 2, damageDice: '2d8' },
      { label: 'Modificada', peCost: 3, damageDice: '2d10' },
      { label: 'Lendária', peCost: 4, damageDice: '2d12' },
    ],
  },
  {
    id: 'manoplas',
    name: 'Manoplas',
    icon: '🥊',
    peCost: 1,
    rarity: 'rara',
    kind: 'attack',
    attackSkill: 'luta',
    damageDice: '2d6+2d8',
    damageType: 'Impacto',
    description:
      'Manoplas de combate. Testa Luta contra a Defesa do alvo; se acertar, causa 2d6 de impacto + 2d8 de energia.',
    tiers: [
      { label: 'Padrão', peCost: 1, damageDice: '2d6+2d8' },
      { label: 'Modificada', peCost: 2, damageDice: '2d8+2d10' },
      { label: 'Lendária', peCost: 3, damageDice: '2d10+2d12' },
    ],
  },
  {
    id: 'fuzil-assalto',
    name: 'Fuzil de Assalto',
    icon: '🔫',
    peCost: 1,
    rarity: 'incomum',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '2d8',
    damageType: 'Balístico',
    description: 'Arma de fogo tática. Testa Pontaria contra a Defesa do alvo; se acertar, causa 2d8.',
    tiers: [
      { label: 'Padrão', peCost: 1, damageDice: '2d8' },
      { label: 'Modificada', peCost: 2, damageDice: '2d10' },
      { label: 'Lendária', peCost: 3, damageDice: '2d12' },
    ],
  },
  {
    id: 'fuzil-caca',
    name: 'Fuzil de Caça',
    icon: '🔫',
    peCost: 1,
    rarity: 'incomum',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '2d6',
    damageType: 'Balístico',
    description: 'Arma de fogo tática. Testa Pontaria contra a Defesa do alvo; se acertar, causa 2d6.',
    tiers: [
      { label: 'Padrão', peCost: 1, damageDice: '2d6' },
      { label: 'Modificada', peCost: 2, damageDice: '2d8' },
      { label: 'Lendária', peCost: 3, damageDice: '2d10' },
    ],
  },
  {
    id: 'fuzil-precisao',
    name: 'Fuzil de Precisão',
    icon: '🎯',
    peCost: 2,
    rarity: 'incomum',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '2d8',
    damageType: 'Balístico',
    description: 'Arma de fogo pesada. Testa Pontaria contra a Defesa do alvo; se acertar, causa 2d8.',
    tiers: [
      { label: 'Padrão', peCost: 2, damageDice: '2d8' },
      { label: 'Modificada', peCost: 3, damageDice: '3d8' },
      { label: 'Lendária', peCost: 4, damageDice: '4d8' },
    ],
  },
  {
    id: 'lanca-chamas',
    name: 'Lança-chamas',
    icon: '🔥',
    peCost: 2,
    rarity: 'lendaria',
    kind: 'attack',
    attackSkill: 'pontaria',
    damageDice: '4d6',
    damageType: 'Energia',
    fumbleBackfire: true,
    description:
      'Arma incendiária. Testa Pontaria contra a Defesa do alvo; se acertar, causa 4d6. Crítico dobra o dano. Em falha crítica, a chama volta pra você: metade do dano.',
    tiers: [
      { label: 'Padrão', peCost: 2, damageDice: '4d6' },
      { label: 'Modificada', peCost: 4, damageDice: '6d6' },
      { label: 'Lendária', peCost: 6, damageDice: '8d6' },
    ],
  },
  {
    id: 'cicatrizacao',
    name: 'Cicatrização',
    icon: '💉',
    peCost: 1,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'heal',
    healDice: '2d8',
    description: 'Ritual de cura (Morte, 1º círculo). Recupera 2d8 de PV.',
  },
  // Rituais de dano — extraídos do livro (ver comentário no topo do arquivo).
  // O ALVO testa Fortitude contra a DT do conjurador; passa = metade do
  // dano, falha = dano cheio. Só a classe Ocultista pode escolher.
  {
    id: 'eletrocussao',
    name: 'Eletrocussão',
    icon: '⚡',
    peCost: 1,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Energia',
    saveSkill: 'fortitude',
    damageDice: '3d6',
    description:
      'Ritual (Energia, 1º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 3d6 de dano de eletricidade; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '3d6' },
      { label: 'Discente', peCost: 3, damageDice: '6d6' },
      { label: 'Verdadeiro', peCost: 6, damageDice: '8d6' },
    ],
  },
  {
    id: 'descarnar',
    name: 'Descarnar',
    icon: '🩹',
    // BALANCEAMENTO (pedido do usuário: "rituais com mais de 18 de dano no
    // início, diminua e coloque upgrade pra recuperar depois aumentar, que
    // nem as armas"): 6d8=27 de média era mais que o dobro do teto pedido.
    // Base novo reduzido, Discente RECUPERA o valor antigo (6d8), Verdadeiro
    // é o Discente antigo (10d8) — mesmo padrão de 3 tiers das armas.
    peCost: 1,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Sangue',
    saveSkill: 'fortitude',
    damageDice: '3d8',
    description:
      'Ritual (Sangue, 2º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 3d8 de dano (metade corte, metade Sangue); se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '3d8' },
      { label: 'Discente', peCost: 2, damageDice: '6d8' },
      { label: 'Verdadeiro', peCost: 5, damageDice: '10d8' },
    ],
  },
  {
    id: 'hemofagia',
    name: 'Hemofagia',
    icon: '🧛',
    // BALANCEAMENTO: 6d6=21 de média (+lifesteal) passou do teto. Base
    // reduzido, Discente recupera o valor antigo — sem Verdadeiro (o livro
    // não tem versão maior de alvo único pra esse ritual, Discente/
    // Verdadeiro reais mudam a FORMA do efeito, não aumentam o golpe único).
    peCost: 1,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Sangue',
    saveSkill: 'fortitude',
    damageDice: '3d6',
    lifestealFraction: 0.5,
    description:
      'Ritual (Sangue, 2º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 3d6 de dano de Sangue (metade se resistir) — você recupera metade do dano causado em PV.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '3d6' },
      { label: 'Discente', peCost: 2, damageDice: '6d6' },
    ],
  },
  {
    id: 'ferver-sangue',
    name: 'Ferver Sangue',
    icon: '🔥',
    // BALANCEAMENTO: 4d8=18 de média batia bem no teto — Base reduzido,
    // Discente recupera o valor antigo. Sem Verdadeiro (o do livro muda o
    // alvo pra "seres escolhidos" sem aumentar o dano — não ajuda 1 inimigo só).
    peCost: 2,
    rarity: 'rara',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Sangue',
    saveSkill: 'fortitude',
    damageDice: '3d8',
    description:
      'Ritual (Sangue, 3º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 3d8 de dano de Sangue; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '3d8' },
      { label: 'Discente', peCost: 3, damageDice: '4d8' },
    ],
  },
  {
    id: 'invadir-mente',
    name: 'Invadir Mente (Rajada Mental)',
    icon: '🧠',
    // BALANCEAMENTO: 6d6=21 de média passou do teto — Base reduzido,
    // Discente recupera o valor antigo, Verdadeiro é o Discente antigo
    // (Discente e Verdadeiro reais dão o MESMO número no livro — 10d6 — a
    // diferença é multialvo, sem ganho contra 1 inimigo; uso os 2 nomes só
    // pra manter a progressão de 3 tiers igual as outras cartas).
    peCost: 1,
    rarity: 'rara',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Conhecimento',
    saveSkill: 'vontade', // esse aqui é diferente — resiste por Vontade, não Fortitude
    damageDice: '3d6',
    description:
      'Ritual (Conhecimento, 2º círculo). O alvo testa Vontade contra sua DT; se falhar, sofre 3d6 de dano mental; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '3d6' },
      { label: 'Discente', peCost: 2, damageDice: '6d6' },
      { label: 'Verdadeiro', peCost: 5, damageDice: '10d6' },
    ],
  },
  {
    id: 'paradoxo',
    name: 'Paradoxo',
    icon: '🌀',
    // BALANCEAMENTO: 6d6=21 de média passou do teto — Base reduzido,
    // Discente recupera o valor antigo (o do livro pula o Discente real —
    // vira versão menor/móvel — uso o nome só pra manter os 3 tiers),
    // Verdadeiro é o mesmo de sempre (único que aumenta o dano no livro).
    peCost: 1,
    rarity: 'rara',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    damageDice: '3d6',
    description:
      'Ritual (Morte, 2º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 3d6 de dano de Morte; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '3d6' },
      { label: 'Discente', peCost: 2, damageDice: '6d6' },
      { label: 'Verdadeiro', peCost: 9, damageDice: '13d6' },
    ],
  },
  {
    id: 'miasma-entropico',
    name: 'Miasma Entrópico',
    icon: '☠️',
    // BALANCEAMENTO: 4d8=18 batia no teto — Base reduzido, Discente recupera
    // o valor antigo, Verdadeiro é o Discente antigo (mesmo padrão de 3
    // tiers das armas).
    peCost: 1,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    damageDice: '2d8',
    description:
      'Ritual (Morte, 2º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 2d8 de dano químico; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '2d8' },
      { label: 'Discente', peCost: 2, damageDice: '4d8' },
      { label: 'Verdadeiro', peCost: 5, damageDice: '6d8' },
    ],
  },
  {
    id: 'decadencia',
    name: 'Decadência',
    icon: '🥀',
    peCost: 1,
    rarity: 'comum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    damageDice: '2d8+2',
    description:
      'Ritual (Morte, 1º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 2d8+2 de dano de Morte; se resistir, metade.',
    // pula o Discente (vira ataque corpo a corpo) — vai direto pro Verdadeiro.
    tiers: [
      { label: 'Base', peCost: 1, damageDice: '2d8+2' },
      { label: 'Verdadeiro', peCost: 6, damageDice: '8d8+8' },
    ],
  },
  {
    id: 'perturbacao-sofra',
    name: 'Perturbação (Sofra)',
    icon: '😣',
    // CORRIGIDO em leva anterior: "Sofra" é o comando adicional da versão
    // DISCENTE (+2 PE sobre o 1 PE base). 1(base)+2(discente)=3.
    // BALANCEAMENTO desta leva: 5d8=22,5 de média passou do teto — Base
    // reduzido, Discente recupera o valor de 5d8. Sem Verdadeiro (troca o
    // "Sofra" pelo comando "Ataque" no livro — não é golpe maior no mesmo alvo).
    peCost: 2,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Conhecimento',
    saveSkill: 'vontade',
    damageDice: '3d8',
    description:
      'Ritual (Conhecimento, 1º círculo, comando "Sofra" da versão discente). O alvo testa Vontade contra sua DT; se falhar, sofre dor aguda: 3d8 de dano de Conhecimento; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '3d8' },
      { label: 'Discente', peCost: 3, damageDice: '5d8' },
    ],
  },
  {
    id: 'chamas-do-caos',
    name: 'Chamas do Caos',
    icon: '🔥',
    // CORRIGIDO em leva anterior: a "labareda" com teste de Reflexos só
    // existe na versão DISCENTE (+3 PE sobre os 2 PE base). 2+3=5.
    // BALANCEAMENTO desta leva: 6d6=21 de média passou do teto — Base
    // reduzido, Discente recupera o valor de 6d6, Verdadeiro é o mesmo de sempre.
    peCost: 3,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Energia',
    saveSkill: 'reflexos',
    damageDice: '3d6',
    description:
      'Ritual (Energia, 2º círculo, versão discente). Você projeta uma labareda; o alvo testa Reflexos contra sua DT — se falhar, sofre 3d6 de dano de fogo; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 3, damageDice: '3d6' },
      { label: 'Discente', peCost: 5, damageDice: '6d6' },
      { label: 'Verdadeiro', peCost: 9, damageDice: '12d6' },
    ],
  },
  {
    id: 'eco-espiral',
    name: 'Eco Espiral',
    icon: '🩶',
    peCost: 2,
    rarity: 'incomum',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    damageDice: '4d6',
    description:
      'Ritual (Morte, 2º círculo). O alvo testa Fortitude contra sua DT; se falhar, sofre 4d6 de dano de Morte; se resistir, metade.',
    // já é uma simplificação livre (o livro usa um mecanismo de 2 turnos
    // concentrar→detonar que a gente não modela) — sem tier a mais em cima disso.
    tiers: [{ label: 'Base', peCost: 2, damageDice: '4d6' }],
  },
  {
    id: 'poeira-da-podridao',
    name: 'Poeira da Podridão',
    icon: '🌫️',
    // BALANCEAMENTO: 4d8=18 batia no teto — Base reduzido, Discente recupera
    // o valor antigo, Verdadeiro é o mesmo de sempre.
    peCost: 2,
    rarity: 'rara',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    damageDice: '2d8',
    description:
      'Ritual (Morte, 3º círculo). Uma nuvem de poeira apodrece o alvo, que testa Fortitude contra sua DT; se falhar, sofre 2d8 de dano de Morte; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '2d8' },
      { label: 'Discente', peCost: 3, damageDice: '4d8' },
      { label: 'Verdadeiro', peCost: 7, damageDice: '4d8+16' },
    ],
  },
  {
    id: 'purgatorio',
    name: 'Purgatório',
    icon: '🩸',
    // BALANCEAMENTO: 6d6=21 de média passou do teto — Base reduzido,
    // Discente recupera o valor antigo (sem evolução no livro pra esse
    // ritual — uso o nome só pra manter a progressão de 2 tiers).
    peCost: 2,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Sangue',
    saveSkill: 'fortitude',
    damageDice: '3d6',
    description:
      'Ritual (Sangue, 3º círculo). Uma poça de sangue pegajoso castiga o alvo; ele testa Fortitude contra sua DT — se falhar, sofre 3d6 de dano de Sangue; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '3d6' },
      { label: 'Discente', peCost: 3, damageDice: '6d6' },
    ],
  },
  {
    id: 'tecer-ilusao-verdadeira',
    name: 'Tecer Ilusão (Verdadeira)',
    icon: '👁️',
    // CORRIGIDO em leva anterior: "requer 3º círculo" (pré-requisito de
    // nível) não é o mesmo que "custa 3 PE". O custo real é
    // 1(base)+5(bônus da versão verdadeira)=6.
    // BALANCEAMENTO desta leva: 12d6=42 de média era o dobro do teto pedido
    // — Base bem reduzido, Discente recupera o valor de 12d6 (é o tier
    // máximo do livro pra esse ritual — só a versão verdadeira tem dano — a
    // base real é só ilusão sem efeito nenhum, então não tem pra onde
    // "exceder" além disso; uso o nome Discente só pra manter a progressão).
    peCost: 3,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Conhecimento',
    saveSkill: 'vontade',
    damageDice: '4d6',
    description:
      'Ritual (Conhecimento, 1º círculo, versão verdadeira). Cria a ilusão de um perigo mortal; o alvo testa Vontade contra sua DT — se falhar, acredita nela e sofre 4d6 de dano de Conhecimento; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 3, damageDice: '4d6' },
      { label: 'Discente', peCost: 6, damageDice: '12d6' },
    ],
  },
  {
    id: 'vomitar-pestes',
    name: 'Vomitar Pestes',
    icon: '🪱',
    // BALANCEAMENTO: 5d12=32,5 de média era quase o dobro do teto — Base
    // bem reduzido, Discente recupera o valor antigo (sem evolução no
    // livro — uso o nome só pra manter a progressão de 2 tiers).
    peCost: 2,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Sangue',
    saveSkill: 'reflexos',
    damageDice: '2d12',
    description:
      'Ritual (Sangue, 3º círculo). Um enxame de criaturas de Sangue devora o alvo; ele testa Reflexos contra sua DT — se falhar, sofre 2d12 de dano de Sangue; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '2d12' },
      { label: 'Discente', peCost: 3, damageDice: '5d12' },
    ],
  },
  {
    id: 'transfigurar-terra-amolecer',
    name: 'Transfigurar Terra (Amolecer)',
    icon: '🪨',
    // BALANCEAMENTO: 10d6=35 de média era quase o dobro do teto — Base bem
    // reduzido, Discente recupera o valor antigo (o Verdadeiro do livro só
    // expande QUAIS materiais afeta, não o dano — uso o nome só pra manter
    // a progressão de 2 tiers).
    peCost: 2,
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Energia',
    saveSkill: 'reflexos',
    damageDice: '5d6',
    description:
      'Ritual (Energia, 3º círculo). Provoca um desabamento sobre o alvo; ele testa Reflexos contra sua DT — se falhar, sofre 5d6 de dano de impacto; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '5d6' },
      { label: 'Discente', peCost: 3, damageDice: '10d6' },
    ],
  },
  {
    id: 'convocar-o-algoz',
    name: 'Convocar o Algoz',
    icon: '👤',
    rarity: 'lendaria',
    requiresClass: 'ocultista',
    kind: 'ritual',
    element: 'Morte',
    saveSkill: 'fortitude',
    // BALANCEAMENTO: subiu pra 8d6=28 numa leva anterior (pra não ficar
    // abaixo da média dano/PE), agora passou do teto — Base reduzido,
    // Discente recupera o valor de 8d6 (já é uma simplificação livre — o
    // livro usa perseguição de várias rodadas — uso o nome só pra manter a
    // progressão de 2 tiers).
    peCost: 2,
    damageDice: '4d6',
    description:
      'Ritual (Morte, 4º círculo). Um vulto sombrio nascido do maior medo do alvo o ataca; ele testa Fortitude contra sua DT — se falhar, sofre 4d6 de dano de Morte; se resistir, metade.',
    tiers: [
      { label: 'Base', peCost: 2, damageDice: '4d6' },
      { label: 'Discente', peCost: 4, damageDice: '8d6' },
    ],
  },
];

// Esquiva (pedido do usuário): carta de defesa fora do pool normal de
// escolha de baralho — SEMPRE entra 2x no baralho inicial (ver
// `confirmDeck`), sem ocupar vaga das 5 cartas escolhidas em DeckSelect e
// sem aparecer em oferta de Tesouro. Joga no clique (grátis, sem custo de
// PE — mesma filosofia do Soco, uma opção defensiva sempre disponível).
const ESQUIVA_COMUM: CombatCard = {
  id: 'esquiva-comum',
  name: 'Esquiva',
  icon: '💨',
  peCost: 0,
  rarity: 'comum',
  kind: 'dodge',
  dodgeDice: '1d10',
  description:
    'Ação defensiva. Role 1d10 — o resultado soma à sua Defesa até o final do próximo ataque do inimigo. Se ele não superar Defesa + Esquiva, erra.',
};

// RELÍQUIAS (pedido do usuário: "itens amaldiçoados... como se fosse as
// relíquias do Slay the Spire" — exemplo dele: Crânio Espiral dá 1 ação
// padrão extra por rodada no livro, aqui vira +1 carta jogável por turno).
// Extraídas do capítulo "Itens Amaldiçoados" (maldições de acessório —
// bônus fixo e simples — e alguns "itens especiais" com mecânica própria),
// escolhendo só as que davam pra traduzir num bônus passivo limpo pro
// jogador de combate; peguei o número exato do livro sempre que o efeito
// batia 1:1 com algo que esse protótipo já modela (PV/PE/atributo/Defesa),
// e simplifiquei quando o item pedia uma mecânica nova (revivência,
// bônus fixo de dano numa carta específica).
type RelicEffect =
  | { kind: 'extraCardPerTurn'; amount: number }
  | { kind: 'maxHpBonus'; amount: number }
  | { kind: 'maxPeBonus'; amount: number }
  | { kind: 'attributeBonus'; attr: AttrKey; amount: number }
  | { kind: 'defenseBonus'; amount: number }
  | { kind: 'ritualDtBonus'; amount: number }
  | { kind: 'weaponDamageBonus'; cardId: string; dice: string }
  | { kind: 'reviveOnce'; healFraction: number };

interface Relic {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  description: string;
  effect: RelicEffect;
}

const RELICS: Relic[] = [
  {
    id: 'cranio-espiral',
    name: 'Crânio Espiral',
    icon: '💀',
    rarity: 'lendaria',
    description:
      'Um crânio apodrecido e distorcido em espiral, com Lodo escorrendo dos olhos vazios. Uma vez por rodada, você recebe uma ação padrão adicional — joga 1 carta a mais por turno.',
    effect: { kind: 'extraCardPerTurn', amount: 1 },
  },
  {
    id: 'talisma-vitalidade',
    name: 'Talismã da Vitalidade',
    icon: '❤️',
    rarity: 'rara',
    description: 'Acessório amaldiçoado de Morte. Fornece +15 PV máximo.',
    effect: { kind: 'maxHpBonus', amount: 15 },
  },
  {
    id: 'bateria-esforco',
    name: 'Bateria de Esforço',
    icon: '🔋',
    rarity: 'rara',
    description: 'Acessório amaldiçoado de Morte. Fornece +5 PE máximo.',
    effect: { kind: 'maxPeBonus', amount: 5 },
  },
  {
    id: 'bracelete-disposicao',
    name: 'Bracelete de Disposição',
    icon: '💪',
    rarity: 'incomum',
    description: 'Acessório amaldiçoado de Sangue. Valendo-se do poder do Sangue, fornece +1 em Vigor.',
    effect: { kind: 'attributeBonus', attr: 'VIG', amount: 1 },
  },
  {
    id: 'anel-pujanca',
    name: 'Anel de Pujança',
    icon: '👊',
    rarity: 'incomum',
    description: 'Acessório amaldiçoado de Sangue. Aumenta sua potência muscular, fornecendo +1 em Força.',
    effect: { kind: 'attributeBonus', attr: 'FOR', amount: 1 },
  },
  {
    id: 'colar-sagacidade',
    name: 'Colar de Sagacidade',
    icon: '🧠',
    rarity: 'incomum',
    description: 'Acessório amaldiçoado de Conhecimento. Sua mente é acelerada, fornecendo +1 em Intelecto.',
    effect: { kind: 'attributeBonus', attr: 'INT', amount: 1 },
  },
  {
    id: 'luvas-destreza',
    name: 'Luvas de Destreza',
    icon: '🧤',
    rarity: 'incomum',
    description: 'Acessório amaldiçoado de Energia. Aprimora sua coordenação e velocidade, fornecendo +1 em Agilidade.',
    effect: { kind: 'attributeBonus', attr: 'AGI', amount: 1 },
  },
  {
    id: 'barreira-defesa',
    name: 'Barreira de Defesa',
    icon: '🛡️',
    rarity: 'rara',
    description: 'Acessório amaldiçoado de Energia. Uma barreira de energia invisível fornece +5 de Defesa.',
    effect: { kind: 'defenseBonus', amount: 5 },
  },
  {
    id: 'selo-potencia',
    name: 'Selo de Potência',
    icon: '🔯',
    rarity: 'rara',
    description: 'Acessório amaldiçoado de Energia. Aumenta a DT dos seus rituais em +1.',
    effect: { kind: 'ritualDtBonus', amount: 1 },
  },
  {
    id: 'punhos-enraivecidos',
    name: 'Punhos Enraivecidos',
    icon: '🥊',
    rarity: 'lendaria',
    description:
      'Soqueiras de metal vermelho-vivo gravadas com símbolos de Sangue. Seus ataques desarmados (Soco) causam +1d8 de dano de Sangue adicional.',
    effect: { kind: 'weaponDamageBonus', cardId: 'soco', dice: '1d8' },
  },
  {
    id: 'peitoral-segunda-chance',
    name: 'Peitoral da Segunda Chance',
    icon: '🫀',
    rarity: 'lendaria',
    description:
      'Um colete com uma peça central eletrônica sobre o coração. Se você for reduzido a 0 PV, ele te reanima uma vez por expedição com parte do seu PV máximo.',
    effect: { kind: 'reviveOnce', healFraction: 0.3 },
  },
];

function relicBonus(owned: Relic[], kind: RelicEffect['kind']): number {
  return owned.reduce((a, r) => (r.effect.kind === kind && 'amount' in r.effect ? a + r.effect.amount : a), 0);
}
function weaponBonusDiceFor(owned: Relic[], cardId: string): string[] {
  return owned.filter((r) => r.effect.kind === 'weaponDamageBonus' && r.effect.cardId === cardId).map((r) => (r.effect as Extract<RelicEffect, { kind: 'weaponDamageBonus' }>).dice);
}

// Tier ATUAL de qualquer carta evoluível (arma OU ritual — pedido do
// usuário: "dar upgrade nas armas da mesma forma que nos rituais") mora
// fora da carta, numa tabela separada da run — chave = `tierKeyOf(card)`
// (o `baseId`, quando a carta é uma cópia duplicada ganha de Tesouro com id
// sufixado, ou o próprio `id` senão). Isso significa: se você tiver 2
// cópias da mesma carta no baralho, evoluir uma evolui as duas — é o mesmo
// ritual conhecido/a mesma arma, não "duas cópias independentes".
type TieredCard = Extract<CombatCard, { kind: 'attack' | 'ritual' }>;
type RitualCard = Extract<CombatCard, { kind: 'ritual' }>;

function tierKeyOf(card: TieredCard): string {
  return card.baseId ?? card.id;
}
function tierIndexOf(card: TieredCard, cardTiers: Record<string, number>): number {
  return Math.min(cardTiers[tierKeyOf(card)] ?? 0, card.tiers.length - 1);
}
function ritualStatsFor(card: RitualCard, cardTiers: Record<string, number>) {
  const tier = card.tiers[tierIndexOf(card, cardTiers)];
  return { peCost: tier.peCost, damageDice: tier.damageDice, saveSkill: tier.saveSkill ?? card.saveSkill };
}
// dano efetivo de uma carta de ATAQUE no tier atual (arma) — equivalente ao
// que `ritualStatsFor` faz pra rituais.
function weaponDamageFor(card: Extract<CombatCard, { kind: 'attack' }>, cardTiers: Record<string, number>): string {
  return card.tiers[tierIndexOf(card, cardTiers)].damageDice;
}
// custo de PE efetivo de QUALQUER carta (evoluída ou não) — usado nos
// lugares que decidem se dá pra jogar a carta.
function effectivePeCost(card: CombatCard, cardTiers: Record<string, number>): number {
  return card.kind === 'heal' || card.kind === 'dodge' ? card.peCost : card.tiers[tierIndexOf(card, cardTiers)].peCost;
}
// lista, sem duplicar por carta, as armas/rituais no baralho que ainda têm
// pra onde evoluir — usado no nó de Descanso.
function upgradeableTieredCards(allCards: CombatCard[], cardTiers: Record<string, number>): TieredCard[] {
  const seen = new Set<string>();
  const result: TieredCard[] = [];
  for (const c of allCards) {
    if (c.kind !== 'attack' && c.kind !== 'ritual') continue;
    const key = tierKeyOf(c);
    if (seen.has(key)) continue;
    seen.add(key);
    if (tierIndexOf(c, cardTiers) + 1 < c.tiers.length) result.push(c);
  }
  return result;
}

// MAPA DE PROGRESSÃO (estilo Slay the Spire) — pedido do usuário com
// referência visual: nós ramificados, sobe de baixo pra cima, termina no
// chefe. Sem Mercador/moeda nesta leva (decisão tomada com o usuário).
type NodeKind = 'enemy' | 'elite' | 'unknown' | 'rest' | 'treasure' | 'boss';

interface MapNode {
  id: string;
  row: number; // 0 = primeira fileira (embaixo), MAP_ROWS = chefe (topo)
  col: number; // posição horizontal em %, só pra desenhar
  kind: NodeKind;
  next: string[]; // ids de nós da fileira seguinte que este nó alcança
}

const MAP_ROWS = 6; // fileiras "comuns" antes do chefe

// BALANCEAMENTO (pedido do usuário: "dificuldade crescendo gradualmente,
// junto com o jogador") — cada fileira de profundidade no mapa deixa o
// monstro daquela luta um pouco mais robusto: +15% de PV máximo por
// fileira. Testei escalar o DANO junto (primeira versão desta leva) e
// achei um problema real: como o PV MÁXIMO do jogador nunca cresce durante
// a run (só o baralho/rituais melhoram — ver `enterNode`), monstro batendo
// mais forte em fileiras fundas virava risco de matar o personagem num
// único turno (cheguei a ver 43 de dano contra um personagem de 21 PV,
// testando o Zumbi Espinhento numa fileira funda) — o oposto de "crescer
// junto com o jogador". Por isso só o PV escala (lutas mais longas,
// desgaste de recurso maior), o dano por golpe fica sempre no valor do
// livro. Não mexe em bônus de ataque nem testes de resistência também, pra
// não distorcer as chances de acerto já calibradas pelas fórmulas do
// livro. O chefe (fileira MAP_ROWS) já é o ponto mais forte da curva de
// propósito, e os pools de Elite (VD15) a partir da fileira 2 já entregam
// dificuldade extra por si só sem precisar inflar dano ainda mais.
const DIFFICULTY_SCALE_PER_ROW = 0.15;
function difficultyScaleForRow(row: number): number {
  return 1 + row * DIFFICULTY_SCALE_PER_ROW;
}

const NODE_ICON: Record<NodeKind, string> = {
  enemy: '👹',
  elite: '💀',
  unknown: '❓',
  rest: '🔥',
  treasure: '💰',
  boss: '👺',
};
const NODE_LABEL: Record<NodeKind, string> = {
  enemy: 'Inimigo',
  elite: 'Elite',
  unknown: 'Desconhecido',
  rest: 'Descanso',
  treasure: 'Tesouro',
  boss: 'Chefe',
};

const MAP_NODE_KIND_WEIGHT: Record<Exclude<NodeKind, 'boss'>, number> = {
  enemy: 10,
  elite: 4,
  unknown: 5,
  treasure: 4,
  rest: 3,
};

function pickNodeKind(row: number): Exclude<NodeKind, 'boss'> {
  if (row === 0) return 'enemy'; // primeira luta sempre previsível
  const pool: Exclude<NodeKind, 'boss'>[] = ['enemy', 'unknown', 'treasure', 'rest'];
  if (row >= 2) pool.push('elite'); // elite nunca nas 2 primeiras fileiras
  const weighted = pool.map((k) => ({ k, w: MAP_NODE_KIND_WEIGHT[k] }));
  const total = weighted.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const { k, w } of weighted) {
    if (r < w) return k;
    r -= w;
  }
  return 'enemy';
}

// Gera um mapa novo por run: MAP_ROWS fileiras de 2-4 nós (posição
// horizontal aleatória, tipo continua 100% procedural/aleatório por nó —
// pedido do usuário: "deixe a geração das fases aleatórias e procedurais").
// Cada nó conectado a 1-2 nós da fileira seguinte (por proximidade de
// coluna), com uma correção que garante que nenhum nó fique órfão (sem
// conexão de entrada). Termina sempre num único nó `boss`.
//
// Regra extra pedida pelo usuário: nunca deixar mais que 2 ou 3 fileiras
// seguidas sem nenhum nó de Descanso/Desconhecido (senão uma run azarada
// podia ficar várias lutas sem chance nenhuma de curar). Isso NÃO substitui
// a aleatoriedade — só corrige o streak quando ele estoura, forçando UM nó
// aleatório daquela fileira a virar Descanso ou Desconhecido (metade/metade).
// O limite (2 ou 3) também é sorteado de novo a cada streak, pra não virar
// um padrão fixo e previsível ("sempre a cada 3").
function generateMap(): MapNode[] {
  const nodes: MapNode[] = [];
  const rowsOfIds: string[][] = [];
  let rowsSinceBreak = 0;
  let streakLimit = 2 + Math.floor(Math.random() * 2); // 2 ou 3
  for (let row = 0; row < MAP_ROWS; row++) {
    const count = 2 + Math.floor(Math.random() * 3);
    const ids: string[] = [];
    const rowNodes: MapNode[] = [];
    for (let i = 0; i < count; i++) {
      const id = `n${row}_${i}`;
      const col = count === 1 ? 50 : (i / (count - 1)) * 100;
      const node: MapNode = { id, row, col, kind: pickNodeKind(row), next: [] };
      nodes.push(node);
      rowNodes.push(node);
      ids.push(id);
    }
    rowsOfIds.push(ids);

    const hasBreak = rowNodes.some((n) => n.kind === 'rest' || n.kind === 'unknown');
    if (hasBreak) {
      rowsSinceBreak = 0;
      streakLimit = 2 + Math.floor(Math.random() * 2);
    } else {
      rowsSinceBreak++;
      if (rowsSinceBreak >= streakLimit) {
        const forced = rowNodes[Math.floor(Math.random() * rowNodes.length)];
        forced.kind = Math.random() < 0.5 ? 'rest' : 'unknown';
        rowsSinceBreak = 0;
        streakLimit = 2 + Math.floor(Math.random() * 2);
      }
    }
  }
  nodes.push({ id: 'boss', row: MAP_ROWS, col: 50, kind: 'boss', next: [] });
  rowsOfIds.push(['boss']);

  for (let row = 0; row < rowsOfIds.length - 1; row++) {
    const current = rowsOfIds[row].map((id) => nodes.find((n) => n.id === id)!);
    const nextRow = rowsOfIds[row + 1].map((id) => nodes.find((n) => n.id === id)!);
    for (const node of current) {
      const sorted = [...nextRow].sort((a, b) => Math.abs(a.col - node.col) - Math.abs(b.col - node.col));
      const connCount = nextRow.length === 1 ? 1 : Math.random() < 0.5 ? 1 : 2;
      node.next = sorted.slice(0, connCount).map((n) => n.id);
    }
    for (const n of nextRow) {
      const hasIncoming = current.some((c) => c.next.includes(n.id));
      if (!hasIncoming) {
        const closest = [...current].sort((a, b) => Math.abs(a.col - n.col) - Math.abs(b.col - n.col))[0];
        closest.next.push(n.id);
      }
    }
  }

  const common = nodes.filter((n) => n.kind !== 'boss' && n.row > 0);
  if (common.length > 0 && !common.some((n) => n.kind === 'rest')) {
    common[Math.floor(Math.random() * common.length)].kind = 'rest';
  }
  const treasureCandidates = nodes.filter((n) => n.kind !== 'boss' && n.row > 0 && n.kind !== 'rest');
  if (treasureCandidates.length > 0 && !nodes.some((n) => n.kind === 'treasure')) {
    treasureCandidates[Math.floor(Math.random() * treasureCandidates.length)].kind = 'treasure';
  }

  return nodes;
}

type Phase =
  | 'create'
  | 'deck'
  | 'map'
  | 'node-rest'
  | 'node-unknown'
  | 'node-treasure'
  | 'intro'
  | 'initiative'
  | 'player-turn'
  | 'monster-intent'
  | 'monster-attack'
  | 'victory'
  | 'defeat'
  | 'run-complete';

interface LogLine {
  id: number;
  text: string;
}

let logSeq = 0;

// "Machucado" pra fins da Rasgar (ação livre do Zumbi de Sangue: +1D de dano
// de sangue em alvo machucado ou sangrando) — como esse protótipo não tem
// status de "sangrando" ainda, uso só "abaixo da metade do PV máximo".
function isHurt(hp: number, maxHp: number) {
  return hp <= maxHp / 2;
}

// Crítico (20 natural, ver OrdemTestResult.critical) e falha crítica (1
// natural, ver .fumble) são regra geral do sistema — dobra o dano num
// crítico, e um natural 1 NUNCA acerta mesmo que o total bata a Defesa
// (regra padrão de Ordem Paranormal: 1 natural é falha automática). Usado
// tanto pro ataque do jogador quanto do monstro.
function resolveDamageAttack(atk: OrdemTestResult, damageDice: string) {
  const hit = !atk.fumble && (atk.success || atk.critical);
  if (!hit) return { hit: false as const };
  const dmgRoll = rollExpression(damageDice);
  const dmg = atk.critical ? dmgRoll.total * 2 : dmgRoll.total;
  return { hit: true as const, dmgRoll, dmg, critical: atk.critical };
}

function defaultCharacter(): MinigameCharacter {
  return {
    name: '',
    appearance: '',
    classe: 'combatente',
    nex: START_NEX,
    attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
    skills: { iniciativa: 0, luta: 0, pontaria: 0, ocultismo: 0, fortitude: 0, vontade: 0 },
  };
}

// Padronização pedida pelo usuário: as telas de MENU do mini-jogo (criar
// personagem, montar baralho, mapa, nós) agora usam o mesmo "molde"
// `.daily-page`/`.daily-topbar`/`.daily-back`/`.daily-title` que toda outra
// tela de menu do app usa (Extras, Área do Mestre, Minhas Fichas etc. —
// ver `Home.tsx`/`CharacterLibrary.tsx`), em vez do `.minigame-page-plain`
// caseiro de antes. A tela de COMBATE em si (fundo de floresta + sprite +
// mão de cartas) continua com o layout próprio — ela não é um menu.
function Sigil() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
      <path d="M16 3l11 6.5v8.5c0 6.6-4.4 11-11 13-6.6-2-11-6.4-11-13V9.5z" fill="none" stroke="#e01e2b" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.4" fill="#e01e2b" />
      <path d="M16 6v20M6 16h20" stroke="#e01e2b" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

// Retrato genérico (usuário: "caso não tivesse foto seria uma imagem
// genérica") — silhueta simples no mesmo estilo carmesim/dourado do app,
// sem precisar de nenhum asset novo. Usado no HUD de combate/mapa e no
// preview da criação de personagem sempre que `character.portrait` não existe.
function GenericPortrait() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="minigame-generic-portrait">
      <circle cx="50" cy="50" r="50" fill="#1a1610" />
      <circle cx="50" cy="38" r="18" fill="#6b5a2f" />
      <path d="M50 60c-20 0-32 14-32 30v10h64V90c0-16-12-30-32-30z" fill="#6b5a2f" />
      <circle cx="50" cy="50" r="49" fill="none" stroke="#e8b21e" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function MinigameMenuShell({
  title,
  onBack,
  wide,
  children,
}: {
  title: string;
  onBack?: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="daily-page minigame-menu-page">
      <img className="daily-sigil-corner" src="/sigils/sigil-red.png" alt="" aria-hidden />
      <div className="daily-topbar">
        <Sigil />
        <span>O Outro Lado da Mesa</span>
      </div>
      <div className={'daily-content' + (wide ? ' minigame-content-wide' : '')}>
        {onBack && (
          <button className="daily-back" onClick={onBack}>
            ← Voltar
          </button>
        )}
        <h1 className="daily-title">{title}</h1>
        <div className="daily-title-rule" />
        {children}
      </div>
      <div className="daily-sigil-small">
        <Sigil />
        <span className="daily-sigil-line" />
      </div>
    </div>
  );
}

function CharacterCreate({ onConfirm }: { onConfirm: (c: MinigameCharacter) => void }) {
  const [draft, setDraft] = useState<MinigameCharacter>(defaultCharacter);
  // clique num <label> que embrulha o <input type=file> escondido não abre o
  // seletor nativo de forma confiável neste Electron (confirmado: o evento
  // de file chooser simplesmente não dispara) — mesmo padrão usado em TODO
  // o resto do app (CharacterSheet.tsx, Battle3D.tsx etc.): ref no input +
  // botão explícito chamando `.click()` nele.
  const portraitInputRef = useRef<HTMLInputElement | null>(null);

  const attrSum = ATTRIBUTES.reduce((a, x) => a + draft.attributes[x.key], 0);
  const attrLeft = ATTR_BUDGET - attrSum;
  const zeros = ATTRIBUTES.filter((x) => draft.attributes[x.key] === 0).length;

  const incAttr = (k: AttrKey) => {
    if (draft.attributes[k] >= ATTR_MAX || attrLeft <= 0) return;
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [k]: d.attributes[k] + 1 } }));
  };
  const decAttr = (k: AttrKey) => {
    if (draft.attributes[k] <= 0) return;
    if (draft.attributes[k] === 1 && zeros >= 1) return;
    setDraft((d) => ({ ...d, attributes: { ...d.attributes, [k]: d.attributes[k] - 1 } }));
  };

  const skillBudget = SKILL_BUDGET_BASE + draft.attributes.INT;
  const skillSpent = COMBAT_SKILL_KEYS.reduce((a, k) => a + trainingIndex(draft.skills[k]), 0);
  const skillLeft = skillBudget - skillSpent;
  const bumpSkill = (k: CombatSkillKey) => {
    const idx = trainingIndex(draft.skills[k]);
    if (idx >= TRAINING_LEVELS.length - 1 || skillLeft <= 0) return;
    setDraft((d) => ({ ...d, skills: { ...d.skills, [k]: TRAINING_LEVELS[idx + 1].value } }));
  };
  const lowerSkill = (k: CombatSkillKey) => {
    const idx = trainingIndex(draft.skills[k]);
    if (idx <= 0) return;
    setDraft((d) => ({ ...d, skills: { ...d.skills, [k]: TRAINING_LEVELS[idx - 1].value } }));
  };

  const preview = deriveMinigameStats(draft.classe, draft.attributes, draft.nex);
  const canStart = draft.name.trim().length > 0 && attrLeft === 0;

  return (
    <div className="minigame-create">
      <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
        Ficha simplificada — NEX {START_NEX}% pra começar (sobe 10% a cada Descanso na
        expedição), sem trilha/origem/sanidade.
      </p>

      <div className="minigame-create-row minigame-create-row-portrait">
        <div className="minigame-portrait-picker">
          <div className="minigame-portrait-preview">
            {draft.portrait ? <img src={draft.portrait} alt="" /> : <GenericPortrait />}
          </div>
          <button type="button" className="small ghost minigame-portrait-btn" onClick={() => portraitInputRef.current?.click()}>
            {draft.portrait ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <input
            ref={portraitInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const dataUrl = await fileToDownscaledDataURL(file, 320);
              if (dataUrl) setDraft((d) => ({ ...d, portrait: dataUrl }));
            }}
          />
          {draft.portrait && (
            <button className="small ghost" onClick={() => setDraft((d) => ({ ...d, portrait: undefined }))}>
              Remover
            </button>
          )}
        </div>
        <div className="minigame-create-row" style={{ flex: 1 }}>
          <div className="field">
            <label>Nome</label>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Aparência</label>
            <input
              value={draft.appearance}
              onChange={(e) => setDraft((d) => ({ ...d, appearance: e.target.value }))}
              placeholder="opcional"
            />
          </div>
        </div>
      </div>

      <div className="field">
        <label>Classe</label>
        <div className="minigame-class-row">
          {CLASSES.map((c) => (
            <button
              key={c.key}
              className={'minigame-class-btn' + (draft.classe === c.key ? ' on' : '')}
              onClick={() => setDraft((d) => ({ ...d, classe: c.key }))}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="minigame-create-section">
        <div className="minigame-create-section-head">
          <span>Atributos</span>
          <span className={attrLeft === 0 ? 'minigame-budget-ok' : 'minigame-budget'}>
            {attrLeft} restante(s)
          </span>
        </div>
        <div className="minigame-attr-grid">
          {ATTRIBUTES.map((a) => (
            <div key={a.key} className="minigame-attr-cell">
              <span className="minigame-attr-name">{a.short}</span>
              <button className="small ghost" onClick={() => decAttr(a.key)}>
                −
              </button>
              <span className="minigame-attr-val">{draft.attributes[a.key]}</span>
              <button className="small ghost" onClick={() => incAttr(a.key)}>
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="minigame-create-section">
        <div className="minigame-create-section-head">
          <span>Perícias de combate</span>
          <span className={skillLeft === 0 ? 'minigame-budget-ok' : 'minigame-budget'}>
            {skillLeft} restante(s)
          </span>
        </div>
        {COMBAT_SKILL_KEYS.map((k) => {
          const def = SKILL_BY_KEY[k];
          const level = TRAINING_LEVELS[trainingIndex(draft.skills[k])];
          return (
            <div key={k} className="minigame-skill-row">
              <span className="minigame-skill-name">
                {def.name} <span className="faint">({def.attr})</span>
              </span>
              <button className="small ghost" onClick={() => lowerSkill(k)}>
                −
              </button>
              <span className="minigame-skill-level">{level.label}</span>
              <button className="small ghost" onClick={() => bumpSkill(k)}>
                +
              </button>
            </div>
          );
        })}
      </div>

      <div className="minigame-create-preview">
        PV {preview.pvMax} · PE {preview.peMax} · Defesa {preview.defense}
      </div>

      <button className="primary minigame-start-btn" disabled={!canStart} onClick={() => onConfirm(draft)}>
        Começar aventura
      </button>
    </div>
  );
}

// Conteúdo de uma carta (cabeçalho+ícone, custo/dado, texto) — compartilhado
// entre a tela de montar baralho (clique = selecionar) e a mão em combate
// (clique = jogar), só o `<button>` ao redor muda de comportamento.
function CardFace({ card, cardTiers = {} }: { card: CombatCard; cardTiers?: Record<string, number> }) {
  const peCost = effectivePeCost(card, cardTiers);
  return (
    <>
      <div className="minigame-card-head">
        <span>{card.name}</span>
        <span className="minigame-card-icon">{card.icon}</span>
      </div>
      <span className={'minigame-card-rarity rarity-' + card.rarity}>{RARITY_LABEL[card.rarity]}</span>
      <div className="minigame-card-stats">
        <span>⚡ {peCost} PE</span>
        {card.kind === 'attack' &&
          (() => {
            const dmg = weaponDamageFor(card, cardTiers);
            const tierIdx = tierIndexOf(card, cardTiers);
            return (
              <span>
                🎲 {SKILL_BY_KEY[card.attackSkill].name} / {dmg}
                {card.tiers.length > 1 && <span className="minigame-card-tier"> · {card.tiers[tierIdx].label}</span>}
              </span>
            );
          })()}
        {card.kind === 'heal' && <span>💚 {card.healDice}</span>}
        {card.kind === 'dodge' && <span>🛡️ {card.dodgeDice}</span>}
        {card.kind === 'ritual' &&
          (() => {
            const stats = ritualStatsFor(card, cardTiers);
            const tierIdx = tierIndexOf(card, cardTiers);
            return (
              <span>
                🔮 {card.element} / {stats.damageDice}
                {card.tiers.length > 1 && <span className="minigame-card-tier"> · {card.tiers[tierIdx].label}</span>}
              </span>
            );
          })()}
      </div>
      <p className="minigame-card-text">{card.description}</p>
    </>
  );
}

function DeckSelect({ classe, onConfirm }: { classe: ClassKey; onConfirm: (cards: CombatCard[]) => void }) {
  // rituais são só pra Ocultista (regra dada lá no início da ideia do
  // mini-jogo) — filtra ANTES de sortear a oferta, então quem não é
  // Ocultista nunca vê ritual na lista pra escolher.
  const eligible = CARDS.filter((c) => !c.requiresClass || c.requiresClass === classe);
  // peso de sorteio: raridade normal, exceto rituais na mão de um Ocultista,
  // que saem boostados (afinidade da classe com o paranormal).
  const weightOf = (c: CombatCard) => {
    const base = RARITY_WEIGHT[c.rarity];
    return classe === 'ocultista' && c.kind === 'ritual' ? base * OCULTISTA_RITUAL_WEIGHT_BOOST : base;
  };
  // sorteia a oferta uma vez só (não re-sorteia a cada re-render) — viés por
  // raridade: cartas de mais dano são mais raras de aparecer aqui.
  const [offer] = useState<CombatCard[]>(() => weightedSample(eligible, weightOf, OFFER_SIZE));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < DECK_SIZE) next.add(id);
      return next;
    });
  };

  const canConfirm = selected.size === DECK_SIZE;

  return (
    <div className="minigame-create minigame-deck-select">
      <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
        Escolha {DECK_SIZE} de {offer.length} cartas — elas ficam com você a luta inteira. Em
        combate dá pra jogar até {MAX_CARDS_PER_TURN} por turno. Cartas mais raras causam mais
        dano, mas aparecem com menos frequência aqui.
      </p>
      <div className="minigame-deck-grid">
        {offer.map((c) => (
          <button
            key={c.id}
            className={'minigame-card' + (selected.has(c.id) ? ' selected' : '')}
            onClick={() => toggle(c.id)}
          >
            <CardFace card={c} />
          </button>
        ))}
      </div>
      <div className="minigame-create-preview">
        {selected.size}/{DECK_SIZE} escolhidas
      </div>
      <button className="primary minigame-start-btn" disabled={!canConfirm} onClick={() => onConfirm(offer.filter((c) => selected.has(c.id)))}>
        Confirmar baralho
      </button>
    </div>
  );
}

export function MinigameTest() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('create');
  const [character, setCharacter] = useState<MinigameCharacter | null>(null);
  // baralho de compra (deckPile), mão atual (hand, sempre até HAND_SIZE
  // cartas) e pilha de descarte (discardPile) — juntos sempre somam
  // DECK_SIZE cartas (as 5 escolhidas em DeckSelect), só circulando entre os
  // 3 montes conforme joga/puxa.
  const [deckPile, setDeckPile] = useState<CombatCard[]>([]);
  const [hand, setHand] = useState<CombatCard[]>([]);
  const [discardPile, setDiscardPile] = useState<CombatCard[]>([]);
  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);
  const [playerHp, setPlayerHp] = useState(0);
  const [playerMaxHp, setPlayerMaxHp] = useState(0);
  const [playerPe, setPlayerPe] = useState(0);
  const [playerMaxPe, setPlayerMaxPe] = useState(0);
  const [playerDefense, setPlayerDefense] = useState(0);
  // bônus de Esquiva ativo (carta `dodge`) — soma à Defesa só pro PRÓXIMO
  // ataque do monstro, depois zera (ver `resolveMonsterAttack`).
  const [dodgeBonus, setDodgeBonus] = useState(0);
  // sorteado de novo a cada "Confirmar baralho" (início de uma luta nova) —
  // ver confirmDeck.
  const [monster, setMonster] = useState<Monster>(MONSTERS[0]);
  const [monsterHp, setMonsterHp] = useState(MONSTERS[0].maxHp);
  const [intent, setIntent] = useState<MonsterAction | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [initiativeResult, setInitiativeResult] = useState<{ player: number; monster: number } | null>(null);
  // Estado da RUN (mapa) — pedido do usuário: vida não reseta a cada luta,
  // só cura em combate ou em nós específicos do mapa. `mapNodes`/
  // `currentNodeId` são gerados/setados 1x por run inteira em `confirmDeck`;
  // `pendingNodeId` guarda qual nó está sendo resolvido agora (combate ou
  // painel), pra saber pra onde voltar/o que marcar visitado ao terminar.
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  // tier atual de cada arma/ritual evoluível (ver comentário em `TieredCard`)
  const [cardTiers, setCardTiers] = useState<Record<string, number>>({});
  const [treasureOffer, setTreasureOffer] = useState<CombatCard[]>([]);
  // resolvido 1x ao entrar num nó 'unknown' (ver enterNode) — decide se ele
  // vira um mini-Tesouro ou uma cura condicional.
  const [unknownIsTreasure, setUnknownIsTreasure] = useState(false);
  // pontos de atributo/perícia ganhos de graça ao entrar num nó de Descanso
  // (ver `applyRestNexGain`) — ficam pendentes até o jogador escolher onde
  // investir (`spendLevelUpAttr`/`spendLevelUpSkill`), travando o resto do
  // nó (Descansar/Evoluir Ritual) até resolver, pra nunca perder o ponto sem querer.
  const [pendingAttrPoint, setPendingAttrPoint] = useState(false);
  const [pendingSkillPoint, setPendingSkillPoint] = useState(false);
  // relíquias (itens amaldiçoados) — ganhas em nó de Tesouro (chance de
  // virar oferta de relíquia em vez de carta, ver `enterNode`). Efeitos
  // passivos lidos direto de `relics` onde precisam (ver `relicBonus`/
  // `weaponBonusDiceFor`); `reviveOnce` é consumido 1x por run (`reviveUsed`).
  const [relics, setRelics] = useState<Relic[]>([]);
  const [relicOffer, setRelicOffer] = useState<Relic[]>([]);
  const [reviveUsed, setReviveUsed] = useState(false);
  // MAX_CARDS_PER_TURN + bônus de relíquias como Crânio Espiral.
  const effectiveMaxCardsPerTurn = MAX_CARDS_PER_TURN + relicBonus(relics, 'extraCardPerTurn');

  const pushLog = (text: string) => setLog((l) => [{ id: logSeq++, text }, ...l].slice(0, 4));

  // Centraliza toda queda de PV do jogador a 0 (ataque de monstro, falha
  // crítica de arma, reflexo de espinhos) — se tiver a relíquia Peitoral da
  // Segunda Chance ainda não usada nesta run, reanima em vez de derrotar.
  // Devolve true se a derrota REALMENTE aconteceu (fase virou 'defeat').
  const applyPlayerHpLoss = (nextHp: number): boolean => {
    if (nextHp > 0) {
      setPlayerHp(nextHp);
      return false;
    }
    const revive = relics.find((r) => r.effect.kind === 'reviveOnce');
    if (revive && revive.effect.kind === 'reviveOnce' && !reviveUsed) {
      setReviveUsed(true);
      const healTo = Math.max(1, Math.round(playerMaxHp * revive.effect.healFraction));
      setPlayerHp(healTo);
      pushLog(`${revive.name} pulsa e te reanima com ${healTo} PV!`);
      return false;
    }
    setPlayerHp(0);
    setPhase('defeat');
    return true;
  };

  const startCharacter = (c: MinigameCharacter) => {
    const stats = deriveMinigameStats(c.classe, c.attributes, c.nex);
    setCharacter(c);
    // PV setado só AQUI — o resto da run inteira (`enterNode`) nunca mais
    // reseta o PV pro máximo, só cura (Cicatrização em combate, ou os nós
    // de Descanso/Desconhecido do mapa).
    setPlayerHp(stats.pvMax);
    setPlayerMaxHp(stats.pvMax);
    setPlayerPe(stats.peMax);
    setPlayerMaxPe(stats.peMax);
    setPlayerDefense(stats.defense);
    setPhase('deck');
  };

  // Chamado 1x, ao sair de `DeckSelect` — monta o baralho inicial e GERA O
  // MAPA da run (não entra em combate direto mais; isso agora é `enterNode`).
  const confirmDeck = (cards: CombatCard[]) => {
    // pedido do usuário: baralho inicial já vem com 2 Esquivas comuns, ALÉM
    // das 5 cartas escolhidas (não ocupam vaga de escolha) — ids sufixados
    // só pra servir de `key` React única, mesmo esquema de duplicata que
    // cartas de Tesouro já usam.
    const startingDeck = [...cards, { ...ESQUIVA_COMUM, id: 'esquiva-comum#1' }, { ...ESQUIVA_COMUM, id: 'esquiva-comum#2' }];
    const { drawn, deck, discard } = drawCards(HAND_SIZE, shuffle(startingDeck), []);
    setHand(drawn);
    setDeckPile(deck);
    setDiscardPile(discard);
    setMapNodes(generateMap());
    setCurrentNodeId(null);
    setCardTiers({});
    setPhase('map');
  };

  // Entra num nó do mapa (chamado só quando o nó está alcançável — ver
  // `reachable` no render da fase 'map'). Combate (enemy/elite/boss) reusa
  // o fluxo de sempre (fase 'intro'), só troca de onde vem o monstro e NÃO
  // mexe no PV (só no PE, que recupera a cada luta nova).
  const enterNode = (nodeId: string) => {
    if (!character) return;
    const node = mapNodes.find((n) => n.id === nodeId);
    if (!node) return;
    setPendingNodeId(nodeId);
    if (node.kind === 'enemy' || node.kind === 'elite' || node.kind === 'boss') {
      const pool =
        node.kind === 'boss' ? [ZUMBI_SANGUE_CHEFE] : node.kind === 'elite' ? [ZUMBI_DENTADO, ZUMBI_ESPINHENTO] : [ZUMBI_EMERGENTE, ZUMBI_BASE];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      // escala de dificuldade pela profundidade do nó (ver comentário em
      // `difficultyScaleForRow`) — só no PV máximo do monstro, não no dano
      // que ele causa (ver esse mesmo comentário pro motivo).
      const scaledMaxHp = Math.round(picked.maxHp * difficultyScaleForRow(node.row));
      setMonster({ ...picked, maxHp: scaledMaxHp });
      setMonsterHp(scaledMaxHp);
      setPlayerPe(playerMaxPe);
      setDodgeBonus(0);
      // embaralha TODO o baralho acumulado da run (deckPile+hand+discardPile
      // — pode ter crescido com Tesouro) numa mão nova pra essa luta.
      const allCards = [...deckPile, ...hand, ...discardPile];
      const { drawn, deck, discard } = drawCards(HAND_SIZE, shuffle(allCards), []);
      setHand(drawn);
      setDeckPile(deck);
      setDiscardPile(discard);
      setCardsPlayedThisTurn(0);
      setIntent(null);
      setInitiativeResult(null);
      setPhase('intro');
      return;
    }
    if (node.kind === 'rest') {
      applyRestNexGain();
      setPhase('node-rest');
      return;
    }
    if (node.kind === 'treasure') {
      // chance de virar oferta de RELÍQUIA em vez de carta (só se ainda
      // sobrar alguma não adquirida nesta run) — pedido do usuário: itens
      // amaldiçoados "como as relíquias do Slay the Spire".
      const ownedIds = new Set(relics.map((r) => r.id));
      const unowned = RELICS.filter((r) => !ownedIds.has(r.id));
      if (unowned.length > 0 && Math.random() < 0.35) {
        setRelicOffer(weightedSample(unowned, (r) => RARITY_WEIGHT[r.rarity], Math.min(3, unowned.length)));
        setTreasureOffer([]);
        setPhase('node-treasure');
        return;
      }
      const eligible = CARDS.filter((c) => !c.requiresClass || c.requiresClass === character.classe);
      setRelicOffer([]);
      setTreasureOffer(weightedSample(eligible, (c) => RARITY_WEIGHT[c.rarity], 3));
      setPhase('node-treasure');
      return;
    }
    // 'unknown': resolve uma vez, na hora, se vira mini-Tesouro ou cura condicional
    const asTreasure = Math.random() < 0.5;
    setUnknownIsTreasure(asTreasure);
    if (asTreasure) {
      const eligible = CARDS.filter((c) => !c.requiresClass || c.requiresClass === character.classe);
      setTreasureOffer(weightedSample(eligible, (c) => RARITY_WEIGHT[c.rarity], 3));
    }
    setPhase('node-unknown');
  };

  // Fecha a resolução do nó atual (vitória em combate, cura, evolução de
  // ritual, carta escolhida) e volta pro mapa, marcando o nó como o atual
  // (libera os próximos nós conectados a ele).
  const returnToMap = () => {
    if (pendingNodeId) setCurrentNodeId(pendingNodeId);
    setPendingNodeId(null);
    setPhase('map');
  };

  // Sobe o NEX em LEVEL_UP_NEX_STEP (10%) DE GRAÇA ao entrar num nó de
  // Descanso — não compete com a escolha Descansar/Evoluir Ritual, é um
  // bônus à parte. Recalcula PV/PE máximos na hora (mesma fórmula do jogo
  // real) e soma a DIFERENÇA no PV/PE atuais (não cura tudo — só o ganho
  // de "ficar mais robusto" mesmo, mantendo a tensão de recurso escasso).
  // Libera 1 ponto de atributo + 1 de perícia pendentes pro jogador
  // escolher onde investir (ver `spendLevelUpAttr`/`spendLevelUpSkill`).
  const applyRestNexGain = () => {
    if (!character) return;
    const newNex = character.nex + LEVEL_UP_NEX_STEP;
    const oldStats = deriveMinigameStats(character.classe, character.attributes, character.nex);
    const newStats = deriveMinigameStats(character.classe, character.attributes, newNex);
    setCharacter({ ...character, nex: newNex });
    setPlayerMaxHp(newStats.pvMax);
    setPlayerHp((hp) => Math.min(newStats.pvMax, hp + (newStats.pvMax - oldStats.pvMax)));
    setPlayerMaxPe(newStats.peMax);
    setPlayerPe((pe) => Math.min(newStats.peMax, pe + (newStats.peMax - oldStats.peMax)));
    setPendingAttrPoint(true);
    setPendingSkillPoint(true);
    pushLog(`O descanso avança sua jornada — você subiu para NEX ${newNex}%! Escolha onde investir o atributo e a perícia extra.`);
  };

  const spendLevelUpAttr = (key: AttrKey) => {
    if (!character || !pendingAttrPoint) return;
    const cap = maxAttributeForNex(character.nex);
    if (character.attributes[key] >= cap) return;
    const nextAttrs = { ...character.attributes, [key]: character.attributes[key] + 1 };
    const oldStats = deriveMinigameStats(character.classe, character.attributes, character.nex);
    const newStats = deriveMinigameStats(character.classe, nextAttrs, character.nex);
    setCharacter({ ...character, attributes: nextAttrs });
    setPlayerMaxHp(newStats.pvMax);
    setPlayerHp((hp) => Math.min(newStats.pvMax, hp + (newStats.pvMax - oldStats.pvMax)));
    setPlayerMaxPe(newStats.peMax);
    setPlayerPe((pe) => Math.min(newStats.peMax, pe + (newStats.peMax - oldStats.peMax)));
    setPlayerDefense(newStats.defense);
    setPendingAttrPoint(false);
    pushLog(`Ponto de atributo investido em ${key}.`);
  };

  const spendLevelUpSkill = (key: CombatSkillKey) => {
    if (!character || !pendingSkillPoint) return;
    const idx = trainingIndex(character.skills[key]);
    if (idx >= TRAINING_LEVELS.length - 1) return;
    setCharacter({ ...character, skills: { ...character.skills, [key]: TRAINING_LEVELS[idx + 1].value } });
    setPendingSkillPoint(false);
    pushLog(`Ponto de perícia investido em ${SKILL_BY_KEY[key].name}.`);
  };

  const HEAL_FRACTION = 0.6; // Descanso/Desconhecido curam 60% do PV que falta, não 100% — recurso escasso
  const restHeal = () => {
    const missing = playerMaxHp - playerHp;
    const healed = Math.ceil(missing * HEAL_FRACTION);
    setPlayerHp((hp) => Math.min(playerMaxHp, hp + healed));
    pushLog(`Você descansou e recuperou ${healed} PV.`);
    returnToMap();
  };

  const upgradeCard = (card: TieredCard) => {
    const key = tierKeyOf(card);
    const nextIdx = tierIndexOf(card, cardTiers) + 1;
    setCardTiers((prev) => ({ ...prev, [key]: nextIdx }));
    pushLog(`${card.name} evoluiu para ${card.tiers[nextIdx].label}.`);
    returnToMap();
  };

  const pickTreasureCard = (card: CombatCard) => {
    // se já tem esse id no baralho (pegou o mesmo ritual/arma 2x), sufixa o
    // id só pra manter `key` única no React — `baseId` guarda o original
    // (é ele que `cardTiers` usa, então evoluir uma evolui as duas cópias).
    const allIds = [...deckPile, ...hand, ...discardPile].map((c) => c.id);
    let newCard = card;
    if (allIds.includes(card.id)) {
      let n = 2;
      while (allIds.includes(`${card.id}#${n}`)) n++;
      newCard = { ...card, id: `${card.id}#${n}`, baseId: card.id } as CombatCard;
    }
    setDeckPile((d) => [...d, newCard]);
    pushLog(`Você adicionou ${card.name} ao baralho.`);
    returnToMap();
  };

  // Adquire uma relíquia (nó de Tesouro, ver `enterNode`) — efeitos de bônus
  // fixo (PV/PE/atributo/Defesa) aplicam a diferença na hora, igual
  // `applyRestNexGain`/`spendLevelUpAttr` já fazem; os efeitos passivos
  // (cartas extra por turno, DT de ritual, dano de arma, reviver) são só
  // lidos de `relics` sempre que precisam, sem estado próprio aqui.
  const pickRelic = (relic: Relic) => {
    if (!character) return;
    setRelics((prev) => [...prev, relic]);
    const eff = relic.effect;
    if (eff.kind === 'maxHpBonus') {
      setPlayerMaxHp((v) => v + eff.amount);
      setPlayerHp((hp) => hp + eff.amount);
    } else if (eff.kind === 'maxPeBonus') {
      setPlayerMaxPe((v) => v + eff.amount);
      setPlayerPe((pe) => pe + eff.amount);
    } else if (eff.kind === 'defenseBonus') {
      setPlayerDefense((d) => d + eff.amount);
    } else if (eff.kind === 'attributeBonus') {
      const nextAttrs = { ...character.attributes, [eff.attr]: character.attributes[eff.attr] + eff.amount };
      const oldStats = deriveMinigameStats(character.classe, character.attributes, character.nex);
      const newStats = deriveMinigameStats(character.classe, nextAttrs, character.nex);
      setCharacter({ ...character, attributes: nextAttrs });
      setPlayerMaxHp((v) => v + (newStats.pvMax - oldStats.pvMax));
      setPlayerHp((hp) => hp + (newStats.pvMax - oldStats.pvMax));
      setPlayerMaxPe((v) => v + (newStats.peMax - oldStats.peMax));
      setPlayerPe((pe) => pe + (newStats.peMax - oldStats.peMax));
      setPlayerDefense(newStats.defense);
    }
    pushLog(`Você encontrou a relíquia amaldiçoada ${relic.name}!`);
    returnToMap();
  };

  // Ao zerar o PV do monstro: chefe termina a run de vez (fase própria,
  // sem "Jogar de novo" voltando pro mapa); qualquer outro nó volta pro
  // fluxo normal de "Vitória!" → "Continuar" → mapa.
  const handleMonsterDefeated = () => {
    const node = pendingNodeId ? mapNodes.find((n) => n.id === pendingNodeId) : null;
    setPhase(node?.kind === 'boss' ? 'run-complete' : 'victory');
  };

  const reset = () => {
    setPhase('create');
    setCharacter(null);
    setHand([]);
    setDeckPile([]);
    setDiscardPile([]);
    setCardsPlayedThisTurn(0);
    setIntent(null);
    setLog([]);
    setInitiativeResult(null);
    setMapNodes([]);
    setCurrentNodeId(null);
    setPendingNodeId(null);
    setCardTiers({});
    setTreasureOffer([]);
    setPendingAttrPoint(false);
    setPendingSkillPoint(false);
    setRelics([]);
    setRelicOffer([]);
    setReviveUsed(false);
    setDodgeBonus(0);
  };

  const rollInitiative = () => {
    if (!character) return;
    const playerRoll = rollOrdemTest(character.attributes.AGI, character.skills.iniciativa).total;
    const monsterRoll = rollOrdemTest(monster.initiativeDiceCount, monster.initiativeBonus).total;
    setInitiativeResult({ player: playerRoll, monster: monsterRoll });
    setPhase('initiative');
    window.setTimeout(() => {
      if (playerRoll >= monsterRoll) {
        pushLog(`Iniciativa: você ${playerRoll} × ${monster.name} ${monsterRoll} — você começa!`);
        setCardsPlayedThisTurn(0);
        setPhase('player-turn');
      } else {
        pushLog(`Iniciativa: você ${playerRoll} × ${monster.name} ${monsterRoll} — ${monster.name} começa!`);
        startMonsterTurn();
      }
      // pedido do usuário: "demora pra abrir a batalha" — essas pausas eram
      // só efeito dramático (mostrar o resultado antes de seguir), sem
      // nenhum cálculo acontecendo nelas. Cortadas de 1400/1300/700ms pra
      // 500/500/300ms (pior caso caiu de 3,4s pra 1,3s até dar pra jogar).
    }, 500);
  };

  const startMonsterTurn = () => {
    const action = monster.actions[Math.floor(Math.random() * monster.actions.length)];
    setIntent(action);
    setPhase('monster-intent');
    window.setTimeout(() => resolveMonsterAttack(action), 500);
  };

  const resolveMonsterAttack = (action: MonsterAction) => {
    setPhase('monster-attack');
    const hits = action.attackCount ?? 1;
    // Esquiva (carta `dodge`) soma à Defesa só pra ESTE ataque — consumida
    // no fim deste bloco (`setDodgeBonus(0)`), independente de acertar ou
    // errar, mesmo que o jogador não tenha jogado nenhuma esquiva (soma 0).
    const effectiveDefense = playerDefense + dodgeBonus;
    // cada golpe é um teste de ataque + dano independente (ex.: "Duas
    // Garras" = 2 rolagens separadas, uma pode acertar e a outra errar).
    const rolls = Array.from({ length: hits }, () => rollOrdemTest(action.attackDiceCount, action.attackBonus, effectiveDefense));
    window.setTimeout(() => {
      let totalDmg = 0;
      const parts: string[] = [];
      for (const atk of rolls) {
        const res = resolveDamageAttack(atk, action.damageDice);
        if (!res.hit) {
          parts.push(`errou (${atk.total} vs Defesa ${effectiveDefense}${atk.fumble ? ', falha crítica' : ''})`);
          continue;
        }
        // Rasgar (ação livre da ficha): +1D (mesmo tamanho do dado de dano
        // desta ação) de dano de sangue em alvo já machucado/sangrando —
        // considera o dano acumulado dos golpes anteriores DESTA mesma ação.
        const hurt = isHurt(playerHp - totalDmg, playerMaxHp);
        const rasgar = hurt ? rollExpression(`1d${dieSizeOf(action.damageDice)}`) : null;
        const dmg = Math.max(0, res.dmg + (rasgar?.total ?? 0));
        totalDmg += dmg;
        const rasgarTxt = rasgar ? ` +Rasgar→${rasgar.total}` : '';
        const critTxt = res.critical ? ' CRÍTICO' : '';
        parts.push(`acertou${critTxt} (${atk.total} vs Defesa ${effectiveDefense}): ${action.damageDice}→${res.dmgRoll.total}${rasgarTxt} = ${dmg}`);
      }
      setDodgeBonus(0);
      if (totalDmg > 0) {
        // dano por golpe NÃO escala com a profundidade (ver comentário em
        // `difficultyScaleForRow`) — só o PV máximo do monstro escala.
        const nextHp = Math.max(0, playerHp - totalDmg);
        pushLog(`${monster.name} usou ${action.label} — ${parts.join(' | ')} — total ${totalDmg} de dano ${action.damageType}.`);
        const died = applyPlayerHpLoss(nextHp);
        if (died) {
          setIntent(null);
          return;
        }
      } else {
        pushLog(`${monster.name} usou ${action.label} — ${parts.join(' | ')}`);
      }
      setIntent(null);
      setCardsPlayedThisTurn(0);
      setPhase('player-turn');
    }, 300);
  };

  // Encerra o turno do jogador de vez (jogou 3 cartas — o teto — ou clicou
  // "Encerrar turno" antes disso) e passa a ação pro monstro.
  const endTurn = () => {
    if (phase !== 'player-turn') return;
    startMonsterTurn();
  };

  // Arrastar a carta até o inimigo pra jogar (pedido do usuário — troca o
  // clique simples por arrastar, mesmo padrão de `onTokenPointerDown` em
  // `BattleMap.tsx`: listeners em `window`, não no elemento, pra nunca
  // perder o arraste num movimento rápido do mouse). Só cartas de ataque/
  // ritual precisam disso (têm um alvo pra escolher); Cicatrização (cura)
  // sempre mira em você mesmo, então continua jogando no clique direto —
  // sem ambiguidade nenhuma pra resolver arrastando.
  // Isso também deixa o terreno pronto pra horda: quando existir mais de 1
  // monstro na tela, cada um vira sua própria zona de soltar, e o alvo já
  // sai definido por qual monstro o jogador arrastou a carta até.
  const monsterDropRef = useRef<HTMLDivElement | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState(false);

  const isOverDropZone = (x: number, y: number) => {
    const zone = monsterDropRef.current;
    if (!zone) return false;
    const r = zone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const onCardPointerDown = (e: ReactPointerEvent, card: CombatCard) => {
    if (card.kind === 'heal' || card.kind === 'dodge') return; // cura/esquiva jogam no clique direto, sem arrastar
    e.preventDefault();
    setDragCardId(card.id);
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragOverTarget(false);

    const onMove = (ev: PointerEvent) => {
      setDragPos({ x: ev.clientX, y: ev.clientY });
      setDragOverTarget(isOverDropZone(ev.clientX, ev.clientY));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const hit = isOverDropZone(ev.clientX, ev.clientY);
      setDragCardId(null);
      setDragPos(null);
      setDragOverTarget(false);
      if (hit) playCard(card);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const playCard = (card: CombatCard) => {
    const cost = effectivePeCost(card, cardTiers);
    if (!character || phase !== 'player-turn' || playerPe < cost || cardsPlayedThisTurn >= effectiveMaxCardsPerTurn) return;
    setPlayerPe((pe) => pe - cost);
    const playsUsed = cardsPlayedThisTurn + 1;
    setCardsPlayedThisTurn(playsUsed);

    // a carta jogada sai da mão e vai pro descarte; puxa 1 substituta na
    // hora (reembaralha o descarte de volta no baralho de compra se ele já
    // tiver esvaziado) — é isso que faz a mão "ficar rotacionando".
    const handAfterPlay = hand.filter((c) => c.id !== card.id);
    const discardWithPlayed = [...discardPile, card];
    const { drawn, deck: deckAfterDraw, discard: discardAfterDraw } = drawCards(1, deckPile, discardWithPlayed);
    setHand([...handAfterPlay, ...drawn]);
    setDeckPile(deckAfterDraw);
    setDiscardPile(discardAfterDraw);

    // só passa a vez sozinho quando bate o teto de cartas do turno (já
    // considerando bônus de relíquia tipo Crânio Espiral) — senão o
    // jogador continua podendo jogar mais até o limite ou clicar "Encerrar turno".
    const maybeEndTurn = () => {
      if (playsUsed >= effectiveMaxCardsPerTurn) startMonsterTurn();
    };

    if (card.kind === 'heal') {
      const healRoll = rollExpression(card.healDice);
      setPlayerHp((hp) => Math.min(playerMaxHp, hp + healRoll.total));
      pushLog(`Você usou ${card.name} (${card.healDice}→${healRoll.total}): recuperou ${healRoll.total} de PV.`);
      maybeEndTurn();
      return;
    }

    if (card.kind === 'dodge') {
      const dodgeRoll = rollExpression(card.dodgeDice);
      setDodgeBonus((b) => b + dodgeRoll.total);
      pushLog(`Você usou ${card.name} (${card.dodgeDice}→${dodgeRoll.total}): +${dodgeRoll.total} de Defesa até o próximo ataque inimigo.`);
      maybeEndTurn();
      return;
    }

    if (card.kind === 'ritual') {
      // modelo INVERSO do de arma: quem conjura não rola ataque — o ALVO
      // testa Fortitude, Vontade ou Reflexos (depende do TIER atual do
      // ritual — `ritualStatsFor`, que já considera evolução de nó de
      // Descanso) contra a DT do conjurador (fórmula do livro, p.128: 10 +
      // pePerTurn(NEX) + Presença). Passa = metade do dano, falha = dano
      // cheio (todos os rituais escolhidos até agora são "parcial"/"reduz à
      // metade" nesse sentido).
      const stats = ritualStatsFor(card, cardTiers);
      // usa o NEX ATUAL do personagem (sobe com os nós de Descanso — ver
      // `applyRestNexGain`), não o START_NEX fixo: rituais ficam mais
      // fortes conforme o jogador avança na run, igual no jogo de verdade.
      // + bônus de relíquia tipo Selo de Potência.
      const dt = 10 + pePerTurn(character.nex) + character.attributes.PRE + relicBonus(relics, 'ritualDtBonus');
      const [saveDice, saveBonus] =
        stats.saveSkill === 'vontade'
          ? [monster.vontadeDice, monster.vontadeBonus]
          : stats.saveSkill === 'reflexos'
            ? [monster.reflexosDice, monster.reflexosBonus]
            : [monster.fortitudeDice, monster.fortitudeBonus];
      const save = rollOrdemTest(saveDice, saveBonus, dt);
      const dmgRoll = rollExpression(stats.damageDice);
      const dmg = save.success ? Math.ceil(dmgRoll.total / 2) : dmgRoll.total;
      const nextHp = Math.max(0, monsterHp - dmg);
      setMonsterHp(nextHp);
      if (card.lifestealFraction) {
        const healed = Math.floor(dmg * card.lifestealFraction);
        setPlayerHp((hp) => Math.min(playerMaxHp, hp + healed));
      }
      const saveLabel = stats.saveSkill === 'vontade' ? 'Vontade' : stats.saveSkill === 'reflexos' ? 'Reflexos' : 'Fortitude';
      const saveTxt = save.success
        ? `${monster.name} resistiu (${saveLabel} ${save.total} vs DT ${dt}): metade do dano`
        : `${monster.name} falhou (${saveLabel} ${save.total} vs DT ${dt}): dano cheio`;
      const healTxt = card.lifestealFraction ? ` Você recuperou ${Math.floor(dmg * card.lifestealFraction)} PV.` : '';
      pushLog(`Você conjurou ${card.name} — ${saveTxt} — ${stats.damageDice}→${dmgRoll.total} = ${dmg} de dano.${healTxt}`);
      if (nextHp <= 0) {
        handleMonsterDefeated();
      } else {
        maybeEndTurn();
      }
      return;
    }

    const attr = SKILL_BY_KEY[card.attackSkill].attr;
    const atk = rollOrdemTest(character.attributes[attr], character.skills[card.attackSkill], monster.defense);
    // dano da arma no tier ATUAL (evoluída em nó de Descanso ou não — ver
    // `weaponDamageFor`) + dado extra de relíquias específicas dessa arma
    // (ex.: Punhos Enraivecidos em cima do Soco — ver `weaponBonusDiceFor`).
    const bonusDice = weaponBonusDiceFor(relics, card.id);
    const dice = [weaponDamageFor(card, cardTiers), ...bonusDice].join('+');

    // falha crítica especial de algumas armas (ex.: lança-chamas) — em vez de
    // só errar, a própria arma causa metade do dano dela em quem atacou.
    if (atk.fumble && card.fumbleBackfire) {
      const dmgRoll = rollExpression(dice);
      const selfDmg = Math.ceil(dmgRoll.total / 2);
      const nextHp = Math.max(0, playerHp - selfDmg);
      pushLog(`Você tentou ${card.name} e teve uma FALHA CRÍTICA: a arma vira contra você — ${dice}→${dmgRoll.total}, metade (${selfDmg}) de volta em você.`);
      if (applyPlayerHpLoss(nextHp)) return;
      maybeEndTurn();
      return;
    }

    const res = resolveDamageAttack(atk, dice);
    if (!res.hit) {
      const fumbleTxt = atk.fumble ? ' — falha crítica!' : '';
      pushLog(`Você tentou ${card.name} (${atk.total} vs Defesa ${monster.defense})${fumbleTxt}: errou!`);
      maybeEndTurn();
      return;
    }
    const nextHp = Math.max(0, monsterHp - res.dmg);
    setMonsterHp(nextHp);
    const critTxt = res.critical ? ' CRÍTICO ×2!' : '';
    // "Armadura de espinhos" do Zumbi Espinhento (pedido do usuário): acertar
    // ele com um tipo de dano específico (ver `monster.thorns`) reflete uma
    // fração do dano causado de volta pra você — primeiro uso de verdade do
    // `damageType` das cartas de ataque, além da raridade/exibição.
    let thornsTxt = '';
    let playerNextHp: number | null = null;
    if (monster.thorns && monster.thorns.againstType === card.damageType) {
      const reflected = Math.ceil(res.dmg * monster.thorns.fraction);
      playerNextHp = Math.max(0, playerHp - reflected);
      thornsTxt = ` A carapaça de espinhos reflete ${reflected} de volta em você!`;
    }
    pushLog(
      `Você acertou${critTxt} ${card.name} (${atk.total} vs Defesa ${monster.defense}): ${dice}→${res.dmgRoll.total} = ${res.dmg} de dano.${thornsTxt}`,
    );
    if (playerNextHp !== null && applyPlayerHpLoss(playerNextHp)) return;
    if (nextHp <= 0) {
      handleMonsterDefeated();
    } else {
      maybeEndTurn();
    }
  };

  if (phase === 'create' || !character) {
    return (
      <MinigameMenuShell title="Criar Personagem" onBack={() => navigate('/')}>
        <CharacterCreate onConfirm={startCharacter} />
      </MinigameMenuShell>
    );
  }

  if (phase === 'deck') {
    return (
      <MinigameMenuShell title="Monte seu Baralho" onBack={() => navigate('/')} wide>
        <DeckSelect classe={character.classe} onConfirm={confirmDeck} />
      </MinigameMenuShell>
    );
  }

  if (phase === 'map') {
    const currentNode = currentNodeId ? mapNodes.find((n) => n.id === currentNodeId) : null;
    const reachable = new Set<string>(currentNode ? currentNode.next : mapNodes.filter((n) => n.row === 0).map((n) => n.id));
    return (
      <MinigameMenuShell title="Mapa da Expedição" onBack={() => navigate('/')} wide>
        <div className="minigame-map-hud">
          <span>
            {character.name} <span className="faint">({CLASS_BY_KEY[character.classe].name})</span>
          </span>
          <span>NEX {character.nex}%</span>
          <span>
            ❤ {playerHp}/{playerMaxHp}
          </span>
          <span>🂠 Baralho: {deckPile.length + hand.length + discardPile.length} cartas</span>
          {relics.length > 0 && (
            <span className="minigame-relic-row">
              {relics.map((r) => (
                <span key={r.id} className="minigame-relic-icon" title={`${r.name} — ${r.description}`}>
                  {r.icon}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="minigame-map">
          <svg className="minigame-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {mapNodes.flatMap((n) =>
              n.next
                .map((toId) => mapNodes.find((m) => m.id === toId))
                .filter((to): to is MapNode => !!to)
                .map((to) => (
                  <line
                    key={`${n.id}-${to.id}`}
                    x1={n.col}
                    y1={100 - (n.row / MAP_ROWS) * 100}
                    x2={to.col}
                    y2={100 - (to.row / MAP_ROWS) * 100}
                  />
                )),
            )}
          </svg>
          {mapNodes.map((n) => (
            <button
              key={n.id}
              className={
                'minigame-map-node' +
                (reachable.has(n.id) ? ' reachable' : '') +
                (currentNodeId === n.id ? ' current' : '') +
                (n.kind === 'boss' ? ' boss' : '')
              }
              style={{ left: `${n.col}%`, top: `${100 - (n.row / MAP_ROWS) * 100}%` }}
              disabled={!reachable.has(n.id)}
              onClick={() => enterNode(n.id)}
              title={NODE_LABEL[n.kind]}
            >
              {NODE_ICON[n.kind]}
            </button>
          ))}
        </div>
      </MinigameMenuShell>
    );
  }

  if (phase === 'node-rest') {
    const allCards = [...deckPile, ...hand, ...discardPile];
    const upgradeable = upgradeableTieredCards(allCards, cardTiers);
    const hasPendingLevelUp = pendingAttrPoint || pendingSkillPoint;
    return (
      <MinigameMenuShell title="🔥 Local de Descanso">
        <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
          Escolha uma opção — a vida não se recupera sozinha entre lutas.
        </p>
        {hasPendingLevelUp && (
          <div className="minigame-levelup">
            <p className="minigame-levelup-title">Você subiu para NEX {character.nex}%! Invista os pontos ganhos antes de continuar:</p>
            {pendingAttrPoint && (
              <div className="minigame-levelup-row">
                <span>Atributo:</span>
                {ATTRIBUTES.map((a) => {
                  const cur = character.attributes[a.key];
                  const cap = maxAttributeForNex(character.nex);
                  return (
                    <button key={a.key} className="small ghost" disabled={cur >= cap} onClick={() => spendLevelUpAttr(a.key)}>
                      {a.key} {cur}→{cur + 1}
                    </button>
                  );
                })}
              </div>
            )}
            {pendingSkillPoint && (
              <div className="minigame-levelup-row">
                <span>Perícia:</span>
                {COMBAT_SKILL_KEYS.map((k) => {
                  const idx = trainingIndex(character.skills[k]);
                  return (
                    <button key={k} className="small ghost" disabled={idx >= TRAINING_LEVELS.length - 1} onClick={() => spendLevelUpSkill(k)}>
                      {SKILL_BY_KEY[k].name} ({TRAINING_LEVELS[idx].label})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <button className="primary minigame-start-btn" onClick={restHeal} disabled={hasPendingLevelUp}>
          Descansar — recupera parte do PV perdido
        </button>
        {upgradeable.length > 0 && (
          <div className="minigame-upgrade-list">
            {upgradeable.map((c) => {
              const idx = tierIndexOf(c, cardTiers);
              const next = c.tiers[idx + 1];
              const icon = c.kind === 'ritual' ? '🔮' : '⚔️';
              return (
                <button
                  key={tierKeyOf(c)}
                  className="minigame-card minigame-upgrade-btn"
                  disabled={hasPendingLevelUp}
                  onClick={() => upgradeCard(c)}
                >
                  {icon} Evoluir {c.name}: {c.tiers[idx].label} → {next.label} ({next.damageDice}, {next.peCost} PE)
                </button>
              );
            })}
          </div>
        )}
      </MinigameMenuShell>
    );
  }

  if (phase === 'node-treasure') {
    const isRelicOffer = relicOffer.length > 0;
    return (
      <MinigameMenuShell title={isRelicOffer ? '🔮 Item Amaldiçoado' : '💰 Tesouro'} wide>
        <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
          {isRelicOffer
            ? 'Uma relíquia amaldiçoada pulsa entre os destroços. Escolha 1 — o efeito dela fica com você o resto da expedição.'
            : 'Escolha 1 carta pra somar ao seu baralho.'}
        </p>
        {isRelicOffer ? (
          <div className="minigame-deck-grid">
            {relicOffer.map((r) => (
              <button key={r.id} className="minigame-card minigame-relic-card" onClick={() => pickRelic(r)}>
                <div className="minigame-card-head">
                  <span>{r.name}</span>
                  <span className="minigame-card-icon">{r.icon}</span>
                </div>
                <span className={'minigame-card-rarity rarity-' + r.rarity}>{RARITY_LABEL[r.rarity]}</span>
                <p className="minigame-card-text">{r.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="minigame-deck-grid">
            {treasureOffer.map((c) => (
              <button key={c.id} className="minigame-card" onClick={() => pickTreasureCard(c)}>
                <CardFace card={c} />
              </button>
            ))}
          </div>
        )}
      </MinigameMenuShell>
    );
  }

  if (phase === 'node-unknown') {
    return (
      <MinigameMenuShell title="❓ Desconhecido" wide={unknownIsTreasure}>
        {unknownIsTreasure ? (
          <>
            <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
              Você encontra um baú esquecido, coberto de sigilos. Escolha 1 carta.
            </p>
            <div className="minigame-deck-grid">
              {treasureOffer.map((c) => (
                <button key={c.id} className="minigame-card" onClick={() => pickTreasureCard(c)}>
                  <CardFace card={c} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
              Uma fonte de sangue pulsa na parede — beber cura, mas o gosto é indescritível.
            </p>
            <button className="primary minigame-start-btn" onClick={restHeal}>
              Beber — recupera parte do PV perdido
            </button>
          </>
        )}
      </MinigameMenuShell>
    );
  }

  if (phase === 'run-complete') {
    return (
      <MinigameMenuShell title="Expedição Concluída!">
        <p className="daily-rule-box">Você derrotou o Zumbi de Sangue (Chefe) e sobreviveu à jornada inteira.</p>
        <button className="primary" onClick={reset}>
          Jogar de novo
        </button>
      </MinigameMenuShell>
    );
  }

  return (
    <div className="minigame-page" style={{ backgroundImage: `url(${'/minigame/bg-floresta.png'})` }}>
      <button className="small ghost minigame-exit" onClick={() => navigate('/')}>
        ← Sair
      </button>

      <div className={'minigame-monster-area' + (dragOverTarget ? ' drop-target' : '')} ref={monsterDropRef}>
        {intent && (
          <div className="minigame-intent">
            <span className="minigame-intent-icon">{intent.icon}</span>
            <span>{intent.label}</span>
            <span className="minigame-intent-dice">
              {intent.attackDiceCount}d20+{intent.attackBonus} atq{intent.attackCount && intent.attackCount > 1 ? ` ×${intent.attackCount}` : ''} · {intent.damageDice} dano
            </span>
          </div>
        )}
        <div className="minigame-hp-row">
          <span className="minigame-monster-name">{monster.name}</span>
          <div className="minigame-hp-bar">
            <div
              className="minigame-hp-fill"
              style={{ width: `${(monsterHp / monster.maxHp) * 100}%` }}
            />
          </div>
          <span className="minigame-hp-num">
            {monsterHp}/{monster.maxHp}
          </span>
        </div>
        <img className="minigame-monster-sprite" src={monster.sprite} alt={monster.name} />
      </div>

      {log[0] && <div className="minigame-log">{log[0].text}</div>}

      <div className="minigame-player-hud">
        <div className="minigame-hud-portrait-wrap">
          <div className="minigame-hud-portrait">{character.portrait ? <img src={character.portrait} alt="" /> : <GenericPortrait />}</div>
          <span className="minigame-hud-nex">{character.nex}</span>
        </div>
        <div className="minigame-hud-bars">
          <div className="minigame-hud-bar minigame-hud-bar-hp">
            <div className="minigame-hud-bar-fill" style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }} />
            <span className="minigame-hud-bar-name">
              {character.name} <span className="faint">({CLASS_BY_KEY[character.classe].name})</span>
            </span>
            <span className="minigame-hud-bar-num">
              {playerHp}/{playerMaxHp}
            </span>
          </div>
          <div className="minigame-hud-bar minigame-hud-bar-pe">
            <div className="minigame-hud-bar-fill" style={{ width: `${Math.max(0, (playerPe / playerMaxPe) * 100)}%` }} />
            <span className="minigame-hud-bar-num">
              PE {playerPe}/{playerMaxPe}
            </span>
          </div>
        </div>
      </div>

      <div className="minigame-pile minigame-pile-deck" title="Baralho de compra">
        <span className="minigame-pile-icon">🂠</span>
        <span className="minigame-pile-count">{deckPile.length}</span>
      </div>
      <div className="minigame-pile minigame-pile-discard" title="Pilha de descarte">
        <span className="minigame-pile-icon">🗑️</span>
        <span className="minigame-pile-count">{discardPile.length}</span>
      </div>

      <div className="minigame-bottom">
        {phase === 'intro' && (
          <button className="primary minigame-start-btn" onClick={rollInitiative}>
            🎲 Rolar iniciativa
          </button>
        )}

        {phase === 'initiative' && initiativeResult && (
          <div className="minigame-initiative-result">
            Você {initiativeResult.player} × {monster.name} {initiativeResult.monster}
          </div>
        )}

        {(phase === 'player-turn' || phase === 'monster-intent' || phase === 'monster-attack') && (
          <>
            <div className="minigame-turn-row">
              <span className="minigame-turn-count">
                Cartas jogadas: {cardsPlayedThisTurn}/{effectiveMaxCardsPerTurn}
              </span>
              {dodgeBonus > 0 && <span className="minigame-dodge-badge">🛡️ Esquiva +{dodgeBonus}</span>}
              <button className="small ghost" disabled={phase !== 'player-turn'} onClick={endTurn}>
                Encerrar turno
              </button>
            </div>
            <div className="minigame-hand">
              {hand.map((c) => (
                <button
                  key={c.id}
                  className={'minigame-card' + (dragCardId === c.id ? ' dragging' : '')}
                  disabled={phase !== 'player-turn' || playerPe < effectivePeCost(c, cardTiers) || cardsPlayedThisTurn >= effectiveMaxCardsPerTurn}
                  onClick={() => (c.kind === 'heal' || c.kind === 'dodge') && playCard(c)}
                  onPointerDown={(e) => onCardPointerDown(e, c)}
                >
                  <CardFace card={c} cardTiers={cardTiers} />
                  {c.kind !== 'heal' && c.kind !== 'dodge' && <span className="minigame-card-drag-hint">arraste até o inimigo</span>}
                </button>
              ))}
            </div>
          </>
        )}
        {dragCardId &&
          dragPos &&
          (() => {
            const draggedCard = hand.find((c) => c.id === dragCardId);
            if (!draggedCard) return null;
            return (
              <div className="minigame-drag-ghost" style={{ left: dragPos.x, top: dragPos.y }}>
                <CardFace card={draggedCard} cardTiers={cardTiers} />
              </div>
            );
          })()}

        {(phase === 'victory' || phase === 'defeat') && (
          <div className="minigame-end">
            <div className="minigame-end-title">{phase === 'victory' ? 'Vitória!' : 'Você caiu…'}</div>
            <button className="primary" onClick={phase === 'victory' ? returnToMap : reset}>
              {phase === 'victory' ? 'Continuar' : 'Jogar de novo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
