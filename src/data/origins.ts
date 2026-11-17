// Origens do livro básico de Ordem Paranormal RPG (Tabela 1.1).
// Cada origem concede 2 perícias treinadas + 1 poder.
// Os resumos de poder são descrições curtas próprias — o texto completo está no livro.

export interface OriginDef {
  name: string;
  /** chaves de perícia (ver SKILLS em ./ordem) ou 'choice' quando são livres (Amnésico) */
  skills: [string, string] | 'choice';
  power: string;
  powerNote: string;
}

export const ORIGIN_LIST: OriginDef[] = [
  {
    name: 'Acadêmico',
    skills: ['ciencias', 'investigacao'],
    power: 'Saber é Poder',
    powerNote: 'Gasta PE em testes de Intelecto para receber um bônus.',
  },
  {
    name: 'Agente de Saúde',
    skills: ['intuicao', 'medicina'],
    power: 'Técnica Medicinal',
    powerNote: 'Ao curar alguém, soma seu Intelecto ao total de PV recuperados.',
  },
  {
    name: 'Amnésico',
    skills: 'choice',
    power: 'Vislumbres do Passado',
    powerNote: 'Uma vez por sessão, "lembra" de algo útil (a critério do mestre).',
  },
  {
    name: 'Artista',
    skills: ['artes', 'enganacao'],
    power: 'Magnum Opus',
    powerNote: 'É famoso por uma obra; bônus social com quem te reconhece.',
  },
  {
    name: 'Atleta',
    skills: ['acrobacia', 'atletismo'],
    power: '110%',
    powerNote: 'Gasta PE para bônus em testes de Força ou Agilidade.',
  },
  {
    name: 'Chef',
    skills: ['fortitude', 'profissao'],
    power: 'Ingrediente Secreto',
    powerNote: 'Prepara refeições que dão bônus temporários aos aliados.',
  },
  {
    name: 'Criminoso',
    skills: ['crime', 'furtividade'],
    power: 'O Crime Compensa',
    powerNote: 'Ganha crédito/recursos extras ao fim de uma missão.',
  },
  {
    name: 'Cultista Arrependido',
    skills: ['ocultismo', 'religiao'],
    power: 'Traços do Outro Lado',
    powerNote: 'Começa com um poder paranormal, mas com metade da Sanidade da classe.',
  },
  {
    name: 'Desgarrado',
    skills: ['fortitude', 'sobrevivencia'],
    power: 'Calejado',
    powerNote: 'Recebe +1 PV para cada 5% de NEX.',
  },
  {
    name: 'Engenheiro',
    skills: ['profissao', 'tecnologia'],
    power: 'Ferramenta Favorita',
    powerNote: 'Um item à escolha ganha bônus quando usado por você.',
  },
  {
    name: 'Executivo',
    skills: ['diplomacia', 'profissao'],
    power: 'Processo Otimizado',
    powerNote: 'Gasta PE para agir com mais eficiência em testes.',
  },
  {
    name: 'Investigador',
    skills: ['investigacao', 'percepcao'],
    power: 'Faro para Pistas',
    powerNote: 'Uma vez por cena, +5 num teste para encontrar pistas.',
  },
  {
    name: 'Lutador',
    skills: ['luta', 'reflexos'],
    power: 'Mão Pesada',
    powerNote: 'Recebe +2 em rolagens de dano corpo a corpo.',
  },
  {
    name: 'Magnata',
    skills: ['diplomacia', 'pilotagem'],
    power: 'Patrocinador da Ordem',
    powerNote: 'Seu limite de crédito é sempre considerado um nível acima.',
  },
  {
    name: 'Mercenário',
    skills: ['iniciativa', 'intimidacao'],
    power: 'Posição de Combate',
    powerNote: 'Bônus no primeiro turno de cada combate.',
  },
  {
    name: 'Militar',
    skills: ['pontaria', 'tatica'],
    power: 'Para Bellum',
    powerNote: 'Recebe +2 em rolagens de dano com armas de fogo.',
  },
  {
    name: 'Operário',
    skills: ['fortitude', 'profissao'],
    power: 'Ferramenta de Trabalho',
    powerNote: 'Escolhe uma arma de trabalho que conta como proficiente e improvisada aprimorada.',
  },
  {
    name: 'Policial',
    skills: ['percepcao', 'pontaria'],
    power: 'Patrulha',
    powerNote: 'Recebe +2 em Defesa.',
  },
  {
    name: 'Religioso',
    skills: ['religiao', 'vontade'],
    power: 'Acalentar',
    powerNote: '+5 em testes de Religião para acalmar ou confortar alguém.',
  },
  {
    name: 'Servidor Público',
    skills: ['intuicao', 'vontade'],
    power: 'Espírito Cívico',
    powerNote: 'Bônus em testes feitos para ajudar/proteger outras pessoas.',
  },
  {
    name: 'Teórico da Conspiração',
    skills: ['investigacao', 'ocultismo'],
    power: 'Eu Já Sabia',
    powerNote: 'Abala-se menos ao encontrar entidades e fenômenos paranormais.',
  },
  {
    name: 'T.I.',
    skills: ['investigacao', 'tecnologia'],
    power: 'Motor de Busca',
    powerNote: 'A critério do mestre, sabe uma informação útil pesquisável.',
  },
  {
    name: 'Trabalhador Rural',
    skills: ['adestramento', 'sobrevivencia'],
    power: 'Desbravador',
    powerNote: 'Bônus em testes de Adestramento e para se orientar/mover no ermo.',
  },
  {
    name: 'Trambiqueiro',
    skills: ['crime', 'enganacao'],
    power: 'Impostor',
    powerNote: 'Uma vez por cena, gasta 2 PE para um golpe de Enganação mais eficaz.',
  },
  {
    name: 'Universitário',
    skills: ['atualidades', 'investigacao'],
    power: 'Dedicação',
    powerNote: 'Recebe +1 PE e mais 1 PE a cada NEX ímpar.',
  },
  {
    name: 'Vítima',
    skills: ['reflexos', 'vontade'],
    power: 'Cicatrizes Psicológicas',
    powerNote: 'Recebe +1 de Sanidade máxima e resiste melhor ao medo.',
  },
  // --- Suplemento "Sobrevivendo ao Horror" (Tabela 1.1: Novas Origens,
  // págs. 7-13) — texto completo lido e conferido direto do PDF nesta
  // leva (antes só tínhamos o nome do poder; os resumos abaixo são
  // paráfrase própria do texto real, no mesmo padrão das origens do
  // livro básico acima — não é mais um resumo "genérico plausível" a
  // partir só do nome).
  {
    name: 'Amigo dos Animais',
    skills: ['adestramento', 'percepcao'],
    power: 'Companheiro Animal',
    powerNote:
      'Tem um animal aliado que dá bônus crescente com o NEX: +2 numa perícia, depois o bônus de um tipo de aliado, depois a habilidade desse aliado.',
  },
  {
    name: 'Astronauta',
    skills: ['ciencias', 'fortitude'],
    power: 'Acostumado ao Extremo',
    powerNote:
      'Gasta PE para reduzir em 5 o dano de fogo, frio ou mental sofrido (custo sobe a cada uso na mesma cena).',
  },
  {
    name: 'Chef do Outro Lado',
    skills: ['ocultismo', 'profissao'],
    power: 'Fome do Outro Lado',
    powerNote:
      'Usa partes de criaturas do Outro Lado como ingrediente pra preparar um prato com efeito variável (RD ou vulnerabilidade), a um custo permanente de Sanidade.',
  },
  {
    name: 'Colegial',
    skills: ['atualidades', 'tecnologia'],
    power: 'Poder da Amizade',
    powerNote:
      'Perto do seu melhor amigo (trocando olhares), recebe +2 em todos os testes de perícia; perde PE máximo se ele morrer.',
  },
  {
    name: 'Cosplayer',
    skills: ['artes', 'vontade'],
    power: 'Não é fantasia, é cosplay!',
    powerNote:
      'Usa Artes no lugar de Enganação pra se disfarçar; +2 em testes relacionados ao cosplay que estiver usando.',
  },
  {
    name: 'Diplomata',
    skills: ['atualidades', 'diplomacia'],
    power: 'Conexões',
    powerNote:
      '+2 em Diplomacia. Também pode gastar PE e tempo contatando um NPC pra substituir um teste de perícia por Diplomacia.',
  },
  {
    name: 'Explorador',
    skills: ['fortitude', 'sobrevivencia'],
    power: 'Manual do Sobrevivente',
    powerNote:
      'Gasta PE pra +5 em testes de resistência a armadilha/clima/doença/fome/sede/sufocamento/veneno; sono precário conta como normal.',
  },
  {
    name: 'Experimento',
    skills: ['atletismo', 'fortitude'],
    power: 'Mutação',
    powerNote:
      'Resistência a dano 2 e +2 numa perícia à escolha baseada em Força/Agilidade/Vigor, mas −O em Diplomacia.',
  },
  {
    name: 'Fanático por Criaturas',
    skills: ['investigacao', 'ocultismo'],
    power: 'Conhecimento Oculto',
    powerNote:
      'Usa Ocultismo pra identificar criatura a partir de pistas indiretas (sem saber o tipo exato); +2 contra ela até o fim da missão.',
  },
  {
    name: 'Fotógrafo',
    skills: ['artes', 'percepcao'],
    power: 'Através da Lente',
    powerNote: 'Gasta PE pra +5 em Investigação/Percepção ao buscar pistas através de câmera/fotos.',
  },
  {
    name: 'Inventor Paranormal',
    skills: ['profissao', 'vontade'],
    power: 'Invenção Paranormal',
    powerNote:
      'Tem um invento que replica um ritual de 1º círculo escolhido, ativado com um teste de Profissão (engenheiro).',
  },
  {
    name: 'Jovem Místico',
    skills: ['ocultismo', 'religiao'],
    power: 'A Culpa é das Estrelas',
    powerNote: 'Gasta PE e rola 1d6 contra um número da sorte por +2 em testes de perícia até o fim da cena.',
  },
  {
    name: 'Legista do Turno da Noite',
    skills: ['ciencias', 'medicina'],
    power: 'Luto Habitual',
    powerNote:
      'Sofre só metade do dano mental em cenas ligadas à rotina de necrotério; gasta PE pra +5 em Medicina (primeiros socorros/necropsia).',
  },
  {
    name: 'Mateiro',
    skills: ['percepcao', 'sobrevivencia'],
    power: 'Mapa Celeste',
    powerNote: 'Nunca se perde vendo o céu; gasta PE pra rolar de novo um teste de Sobrevivência.',
  },
  {
    name: 'Mergulhador',
    skills: ['atletismo', 'fortitude'],
    power: 'Fôlego de Nadador',
    powerNote:
      '+5 PV; prende a respiração por 2×Vigor rodadas; nadando, avança o deslocamento normal (não à metade).',
  },
  {
    name: 'Motorista',
    skills: ['pilotagem', 'reflexos'],
    power: 'Mãos no Volante',
    powerNote:
      'Sem penalidade de ataque num veículo em movimento; pilotando, gasta PE pra +5 em Pilotagem ou num teste de resistência.',
  },
  {
    name: 'Nerd Entusiasta',
    skills: ['ciencias', 'tecnologia'],
    power: 'O Inteligentão',
    powerNote: 'O dado de bônus da ação de interlúdio ler sobe de 1d6 pra 2d6.',
  },
  {
    name: 'Profetizado',
    skills: 'choice',
    power: 'Luta ou Fuga',
    powerNote:
      '+2 em Vontade. Ao encontrar uma referência à própria premonição de morte, ganha +2 PE temporários até o fim da cena.',
  },
  {
    name: 'Psicólogo',
    skills: ['intuicao', 'profissao'],
    power: 'Terapia',
    powerNote:
      'Usa Profissão (psicólogo) como Diplomacia; gasta PE pra usar esse teste no lugar de um teste de resistência a dano mental falho (seu ou de aliado próximo).',
  },
  {
    name: 'Repórter Investigativo',
    skills: ['atualidades', 'investigacao'],
    power: 'Encontrar a Verdade',
    powerNote: 'Usa Investigação no lugar de Diplomacia pra persuadir; gasta PE pra +5 em Investigação.',
  },
];

export const ORIGIN_BY_NAME: Record<string, OriginDef> = Object.fromEntries(
  ORIGIN_LIST.map((o) => [o.name, o]),
);

// mantido para o datalist / compat
export const ORIGINS: string[] = ORIGIN_LIST.map((o) => o.name);
