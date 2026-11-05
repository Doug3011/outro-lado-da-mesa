// Importar ficha do C.R.I.S. (crisordemparanormal.com) — pedido do usuário:
// colar o link da própria ficha em vez de preencher o wizard na mão. A parte
// pesada (abrir a SPA de verdade numa janela escondida do Electron e ler o
// DOM renderizado) mora no processo principal (desktop/importCris.js,
// chamado via `window.electronAPI.importCrisAgent` — ver desktop/preload.js).
// Aqui só mapeia o retorno cru pro nosso `Character`, reaproveitando a MESMA
// lista de perícias/classes do sistema (src/data/ordem.ts) que o resto do
// app já usa — nada de reimplementar regra nenhuma.
import type { AttrKey } from '../data/ordem';
import { ELEMENTS, SKILLS } from '../data/ordem';
import { RITUALS } from '../data/rituals';
import { TRILHAS_BY_CLASS } from '../data/trilhas';
import { createCharacter, type Ability, type InventoryItem, type Ritual } from '../domain/character';
import type { Character } from '../domain/character';
import { uid } from './ids';
import type { Element } from '../data/ordem';

// Formato devolvido por desktop/importCris.js (ver esse arquivo pro porquê de
// cada seletor) — ainda cru, sem nenhum mapeamento pro nosso Character.
export interface CrisRawData {
  name: string;
  player: string;
  origem: string;
  classeText: string;
  attrs: Record<AttrKey, string>;
  nex: string;
  displacementInputs: string[];
  defenseTotal: string;
  defenseExtras: string[];
  infoLines: { label: string; value: string }[];
  bars: { label: string; current: string; max: string }[];
  skills: { name: string; attr: string; training: string; outros: string }[];
  image: string;
  // Abas que só renderizam ao clicar (ver desktop/importCris.js readTab) —
  // vêm vazias (`[]`) se a aba não existir/não abrir, não travam a
  // importação do resto.
  abilities: { name: string; description: string }[];
  ritualsRaw: {
    name: string;
    circleText: string;
    infoPairs: { label: string; value: string }[];
    description: string;
  }[];
  inventoryRaw: {
    name: string;
    infoPairs: { label: string; value: string }[];
    kind: string;
    description: string;
  }[];
  descriptionBlocks: { label: string; value: string }[];
}

export class CrisImportError extends Error {}

