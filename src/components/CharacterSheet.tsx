import { useEffect, useMemo, useRef, useState } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
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
  equipmentDefenseBonus,
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
  type Ritual,
} from '../domain/character';
import { uid } from '../lib/ids';
import { fileToDownscaledDataURL } from '../lib/image';
import { RITUALS, type RitualDef } from '../data/rituals';
import { TRILHAS_BY_CLASS, unlockedTrilhaPowers } from '../data/trilhas';
import { CLASS_POWERS, type ClassPowerDef } from '../data/classPowers';
import { PARANORMAL_BY_KEY, PARANORMAL_POWERS } from '../data/paranormalPowers';
import { GENERAL_POWERS } from '../data/generalPowers';
import { InventoryEditor } from './InventoryEditor';
import { FichaQr } from './FichaQr';
import { TokenLinkDialog } from './TokenLinkDialog';
import { GearIcon, LinkTokenIcon, PdIcon, PhoneIcon } from './icons';

// ---------- REDESIGN Passo 5 (Ficha de personagem) ----------
// Layout em 3 colunas (pentágono de atributos / tabela de perícias /
// abas) — ver seção "REDESIGN — Passo 5" em index.css pro porquê do
// container query em vez de media query (a mesma ficha também abre numa
// FloatingWindow bem menor que a tela, ver BattleMap.tsx/Battle3D.tsx).
//
// A aba "Geral" de antes sumiu: identidade (nome/jogador/origem/classe/
// trilha/patente/NEX/retrato) virou cabeçalho sempre visível; atributos,
// barras, defesa, proteção/proficiências e condições viraram a coluna da
// esquerda (sempre visível); perícias virou a coluna do meio (sempre
// visível). "Habilidades" ganhou aba própria (antes vivia dentro de
// "Combate" junto com os ataques). "Notas" virou "Descrição" só no
// rótulo — o campo continua sendo `draft.notes`, um textarea só (a
// referência tem 5 campos de descrição separados que não existem no
// modelo de dados hoje; inventar esses campos seria mudar regra/dados,
// não visual, então ficou de fora — divergência documentada no
// relatório do passo).

type SheetTab = 'combate' | 'habilidades' | 'rituais' | 'inventario' | 'progressao' | 'notas';

const SHEET_TABS: { key: SheetTab; label: string }[] = [
  { key: 'combate', label: 'Combate' },
  { key: 'habilidades', label: 'Habilidades' },
  { key: 'rituais', label: 'Rituais' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'progressao', label: 'Progressão' },
  { key: 'notas', label: 'Descrição' },
];

// Posição (em % da caixa do pentágono) de cada atributo — coordenadas
// tiradas direto da referência (Ficha-Agente.dc.html, caixa de 300x290),
// convertidas pro centro de cada círculo em porcentagem pra funcionar em
// qualquer largura de coluna (a FloatingWindow pode nascer bem menor que
// a tela cheia).
const PENTAGON_POS: Record<AttrKey, { left: number; top: number }> = {
  AGI: { left: 50.3, top: 15.9 },
  INT: { left: 83.7, top: 41.0 },
  VIG: { left: 71.0, top: 81.4 },
  PRE: { left: 29.7, top: 81.4 },
  FOR: { left: 17.0, top: 41.0 },
};

// Cor por grau de treino — mesmos limiares da referência (0/5/10/15 =
// destreinado/treinado/veterano/expert, ver Training em data/ordem.ts).
function tierColor(training: number): string {
  if (training >= 15) return '#ffb547';
  if (training >= 10) return '#6fa8ff';
  if (training >= 5) return '#5bd48a';
  return '#d9d2cc';
}

