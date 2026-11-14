import { useRef, useState, type RefObject } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
import { ATTRIBUTES, SKILLS, SKILL_BY_KEY, type AttrKey } from '../data/ordem';
import { skillBonus } from '../domain/character';
import {
  CREATURE_SIZES,
  CREATURE_SIZE_SPACE,
  creatureBloodied,
  emptyCreature,
  emptyCreatureAction,
  emptyCreatureHability,
  emptyCreatureSkill,
  normalizeCreature,
  type Creature,
  type CreatureAction,
  type CreatureHability,
  type CreatureSkill,
} from '../domain/creature';
import type { InitiativeEntry } from '../types';
import { fileToDownscaledDataURL } from '../lib/image';

const ACTION_COSTS = ['Padrão', 'Livre', 'Completa', 'Reação'];

// Painel "Combate" da Área do Mestre, dentro da mesa — pedido do usuário:
// criar fichas de ameaças (Capítulo 7 do livro — bem mais simples que a
// ficha de personagem, já que o livro trata ameaças como "simplificadas")
// e organizar o combate junto com os personagens, pela iniciativa. Fichas
// de ameaça vivem na CENA ativa (Scene.creatures, mesmo padrão de
// Scene.tokens) — fazem mais sentido por encontro do que por mesa inteira.
export function CombatTracker() {
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const characters = useTableStore((s) => s.characters);
  const upsertCreature = useTableStore((s) => s.upsertCreature);
  const deleteCreature = useTableStore((s) => s.deleteCreature);
  const updateScene = useTableStore((s) => s.updateScene);
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);

  const scene = activeScene({ scenes, activeSceneId });
  const creatures = scene.creatures ?? {};
  const combat = scene.combat;
  const charList = Object.values(characters);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  const setCombat = (patch: Partial<NonNullable<typeof combat>>) => {
    const base = combat ?? { order: [], turnIndex: -1, round: 1 };
    updateScene({ combat: { ...base, ...patch } });
  };

  const addCreature = () => {
    const c = emptyCreature();
    upsertCreature(c);
    setEditingId(c.id);
  };

  const nameFor = (e: InitiativeEntry): string =>
    e.kind === 'character' ? characters[e.id]?.name || '—' : creatures[e.id]?.name || '—';

  const addToCombat = (id: string, kind: 'character' | 'creature') => {
    const order = combat?.order ?? [];
    if (order.some((e) => e.id === id)) return;
    setCombat({ order: [...order, { id, kind, initiative: 0 }] });
  };

  const removeFromCombat = (id: string) => {
    setCombat({ order: (combat?.order ?? []).filter((e) => e.id !== id) });
  };

  const rollInitiativeFor = (entry: InitiativeEntry) => {
    if (entry.kind === 'character') {
      const c = characters[entry.id];
      if (!c) return;
      const bonus = skillBonus(c, 'iniciativa');
      rollOrdem({ label: `${c.name} · Iniciativa`, attributeValue: c.attributes.AGI, bonus, dt: null });
      return;
    }
    const cr = creatures[entry.id];
    if (!cr) return;
    rollOrdem({ label: `${cr.name} · Iniciativa`, attributeValue: cr.attributes.AGI, bonus: cr.initiative, dt: null });
  };

  const rollAllInitiative = () => {
    const order = combat?.order ?? [];
    const withRolls = order.map((e) => {
      const bonus =
        e.kind === 'character'
          ? (characters[e.id] ? skillBonus(characters[e.id], 'iniciativa') : 0)
          : creatures[e.id]?.initiative ?? 0;
      const attrValue =
        e.kind === 'character' ? characters[e.id]?.attributes.AGI ?? 1 : creatures[e.id]?.attributes.AGI ?? 1;
      const dice = Array.from({ length: Math.max(1, attrValue) }, () => 1 + Math.floor(Math.random() * 20));
      const total = Math.max(...dice) + bonus;
      return { ...e, initiative: total };
    });
    withRolls.sort((a, b) => b.initiative - a.initiative);
    setCombat({ order: withRolls, turnIndex: -1, round: 1 });
  };

  const startCombat = () => {
    const order = [...(combat?.order ?? [])].sort((a, b) => b.initiative - a.initiative);
    setCombat({ order, turnIndex: 0, round: 1 });
  };

  const nextTurn = () => {
    const order = combat?.order ?? [];
    if (order.length === 0) return;
    const cur = combat?.turnIndex ?? -1;
    const atEnd = cur >= order.length - 1;
    setCombat({ turnIndex: atEnd ? 0 : cur + 1, round: (combat?.round ?? 1) + (atEnd ? 1 : 0) });
  };

  const endCombat = () => setCombat({ order: [], turnIndex: -1, round: 1 });

  const notInCombat = (kind: 'character' | 'creature') =>
    (kind === 'character' ? charList.map((c) => c.id) : Object.keys(creatures)).filter(
      (id) => !(combat?.order ?? []).some((e) => e.id === id),
    );

  return (
    <div className="rd-sheet-tabpanel">
      <div className="rd-card" style={{ padding: 10, marginBottom: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Iniciativa{combat && combat.turnIndex >= 0 ? ` · Rodada ${combat.round}` : ''}</strong>
          <div className="row" style={{ gap: 6 }}>
            <button className="small" onClick={() => setShowAddPicker((v) => !v)}>
              + Adicionar
            </button>
            {(combat?.order.length ?? 0) > 0 && (
              <button className="small ghost" onClick={rollAllInitiative}>
                Rolar todas
              </button>
            )}
            {combat && combat.order.length > 0 && combat.turnIndex < 0 && (
              <button className="small" onClick={startCombat}>
                Começar combate
              </button>
            )}
            {combat && combat.turnIndex >= 0 && (
              <button className="small" onClick={nextTurn}>
                Próximo turno
              </button>
            )}
            {combat && combat.order.length > 0 && (
              <button className="small ghost" onClick={endCombat}>
                Encerrar
              </button>
            )}
          </div>
        </div>

        {showAddPicker && (
          <div className="chip-row" style={{ marginTop: 8 }}>
            {notInCombat('character').map((id) => (
              <span key={id} className="chip" onClick={() => addToCombat(id, 'character')}>
                👤 {characters[id].name}
              </span>
            ))}
            {notInCombat('creature').map((id) => (
              <span key={id} className="chip" onClick={() => addToCombat(id, 'creature')}>
                💀 {creatures[id].name}
              </span>
            ))}
            {notInCombat('character').length === 0 && notInCombat('creature').length === 0 && (
              <span className="faint" style={{ fontSize: 12 }}>
                Todo mundo já está na lista.
              </span>
            )}
          </div>
        )}

        {(combat?.order.length ?? 0) === 0 ? (
          <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            Ninguém na lista ainda — adicione jogadores e/ou criaturas pra organizar a ordem.
          </p>
        ) : (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {combat!.order.map((entry, i) => {
              const isTurn = combat!.turnIndex === i;
              const cr = entry.kind === 'creature' ? creatures[entry.id] : null;
              return (
                <div
                  key={entry.id}
                  className="list-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderColor: isTurn ? '#e01e2b' : undefined,
                    background: isTurn ? 'rgba(224,30,43,0.12)' : undefined,
                  }}
                >
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{entry.kind === 'character' ? '👤' : '💀'}</span>
                  <strong style={{ flex: 1 }}>{nameFor(entry)}</strong>
                  {cr && (
                    <span className="faint" style={{ fontSize: 12 }}>
                      PV {cr.pvCurrent}/{cr.pvMax}
                    </span>
                  )}
                  <input
                    type="number"
                    style={{ width: 56 }}
                    value={entry.initiative}
                    onChange={(e) => {
                      const order = combat!.order.map((x) => (x.id === entry.id ? { ...x, initiative: Number(e.target.value) } : x));
                      setCombat({ order });
                    }}
                    aria-label="Iniciativa"
                  />
                  <button className="small ghost" title="Rolar iniciativa" onClick={() => rollInitiativeFor(entry)}>
                    🎲
                  </button>
                  <button className="small ghost" onClick={() => removeFromCombat(entry.id)}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <strong>Criaturas desta cena</strong>
        <button className="small" onClick={addCreature}>
          + Nova criatura
        </button>
      </div>

      {Object.keys(creatures).length === 0 && (
        <p className="faint" style={{ fontSize: 12 }}>
          Nenhuma criatura criada nesta cena ainda.
        </p>
      )}

      {Object.values(creatures).map((raw) => {
        const cr = normalizeCreature(raw);
        return (
          <CreatureCard
            key={cr.id}
            creature={cr}
            expanded={editingId === cr.id}
            onToggle={() => setEditingId(editingId === cr.id ? null : cr.id)}
            onChange={(next) => upsertCreature(next)}
            onDelete={() => {
              if (confirm(`Excluir a ficha de "${cr.name}"? Isso tira ela do combate também.`)) {
                deleteCreature(cr.id);
                if (editingId === cr.id) setEditingId(null);
              }
            }}
            onRollAction={(action) => {
              rollOrdem({
                label: `${cr.name} · ${action.name || 'ataque'} (teste)`,
                attributeValue: cr.attributes[action.testAttribute],
                bonus: action.testBonus,
                dt: null,
              });
            }}
            onRollDamage={(action) => {
              if (action.damage) rollFree(`${cr.name} · ${action.name || 'ataque'} (dano)`, action.damage);
            }}
            onRollSkill={(skill) => {
              const def = SKILL_BY_KEY[skill.key];
              rollOrdem({
                label: `${cr.name} · ${def?.name ?? skill.key}`,
                attributeValue: cr.attributes[def?.attr ?? 'AGI'],
                bonus: skill.bonus,
                dt: null,
              });
            }}
            onRollHability={(h) => {
              if (h.rollDice) rollFree(`${cr.name} · ${h.name || 'habilidade'}`, h.rollDice);
            }}
            portraitInputRef={portraitInputRef}
          />
        );
      })}
    </div>
  );
}

function CreatureCard({
  creature,
  expanded,
  onToggle,
  onChange,
  onDelete,
  onRollAction,
  onRollDamage,
  onRollSkill,
  onRollHability,
  portraitInputRef,
}: {
  creature: Creature;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: Creature) => void;
  onDelete: () => void;
  onRollAction: (a: CreatureAction) => void;
  onRollDamage: (a: CreatureAction) => void;
  onRollSkill: (s: CreatureSkill) => void;
  onRollHability: (h: CreatureHability) => void;
  portraitInputRef: RefObject<HTMLInputElement>;
}) {
  const patch = (p: Partial<Creature>) => onChange({ ...creature, ...p });
  const patchAttr = (k: AttrKey, v: number) => patch({ attributes: { ...creature.attributes, [k]: v } });

  const patchAction = (id: string, p: Partial<CreatureAction>) =>
    patch({ actions: creature.actions.map((a) => (a.id === id ? { ...a, ...p } : a)) });
  const addAction = () => patch({ actions: [...creature.actions, emptyCreatureAction()] });
  const removeAction = (id: string) => patch({ actions: creature.actions.filter((a) => a.id !== id) });

  const addSkill = (key: string) => patch({ skills: [...creature.skills, emptyCreatureSkill(key)] });
  const patchSkill = (id: string, p: Partial<CreatureSkill>) =>
    patch({ skills: creature.skills.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const removeSkill = (id: string) => patch({ skills: creature.skills.filter((s) => s.id !== id) });

  const addHability = () => patch({ abilities: [...creature.abilities, emptyCreatureHability()] });
  const patchHability = (id: string, p: Partial<CreatureHability>) =>
    patch({ abilities: creature.abilities.map((h) => (h.id === id ? { ...h, ...p } : h)) });
  const removeHability = (id: string) => patch({ abilities: creature.abilities.filter((h) => h.id !== id) });

  return (
    <div className="list-item" style={{ marginBottom: 8 }}>
      <div className="li-head" style={{ alignItems: 'center' }}>
        {creature.image ? (
          <img src={creature.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
        ) : (
          <span style={{ width: 32, height: 32, borderRadius: 6, background: '#2a2a30', display: 'inline-block' }} />
        )}
        <input value={creature.name} placeholder="Nome da ameaça" onChange={(e) => patch({ name: e.target.value })} />
        <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          VD
        </span>
        <input
          type="number"
          style={{ width: 56 }}
          value={creature.vd}
          onChange={(e) => patch({ vd: Number(e.target.value) })}
        />
        <button className="small ghost" onClick={onToggle}>
          {expanded ? 'Fechar' : 'Editar'}
        </button>
        <button className="small ghost" onClick={onDelete}>
          ✕
        </button>
      </div>

      <div className="row" style={{ marginTop: 6, gap: 10, alignItems: 'center' }}>
        <span className="faint" style={{ fontSize: 12 }}>
          PV
        </span>
        <input
          type="number"
          style={{ width: 64 }}
          value={creature.pvCurrent}
          onChange={(e) => patch({ pvCurrent: Number(e.target.value) })}
        />
        <span className="faint">/ {creature.pvMax}</span>
        <span className="faint" style={{ fontSize: 11 }}>
          (machucado {creatureBloodied(creature)})
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="row">
            <button className="small ghost" onClick={() => portraitInputRef.current?.click()}>
              Token/retrato…
            </button>
            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void fileToDownscaledDataURL(f, 320).then((u) => u && patch({ image: u }));
              }}
            />
            {creature.image && (
              <button className="small ghost" onClick={() => patch({ image: undefined })}>
                Remover imagem
              </button>
            )}
          </div>

          <div className="row">
            <input
              value={creature.descriptor}
              placeholder="Descritor (ex.: Sangue, Energia, Pessoa…)"
              onChange={(e) => patch({ descriptor: e.target.value })}
            />
            <select value={creature.size} onChange={(e) => patch({ size: e.target.value as Creature['size'] })}>
              {CREATURE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} ({CREATURE_SIZE_SPACE[s]})
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={creature.flavor}
            placeholder="Descrição curta"
            rows={2}
            onChange={(e) => patch({ flavor: e.target.value })}
          />

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Percepção</span>
              <input
                type="number"
                value={creature.perception}
                onChange={(e) => patch({ perception: Number(e.target.value) })}
              />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Iniciativa</span>
              <input
                type="number"
                value={creature.initiative}
                onChange={(e) => patch({ initiative: Number(e.target.value) })}
              />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Defesa</span>
              <input type="number" value={creature.defense} onChange={(e) => patch({ defense: Number(e.target.value) })} />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Fortitude</span>
              <input
                type="number"
                value={creature.fortitude}
                onChange={(e) => patch({ fortitude: Number(e.target.value) })}
              />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Reflexos</span>
              <input type="number" value={creature.reflexes} onChange={(e) => patch({ reflexes: Number(e.target.value) })} />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 110 }}>
              <span className="rd-sheet-field-label">Vontade</span>
              <input type="number" value={creature.will} onChange={(e) => patch({ will: Number(e.target.value) })} />
            </label>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <label className="rd-sheet-field" style={{ maxWidth: 90 }}>
              <span className="rd-sheet-field-label">PV máx.</span>
              <input type="number" value={creature.pvMax} onChange={(e) => patch({ pvMax: Number(e.target.value) })} />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 90 }}>
              <span className="rd-sheet-field-label">PV temp.</span>
              <input type="number" value={creature.pvTemp} onChange={(e) => patch({ pvTemp: Number(e.target.value) })} />
            </label>
            <label className="rd-sheet-field" style={{ maxWidth: 90 }}>
              <span className="rd-sheet-field-label">Desloc. (m)</span>
              <input
                type="number"
                value={creature.displacement}
                onChange={(e) => patch({ displacement: Number(e.target.value) })}
              />
            </label>
            <input
              value={creature.damageResistance}
              placeholder="Resistência a dano (ex.: RD 10/Morte)"
              onChange={(e) => patch({ damageResistance: e.target.value })}
              style={{ flex: 1, minWidth: 160 }}
            />
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {ATTRIBUTES.map((a) => (
              <label key={a.key} className="rd-sheet-field" style={{ maxWidth: 80 }}>
                <span className="rd-sheet-field-label">{a.short}</span>
                <input type="number" value={creature.attributes[a.key]} onChange={(e) => patchAttr(a.key, Number(e.target.value))} />
              </label>
            ))}
          </div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Perícias</strong>
            <select
              value=""
              style={{ maxWidth: 180 }}
              onChange={(e) => {
                if (e.target.value) addSkill(e.target.value);
              }}
            >
              <option value="">+ adicionar perícia…</option>
              {SKILLS.filter((s) => !creature.skills.some((sk) => sk.key === s.key)).map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {creature.skills.length === 0 && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhuma perícia adicionada ainda.
            </p>
          )}
          {creature.skills.map((sk) => {
            const def = SKILL_BY_KEY[sk.key];
            return (
              <div key={sk.id} className="row" style={{ alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1 }}>
                  {def?.name ?? sk.key}
                  <span className="faint" style={{ fontSize: 11 }}> ({def?.attr ?? '?'}O+bônus)</span>
                </span>
                <input
                  type="number"
                  style={{ width: 56 }}
                  value={sk.bonus}
                  placeholder="Bônus"
                  onChange={(e) => patchSkill(sk.id, { bonus: Number(e.target.value) })}
                />
                <button className="small" onClick={() => onRollSkill(sk)}>
                  Rolar
                </button>
                <button className="small ghost" onClick={() => removeSkill(sk.id)}>
                  ✕
                </button>
              </div>
            );
          })}

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <strong style={{ fontSize: 13 }}>Habilidades</strong>
            <button className="small ghost" onClick={addHability}>
              + Habilidade
            </button>
          </div>
          {creature.abilities.length === 0 && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhuma habilidade adicionada ainda.
            </p>
          )}
          {creature.abilities.map((h) => (
            <div key={h.id} className="list-item" style={{ padding: 8 }}>
              <div className="row">
                <input
                  value={h.name}
                  placeholder="Nome da habilidade"
                  onChange={(e) => patchHability(h.id, { name: e.target.value })}
                />
                <button className="small ghost" onClick={() => removeHability(h.id)}>
                  ✕
                </button>
              </div>
              <textarea
                value={h.description}
                placeholder="Descrição"
                rows={2}
                style={{ marginTop: 6 }}
                onChange={(e) => patchHability(h.id, { description: e.target.value })}
              />
              <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
                <input
                  style={{ maxWidth: 140 }}
                  value={h.rollDice ?? ''}
                  placeholder="Dado (ex.: 2d6) — opcional"
                  onChange={(e) => patchHability(h.id, { rollDice: e.target.value || undefined })}
                />
                {h.rollDice && (
                  <button className="small" onClick={() => onRollHability(h)}>
                    Rolar
                  </button>
                )}
              </div>
            </div>
          ))}

          <textarea
            value={creature.notes}
            placeholder="Observações"
            rows={2}
            onChange={(e) => patch({ notes: e.target.value })}
          />

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Ações</strong>
            <button className="small ghost" onClick={addAction}>
              + Ação
            </button>
          </div>
          {creature.actions.map((action) => (
            <div key={action.id} className="list-item" style={{ padding: 8 }}>
              <div className="row">
                <select value={action.cost} onChange={(e) => patchAction(action.id, { cost: e.target.value })} style={{ maxWidth: 110 }}>
                  {ACTION_COSTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  value={action.name}
                  placeholder="Nome da ação/ataque"
                  onChange={(e) => patchAction(action.id, { name: e.target.value })}
                />
                <button className="small ghost" onClick={() => removeAction(action.id)}>
                  ✕
                </button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  value={action.range}
                  placeholder="Alcance (Corpo a corpo / À distância…)"
                  onChange={(e) => patchAction(action.id, { range: e.target.value })}
                />
                <select
                  value={action.testAttribute}
                  onChange={(e) => patchAction(action.id, { testAttribute: e.target.value as AttrKey })}
                  style={{ maxWidth: 80 }}
                >
                  {ATTRIBUTES.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.short}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  style={{ width: 56 }}
                  value={action.testBonus}
                  placeholder="Bônus"
                  onChange={(e) => patchAction(action.id, { testBonus: Number(e.target.value) })}
                />
                <button className="small" onClick={() => onRollAction(action)}>
                  Testar
                </button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  value={action.damage}
                  placeholder="Dano (ex.: 2d8+9)"
                  onChange={(e) => patchAction(action.id, { damage: e.target.value })}
                />
                <input
                  value={action.damageType}
                  placeholder="Tipo"
                  onChange={(e) => patchAction(action.id, { damageType: e.target.value })}
                />
                <input
                  value={action.crit}
                  placeholder="Crít (20/x2)"
                  onChange={(e) => patchAction(action.id, { crit: e.target.value })}
                />
                <button className="small" disabled={!action.damage} onClick={() => onRollDamage(action)}>
                  Rolar dano
                </button>
              </div>
              <textarea
                value={action.description}
                placeholder="Efeito/descrição adicional"
                rows={2}
                style={{ marginTop: 6 }}
                onChange={(e) => patchAction(action.id, { description: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
