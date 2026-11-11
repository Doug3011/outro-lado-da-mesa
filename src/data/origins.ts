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
  // --- Suplemento "Sobrevivendo ao Horror" (Tabela de novas origens) ---
  // Para estas 20 origens só temos o NOME do poder (não a descrição completa
  // do livro) — powerNote fica como resumo genérico plausível a partir do
  // nome, sem inventar mecânica numérica específica.
  {
    name: 'Amigo dos Animais',
    skills: ['adestramento', 'percepcao'],
    power: 'Companheiro Animal',
    powerNote: 'Poder de origem: Companheiro Animal — tem um animal aliado ao seu lado.',
  },
  {
    name: 'Astronauta',
    skills: ['ciencias', 'fortitude'],
    power: 'Acostumado ao Extremo',
    powerNote: 'Poder de origem: Acostumado ao Extremo — resiste melhor a condições ambientais extremas.',
  },
  {
    name: 'Chef do Outro Lado',
    skills: ['ocultismo', 'profissao'],
    power: 'Fome do Outro Lado',
    powerNote: 'Poder de origem: Fome do Outro Lado — pratos com um toque paranormal.',
  },
  {
    name: 'Colegial',
    skills: ['atualidades', 'tecnologia'],
    power: 'Poder da Amizade',
    powerNote: 'Poder de origem: Poder da Amizade — bônus ligado a agir junto de aliados/amigos.',
  },
  {
    name: 'Cosplayer',
    skills: ['artes', 'vontade'],
    power: 'Não é fantasia, é cosplay!',
    powerNote: 'Poder de origem: Não é fantasia, é cosplay! — ganha algo do personagem que está interpretando.',
  },
  {
    name: 'Diplomata',
    skills: ['atualidades', 'diplomacia'],
    power: 'Conexões',
    powerNote: 'Poder de origem: Conexões — tem contatos úteis a quem recorrer.',
  },
  {
    name: 'Explorador',
    skills: ['fortitude', 'sobrevivencia'],
    power: 'Manual do Sobrevivente',
    powerNote: 'Poder de origem: Manual do Sobrevivente — bônus pra lidar com o ermo e situações de sobrevivência.',
  },
  {
    name: 'Experimento',
    skills: ['atletismo', 'fortitude'],
    power: 'Mutação',
    powerNote: 'Poder de origem: Mutação — sofreu uma alteração física/biológica que lhe dá uma vantagem.',
  },
  {
    name: 'Fanático por Criaturas',
    skills: ['investigacao', 'ocultismo'],
    power: 'Conhecimento Oculto',
    powerNote: 'Poder de origem: Conhecimento Oculto — sabe mais sobre criaturas e fenômenos paranormais.',
  },
  {
    name: 'Fotógrafo',
    skills: ['artes', 'percepcao'],
    power: 'Através da Lente',
    powerNote: 'Poder de origem: Através da Lente — vê/registra detalhes que passariam desapercebidos através de uma câmera.',
  },
  {
    name: 'Inventor Paranormal',
    skills: ['profissao', 'vontade'],
    power: 'Invenção Paranormal',
    powerNote: 'Poder de origem: Invenção Paranormal — constrói um dispositivo próprio com um efeito paranormal.',
  },
  {
    name: 'Jovem Místico',
    skills: ['ocultismo', 'religiao'],
    power: 'A Culpa é das Estrelas',
    powerNote: 'Poder de origem: A Culpa é das Estrelas — usa astrologia/misticismo pra prever ou influenciar algo.',
  },
  {
    name: 'Legista do Turno da Noite',
    skills: ['ciencias', 'medicina'],
    power: 'Luto Habitual',
    powerNote: 'Poder de origem: Luto Habitual — lida melhor com corpos e cenas de morte, ficando menos abalado.',
  },
  {
    name: 'Mateiro',
    skills: ['percepcao', 'sobrevivencia'],
    power: 'Mapa Celeste',
    powerNote: 'Poder de origem: Mapa Celeste — se orienta por céu/natureza, evitando se perder.',
  },
  {
    name: 'Mergulhador',
    skills: ['atletismo', 'fortitude'],
    power: 'Fôlego de Nadador',
    powerNote: 'Poder de origem: Fôlego de Nadador — aguenta mais tempo embaixo d’água e nada melhor.',
  },
  {
    name: 'Motorista',
    skills: ['pilotagem', 'reflexos'],
    power: 'Mãos no Volante',
    powerNote: 'Poder de origem: Mãos no Volante — bônus ao dirigir/pilotar veículos.',
  },
  {
    name: 'Nerd Entusiasta',
    skills: ['ciencias', 'tecnologia'],
    power: 'O Inteligentão',
    powerNote: 'Poder de origem: O Inteligentão — bônus relacionado a conhecimento técnico/científico.',
  },
  {
    name: 'Profetizado',
    skills: 'choice',
    power: 'Luta ou Fuga',
    powerNote: 'Poder de origem: Luta ou Fuga — reage com mais eficácia num momento decisivo de perigo. Perícias: Vontade + 1 livre à escolha.',
  },
  {
    name: 'Psicólogo',
    skills: ['intuicao', 'profissao'],
    power: 'Terapia',
    powerNote: 'Poder de origem: Terapia — ajuda alguém a lidar com trauma/condição mental.',
  },
  {
    name: 'Repórter Investigativo',
    skills: ['atualidades', 'investigacao'],
    power: 'Encontrar a Verdade',
    powerNote: 'Poder de origem: Encontrar a Verdade — bônus pra descobrir informações escondidas.',
  },
];

export const ORIGIN_BY_NAME: Record<string, OriginDef> = Object.fromEntries(
  ORIGIN_LIST.map((o) => [o.name, o]),
);

// mantido para o datalist / compat
export const ORIGINS: string[] = ORIGIN_LIST.map((o) => o.name);
