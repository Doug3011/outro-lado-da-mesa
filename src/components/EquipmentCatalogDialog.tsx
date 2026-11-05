import { useState } from 'react';
import { createPortal } from 'react-dom';
import { EQUIPMENT_CATALOG, type CatalogItem } from '../data/equipmentCatalog';

// Catálogo de equipamento do livro (armas, proteções, equipamento geral,
// itens paranormais, modificações/melhorias e maldições) — pedido do
// usuário: "clicar no item e ele ser adicionado ao inventário". Mesmo
// padrão visual/portal do MapPickerDialog/PlacePickerDialog — um clique
// chama `onAdd` (quem abriu decide o que fazer, ver CharacterSheet.tsx) e o
// diálogo continua aberto, pra dar pra adicionar vários itens em sequência.
export function EquipmentCatalogDialog({
  onAdd,
  onClose,
}: {
  onAdd: (item: CatalogItem) => void;
  onClose: () => void;
}) {
  const [groupId, setGroupId] = useState(EQUIPMENT_CATALOG[0].id);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const group = EQUIPMENT_CATALOG.find((g) => g.id === groupId) ?? EQUIPMENT_CATALOG[0];

  const handleAdd = (item: CatalogItem) => {
    onAdd(item);
    setJustAdded(item.id);
    window.setTimeout(() => setJustAdded((cur) => (cur === item.id ? null : cur)), 1200);
  };

  return createPortal(
    <div
      className="prompt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="map-picker equip-catalog">
        <div className="map-picker-head">
          <span className="map-picker-title">Catálogo de Equipamento (livro)</span>
          <button className="small ghost map-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="chip-row equip-catalog-tabs">
          {EQUIPMENT_CATALOG.map((g) => (
            <span
              key={g.id}
              className={`chip ${g.id === groupId ? 'on' : ''}`}
              onClick={() => setGroupId(g.id)}
            >
              {g.label}
            </span>
          ))}
        </div>

        <div className="map-picker-body">
          <p className="faint" style={{ fontSize: 11, marginBottom: 10 }}>
            Clique num item pra adicionar ao inventário. Modificações e maldições não ocupam
            espaço próprio — somam à categoria do item que modificam (indicado com "+I"/"+II").
          </p>
          {group.items.map((it) => (
            <button
              key={it.id}
              className={'equip-catalog-item' + (justAdded === it.id ? ' added' : '')}
              onClick={() => handleAdd(it)}
            >
              <div className="equip-catalog-item-head">
                <span className="equip-catalog-item-name">{it.name}</span>
                <span className="equip-catalog-item-badges">
                  <span className="equip-catalog-badge">Cat. {it.category}</span>
                  {it.slots > 0 && <span className="equip-catalog-badge">{it.slots} esp.</span>}
                </span>
              </div>
              <p className="faint equip-catalog-item-notes">{it.notes}</p>
              {justAdded === it.id && <span className="equip-catalog-added-tag">✓ adicionado</span>}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
