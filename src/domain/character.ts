import {
  CLASS_BY_KEY,
  ELEMENTS,
  SKILLS,
  nexSteps,
  pePerTurn,
  type AttrKey,
  type ClassKey,
  type Element,
  type Training,
} from '../data/ordem';
import { unlockedTrilhaPowers, trilhaByName } from '../data/trilhas';
import { CLASS_POWERS, CLASS_POWER_NEX_SLOTS } from '../data/classPowers';
import { PARANORMAL_BY_KEY } from '../data/paranormalPowers';
import { uid } from '../lib/ids';

const ELEMENT_NAME: Record<Element, string> = Object.fromEntries(
  ELEMENTS.map((e) => [e.key, e.name]),
) as Record<Element, string>;

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // I, II, III, IV ou livre
  qty: number;
  slots: number; // espacos ocupados
  notes: string;
}

export interface Ritual {
  id: string;
  name: string;
  circle: 1 | 2 | 3 | 4;
  element: Element;
  cost: string; // ex.: "2 PE" ou "1 PE (+2)"
  execution: string;
  range: string;
  duration: string;
  description: string;
  freeSource?: boolean; // ganho por classe/trilha — não conta no limite de rituais conhecidos
}

export interface Ability {
  id: string;
  name: string;
  source: string; // classe, trilha, poder paranormal, origem...
  description: string;
}

// Escolha de um "Poder de Classe" (NEX 15/30/45/60/75/90). `abilityId` liga essa
// escolha à Ability gerada, pra poder remover as duas juntas.
export interface ClassPowerPick {
  id: string;
  nex: number; // 15 | 30 | 45 | 60 | 75 | 90
  key: string; // chave em CLASS_POWERS[classe], ou 'transcender' / 'versatilidade'
  abilityId: string;
  element?: Element; // poderes que exigem escolher um elemento
  skills?: string[]; // Treinamento em Perícia
  paranormalKey?: string; // Transcender: qual poder paranormal
  paranormalElement?: Element; // Transcender de "Resistir a [Elemento]"
  affinity?: boolean; // Transcender: aplicar o bônus de Afinidade
  versatilityTrilha?: string; // Versatilidade: nome da trilha escolhida
}

// Escolha de "Aumento de Atributo" (NEX 20/50/80/95): +1 num atributo, até o teto de 5.
export interface AttributeBumpPick {
  id: string;
  nex: number; // 20 | 50 | 80 | 95
  attr: AttrKey;
}

// "Grau de Treinamento" (NEX 35/70): sobe o grau de N perícias já treinadas.
export interface TrainingBumpPick {
  id: string;
  nex: number; // 35 | 70
  skills: string[];
}

export interface SkillState {
  training: Training;
  bonus: number; // outros bonus fixos (itens, condicoes, etc.)
}

export interface Character {
  id: string;
  ownerId: string;
  name: string;
  player: string;
  image?: string;
  classe: ClassKey;
  trilha: string;
  origem: string;
  nex: number; // porcentagem (5, 10, 15...)
  patente: string;
  attributes: Record<AttrKey, number>;
  pv: { current: number; max: number; temp: number };
  pe: { current: number; max: number };
  sanity: { current: number; max: number };
  defense: number;
  defenseBonus: number; // armadura/habilidades — entra em 10 + AGI + este
  displacement: number; // deslocamento em metros
  protection: number; // resistencia a dano de armadura
  autoCalc: boolean; // quando true, campos derivados sao recalculados pelas regras
  skills: Record<string, SkillState>;
  proficiencies: string[];
  attacks: Attack[];
  inventory: InventoryItem[];
  rituals: Ritual[];
  abilities: Ability[];
  conditions: string[];
  notes: string;
  classPowers: ClassPowerPick[];
  attributeBumps: AttributeBumpPick[];
  trainingBumps: TrainingBumpPick[];
  affinityElement?: Element; // elemento de Afinidade (NEX 50%+)
  pdMode?: boolean; // regra opcional "Jogando Sem Sanidade": PE e Sanidade viram um só (PD)
  createdAt?: number; // quando a ficha foi criada (fichas antigas não têm — usa updatedAt)
  updatedAt: number;
}

