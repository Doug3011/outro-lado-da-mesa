import { useState } from 'react';
import { SKILLS } from '../data/ordem';
import { EQUIPMENT_EFFECTS } from '../data/equipmentEffects';
import { EQUIPMENT_CATALOG, type CatalogItem } from '../data/equipmentCatalog';
import { WEAPON_MODIFICATIONS } from '../data/weaponModifications';
import type { InventoryItem } from '../domain/character';
import { uid } from '../lib/ids';
import { EquipmentCatalogDialog } from './EquipmentCatalogDialog';

const CATALOG_BY_ID = new Map(EQUIPMENT_CATALOG.flatMap((g) => g.items).map((i) => [i.id, i]));

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

// Editor de inventário compartilhado — usado tanto na ficha pronta
// (CharacterSheet.tsx, aba "Inventário") quanto na etapa "Inventário" da
// criação de personagem (CharacterWizard.tsx). Pedido do usuário: poder
// montar o inventário já na criação, sem limite de itens, com o mesmo
// catálogo do livro; e itens com efeito numérico conhecido (proteções,
// escudo, utensílio/vestimenta — ver data/equipmentEffects.ts) podem ser
// "equipados" pra aplicar o bônus automaticamente na ficha (Defesa/
// Proteção/perícia), em vez do jogador ter que somar na mão.
export function InventoryEditor({
  inventory,
  onChange,
  loadHint,
}: {
  inventory: InventoryItem[];
  onChange: (next: InventoryItem[]) => void;
  loadHint?: string;
}) {
  const [showCatalog, setShowCatalog] = useState(false);

  const update = (id: string, patch: Partial<InventoryItem>) =>
    onChange(inventory.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(inventory.filter((it) => it.id !== id));
  const add = (it: InventoryItem) => onChange([...inventory, it]);

  return (
    <div className="rd-sheet-tabpanel">
      {loadHint && <p className="faint rd-sheet-inv-head">{loadHint}</p>}
      {inventory.map((it) => {
        const effect = it.catalogId ? EQUIPMENT_EFFECTS[it.catalogId] : undefined;
        const catalogItem = it.catalogId ? CATALOG_BY_ID.get(it.catalogId) : undefined;
        const isWeapon = !!catalogItem?.weapon;
        return (
          <div className="list-item" key={it.id}>
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
                <label>Categoria</label>
                <input
                  value={it.category}
                  placeholder="I / II / III"
                  onChange={(e) => update(it.id, { category: e.target.value })}
                />
              </div>
            </div>
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
            {isWeapon && it.equipped && (
              <div style={{ marginTop: 6 }}>
                <label className="faint" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Modificações
                </label>
                <div className="chip-row">
                  {WEAPON_MODIFICATIONS.map((mod) => {
                    const on = (it.modifications ?? []).includes(mod.key);
                    return (
                      <span
                        key={mod.key}
                        className={`chip ${on ? 'on' : ''}`}
                        title={`${mod.description} (${mod.scope})`}
                        onClick={() => {
                          const cur = it.modifications ?? [];
                          const next = on ? cur.filter((k) => k !== mod.key) : [...cur, mod.key];
                          update(it.id, { modifications: next });
                        }}
                      >
                        {mod.name}
                      </span>
                    );
                  })}
                </div>
              </div>
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
