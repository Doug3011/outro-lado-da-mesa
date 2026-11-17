import { useState, type CSSProperties } from 'react';
import { SKILLS } from '../data/ordem';
import { EQUIPMENT_EFFECTS } from '../data/equipmentEffects';
import { EQUIPMENT_CATALOG, RANGE_LABEL, type CatalogItem } from '../data/equipmentCatalog';
import { WEAPON_MODIFICATIONS, type WeaponModDef } from '../data/weaponModifications';
import { WEAPON_CURSES, type WeaponCurseDef } from '../data/weaponCurses';
import { ARMOR_MODIFICATIONS, type ArmorModDef } from '../data/armorModifications';
import { categoryToNum, finalItemCategory, numToCategory, type Attack, type InventoryItem } from '../domain/character';
import { uid } from '../lib/ids';
import { EquipmentCatalogDialog } from './EquipmentCatalogDialog';

const CATALOG_BY_ID = new Map(EQUIPMENT_CATALOG.flatMap((g) => g.items).map((i) => [i.id, i]));
const MODS_ACESSORIOS = EQUIPMENT_CATALOG.find((g) => g.id === 'mods-acessorios')?.items ?? [];
const MALDICOES_ACESSORIOS = EQUIPMENT_CATALOG.find((g) => g.id === 'maldicoes-acessorios')?.items ?? [];
// Mesma conversão de id→chave do EquipmentCatalogDialog ("mod-aprimorado" ->
// "aprimorado") — modificação/maldição de acessório não tem arquivo de
// efeito numérico próprio (o livro não define nenhum pra isso), então os
// "defs" aqui são só nome+descrição pra mostrar o chip e o texto oficial;
// a categoria final soma do mesmo jeito (finalItemCategory só conta
// quantidade, não lê o conteúdo).
function accessoryDef(it: CatalogItem) {
  return { key: it.id.replace(/^mod-/, '').replace(/^maldicao-/, ''), name: it.name, description: it.notes };
}
const ACCESSORY_MODS = MODS_ACESSORIOS.map(accessoryDef);
const ACCESSORY_CURSES = MALDICOES_ACESSORIOS.map(accessoryDef);