export function CharacterSheet({
  character,
  onSave,
}: {
  character: Character;
  // Quando informado, usado no lugar do upsertCharacter da mesa pra salvar —
  // é assim que a ficha funciona fora de uma mesa (biblioteca do jogador).
  onSave?: (c: Character) => void;
}) {
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);
  const notify = useTableStore((s) => s.notify);
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);

  const [draft, setDraft] = useState<Character>(character);
  // Token que já representa esse personagem no cenário ativo (ver
  // TokenLinkDialog.tsx) — ausente/`null` = ainda sem token vinculado.
  const [showTokenLink, setShowTokenLink] = useState(false);
  const linkedToken = useMemo(() => {
    if (scenes.length === 0) return null;
    const scene = activeScene({ scenes, activeSceneId });
    return Object.values(scene.tokens).find((t) => t.characterId === draft.id) ?? null;
  }, [scenes, activeSceneId, draft.id]);
  const [tab, setTab] = useState<SheetTab>('combate');
  const [ritualFilter, setRitualFilter] = useState('');
  const [generalPowerFilter, setGeneralPowerFilter] = useState('');
  // Pentágono de atributos: por padrão clique = rolar teste (igual à
  // referência); esse botão alterna pro modo edição (os mesmos círculos
  // virando campos numéricos) — os atributos continuam editáveis à mão,
  // só não ao mesmo tempo que clicar rola.
  const [editingAttrs, setEditingAttrs] = useState(false);
  // Card com QR+endereço ("No celular", cabeçalho) — reaproveita
  // FichaQr.tsx, só troca onde/como ele aparece.
  const [showQr, setShowQr] = useState(false);
  // Retrato: clique na miniatura já abre o seletor de arquivo (ação mais
  // comum); "url / remover" revela as outras duas opções que já existiam.
  const [showPortraitExtra, setShowPortraitExtra] = useState(false);
  const [freeRollExpr, setFreeRollExpr] = useState('2d6+3');
  // Habilidades: card por habilidade, descrição recolhida por padrão quando
  // a lista tem muitas (ex. ficha importada da Cris, que pode trazer 10+)
  // — pedido do usuário, aba ficava "muito confusa" com tudo expandido ao
  // mesmo tempo. Guarda só as EXCEÇÕES ao padrão (toggle individual), não o
  // estado absoluto, pra sobreviver bem a abilities adicionadas/removidas.
  const [abilityOverrides, setAbilityOverrides] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRemote = useRef<Character | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  // Só adia a atualização remota (ex.: vinda do celular) se o jogador estiver
  // DE VERDADE digitando num campo de texto agora — antes isso checava só
  // "o foco está em algum lugar dentro da janela", o que travava pra sempre
  // (a atualização nunca chegava) sempre que a última coisa clicada tivesse
  // sido um botão/aba dentro da ficha (clicar numa aba deixa ela como
  // document.activeElement até outro clique acontecer — muito comum: abre a
  // ficha, clica numa aba, deixa aberta). Bug relatado pelo usuário: "mudei
  // na ficha do celular mas não mudou na ficha da mesa".
  const isTypingInContainer = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !containerRef.current?.contains(el)) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  };

  useEffect(() => {
    if (character.updatedAt <= draft.updatedAt) return;
    if (isTypingInContainer()) {
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

  // campos cuja mudança dispara recálculo dos derivados. NÃO inclui
  // 'autoCalc' de propósito — o próprio ato de marcar/desmarcar o checkbox
  // não deve, sozinho, mexer em PV/PE/SAN (bug relatado pelo usuário: ligar
  // o automático fazia os pontos caírem sozinhos, porque isso disparava
  // applyDerived mesmo sem nenhum outro campo ter mudado — ver applyDerived
  // em domain/character.ts pro resto da correção).
  const RECALC_KEYS: (keyof Character)[] = [
    'attributes',
    'nex',
    'classe',
    'defenseBonus',
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
      if (pendingRemote.current && !isTypingInContainer()) {
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

  const generalPowerMatches = useMemo(() => {
    const q = generalPowerFilter.trim().toLowerCase();
    return GENERAL_POWERS.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [generalPowerFilter]);

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

  // Agrupa as habilidades da aba Habilidades por origem (campo `source` de
  // cada uma) pra não jogar tudo numa lista plana só — se todas tiverem a
  // mesma origem (ex. ficha importada da Cris, onde tudo vem como
  // "Importado da Cris"), cai num grupo só e o rótulo nem aparece (ver
  // abilityGroups.length > 1 no JSX), então não força uma divisão
  // artificial que não ajudaria.
  const abilityGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Character['abilities']>();
    for (const ab of draft.abilities) {
      const key = ab.source.trim() || 'Sem origem';
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(ab);
    }
    return order.map((key) => ({ key, label: key, items: map.get(key)! }));
  }, [draft.abilities]);

  // Com muitas habilidades (ex. 11 importadas da Cris) a descrição de cada
  // card vem recolhida por padrão — só o nome/origem no cabeçalho — porque
  // expandir tudo de uma vez é exatamente o que ficava "muito confuso".
  // `abilityOverrides` guarda só quem foge do padrão (clicou pra abrir/
  // fechar manualmente), então adicionar/remover habilidade não bagunça o
  // estado de quem já estava aberto.
  const abilityManyExpand = {
    manyAbilities: draft.abilities.length > 4,
    isExpanded(id: string) {
      const defaultExpanded = draft.abilities.length <= 4;
      return abilityOverrides.has(id) ? !defaultExpanded : defaultExpanded;
    },
    toggle(id: string) {
      setAbilityOverrides((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
  };

  return (
    <div className="rd-sheet" ref={containerRef} onBlurCapture={onBlurCapture}>
      <header className="rd-sheet-header">
        <div className="rd-sheet-portrait-col">
          <button
            type="button"
            className="rd-sheet-portrait"
            style={draft.image ? { backgroundImage: `url(${draft.image})` } : undefined}
            onClick={() => portraitInputRef.current?.click()}
            aria-label="Trocar retrato (escolher imagem do computador)"
            title="Trocar retrato"
          >
            {!draft.image && (draft.name.trim().charAt(0).toUpperCase() || '?')}
          </button>
          <button
            type="button"
            className="rd-sheet-portrait-more"
            onClick={() => setShowPortraitExtra((v) => !v)}
          >
            {showPortraitExtra ? 'ocultar' : 'url / remover'}
          </button>
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

        <div className="rd-sheet-identity">
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">Personagem</span>
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">Jogador</span>
            <input value={draft.player} onChange={(e) => patch({ player: e.target.value })} />
          </label>
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">Origem</span>
            <input value={draft.origem} onChange={(e) => patch({ origem: e.target.value })} />
          </label>
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">Classe</span>
            <select value={draft.classe} onChange={(e) => patch({ classe: e.target.value as ClassKey })}>
              {CLASSES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">
              Trilha{draft.nex < 10 ? ' (NEX 10%+)' : ''}
            </span>
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
          </label>
          <label className="rd-sheet-field">
            <span className="rd-sheet-field-label">Patente</span>
            <input value={draft.patente} onChange={(e) => patch({ patente: e.target.value })} />
          </label>
        </div>

        <div className="rd-sheet-header-side">
          <div className="rd-sheet-nexbox">
            <input
              type="number"
              min={0}
              max={99}
              step={5}
              value={draft.nex}
              onChange={(e) => patch({ nex: Number(e.target.value) })}
              aria-label="NEX %"
            />
            <span>NEX %</span>
          </div>
          <button
            type="button"
            className={`rd-sheet-icon-btn${showQr ? ' on' : ''}`}
            aria-label="Ficha no celular"
            title="Ficha no celular"
            onClick={() => setShowQr((v) => !v)}
          >
            <PhoneIcon />
          </button>
          {showQr && (
            <div className="rd-sheet-qr-pop">
              <FichaQr characterId={draft.id} />
            </div>
          )}
        </div>
      </header>

      {showPortraitExtra && (
        <div className="rd-sheet-portrait-extra">
          <input
            value={draft.image ?? ''}
            placeholder="…ou cole uma URL de imagem"
            onChange={(e) => patch({ image: e.target.value || undefined })}
          />
          {draft.image && (
            <button className="small ghost" onClick={() => patch({ image: undefined })}>
              remover retrato
            </button>
          )}
        </div>
      )}

      {draft.trilha && (
        <p className="faint rd-sheet-hint">
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
        <div className="rd-sheet-field" style={{ maxWidth: 320 }}>
          <span className="rd-sheet-field-label">Afinidade</span>
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
        </div>
      )}
      {draft.nex >= 50 && (
        <p className="faint rd-sheet-hint">
          Elemento de Afinidade (NEX 50%+): na primeira vez que Transcender depois disso, poderes
          desse elemento podem ser escolhidos de novo pelo bônus de Afinidade (marque na aba
          Progressão).
        </p>
      )}

      <div className="rd-sheet-toolbar">
        <div className="rd-sheet-toolbar-toggles">
          <label className="rd-toggle-row" style={{ cursor: 'pointer' }}>
            <span className="rd-sheet-toggle-label">
              <GearIcon /> Cálculo automático
            </span>
            <span className="rd-toggle" title="Recalcula PV/PE/Sanidade/Defesa pelas regras quando você muda atributo, NEX ou classe">
              <input
                type="checkbox"
                checked={draft.autoCalc}
                onChange={() => {
                  // Ligar é o único momento em que faz sentido recalcular — a
                  // partir daí, só uma mudança de verdade (atributo, NEX...)
                  // dispara de novo (ver RECALC_KEYS). Desligar só congela os
                  // valores como estão, sem mexer em nada.
                  if (!draft.autoCalc) {
                    const applied = applyDerived({ ...draft, autoCalc: true });
                    patch({
                      autoCalc: true,
                      pv: applied.pv,
                      pe: applied.pe,
                      sanity: applied.sanity,
                      defense: applied.defense,
                    });
                  } else {
                    patch({ autoCalc: false });
                  }
                }}
              />
              <span className="rd-toggle-track">
                <span className="rd-toggle-thumb" />
              </span>
            </span>
          </label>
          <label className="rd-toggle-row" style={{ cursor: 'pointer' }}>
            <span className="rd-sheet-toggle-label">
              <PdIcon /> Regra PD
            </span>
            <span
              className="rd-toggle"
              title='Regra opcional: funde PE e Sanidade num só medidor, Pontos de Determinação (PD)'
            >
              <input
                type="checkbox"
                checked={!!draft.pdMode}
                onChange={() => patch({ pdMode: !draft.pdMode })}
              />
              <span className="rd-toggle-track">
                <span className="rd-toggle-thumb" />
              </span>
            </span>
          </label>
        </div>
        <button type="button" className="rd-btn-ghost" onClick={() => setShowTokenLink(true)}>
          <LinkTokenIcon /> {linkedToken ? `Trocar token (${linkedToken.label})` : 'Vincular token'}
        </button>
      </div>

      <div className="calc-strip">
        <span className={attrSpent === (attrZeros > 0 ? 5 : 4) ? 'ok' : 'warn'}>
          Pontos de atributo: {attrSpent}
          {attrZeros > 0 ? ' (+1 por zerar um)' : ''} / {attrZeros > 0 ? 5 : 4}
        </span>
        <span
          className={
            ATTRIBUTES.every((a) => draft.attributes[a.key] <= derived.maxAttribute) ? 'ok' : 'warn'
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

      <div className="rd-sheet-grid">
        {/* ========== COLUNA ESQUERDA: atributos / recursos / defesa ========== */}
        <section className="rd-sheet-col rd-sheet-col-left">
          <div className="rd-card rd-pentagon-card">
            <div className="rd-pentagon-head">
              <span className="rd-sheet-subhead">Atributos</span>
              <button type="button" className="rd-pentagon-mode-btn" onClick={() => setEditingAttrs((v) => !v)}>
                {editingAttrs ? 'voltar a rolar' : 'editar valores'}
              </button>
            </div>
            <div className="rd-pentagon">
              <svg className="rd-pentagon-svg" viewBox="0 0 300 290" aria-hidden>
                <polygon points="150,45 250,118 212,235 88,235 50,118" />
                <path d="M150 145 150 45M150 145 250 118M150 145 212 235M150 145 88 235M150 145 50 118" />
              </svg>
              <span className="rd-pentagon-ring" aria-hidden />
              <span className="rd-pentagon-center" aria-hidden>
                Atributos
              </span>
              {ATTRIBUTES.map((a) => {
                const pos = PENTAGON_POS[a.key];
                const style = { left: `${pos.left}%`, top: `${pos.top}%` };
                return editingAttrs ? (
                  <div key={a.key} className="rd-pentagon-node editing" style={style}>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={draft.attributes[a.key]}
                      onChange={(e) => patchAttr(a.key, Number(e.target.value))}
                      aria-label={`Editar ${a.name}`}
                    />
                    <span className="rd-pentagon-node-short">{a.short}</span>
                  </div>
                ) : (
                  <button
                    key={a.key}
                    type="button"
                    className="rd-pentagon-node"
                    style={style}
                    aria-label={`Rolar ${a.name} (${draft.attributes[a.key]})`}
                    onClick={() =>
                      rollOrdem({
                        label: `${draft.name} · Teste de ${a.name}`,
                        attributeValue: draft.attributes[a.key],
                        bonus: 0,
                        dt: null,
                      })
                    }
                  >
                    <span className="rd-pentagon-node-val">{draft.attributes[a.key]}</span>
                    <span className="rd-pentagon-node-short">{a.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rd-sheet-ministats">
            <div className="rd-sheet-ministat">
              <span className="rd-sheet-ministat-val">{draft.nex}%</span>
              <span className="rd-sheet-ministat-label">NEX</span>
            </div>
            <div className="rd-sheet-ministat">
              <span className="rd-sheet-ministat-val">{derived.pePerTurn}</span>
              <span className="rd-sheet-ministat-label">PE / turno</span>
            </div>
            <div className="rd-sheet-ministat">
              <input
                type="number"
                className="rd-sheet-ministat-val"
                value={draft.displacement}
                onChange={(e) => patch({ displacement: Number(e.target.value) })}
                aria-label="Deslocamento (m)"
              />
              <span className="rd-sheet-ministat-label">Desloc. (m)</span>
            </div>
          </div>

          <div className="rd-sheet-bars">
            <RdBar
              name="Vida"
              resourceClass="rd-resource-vida"
              cur={draft.pv.current}
              max={draft.pv.max}
              extra={draft.pv.temp}
              extraLabel="PV temp"
              lockMax={draft.autoCalc}
              onCur={(v) => patch({ pv: { ...draft.pv, current: v } })}
              onMax={(v) => patch({ pv: { ...draft.pv, max: v } })}
              onExtra={(v) => patch({ pv: { ...draft.pv, temp: v } })}
            />
            <RdBar
              name={draft.pdMode ? 'Pontos de Determinação (PD)' : 'Esforço'}
              resourceClass="rd-resource-esforco"
              cur={draft.pe.current}
              max={draft.pe.max}
              lockMax={draft.autoCalc}
              onCur={(v) => patch({ pe: { ...draft.pe, current: v } })}
              onMax={(v) => patch({ pe: { ...draft.pe, max: v } })}
            />
            {!draft.pdMode && (
              <RdBar
                name="Sanidade"
                resourceClass="rd-resource-sanidade"
                cur={draft.sanity.current}
                max={draft.sanity.max}
                lockMax={draft.autoCalc}
                onCur={(v) => patch({ sanity: { ...draft.sanity, current: v } })}
                onMax={(v) => patch({ sanity: { ...draft.sanity, max: v } })}
              />
            )}
            {!draft.autoCalc && (
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

          <div className="rd-card rd-sheet-defense">
            <div className="rd-sheet-shield">
              <svg viewBox="0 0 72 82" width="58" height="66" aria-hidden>
                <path
                  d="M36 3 67 14v24c0 20-13 34-31 41C18 72 5 58 5 38V14z"
                  fill="#1a0e12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
              <span className="rd-sheet-shield-val">{draft.autoCalc ? derived.defense : draft.defense}</span>
            </div>
            <div className="rd-sheet-defense-body">
              <span className="rd-sheet-defense-title">Defesa</span>
              {draft.autoCalc ? (
                <>
                  <span className="rd-sheet-defense-formula">
                    10 + AGI {draft.attributes.AGI} + bônus {draft.defenseBonus}
                    {equipmentDefenseBonus(draft) > 0 ? ` + equipamento ${equipmentDefenseBonus(draft)}` : ''}
                  </span>
                  <label className="rd-sheet-field" style={{ border: 0, paddingBottom: 0, maxWidth: 160 }}>
                    <span className="rd-sheet-field-label">Bônus</span>
                    <input
                      type="number"
                      value={draft.defenseBonus}
                      onChange={(e) => patch({ defenseBonus: Number(e.target.value) })}
                    />
                  </label>
                </>
              ) : (
                <label className="rd-sheet-field" style={{ border: 0, paddingBottom: 0, maxWidth: 120 }}>
                  <span className="rd-sheet-field-label">Valor</span>
                  <input
                    type="number"
                    value={draft.defense}
                    onChange={(e) => patch({ defense: Number(e.target.value) })}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rd-sheet-traits">
            <label className="rd-sheet-field">
              <span className="rd-sheet-field-label">
                Proteção
                {derived.protectionTotal > draft.protection ? ` (total c/ equipamento: ${derived.protectionTotal})` : ''}
              </span>
              <input
                type="number"
                value={draft.protection}
                onChange={(e) => patch({ protection: Number(e.target.value) })}
              />
            </label>
            <label className="rd-sheet-field">
              <span className="rd-sheet-field-label">Proficiências</span>
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
            </label>
          </div>

          <div className="rd-sheet-conditions">
            <span className="rd-sheet-subhead">Condições</span>
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
          </div>
        </section>

        {/* ========== COLUNA DO MEIO: perícias ========== */}
        <section className="rd-sheet-col rd-sheet-col-mid">
          <div className="rd-card rd-sheet-skills">
            <div className="rd-sheet-skills-head">
              <span>Perícias</span>
              <span className="rd-sheet-skills-legend">
                <span className="rd-legend-dot" style={{ color: '#5bd48a' }}>
                  treinado
                </span>
                <span className="rd-legend-dot" style={{ color: '#6fa8ff' }}>
                  veterano
                </span>
                <span className="rd-legend-dot" style={{ color: '#ffb547' }}>
                  expert
                </span>
              </span>
            </div>
            <div className="rd-sheet-skills-cols">
              <span>Perícia</span>
              <span>Dados</span>
              <span>Bônus</span>
              <span>Treino</span>
              <span>Outros</span>
            </div>
            {SKILLS.map((s) => {
              const st = draft.skills[s.key] ?? { training: 0, bonus: 0 };
              const total = skillBonus(draft, s.key);
              const grade = tierColor(st.training);
              return (
                <div className="rd-sheet-skill-row" key={s.key}>
                  <button
                    type="button"
                    className="rd-sheet-skill-name"
                    style={{ color: st.training ? grade : '#d9d2cc', fontWeight: st.training ? 600 : 500 }}
                    onClick={() => rollSkill(s.key, s.name, s.attr)}
                    aria-label={`Rolar ${s.name}`}
                    title={`${draft.attributes[s.attr]}d20 + ${total}`}
                  >
                    <D20Icon className="rd-sheet-skill-d20" />
                    <span>
                      {s.name}
                      {s.onlyTrained ? '*' : ''}
                      {s.loadPenalty ? '+' : ''}
                    </span>
                  </button>
                  <span className="rd-sheet-skill-attr" style={{ color: st.training ? grade : '#8e8088' }}>
                    {s.attr}
                  </span>
                  <span className="rd-sheet-skill-bonus" style={{ color: total ? grade : '#6e6670' }}>
                    {total >= 0 ? '+' : ''}
                    {total}
                  </span>
                  <select
                    value={st.training}
                    style={{ borderBottomColor: st.training ? grade : undefined, color: st.training ? grade : undefined }}
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
                </div>
              );
            })}
            <p className="rd-sheet-skills-foot">+ penalidade de carga · * somente treinada</p>
          </div>
        </section>

        {/* ========== COLUNA DA DIREITA: abas ========== */}
        <section className="rd-sheet-col rd-sheet-col-right">
          <nav className="rd-tabs" role="tablist">
            {SHEET_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`rd-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'progressao' && pendingTotal > 0 && (
                  <span className="rd-tab-badge">{pendingTotal}</span>
                )}
              </button>
            ))}
          </nav>

          {tab === 'combate' && (
            <div className="rd-sheet-tabpanel">
              <div className="rd-sheet-combat-tools">
                <div className="rd-sheet-freeroll">
                  <input
                    placeholder="Rolar dados (ex.: 2d6+3)"
                    value={freeRollExpr}
                    onChange={(e) => setFreeRollExpr(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Rolar"
                    onClick={() => {
                      const expr = freeRollExpr.trim();
                      if (expr) rollFree(`${draft.name} · rolagem livre`, expr);
                    }}
                  >
                    <D20Icon />
                  </button>
                </div>
                <button
                  type="button"
                  className="rd-btn-ghost"
                  onClick={() => patch({ attacks: [...draft.attacks, emptyAttack()] })}
                >
                  + Novo ataque
                </button>
              </div>

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
                      onClick={() => patch({ attacks: draft.attacks.filter((a) => a.id !== atk.id) })}
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
            </div>
          )}

          {tab === 'habilidades' && (
            <div className="rd-sheet-tabpanel">
              <div className="section-title">
                Habilidades
                {abilityManyExpand.manyAbilities && (
                  <span className="section-title-actions">
                    <button className="small ghost" onClick={() => setAbilityOverrides(new Set())}>
                      Recolher todas
                    </button>
                    <button
                      className="small ghost"
                      onClick={() => setAbilityOverrides(new Set(draft.abilities.map((a) => a.id)))}
                    >
                      Expandir todas
                    </button>
                  </span>
                )}
              </div>
              {abilityGroups.map((group) => (
                <div className="ability-group" key={group.key}>
                  {abilityGroups.length > 1 && <div className="ability-group-label">{group.label}</div>}
                  {group.items.map((ab) => {
                    const expanded = abilityManyExpand.isExpanded(ab.id);
                    const preview = ab.description.trim();
                    return (
                      <div className={`ability-card${expanded ? ' expanded' : ''}`} key={ab.id}>
                        <div className="ability-card-head" onClick={() => abilityManyExpand.toggle(ab.id)}>
                          <span className="ability-chevron">{expanded ? '▾' : '▸'}</span>
                          <div className="ability-card-title">
                            <input
                              className="ability-name-input"
                              value={ab.name}
                              placeholder="Nome da habilidade"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateAbility(draft, patch, ab.id, { name: e.target.value })}
                            />
                            <input
                              className="ability-source-input"
                              value={ab.source}
                              placeholder="Origem (classe, trilha, paranormal...)"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateAbility(draft, patch, ab.id, { source: e.target.value })}
                            />
                          </div>
                          <button
                            className="small ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              patch({ abilities: draft.abilities.filter((a) => a.id !== ab.id) });
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        {expanded ? (
                          <textarea
                            className="ability-description"
                            value={ab.description}
                            placeholder="Descrição"
                            onChange={(e) => updateAbility(draft, patch, ab.id, { description: e.target.value })}
                          />
                        ) : preview ? (
                          <p className="ability-preview" onClick={() => abilityManyExpand.toggle(ab.id)}>
                            {preview.length > 120 ? `${preview.slice(0, 120)}…` : preview}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
              <details className="ritual-picker">
                <summary>+ Adicionar poder geral do livro</summary>
                <input
                  placeholder="Filtrar por nome…"
                  value={generalPowerFilter}
                  onChange={(e) => setGeneralPowerFilter(e.target.value)}
                  style={{ margin: '8px 0' }}
                />
                {generalPowerMatches.map((p) => (
                  <div className="ritual-row" key={p.key}>
                    <button
                      className="small"
                      title="Adicionar à ficha"
                      onClick={() =>
                        patch({
                          abilities: [
                            ...draft.abilities,
                            {
                              id: uid(),
                              name: p.name,
                              source: 'Poder Geral',
                              description: `${p.prereq !== '—' ? `Pré-requisito: ${p.prereq}. ` : ''}${p.summary}`,
                            },
                          ],
                        })
                      }
                    >
                      +
                    </button>
                    <span>
                      <strong>{p.name}</strong>{' '}
                      <small className="faint">{p.prereq !== '—' ? p.prereq : 'sem pré-requisito'}</small>
                      <br />
                      <small className="faint">{p.summary}</small>
                    </span>
                  </div>
                ))}
              </details>

              <button
                className="small"
                onClick={() => patch({ abilities: [...draft.abilities, emptyAbility()] })}
              >
                + Adicionar habilidade
              </button>
            </div>
          )}

          {tab === 'rituais' && (
            <div className="rd-sheet-tabpanel">
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
                          <button className="small" title="Adicionar à ficha" onClick={() => addRitualFromDef(r)}>
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
                    onChange={(e) => updateRitual(draft, patch, rt.id, { description: e.target.value })}
                  />
                  <label
                    className="chip-row"
                    style={{ marginTop: 6, alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={!!rt.freeSource}
                      onChange={(e) => updateRitual(draft, patch, rt.id, { freeSource: e.target.checked })}
                    />
                    <span className="faint" style={{ fontSize: 12 }}>
                      ganho por classe/trilha (não conta na vaga)
                    </span>
                  </label>
                </div>
              ))}
              <button className="small" onClick={() => patch({ rituals: [...draft.rituals, emptyRitual()] })}>
                + Adicionar ritual
              </button>
            </div>
          )}

          {tab === 'inventario' && (
            <InventoryEditor
              inventory={draft.inventory}
              onChange={(inventory) => patch({ inventory })}
              loadHint={`Espaços usados: ${slotsUsed} · Limite (Força + 5${
                draft.trilha === 'Técnico' && draft.nex >= 10 ? ' + Intelecto (Inventário Otimizado)' : ''
              }): ${derived.loadLimit}`}
            />
          )}

          {tab === 'progressao' && (
            <div className="rd-sheet-tabpanel">
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Poder de Classe (NEX 15/30/45/60/75/90), Aumento de Atributo (20/50/80/95) e Grau de
                Treinamento (35/70) pendentes para o NEX atual. Trilha (10/40/65/99) já entra sozinha —
                veja o aviso no topo da ficha.
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
                        <button className="small ghost" onClick={() => patch(removeClassPowerPick(draft, p.id))}>
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
                      <button className="small ghost" onClick={() => patch(removeAttributeBump(draft, b.id))}>
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

          {tab === 'notas' && (
            <div className="rd-sheet-tabpanel">
              <textarea
                style={{ minHeight: 260 }}
                value={draft.notes}
                placeholder="Histórico, objetivos, segredos do personagem..."
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </div>
          )}
        </section>
      </div>

      {showTokenLink && (
        <TokenLinkDialog character={draft} mode="manage" onClose={() => setShowTokenLink(false)} />
      )}
    </div>
  );
}

/* ---------- barra de recurso (Vida/Sanidade/Esforço) ---------------------- */

function RdBar(props: {
  name: string;
  resourceClass: string;
  cur: number;
  max: number;
  extra?: number;
  extraLabel?: string;
  lockMax?: boolean;
  onCur: (v: number) => void;
  onMax: (v: number) => void;
  onExtra?: (v: number) => void;
}) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.cur / props.max) * 100)) : 0;
  return (
    <div className="rd-sheet-bar">
      <div className="rd-sheet-bar-head">
        <span>{props.name}</span>
        <b>{Math.round(pct)}%</b>
      </div>
      <div className={`rd-resource-bar rd-sheet-bar-track ${props.resourceClass}`}>
        <div className="rd-resource-bar-fill" style={{ width: `${pct}%` }} />
        <div className="rd-sheet-bar-controls">
          <div className="rd-sheet-bar-stepgroup">
            <button
              type="button"
              className="rd-sheet-bar-step"
              aria-label={`${props.name} menos 5`}
              onClick={() => props.onCur(props.cur - 5)}
            >
              <StepIcon dir="minus5" />
            </button>
            <button
              type="button"
              className="rd-sheet-bar-step"
              aria-label={`${props.name} menos 1`}
              onClick={() => props.onCur(props.cur - 1)}
            >
              <StepIcon dir="minus1" />
            </button>
          </div>
          <span className="rd-sheet-bar-value">
            {props.cur} / {props.max}
            {props.extra ? ` (+${props.extra})` : ''}
          </span>
          <div className="rd-sheet-bar-stepgroup">
            <button
              type="button"
              className="rd-sheet-bar-step"
              aria-label={`${props.name} mais 1`}
              onClick={() => props.onCur(props.cur + 1)}
            >
              <StepIcon dir="plus1" />
            </button>
            <button
              type="button"
              className="rd-sheet-bar-step"
              aria-label={`${props.name} mais 5`}
              onClick={() => props.onCur(props.cur + 5)}
            >
              <StepIcon dir="plus5" />
            </button>
          </div>
        </div>
      </div>
      <div className="rd-sheet-bar-meta">
        <span>máx</span>
        <input
          type="number"
          value={props.max}
          disabled={props.lockMax}
          title={props.lockMax ? 'Calculado pelas regras' : undefined}
          onChange={(e) => props.onMax(Number(e.target.value))}
        />
        {props.onExtra && (
          <>
            <span>{props.extraLabel}</span>
            <input type="number" value={props.extra ?? 0} onChange={(e) => props.onExtra!(Number(e.target.value))} />
          </>
        )}
      </div>
    </div>
  );
}

function StepIcon({ dir }: { dir: 'minus5' | 'minus1' | 'plus1' | 'plus5' }) {
  const paths: Record<string, string> = {
    minus5: 'M11 6l-6 6 6 6M19 6l-6 6 6 6',
    minus1: 'M15 6l-6 6 6 6',
    plus1: 'M9 6l6 6-6 6',
    plus5: 'M5 6l6 6-6 6M13 6l6 6-6 6',
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={paths[dir]} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ícone de d20 usado no botão de rolar perícia (coluna do meio) e no botão
// de "rolar dados" livre (aba Combate) — substitui o emoji 🎲 que tinha
// antes (pedido geral da sequência: emoji cru → SVG em traço).
function D20Icon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2 21 7v10l-9 5-9-5V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M12 2 7.5 9.5h9zM7.5 9.5 3 17M16.5 9.5 21 17M7.5 9.5 12 22l4.5-12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
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
  const [powerFilter, setPowerFilter] = useState('');
  const [transFilter, setTransFilter] = useState('');
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
  const powerMatches = options.filter(
    (p) => !powerFilter.trim() || p.name.toLowerCase().includes(powerFilter.trim().toLowerCase()),
  );
  const paranormalMatches = PARANORMAL_POWERS.filter(
    (p) => !transFilter.trim() || p.name.toLowerCase().includes(transFilter.trim().toLowerCase()),
  );

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
      <input
        placeholder="Filtrar por nome…"
        value={powerFilter}
        onChange={(e) => setPowerFilter(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <div className="rd-power-pick-list" role="listbox">
        {powerMatches.map((p) => (
          <button
            type="button"
            key={p.key}
            role="option"
            aria-selected={key === p.key}
            className={'rd-power-pick-row' + (key === p.key ? ' on' : '')}
            onClick={() => setKey(p.key)}
          >
            <span className="rd-power-pick-name">{p.name}</span>
            <span className="rd-power-pick-summary">
              {p.summary}
              {p.prereq ? ` (pré-requisito: ${p.prereq})` : ''}
            </span>
          </button>
        ))}
        {powerMatches.length === 0 && <p className="faint" style={{ fontSize: 12, padding: 8 }}>Nenhum poder encontrado.</p>}
      </div>

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
        <div className="rd-power-pick-list" role="listbox" style={{ marginTop: 6 }}>
          {trilhaOptions.map((t) => (
            <button
              type="button"
              key={t.name}
              role="option"
              aria-selected={trilhaPick === t.name}
              className={'rd-power-pick-row' + (trilhaPick === t.name ? ' on' : '')}
              onClick={() => setTrilhaPick(t.name)}
            >
              <span className="rd-power-pick-name">{t.name}</span>
              <span className="rd-power-pick-summary">{t.flavor}</span>
            </button>
          ))}
        </div>
      )}

      {def?.key === 'transcender' && (
        <>
          <input
            placeholder="Filtrar por nome…"
            value={transFilter}
            onChange={(e) => setTransFilter(e.target.value)}
            style={{ marginTop: 6 }}
          />
          <div className="rd-power-pick-list" role="listbox">
            {paranormalMatches.map((p) => (
              <button
                type="button"
                key={p.key}
                role="option"
                aria-selected={paranormalKey === p.key}
                className={'rd-power-pick-row' + (paranormalKey === p.key ? ' on' : '')}
                onClick={() => setParanormalKey(p.key)}
              >
                <span className="rd-power-pick-name">
                  {p.name}
                  {p.element !== 'geral' ? ` (${p.element})` : ''}
                </span>
                <span className="rd-power-pick-summary">
                  {p.summary}
                  {p.prereq ? ` (pré-requisito: ${p.prereq})` : ''}
                </span>
              </button>
            ))}
            {paranormalMatches.length === 0 && (
              <p className="faint" style={{ fontSize: 12, padding: 8 }}>Nenhum poder encontrado.</p>
            )}
          </div>
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
              Bônus de Afinidade disponível só se esse for seu elemento de Afinidade (defina no
              cabeçalho da ficha, NEX 50%+).
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
function updateRitual(c: Character, patch: Patch, id: string, p: Partial<Ritual>) {
  patch({ rituals: c.rituals.map((a) => (a.id === id ? { ...a, ...p } : a)) });
}

function emptyAttack(): Attack {
  return { id: uid(), name: '', test: '', damage: '', type: '', range: '', crit: '', notes: '' };
}
function emptyAbility(): Character['abilities'][number] {
  return { id: uid(), name: '', source: '', description: '' };
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
