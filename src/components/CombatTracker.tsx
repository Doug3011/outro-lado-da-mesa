import { useRef, useState } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { SKILL_BY_KEY } from '../data/ordem';
import { skillBonus } from '../domain/character';
import { emptyCreature, normalizeCreature, type Creature } from '../domain/creature';
import { loadMyCreatures } from '../lib/creatureLibrary';
import { randomColor, uid } from '../lib/ids';
import type { InitiativeEntry, Token } from '../types';
import { CreatureCard } from './CreatureCard';

// Painel "Combate" da Área do Mestre, dentro da mesa — pedido do usuário:
// criar fichas de ameaças (Capítulo 7 do livro — bem mais simples que a
// ficha de personagem, já que o livro trata ameaças como "simplificadas")
// e organizar o combate junto com os personagens, pela iniciativa. Fichas
// de ameaça vivem na CENA ativa (Scene.creatures, mesmo padrão de
// Scene.tokens) — fazem mais sentido por encontro do que por mesa inteira.
export function CombatTracker() {
  const { me } = useIdentity();
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const characters = useTableStore((s) => s.characters);
  const upsertCreature = useTableStore((s) => s.upsertCreature);
  const deleteCreature = useTableStore((s) => s.deleteCreature);
  const updateScene = useTableStore((s) => s.updateScene);
  const upsertToken = useTableStore((s) => s.upsertToken);
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);

  const scene = activeScene({ scenes, activeSceneId });
  const creatures = scene.creatures ?? {};
  const combat = scene.combat;
  const charList = Object.values(characters);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showImportPicker, setShowImportPicker] = useState(false);
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

  // Importar monstro — pedido do usuário: trazer uma ficha já pronta da
  // biblioteca do mestre (Área do Mestre → Criaturas) direto pra cena
  // ativa, sem precisar recriar na mão. Cópia (novo id, PV cheio), não
  // vínculo — editar a cópia na mesa não muda o original da biblioteca.
  // Se a ficha da biblioteca tem retrato, solta um token com essa imagem
  // no centro do mapa também (token avulso, sem ligação permanente com a
  // ficha — mesmo nível de "token solto" que qualquer outro na mesa).
  const importCreature = (lib: Creature) => {
    const copy: Creature = { ...lib, id: uid(), pvCurrent: lib.pvMax, updatedAt: Date.now() };
    upsertCreature(copy);
    if (lib.image) {
      const pos =
        scene.kind === '3d'
          ? { x: 0, y: 0 }
          : { x: Math.floor(scene.map.cols / 2), y: Math.floor(scene.map.rows / 2) };
      const t: Token = {
        id: uid(),
        label: lib.name,
        color: randomColor(copy.id),
        image: lib.image,
        ...pos,
        size: 1,
        ownerId: me.id,
      };
      upsertToken(t);
    }
    setShowImportPicker(false);
    setEditingId(copy.id);
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
        <div className="row" style={{ gap: 6 }}>
          <button className="small ghost" onClick={() => setShowImportPicker((v) => !v)}>
            Importar monstro
          </button>
          <button className="small" onClick={addCreature}>
            + Nova criatura
          </button>
        </div>
      </div>

      {showImportPicker && (() => {
        const library = loadMyCreatures();
        return (
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {library.map((c) => (
              <span key={c.id} className="chip" onClick={() => importCreature(c)}>
                💀 {c.name} · VD {c.vd}
              </span>
            ))}
            {library.length === 0 && (
              <span className="faint" style={{ fontSize: 12 }}>
                Nenhuma criatura salva na biblioteca ainda (Área do Mestre → Criaturas).
              </span>
            )}
          </div>
        );
      })()}

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
