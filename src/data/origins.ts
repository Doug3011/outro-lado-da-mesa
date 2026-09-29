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
];

export const ORIGIN_BY_NAME: Record<string, OriginDef> = Object.fromEntries(
  ORIGIN_LIST.map((o) => [o.name, o]),
);

// mantido para o datalist / compat
export const ORIGINS: string[] = ORIGIN_LIST.map((o) => o.name);