type IconKey = 'melee' | 'bow' | 'gun' | 'shield' | 'pack' | 'eye' | 'pen';
const ICON_PATHS: Record<IconKey, string> = {
  melee: 'M14.5 3.5h6v6L9 21l-6-6zM6.5 12.5l5 5',
  bow: 'M5 3c8 3 13 8 16 16M5 3l16 16M5 3v6M5 3h6',
  gun: 'M3 8h15l2 2v2h-5l-1 2h-3l-1 4H6l1-4H5L3 12z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pack: 'M6 8h12v12H6zM9 8V5h6v3M6 13h12',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 .01 0z',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
};
function Icon({ icon, size = 18 }: { icon: IconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}
const ID_TO_GROUP = new Map(EQUIPMENT_CATALOG.flatMap((g) => g.items.map((i) => [i.id, g.id] as const)));
function iconForItem(it: InventoryItem): IconKey {
  if (!it.catalogId) return 'pen';
  const cat = CATALOG_BY_ID.get(it.catalogId);
  if (cat?.weapon) {
    return cat.weapon.damageType === 'balístico' || cat.weapon.damageType === 'fogo' ? 'gun' : cat.weapon.skill === 'pontaria' ? 'bow' : 'melee';
  }
  if (cat?.armor) return 'shield';
  const groupId = ID_TO_GROUP.get(it.catalogId) ?? '';
  if (groupId === 'paranormais' || groupId.startsWith('amaldicoados')) return 'eye';
  return 'pack';
}

// "Tipo" do item livre — só pra escolher qual ícone mostrar na lista
// compacta (pedido do usuário: nome/tipo/quantidade/espaços/categoria/
// descrição num item fora do catálogo). O livro não distingue "tipo" de
// item livre de nenhum jeito mecânico, então isso é só uma etiqueta visual
// — nada novo no modelo de dados (`InventoryItem` continua igual).
const FREE_KINDS: { key: string; label: string; color: string; icon: IconKey }[] = [
  { key: 'armas', label: 'Arma', color: 'var(--rd-sangue)', icon: 'melee' },
  { key: 'protecoes', label: 'Proteção', color: '#4A8BF0', icon: 'shield' },
  { key: 'geral', label: 'Equipamento', color: 'var(--green)', icon: 'pack' },
  { key: 'paranormais', label: 'Paranormal', color: 'var(--purple)', icon: 'eye' },
  { key: 'livre', label: 'Outro', color: 'var(--text-dim)', icon: 'pen' },
];
const ROMAN = ['0', 'I', 'II', 'III', 'IV'];

// Lista de chips com descrição completa carregada embaixo da(s)
// selecionada(s) — mesmo mecanismo pra modificação de arma, maldição de
// arma, modificação de proteção e, agora, modificação/maldição de
// acessório. O texto/efeito já vem pronto de cada Def (name+description,
// o texto oficial do livro — nada inventado aqui). Pedido do usuário (b):
// "ao selecionar uma modificação ou maldição, ela fica destacada e a
// descrição completa aparece carregada embaixo".
function ModChipList<T extends { key: string; name: string; description: string }>({
  label,
  defs,
  selected,
  onToggle,
  tone,
}: {
  label: string;
  defs: T[];
  selected: string[];
  onToggle: (key: string) => void;
  tone?: 'curse';
}) {
  const active = defs.filter((d) => selected.includes(d.key));
  return (
    <div className={`inv-fx-block${tone === 'curse' ? ' curse' : ''}`}>
      <label className="faint inv-fx-label">{label}</label>
      <div className="chip-row">
        {defs.map((d) => {
          const on = selected.includes(d.key);
          return (
            <span key={d.key} className={`chip ${on ? 'on' : ''}`} onClick={() => onToggle(d.key)}>
              {d.name}
            </span>
          );
        })}
      </div>
      {active.length > 0 && (
        <div className="inv-fx-descs">
          {active.map((d) => (
            <div className="inv-fx-desc" key={d.key}>
              <span className="inv-fx-desc-name">{d.name}</span>
              <span className="inv-fx-desc-text">{d.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Editor de inventário compartilhado — usado tanto na ficha pronta
// (CharacterSheet.tsx, aba "Inventário") quanto na etapa "Inventário" da
// criação de personagem (CharacterWizard.tsx). Redesign (pedido do
// usuário, baseado no mockup "Criar-Agente.dc.html" — etapa Inventário):
// dois cartões de entrada ("Catálogo do livro" / "Item livre"), lista
// compacta da mochila (quantidade com −/+, espaços, categoria final) e,
// ao clicar numa linha, o editor detalhado de sempre (campos separados,
// descrição de mod/maldição, preview "na aba Combate", categoria
// explicada — tudo isso já existia, só mudou de sempre-aberto pra abrir
// sob demanda).
export function InventoryEditor({
  inventory,
  onChange,
  loadHint,
  limitEnabled,
  onToggleLimit,
  attacks,
}: {
  inventory: InventoryItem[];
  onChange: (next: InventoryItem[]) => void;
  loadHint?: string;
  // Toggle "Limite de inventário" (pág. 53) — só aparece quando o caller
  // passa `onToggleLimit` (hoje só CharacterSheet.tsx; CharacterWizard.tsx
  // não mostra, a ficha nem existe salva ainda nessa etapa). Desativado:
  // esconde o aviso de carga por completo e a penalidade de Sobrecarregado
  // para de valer (ver isOverloaded em domain/character.ts).
  limitEnabled?: boolean;
  onToggleLimit?: () => void;
  // Ataques já sincronizados da ficha (char.attacks, via syncWeaponAttacks)
  // — usado só pra mostrar o preview "na aba Combate" de uma arma equipada
  // (procurado por linkedInventoryId). Opcional: sem isso, o preview não
  // aparece (CharacterWizard.tsx ainda não tem uma ficha de verdade pra
  // sincronizar nessa etapa).
  attacks?: Attack[];
}) {
  const [showCatalog, setShowCatalog] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ item: InventoryItem; index: number } | null>(null);

  const [freeName, setFreeName] = useState('');
  const [freeKind, setFreeKind] = useState('livre');
  const [freeQty, setFreeQty] = useState(1);
  const [freeSlots, setFreeSlots] = useState(1);
  const [freeCat, setFreeCat] = useState(0);
  const [freeDesc, setFreeDesc] = useState('');

  const update = (id: string, patch: Partial<InventoryItem>) =>
    onChange(inventory.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => {
    const index = inventory.findIndex((it) => it.id === id);
    if (index === -1) return;
    setLastRemoved({ item: inventory[index], index });
    onChange(inventory.filter((it) => it.id !== id));
    if (expandedId === id) setExpandedId(null);
    window.setTimeout(() => setLastRemoved((cur) => (cur?.item.id === id ? null : cur)), 6000);
  };
  const undoRemove = () => {
    if (!lastRemoved) return;
    const next = inventory.slice();
    next.splice(lastRemoved.index, 0, lastRemoved.item);
    onChange(next);
    setLastRemoved(null);
  };
  const add = (it: InventoryItem) => onChange([...inventory, it]);
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) {
      remove(id);
      return;
    }
    update(id, { qty });
  };

  const resetFreeForm = () => {
    setFreeName('');
    setFreeKind('livre');
    setFreeQty(1);
    setFreeSlots(1);
    setFreeCat(0);
    setFreeDesc('');
  };
  const addFreeItem = () => {
    if (!freeName.trim()) return;
    add({ id: uid(), name: freeName.trim(), category: ROMAN[freeCat], qty: freeQty, slots: freeSlots, notes: freeDesc.trim() });
    resetFreeForm();
    setFreeOpen(false);
  };

  const applyToItem = (targetItemId: string, field: 'modifications' | 'curses', key: string) => {
    const target = inventory.find((it) => it.id === targetItemId);
    if (!target) return;
    const cur = target[field] ?? [];
    if (cur.includes(key)) return;
    update(targetItemId, { [field]: [...cur, key] } as Partial<InventoryItem>);
  };

  return (
    <div className="rd-sheet-tabpanel">
      {onToggleLimit && (
        <button type="button" className="small" style={{ marginBottom: 8, alignSelf: 'flex-start' }} onClick={onToggleLimit}>
          Limite de inventário: {limitEnabled === false ? 'desativado' : 'ativado'}
        </button>
      )}
      {limitEnabled !== false && loadHint && <p className="faint rd-sheet-inv-head">{loadHint}</p>}

      <div className="invx-cards">
        <button type="button" className="invx-card catalog" onClick={() => setShowCatalog(true)}>
          <span className="invx-card-icon">
            <Icon icon="pack" size={24} />
          </span>
          <span className="invx-card-body">
            <span className="invx-card-title">Catálogo do livro</span>
            <span className="invx-card-desc">
              Armas, proteções, equipamentos, itens paranormais, modificações e maldições já com dano, categoria e espaços.
            </span>
            <span className="invx-card-preview">
              {['Armas', 'Proteções', 'Munições', 'Paranormais', 'Amaldiçoados'].map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 4, color: 'var(--rd-sangue)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <button type="button" className={`invx-card free${freeOpen ? ' open' : ''}`} onClick={() => setFreeOpen((v) => !v)}>
          <span className="invx-card-icon">
            <Icon icon="pen" size={22} />
          </span>
          <span className="invx-card-body">
            <span className="invx-card-title">Item livre</span>
            <span className="invx-card-desc">Algo que não está no livro: uma foto antiga, a chave de casa, o amuleto da avó.</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="invx-card-chev">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {freeOpen && (
        <section className="invx-free-form">
          <span className="faint" style={{ fontFamily: 'var(--font-disp)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--rd-sangue)' }}>
            NOVO ITEM LIVRE
          </span>
          <input
            className="invx-free-name"
            value={freeName}
            onChange={(e) => setFreeName(e.target.value)}
            placeholder="Nome do item"
            aria-label="Nome do item"
          />
          <div className="invx-kind-row">
            {FREE_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                className={`invx-kind-chip${freeKind === k.key ? ' on' : ''}`}
                onClick={() => setFreeKind(k.key)}
                style={freeKind === k.key ? ({ borderColor: k.color, background: `color-mix(in srgb, ${k.color} 20%, transparent)` } as CSSProperties) : undefined}
              >
                <span className="invx-dot" style={{ background: k.color }} />
                {k.label}
              </button>
            ))}
          </div>
          <div className="invx-free-grid">
            <div className="invx-stepper">
              <span className="invx-stepper-label">
                <span>QUANTIDADE</span>
                <span>{freeQty}</span>
              </span>
              <button type="button" className="invx-step-btn" aria-label="Diminuir quantidade" onClick={() => setFreeQty((v) => Math.max(1, v - 1))}>
                −
              </button>
              <button type="button" className="invx-step-btn" aria-label="Aumentar quantidade" onClick={() => setFreeQty((v) => v + 1)}>
                +
              </button>
            </div>
            <div className="invx-stepper">
              <span className="invx-stepper-label">
                <span>ESPAÇOS</span>
                <span>{freeSlots}</span>
              </span>
              <button type="button" className="invx-step-btn" aria-label="Diminuir espaços" onClick={() => setFreeSlots((v) => Math.max(0, v - 1))}>
                −
              </button>
              <button type="button" className="invx-step-btn" aria-label="Aumentar espaços" onClick={() => setFreeSlots((v) => v + 1)}>
                +
              </button>
            </div>
            <div className="invx-cat-radio-wrap">
              <span>CATEGORIA</span>
              <div className="invx-cat-radio" role="radiogroup" aria-label="Categoria">
                {ROMAN.map((label, i) => (
                  <button key={label} type="button" className={freeCat === i ? 'on' : ''} aria-checked={freeCat === i} role="radio" onClick={() => setFreeCat(i)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="invx-free-desc">
            <span>O QUE ELE FAZ</span>
            <textarea
              rows={2}
              value={freeDesc}
              onChange={(e) => setFreeDesc(e.target.value)}
              placeholder="Efeito, bônus ou só a história do item"
              aria-label="O que o item faz"
            />
          </label>
          <div className="invx-free-foot">
            <span className="invx-free-hint">{freeName.trim() ? '' : 'Dê um nome pro item.'}</span>
            <button
              type="button"
              className="small ghost"
              onClick={() => {
                resetFreeForm();
                setFreeOpen(false);
              }}
            >
              Cancelar
            </button>
            <button type="button" className="invx-free-add" disabled={!freeName.trim()} onClick={addFreeItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              ADICIONAR
            </button>
          </div>
        </section>
      )}

      <div className="invx-list-head">
        <span className="invx-list-head-label">NO INVENTÁRIO</span>
        <span className="invx-list-count">
          {inventory.length} {inventory.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {inventory.length === 0 && (
        <div className="invx-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8h14l-1 12H6z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          Mochila vazia. Pegue algo no catálogo ou crie um item livre.
        </div>
      )}

      {inventory.map((it) => {
        const effect = it.catalogId ? EQUIPMENT_EFFECTS[it.catalogId] : undefined;
        const catalogItem = it.catalogId ? CATALOG_BY_ID.get(it.catalogId) : undefined;
        const isWeapon = !!catalogItem?.weapon;
        // Só coletes (leve/pesada) recebem modificação de proteção (Tabela
        // 3.6) — escudo não tem modificação própria no livro.
        const isArmorMods = it.catalogId === 'protecao-leve' || it.catalogId === 'protecao-pesada';
        const isAccessory = it.catalogId === 'utensilio' || it.catalogId === 'vestimenta';
        const w = catalogItem?.weapon;
        const armorStats = catalogItem?.armor;
        const modCount = (it.modifications ?? []).length;
        const curseCount = (it.curses ?? []).length;
        const finalCat = finalItemCategory(categoryToNum(it.category), modCount, curseCount);
        const catChanged = modCount > 0 || curseCount > 0;
        const attack = attacks?.find((a) => a.linkedInventoryId === it.id);
        const expanded = expandedId === it.id;

        return (
          <div key={it.id}>
            <div
              className={`invx-row${expanded ? ' expanded' : ''}`}
              style={{ borderLeftColor: isWeapon ? 'var(--rd-sangue)' : armorStats ? '#4A8BF0' : 'var(--line)' }}
              onClick={() => setExpandedId(expanded ? null : it.id)}
            >
              <span
                className="invx-row-icon"
                style={{
                  color: isWeapon ? 'var(--rd-sangue)' : armorStats ? '#4A8BF0' : 'var(--text-dim)',
                  background: isWeapon ? 'color-mix(in srgb, var(--rd-sangue) 18%, transparent)' : armorStats ? 'rgba(74,139,240,0.16)' : 'var(--bg-3)',
                }}
              >
                <Icon icon={iconForItem(it)} />
              </span>
              <span className="invx-row-main">
                <span className="invx-row-name-line">
                  <span className="invx-row-name">{it.name || 'Item'}</span>
                  {!it.catalogId && <span className="invx-badge free">LIVRE</span>}
                  {(it.modifications ?? []).map((k) => (
                    <span key={k} className="invx-badge mod">
                      {(WEAPON_MODIFICATIONS.find((m) => m.key === k) ?? ARMOR_MODIFICATIONS.find((m) => m.key === k) ?? ACCESSORY_MODS.find((m) => m.key === k))?.name.toUpperCase() ?? k}
                    </span>
                  ))}
                  {(it.curses ?? []).map((k) => (
                    <span key={k} className="invx-badge curse">
                      {(WEAPON_CURSES.find((m) => m.key === k) ?? ACCESSORY_CURSES.find((m) => m.key === k))?.name.toUpperCase() ?? k}
                    </span>
                  ))}
                </span>
                <span className="invx-row-summary">
                  {w ? `${w.damage} · crítico ${w.critRange ?? 20}${w.critMult && w.critMult !== 2 ? '/x' + w.critMult : ''} · ${w.damageType}` : armorStats ? `Defesa +${armorStats.defense}` : it.notes || '—'}
                </span>
              </span>
              <span className="invx-row-qty" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="invx-step-btn" aria-label={`Tirar um ${it.name}`} onClick={() => setQty(it.id, it.qty - 1)}>
                  −
                </button>
                <span className="invx-row-qty-val">×{it.qty}</span>
                <button type="button" className="invx-step-btn" aria-label={`Mais um ${it.name}`} onClick={() => setQty(it.id, it.qty + 1)}>
                  +
                </button>
              </span>
              <span className="invx-row-pills">
                <span className="invx-pill">{it.slots} esp.</span>
                <span className={`invx-pill${catChanged ? ' cat-up' : ''}`}>CAT {numToCategory(finalCat)}</span>
              </span>
              <button
                type="button"
                className="invx-row-remove"
                aria-label={`Remover ${it.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(it.id);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </div>

            {expanded && (
              <div className="invx-detail" onClick={(e) => e.stopPropagation()}>
                <div className="row" style={{ gap: 6 }}>
                  <div style={{ flex: 2 }}>
                    <label>Nome</label>
                    <input value={it.name} placeholder="Item" onChange={(e) => update(it.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label>Categoria base</label>
                    <input value={it.category} placeholder="I / II / III" onChange={(e) => update(it.id, { category: e.target.value })} />
                  </div>
                </div>

                <div className="inv-cat-final">
                  Categoria final: <strong>{numToCategory(finalCat)}</strong>
                  {catChanged && (
                    <span className="faint">
                      {' '}
                      ({it.category || '0'}
                      {modCount > 0 ? ` + ${modCount} mod.` : ''}
                      {curseCount > 0 ? ` + ${curseCount} maldiç${curseCount === 1 ? 'ão' : 'ões'}` : ''})
                    </span>
                  )}
                </div>

                {w && (
                  <div className="inv-stats-grid">
                    <div className="inv-stat">
                      <label>Dano</label>
                      <span>{w.damage}</span>
                    </div>
                    <div className="inv-stat">
                      <label>Crítico</label>
                      <span>{w.critRange ?? 20}</span>
                    </div>
                    <div className="inv-stat">
                      <label>Multiplicador</label>
                      <span>x{w.critMult ?? 2}</span>
                    </div>
                    <div className="inv-stat">
                      <label>Alcance</label>
                      <span>{w.range ? RANGE_LABEL[w.range] : 'Corpo a corpo'}</span>
                    </div>
                    <div className="inv-stat">
                      <label>Tipo de dano</label>
                      <span>{w.damageType}</span>
                    </div>
                  </div>
                )}
                {armorStats && (
                  <div className="inv-stats-grid">
                    <div className="inv-stat">
                      <label>Defesa</label>
                      <span>+{armorStats.defense}</span>
                    </div>
                  </div>
                )}

                <input value={it.notes} placeholder="Observações" onChange={(e) => update(it.id, { notes: e.target.value })} />

                {effect && (
                  <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                    <label className="chip-row" style={{ alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={!!it.equipped}
                        disabled={effect.needsSkillChoice && !it.boostSkill}
                        onChange={(e) => update(it.id, { equipped: e.target.checked })}
                      />
                      <span className="faint" style={{ fontSize: 12 }}>
                        Equipado
                        {effect.defenseBonus ? ` (+${effect.defenseBonus} Defesa)` : ''}
                        {effect.protection ? ` (+${effect.protection} Proteção)` : ''}
                        {effect.skillBonus ? ` (+${effect.skillBonus} na perícia escolhida)` : ''}
                        {' — calculado automaticamente na ficha'}
                      </span>
                    </label>
                    {effect.needsSkillChoice && (
                      <select
                        value={it.boostSkill ?? ''}
                        onChange={(e) => update(it.id, { boostSkill: e.target.value || undefined, equipped: false })}
                      >
                        <option value="">Escolha a perícia…</option>
                        {SKILLS.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {isWeapon && (
                  <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                    <label className="chip-row" style={{ alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: 'auto' }} checked={!!it.equipped} onChange={(e) => update(it.id, { equipped: e.target.checked })} />
                      <span className="faint" style={{ fontSize: 12 }}>
                        Equipada — vira um ataque pronto pra rolar na aba Combate, atualizado sozinho
                      </span>
                    </label>
                  </div>
                )}

                {isWeapon && it.equipped && attack && (
                  <div className="inv-preview">
                    <span className="inv-preview-label">Na aba Combate</span>
                    <span className="inv-preview-line">
                      <strong>{attack.test || 'Pontaria'}</strong> · {attack.damage} {attack.type} · crítico {attack.crit}
                      {attack.range !== '—' ? ` · ${attack.range}` : ''}
                    </span>
                  </div>
                )}

                {isWeapon && it.equipped && (
                  <ModChipList
                    label="Modificações"
                    defs={WEAPON_MODIFICATIONS as (WeaponModDef & { key: string })[]}
                    selected={it.modifications ?? []}
                    onToggle={(key) => {
                      const cur = it.modifications ?? [];
                      update(it.id, { modifications: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
                    }}
                  />
                )}
                {isWeapon && it.equipped && (
                  <ModChipList
                    label="Maldições"
                    tone="curse"
                    defs={WEAPON_CURSES as (WeaponCurseDef & { key: string })[]}
                    selected={it.curses ?? []}
                    onToggle={(key) => {
                      const cur = it.curses ?? [];
                      update(it.id, { curses: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
                    }}
                  />
                )}
                {isArmorMods && it.equipped && (
                  <ModChipList
                    label="Modificações"
                    defs={ARMOR_MODIFICATIONS as (ArmorModDef & { key: string })[]}
                    selected={it.modifications ?? []}
                    onToggle={(key) => {
                      const cur = it.modifications ?? [];
                      update(it.id, { modifications: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
                    }}
                  />
                )}
                {isAccessory && (
                  <>
                    <ModChipList
                      label="Modificações"
                      defs={ACCESSORY_MODS}
                      selected={it.modifications ?? []}
                      onToggle={(key) => {
                        const cur = it.modifications ?? [];
                        update(it.id, { modifications: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
                      }}
                    />
                    <ModChipList
                      label="Maldições"
                      tone="curse"
                      defs={ACCESSORY_CURSES}
                      selected={it.curses ?? []}
                      onToggle={(key) => {
                        const cur = it.curses ?? [];
                        update(it.id, { curses: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {lastRemoved && (
        <div className="inv-undo-toast">
          <span>{lastRemoved.item.name || 'Item'} removido</span>
          <button className="small ghost" onClick={undoRemove}>
            Desfazer
          </button>
        </div>
      )}

      {showCatalog && (
        <EquipmentCatalogDialog
          inventory={inventory}
          onAdd={(entry) => add(itemFromCatalog(entry))}
          onApply={applyToItem}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </div>
  );
}

function itemFromCatalog(entry: CatalogItem): InventoryItem {
  return {
    id: uid(),
    name: entry.name,
    category: entry.category,
    qty: 1,
    slots: entry.slots,
    notes: entry.notes,
    catalogId: entry.id,
  };
}
