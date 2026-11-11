import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ATTRIBUTES,
  CLASSES,
  CLASS_BY_KEY,
  ELEMENTS,
  SKILLS,
  SKILL_BY_KEY,
  type AttrKey,
  type ClassKey,
  type Element,
} from '../data/ordem';
import { ORIGIN_BY_NAME, ORIGINS } from '../data/origins';
import { createCharacter, suggestedStats, type Character, type InventoryItem } from '../domain/character';
import { fileToDownscaledDataURL } from '../lib/image';
import { TRILHAS_BY_CLASS, unlockedTrilhaPowers } from '../data/trilhas';
import { InventoryEditor } from './InventoryEditor';
import { SearchSelect } from './SearchSelect';
import {
  ArrowRightIcon,
  BackChevronIcon,
  BrandEyeIcon,
  CheckIcon,
  ClassIcon,
  LockIcon,
  OriginPowerIcon,
  PortraitIcon,
  UploadIcon,
} from './icons';

const STEPS = ['Conceito', 'Atributos', 'Classe', 'Trilha', 'Perícias', 'Inventário', 'Revisão'];

// Subtítulo fixo de cada etapa — o conteúdo que depende de estado (NEX,
// perícias etc.) é renderizado dentro do próprio corpo da etapa, não aqui.
const STEP_SUB = [
  'Quem é esse agente — nome, retrato e de onde ele veio.',
  'Todos começam em 1. Distribua até a soma dos cinco chegar a 9. Máx 3; um pode ficar em 0 (dá +1 ponto).',
  'O papel do agente na equipe.',
  'Escolhida em NEX 10%; ganha um novo poder da trilha em NEX 40%, 65% e 99%.',
  'Escolha as perícias treinadas iniciais — o limite depende da classe, do Intelecto e da origem.',
  'Sem limite de itens. Use o catálogo do livro ou adicione itens livres — dá pra ajustar tudo na ficha depois também.',
  'Confira e crie o agente. Tudo pode ser ajustado na ficha depois.',
];

const CLASS_NOTE: Record<ClassKey, string> = {
  combatente: 'Foco em combate; armas simples e táticas, proteções leves e pesadas.',
  especialista: 'O mais versátil — muitas perícias treinadas.',
  ocultista: 'Conjura rituais; afinidade a um elemento e 3 rituais de 1º círculo.',
};

// Brasas subindo no canto do fundo — mesma fórmula já usada em Minhas
// Fichas (CharacterLibrary.tsx, `LIBRARY_EMBERS`): posição/tamanho/duração
// derivados só do índice, nada aleatório (evita re-sortear a cada render).
const WIZARD_EMBERS: CSSProperties[] = Array.from({ length: 12 }, (_, i) => {
  const left = (i * 31 + 6) % 100;
  const size = 2 + (i % 3);
  const dur = 11 + (i % 4) * 3;
  const delay = -((i * 2.3) % dur);
  return {
    left: `${left}%`,
    width: size,
    height: size,
    animationDuration: `${dur}s`,
    animationDelay: `${delay.toFixed(1)}s`,
  };
});

interface Props {
  ownerId: string;
  defaultPlayer?: string;
  onDone: (c: Character) => void;
  onCancel: () => void;
}

