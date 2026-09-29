// Dados de referencia do sistema Ordem Paranormal RPG.

export type AttrKey = 'AGI' | 'FOR' | 'INT' | 'PRE' | 'VIG';

export interface AttributeDef {
  key: AttrKey;
  name: string;
  short: string;
}

export const ATTRIBUTES: AttributeDef[] = [
  { key: 'AGI', name: 'Agilidade', short: 'AGI' },
  { key: 'FOR', name: 'Força', short: 'FOR' },
  { key: 'INT', name: 'Intelecto', short: 'INT' },
  { key: 'PRE', name: 'Presença', short: 'PRE' },
  { key: 'VIG', name: 'Vigor', short: 'VIG' },
];

// Grau de treinamento -> bonus fixo somado ao teste.
export type Training = 0 | 5 | 10 | 15;

export const TRAINING_LEVELS: { value: Training; label: string }[] = [
  { value: 0, label: 'Destreinado' },
  { value: 5, label: 'Treinado' },
  { value: 10, label: 'Veterano' },
  { value: 15, label: 'Expert' },
];

export const TRAINING_LABEL: Record<Training, string> = {
  0: 'Destreinado',
  5: 'Treinado',
  10: 'Veterano',
  15: 'Expert',
};

export interface SkillDef {
  key: string;
  name: string;
  attr: AttrKey;
  onlyTrained?: boolean; // so pode ser usada treinada
  loadPenalty?: boolean; // sofre penalidade de carga
}

export const SKILLS: SkillDef[] = [
  { key: 'acrobacia', name: 'Acrobacia', attr: 'AGI', loadPenalty: true },
  { key: 'adestramento', name: 'Adestramento', attr: 'PRE', onlyTrained: true },
  { key: 'artes', name: 'Artes', attr: 'PRE', onlyTrained: true },
  { key: 'atletismo', name: 'Atletismo', attr: 'FOR' },
  { key: 'atualidades', name: 'Atualidades', attr: 'INT' },
  { key: 'ciencias', name: 'Ciências', attr: 'INT', onlyTrained: true },
  { key: 'crime', name: 'Crime', attr: 'AGI', onlyTrained: true, loadPenalty: true },
  { key: 'diplomacia', name: 'Diplomacia', attr: 'PRE' },
  { key: 'enganacao', name: 'Enganação', attr: 'PRE' },
  { key: 'fortitude', name: 'Fortitude', attr: 'VIG' },
  { key: 'furtividade', name: 'Furtividade', attr: 'AGI', loadPenalty: true },
  { key: 'iniciativa', name: 'Iniciativa', attr: 'AGI' },
  { key: 'intimidacao', name: 'Intimidação', attr: 'PRE' },
  { key: 'intuicao', name: 'Intuição', attr: 'PRE' },
  { key: 'investigacao', name: 'Investigação', attr: 'INT' },
  { key: 'luta', name: 'Luta', attr: 'FOR' },
  { key: 'medicina', name: 'Medicina', attr: 'INT' },
  { key: 'ocultismo', name: 'Ocultismo', attr: 'INT', onlyTrained: true },
  { key: 'percepcao', name: 'Percepção', attr: 'PRE' },
  { key: 'pilotagem', name: 'Pilotagem', attr: 'AGI', onlyTrained: true },
  { key: 'pontaria', name: 'Pontaria', attr: 'AGI' },
  { key: 'profissao', name: 'Profissão', attr: 'INT', onlyTrained: true },
  { key: 'reflexos', name: 'Reflexos', attr: 'AGI' },
  { key: 'religiao', name: 'Religião', attr: 'PRE', onlyTrained: true },
  { key: 'sobrevivencia', name: 'Sobrevivência', attr: 'INT' },
  { key: 'tatica', name: 'Tática', attr: 'INT', onlyTrained: true },
  { key: 'tecnologia', name: 'Tecnologia', attr: 'INT', onlyTrained: true },
  { key: 'vontade', name: 'Vontade', attr: 'PRE' },
];

export const SKILL_BY_KEY: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.key, s]),
);

export type ClassKey = 'combatente' | 'especialista' | 'ocultista';

export interface ClassDef {
  key: ClassKey;
  name: string;
  pvBase: number; // + Vigor
  pvPerNex: number; // por incremento de 5% de NEX apos o 5%
  peBase: number; // + Presença
  pePerNex: number;
  sanBase: number;
  sanPerNex: number;
  skillsTrained: number; // pericias treinadas iniciais
}

export const CLASSES: ClassDef[] = [
  {
    key: 'combatente',
    name: 'Combatente',
    pvBase: 20,
    pvPerNex: 4,
    peBase: 2,
    pePerNex: 2,
    sanBase: 12,
    sanPerNex: 3,
    // Luta/Pontaria + Fortitude/Reflexos + (1 + Intelecto) = 3 + Intelecto
    skillsTrained: 3,
  },
  {
    key: 'especialista',
    name: 'Especialista',
    pvBase: 16,
    pvPerNex: 3,
    peBase: 3,
    pePerNex: 3,
    sanBase: 16,
    sanPerNex: 4,
    // 7 + Intelecto (todas à escolha)
    skillsTrained: 7,
  },
  {
    key: 'ocultista',
    name: 'Ocultista',
    pvBase: 12,
    pvPerNex: 2,
    peBase: 4,
    pePerNex: 4,
    sanBase: 20,
    sanPerNex: 5,
    // Ocultismo + Vontade + (3 + Intelecto) = 5 + Intelecto
    skillsTrained: 5,
  },
];