function toInt(s: string | undefined, fallback = 0): number {
  const n = parseInt(String(s ?? '').replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

// Grau de treino só aceita 0/5/10/15 — qualquer outra coisa (campo vazio,
// formato mudou no site) cai pro treino mais próximo em vez de quebrar.
function toTraining(s: string | undefined): 0 | 5 | 10 | 15 {
  const n = toInt(s, 0);
  if (n >= 13) return 15;
  if (n >= 8) return 10;
  if (n >= 3) return 5;
  return 0;
}

function mapClasse(text: string): Character['classe'] {
  const t = text.toLowerCase();
  if (t.includes('especial')) return 'especialista';
  if (t.includes('ocult')) return 'ocultista';
  return 'combatente'; // cobre "Combatente" e qualquer texto não reconhecido
}

function findBar(bars: CrisRawData['bars'], label: string) {
  return bars.find((b) => b.label.toUpperCase() === label);
}

// Poderes/habilidades (NEX, classe, trilha, paranormal, origem — a Cris
// mistura tudo numa lista só, sem dizer de onde cada um veio) não têm um
// sistema interno equivalente pra reconstruir com segurança (ver comentário
// em desktop/importCris.js) — capturam a informação igual, como `Ability`
// solta, em vez de tentar adivinhar e arriscar errar a escolha.
function mapAbilities(raw: CrisRawData['abilities']): Ability[] {
  return raw
    .filter((a) => a.name.trim())
    .map((a) => ({
      id: uid(),
      name: a.name.trim(),
      source: 'Importado da Cris',
      description: a.description.trim(),
    }));
}

const ELEMENT_NAME_TO_KEY: Record<string, Element> = Object.fromEntries(
  ELEMENTS.map((e) => [e.name.toUpperCase(), e.key]),
);

// "<ELEMENTO> <CÍRCULO>", ex. "ENERGIA 1" — mas alguns rituais (que podem
// ser lançados em qualquer elemento, ex. Amaldiçoar Arma) mostram "VARIA N"
// em vez do nome do elemento; nesse caso cai pro catálogo embutido
// (RITUALS, ver src/data/rituals.ts) pra achar os elementos possíveis.
function parseRitualCircle(circleText: string, catalogElements: Element[] | undefined): {
  circle: 1 | 2 | 3 | 4;
  element: Element;
} {
  const m = circleText.trim().match(/^(\S+)\s+(\d+)/);
  const circleNum = m ? Number(m[2]) : 1;
  const circle: 1 | 2 | 3 | 4 = circleNum >= 1 && circleNum <= 4 ? (circleNum as 1 | 2 | 3 | 4) : 1;
  const elementWord = m ? m[1].toUpperCase() : '';
  const element = ELEMENT_NAME_TO_KEY[elementWord] ?? catalogElements?.[0] ?? 'conhecimento';
  return { circle, element };
}

function findPair(pairs: { label: string; value: string }[], label: string): string {
  return pairs.find((p) => p.label.toUpperCase() === label.toUpperCase())?.value ?? '';
}

// Custo-base em PE não aparece no card da Cris (fica implícito pelo círculo
// nas regras) — fica em branco, igual ao fluxo "adicionar do catálogo" que
// a ficha já tinha (addRitualFromDef em CharacterSheet.tsx) antes de puxar
// rituais da Cris.
function mapRituals(raw: CrisRawData['ritualsRaw']): Ritual[] {
  return raw
    .filter((r) => r.name.trim())
    .map((r) => {
      const catalogDef = RITUALS.find((def) => def.name.toLowerCase() === r.name.trim().toLowerCase());
      const { circle, element } = parseRitualCircle(r.circleText, catalogDef?.elements);
      return {
        id: uid(),
        name: r.name.trim(),
        circle,
        element,
        cost: '',
        execution: findPair(r.infoPairs, 'Execução'),
        range: findPair(r.infoPairs, 'Alcance'),
        duration: findPair(r.infoPairs, 'Duração'),
        description: r.description.trim() || catalogDef?.summary || '',
      };
    });
}

// Quantidade não aparece por item no card da Cris (cada unidade vem como um
// item separado na lista) — sempre 1. Categoria livre (ex. "Itens
// Operacionais") e os pares rótulo:valor que não são Categoria/Espaços
// (dano, crítico, defesa...) viram texto solto nas notas do item, pra não
// perder a informação.
function mapInventory(raw: CrisRawData['inventoryRaw']): InventoryItem[] {
  return raw
    .filter((i) => i.name.trim())
    .map((i) => {
      const category = findPair(i.infoPairs, 'Categoria') || '';
      const slotsRaw = findPair(i.infoPairs, 'Espaços');
      const extraPairs = i.infoPairs
        .filter((p) => !['Categoria', 'Espaços'].includes(p.label))
        .map((p) => `${p.label}: ${p.value}`);
      const notes = [i.kind, ...extraPairs, i.description].filter(Boolean).join(' — ');
      return {
        id: uid(),
        name: i.name.trim(),
        category,
        qty: 1,
        slots: toInt(slotsRaw, 1),
        notes,
      };
    });
}

// Tenta reconhecer a trilha pelo nome dos poderes importados (a Cris não
// tem um campo de "Trilha" explícito — ver desktop/importCris.js). O nome
// na Cris vem como "NEX N% - <poder>" pros poderes de trilha (ex. "NEX 10%
// - Ampliar Ritual") — tira esse prefixo antes de comparar.
//
// Depurado contra a ficha de teste real do usuário (classe Ocultista,
// https://crisordemparanormal.com/agente/iotKMvjoFUzGCpTnTDjl): a
// comparação por nome em si batia certinho (sem acento/maiúscula/sufixo
// divergente), mas a ficha tinha "NEX 10% - Ampliar Ritual" + "NEX 40% -
// Acelerar Ritual" (2 poderes da trilha Conduíte) E "NEX 10% - Lâmina
// Maldita" (1 poder da trilha Lâmina Paranormal) — a regra antiga só
// afirmava uma trilha se TODOS os poderes batidos apontassem pra uma única
// trilha, então esse caso (maioria clara + 1 poder solto de outra trilha,
// comum em ficha de teste/livre) caía sempre em "ambíguo" e ficava em
// branco. Agora conta quantos poderes batem em cada trilha e afirma a que
// tiver estritamente mais — só fica em branco (com `ambiguousTrilhas`
// preenchido) quando há empate real no topo.
function inferTrilha(
  classe: Character['classe'],
  abilityNames: string[],
): { trilha: string; ambiguousTrilhas: string[] } {
  const trilhas = TRILHAS_BY_CLASS[classe];
  const counts = new Map<string, number>();
  for (const name of abilityNames) {
    const bare = name.replace(/^NEX\s*\d+%\s*-\s*/i, '').trim();
    const hit = trilhas.find((t) => t.powers.some((p) => p.name.toLowerCase() === bare.toLowerCase()));
    if (hit) counts.set(hit.name, (counts.get(hit.name) ?? 0) + 1);
  }
  if (counts.size === 0) return { trilha: '', ambiguousTrilhas: [] };
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 1 || sorted[0][1] > sorted[1][1]) {
    return { trilha: sorted[0][0], ambiguousTrilhas: [] };
  }
  // empate real no topo — não arrisca escolher, deixa em branco e lista só
  // as trilhas empatadas (não todas as que bateram algum poder).
  const topCount = sorted[0][1];
  return { trilha: '', ambiguousTrilhas: sorted.filter(([, n]) => n === topCount).map(([name]) => name) };
}

// Importação é SÓ da própria ficha que a pessoa colou o link — nada de
// varredura em massa, login automático ou acesso a ficha de outra pessoa
// sem o link ser colado explicitamente aqui.
export async function importFromCris(url: string, ownerId: string): Promise<Character> {
  if (!window.electronAPI?.importCrisAgent) {
    throw new CrisImportError('Importar da Cris só funciona no app instalado (desktop), não no navegador.');
  }
  const res = await window.electronAPI.importCrisAgent(url);
  if (!res.ok) throw new CrisImportError(res.error);
  return crisDataToCharacter(res.data, ownerId);
}

export function crisDataToCharacter(data: CrisRawData, ownerId: string): Character {
  const base = createCharacter(ownerId, data.name?.trim() || 'Agente importado');

  const vida = findBar(data.bars, 'VIDA');
  const sanidade = findBar(data.bars, 'SANIDADE');
  const esforco = findBar(data.bars, 'ESFORÇO');

  const skills = { ...base.skills };
  for (const row of data.skills) {
    const cleanName = (row.name || '').replace(/[*+]+$/, '').trim();
    const def = SKILLS.find((s) => s.name.toLowerCase() === cleanName.toLowerCase());
    if (!def) continue; // perícia não reconhecida (site mudou?) — ignora em vez de quebrar a importação inteira
    skills[def.key] = { training: toTraining(row.training), bonus: toInt(row.outros, 0) };
  }

  const proteçãoLine = data.infoLines.find((l) => l.label.toUpperCase() === 'PROTEÇÃO');
  const resistLine = data.infoLines.find((l) => l.label.toUpperCase() === 'RESISTÊNCIAS');
  const profLine = data.infoLines.find((l) => l.label.toUpperCase() === 'PROFICIÊNCIAS');
  const proficiencies = (profLine?.value || '')
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const abilities = mapAbilities(data.abilities ?? []);
  const rituals = mapRituals(data.ritualsRaw ?? []);
  const inventory = mapInventory(data.inventoryRaw ?? []);
  const classe = mapClasse(data.classeText || '');
  const { trilha, ambiguousTrilhas } = inferTrilha(classe, abilities.map((a) => a.name));

  // Descrição (Anotações/Aparência/Personalidade/Histórico/Objetivo) não tem
  // 5 campos equivalentes na nossa ficha — cada bloco não-vazio vira uma
  // seção dentro de `notes`, com o rótulo original da Cris, pra não perder
  // nada do texto livre do jogador.
  const descriptionNotes = (data.descriptionBlocks ?? [])
    .map((b) => `${b.label.trim()}: ${b.value.trim()}`)
    .join('\n\n');

  const notesExtra = [
    proteçãoLine?.value ? `Proteção (importado da Cris): ${proteçãoLine.value}` : '',
    resistLine?.value ? `Resistências (importado da Cris): ${resistLine.value}` : '',
    ambiguousTrilhas.length > 1
      ? `Trilha não determinada com certeza (habilidades importadas sugerem mais de uma): ${ambiguousTrilhas.join(', ')}. Confira e escolha na aba Progressão.`
      : '',
    descriptionNotes,
  ]
    .filter(Boolean)
    .join('\n\n');

  const defenseBonus = data.defenseExtras.reduce((acc, v) => acc + toInt(v, 0), 0);

  const character: Character = {
    ...base,
    name: data.name?.trim() || base.name,
    player: data.player?.trim() || '',
    origem: data.origem?.trim() || '',
    classe,
    // a ficha do C.R.I.S. não tem campo de "Trilha" explícito — inferido a
    // partir do nome das habilidades importadas quando é possível ter
    // certeza (ver inferTrilha); senão fica em branco e vai uma nota em
    // `notes` avisando o motivo, pra preencher na mão.
    trilha,
    nex: toInt(data.nex, base.nex) || base.nex,
    attributes: {
      AGI: toInt(data.attrs.AGI, 1),
      FOR: toInt(data.attrs.FOR, 1),
      INT: toInt(data.attrs.INT, 1),
      PRE: toInt(data.attrs.PRE, 1),
      VIG: toInt(data.attrs.VIG, 1),
    },
    pv: {
      current: toInt(vida?.current, base.pv.current),
      max: toInt(vida?.max, base.pv.max),
      temp: 0,
    },
    pe: {
      current: toInt(esforco?.current, base.pe.current),
      max: toInt(esforco?.max, base.pe.max),
    },
    sanity: {
      current: toInt(sanidade?.current, base.sanity.current),
      max: toInt(sanidade?.max, base.sanity.max),
    },
    defense: toInt(data.defenseTotal, base.defense),
    defenseBonus,
    displacement: parseFloat(data.displacementInputs?.[0] || '') || base.displacement,
    skills,
    proficiencies: proficiencies.length ? proficiencies : base.proficiencies,
    notes: notesExtra || base.notes,
    abilities: abilities.length ? abilities : base.abilities,
    rituals: rituals.length ? rituals : base.rituals,
    inventory: inventory.length ? inventory : base.inventory,
    image: data.image && /^https?:\/\//.test(data.image) ? data.image : base.image,
    // os totais (PV/PE/Sanidade/Defesa máximos) vêm prontos da Cris — autoCalc
    // ligado recalcularia tudo a partir de atributos/NEX e PERDERIA qualquer
    // bônus que a Cris já aplicou (equipamento, poderes etc.) que a gente não
    // consegue reconstruir aqui.
    autoCalc: false,
  };

  return character;
}