// Regra opcional (Sobrevivendo ao Horror, "Jogando Sem Sanidade"): PE e Sanidade
// se fundem em Pontos de Determinação (PD). Quando ligada, o campo `pe` da ficha
// passa a representar o PD (mesma barra, só reformulada) e a Sanidade fica de lado.
const PD_TABLE: Record<ClassKey, { base: number; perNex: number }> = {
  combatente: { base: 6, perNex: 3 },
  especialista: { base: 8, perNex: 4 },
  ocultista: { base: 10, perNex: 5 },
};

export function pdMax(char: Character): number {
  const t = PD_TABLE[char.classe];
  const steps = nexSteps(char.nex);
  const pre = char.attributes.PRE;
  return t.base + pre + steps * (t.perNex + pre);
}

export interface Attack {
  id: string;
  name: string;
  test: string; // ex.: "Luta" ou "Pontaria +5"
  damage: string; // ex.: "1d12+3"
  type: string; // impacto, corte, balistico, perfuracao...
  range: string;
  crit: string; // ex.: "20/x2"
  notes: string;
}

function emptySkills(): Record<string, SkillState> {
  const out: Record<string, SkillState> = {};
  for (const s of SKILLS) out[s.key] = { training: 0, bonus: 0 };
  return out;
}

export function suggestedStats(classe: ClassKey, nex: number, vigor: number, presenca: number) {
  const c = CLASS_BY_KEY[classe];
  const steps = nexSteps(nex);
  const pvMax = c.pvBase + vigor + c.pvPerNex * steps;
  const peMax = c.peBase + presenca + c.pePerNex * steps;
  const sanMax = c.sanBase + c.sanPerNex * steps;
  return { pvMax, peMax, sanMax };
}

export interface DerivedStats {
  pvMax: number;
  peMax: number;
  sanMax: number;
  defense: number; // 10 + AGI + defenseBonus
  loadLimit: number; // Forca + 5
  trainedBudget: number; // pericias treinadas: base da classe + Intelecto (+2 origem)
  pePerTurn: number; // limite de PE por turno pelo NEX
  maxAttribute: number; // teto de atributo pelo NEX
}

// Tudo que e formula pura das regras de criacao/progressao.
export function deriveStats(char: Character): DerivedStats {
  const c = CLASS_BY_KEY[char.classe];
  const steps = nexSteps(char.nex);
  const a = char.attributes;
  // Transcender: "não ganha Sanidade neste aumento de NEX" — cada vez que foi escolhido,
  // desconta o ganho de Sanidade de um passo de NEX.
  const transcendCount = (char.classPowers || []).filter((p) => p.key === 'transcender').length;
  // Tropa de Choque (trilha de combatente) — Casca Grossa: +1 PV a cada 5% de NEX.
  const cascaGrossa = char.trilha === 'Tropa de Choque' && char.nex >= 10 ? Math.floor(char.nex / 5) : 0;
  // Técnico (trilha de especialista) — Inventário Otimizado: soma Intelecto à carga.
  const inventarioOtimizado = char.trilha === 'Técnico' && char.nex >= 10 ? a.INT : 0;
  return {
    pvMax: c.pvBase + a.VIG + c.pvPerNex * steps + cascaGrossa,
    peMax: char.pdMode ? pdMax(char) : c.peBase + a.PRE + c.pePerNex * steps,
    sanMax: Math.max(1, c.sanBase + c.sanPerNex * steps - c.sanPerNex * transcendCount),
    defense: 10 + a.AGI + (char.defenseBonus || 0),
    loadLimit: a.FOR + 5 + inventarioOtimizado,
    trainedBudget: c.skillsTrained + a.INT + 2,
    pePerTurn: pePerTurn(char.nex),
    maxAttribute: char.nex >= 50 ? 5 : char.nex >= 20 ? 4 : 3,
  };
}

// Aplica os valores derivados a uma ficha (mantendo current <= max). So use quando autoCalc.
export function applyDerived(char: Character): Character {
  const d = deriveStats(char);
  return {
    ...char,
    pv: { ...char.pv, max: d.pvMax, current: Math.min(char.pv.current, d.pvMax) },
    pe: { ...char.pe, max: d.peMax, current: Math.min(char.pe.current, d.peMax) },
    sanity: { ...char.sanity, max: d.sanMax, current: Math.min(char.sanity.current, d.sanMax) },
    defense: d.defense,
  };
}

// Quantas pericias estao treinadas hoje (grau > 0).
export function countTrained(char: Character): number {
  return Object.values(char.skills).filter((s) => s.training > 0).length;
}

