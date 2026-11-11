// Poderes de Classe — Ordem Paranormal RPG (livro básico, Tabelas 1.3/1.4/1.5).
// Em NEX 15% e a cada 15% depois (30/45/60/75/90), o personagem escolhe um poder
// da lista da sua classe. Resumos são paráfrase própria — o texto integral e os
// pré-requisitos completos estão no livro; aqui só o essencial pra guiar a ficha.

import type { ClassKey } from './ordem';

export const CLASS_POWER_NEX_SLOTS = [15, 30, 45, 60, 75, 90] as const;

export interface ClassPowerDef {
  key: string;
  name: string;
  summary: string;
  prereq?: string;
  repeatable?: boolean; // pode escolher de novo em outro slot (ex.: Treinamento em Perícia)
  needsSkills?: number; // exige escolher N perícias (aplica treino automaticamente)
  needsElement?: boolean; // exige escolher um elemento
  isTranscend?: boolean; // usa a lista de Poderes Paranormais (página 114)
  onlyAtNex?: number; // só aparece nesse slot específico (ex.: Versatilidade em 50%)
}

const TRANSCENDER: ClassPowerDef = {
  key: 'transcender',
  name: 'Transcender',
  summary:
    'Escolha um poder paranormal (Conhecimento/Energia/Morte/Sangue). Você ganha o poder, mas não recebe a Sanidade deste aumento de NEX.',
  repeatable: true,
  isTranscend: true,
};

const TREINAMENTO_PERICIA: ClassPowerDef = {
  key: 'treinamento-pericia',
  name: 'Treinamento em Perícia',
  summary:
    'Escolha duas perícias e se torna treinado nelas (a partir de NEX 35% pode virar veterano perícias já treinadas; a partir de 70%, expert).',
  repeatable: true,
  needsSkills: 2,
};

const VERSATILIDADE: ClassPowerDef = {
  key: 'versatilidade',
  name: 'Versatilidade',
  summary:
    'Em vez de um poder de classe, ganhe o primeiro poder (NEX 10%) de uma trilha da sua classe diferente da que já escolheu.',
  onlyAtNex: 50,
};

