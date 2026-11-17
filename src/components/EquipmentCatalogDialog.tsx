import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { EQUIPMENT_CATALOG, RANGE_LABEL, type CatalogItem } from '../data/equipmentCatalog';
import type { InventoryItem } from '../domain/character';

// Catálogo de equipamento do livro — redesign (pedido do usuário: "etapa de
// Inventário nova", baseado no mockup "Criar-Agente.dc.html"). Grupos/sub-
// filtros/busca/cards com estatística própria batem com o que já existe de
// verdade em `data/equipmentCatalog.ts` (os grupos já seguem exatamente a
// taxonomia do mockup: ITENS/MELHORIAS/MALDIÇÕES/AMALDIÇOADOS — não precisou
// mudar nenhum dado, só a tela).
//
// Diferença importante em relação à versão antiga deste diálogo: modificação
// e maldição agora de verdade "aplicam" numa arma/proteção já no inventário
// (escrevem na `modifications`/`curses` do item, igual o `ModChipList` do
// `InventoryEditor` já faz) — a versão antiga só adicionava o mod/maldição
// como se fosse um item novo qualquer, o que não tinha efeito nenhum.

type IconKey = 'melee' | 'bow' | 'gun' | 'ammo' | 'shield' | 'pack' | 'eye' | 'wrench' | 'curse' | 'drop' | 'pen';

const ICON_PATHS: Record<IconKey, string> = {
  melee: 'M14.5 3.5h6v6L9 21l-6-6zM6.5 12.5l5 5',
  bow: 'M5 3c8 3 13 8 16 16M5 3l16 16M5 3v6M5 3h6',
  gun: 'M3 8h15l2 2v2h-5l-1 2h-3l-1 4H6l1-4H5L3 12z',
  ammo: 'M7 3h4v4l1 2v12H6V9l1-2zM15 3h2l1 3v15h-4V6z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  pack: 'M6 8h12v12H6zM9 8V5h6v3M6 13h12',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 .01 0z',
  wrench: 'M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2z',
  curse: 'M12 3a9 9 0 1 0 .01 0zM5 12q7-6 14 0q-7 6-14 0zM12 12h.01',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
};