// Espacos de inventario usados.
export function loadUsed(char: Character): number {
  return char.inventory.reduce((a, it) => a + it.slots * it.qty, 0);
}

export function createCharacter(ownerId: string, name = 'Novo Agente'): Character {
  const attributes: Record<AttrKey, number> = { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 };
  const { pvMax, peMax, sanMax } = suggestedStats('combatente', 5, attributes.VIG, attributes.PRE);
  return {
    id: uid(),
    ownerId,
    name,
    player: '',
    classe: 'combatente',
    trilha: '',
    origem: '',
    nex: 5,
    patente: 'Recruta',
    attributes,
    pv: { current: pvMax, max: pvMax, temp: 0 },
    pe: { current: peMax, max: peMax },
    sanity: { current: sanMax, max: sanMax },
    defense: 11, // 10 + AGI 1
    defenseBonus: 0,
    displacement: 9,
    protection: 0,
    autoCalc: true,
    skills: emptySkills(),
    proficiencies: [],
    attacks: [],
    inventory: [],
    rituals: [],
    abilities: [],
    conditions: [],
    notes: '',
    classPowers: [],
    attributeBumps: [],
    trainingBumps: [],
    pdMode: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Poderes de trilha desbloqueados pelo NEX atual que ainda não estão nas habilidades —
// adiciona sozinho conforme o NEX sobe (a trilha em si é escolhida uma vez, na criação
// ou na ficha; a partir daí a progressão 10/40/65/99 é automática).
export function syncTrilhaAbilities(char: Character): Character {
  if (!char.trilha) return char;
  const unlocked = unlockedTrilhaPowers(char.classe, char.trilha, char.nex);
  const source = `Trilha: ${char.trilha}`;
  const label = (nex: number, name: string) => `${name} (NEX ${nex}%)`;
  const existing = new Set(
    char.abilities.filter((a) => a.source === source).map((a) => a.name),
  );
  const missing = unlocked.filter((p) => !existing.has(label(p.nex, p.name)));
  if (missing.length === 0) return char;
  return {
    ...char,
    abilities: [
      ...char.abilities,
      ...missing.map((p) => ({
        id: uid(),
        name: label(p.nex, p.name),
        source,
        description: p.summary,
      })),
    ],
  };
}

// Vagas de ritual: regra geral é igual ao Intelecto (rituais ganhos por classe/trilha
// não contam — marque "freeSource" nesses). Não é um teto rígido, só um guia na ficha.
export function ritualSlots(char: Character): number {
  return Math.max(0, char.attributes.INT);
}
export function ritualsUsed(char: Character): number {
  return char.rituals.filter((r) => !r.freeSource).length;
}

/* ---------------------------------------------------------------------------
 * Progressão por NEX: Poder de Classe (15/30/45/60/75/90), Aumento de Atributo
 * (20/50/80/95) e Grau de Treinamento (35/70). Trilha (10/40/65/99) já é tratada
 * por syncTrilhaAbilities acima. Tudo aqui é "guiado": mostra o que falta
 * escolher pro NEX atual e aplica o efeito mecânico na ficha ao confirmar.
 * ------------------------------------------------------------------------- */

export const ATTRIBUTE_BUMP_NEX_SLOTS = [20, 50, 80, 95];
export const TRAINING_BUMP_NEX_SLOTS = [35, 70];

export function pendingClassPowerSlots(char: Character): number[] {
  const chosen = new Set((char.classPowers || []).map((p) => p.nex));
  return CLASS_POWER_NEX_SLOTS.filter((n) => n <= char.nex && !chosen.has(n));
}

export function pendingAttributeBumpSlots(char: Character): number[] {
  const chosen = new Set((char.attributeBumps || []).map((b) => b.nex));
  return ATTRIBUTE_BUMP_NEX_SLOTS.filter((n) => n <= char.nex && !chosen.has(n));
}

export function pendingTrainingBumpSlots(char: Character): number[] {
  const chosen = new Set((char.trainingBumps || []).map((b) => b.nex));
  return TRAINING_BUMP_NEX_SLOTS.filter((n) => n <= char.nex && !chosen.has(n));
}

// Texto do que o personagem ganha ao subir de NEX — usado pra notificar o jogador
// (e o mestre) do que apareceu de novo pra escolher/usar, sem precisar decorar a tabela.
export function describeNexGain(before: Character, after: Character): string[] {
  const lines: string[] = [];
  if (after.nex <= before.nex) return lines;

  if (after.trilha) {
    const prevNames = new Set(
      unlockedTrilhaPowers(after.classe, after.trilha, before.nex).map((p) => p.name),
    );
    for (const p of unlockedTrilhaPowers(after.classe, after.trilha, after.nex)) {
      if (!prevNames.has(p.name)) lines.push(`Trilha — ${p.name}: ${p.summary}`);
    }
  } else if (before.nex < 10 && after.nex >= 10) {
    lines.push('Pode escolher sua Trilha agora (aba Geral).');
  }

  for (const n of pendingClassPowerSlots(after).filter((n) => n > before.nex)) {
    lines.push(`Poder de Classe disponível (NEX ${n}%) — escolha na aba Progressão.`);
  }
  for (const n of pendingAttributeBumpSlots(after).filter((n) => n > before.nex)) {
    lines.push(`Aumento de Atributo disponível (NEX ${n}%) — escolha na aba Progressão.`);
  }
  for (const n of pendingTrainingBumpSlots(after).filter((n) => n > before.nex)) {
    lines.push(`Grau de Treinamento disponível (NEX ${n}%) — escolha na aba Progressão.`);
  }
  return lines;
}

// Quantas perícias podem subir de grau num slot de Grau de Treinamento.
export function trainingBumpBudget(char: Character): number {
  const base = { combatente: 2, especialista: 5, ocultista: 3 }[char.classe];
  return base + char.attributes.INT;
}

function nextTraining(t: Training): Training {
  return t === 0 ? 0 : t === 5 ? 10 : t === 10 ? 15 : 15;
}

interface ClassPowerPickInput {
  nex: number;
  key: string;
  element?: Element;
  skills?: string[];
  paranormalKey?: string;
  paranormalElement?: Element;
  affinity?: boolean;
  versatilityTrilha?: string;
}

// Aplica a escolha de um Poder de Classe (ou Transcender/Versatilidade nesse slot):
// grava a escolha, gera a Ability correspondente e aplica efeitos automáticos simples
// (treino de perícia, quando o poder concede).
export function addClassPowerPick(char: Character, input: ClassPowerPickInput): Character {
  const abilityId = uid();
  let name = input.key;
  let description = '';
  let source = 'Poder de Classe';

  if (input.key === 'versatilidade' && input.versatilityTrilha) {
    const def = trilhaByName(char.classe, input.versatilityTrilha);
    const p0 = def?.powers.find((p) => p.nex === 10);
    name = `Versatilidade: ${p0?.name ?? input.versatilityTrilha}`;
    description = p0?.summary ?? '';
    source = 'Versatilidade';
  } else if (input.key === 'transcender' && input.paranormalKey) {
    const pdef = PARANORMAL_BY_KEY[input.paranormalKey];
    name = `Transcender: ${pdef?.name ?? input.paranormalKey}`;
    description = pdef?.summary ?? '';
    if (input.paranormalElement) description += ` Elemento: ${ELEMENT_NAME[input.paranormalElement]}.`;
    if (input.affinity && pdef?.affinitySummary) description += ` Afinidade: ${pdef.affinitySummary}`;
    source = 'Transcender';
  } else {
    const pdef = CLASS_POWERS[char.classe].find((p) => p.key === input.key);
    name = pdef?.name ?? input.key;
    description = pdef?.summary ?? '';
    if (input.element) description += ` Elemento: ${ELEMENT_NAME[input.element]}.`;
  }

  const pick: ClassPowerPick = { id: uid(), abilityId, ...input };
  let next: Character = {
    ...char,
    classPowers: [...(char.classPowers || []), pick],
    abilities: [
      ...char.abilities,
      { id: abilityId, name: `${name} (NEX ${input.nex}%)`, source, description },
    ],
  };

  if (input.skills?.length) {
    const skills = { ...next.skills };
    for (const k of input.skills) {
      const cur = skills[k] ?? { training: 0, bonus: 0 };
      skills[k] = { ...cur, training: cur.training < 5 ? 5 : cur.training };
    }
    next = { ...next, skills };
  }
  return next;
}

export function removeClassPowerPick(char: Character, id: string): Character {
  const pick = (char.classPowers || []).find((p) => p.id === id);
  if (!pick) return char;
  return {
    ...char,
    classPowers: char.classPowers.filter((p) => p.id !== id),
    abilities: char.abilities.filter((a) => a.id !== pick.abilityId),
  };
}

// Aumento de Atributo: +1 no atributo escolhido, sem passar de 5 por essa via.
export function addAttributeBump(char: Character, nex: number, attr: AttrKey): Character {
  const attributes = { ...char.attributes, [attr]: Math.min(5, char.attributes[attr] + 1) };
  return {
    ...char,
    attributes,
    attributeBumps: [...(char.attributeBumps || []), { id: uid(), nex, attr }],
  };
}

export function removeAttributeBump(char: Character, id: string): Character {
  const bump = (char.attributeBumps || []).find((b) => b.id === id);
  if (!bump) return char;
  const attributes = { ...char.attributes, [bump.attr]: Math.max(0, char.attributes[bump.attr] - 1) };
  return {
    ...char,
    attributes,
    attributeBumps: char.attributeBumps.filter((b) => b.id !== id),
  };
}

// Grau de Treinamento: sobe o grau de treino/veterano/expert de perícias já treinadas.
// Aplicado direto (Treinado -> Veterano -> Expert); não é desfeito automaticamente —
// ajuste na aba Perícias se escolher errado.
export function addTrainingBump(char: Character, nex: number, skillKeys: string[]): Character {
  const skills = { ...char.skills };
  for (const k of skillKeys) {
    const cur = skills[k] ?? { training: 0 as Training, bonus: 0 };
    skills[k] = { ...cur, training: nextTraining(cur.training) };
  }
  return {
    ...char,
    skills,
    trainingBumps: [...(char.trainingBumps || []), { id: uid(), nex, skills: [...skillKeys] }],
  };
}

// Textos informativos das habilidades de classe que já escalam sozinhas com o NEX
// (não são escolhas — todo mundo da classe tem). Puramente descritivo.
export function classInnateProgress(char: Character): string[] {
  const nex = char.nex;
  if (char.classe === 'combatente') {
    const table = [
      { nex: 5, pe: 2, bonus: 5 },
      { nex: 25, pe: 3, bonus: 10 },
      { nex: 55, pe: 4, bonus: 15 },
      { nex: 85, pe: 5, bonus: 20 },
    ];
    const cur = [...table].reverse().find((t) => nex >= t.nex) ?? table[0];
    return [`Ataque Especial: gaste ${cur.pe} PE para +${cur.bonus} no ataque ou no dano (dividido como quiser).`];
  }
  if (char.classe === 'especialista') {
    const table = [
      { nex: 5, pe: 2, dado: '1d6' },
      { nex: 25, pe: 3, dado: '1d8' },
      { nex: 55, pe: 4, dado: '1d10' },
      { nex: 85, pe: 5, dado: '1d12' },
    ];
    const cur = [...table].reverse().find((t) => nex >= t.nex) ?? table[0];
    const out = [
      `Eclético: gaste 2 PE para testar uma perícia como se fosse treinado nela.`,
      `Perito: em 2 perícias treinadas (exceto Luta/Pontaria), gaste ${cur.pe} PE para +${cur.dado} no teste.`,
    ];
    if (nex >= 40) out.push('Engenhosidade: Eclético agora pode virar veterano (+2 PE) na perícia.');
    if (nex >= 75) out.push('Engenhosidade: Eclético também pode virar expert (+4 PE) na perícia.');
    return out;
  }
  const circles = [
    { nex: 5, c: '1º' },
    { nex: 25, c: '2º' },
    { nex: 55, c: '3º' },
    { nex: 85, c: '4º' },
  ];
  const cur = [...circles].reverse().find((t) => nex >= t.nex) ?? circles[0];
  return [`Escolhido pelo Outro Lado: aprende um ritual grátis de até ${cur.c} círculo neste NEX (adicione pelo compêndio e marque "ganho por classe").`];
}

// Bonus total somado ao d20 escolhido (treino + outros + bônus fixos de trilha).
// O atributo define a QUANTIDADE de dados, não entra aqui.
export function skillBonus(char: Character, skillKey: string): number {
  const st = char.skills[skillKey];
  if (!st) return 0;
  let bonus = st.training + st.bonus;
  // Operações Especiais (trilha de combatente) — Iniciativa Aprimorada: +5 em Iniciativa.
  if (skillKey === 'iniciativa' && char.trilha === 'Operações Especiais' && char.nex >= 10) {
    bonus += 5;
  }
  return bonus;
}
