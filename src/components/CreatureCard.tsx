import { useRef, useState, type RefObject } from 'react';
import { ATTRIBUTES, ELEMENTS, ELEMENT_COLOR, SKILLS, SKILL_BY_KEY, type AttrKey } from '../data/ordem';
import {
  CREATURE_SIZES,
  CREATURE_SIZE_SPACE,
  creatureBloodied,
  emptyCreatureAction,
  emptyCreatureHability,
  emptyCreatureSkill,
  type Creature,
  type CreatureAction,
  type CreatureHability,
  type CreatureSkill,
} from '../domain/creature';
import { fileToDownscaledDataURL } from '../lib/image';

const ACTION_COSTS = ['Padrão', 'Livre', 'Completa', 'Reação'];
const CARD_TABS = ['Status', 'Atributos', 'Ações', 'Habilidades', 'Notas'];
const PV_DELTAS = [-5, -1, 1, 5];

// Ficha de ameaça redesenhada (Tarefa 5 do pedido de bugs/funções) —
// reaproveitada tanto dentro da mesa (CombatTracker.tsx, janela Combate)
// quanto na Área do Mestre (biblioteca de monstros, Home.tsx). Mesmos
// dados/ações de sempre (nada de lógica nova aqui além do seletor de
// elemento/tags, campos já adicionados em domain/creature.ts) — só a
// apresentação mudou, pra não arriscar quebrar nada do combate que já
// funcionava (referência visual: Criatura-Mestre.dc.html/Criatura-
// Ficha.dc.html).
export function CreatureCard({
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
  portraitInputRef?: RefObject<HTMLInputElement>;
}) {
  const [tab, setTab] = useState(0);
  const [pvHit, setPvHit] = useState(false);
  const fallbackPortraitRef = useRef<HTMLInputElement>(null);
  const portraitRef = portraitInputRef ?? fallbackPortraitRef;

  const accent = creature.el ? ELEMENT_COLOR[creature.el] : 'var(--rd-sangue)';
  const cssVars = { '--cm-accent': accent } as React.CSSProperties;

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

  const adjustPv = (d: number) => {
    patch({ pvCurrent: Math.max(0, Math.min(creature.pvMax, creature.pvCurrent + d)) });
    setPvHit(true);
    window.setTimeout(() => setPvHit(false), 300);
  };

  const hurtAt = creatureBloodied(creature);
  const pvPct = creature.pvMax > 0 ? Math.max(0, Math.min(1, creature.pvCurrent / creature.pvMax)) : 0;
  const status =
    creature.pvCurrent <= 0 ? ['DERRUBADA', '#8a9099'] : creature.pvCurrent <= hurtAt ? ['MACHUCADA', '#ffb547'] : ['INTEIRA', '#7fe0a8'];

  if (!expanded) {
    return (
      <div className="cm-card-row" style={cssVars}>
        {creature.image ? (
          <img className="cm-card-avatar" src={creature.image} alt="" />
        ) : (
          <span className="cm-card-avatar">{(creature.name.trim()[0] || '?').toUpperCase()}</span>
        )}
        <input
          className="cm-card-name-input"
          value={creature.name}
          placeholder="Nome da ameaça"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <span className="cm-chip" title="PV atual / máximo">
          PV {creature.pvCurrent}/{creature.pvMax}
        </span>
        <span className="cm-chip">VD {creature.vd}</span>
        <button className="cm-btn cm-btn-ghost" onClick={onToggle}>
          Editar
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={onDelete} aria-label="Excluir criatura">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="cm-card-row" style={{ ...cssVars, flexDirection: 'column', alignItems: 'stretch', gap: 14, padding: 16 }}>
      {/* ---- cabeçalho da criatura ---- */}
      <div className="cm-hero">
        <div className="cm-hero-top">
          <button className="cm-portrait-btn" onClick={() => portraitRef.current?.click()} aria-label="Escolher token ou retrato">
            {creature.image ? <img src={creature.image} alt="" /> : (creature.name.trim()[0] || '?').toUpperCase()}
          </button>
          <input
            ref={portraitRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void fileToDownscaledDataURL(f, 320).then((u) => u && patch({ image: u }));
            }}
          />
          <div className="cm-hero-fields">
            <div className="cm-name-row">
              <input
                className="cm-name-input-lg"
                value={creature.name}
                placeholder="Nome da criatura"
                onChange={(e) => patch({ name: e.target.value })}
              />
              <label className="cm-vd-field">
                <span className="cm-vd-label">VD</span>
                <input
                  className="cm-vd-input"
                  type="number"
                  value={creature.vd}
                  onChange={(e) => patch({ vd: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="cm-chip-row">
              {creature.el && (
                <span className="cm-chip cm-el-chip">
                  <span className="cm-dot" style={{ background: accent }} />
                  {ELEMENTS.find((e) => e.key === creature.el)?.name}
                </span>
              )}
              <span className="cm-chip">
                {creature.size} ({CREATURE_SIZE_SPACE[creature.size]})
              </span>
              <span className="cm-chip">DEF {creature.defense}</span>
              <span className="cm-chip">Desloc. {creature.displacement}m</span>
            </div>
          </div>
          {creature.image && (
            <button className="cm-btn cm-btn-ghost" onClick={() => patch({ image: undefined })}>
              Remover imagem
            </button>
          )}
        </div>

        <div className="cm-pv-row">
          <div className="cm-pv-head">
            <span className="cm-pv-label">VIDA</span>
            <span className={`cm-pv-num${pvHit ? ' hit' : ''}`}>{creature.pvCurrent}</span>
            <span className="cm-pv-max">/ {creature.pvMax}</span>
            {creature.pvTemp > 0 && (
              <span className="cm-chip" style={{ color: '#7fc8ff' }}>
                +{creature.pvTemp} temp
              </span>
            )}
            <span className="cm-pv-status" style={{ color: status[1] }}>
              {status[0]}
            </span>
          </div>
          <div className="cm-pv-bar-track">
            <div className="cm-pv-bar-fill" style={{ width: `${pvPct * 100}%` }} />
            {creature.pvMax > 0 && (
              <span className="cm-pv-mark" style={{ left: `${Math.min(100, (hurtAt / creature.pvMax) * 100)}%` }} title="Machucado" />
            )}
          </div>
          <div className="cm-pv-btns">
            {PV_DELTAS.map((d) => (
              <button key={d} className="cm-btn cm-pv-btn" onClick={() => adjustPv(d)}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: '#8e8088' }}>Machucado em {hurtAt}</span>
          </div>
        </div>
      </div>

      {/* ---- abas ---- */}
      <div className="cm-tabs" role="tablist" aria-label="Ficha da criatura">
        {CARD_TABS.map((label, i) => {
          const count = i === 1 ? creature.skills.length : i === 2 ? creature.actions.length : i === 3 ? creature.abilities.length : 0;
          return (
            <button
              key={label}
              role="tab"
              aria-selected={tab === i}
              className={`cm-tab${tab === i ? ' on' : ''}`}
              onClick={() => setTab(i)}
            >
              {label}
              {count > 0 && <span className="cm-tab-count">{count}</span>}
              <span className="cm-tab-bar" />
            </button>
          );
        })}
      </div>

      {/* ---- STATUS ---- */}
      {tab === 0 && (
        <div className="cm-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="cm-field-label">ELEMENTO</span>
            <div className="cm-el-grid">
              {ELEMENTS.map((e) => {
                const on = creature.el === e.key;
                return (
                  <button
                    key={e.key}
                    type="button"
                    className={`cm-el-btn${on ? ' on' : ''}`}
                    style={on ? { borderColor: e.color, background: `${e.color}26` } : undefined}
                    onClick={() => patch({ el: on ? undefined : e.key })}
                  >
                    <span className="cm-dot" style={{ background: e.color }} />
                    {e.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: 10 }}>
            <label className="cm-field">
              <span className="cm-field-label">DESCRITOR</span>
              <input
                value={creature.descriptor}
                placeholder="ex.: Pessoa, Sangue…"
                onChange={(e) => patch({ descriptor: e.target.value })}
              />
            </label>
            <label className="cm-field">
              <span className="cm-field-label">TAMANHO</span>
              <select value={creature.size} onChange={(e) => patch({ size: e.target.value as Creature['size'] })}>
                {CREATURE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="cm-field">
            <span className="cm-field-label">OUTROS DESCRITORES</span>
            <input
              value={creature.tags ?? ''}
              placeholder="ex.: criatura, incorpórea, humanoide"
              onChange={(e) => patch({ tags: e.target.value })}
            />
          </label>

          <label className="cm-field">
            <span className="cm-field-label">DESCRIÇÃO CURTA</span>
            <textarea
              rows={2}
              value={creature.flavor}
              placeholder="O que os agentes veem quando ela aparece"
              onChange={(e) => patch({ flavor: e.target.value })}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="cm-field-label">DEFESA E VIDA</span>
            <div className="cm-stat-grid">
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">DEFESA</span>
                <input type="number" value={creature.defense} onChange={(e) => patch({ defense: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">PV MÁX.</span>
                <input type="number" value={creature.pvMax} onChange={(e) => patch({ pvMax: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">PV TEMP.</span>
                <input type="number" value={creature.pvTemp} onChange={(e) => patch({ pvTemp: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">DESLOC. (M)</span>
                <input type="number" value={creature.displacement} onChange={(e) => patch({ displacement: Number(e.target.value) })} />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="cm-field-label">TESTES</span>
            <div className="cm-test-grid">
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">PERCEPÇÃO</span>
                <input type="number" value={creature.perception} onChange={(e) => patch({ perception: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">INICIATIVA</span>
                <input type="number" value={creature.initiative} onChange={(e) => patch({ initiative: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">FORTITUDE</span>
                <input type="number" value={creature.fortitude} onChange={(e) => patch({ fortitude: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">REFLEXOS</span>
                <input type="number" value={creature.reflexes} onChange={(e) => patch({ reflexes: Number(e.target.value) })} />
              </label>
              <label className="cm-field cm-field-center">
                <span className="cm-field-label">VONTADE</span>
                <input type="number" value={creature.will} onChange={(e) => patch({ will: Number(e.target.value) })} />
              </label>
            </div>
          </div>

          <label className="cm-field">
            <span className="cm-field-label">RESISTÊNCIAS E IMUNIDADES</span>
            <input
              value={creature.damageResistance}
              placeholder="ex.: RD 10/Morte, imune a Medo"
              onChange={(e) => patch({ damageResistance: e.target.value })}
            />
          </label>
        </div>
      )}

      {/* ---- ATRIBUTOS + PERÍCIAS ---- */}
      {tab === 1 && (
        <div className="cm-panel">
          <div className="cm-attr-row">
            {ATTRIBUTES.map((a) => {
              const v = creature.attributes[a.key];
              return (
                <div key={a.key} className="rd-cw-attr-cell">
                  <div className={`rd-cw-hex${v === 0 ? ' zero' : v >= 3 ? ' max' : ''}`}>
                    <div className="rd-cw-hex-in">
                      <span className={`rd-cw-hex-val${v === 0 ? ' zero' : ''}`}>{v}</span>
                    </div>
                  </div>
                  <span className="rd-cw-attr-short">{a.short}</span>
                  <div className="rd-cw-attr-ctl">
                    <button type="button" onClick={() => patchAttr(a.key, Math.max(0, v - 1))}>
                      −
                    </button>
                    <button type="button" onClick={() => patchAttr(a.key, v + 1)}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="cm-field-label" style={{ flex: 1 }}>
                PERÍCIAS
              </span>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addSkill(e.target.value);
                }}
                style={{ height: 38, borderRadius: 10, border: '1px solid var(--rd-sangue-line)', background: '#1a1216', color: '#f4eef0', padding: '0 10px' }}
              >
                <option value="">+ Adicionar perícia</option>
                {SKILLS.filter((s) => !creature.skills.some((sk) => sk.key === s.key)).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {creature.skills.map((sk) => {
                const def = SKILL_BY_KEY[sk.key];
                return (
                  <div key={sk.id} className="cm-skill-card">
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{def?.name ?? sk.key}</span>
                    <span style={{ fontFamily: 'var(--rd-font-mono)', fontSize: 10.5, color: '#8e8088' }}>{def?.attr ?? '?'}</span>
                    <span style={{ fontFamily: 'var(--rd-font-disp)', fontSize: 16, color: '#6e6670' }}>+</span>
                    <input
                      className="cm-skill-bonus-input"
                      type="number"
                      value={sk.bonus}
                      onChange={(e) => patchSkill(sk.id, { bonus: Number(e.target.value) })}
                    />
                    <button className="cm-btn cm-btn-ghost" onClick={() => onRollSkill(sk)}>
                      Rolar
                    </button>
                    <button className="cm-btn cm-btn-ghost" onClick={() => removeSkill(sk.id)} aria-label="Remover perícia">
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            {creature.skills.length === 0 && <div className="cm-empty">Nenhuma perícia ainda. Escolha na lista acima.</div>}
          </div>
        </div>
      )}

      {/* ---- AÇÕES ---- */}
      {tab === 2 && (
        <div className="cm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: '#8e8088' }}>Ataques e outras ações que a criatura pode fazer no turno.</span>
            <button className="cm-btn cm-btn-ghost" onClick={addAction}>
              + Ação
            </button>
          </div>
          {creature.actions.map((action) => (
            <div key={action.id} className="cm-entry-card">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={action.cost}
                  onChange={(e) => patchAction(action.id, { cost: e.target.value })}
                  style={{ height: 36, borderRadius: 9, border: '1px solid #2e2228', background: '#120d11', color: '#f4eef0', padding: '0 8px' }}
                >
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
                  style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 9, border: '1px solid #2e2228', background: '#120d11', color: '#fff', padding: '0 10px', fontFamily: 'var(--rd-font-disp)', fontSize: 15, fontWeight: 600 }}
                />
                <button className="cm-btn cm-btn-ghost" onClick={() => removeAction(action.id)} aria-label="Remover ação">
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                <label className="cm-field">
                  <span className="cm-field-label">ALCANCE</span>
                  <input value={action.range} placeholder="Corpo a corpo…" onChange={(e) => patchAction(action.id, { range: e.target.value })} />
                </label>
                <label className="cm-field">
                  <span className="cm-field-label">TESTE</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={action.testAttribute}
                      onChange={(e) => patchAction(action.id, { testAttribute: e.target.value as AttrKey })}
                      style={{ border: 0, background: 'transparent', color: '#f4eef0', fontSize: 14 }}
                    >
                      {ATTRIBUTES.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.short}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={action.testBonus}
                      onChange={(e) => patchAction(action.id, { testBonus: Number(e.target.value) })}
                      style={{ width: 48, border: 0, background: 'transparent', color: '#f4eef0', fontSize: 14 }}
                    />
                  </div>
                </label>
                <button className="cm-btn cm-btn-ghost" style={{ alignSelf: 'end', height: 44 }} onClick={() => onRollAction(action)}>
                  Testar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto', gap: 8 }}>
                <label className="cm-field">
                  <span className="cm-field-label">DANO</span>
                  <input value={action.damage} placeholder="2d8+9" onChange={(e) => patchAction(action.id, { damage: e.target.value })} />
                </label>
                <label className="cm-field">
                  <span className="cm-field-label">TIPO</span>
                  <input value={action.damageType} onChange={(e) => patchAction(action.id, { damageType: e.target.value })} />
                </label>
                <label className="cm-field">
                  <span className="cm-field-label">CRÍT.</span>
                  <input value={action.crit} placeholder="20/x2" onChange={(e) => patchAction(action.id, { crit: e.target.value })} />
                </label>
                <button className="cm-btn cm-btn-ghost" disabled={!action.damage} onClick={() => onRollDamage(action)}>
                  Rolar dano
                </button>
              </div>
              <textarea
                value={action.description}
                placeholder="Efeito/descrição adicional"
                rows={2}
                onChange={(e) => patchAction(action.id, { description: e.target.value })}
                style={{ borderRadius: 9, border: '1px solid #2e2228', background: '#120d11', color: '#e6dce0', padding: '8px 10px', fontSize: 13.5 }}
              />
            </div>
          ))}
          {creature.actions.length === 0 && <div className="cm-empty">Nenhuma ação ainda. Clique em "+ Ação".</div>}
        </div>
      )}

      {/* ---- HABILIDADES ---- */}
      {tab === 3 && (
        <div className="cm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: '#8e8088' }}>Traços e habilidades especiais (sem teste de ataque).</span>
            <button className="cm-btn cm-btn-ghost" onClick={addHability}>
              + Habilidade
            </button>
          </div>
          {creature.abilities.map((h) => (
            <div key={h.id} className="cm-entry-card">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={h.name}
                  placeholder="Nome da habilidade"
                  onChange={(e) => patchHability(h.id, { name: e.target.value })}
                  style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 9, border: '1px solid #2e2228', background: '#120d11', color: '#fff', padding: '0 10px', fontFamily: 'var(--rd-font-disp)', fontSize: 15, fontWeight: 600 }}
                />
                <button className="cm-btn cm-btn-ghost" onClick={() => removeHability(h.id)} aria-label="Remover habilidade">
                  ✕
                </button>
              </div>
              <textarea
                value={h.description}
                placeholder="Descrição"
                rows={2}
                onChange={(e) => patchHability(h.id, { description: e.target.value })}
                style={{ borderRadius: 9, border: '1px solid #2e2228', background: '#120d11', color: '#e6dce0', padding: '8px 10px', fontSize: 13.5 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label className="cm-field" style={{ maxWidth: 160 }}>
                  <span className="cm-field-label">DADO (OPCIONAL)</span>
                  <input value={h.rollDice ?? ''} placeholder="2d6" onChange={(e) => patchHability(h.id, { rollDice: e.target.value || undefined })} />
                </label>
                {h.rollDice && (
                  <button className="cm-btn cm-btn-ghost" onClick={() => onRollHability(h)}>
                    Rolar
                  </button>
                )}
              </div>
            </div>
          ))}
          {creature.abilities.length === 0 && <div className="cm-empty">Nenhuma habilidade ainda. Clique em "+ Habilidade".</div>}
        </div>
      )}

      {/* ---- NOTAS ---- */}
      {tab === 4 && (
        <div className="cm-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#ffb547' }}>Só o mestre vê</div>
          <textarea
            rows={10}
            value={creature.notes}
            placeholder="Táticas, fraquezas, o que ela quer, falas…"
            onChange={(e) => patch({ notes: e.target.value })}
            style={{ borderRadius: 14, border: '1px solid #2e2228', background: '#0e0a0d', color: '#e6dce0', padding: 14, fontSize: 14, lineHeight: 1.6, resize: 'vertical' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="cm-btn cm-btn-ghost" onClick={onDelete}>
          Excluir
        </button>
        <button className="cm-btn cm-btn-ghost" onClick={onToggle}>
          Fechar
        </button>
      </div>
    </div>
  );
}