export function CharacterWizard({ ownerId, defaultPlayer = '', onDone, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };
  const [nome, setNome] = useState('');
  const [jogador, setJogador] = useState(defaultPlayer);
  const [origem, setOrigem] = useState('');
  const [image, setImage] = useState('');
  const [nex, setNex] = useState(5);
  const [attrs, setAttrs] = useState<Record<AttrKey, number>>({
    AGI: 1,
    FOR: 1,
    INT: 1,
    PRE: 1,
    VIG: 1,
  });
  const [classe, setClasse] = useState<ClassKey>('combatente');
  const [element, setElement] = useState<Element>('medo');
  const [trilha, setTrilha] = useState('');
  const [trained, setTrained] = useState<string[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const needsTrilha = nex >= 10;
  const trilhaOptions = TRILHAS_BY_CLASS[classe];
  useEffect(() => {
    // trilhas são por classe: some se trocar de classe pra uma que não tem essa trilha
    if (trilha && !trilhaOptions.some((t) => t.name === trilha)) setTrilha('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classe]);
  const unlockedPowers = trilha ? unlockedTrilhaPowers(classe, trilha, nex) : [];

  const originDef = ORIGIN_BY_NAME[origem.trim()];
  const originSkills: string[] =
    originDef && originDef.skills !== 'choice' ? originDef.skills : [];

  useEffect(() => {
    if (originSkills.length === 0) return;
    setTrained((t) => {
      const missing = originSkills.filter((k) => !t.includes(k));
      return missing.length ? [...t, ...missing] : t;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origem]);

  const attrSum = ATTRIBUTES.reduce((a, x) => a + attrs[x.key], 0);
  const attrPointsLeft = 9 - attrSum;
  const zeros = ATTRIBUTES.filter((x) => attrs[x.key] === 0).length;
  const attrsValid =
    attrSum === 9 && zeros <= 1 && ATTRIBUTES.every((x) => attrs[x.key] >= 0 && attrs[x.key] <= 3);

  const classBase = CLASS_BY_KEY[classe].skillsTrained;
  const skillBudget = classBase + attrs.INT + 2;
  const derived = useMemo(
    () => suggestedStats(classe, nex, attrs.VIG, attrs.PRE),
    [classe, nex, attrs.VIG, attrs.PRE],
  );

  const inc = (k: AttrKey) => {
    if (attrs[k] >= 3 || attrPointsLeft <= 0) return;
    setAttrs({ ...attrs, [k]: attrs[k] + 1 });
  };
  const dec = (k: AttrKey) => {
    if (attrs[k] <= 0) return;
    if (attrs[k] === 1 && zeros >= 1) return;
    setAttrs({ ...attrs, [k]: attrs[k] - 1 });
  };
  const toggleSkill = (key: string) => {
    if (originSkills.includes(key)) return;
    setTrained((t) => (t.includes(key) ? t.filter((k) => k !== key) : [...t, key]));
  };

  const stepValid = [
    nome.trim().length > 0,
    attrsValid,
    true,
    !needsTrilha || trilha !== '',
    trained.length <= skillBudget,
    true,
    true,
  ][step];

  const stepHint = [
    nome.trim().length > 0 ? '' : 'Dê um nome ao agente pra continuar.',
    attrsValid ? '' : attrPointsLeft > 0 ? `Faltam ${attrPointsLeft} ponto(s) pra distribuir.` : 'Pontos além do limite.',
    '',
    !needsTrilha || trilha !== '' ? '' : 'Escolha uma trilha.',
    trained.length <= skillBudget ? '' : `Perícias além do limite (${trained.length}/${skillBudget}).`,
    '',
    '',
  ][step];

  const build = (): Character => {
    const c = createCharacter(ownerId, nome.trim() || 'Novo Agente');
    c.player = jogador.trim();
    c.origem = origem.trim();
    c.image = image.trim() || undefined;
    c.classe = classe;
    c.attributes = { ...attrs };
    c.pv = { current: derived.pvMax, max: derived.pvMax, temp: 0 };
    c.pe = { current: derived.peMax, max: derived.peMax };
    c.sanity = { current: derived.sanMax, max: derived.sanMax };
    c.defense = 10 + attrs.AGI;
    c.displacement = 9;
    c.nex = nex;
    c.trilha = trilha;
    for (const k of trained) c.skills[k] = { training: 5, bonus: 0 };
    c.inventory = inventory;
    if (originDef) {
      c.abilities.push({
        id: Math.random().toString(36).slice(2, 10),
        name: originDef.power,
        source: `Origem: ${origem.trim()}`,
        description: originDef.powerNote,
      });
    }
    for (const p of unlockedPowers) {
      c.abilities.push({
        id: Math.random().toString(36).slice(2, 10),
        name: `${p.name} (NEX ${p.nex}%)`,
        source: `Trilha: ${trilha}`,
        description: p.summary,
      });
    }
    if (classe === 'ocultista') {
      c.notes =
        `Afinidade elemental: ${ELEMENTS.find((e) => e.key === element)?.name}. ` +
        `Inicia com 3 rituais de 1º círculo (adicionar na aba Rituais).`;
    }
    c.updatedAt = Date.now();
    return c;
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    void fileToDownscaledDataURL(file, 512).then((u) => u && setImage(u));
  };

  const initial = (nome.trim()[0] || '?').toUpperCase();

  // Portal pro <body>: sem isso, `.rd-cw` (position:fixed, z-index:200) fica
  // preso no contexto de empilhamento do próprio Home — perde na hora de
  // sobrepor outros elementos fixos que já vivem direto no <body> (a
  // engrenagem de configurações, os diálogos de prompt), mesmo tendo um
  // z-index maior. Foi isso que causava o botão "Continuar" (canto inferior
  // do wizard) roubando clique pra engrenagem, que fica no mesmo canto.
  return createPortal(
    <div className="rd-cw">
      <div className="rd-cw-bg" aria-hidden="true">
        <div className="rd-cw-glow" />
        <div className="rd-cw-sigil-spin">
          <img className="rd-cw-sigil-img" src="/sigils/sigilo-original.svg" alt="" />
        </div>
        <div className="rd-cw-embers">
          {WIZARD_EMBERS.map((style, i) => (
            <span key={i} className="rd-cw-ember" style={style} />
          ))}
        </div>
      </div>

      <div className="rd-cw-top">
        <span className="rd-cw-brand">
          <BrandEyeIcon /> Criar Agente
        </span>
        <ol className="rd-cw-rail" aria-label="Etapas">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s}>
                <button
                  type="button"
                  className={'rd-cw-step' + (current ? ' on' : done ? ' done' : '')}
                  disabled={!done}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => done && go(i)}
                >
                  <span className="rd-cw-step-head">
                    <span className="rd-cw-step-dot">{done ? <CheckIcon size={11} /> : i + 1}</span>
                    <span className="rd-cw-step-label">{s}</span>
                  </span>
                  <span className="rd-cw-step-bar">
                    <span />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" className="rd-cw-cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <div className="rd-cw-body">
        <div className={'rd-cw-main ' + (dir === 1 ? 'slide-fwd' : 'slide-back')} key={step}>
          <span className="rd-cw-kicker">{`// ETAPA ${step + 1} DE ${STEPS.length}`}</span>
          <h2 className="rd-cw-title">{STEPS[step]}</h2>
          <p className="rd-cw-sub">{STEP_SUB[step]}</p>

          {step === 0 && (
            <>
              <div className="rd-cw-card">
                <div className="rd-cw-portrait-row">
                  <div
                    className="rd-cw-portrait-btn"
                    aria-hidden="true"
                    style={image ? { backgroundImage: `url(${image})` } : undefined}
                  >
                    {!image && <PortraitIcon />}
                  </div>
                  <div className="rd-cw-upload-col">
                    <label className="rd-cw-upload-btn">
                      <UploadIcon /> Do computador
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          onPickImage(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <input
                      value={image}
                      placeholder="…ou cole o link de uma imagem"
                      onChange={(e) => setImage(e.target.value)}
                    />
                    {image && (
                      <button type="button" className="rd-cw-remove-link" onClick={() => setImage('')}>
                        remover
                      </button>
                    )}
                  </div>
                </div>

                <div className="rd-cw-field-grid2">
                  <label className="rd-cw-field">
                    <span className="req">Nome do agente</span>
                    <input
                      className={nome.trim() ? undefined : 'invalid'}
                      value={nome}
                      autoFocus
                      placeholder="Como os outros vão chamar seu agente"
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </label>
                  <label className="rd-cw-field">
                    <span>NEX inicial</span>
                    <input
                      type="number"
                      min={5}
                      max={99}
                      step={5}
                      value={nex}
                      onChange={(e) => setNex(Math.max(5, Math.min(99, Number(e.target.value))))}
                    />
                  </label>
                </div>
                <div className="rd-cw-field-grid2b">
                  <label className="rd-cw-field">
                    <span>Jogador</span>
                    <input value={jogador} onChange={(e) => setJogador(e.target.value)} />
                  </label>
                  <label className="rd-cw-field">
                    <span>Origem</span>
                    <SearchSelect value={origem} onChange={setOrigem} options={ORIGINS} placeholder="ex.: Militar" />
                  </label>
                </div>

                <div className="rd-cw-origin-note">
                  <OriginPowerIcon />
                  <div className="rd-cw-origin-note-text">
                    <span className="rd-cw-origin-note-title">
                      {originDef ? `Poder de origem: ${originDef.power}` : 'Escolha uma origem da lista'}
                    </span>
                    <span className="rd-cw-origin-note-body">
                      {originDef
                        ? originDef.skills === 'choice'
                          ? 'Amnésico: 2 perícias à escolha do mestre (marque na etapa Perícias).'
                          : `Já treina ${originSkills
                              .map((k) => SKILL_BY_KEY[k]?.name)
                              .join(' e ')}. As 2 perícias (🔒 na etapa Perícias) e o poder entram sozinhos na ficha.`
                        : 'A origem preenche 2 perícias treinadas e um poder automaticamente.'}
                    </span>
                  </div>
                </div>
              </div>

              {nex > 5 && (
                <p className="rd-cw-nex-note">
                  NEX acima de 5%: os Poderes de Classe (15/30/45/60/75/90%), Aumentos de Atributo
                  (20/50/80/95%) e evoluções de perícia (35/70%) já disponíveis vão aparecer como
                  pendentes na aba <b>Progressão</b> da ficha assim que você criar o agente — é só
                  escolher lá.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <div className="rd-cw-card">
              <div className="rd-cw-points-row">
                <span
                  className={
                    'rd-cw-points-pill' +
                    (attrPointsLeft === 0 ? ' ok' : attrPointsLeft < 0 ? ' over' : '')
                  }
                >
                  {attrPointsLeft > 0 ? `+${attrPointsLeft}` : attrPointsLeft}
                </span>
                <span className="rd-cw-points-hint">
                  {attrPointsLeft === 0
                    ? 'distribuição completa'
                    : attrPointsLeft < 0
                      ? 'pontos além do limite'
                      : 'pontos restantes'}
                </span>
              </div>
              <div className="rd-cw-attr-grid">
                {ATTRIBUTES.map((a) => {
                  const v = attrs[a.key];
                  return (
                    <div className="rd-cw-attr-cell" key={a.key}>
                      <span className="rd-cw-attr-name">{a.name}</span>
                      <div className={'rd-cw-hex' + (v === 0 ? ' zero' : v >= 3 ? ' max' : '')}>
                        <div className="rd-cw-hex-in">
                          <span className={'rd-cw-hex-val' + (v === 0 ? ' zero' : '')}>{v}</span>
                        </div>
                      </div>
                      <span className="rd-cw-attr-short">{a.short}</span>
                      <div className="rd-cw-attr-ctl">
                        <button type="button" aria-label={`Diminuir ${a.name}`} onClick={() => dec(a.key)}>
                          −
                        </button>
                        <button type="button" aria-label={`Aumentar ${a.name}`} onClick={() => inc(a.key)}>
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="rd-cw-class-list">
                {CLASSES.map((c) => {
                  const on = classe === c.key;
                  return (
                    <button
                      type="button"
                      key={c.key}
                      className={'rd-cw-class-card' + (on ? ' on' : '')}
                      aria-pressed={on}
                      onClick={() => setClasse(c.key)}
                    >
                      <span className="rd-cw-class-icon">
                        <ClassIcon classKey={c.key} />
                      </span>
                      <span className="rd-cw-class-body">
                        <span className="rd-cw-class-name">{c.name}</span>
                        <span className="rd-cw-class-desc">{CLASS_NOTE[c.key]}</span>
                        <span className="rd-cw-class-tags">
                          <span className="rd-cw-class-tag">PV {c.pvBase}+VIG</span>
                          <span className="rd-cw-class-tag">PE {c.peBase}+PRE</span>
                          <span className="rd-cw-class-tag">Sanidade {c.sanBase}</span>
                          <span className="rd-cw-class-tag">{c.skillsTrained}+Int perícias</span>
                        </span>
                      </span>
                      {on && (
                        <span className="rd-cw-class-check">
                          <CheckIcon size={16} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {classe === 'ocultista' && (
                <div className="rd-cw-element-panel">
                  <span className="rd-cw-element-label">Afinidade elemental</span>
                  <div className="rd-cw-element-grid">
                    {ELEMENTS.map((el) => {
                      const on = element === el.key;
                      return (
                        <button
                          type="button"
                          key={el.key}
                          className={'rd-cw-element-chip' + (on ? ' on' : '')}
                          aria-pressed={on}
                          onClick={() => setElement(el.key)}
                          style={
                            on
                              ? {
                                  borderColor: el.color,
                                  background: `${el.color}22`,
                                  boxShadow: `0 0 10px ${el.color}55`,
                                }
                              : undefined
                          }
                        >
                          <span
                            className="rd-cw-element-dot"
                            style={{ background: el.color, boxShadow: `0 0 8px ${el.color}` }}
                          />
                          {el.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              {needsTrilha ? (
                <div className="rd-cw-trail-list">
                  {trilhaOptions.map((t) => {
                    const on = trilha === t.name;
                    return (
                      <button
                        type="button"
                        key={t.name}
                        className={'rd-cw-trail-card' + (on ? ' on' : '')}
                        aria-pressed={on}
                        onClick={() => setTrilha(t.name)}
                      >
                        <span className="rd-cw-trail-head">
                          <span className="rd-cw-trail-name">{t.name}</span>
                          {on && <span className="rd-cw-trail-badge">Escolhida</span>}
                        </span>
                        <span className="rd-cw-trail-desc">{t.flavor}</span>
                        <span className="rd-cw-trail-powers">
                          {t.powers.map((p) => (
                            <span key={p.nex} className={'rd-cw-trail-power' + (p.nex > nex ? ' locked' : '')}>
                              <span className="rd-cw-trail-power-badge">NEX {p.nex}%</span>
                              <span>
                                <b>{p.name}</b> — {p.summary}
                              </span>
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rd-cw-card">
                  <p className="rd-cw-review-foot" style={{ padding: 0 }}>
                    Trilha só é escolhida a partir de NEX 10%. Este agente começa em NEX {nex}% —
                    volte à etapa Conceito e aumente o NEX se quiser escolher a trilha já na criação,
                    ou deixe para quando o personagem evoluir.
                  </p>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <div className="rd-cw-card">
              <div className="rd-cw-skill-head">
                <span className={'rd-cw-skill-count' + (trained.length > skillBudget ? ' over' : '')}>
                  {trained.length} / {skillBudget} selecionadas
                </span>
                <div className="rd-cw-skill-bar-track">
                  <span
                    className={'rd-cw-skill-bar-fill' + (trained.length >= skillBudget ? ' over' : '')}
                    style={{ width: `${Math.min(100, (trained.length / Math.max(1, skillBudget)) * 100)}%` }}
                  />
                </div>
                <span className="rd-cw-skill-legend">
                  <LockIcon /> vem da origem
                </span>
              </div>
              <div className="rd-cw-skill-grid">
                {SKILLS.map((s) => {
                  const on = trained.includes(s.key);
                  const fromOrigin = originSkills.includes(s.key);
                  return (
                    <button
                      type="button"
                      key={s.key}
                      className={'rd-cw-skill-chip' + (fromOrigin ? ' locked' : on ? ' on' : '')}
                      aria-pressed={on}
                      disabled={fromOrigin}
                      onClick={() => toggleSkill(s.key)}
                    >
                      {fromOrigin && <LockIcon />}
                      <span className="rd-cw-skill-chip-name">{s.name}</span>
                      <span className="rd-cw-skill-chip-attr">{s.attr}</span>
                    </button>
                  );
                })}
              </div>
              <span className="rd-cw-skill-foot">
                Todas entram como Treinado (+5); ajuste para Veterano/Expert na ficha.
              </span>
            </div>
          )}

          {step === 5 && (
            <div className="rd-cw-card">
              <InventoryEditor inventory={inventory} onChange={setInventory} />
            </div>
          )}

          {step === 6 && (
            <div className="rd-cw-review-card">
              <div className="rd-cw-review-head">
                <div
                  className="rd-cw-review-initial"
                  style={image ? { backgroundImage: `url(${image})` } : undefined}
                >
                  {!image && initial}
                </div>
                <div>
                  <div className="rd-cw-review-name">{nome || 'Novo Agente'}</div>
                  <div className="rd-cw-review-sub">
                    {origem || 'sem origem'} · {CLASS_BY_KEY[classe].name} · NEX {nex}%
                  </div>
                </div>
              </div>

              <div className="rd-cw-review-row">
                <span className="rd-cw-review-label">Atributos</span>
                <span className="rd-cw-review-value">
                  {ATTRIBUTES.map((a) => `${a.short} ${attrs[a.key]}`).join(' · ')}
                </span>
                <button type="button" className="rd-cw-review-edit" onClick={() => go(1)}>
                  Editar
                </button>
              </div>

              <div className="rd-cw-review-row">
                <span className="rd-cw-review-label">Classe</span>
                <span className="rd-cw-review-value">
                  {CLASS_BY_KEY[classe].name}
                  {classe === 'ocultista' && element
                    ? ` · afinidade ${ELEMENTS.find((e) => e.key === element)?.name}`
                    : ''}{' '}
                  · PV {derived.pvMax} · PE {derived.peMax} · SAN {derived.sanMax}
                </span>
                <button type="button" className="rd-cw-review-edit" onClick={() => go(2)}>
                  Editar
                </button>
              </div>

              {originDef && (
                <div className="rd-cw-review-row">
                  <span className="rd-cw-review-label">Poder de origem</span>
                  <span className="rd-cw-review-value">{originDef.power}</span>
                  <button type="button" className="rd-cw-review-edit" onClick={() => go(0)}>
                    Editar
                  </button>
                </div>
              )}

              <div className="rd-cw-review-row">
                <span className="rd-cw-review-label">Trilha</span>
                <span className="rd-cw-review-value">
                  {trilha
                    ? `${trilha} (${unlockedPowers.length} poder${unlockedPowers.length === 1 ? '' : 'es'} já desbloqueado${unlockedPowers.length === 1 ? '' : 's'})`
                    : '—'}
                </span>
                <button type="button" className="rd-cw-review-edit" onClick={() => go(3)}>
                  Editar
                </button>
              </div>

              <div className="rd-cw-review-row">
                <span className="rd-cw-review-label">Perícias ({trained.length})</span>
                <span className="rd-cw-review-value">
                  {trained.map((k) => SKILL_BY_KEY[k]?.name).join(', ') || '—'}
                </span>
                <button type="button" className="rd-cw-review-edit" onClick={() => go(4)}>
                  Editar
                </button>
              </div>

              <div className="rd-cw-review-row">
                <span className="rd-cw-review-label">Inventário ({inventory.length})</span>
                <span className="rd-cw-review-value">
                  {inventory.map((it) => it.name).filter(Boolean).join(', ') || '—'}
                </span>
                <button type="button" className="rd-cw-review-edit" onClick={() => go(5)}>
                  Editar
                </button>
              </div>

              <span className="rd-cw-review-foot">Tudo pode ser ajustado depois na ficha.</span>
            </div>
          )}
        </div>

        <aside className="rd-cw-aside" aria-label="Prévia do agente">
          <div
            className="rd-cw-aside-portrait"
            style={image ? { backgroundImage: `url(${image})` } : undefined}
          >
            {!image && (
              <>
                <span className="rd-cw-aside-sheen" aria-hidden="true" />
                {initial}
              </>
            )}
          </div>
          <div>
            <div className="rd-cw-aside-name">{nome || 'Novo Agente'}</div>
            <div className="rd-cw-aside-tagline">
              {origem || 'sem origem'} · {CLASS_BY_KEY[classe].name}
            </div>
          </div>
          <NexRing pct={nex} onChange={setNex} />
          <p className="rd-cw-aside-hint">arraste a roda pra ajustar</p>
          <div className="rd-cw-mini-attrs">
            {ATTRIBUTES.map((a) => (
              <div className="rd-cw-mini-attr" key={a.key}>
                <span>{a.short}</span>
                <b>{attrs[a.key]}</b>
              </div>
            ))}
          </div>
          <div className="rd-cw-bars">
            <MiniBar name="Vida" val={derived.pvMax} color="var(--rd-sangue-bright)" />
            <MiniBar name="Esforço" val={derived.peMax} color="#ffa040" />
            <MiniBar name="Sanidade" val={derived.sanMax} color="#a974ff" />
          </div>
          <div className="rd-cw-extra">
            <div className="rd-cw-extra-cell">
              <span className="rd-cw-extra-val">{10 + attrs.AGI}</span>
              <span className="rd-cw-extra-label">DEFESA</span>
            </div>
            <div className="rd-cw-extra-cell">
              <span className="rd-cw-extra-val">9 m</span>
              <span className="rd-cw-extra-label">DESLOC.</span>
            </div>
            <div className="rd-cw-extra-cell">
              <span className={'rd-cw-extra-val' + (trained.length > skillBudget ? ' over' : '')}>
                {trained.length}/{skillBudget}
              </span>
              <span className="rd-cw-extra-label">PERÍCIAS</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="rd-cw-foot">
        <button className="rd-cw-foot-back" disabled={step === 0} onClick={() => go(step - 1)}>
          <BackChevronIcon /> Voltar
        </button>
        <span className="rd-cw-foot-hint">{!stepValid ? stepHint : ''}</span>
        {step < STEPS.length - 1 ? (
          <button className="rd-cw-foot-next" disabled={!stepValid} onClick={() => go(step + 1)}>
            Continuar <ArrowRightIcon />
          </button>
        ) : (
          <button className="rd-cw-foot-next" onClick={() => onDone(build())}>
            <CheckIcon size={16} /> Criar agente
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Converte a posição do ponteiro em porcentagem de NEX — 0% no topo (12h),
// sentido horário (mesmo referencial do anel, que já nasce com
// `rotate(-90)` pra começar no topo). Arredonda pro múltiplo de 5 mais
// próximo e prende entre 5 e 99 (mesmos limites do campo numérico ao lado).
function angleToNex(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angleFromTop = (Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90 + 360) % 360;
  const raw = (angleFromTop / 360) * 100;
  const snapped = Math.round(raw / 5) * 5;
  if (snapped >= 100) return 99;
  return Math.max(5, snapped);
}

function NexRing({ pct, onChange }: { pct: number; onChange?: (n: number) => void }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const target = c * (1 - pct / 100);
  // começa "vazio" e preenche até o valor ao montar / quando pct muda
  const [off, setOff] = useState(c);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOff(target), 40);
    return () => window.clearTimeout(t);
  }, [target, c]);

  useEffect(() => {
    if (!onChange) return;
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !svgRef.current) return;
      onChange(angleToNex(e.clientX, e.clientY, svgRef.current.getBoundingClientRect()));
    };
    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  return (
    <svg
      ref={svgRef}
      className={'nex-ring' + (onChange ? ' interactive' : '') + (dragging ? ' dragging' : '')}
      width="110"
      height="110"
      viewBox="0 0 110 110"
      onPointerDown={(e) => {
        if (!onChange) return;
        draggingRef.current = true;
        setDragging(true);
        onChange(angleToNex(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()));
      }}
    >
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--rd-sangue-line)" strokeWidth="8" />
      <circle
        className="fg"
        cx="55"
        cy="55"
        r={r}
        fill="none"
        stroke="var(--rd-sangue)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="51" textAnchor="middle" fill="#fff" fontFamily="var(--rd-font-disp)" fontSize="22" fontWeight={700}>
        {pct}%
      </text>
      <text x="55" y="68" textAnchor="middle" fill="#8e8088" fontSize="9" letterSpacing="1.5">
        NEX
      </text>
    </svg>
  );
}

function MiniBar({ name, val, color }: { name: string; val: number; color: string }) {
  return (
    <div>
      <div className="rd-cw-bar-head">
        <span>{name}</span>
        <span>{val}</span>
      </div>
      <div className="rd-cw-bar-track">
        <span className="rd-cw-bar-fill" style={{ width: '100%', background: color }} />
      </div>
    </div>
  );
}
