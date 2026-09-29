import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTableStore } from '../store/useTableStore';
import {
  ATTRIBUTES,
  CLASSES,
  CONDITIONS,
  ELEMENTS,
  SKILLS,
  SKILL_BY_KEY,
  TRAINING_LEVELS,
  type AttrKey,
  type ClassKey,
  type Element,
  type Training,
} from '../data/ordem';
import {
  addAttributeBump,
  addClassPowerPick,
  addTrainingBump,
  applyDerived,
  classInnateProgress,
  countTrained,
  describeNexGain,
  deriveStats,
  loadUsed,
  pendingAttributeBumpSlots,
  pendingClassPowerSlots,
  pendingTrainingBumpSlots,
  removeAttributeBump,
  removeClassPowerPick,
  ritualSlots,
  ritualsUsed,
  skillBonus,
  syncTrilhaAbilities,
  trainingBumpBudget,
  type Attack,
  type Character,
  type InventoryItem,
  type Ritual,
} from '../domain/character';
import { uid } from '../lib/ids';
import { fileToDownscaledDataURL } from '../lib/image';
import { CharacterSheetPaper } from './CharacterSheetPaper';
import { RITUALS, type RitualDef } from '../data/rituals';
import { TRILHAS_BY_CLASS, unlockedTrilhaPowers } from '../data/trilhas';
import { CLASS_POWERS, type ClassPowerDef } from '../data/classPowers';
import { PARANORMAL_BY_KEY, PARANORMAL_POWERS } from '../data/paranormalPowers';

type SheetTab =
  | 'geral'
  | 'progressao'
  | 'pericias'
  | 'combate'
  | 'inventario'
  | 'rituais'
  | 'notas';

const SHEET_TABS: { key: SheetTab; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'progressao', label: 'Progressão' },
  { key: 'pericias', label: 'Perícias' },
  { key: 'combate', label: 'Combate' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'rituais', label: 'Rituais' },
  { key: 'notas', label: 'Notas' },
];