function Icon({ icon, size = 15 }: { icon: IconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}

interface NavGroup {
  id: string;
  label: string;
  color: string;
  icon: IconKey;
  // quando o grupo é modificação/maldição: pra onde ela aplica e em qual
  // campo do InventoryItem ela escreve.
  apply?: { field: 'modifications' | 'curses'; target: 'weapon' | 'armor' | 'accessory' };
}
const NAV_SECTIONS: { title: string; groups: NavGroup[] }[] = [
  {
    title: 'ITENS',
    groups: [
      { id: 'armas', label: 'Armas', color: 'var(--rd-sangue)', icon: 'melee' },
      { id: 'municoes', label: 'Munições', color: '#FFB547', icon: 'ammo' },
      { id: 'protecoes', label: 'Proteções', color: '#4A8BF0', icon: 'shield' },
      { id: 'geral', label: 'Equipamento geral', color: 'var(--green)', icon: 'pack' },
      { id: 'paranormais', label: 'Itens paranormais', color: 'var(--purple)', icon: 'eye' },
    ],
  },
  {
    title: 'MELHORIAS',
    groups: [
      { id: 'mods-armas', label: 'Para armas', color: '#FF8A8E', icon: 'wrench', apply: { field: 'modifications', target: 'weapon' } },
      { id: 'mods-protecoes', label: 'Para proteções', color: '#FF8A8E', icon: 'wrench', apply: { field: 'modifications', target: 'armor' } },
      { id: 'mods-acessorios', label: 'Para acessórios', color: '#FF8A8E', icon: 'wrench', apply: { field: 'modifications', target: 'accessory' } },
    ],
  },
  {
    title: 'MALDIÇÕES',
    groups: [
      { id: 'maldicoes-armas', label: 'Para armas', color: 'var(--purple)', icon: 'curse', apply: { field: 'curses', target: 'weapon' } },
      { id: 'maldicoes-protecoes', label: 'Para proteções', color: 'var(--purple)', icon: 'curse', apply: { field: 'curses', target: 'armor' } },
      { id: 'maldicoes-acessorios', label: 'Para acessórios', color: 'var(--purple)', icon: 'curse', apply: { field: 'curses', target: 'accessory' } },
    ],
  },
  {
    title: 'AMALDIÇOADOS',
    groups: [
      { id: 'amaldicoados-sangue', label: 'Sangue', color: 'var(--rd-sangue)', icon: 'drop' },
      { id: 'amaldicoados-morte', label: 'Morte', color: 'var(--rd-morte)', icon: 'drop' },
      { id: 'amaldicoados-conhecimento', label: 'Conhecimento', color: 'var(--rd-conhecimento)', icon: 'drop' },
      { id: 'amaldicoados-energia', label: 'Energia', color: 'var(--rd-energia-purple-soft)', icon: 'drop' },
      { id: 'amaldicoados-medo', label: 'Medo', color: 'var(--rd-medo-soft)', icon: 'drop' },
    ],
  },
];
const NAV_BY_ID = new Map(NAV_SECTIONS.flatMap((s) => s.groups).map((g) => [g.id, g]));

// Tira o prefixo "mod-"/"sah-mod-"/"maldicao-" do id do catálogo pra chegar
// na chave de verdade usada em weaponModifications.ts/weaponCurses.ts/
// armorModifications.ts (conferido: são sempre o mesmo texto, só sem o
// prefixo — ex. "mod-mira-telescopica" -> "mira-telescopica").
function stripModPrefix(id: string): string {
  return id.replace(/^sah-mod-/, '').replace(/^mod-/, '').replace(/^maldicao-/, '');
}

function weaponSub(notes: string, skill?: string): 'Corpo a corpo' | 'Disparo' | 'Fogo' {
  const n = notes.toLowerCase();
  if (n.includes('corpo a corpo')) return 'Corpo a corpo';
  if (/\bfogo\b/.test(n)) return 'Fogo';
  if (n.includes('disparo')) return 'Disparo';
  return skill === 'luta' ? 'Corpo a corpo' : 'Disparo';
}

function critDisplay(critRange?: number, critMult?: number): string {
  const parts: string[] = [];
  if (critRange) parts.push(String(critRange));
  if (critMult && critMult !== 2) parts.push('x' + critMult);
  return parts.length ? parts.join('/') : 'x2';
}

const ICON_BY_GROUP: Record<string, IconKey> = {
  armas: 'melee',
  municoes: 'ammo',
  protecoes: 'shield',
  geral: 'pack',
  paranormais: 'eye',
};

const CATALOG_BY_ID = new Map(EQUIPMENT_CATALOG.flatMap((g) => g.items).map((i) => [i.id, i]));

export function EquipmentCatalogDialog({
  inventory,
  onAdd,
  onApply,
  onClose,
}: {
  inventory: InventoryItem[];
  onAdd: (item: CatalogItem) => void;
  // Aplica uma modificação/maldição num item JÁ existente no inventário
  // (escreve em `modifications` ou `curses`, conforme o grupo).
  onApply: (targetItemId: string, field: 'modifications' | 'curses', key: string) => void;
  onClose: () => void;
}) {
  const [groupId, setGroupId] = useState('armas');
  const [sub, setSub] = useState('Todas');
  const [query, setQuery] = useState('');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [addedLog, setAddedLog] = useState<string[]>([]);

  const group = EQUIPMENT_CATALOG.find((g) => g.id === groupId) ?? EQUIPMENT_CATALOG[0];
  const navMeta = NAV_BY_ID.get(groupId);
  const isApplyGroup = !!navMeta?.apply;
  const hasSubs = groupId === 'armas';

  const weapons = useMemo(() => inventory.filter((it) => CATALOG_BY_ID.get(it.catalogId ?? '')?.weapon), [inventory]);
  const armors = useMemo(
    () => inventory.filter((it) => it.catalogId === 'protecao-leve' || it.catalogId === 'protecao-pesada'),
    [inventory],
  );
  const accessories = useMemo(
    () => inventory.filter((it) => it.catalogId === 'utensilio' || it.catalogId === 'vestimenta'),
    [inventory],
  );

  const q = query.trim().toLowerCase();
  const filtered = group.items.filter((it) => {
    if (q && !it.name.toLowerCase().includes(q)) return false;
    if (hasSubs && sub !== 'Todas' && it.weapon) {
      if (weaponSub(it.notes, it.weapon.skill) !== sub) return false;
    }
    return true;
  });

  const handleAdd = (item: CatalogItem) => {
    onAdd(item);
    setJustAdded(item.id);
    setAddedLog((log) => [...log, item.name]);
    window.setTimeout(() => setJustAdded((cur) => (cur === item.id ? null : cur)), 1200);
  };

  const handleApply = (item: CatalogItem, targetId: string, field: 'modifications' | 'curses') => {
    if (!targetId) return;
    onApply(targetId, field, stripModPrefix(item.id));
    const target = inventory.find((it) => it.id === targetId);
    setAddedLog((log) => [...log, item.name + ' → ' + (target?.name || 'item')]);
  };

  return createPortal(
    <div
      className="prompt-overlay invx-cat-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-label="Catálogo do livro" className="invx-cat-dialog">
        <header className="invx-cat-head">
          <span className="invx-cat-head-icon">
            <Icon icon="pack" size={20} />
          </span>
          <span className="invx-cat-head-titles">
            <span className="invx-cat-head-title">CATÁLOGO DO LIVRO</span>
            <span className="invx-cat-head-sub">
              {navMeta?.label.toUpperCase() ?? group.label.toUpperCase()} · {group.items.length} no livro
            </span>
          </span>
          <label className="invx-cat-search">
            <Icon icon="eye" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no catálogo"
              aria-label="Buscar no catálogo"
            />
          </label>
          <button type="button" className="invx-cat-close" onClick={onClose} aria-label="Fechar catálogo">
            ✕
          </button>
        </header>

        <div className="invx-cat-main">
          <nav aria-label="Categorias do catálogo" className="invx-cat-nav">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="invx-cat-nav-title">{section.title}</div>
                {section.groups.map((g) => {
                  const count = EQUIPMENT_CATALOG.find((eg) => eg.id === g.id)?.items.length ?? 0;
                  const on = g.id === groupId;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      className={`invx-cat-nav-item${on ? ' on' : ''}`}
                      onClick={() => {
                        setGroupId(g.id);
                        setSub('Todas');
                      }}
                    >
                      <span className="invx-cat-nav-item-ico" style={{ color: g.color, background: `color-mix(in srgb, ${g.color} ${on ? 30 : 16}%, transparent)` }}>
                        <Icon icon={g.icon} />
                      </span>
                      <span className="invx-cat-nav-item-name">{g.label}</span>
                      <span className="invx-cat-nav-item-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="invx-cat-body">
            {hasSubs && (
              <div className="invx-cat-subfilters">
                {['Todas', 'Corpo a corpo', 'Disparo', 'Fogo'].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={`invx-cat-subfilter${sub === label ? ' on' : ''}`}
                    onClick={() => setSub(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <p className="invx-cat-hint">
              {isApplyGroup
                ? 'Modificações e maldições não ocupam espaço: elas somam à categoria do item onde você aplicar.'
                : 'Clique em Adicionar pra pôr no inventário. Clicar de novo soma mais um.'}
            </p>

            <div className="invx-cat-grid">
              {filtered.map((it) => {
                const nav = navMeta ?? { color: 'var(--text-dim)', icon: ICON_BY_GROUP[groupId] ?? 'pack' };
                const icon: IconKey = navMeta
                  ? navMeta.icon
                  : it.weapon
                    ? it.weapon.damageType === 'balístico' || it.weapon.damageType === 'fogo'
                      ? 'gun'
                      : it.weapon.skill === 'pontaria'
                        ? 'bow'
                        : 'melee'
                    : ICON_BY_GROUP[groupId] ?? 'pack';
                const inInvItem = inventory.find((y) => y.catalogId === it.id);
                const applyTargets =
                  navMeta?.apply?.target === 'weapon'
                    ? weapons
                    : navMeta?.apply?.target === 'armor'
                      ? armors
                      : navMeta?.apply?.target === 'accessory'
                        ? accessories
                        : [];

                return (
                  <article
                    key={it.id}
                    className={`invx-cat-card${inInvItem ? ' in-inv' : ''}`}
                    style={{ '--card-accent': nav.color } as CSSProperties}
                  >
                    <div className="invx-cat-card-head">
                      <span className="invx-cat-card-icon">
                        <Icon icon={icon} size={19} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="invx-cat-card-name">{it.name}</span>
                        <span className="invx-cat-card-kind">
                          {it.weapon
                            ? weaponSub(it.notes, it.weapon.skill)
                            : isApplyGroup
                              ? navMeta!.apply!.field === 'curses'
                                ? 'Maldição'
                                : 'Modificação'
                              : it.category !== '0'
                                ? `Categoria ${it.category}`
                                : 'Item comum'}
                        </span>
                      </span>
                      {!isApplyGroup && (
                        <span className="invx-pill">
                          {it.category !== '0' ? `Cat. ${it.category}` : 'Cat. 0'}
                          {it.slots > 0 ? ` · ${it.slots} esp.` : ''}
                        </span>
                      )}
                      {isApplyGroup && <span className="invx-pill cat-up">{it.category} CAT</span>}
                    </div>

                    {it.weapon && (
                      <div className="invx-cat-card-stats">
                        <div className="invx-cat-card-stat big">
                          <label>DANO</label>
                          <span>{it.weapon.damage}</span>
                        </div>
                        <div className="invx-cat-card-stat big">
                          <label>CRÍTICO</label>
                          <span>{critDisplay(it.weapon.critRange, it.weapon.critMult)}</span>
                        </div>
                        <div className="invx-cat-card-stat">
                          <label>TIPO</label>
                          <span style={{ fontSize: 11 }}>{it.weapon.damageType}</span>
                        </div>
                        <div className="invx-cat-card-stat">
                          <label>ALCANCE</label>
                          <span style={{ fontSize: 11 }}>{it.weapon.range ? RANGE_LABEL[it.weapon.range] : 'Corpo a corpo'}</span>
                        </div>
                      </div>
                    )}
                    {it.armor && (
                      <div className="invx-cat-card-stats">
                        <div className="invx-cat-card-stat big">
                          <label>DEFESA</label>
                          <span>+{it.armor.defense}</span>
                        </div>
                      </div>
                    )}
                    {!it.weapon && !it.armor && <p className="invx-cat-card-note">{it.notes}</p>}

                    <div className="invx-cat-card-foot">
                      {isApplyGroup ? (
                        <select
                          className="invx-cat-apply-select"
                          defaultValue=""
                          aria-label={`Aplicar ${it.name} em qual item`}
                          onChange={(e) => {
                            handleApply(it, e.target.value, navMeta!.apply!.field);
                            e.target.value = '';
                          }}
                        >
                          <option value="">{applyTargets.length ? 'Aplicar em qual item?' : 'Adicione um item primeiro'}</option>
                          {applyTargets.map((t) => {
                            const already = (navMeta!.apply!.field === 'modifications' ? t.modifications : t.curses)?.includes(
                              stripModPrefix(it.id),
                            );
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name}
                                {already ? ' (já tem)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <>
                          {inInvItem && (
                            <span className="invx-cat-in-inv-tag">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                              No inventário ×{inInvItem.qty}
                            </span>
                          )}
                          {!inInvItem && <span style={{ flex: 1 }} />}
                          <button
                            type="button"
                            className={`invx-cat-add-btn${justAdded === it.id ? ' added' : ''}`}
                            onClick={() => handleAdd(it)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            {inInvItem ? 'Mais um' : 'Adicionar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div className="invx-cat-empty">
                {group.items.length === 0 ? '[Nada cadastrado ainda nesta categoria.]' : 'Nada encontrado com essa busca.'}
              </div>
            )}
          </div>
        </div>

        <footer className="invx-cat-foot">
          <span className="invx-cat-tray-icon">
            <Icon icon="pack" />
          </span>
          <span className="invx-cat-tray-text">
            {addedLog.length ? 'Adicionados agora: ' + addedLog.slice(-4).join(', ') : `Nada adicionado ainda. O inventário tem ${inventory.length} ${inventory.length === 1 ? 'item' : 'itens'}.`}
          </span>
          <button type="button" className="invx-cat-done" onClick={onClose}>
            PRONTO
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
