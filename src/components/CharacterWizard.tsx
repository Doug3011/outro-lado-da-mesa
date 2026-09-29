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
import { createCharacter, suggestedStats, type Character } from '../domain/character';
import { fileToDownscaledDataURL } from '../lib/image';
import { TRILHAS_BY_CLASS, unlockedTrilhaPowers } from '../data/trilhas';

const STEPS = ['Conceito', 'Atributos', 'Classe', 'Trilha', 'Perícias', 'Revisão'];

const CLASS_ICON: Record<ClassKey, string> = {
  combatente: '⚔️',
  especialista: '🧠',
  ocultista: '🔮',
};
const CLASS_NOTE: Record<ClassKey, string> = {
  combatente: 'Foco em combate; armas simples e táticas, proteções leves e pesadas.',
  especialista: 'O mais versátil — muitas perícias treinadas.',
  ocultista: 'Conjura rituais; afinidade a um elemento e 3 rituais de 1º círculo.',
};

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

  // Portal pro <body>: sem isso, `.hud` (position:fixed, z-index:200) fica
  // preso no contexto de empilhamento do próprio Home — perde na hora de
  // sobrepor outros elementos fixos que já vivem direto no <body> (a
  // engrenagem de configurações, os diálogos de prompt), mesmo tendo um
  // z-index maior. Foi isso que causava o botão "Continuar" (canto inferior
  // do wizard) roubando clique pra engrenagem, que fica no mesmo canto.
  return createPortal(
    <div className="hud">
      <div className="hud-top">
        <span className="brand">◈ Criar Agente</span>
        <div className="hud-rail">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={'hud-step ' + (i === step ? 'on' : i < step ? 'done' : '')}
              onClick={() => i < step && go(i)}
            >
              {i + 1} · {s}
            </span>
          ))}
        </div>
        <button className="small ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <div className="hud-cols">
        <div className={'hud-main ' + (dir === 1 ? 'slide-fwd' : 'slide-back')} key={step}>
          {step === 0 && (
            <>
              <h2>Conceito</h2>
              <p className="sub">Quem é esse agente — nome, retrato e de onde veio.</p>

              <div className="field">
                <label>Retrato</label>
                <div className="portrait-row">
                  <div
                    className="portrait"
                    style={image ? { backgroundImage: `url(${image})` } : undefined}
                  >
                    {!image && '?'}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="file-btn" style={{ textAlign: 'center', cursor: 'pointer' }}>
                      🖼 Do computador
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
                      placeholder="…ou cole uma URL"
                      onChange={(e) => setImage(e.target.value)}
                    />
                    {image && (
                      <button className="small ghost" onClick={() => setImage('')}>
                        remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="field" style={{ flex: 2 }}>
                  <label>Nome do agente *</label>
                  <input value={nome} autoFocus onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="field">
                  <label>NEX %</label>
                  <input
                    type="number"
                    min={5}
                    max={99}
                    step={5}
                    value={nex}
                    onChange={(e) => setNex(Math.max(5, Math.min(99, Number(e.target.value))))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Jogador</label>
                  <input value={jogador} onChange={(e) => setJogador(e.target.value)} />
                </div>
                <div className="field">
                  <label>Origem</label>
                  <input
                    list="wiz-origins"
                    value={origem}
                    placeholder="ex.: Militar"
                    onChange={(e) => setOrigem(e.target.value)}
                  />
                  <datalist id="wiz-origins">
                    {ORIGINS.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
              </div>
              <p className="faint" style={{ fontSize: 12 }}>
                {originDef
                  ? (originDef.skills === 'choice'
                      ? 'Amnésico: 2 perícias à escolha do mestre (marque no passo 4). '
                      : `Perícias: ${originSkills
                          .map((k) => SKILL_BY_KEY[k]?.name)
                          .join(' e ')} (marcadas). `) + `Poder: ${originDef.power}.`
                  : 'Escolha uma origem da lista para preencher as 2 perícias e o poder automaticamente.'}
              </p>
              {nex > 5 && (
                <p className="faint" style={{ fontSize: 12, color: 'var(--gold)' }}>
                  NEX acima de 5%: os Poderes de Classe (15/30/45/60/75/90%), Aumentos de
                  Atributo (20/50/80/95%) e evoluções de perícia (35/70%) já disponíveis vão
                  aparecer como pendentes na aba <b>Progressão</b> da ficha assim que você criar
                  o agente — é só escolher lá.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h2>Atributos</h2>
              <p className="sub">
                Todos começam em 1. Distribua até a soma dos cinco chegar a <b>9</b>. Máx 3; um pode
                ficar em 0 (dá +1 ponto).
              </p>
              <p style={{ marginBottom: 14 }}>
                <span
                  className="points-pill"
                  style={{
                    color:
                      attrPointsLeft === 0
                        ? 'var(--green)'
                        : attrPointsLeft < 0
                          ? 'var(--blood-bright)'
                          : 'var(--gold)',
                  }}
                >
                  {attrPointsLeft > 0 ? `+${attrPointsLeft}` : attrPointsLeft}
                </span>
                <span className="faint" style={{ marginLeft: 10, fontSize: 12 }}>
                  {attrPointsLeft === 0
                    ? 'distribuição completa'
                    : attrPointsLeft < 0
                      ? 'pontos além do limite'
                      : 'pontos restantes'}
                </span>
              </p>
              <div className="hud-attrs">
                {ATTRIBUTES.map((a) => (
                  <div className="hud-attr" key={a.key}>
                    <span className="ha-name">{a.name}</span>
                    <div className="hex">
                      <div className="hex-in">
                        <span className="ha-val">{attrs[a.key]}</span>
                      </div>
                    </div>
                    <div className="ha-key">{a.short}</div>
                    <div className="ha-ctl">
                      <button onClick={() => dec(a.key)}>−</button>
                      <button onClick={() => inc(a.key)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Classe</h2>
              <p className="sub">O papel do agente na equipe.</p>
              <div className="hud-class">
                {CLASSES.map((c) => (
                  <div
                    key={c.key}
                    className={'hud-class-card ' + (classe === c.key ? 'on' : '')}
                    onClick={() => setClasse(c.key)}
                  >
                    <div className="cc-ico">{CLASS_ICON[c.key]}</div>
                    <div>
                      <strong>{c.name}</strong>
                      <div className="faint" style={{ fontSize: 12, margin: '3px 0' }}>
                        {CLASS_NOTE[c.key]}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        PV {c.pvBase}+VIG · PE {c.peBase}+PRE · Sanidade {c.sanBase} ·{' '}
                        {c.skillsTrained}+Int perícias
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {classe === 'ocultista' && (
                <div className="field" style={{ maxWidth: 240, marginTop: 12 }}>
                  <label>Afinidade elemental</label>
                  <select value={element} onChange={(e) => setElement(e.target.value as Element)}>
                    {ELEMENTS.map((el) => (
                      <option key={el.key} value={el.key}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2>Trilha</h2>
              {needsTrilha ? (
                <>
                  <p className="sub">
                    Escolhida em NEX 10%; ganha um novo poder da trilha em NEX 40%, 65% e 99%.
                  </p>
                  <div className="hud-class">
                    {trilhaOptions.map((t) => (
                      <div
                        key={t.name}
                        className={'hud-class-card ' + (trilha === t.name ? 'on' : '')}
                        onClick={() => setTrilha(t.name)}
                      >
                        <div style={{ width: '100%' }}>
                          <strong>{t.name}</strong>
                          <div className="faint" style={{ fontSize: 12, margin: '3px 0' }}>
                            {t.flavor}
                          </div>
                          {t.powers.map((p) => (
                            <div
                              key={p.nex}
                              style={{
                                fontSize: 12,
                                marginTop: 4,
                                opacity: p.nex <= nex ? 1 : 0.45,
                              }}
                            >
                              <b>NEX {p.nex}% · {p.name}</b> — {p.summary}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="sub">
                  Trilha só é escolhida a partir de NEX 10%. Este agente começa em NEX {nex}% —
                  volte ao passo 1 e aumente o NEX se quiser escolher a trilha já na criação, ou
                  deixe para quando o personagem evoluir.
                </p>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h2>Perícias treinadas</h2>
              <p className="sub">
                Escolha até <b>{skillBudget}</b> — {classBase} da classe + {attrs.INT} de Intelecto +
                2 da origem. 🔒 vem da origem.
              </p>
              <p
                style={{
                  marginBottom: 12,
                  fontWeight: 600,
                  color: trained.length > skillBudget ? 'var(--blood-bright)' : 'var(--text)',
                }}
              >
                {trained.length} / {skillBudget} selecionadas
              </p>
              <div className="wiz-skills">
                {SKILLS.map((s) => {
                  const on = trained.includes(s.key);
                  const fromOrigin = originSkills.includes(s.key);
                  return (
                    <span
                      key={s.key}
                      className={'chip ' + (on ? 'on' : '')}
                      style={fromOrigin ? { opacity: 0.85, cursor: 'default' } : undefined}
                      onClick={() => toggleSkill(s.key)}
                    >
                      {fromOrigin && '🔒 '}
                      {s.name} <small>{s.attr}</small>
                    </span>
                  );
                })}
              </div>
              <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                Todas entram como Treinado (+5); ajuste para Veterano/Expert na ficha.
              </p>
            </>
          )}

          {step === 5 && (
            <>
              <h2>Revisão</h2>
              <p className="sub">Confira e crie o agente. Tudo pode ser ajustado na ficha depois.</p>
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <b>{nome || 'Novo Agente'}</b> — {origem || 'sem origem'} ·{' '}
                {CLASSES.find((c) => c.key === classe)?.name} · NEX {nex}%
                {originDef && (
                  <>
                    <br />
                    Poder de origem: <b>{originDef.power}</b>
                  </>
                )}
                {classe === 'ocultista' && (
                  <>
                    <br />
                    Afinidade: <b>{ELEMENTS.find((e) => e.key === element)?.name}</b> · 3 rituais de
                    1º círculo
                  </>
                )}
                {trilha && (
                  <>
                    <br />
                    Trilha: <b>{trilha}</b> ({unlockedPowers.length} poder
                    {unlockedPowers.length === 1 ? '' : 'es'} já desbloqueado
                    {unlockedPowers.length === 1 ? '' : 's'})
                  </>
                )}
                <br />
                Treinadas ({trained.length}):{' '}
                {trained.map((k) => SKILL_BY_KEY[k]?.name).join(', ') || '—'}
              </div>
            </>
          )}
        </div>

        <div className="hud-side">
          <div
            className="hud-portrait"
            style={image ? { backgroundImage: `url(${image})` } : undefined}
          >
            {!image && '?'}
          </div>
          <div className="hud-name">{nome || 'Novo Agente'}</div>
          <div className="hud-tagline">
            {origem || 'sem origem'} · {CLASS_BY_KEY[classe].name}
          </div>
          <NexRing pct={nex} onChange={setNex} />
          <p className="faint" style={{ fontSize: 10, textAlign: 'center', marginTop: -4 }}>
            arraste a roda pra ajustar
          </p>
          <div className="mini-attrs">
            {ATTRIBUTES.map((a) => (
              <div className="mini-attr" key={a.key}>
                <span>{a.short}</span>
                <b>{attrs[a.key]}</b>
              </div>
            ))}
          </div>
          <MiniBar name="Vida" val={derived.pvMax} color="var(--blood)" />
          <MiniBar name="Esforço" val={derived.peMax} color="var(--gold)" />
          <MiniBar name="Sanidade" val={derived.sanMax} color="var(--blue)" />
          <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
            Defesa {10 + attrs.AGI} · Deslocamento 9 m
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 3,
              color: trained.length > skillBudget ? 'var(--blood-bright)' : 'var(--text-faint)',
            }}
          >
            Perícias treinadas: {trained.length} / {skillBudget}
          </div>
        </div>
      </div>

      <div className="hud-foot">
        <button className="ghost" disabled={step === 0} onClick={() => go(step - 1)}>
          ◂ Voltar
        </button>
        {step < STEPS.length - 1 ? (
          <button className="primary" disabled={!stepValid} onClick={() => go(step + 1)}>
            Continuar ▸
          </button>
        ) : (
          <button className="primary" onClick={() => onDone(build())}>
            ✓ Criar agente
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
  const r = 34;
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
      width="88"
      height="88"
      viewBox="0 0 88 88"
      onPointerDown={(e) => {
        if (!onChange) return;
        draggingRef.current = true;
        setDragging(true);
        onChange(angleToNex(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect()));
      }}
    >
      <circle cx="44" cy="44" r={r} fill="none" stroke="#2c2d34" strokeWidth="7" />
      <circle
        className="fg"
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#e01e2b"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="41" textAnchor="middle" fill="#fff" fontFamily="Oswald, sans-serif" fontSize="18">
        {pct}%
      </text>
      <text x="44" y="55" textAnchor="middle" fill="#9a9ba3" fontSize="8" letterSpacing="1.5">
        NEX
      </text>
    </svg>
  );
}

function MiniBar({ name, val, color }: { name: string; val: number; color: string }) {
  return (
    <div className="mini-bar">
      <div className="mb-head">
        <span>{name}</span>
        <span>{val}</span>
      </div>
      <div className="mb-track">
        <span style={{ width: '100%', background: color }} />
      </div>
    </div>
  );
}