export function CharacterSheet({
  character,
  onSave,
  defaultView,
}: {
  character: Character;
  // Quando informado, usado no lugar do upsertCharacter da mesa pra salvar —
  // é assim que a ficha funciona fora de uma mesa (biblioteca do jogador).
  onSave?: (c: Character) => void;
  // Ex.: o mestre abrindo a ficha de um jogador numa aba já entra direto na
  // visão em papel (ver `GmCharacterTabs`).
  defaultView?: 'editar' | 'papel';
}) {
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);
  const notify = useTableStore((s) => s.notify);

  const [draft, setDraft] = useState<Character>(character);
  const [tab, setTab] = useState<SheetTab>('geral');
  const [view, setView] = useState<'editar' | 'papel'>(defaultView ?? 'editar');
  const [ritualFilter, setRitualFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRemote = useRef<Character | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (character.updatedAt <= draft.updatedAt) return;
    if (containerRef.current?.contains(document.activeElement)) {
      pendingRemote.current = character;
    } else {
      setDraft(character);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const push = (next: Character) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => (onSave ? onSave(next) : upsertCharacter(next)), 350);
  };

  // campos cuja mudança dispara recálculo dos derivados
  const RECALC_KEYS: (keyof Character)[] = [
    'attributes',
    'nex',
    'classe',
    'defenseBonus',
    'autoCalc',
    'classPowers',
    'pdMode',
  ];
  // campos que podem desbloquear um novo poder de trilha
  const TRILHA_KEYS: (keyof Character)[] = ['nex', 'trilha', 'classe'];

  const patch = (p: Partial<Character>) =>
    setDraft((d) => {
      let next: Character = { ...d, ...p };
      if (next.autoCalc && RECALC_KEYS.some((k) => k in p)) {
        next = applyDerived(next);
      }
      if (TRILHA_KEYS.some((k) => k in p)) {
        next = syncTrilhaAbilities(next);
      }
      if ('nex' in p && next.nex > d.nex) {
        const lines = describeNexGain(d, next);
        if (lines.length) notify(next.id, next.name, next.ownerId, d.nex, next.nex, lines);
      }
      push(next);
      return next;
    });

  const patchAttr = (k: AttrKey, v: number) =>
    patch({ attributes: { ...draft.attributes, [k]: Math.max(0, v) } });

  const onBlurCapture = () => {
    // espera o foco assentar no proximo elemento antes de decidir adotar o estado remoto
    window.setTimeout(() => {
      if (pendingRemote.current && !containerRef.current?.contains(document.activeElement)) {
        setDraft(pendingRemote.current);
        pendingRemote.current = null;
      }
    }, 0);
  };

  const rollSkill = (key: string, name: string, attr: AttrKey) => {
    rollOrdem({
      label: `${draft.name} · ${name} (${attr})`,
      attributeValue: draft.attributes[attr],
      bonus: skillBonus(draft, key),
      dt: null,
    });
  };

  const addRitualFromDef = (r: RitualDef) => {
    patch({
      rituals: [
        ...draft.rituals,
        {
          id: uid(),
          name: r.name,
          circle: r.circle,
          element: r.elements[0],
          cost: '',
          execution: '',
          range: '',
          duration: '',
          description: r.summary,
        },
      ],
    });
  };

  const ritualMatches = useMemo(() => {
    const q = ritualFilter.trim().toLowerCase();
    return RITUALS.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.elements.some((e) => e.includes(q)),
    );
  }, [ritualFilter]);

  const slotsUsed = useMemo(() => loadUsed(draft), [draft]);
  const derived = useMemo(() => deriveStats(draft), [draft]);
  const trained = countTrained(draft);
  const attrSpent = ATTRIBUTES.reduce((a, x) => a + draft.attributes[x.key], 0) - 5;
  const attrZeros = ATTRIBUTES.filter((x) => draft.attributes[x.key] === 0).length;
  const rSlots = ritualSlots(draft);
  const rUsed = ritualsUsed(draft);
  const pendingPowerSlots = pendingClassPowerSlots(draft);
  const pendingAttrSlots = pendingAttributeBumpSlots(draft);
  const pendingTrainSlots = pendingTrainingBumpSlots(draft);
  const pendingTotal = pendingPowerSlots.length + pendingAttrSlots.length + pendingTrainSlots.length;
  const abilityFor = (id: string) => draft.abilities.find((a) => a.id === id);

  return (
    <div className="sheet" ref={containerRef} onBlurCapture={onBlurCapture}>
      <div className="row">
        <div className="field" style={{ flex: 2 }}>
          <label>Nome do agente</label>
          <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="field">
          <label>NEX %</label>
          <input
            type="number"
            min={0}
            max={99}
            step={5}
            value={draft.nex}
            onChange={(e) => patch({ nex: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="sheet-view-toggle">
        <span className="chip" onClick={() => setView('papel')}>
          📄 Ver ficha em papel
        </span>
      </div>

      {view === 'papel' &&
        createPortal(
          <div
            className="paper-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setView('editar');
            }}
          >
            <div className="paper-overlay-inner">
              <div className="paper-overlay-bar">
                <button className="small ghost" onClick={() => setView('editar')}>
                  ✕ Fechar
                </button>
                <button className="small" onClick={() => window.print()}>
                  🖨 Imprimir
                </button>
              </div>
              <CharacterSheetPaper character={draft} />
            </div>
          </div>,
          document.body,
        )}

      {view === 'editar' && (
        <>
          <div className="sheet-tabs">
            {SHEET_TABS.map((t) => (
              <span
                key={t.key}
                className={`chip ${tab === t.key ? 'on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'progressao' && pendingTotal > 0 && (
                  <span className="badge-count">{pendingTotal}</span>
                )}
              </span>
            ))}
          </div>

          {tab === 'geral' && (
        <>
          <div
            className="chip-row"
            style={{ marginBottom: 10, justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span
              className={`chip ${draft.autoCalc ? 'on' : ''}`}
              onClick={() => patch({ autoCalc: !draft.autoCalc })}
              title="Recalcula PV/PE/Sanidade/Defesa pelas regras quando você muda atributo, NEX ou classe"
            >
              {draft.autoCalc ? '⚙ Cálculo automático: ligado' : '⚙ Cálculo automático: desligado'}
            </span>
            <span
              className={`chip ${draft.pdMode ? 'on' : ''}`}
              onClick={() => patch({ pdMode: !draft.pdMode })}
              title='Regra opcional ("Sobrevivendo ao Horror"): funde PE e Sanidade num só medidor, Pontos de Determinação (PD)'
            >
              {draft.pdMode ? '🩸 Regra PD: ligada' : '🩸 Regra PD: desligada (padrão)'}
            </span>
          </div>
          {draft.pdMode && (
            <p className="faint" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
              Regra opcional de Pontos de Determinação: a barra de Esforço abaixo virou <b>PD</b>{' '}
              (some PE + Sanidade). Gaste PD onde a ficha pedia PE; dano mental/perda de Sanidade
              também saem do PD. A barra de Sanidade fica escondida enquanto isso estiver ligado.
            </p>
          )}

          <div className="calc-strip">
            <span className={attrSpent === (attrZeros > 0 ? 5 : 4) ? 'ok' : 'warn'}>
              Pontos de atributo: {attrSpent}
              {attrZeros > 0 ? ' (+1 por zerar um)' : ''} / {attrZeros > 0 ? 5 : 4}
            </span>
            <span
              className={
                ATTRIBUTES.every((a) => draft.attributes[a.key] <= derived.maxAttribute)
                  ? 'ok'
                  : 'warn'
              }
            >
              Atributo máx (NEX {draft.nex}%): {derived.maxAttribute}
            </span>
            <span className={trained <= derived.trainedBudget ? 'ok' : 'warn'}>
              Perícias treinadas: {trained} / {derived.trainedBudget}
            </span>
            <span className={slotsUsed <= derived.loadLimit ? 'ok' : 'warn'}>
              Carga: {slotsUsed} / {derived.loadLimit}
            </span>
            <span className="ok">PE por turno: {derived.pePerTurn}</span>
          </div>

          <div className="row">
            <div className="field">
              <label>Jogador</label>
              <input value={draft.player} onChange={(e) => patch({ player: e.target.value })} />
            </div>
            <div className="field">
              <label>Classe</label>
              <select
                value={draft.classe}
                onChange={(e) => patch({ classe: e.target.value as ClassKey })}
              >
                {CLASSES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Origem</label>
              <input value={draft.origem} onChange={(e) => patch({ origem: e.target.value })} />
            </div>
            <div className="field">
              <label>Trilha {draft.nex < 10 && <span className="faint">(a partir de NEX 10%)</span>}</label>
              <select
                value={draft.trilha}
                disabled={draft.nex < 10}
                onChange={(e) => patch({ trilha: e.target.value })}
              >
                <option value="">— nenhuma —</option>
                {TRILHAS_BY_CLASS[draft.classe].map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {draft.trilha && (
            <p className="faint" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>
              {unlockedTrilhaPowers(draft.classe, draft.trilha, draft.nex)
                .map((p) => `NEX ${p.nex}% ${p.name}`)
                .join(' · ')}{' '}
              — próximos poderes da trilha entram sozinhos conforme o NEX sobe.
              {draft.trilha === 'Tropa de Choque' && ' PV máximo já inclui o bônus de Casca Grossa.'}
              {draft.trilha === 'Operações Especiais' && ' Iniciativa já inclui o +5 de Iniciativa Aprimorada.'}
              {draft.trilha === 'Técnico' && ' Carga já inclui o Intelecto do Inventário Otimizado.'}
            </p>
          )}

          {draft.nex >= 50 && (
            <div className="field" style={{ maxWidth: 260, marginBottom: 10 }}>
              <label>Elemento de Afinidade (NEX 50%+)</label>
              <select
                value={draft.affinityElement ?? ''}
                onChange={(e) =>
                  patch({ affinityElement: (e.target.value || undefined) as Element | undefined })
                }
              >
                <option value="">— nenhum ainda —</option>
                {ELEMENTS.filter((e) => e.key !== 'medo').map((el) => (
                  <option key={el.key} value={el.key}>
                    {el.name}
                  </option>
                ))}
              </select>
              <p className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                Na primeira vez que Transcender depois de NEX 50%, poderes desse elemento podem
                ser escolhidos de novo pelo bônus de Afinidade (marque na aba Progressão).
              </p>
            </div>
          )}
          <div className="field">
            <label>Patente</label>
            <input value={draft.patente} onChange={(e) => patch({ patente: e.target.value })} />
          </div>

          <div className="field">
            <label>Retrato</label>
            <div className="portrait-row">
              <div
                className="portrait"
                style={draft.image ? { backgroundImage: `url(${draft.image})` } : undefined}
              >
                {!draft.image && '?'}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="small" onClick={() => portraitInputRef.current?.click()}>
                  🖼 Do computador
                </button>
                <input
                  value={draft.image ?? ''}
                  placeholder="…ou cole uma URL"
                  onChange={(e) => patch({ image: e.target.value || undefined })}
                />
                {draft.image && (
                  <button
                    className="small ghost"
                    onClick={() => patch({ image: undefined })}
                  >
                    remover
                  </button>
                )}
              </div>
              <input
                ref={portraitInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void fileToDownscaledDataURL(f, 512).then((u) => u && patch({ image: u }));
                }}
              />
            </div>
          </div>

          <div className="section-title">Atributos — clique para testar</div>
          <div className="attr-grid">
            {ATTRIBUTES.map((a) => (
              <div className="attr-box" key={a.key}>
                <label
                  onClick={() =>
                    rollOrdem({
                      label: `${draft.name} · Teste de ${a.name}`,
                      attributeValue: draft.attributes[a.key],
                      bonus: 0,
                      dt: null,
                    })
                  }
                  style={{ cursor: 'pointer' }}
                  title={`Rolar ${a.name}`}
                >
                  {a.short}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={draft.attributes[a.key]}
                  onChange={(e) => patchAttr(a.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          <div className="stat-bars">
            <StatBar
              name="Pontos de Vida"
              cur={draft.pv.current}
              max={draft.pv.max}
              color="var(--blood)"
              extra={draft.pv.temp}
              lockMax={draft.autoCalc}
              onCur={(v) => patch({ pv: { ...draft.pv, current: v } })}
              onMax={(v) => patch({ pv: { ...draft.pv, max: v } })}
              onExtra={(v) => patch({ pv: { ...draft.pv, temp: v } })}
              extraLabel="PV temp"
            />
            <StatBar
              name={draft.pdMode ? 'Pontos de Determinação (PD)' : 'Pontos de Esforço'}
              cur={draft.pe.current}
              max={draft.pe.max}
              color="var(--gold)"
              lockMax={draft.autoCalc}
              onCur={(v) => patch({ pe: { ...draft.pe, current: v } })}
              onMax={(v) => patch({ pe: { ...draft.pe, max: v } })}
            />
            {!draft.pdMode && (
              <StatBar
                name="Sanidade"
                cur={draft.sanity.current}
                max={draft.sanity.max}
                color="var(--blue)"
                lockMax={draft.autoCalc}
                onCur={(v) => patch({ sanity: { ...draft.sanity, current: v } })}
                onMax={(v) => patch({ sanity: { ...draft.sanity, max: v } })}
              />
            )}
            {draft.autoCalc ? (
              <p className="faint" style={{ fontSize: 11 }}>
                PV/PE/Sanidade e Defesa são calculados por classe + NEX + atributos. Desligue o
                cálculo automático para editar à mão.
              </p>
            ) : (
              <button
                className="small ghost"
                onClick={() => {
                  const s = deriveStats(draft);
                  patch({
                    pv: { ...draft.pv, max: s.pvMax, current: s.pvMax },
                    pe: { ...draft.pe, max: s.peMax, current: s.peMax },
                    sanity: { ...draft.sanity, max: s.sanMax, current: s.sanMax },
                  });
                }}
              >
                Preencher PV/PE/SAN pela classe + NEX
              </button>
            )}
          </div>

          <div className="row">
            <div className="field">
              <label>Defesa {draft.autoCalc && <span className="faint">(10 + AGI + bônus)</span>}</label>
              <input
                type="number"
                value={draft.autoCalc ? derived.defense : draft.defense}
                disabled={draft.autoCalc}
                onChange={(e) => patch({ defense: Number(e.target.value) })}
              />
            </div>
            {draft.autoCalc && (
              <div className="field">
                <label>Bônus de defesa</label>
                <input
                  type="number"
                  value={draft.defenseBonus}
                  onChange={(e) => patch({ defenseBonus: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="field">
              <label>Deslocamento (m)</label>
              <input
                type="number"
                value={draft.displacement}
                onChange={(e) => patch({ displacement: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Proteção</label>
              <input
                type="number"
                value={draft.protection}
                onChange={(e) => patch({ protection: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="section-title">Condições</div>
          <div className="chip-row">
            {CONDITIONS.map((c) => {
              const on = draft.conditions.includes(c);
              return (
                <span
                  key={c}
                  className={`chip ${on ? 'on' : ''}`}
                  onClick={() =>
                    patch({
                      conditions: on
                        ? draft.conditions.filter((x) => x !== c)
                        : [...draft.conditions, c],
                    })
                  }
                >
                  {c}
                </span>
              );
            })}
          </div>
        </>
      )}

      {tab === 'progressao' && (
        <div>
          <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
            Poder de Classe (NEX 15/30/45/60/75/90), Aumento de Atributo (20/50/80/95) e Grau de
            Treinamento (35/70) pendentes para o NEX atual. Trilha (10/40/65/99) já entra sozinha —
            veja o aviso na aba Geral.
          </p>

          <div className="calc-strip" style={{ marginBottom: 10 }}>
            {classInnateProgress(draft).map((line, i) => (
              <span className="ok" key={i}>
                {line}
              </span>
            ))}
          </div>

          {pendingTotal === 0 && (
            <p className="faint">Nenhuma escolha de progressão pendente para o NEX atual.</p>
          )}

          {pendingPowerSlots.map((nex) => (
            <ClassPowerPicker
              key={`power-${nex}`}
              nex={nex}
              classe={draft.classe}
              affinityElement={draft.affinityElement}
              onConfirm={(input) => patch(addClassPowerPick(draft, input))}
            />
          ))}
          {pendingAttrSlots.map((nex) => (
            <AttributeBumpPicker
              key={`attr-${nex}`}
              nex={nex}
              onConfirm={(attr) => patch(addAttributeBump(draft, nex, attr))}
            />
          ))}
          {pendingTrainSlots.map((nex) => (
            <TrainingBumpPicker
              key={`train-${nex}`}
              nex={nex}
              budget={trainingBumpBudget(draft)}
              trainedSkills={Object.entries(draft.skills)
                .filter(([, st]) => st.training > 0)
                .map(([key, st]) => ({
                  key,
                  name: SKILL_BY_KEY[key]?.name ?? key,
                  training: st.training,
                }))}
              onConfirm={(skills) => patch(addTrainingBump(draft, nex, skills))}
            />
          ))}

          <div className="section-title">Escolhas já feitas</div>
          {(draft.classPowers || []).length === 0 &&
            (draft.attributeBumps || []).length === 0 &&
            (draft.trainingBumps || []).length === 0 && <p className="faint">Nenhuma ainda.</p>}
          {[...(draft.classPowers || [])]
            .sort((a, b) => a.nex - b.nex)
            .map((p) => {
              const ab = abilityFor(p.abilityId);
              return (
                <div className="list-item" key={p.id}>
                  <div className="li-head">
                    <span>
                      NEX {p.nex}% — <strong>{ab?.name ?? p.key}</strong>
                    </span>
                    <button
                      className="small ghost"
                      onClick={() => patch(removeClassPowerPick(draft, p.id))}
                    >
                      ✕
                    </button>
                  </div>
                  {ab?.description && (
                    <p className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                      {ab.description}
                    </p>
                  )}
                </div>
              );
            })}
          {[...(draft.attributeBumps || [])]
            .sort((a, b) => a.nex - b.nex)
            .map((b) => (
              <div className="list-item" key={b.id}>
                <div className="li-head">
                  <span>
                    NEX {b.nex}% — <strong>+1 {b.attr}</strong>
                  </span>
                  <button
                    className="small ghost"
                    onClick={() => patch(removeAttributeBump(draft, b.id))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          {[...(draft.trainingBumps || [])]
            .sort((a, b) => a.nex - b.nex)
            .map((b) => (
              <div className="list-item" key={b.id}>
                <span>
                  NEX {b.nex}% — grau subiu: {b.skills.map((k) => SKILL_BY_KEY[k]?.name ?? k).join(', ')}
                </span>
              </div>
            ))}
        </div>
      )}

      {tab === 'pericias' && (
        <div>
          <div className="calc-strip" style={{ marginBottom: 8 }}>
            <span className={trained <= derived.trainedBudget ? 'ok' : 'warn'}>
              Treinadas: {trained} / {derived.trainedBudget}
              <span className="faint"> (classe + Intelecto + 2 da origem)</span>
            </span>
          </div>
          {SKILLS.map((s) => {
            const st = draft.skills[s.key] ?? { training: 0, bonus: 0 };
            const total = skillBonus(draft, s.key);
            return (
              <div className="skill-row" key={s.key}>
                <span className="sk-name">
                  {s.name} <small>{s.attr}</small>
                  <small
                    className="sk-formula"
                    title={total !== st.training + st.bonus ? 'inclui bônus de trilha' : undefined}
                  >
                    {draft.attributes[s.attr]}d20
                    {total >= 0 ? ' +' : ' −'}
                    {Math.abs(total)}
                    {total !== st.training + st.bonus ? ' *' : ''}
                  </small>
                </span>
                <select
                  value={st.training}
                  onChange={(e) =>
                    patch({
                      skills: {
                        ...draft.skills,
                        [s.key]: { ...st, training: Number(e.target.value) as Training },
                      },
                    })
                  }
                >
                  {TRAINING_LEVELS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  title="Outros bônus"
                  value={st.bonus}
                  onChange={(e) =>
                    patch({
                      skills: {
                        ...draft.skills,
                        [s.key]: { ...st, bonus: Number(e.target.value) },
                      },
                    })
                  }
                />
                <button
                  className="small"
                  onClick={() => rollSkill(s.key, s.name, s.attr)}
                  title={`${draft.attributes[s.attr]}d20 + ${total}`}
                >
                  🎲
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'combate' && (
        <div>
          {draft.attacks.map((atk) => (
            <div className="list-item" key={atk.id}>
              <div className="li-head">
                <input
                  value={atk.name}
                  placeholder="Ataque / arma"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { name: e.target.value })}
                />
                <button
                  className="small ghost"
                  onClick={() =>
                    patch({ attacks: draft.attacks.filter((a) => a.id !== atk.id) })
                  }
                >
                  ✕
                </button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  value={atk.test}
                  placeholder="Teste (Luta / Pontaria +5)"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { test: e.target.value })}
                />
                <input
                  value={atk.damage}
                  placeholder="Dano (1d12+3)"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { damage: e.target.value })}
                />
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  value={atk.type}
                  placeholder="Tipo"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { type: e.target.value })}
                />
                <input
                  value={atk.crit}
                  placeholder="Crít (20/x2)"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { crit: e.target.value })}
                />
                <input
                  value={atk.range}
                  placeholder="Alcance"
                  onChange={(e) => updateAttack(draft, patch, atk.id, { range: e.target.value })}
                />
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <button
                  className="small"
                  onClick={() =>
                    rollFree(`${draft.name} · ${atk.name || 'ataque'} (dano)`, atk.damage || '1d6')
                  }
                >
                  Rolar dano
                </button>
              </div>
            </div>
          ))}
          <button
            className="small"
            onClick={() => patch({ attacks: [...draft.attacks, emptyAttack()] })}
          >
            + Adicionar ataque
          </button>

          <div className="section-title">Proficiências</div>
          <input
            value={draft.proficiencies.join(', ')}
            placeholder="Armas simples, Armaduras leves..."
            onChange={(e) =>
              patch({
                proficiencies: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />

          <div className="section-title">Habilidades</div>
          {draft.abilities.map((ab) => (
            <div className="list-item" key={ab.id}>
              <div className="li-head">
                <input
                  value={ab.name}
                  placeholder="Nome"
                  onChange={(e) => updateAbility(draft, patch, ab.id, { name: e.target.value })}
                />
                <button
                  className="small ghost"
                  onClick={() =>
                    patch({ abilities: draft.abilities.filter((a) => a.id !== ab.id) })
                  }
                >
                  ✕
                </button>
              </div>
              <input
                style={{ marginTop: 6 }}
                value={ab.source}
                placeholder="Origem (classe, poder paranormal...)"
                onChange={(e) => updateAbility(draft, patch, ab.id, { source: e.target.value })}
              />
              <textarea
                style={{ marginTop: 6 }}
                value={ab.description}
                onChange={(e) =>
                  updateAbility(draft, patch, ab.id, { description: e.target.value })
                }
              />
            </div>
          ))}
          <button
            className="small"
            onClick={() => patch({ abilities: [...draft.abilities, emptyAbility()] })}
          >
            + Adicionar habilidade
          </button>
        </div>
      )}

      {tab === 'inventario' && (
        <div>
          <p className="faint" style={{ marginBottom: 8 }}>
            Espaços usados: <strong>{slotsUsed}</strong> · Limite (Força + 5
            {draft.trilha === 'Técnico' && draft.nex >= 10 ? ' + Intelecto (Inventário Otimizado)' : ''}):{' '}
            <strong>{derived.loadLimit}</strong>
          </p>
          {draft.inventory.map((it) => (
            <div className="list-item" key={it.id}>
              <div className="li-head">
                <input
                  value={it.name}
                  placeholder="Item"
                  onChange={(e) => updateItem(draft, patch, it.id, { name: e.target.value })}
                />
                <button
                  className="small ghost"
                  onClick={() =>
                    patch({ inventory: draft.inventory.filter((x) => x.id !== it.id) })
                  }
                >
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
                    onChange={(e) =>
                      updateItem(draft, patch, it.id, { qty: Math.max(1, Number(e.target.value)) })
                    }
                  />
                </div>
                <div>
                  <label>Espaços</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={it.slots}
                    onChange={(e) =>
                      updateItem(draft, patch, it.id, { slots: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label>Categoria</label>
                  <input
                    value={it.category}
                    placeholder="I / II / III"
                    onChange={(e) => updateItem(draft, patch, it.id, { category: e.target.value })}
                  />
                </div>
              </div>
              <input
                style={{ marginTop: 6 }}
                value={it.notes}
                placeholder="Observações"
                onChange={(e) => updateItem(draft, patch, it.id, { notes: e.target.value })}
              />
            </div>
          ))}
          <button
            className="small"
            onClick={() => patch({ inventory: [...draft.inventory, emptyItem()] })}
          >
            + Adicionar item
          </button>
        </div>
      )}

      {tab === 'rituais' && (
        <div>
          <div className="calc-strip" style={{ marginBottom: 10 }}>
            <span className={rUsed <= rSlots ? 'ok' : 'warn'}>
              Vagas de ritual: {rUsed} / {rSlots} (Intelecto)
            </span>
            <span className="faint">
              rituais marcados &quot;ganho por classe/trilha&quot; não contam aqui
            </span>
          </div>
          <details className="ritual-picker">
            <summary>+ Adicionar do compêndio (1º–4º círculo)</summary>
            <input
              placeholder="Filtrar por nome ou elemento…"
              value={ritualFilter}
              onChange={(e) => setRitualFilter(e.target.value)}
              style={{ margin: '8px 0' }}
            />
            {[1, 2, 3, 4].map((circle) => {
              const list = ritualMatches.filter((r) => r.circle === circle);
              if (!list.length) return null;
              return (
                <div key={circle} style={{ marginBottom: 8 }}>
                  <div className="section-title" style={{ margin: '6px 0 4px' }}>
                    {circle}º Círculo
                  </div>
                  {list.map((r) => (
                    <div className="ritual-row" key={r.name}>
                      <button
                        className="small"
                        title="Adicionar à ficha"
                        onClick={() => addRitualFromDef(r)}
                      >
                        +
                      </button>
                      <span>
                        <strong>{r.name}</strong>{' '}
                        <small className="faint">
                          {r.elements.join('/')}
                          {r.trilhaOnly ? ' · trilha' : ''}
                        </small>
                        <br />
                        <small className="faint">{r.summary}</small>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </details>

          {draft.rituals.map((rt) => (
            <div className="list-item" key={rt.id}>
              <div className="li-head">
                <input
                  value={rt.name}
                  placeholder="Ritual"
                  onChange={(e) => updateRitual(draft, patch, rt.id, { name: e.target.value })}
                />
                <button
                  className="small ghost"
                  onClick={() => patch({ rituals: draft.rituals.filter((x) => x.id !== rt.id) })}
                >
                  ✕
                </button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <div>
                  <label>Círculo</label>
                  <select
                    value={rt.circle}
                    onChange={(e) =>
                      updateRitual(draft, patch, rt.id, {
                        circle: Number(e.target.value) as Ritual['circle'],
                      })
                    }
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}º
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Elemento</label>
                  <select
                    value={rt.element}
                    onChange={(e) =>
                      updateRitual(draft, patch, rt.id, {
                        element: e.target.value as Ritual['element'],
                      })
                    }
                  >
                    {ELEMENTS.map((el) => (
                      <option key={el.key} value={el.key}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Custo</label>
                  <input
                    value={rt.cost}
                    placeholder="2 PE"
                    onChange={(e) => updateRitual(draft, patch, rt.id, { cost: e.target.value })}
                  />
                </div>
              </div>
              <textarea
                style={{ marginTop: 6 }}
                value={rt.description}
                placeholder="Execução, alcance, alvo, duração, efeito, resistência..."
                onChange={(e) =>
                  updateRitual(draft, patch, rt.id, { description: e.target.value })
                }
              />
              <label
                className="chip-row"
                style={{ marginTop: 6, alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={!!rt.freeSource}
                  onChange={(e) =>
                    updateRitual(draft, patch, rt.id, { freeSource: e.target.checked })
                  }
                />
                <span className="faint" style={{ fontSize: 12 }}>
                  ganho por classe/trilha (não conta na vaga)
                </span>
              </label>
            </div>
          ))}
          <button
            className="small"
            onClick={() => patch({ rituals: [...draft.rituals, emptyRitual()] })}
          >
            + Adicionar ritual
          </button>
        </div>
      )}

      {tab === 'notas' && (
        <textarea
          style={{ minHeight: 260 }}
          value={draft.notes}
          placeholder="Histórico, objetivos, segredos do personagem..."
          onChange={(e) => patch({ notes: e.target.value })}
        />
      )}
        </>
      )}
    </div>
  );
}

function StatBar(props: {
  name: string;
  cur: number;
  max: number;
  color: string;
  extra?: number;
  extraLabel?: string;
  lockMax?: boolean;
  onCur: (v: number) => void;
  onMax: (v: number) => void;
  onExtra?: (v: number) => void;
}) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.cur / props.max) * 100)) : 0;
  return (
    <div className="stat-bar">
      <div className="stat-head">
        <span>{props.name}</span>
        <span>
          {props.cur} / {props.max}
          {props.extra ? ` (+${props.extra})` : ''}
        </span>
      </div>
      <div className="track">
        <span style={{ width: `${pct}%`, background: props.color }} />
      </div>
      <div className="stat-controls">
        <button className="small" onClick={() => props.onCur(props.cur - 1)}>
          −
        </button>
        <input
          type="number"
          value={props.cur}
          onChange={(e) => props.onCur(Number(e.target.value))}
        />
        <button className="small" onClick={() => props.onCur(props.cur + 1)}>
          +
        </button>
        <span className="faint">máx</span>
        <input
          type="number"
          value={props.max}
          disabled={props.lockMax}
          title={props.lockMax ? 'Calculado pelas regras' : undefined}
          onChange={(e) => props.onMax(Number(e.target.value))}
        />
        {props.onExtra && (
          <>
            <span className="faint">{props.extraLabel}</span>
            <input
              type="number"
              value={props.extra ?? 0}
              onChange={(e) => props.onExtra!(Number(e.target.value))}
            />
          </>
        )}
      </div>
    </div>
  );
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

function ClassPowerPicker({
  nex,
  classe,
  affinityElement,
  onConfirm,
}: {
  nex: number;
  classe: ClassKey;
  affinityElement?: Element;
  onConfirm: (input: ClassPowerPickInput) => void;
}) {
  const options: ClassPowerDef[] = CLASS_POWERS[classe].filter(
    (p) => !p.onlyAtNex || p.onlyAtNex === nex,
  );
  const [key, setKey] = useState('');
  const [element, setElement] = useState<Element>('sangue');
  const [skillA, setSkillA] = useState('');
  const [skillB, setSkillB] = useState('');
  const [paranormalKey, setParanormalKey] = useState('');
  const [paranormalElement, setParanormalElement] = useState<Element>('sangue');
  const [affinity, setAffinity] = useState(false);
  const [trilhaPick, setTrilhaPick] = useState('');

  const def = options.find((p) => p.key === key);
  const pdef = paranormalKey ? PARANORMAL_BY_KEY[paranormalKey] : undefined;
  const trilhaOptions = TRILHAS_BY_CLASS[classe];

  const canConfirm =
    !!def &&
    (def.key !== 'transcender' || !!paranormalKey) &&
    (def.key !== 'versatilidade' || !!trilhaPick) &&
    (!def.needsElement || !!element) &&
    (!def.needsSkills || (!!skillA && !!skillB && skillA !== skillB)) &&
    (!pdef?.needsElement || !!paranormalElement);

  const confirm = () => {
    if (!def) return;
    onConfirm({
      nex,
      key: def.key,
      element: def.needsElement ? element : undefined,
      skills: def.needsSkills ? [skillA, skillB] : undefined,
      paranormalKey: def.key === 'transcender' ? paranormalKey : undefined,
      paranormalElement: def.key === 'transcender' && pdef?.needsElement ? paranormalElement : undefined,
      affinity: def.key === 'transcender' ? affinity : undefined,
      versatilityTrilha: def.key === 'versatilidade' ? trilhaPick : undefined,
    });
  };

  return (
    <div className="list-item">
      <div className="li-head">
        <strong>Poder de Classe — NEX {nex}%</strong>
      </div>
      <select value={key} onChange={(e) => setKey(e.target.value)}>
        <option value="">— escolha —</option>
        {options.map((p) => (
          <option key={p.key} value={p.key}>
            {p.name}
          </option>
        ))}
      </select>
      {def && (
        <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
          {def.summary}
          {def.prereq ? ` (pré-requisito: ${def.prereq})` : ''}
        </p>
      )}

      {def?.needsElement && (
        <select
          value={element}
          onChange={(e) => setElement(e.target.value as Element)}
          style={{ marginTop: 6 }}
        >
          {ELEMENTS.filter((e) => e.key !== 'medo').map((el) => (
            <option key={el.key} value={el.key}>
              {el.name}
            </option>
          ))}
        </select>
      )}

      {def?.needsSkills && (
        <div className="row" style={{ marginTop: 6 }}>
          <select value={skillA} onChange={(e) => setSkillA(e.target.value)}>
            <option value="">perícia 1</option>
            {SKILLS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={skillB} onChange={(e) => setSkillB(e.target.value)}>
            <option value="">perícia 2</option>
            {SKILLS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {def?.key === 'versatilidade' && (
        <select
          value={trilhaPick}
          onChange={(e) => setTrilhaPick(e.target.value)}
          style={{ marginTop: 6 }}
        >
          <option value="">— trilha (diferente da sua) —</option>
          {trilhaOptions.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {def?.key === 'transcender' && (
        <>
          <select
            value={paranormalKey}
            onChange={(e) => setParanormalKey(e.target.value)}
            style={{ marginTop: 6 }}
          >
            <option value="">— poder paranormal —</option>
            {PARANORMAL_POWERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
                {p.element !== 'geral' ? ` (${p.element})` : ''}
              </option>
            ))}
          </select>
          {pdef && (
            <p className="faint" style={{ fontSize: 12, marginTop: 6 }}>
              {pdef.summary}
              {pdef.prereq ? ` (pré-requisito: ${pdef.prereq})` : ''}
            </p>
          )}
          {pdef?.needsElement && (
            <select
              value={paranormalElement}
              onChange={(e) => setParanormalElement(e.target.value as Element)}
              style={{ marginTop: 6 }}
            >
              {ELEMENTS.filter((e) => e.key !== 'medo').map((el) => (
                <option key={el.key} value={el.key}>
                  {el.name}
                </option>
              ))}
            </select>
          )}
          {pdef?.affinitySummary && pdef.element !== 'geral' && pdef.element === affinityElement && (
            <label
              className="chip-row"
              style={{ marginTop: 6, alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={affinity}
                onChange={(e) => setAffinity(e.target.checked)}
              />
              <span className="faint" style={{ fontSize: 12 }}>
                aplicar bônus de Afinidade: {pdef.affinitySummary}
              </span>
            </label>
          )}
          {pdef?.affinitySummary && pdef.element !== 'geral' && pdef.element !== affinityElement && (
            <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>
              Bônus de Afinidade disponível só se esse for seu elemento de Afinidade (defina na
              aba Geral, NEX 50%+).
            </p>
          )}
        </>
      )}

      <button className="small primary" style={{ marginTop: 8 }} disabled={!canConfirm} onClick={confirm}>
        Confirmar
      </button>
    </div>
  );
}

function AttributeBumpPicker({
  nex,
  onConfirm,
}: {
  nex: number;
  onConfirm: (attr: AttrKey) => void;
}) {
  const [attr, setAttr] = useState<AttrKey>('AGI');
  return (
    <div className="list-item">
      <div className="li-head">
        <strong>Aumento de Atributo — NEX {nex}%</strong>
      </div>
      <select value={attr} onChange={(e) => setAttr(e.target.value as AttrKey)}>
        {ATTRIBUTES.map((a) => (
          <option key={a.key} value={a.key}>
            {a.name}
          </option>
        ))}
      </select>
      <button className="small primary" style={{ marginTop: 8 }} onClick={() => onConfirm(attr)}>
        +1 {attr}
      </button>
    </div>
  );
}

function TrainingBumpPicker({
  nex,
  budget,
  trainedSkills,
  onConfirm,
}: {
  nex: number;
  budget: number;
  trainedSkills: { key: string; name: string; training: Training }[];
  onConfirm: (skills: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (k: string) =>
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length < budget ? [...p, k] : p));
  const upgradable = trainedSkills.filter((s) => s.training > 0 && s.training < 15);
  return (
    <div className="list-item">
      <div className="li-head">
        <strong>Grau de Treinamento — NEX {nex}%</strong>
      </div>
      <p className="faint" style={{ fontSize: 12 }}>
        Escolha até {budget} perícia(s) já treinadas pra subir um grau (Treinado → Veterano →
        Expert). Aplicado direto; se errar, ajuste na aba Perícias.
      </p>
      <div className="chip-row">
        {upgradable.length === 0 && <span className="faint">Nenhuma perícia treinada ainda.</span>}
        {upgradable.map((s) => (
          <span
            key={s.key}
            className={`chip ${picked.includes(s.key) ? 'on' : ''}`}
            onClick={() => toggle(s.key)}
          >
            {s.name}
          </span>
        ))}
      </div>
      <button
        className="small primary"
        style={{ marginTop: 8 }}
        disabled={picked.length === 0}
        onClick={() => onConfirm(picked)}
      >
        Confirmar ({picked.length}/{budget})
      </button>
    </div>
  );
}

/* helpers ------------------------------------------------------------------- */

type Patch = (p: Partial<Character>) => void;

function updateAttack(c: Character, patch: Patch, id: string, p: Partial<Attack>) {
  patch({ attacks: c.attacks.map((a) => (a.id === id ? { ...a, ...p } : a)) });
}
function updateAbility(c: Character, patch: Patch, id: string, p: Partial<Character['abilities'][number]>) {
  patch({ abilities: c.abilities.map((a) => (a.id === id ? { ...a, ...p } : a)) });
}
function updateItem(c: Character, patch: Patch, id: string, p: Partial<InventoryItem>) {
  patch({ inventory: c.inventory.map((a) => (a.id === id ? { ...a, ...p } : a)) });
}
function updateRitual(c: Character, patch: Patch, id: string, p: Partial<Ritual>) {
  patch({ rituals: c.rituals.map((a) => (a.id === id ? { ...a, ...p } : a)) });
}

function emptyAttack(): Attack {
  return { id: uid(), name: '', test: '', damage: '', type: '', range: '', crit: '', notes: '' };
}
function emptyAbility(): Character['abilities'][number] {
  return { id: uid(), name: '', source: '', description: '' };
}
function emptyItem(): InventoryItem {
  return { id: uid(), name: '', category: '', qty: 1, slots: 1, notes: '' };
}
function emptyRitual(): Ritual {
  return {
    id: uid(),
    name: '',
    circle: 1,
    element: 'medo',
    cost: '1 PE',
    execution: '',
    range: '',
    duration: '',
    description: '',
  };
}