export const CLASS_POWERS: Record<ClassKey, ClassPowerDef[]> = {
  combatente: [
    {
      key: 'armamento-pesado',
      name: 'Armamento Pesado',
      summary: 'Ganha proficiência com armas pesadas.',
      prereq: 'Força 2',
    },
    {
      key: 'artista-marcial',
      name: 'Artista Marcial',
      summary:
        'Ataques desarmados causam 1d6 (letal, ágil); sobe pra 1d8 em NEX 35% e 1d10 em NEX 70%.',
    },
    {
      key: 'ataque-oportunidade',
      name: 'Ataque de Oportunidade',
      summary:
        'Quando alguém sai de um espaço adjacente a você, gaste uma reação + 1 PE para atacá-lo corpo a corpo.',
    },
    {
      key: 'duas-armas',
      name: 'Combater com Duas Armas',
      summary:
        'Empunhando duas armas (uma leve), pode atacar com as duas na mesma ação, sofrendo −O em todos os ataques até o próximo turno.',
      prereq: 'Agilidade 3, treinado em Luta ou Pontaria',
    },
    {
      key: 'combate-defensivo',
      name: 'Combate Defensivo',
      summary: 'Ao agredir, pode lutar defensivamente: −O em ataque, mas +5 em Defesa até o próximo turno.',
      prereq: 'Intelecto 2',
    },
    {
      key: 'golpe-demolidor',
      name: 'Golpe Demolidor',
      summary: 'Ao quebrar ou atacar um objeto, gaste 1 PE para causar +2 dados de dano extra.',
      prereq: 'Força 2, treinado em Luta',
    },
    {
      key: 'golpe-pesado',
      name: 'Golpe Pesado',
      summary: 'Armas corpo a corpo empunhadas causam +1 dado de dano do mesmo tipo.',
    },
    {
      key: 'incansavel',
      name: 'Incansável',
      summary:
        'Uma vez por cena, gaste 2 PE para uma ação de investigação extra (usando Força ou Agilidade como base).',
    },
    {
      key: 'presteza-atletica',
      name: 'Presteza Atlética',
      summary:
        'Ao facilitar investigação, gaste 1 PE para usar Força/Agilidade no lugar do atributo da perícia.',
    },
    {
      key: 'protecao-pesada',
      name: 'Proteção Pesada',
      summary: 'Ganha proficiência com proteções pesadas.',
      prereq: 'NEX 30%',
    },
    {
      key: 'reflexos-defensivos',
      name: 'Reflexos Defensivos',
      summary: '+2 em Defesa e em testes de resistência.',
      prereq: 'Agilidade 2',
    },
    {
      key: 'saque-rapido',
      name: 'Saque Rápido',
      summary: 'Sacar/guardar itens vira ação livre; recarregar arma vira ação livre uma vez por rodada.',
      prereq: 'Treinado em Iniciativa',
    },
    {
      key: 'segurar-gatilho',
      name: 'Segurar o Gatilho',
      summary:
        'Ao acertar com arma de fogo, pode fazer outro ataque contra o mesmo alvo pagando PE crescente por ataque extra.',
      prereq: 'NEX 60%',
    },
    {
      key: 'sentido-tatico',
      name: 'Sentido Tático',
      summary:
        'Gaste ação de movimento + 2 PE para receber bônus em Defesa/resistência igual ao Intelecto até o fim da cena.',
      prereq: 'Intelecto 2, treinado em Percepção e Tática',
    },
    {
      key: 'tanque-guerra',
      name: 'Tanque de Guerra',
      summary: 'Usando proteção pesada, a Defesa e resistência a dano dela aumentam em +2.',
      prereq: 'Proteção Pesada',
    },
    {
      key: 'tiro-certeiro',
      name: 'Tiro Certeiro',
      summary: 'Soma Agilidade no dano de armas de disparo e ignora penalidade contra alvos em corpo a corpo.',
      prereq: 'Treinado em Pontaria',
    },
    {
      key: 'tiro-cobertura',
      name: 'Tiro de Cobertura',
      summary:
        'Gaste ação padrão + 1 PE para forçar um alvo a se proteger (teste de Pontaria x Vontade); se vencer, ele fica preso no lugar e sofre −5 em ataques.',
    },
    TRANSCENDER,
    TREINAMENTO_PERICIA,
    VERSATILIDADE,
    {
      key: 'paranoia-defensiva',
      name: 'Paranoia Defensiva',
      summary:
        '1x/cena, gasta 1 rodada + 3 PE para você e cada aliado presente escolherem entre +5 na Defesa contra o próximo ataque na cena ou +5 num teste de perícia até o fim da cena.',
    },
    {
      key: 'sacrificar-joelhos',
      name: 'Sacrificar os Joelhos',
      summary: 'Em cena de perseguição, ao fazer esforço extra, gasta 2 PE pra passar automaticamente no teste.',
      prereq: 'Treinado em Atletismo',
    },
    {
      key: 'sem-tempo-irmao',
      name: 'Sem Tempo, Irmão',
      summary:
        '1x/cena de investigação, ao usar facilitar investigação, passa automaticamente no teste de ajudar, mas faz uma rolagem adicional na tabela de eventos de investigação.',
    },
    {
      key: 'valentao',
      name: 'Valentão',
      summary:
        'Pode usar Força no lugar de Presença para Intimidação; 1x/cena, gasta 1 PE pra testar Intimidação pra assustar como ação livre.',
    },
    {
      key: 'apego-angustiado',
      name: 'Apego Angustiado',
      summary:
        'Não fica inconsciente por estar morrendo; sempre que termina uma rodada nessa condição e consciente, perde 2 pontos de Sanidade.',
    },
    {
      key: 'caminho-forca',
      name: 'Caminho para Força',
      summary:
        'Ao usar a ação sacrifício numa cena de perseguição, gasta 1 PE pra fornecer +O extra (total +2O) nos testes dos outros personagens; ao usar chamar atenção numa cena de furtividade, gasta 1 PE pra diminuir a visibilidade dos aliados próximos em –2 (em vez de –1).',
    },
    {
      key: 'ciente-cicatrizes',
      name: 'Ciente das Cicatrizes',
      summary:
        'Em teste pra encontrar uma pista relacionada a armas ou ferimentos (ex. necropsia, identificar arma amaldiçoada), pode usar Luta ou Pontaria no lugar da perícia original.',
      prereq: 'Treinado em Luta ou Pontaria',
    },
    {
      key: 'correria-desesperada',
      name: 'Correria Desesperada',
      summary: 'Deslocamento +3m e +O em testes de perícia pra fugir numa perseguição.',
    },
    {
      key: 'engolir-choro',
      name: 'Engolir o Choro',
      summary: 'Não sofre penalidades por condições em testes de perícia pra fugir e em testes de Furtividade.',
    },
    {
      key: 'instinto-fuga',
      name: 'Instinto de Fuga',
      summary: 'Quando uma cena de perseguição (ou semelhante) começa, +2 em todos os testes de perícia que fizer durante ela.',
      prereq: 'Treinado em Intuição',
    },
    {
      key: 'mochileiro',
      name: 'Mochileiro',
      summary: 'Limite de carga +5 espaços; pode se beneficiar de uma vestimenta adicional ao mesmo tempo.',
      prereq: 'Vigor 2',
    },
  ],
  especialista: [
    {
      key: 'artista-marcial',
      name: 'Artista Marcial',
      summary:
        'Ataques desarmados causam 1d6 (letal, ágil); sobe pra 1d8 em NEX 35% e 1d10 em NEX 70%.',
    },
    {
      key: 'balistica-avancada',
      name: 'Balística Avançada',
      summary: 'Proficiência com armas táticas de fogo e +2 no dano com armas de fogo.',
    },
    {
      key: 'conhecimento-aplicado',
      name: 'Conhecimento Aplicado',
      summary: 'Gaste 2 PE para trocar o atributo-base de um teste de perícia (exceto Luta/Pontaria) por Intelecto.',
      prereq: 'Intelecto 2',
    },
    {
      key: 'hacker',
      name: 'Hacker',
      summary: '+5 em Tecnologia para invadir sistemas e reduz o tempo de hackear pra uma ação completa.',
      prereq: 'Treinado em Tecnologia',
    },
    {
      key: 'maos-rapidas',
      name: 'Mãos Rápidas',
      summary: 'Testes de Crime podem ser feitos como ação livre pagando 1 PE.',
      prereq: 'Agilidade 3, treinado em Crime',
    },
    {
      key: 'mochila-utilidades',
      name: 'Mochila de Utilidades',
      summary: 'Um item (não-arma) à sua escolha conta como uma categoria abaixo e ocupa 1 espaço a menos.',
    },
    {
      key: 'movimento-tatico',
      name: 'Movimento Tático',
      summary: 'Gaste 1 PE para ignorar penalidade de terreno difícil/escalada até o fim do turno.',
      prereq: 'Treinado em Atletismo',
    },
    {
      key: 'na-trilha-certa',
      name: 'Na Trilha Certa',
      summary: 'Ao ter sucesso procurando pistas, gaste PE para acumular bônus no próximo teste de pista.',
    },
    {
      key: 'nerd',
      name: 'Nerd',
      summary:
        'Uma vez por cena, gaste 2 PE e teste Atualidades (DT 20) pra conseguir uma informação útil pra cena.',
    },
    {
      key: 'ninja-urbano',
      name: 'Ninja Urbano',
      summary:
        'Proficiência com armas táticas corpo a corpo/disparo (exceto fogo) e +2 no dano com elas.',
    },
    {
      key: 'pensamento-agil',
      name: 'Pensamento Ágil',
      summary: 'Uma vez por rodada em cena de investigação, gaste 2 PE para uma ação de procurar pistas extra.',
    },
    {
      key: 'perito-explosivos',
      name: 'Perito em Explosivos',
      summary: 'Soma Intelecto na DT dos seus explosivos e pode excluir alvos da explosão (igual ao Intelecto).',
    },
    {
      key: 'primeira-impressao',
      name: 'Primeira Impressão',
      summary: '+OO no primeiro teste de Diplomacia/Enganação/Intimidação/Intuição de uma cena.',
    },
    TRANSCENDER,
    TREINAMENTO_PERICIA,
    VERSATILIDADE,
    {
      key: 'esconderijo-desesperado',
      name: 'Esconderijo Desesperado',
      summary:
        'Sem penalidade de Furtividade ao se mover no deslocamento normal; em cena de furtividade, ao passar num teste pra se esconder, a visibilidade cai –2 em vez de –1.',
    },
    {
      key: 'especialista-diletante',
      name: 'Especialista Diletante',
      summary: 'Aprende um poder que não seja da própria classe (exceto trilha/paranormal) à escolha, cumprindo pré-requisitos.',
      prereq: 'NEX 30%',
    },
    {
      key: 'flashback',
      name: 'Flashback',
      summary: 'Escolhe uma origem que não é a sua e ganha o poder dela.',
    },
    {
      key: 'leitura-fria',
      name: 'Leitura Fria',
      summary:
        '1x por interlúdio, interagindo alguns minutos com alguém, faz 3 perguntas pessoais; cada pergunta não respondida pelo mestre dá 2 PE temporários até o fim da missão (só funciona 1x por NPC).',
      prereq: 'Treinado em Intuição',
    },
    {
      key: 'maos-firmes',
      name: 'Mãos Firmes',
      summary: 'Em teste de Furtividade pra se esconder ou ação discreta manipulando objeto, gasta 2 PE pra +O no teste.',
      prereq: 'Treinado em Furtividade',
    },
    {
      key: 'acolher-terror',
      name: 'Acolher o Terror',
      summary: 'Pode se entregar ao medo uma vez por sessão adicional.',
    },
    {
      key: 'contatos-oportunos',
      name: 'Contatos Oportunos',
      summary:
        'Ação de interlúdio pra acionar um contato e ganhar um aliado à escolha (1 por vez), até ser dispensado ou fim da missão.',
      prereq: 'Treinado em Crime',
    },
    {
      key: 'disfarce-sutil',
      name: 'Disfarce Sutil',
      summary: 'Ao se disfarçar com Enganação, gasta 1 PE pra fazer como ação completa sem kit (com kit, +5 no teste).',
      prereq: 'Presença 2, treinado em Enganação',
    },
    {
      key: 'plano-fuga',
      name: 'Plano de Fuga',
      summary:
        'Usa Intelecto no lugar de Força pra criar obstáculos numa perseguição; 1x/cena, gasta 2 PE pra passar automaticamente nessa ação sem testar.',
    },
    {
      key: 'remoer-memorias',
      name: 'Remoer Memórias',
      summary: '1x/cena, em teste de perícia baseado em Intelecto ou Presença, gasta 2 PE pra substituir por um teste de Intelecto DT 15.',
      prereq: 'Intelecto 1',
    },
    {
      key: 'resistir-pressao',
      name: 'Resistir à Pressão',
      summary:
        '1x/cena de investigação, gasta 5 PE pra aumentar a urgência em 1 rodada; nessa rodada todos (incluindo você) recebem +2 em perícia.',
      prereq: 'Treinado em Investigação',
    },
  ],
  ocultista: [
    {
      key: 'camuflar-ocultismo',
      name: 'Camuflar Ocultismo',
      summary:
        'Esconde símbolos ritualísticos e, gastando +2 PE, lança rituais sem componentes nem gestos (só concentração).',
    },
    {
      key: 'criar-selo',
      name: 'Criar Selo',
      summary: 'Fabrica selos paranormais de rituais conhecidos; pode manter selos criados igual à Presença.',
    },
    {
      key: 'envolto-misterio',
      name: 'Envolto em Mistério',
      summary: '+5 em Enganação e Intimidação contra quem não é treinado em Ocultismo.',
    },
    {
      key: 'especialista-elemento',
      name: 'Especialista em Elemento',
      summary: 'Escolha um elemento; a DT para resistir aos seus rituais desse elemento aumenta em +2.',
      needsElement: true,
    },
    {
      key: 'ferramentas-paranormais',
      name: 'Ferramentas Paranormais',
      summary: 'Reduz a categoria de um item paranormal em I e pode ativá-lo sem pagar seu custo em PE.',
    },
    {
      key: 'fluxo-poder',
      name: 'Fluxo de Poder',
      summary: 'Mantém dois efeitos sustentados de rituais ao mesmo tempo com uma única ação livre.',
      prereq: 'NEX 60%',
    },
    {
      key: 'guiado-paranormal',
      name: 'Guiado pelo Paranormal',
      summary: 'Uma vez por cena, gaste 2 PE para uma ação de investigação extra.',
    },
    {
      key: 'identificacao-paranormal',
      name: 'Identificação Paranormal',
      summary: '+10 em Ocultismo para identificar criaturas, objetos ou rituais.',
    },
    {
      key: 'improvisar-componentes',
      name: 'Improvisar Componentes',
      summary: 'Uma vez por cena, teste Investigação (DT 15) para achar componentes ritualísticos de um elemento.',
    },
    {
      key: 'intuicao-paranormal',
      name: 'Intuição Paranormal',
      summary: 'Ao facilitar investigação, soma Intelecto ou Presença (à escolha) no teste.',
    },
    {
      key: 'mestre-elemento',
      name: 'Mestre em Elemento',
      summary: 'Escolha um elemento (já Especialista nele); o custo de rituais desse elemento cai em −1 PE.',
      prereq: 'Especialista em Elemento no mesmo elemento, NEX 45%',
      needsElement: true,
    },
    {
      key: 'ritual-potente',
      name: 'Ritual Potente',
      summary: 'Soma Intelecto nas rolagens de dano/cura dos seus rituais.',
      prereq: 'Intelecto 2',
    },
    {
      key: 'ritual-predileto',
      name: 'Ritual Predileto',
      summary: 'Escolha um ritual conhecido; o custo dele cai em −1 PE (acumula com outras reduções).',
    },
    {
      key: 'tatuagem-ritualistica',
      name: 'Tatuagem Ritualística',
      summary: 'Rituais de alcance pessoal que têm você como alvo custam −1 PE.',
    },
    TRANSCENDER,
    TREINAMENTO_PERICIA,
    VERSATILIDADE,
    {
      key: 'sussurros-guiam',
      name: 'Deixe os Sussurros Guiarem',
      summary:
        '1x/cena, gasta 2 PE + 1 rodada pra +2 em perícias de investigação até o fim da cena; enquanto ativo, cada falha em teste de perícia custa 1 de Sanidade.',
    },
    {
      key: 'dominio-esoterico',
      name: 'Domínio Esotérico',
      summary: 'Ao conjurar um ritual, pode combinar os efeitos de até 2 catalisadores ritualísticos diferentes ao mesmo tempo.',
      prereq: 'Intelecto 3',
    },
    {
      key: 'estalos-macabros',
      name: 'Estalos Macabros',
      summary: 'Em ação pra distrair ou fintar, gasta 1 PE pra usar Ocultismo no lugar da perícia original; +5 se o alvo é pessoa ou animal.',
    },
    {
      key: 'minha-dor-impulsiona',
      name: 'Minha Dor me Impulsiona',
      summary: 'Em teste de Acrobacia, Atletismo ou Furtividade tendo sofrido ao menos 5 de dano, gasta 1 PE pra +1d6 no teste.',
      prereq: 'Vigor 2',
    },
    {
      key: 'olhos-monstro',
      name: 'Nos Olhos do Monstro',
      summary: 'Gasta 1 rodada + 3 PE encarando os olhos de uma criatura paranormal visível pra +5 em testes contra ela (exceto ataque) até o fim da cena.',
    },
    {
      key: 'olhar-sinistro',
      name: 'Olhar Sinistro',
      summary: 'Usa Presença no lugar de Intelecto para Ocultismo; pode usar Ocultismo pra coagir, como Intimidação.',
      prereq: 'Presença 1',
    },
    {
      key: 'sentido-premonitorio',
      name: 'Sentido Premonitório',
      summary:
        'Gasta 3 PE pra ativar um sentido que dá déjà vu de 1 rodada no futuro próximo (eventos de investigação, ações inimigas em furtividade/perseguição); não funciona em combate; custa 1 PE por rodada pra manter.',
    },
    {
      key: 'sincronia-paranormal',
      name: 'Sincronia Paranormal',
      summary:
        'Gasta ação padrão + 2 PE pra sincronizar mentalmente com aliados em alcance médio que já sobreviveram a um encontro paranormal com você; no início de cada rodada distribui O de bônus (igual à Presença) entre eles pra testes de Intelecto/Presença; custa 1 PE por rodada pra manter.',
      prereq: 'Presença 2',
    },
    {
      key: 'tracado-conjuratorio',
      name: 'Traçado Conjuratório',
      summary:
        'Gasta 1 PE + ação completa pra traçar um símbolo de 1,5m no chão; dentro dele, +2 em Ocultismo e testes de resistência, e a DT dos seus rituais aumenta em +2; dura até o fim da cena.',
    },
  ],
};