export const CLASS_BY_KEY: Record<ClassKey, ClassDef> = Object.fromEntries(
  CLASSES.map((c) => [c.key, c]),
) as Record<ClassKey, ClassDef>;

export type Element = 'sangue' | 'morte' | 'energia' | 'conhecimento' | 'medo';

export const ELEMENTS: { key: Element; name: string; color: string }[] = [
  { key: 'sangue', name: 'Sangue', color: '#c1121f' },
  { key: 'morte', name: 'Morte', color: '#8d99ae' },
  { key: 'energia', name: 'Energia', color: '#7b2cbf' },
  { key: 'conhecimento', name: 'Conhecimento', color: '#f4a259' },
  { key: 'medo', name: 'Medo', color: '#2b9348' },
];

export const ELEMENT_COLOR: Record<Element, string> = Object.fromEntries(
  ELEMENTS.map((e) => [e.key, e.color]),
) as Record<Element, string>;

// Paleta completa por elemento (mesma ideia das custom properties
// `--daily-accent*` já usadas no Desafio Diário) — usada pra "decorar" o
// resultado do teste de elemento no Meu Perfil com o tema certo.
export interface ElementPalette {
  accent: string;
  bright: string;
  deep: string;
  glow: string;
  glowSoft: string;
  bgTint: string;
}

export const ELEMENT_PALETTE: Record<Element, ElementPalette> = {
  sangue: {
    accent: '#c1121f',
    bright: '#e8283a',
    deep: '#6b0a12',
    glow: 'rgba(193, 18, 31, 0.4)',
    glowSoft: 'rgba(193, 18, 31, 0.28)',
    bgTint: '#1a0406',
  },
  morte: {
    accent: '#8d99ae',
    bright: '#b8c2d1',
    deep: '#454d59',
    glow: 'rgba(141, 153, 174, 0.4)',
    glowSoft: 'rgba(141, 153, 174, 0.28)',
    bgTint: '#10131a',
  },
  energia: {
    accent: '#7b2cbf',
    bright: '#a855f7',
    deep: '#3d1461',
    glow: 'rgba(123, 44, 191, 0.4)',
    glowSoft: 'rgba(123, 44, 191, 0.28)',
    bgTint: '#150a20',
  },
  conhecimento: {
    accent: '#f4a259',
    bright: '#ffc98a',
    deep: '#7a4c1e',
    glow: 'rgba(244, 162, 89, 0.4)',
    glowSoft: 'rgba(244, 162, 89, 0.28)',
    bgTint: '#201304',
  },
  medo: {
    accent: '#2b9348',
    bright: '#4ac774',
    deep: '#164d26',
    glow: 'rgba(43, 147, 72, 0.4)',
    glowSoft: 'rgba(43, 147, 72, 0.28)',
    bgTint: '#04140a',
  },
};

// Descrição curta pro resultado do teste — o que aquele elemento diz sobre a
// pessoa (não é regra de jogo, é só a "personalidade" de cada elemento pro
// teste ficar com cara de Ordem Paranormal mesmo).
export const ELEMENT_DESCRIPTION: Record<Element, string> = {
  sangue:
    'Você é visceral e direto — alguém que enfrenta o mundo com o próprio corpo. Dor, instinto e resistência não te assustam: te movem.',
  morte:
    'Você encara o fim com uma calma que assusta os outros. Frio, estratégico, sabe que tudo tem um preço — e não hesita em cobrá-lo.',
  energia:
    'Você confia no acaso e na centelha que corre por tudo — na sorte que parece sempre favorecer quem ousa. Imprevisível e rápido.',
  conhecimento:
    'Você busca o que está escondido. Observador, curioso, prefere entender antes de agir — sabe que informação é a arma mais afiada.',
  medo: 'Você já olhou pro abismo e não desviou o olhar. O terror não te paralisa — você aprendeu a usá-lo a seu favor.',
};

// Condicoes mais usadas. Lista enxuta para os chips da ficha.
export const CONDITIONS: string[] = [
  'Abalado',
  'Agarrado',
  'Alquebrado',
  'Apavorado',
  'Atordoado',
  'Caído',
  'Cego',
  'Confuso',
  'Debilitado',
  'Desprevenido',
  'Doente',
  'Enjoado',
  'Enredado',
  'Envenenado',
  'Esmorecido',
  'Exausto',
  'Fascinado',
  'Fraco',
  'Frustrado',
  'Imóvel',
  'Inconsciente',
  'Indefeso',
  'Lento',
  'Ofuscado',
  'Paralisado',
  'Petrificado',
  'Sangrando',
  'Surdo',
  'Vulnerável',
];

// NEX limita o valor maximo de atributo.
// Criacao: max 3. Aumentos de atributo (+1) em NEX 20%, 50%, 80% e 95%, ate o teto de 5.
export function maxAttributeForNex(nex: number): number {
  if (nex >= 50) return 5;
  if (nex >= 20) return 4;
  return 3;
}

// Numero de "passos" de 5% desde o NEX 5% inicial.
export function nexSteps(nex: number): number {
  return Math.max(0, Math.round((nex - 5) / 5));
}

// Limite de PE que pode ser gasto por turno (Tabela 1.2): NEX 5% -> 1 ... NEX 99% -> 20.
export function pePerTurn(nex: number): number {
  if (nex >= 99) return 20;
  return Math.max(1, Math.round(nex / 5));
}
