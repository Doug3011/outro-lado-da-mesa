import { useState } from 'react';
import { SKILLS } from '../data/ordem';
import { EQUIPMENT_EFFECTS } from '../data/equipmentEffects';
import { EQUIPMENT_CATALOG, type CatalogItem } from '../data/equipmentCatalog';
import { WEAPON_MODIFICATIONS, type WeaponModDef } from '../data/weaponModifications';
import { WEAPON_CURSES, type WeaponCurseDef } from '../data/weaponCurses';
import { ARMOR_MODIFICATIONS, type ArmorModDef } from '../data/armorModifications';
import { categoryToNum, finalItemCategory, numToCategory, type Attack, type InventoryItem } from '../domain/character';
import { uid } from '../lib/ids';
import { EquipmentCatalogDialog } from './EquipmentCatalogDialog';

const CATALOG_BY_ID = new Map(EQUIPMENT_CATALOG.flatMap((g) => g.items).map((i) => [i.id, i]));
const RANGE_LABEL: Record<string, string> = { curto: 'Curto', médio: 'Médio', longo: 'Longo', extremo: 'Extremo' };

// Ícone do botão "Catálogo do livro" — substitui o emoji 📖 (movido de
// CharacterSheet.tsx pra cá quando o editor de inventário virou compartilhado
// com CharacterWizard.tsx).
function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ marginRight: 4 }}>
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Lista de chips com descrição completa carregada embaixo da(s)
// selecionada(s) — mesmo mecanismo pra modificação de arma, maldição de
// arma e modificação de proteção, só o texto/efeito já vem pronto de cada
// Def (WeaponModDef/WeaponCurseDef/ArmorModDef: name + description, o
// texto oficial do livro — nada inventado aqui). Pedido do usuário (b):
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
// criação de personagem (CharacterWizard.tsx). Pedido do usuário: poder
// montar o inventário já na criação, sem limite de itens, com o mesmo
// catálogo do livro; e itens com efeito numérico conhecido (proteções,
// escudo, utensílio/vestimenta — ver data/equipmentEffects.ts) podem ser
// "equipados" pra aplicar o bônus automaticamente na ficha (Defesa/
// Proteção/perícia), em vez do jogador ter que somar na mão.
//
// Redesign visual (Tarefa 11.3.2) baseado nos mockups do usuário
// ("Ficha do agente — aba Inventário" e "— editar item arma") — campos
// separados por tipo de item, categoria final calculada, descrição de
// mod/maldição ao selecionar e preview do ataque já calculado (ver
// `attacks`, que é só exibição: o cálculo de verdade já é feito em
// `computeWeaponAttack`/`syncWeaponAttacks`, domain/character.ts).
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
  const [lastRemoved, setLastRemoved] = useState<{ item: InventoryItem; index: number } | null>(null);

  const update = (id: string, patch: Partial<InventoryItem>) =>
    onChange(inventory.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => {
    const index = inventory.findIndex((it) => it.id === id);
    if (index === -1) return;
    setLastRemoved({ item: inventory[index], index });
    onChange(inventory.filter((it) => it.id !== id));
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

  return (
    <div className="rd-sheet-tabpanel">
      {onToggleLimit && (
        <button type="button" className="small" style={{ marginBottom: 8 }} onClick={onToggleLimit}>
          Limite de inventário: {limitEnabled === false ? 'desativado' : 'ativado'}
        </button>
      )}
      {limitEnabled !== false && loadHint && <p className="faint rd-sheet-inv-head">{loadHint}</p>}
      {inventory.map((it) => {
        const effect = it.catalogId ? EQUIPMENT_EFFECTS[it.catalogId] : undefined;
        const catalogItem = it.catalogId ? CATALOG_BY_ID.get(it.catalogId) : undefined;
        const isWeapon = !!catalogItem?.weapon;
        // Só coletes (leve/pesada) recebem modificação de proteção (Tabela
        // 3.6) — escudo/utensílio/vestimenta não têm modificação própria no
        // livro, continuam só com o efeito base de EQUIPMENT_EFFECTS.
        const isArmorMods = it.catalogId === 'protecao-leve' || it.catalogId === 'protecao-pesada';
        // Pedido (a): mostrar Defesa/Dano/Crítico/Alcance/Tipo em campos
        // próprios (lidos do catálogo), não só dentro do texto de notes —
        // vale pra qualquer item com estatística estruturada (inclusive
        // escudo, que não entra em isArmorMods).
        const w = catalogItem?.weapon;
        const armorStats = catalogItem?.armor;
        const modCount = (it.modifications ?? []).length;
        const curseCount = (it.curses ?? []).length;
        const finalCat = finalItemCategory(categoryToNum(it.category), modCount, curseCount);
        const catChanged = modCount > 0 || curseCount > 0;
        const attack = attacks?.find((a) => a.linkedInventoryId === it.id);
        return (
          <div className="list-item inv-item" key={it.id}>
            <div className="li-head">
              <input
                value={it.name}
                placeholder="Item"
                onChange={(e) => update(it.id, { name: e.target.value })}
              />
              <button className="small ghost" onClick={() => remove(it.id)}>
                ✕
              </button>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <div>
                <label>Qtd</label>
                <input
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => update(it.id, { qty: Math.max(1, Number(e.target.value)) })}
                />
              </div>
              <div>
                <label>Espaços</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={it.slots}
                  onChange={(e) => update(it.id, { slots: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Categoria base</label>
                <input
                  value={it.category}
                  placeholder="I / II / III"
                  onChange={(e) => update(it.id, { category: e.target.value })}
                />
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

            <input
              style={{ marginTop: 6 }}
              value={it.notes}
              placeholder="Observações"
              onChange={(e) => update(it.id, { notes: e.target.value })}
            />
            {effect && (
              <div className="row" style={{ marginTop: 6, alignItems: 'center', gap: 8 }}>
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
              <div className="row" style={{ marginTop: 6, alignItems: 'center', gap: 8 }}>
                <label className="chip-row" style={{ alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={!!it.equipped}
                    onChange={(e) => update(it.id, { equipped: e.target.checked })}
                  />
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
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 4 }}>
        <button className="small" onClick={() => add(emptyItem())}>
          + Adicionar item
        </button>
        <button className="small" onClick={() => setShowCatalog(true)}>
          <BookIcon /> Catálogo do livro
        </button>
      </div>
      {showCatalog && (
        <EquipmentCatalogDialog onAdd={(entry) => add(itemFromCatalog(entry))} onClose={() => setShowCatalog(false)} />
      )}
      {lastRemoved && (
        <div className="inv-undo-toast">
          <span>{lastRemoved.item.name || 'Item'} removido</span>
          <button className="small ghost" onClick={undoRemove}>
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

function emptyItem(): InventoryItem {
  return { id: uid(), name: '', category: '', qty: 1, slots: 1, notes: '' };
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
