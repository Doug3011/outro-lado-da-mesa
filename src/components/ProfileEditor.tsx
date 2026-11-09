import { useRef, useState, type CSSProperties } from 'react';
import { PROFILE_FIELDS, hasFilledProfile, type PlayerProfile } from '../domain/profile';
import { loadProfile, saveProfile } from '../lib/profile';
import { loadMyCharacters } from '../lib/characterLibrary';
import { useIdentity } from '../hooks/useIdentity';
import { fileToDownscaledDataURL } from '../lib/image';
import { ElementQuizPage } from './ElementQuizPage';
import { ELEMENTS, ELEMENT_COLOR, type Element } from '../data/ordem';
import { BackChevronIcon, CameraFloatIcon, PlusIcon } from './icons';

// Leve alternância de ângulo nas polaroids das fichas, pra parecer coladas
// meio torto num mural — não é aleatório de verdade (senão giraria a cada
// render), é só um padrão fixo pelo índice.
const TILTS = [-4, 3, -2, 5, -3, 2];

// ---------- redesign (Passo 7): anéis de glifos + poeira dourada ----------
// Porta o gerador procedural de glifos da referência (Perfil-Mesa.dc.html,
// `Component.glyphRing`) — cada "traço" ao redor do anel é só um pseudo-
// aleatório determinístico (seed fixa), nada vem de `Math.random()`, senão
// o fundo re-sortearia a cada render. Os dois anéis (externo/interno) usam
// seeds diferentes, igual na referência.
function glyphRing(r: number, count: number, size: number, seed: number): string {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const cx = 200 + Math.cos(a) * r;
    const cy = 200 + Math.sin(a) * r;
    const rot = a + Math.PI / 2;
    const P = (x: number, y: number) => {
      const X = cx + (x * Math.cos(rot) - y * Math.sin(rot)) * size;
      const Y = cy + (x * Math.sin(rot) + y * Math.cos(rot)) * size;
      return `${X.toFixed(1)} ${Y.toFixed(1)}`;
    };
    d += `M${P(0, -1)}L${P(0, 1)}`;
    const k = Math.floor(rnd() * 4);
    if (k === 0) d += `M${P(-0.6, -0.4)}L${P(0, 0.1)}L${P(0.6, -0.4)}`;
    if (k === 1) d += `M${P(0, -0.2)}L${P(0.7, 0.3)}`;
    if (k === 2) d += `M${P(-0.6, 0.5)}Q${P(0, -0.3)} ${P(0.6, 0.5)}`;
    if (k === 3) d += `M${P(-0.5, -0.8)}L${P(0.5, -0.8)}M${P(-0.4, 0.6)}L${P(0.4, 0.9)}`;
  }
  return d;
}
const RING_GLYPHS_OUTER = glyphRing(170, 36, 9, 7);
const RING_GLYPHS_INNER = glyphRing(100, 18, 7, 19);

// Poeira dourada subindo — mesma fórmula de posição/tamanho/duração da
// referência (`renderVals().dust`), só a animação troca: reaproveita o
// keyframe `rd-ember-rise` (Passo 1, já usado pelas brasas de Minhas Fichas)
// em vez de criar um "rd-dust-rise" quase idêntico só mudando a distância.
const PROFILE_DUST: CSSProperties[] = Array.from({ length: 22 }, (_, i) => {
  const left = (i * 41 + 7) % 100;
  const size = 2 + (i % 3);
  const dur = 9 + (i % 5) * 2.5;
  const delay = -((i * 1.7) % dur);
  return {
    left: `${left}%`,
    bottom: `${(i * 13) % 30}%`,
    width: size,
    height: size,
    animationDuration: `${dur}s`,
    animationDelay: `${delay.toFixed(1)}s`,
  };
});

export function ProfileEditor({
  onBack,
  onNewCharacter,
}: {
  onBack: () => void;
  onNewCharacter: () => void;
}) {
  const { me, update } = useIdentity();
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [saved, setSaved] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const myChars = loadMyCharacters();

  const patch = (key: keyof PlayerProfile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDownscaledDataURL(file, 480);
    if (url) patch('photo', url);
  };

  const finishQuiz = (el: Element) => {
    const next = { ...profile, elementResult: el };
    setProfile(next);
    saveProfile(next);
    setShowQuiz(false);
  };

  if (showQuiz) {
    return <ElementQuizPage onFinish={finishQuiz} onBack={() => setShowQuiz(false)} />;
  }

  const elementDef = profile.elementResult ? ELEMENTS.find((e) => e.key === profile.elementResult) : undefined;
  const photoStyle: CSSProperties | undefined = elementDef
    ? ({ '--el-accent': ELEMENT_COLOR[elementDef.key] } as CSSProperties)
    : undefined;

  const answeredCount = PROFILE_FIELDS.filter((f) => (profile[f.key] as string).trim().length > 0).length;
  const progressPct = Math.round((answeredCount / PROFILE_FIELDS.length) * 100);

  return (
    <div className="profile-page">
      <div className="profile-bg" aria-hidden="true">
        <div className="profile-glow profile-glow-a" />
        <div className="profile-glow profile-glow-b" />
        <svg className="profile-ring profile-ring-outer" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="190" fill="none" stroke="#8c6e22" strokeWidth="1" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="#8c6e22" strokeWidth="0.8" />
          <path d={RING_GLYPHS_OUTER} fill="none" stroke="#c9a040" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="profile-ring profile-ring-inner" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="120" fill="none" stroke="#8c6e22" strokeWidth="0.8" strokeDasharray="2 6" />
          <path d={RING_GLYPHS_INNER} fill="none" stroke="var(--rd-conhecimento)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div className="profile-dust">
          {PROFILE_DUST.map((style, i) => (
            <span key={i} className="profile-dust-mote" style={style} />
          ))}
        </div>
        <div className="profile-vignette" />
      </div>

      <div className="daily-topbar">
        <Sigil />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="profile-board">
        <div className="profile-board-top">
          <button className="profile-back" onClick={onBack}>
            <BackChevronIcon /> Voltar
          </button>
          <span className="profile-privacy-note">
            <LockIcon />
            Salvo só neste computador · visível apenas para o mestre da sua mesa
          </span>
        </div>

        <div className="profile-layout">
          <div className="profile-main">
            <div className="profile-top">
              <div
                className="profile-polaroid profile-photo"
                style={{ ...photoStyle, '--rd-rot': '-3deg' } as CSSProperties}
                onClick={() => photoInputRef.current?.click()}
                title="Clique pra trocar a foto"
              >
                <span className="profile-polaroid-tape" />
                <div
                  className="profile-polaroid-pic"
                  style={profile.photo ? { backgroundImage: `url(${profile.photo})` } : undefined}
                >
                  {!profile.photo && (
                    <span className="profile-photo-placeholder">
                      <CameraFloatIcon />
                      Adicionar foto
                    </span>
                  )}
                </div>
                <span className="profile-polaroid-caption profile-polaroid-caption-hand">o jogador</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void onPickPhoto(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="profile-heading">
                <span className="profile-file-label">// ARQUIVO DO JOGADOR</span>
                <input
                  className="profile-name-input"
                  value={me.name}
                  placeholder="Nome do player"
                  onChange={(e) => update({ name: e.target.value })}
                />
                <p className="profile-heading-sub">
                  Perguntas pro mestre te conhecer melhor antes da mesa — nada disso é sobre o
                  personagem, é sobre você.
                </p>

                <div className="profile-meta-row">
                  <label className="profile-meta-field">
                    <span>Idade</span>
                    <input
                      value={profile.age}
                      placeholder="—"
                      onChange={(e) => patch('age', e.target.value)}
                    />
                  </label>
                  <label className="profile-meta-field">
                    <span>Aniversário</span>
                    <input
                      value={profile.birthday}
                      placeholder="dd/mm"
                      onChange={(e) => patch('birthday', e.target.value)}
                    />
                  </label>
                </div>

                <div className="profile-element-row">
                  {elementDef ? (
                    <>
                      <span className="profile-element-badge" style={{ '--el-accent': elementDef.color } as CSSProperties}>
                        {elementDef.name}
                      </span>
                      <button className="link-back" onClick={() => setShowQuiz(true)}>
                        refazer o teste de elemento
                      </button>
                    </>
                  ) : (
                    <button className="profile-element-cta" onClick={() => setShowQuiz(true)}>
                      <SparkleIcon />
                      Descobrir qual elemento combina com você
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-progress-row">
              <span className="profile-progress-label">
                {answeredCount} DE {PROFILE_FIELDS.length} RESPONDIDAS
              </span>
              <div className="profile-progress-track">
                <div className="profile-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="profile-qa-list">
              {PROFILE_FIELDS.map((f, i) => {
                const done = (profile[f.key] as string).trim().length > 0;
                const inputId = `profile-q-${f.key}`;
                return (
                  <div className="profile-qa" key={f.key}>
                    <span className={`profile-qa-num${done ? ' done' : ''}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="profile-qa-body">
                      <label htmlFor={inputId}>{f.label}</label>
                      <textarea
                        id={inputId}
                        rows={2}
                        placeholder={f.placeholder}
                        value={profile[f.key]}
                        onChange={(e) => patch(f.key, e.target.value)}
                      />
                      <span className="profile-qa-line" />
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="profile-save-ribbon" onClick={save}>
              <span className="profile-save-arrow">«</span>
              {saved ? 'Salvo!' : 'Salvar perfil'}
              <span className="profile-save-arrow">»</span>
            </button>
            {!hasFilledProfile(profile) && (
              <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                Tudo opcional — pode deixar em branco o que não quiser responder.
              </p>
            )}
          </div>

          <div className="profile-chars-rail">
            <div className="profile-chars-title">
              FICHAS CRIADAS{myChars.length > 0 ? ` · ${myChars.length}` : ''}
            </div>
            {myChars.length === 0 && (
              <p className="faint" style={{ fontSize: 12, textAlign: 'center' }}>
                Nenhuma ficha ainda — crie a primeira abaixo.
              </p>
            )}
            {myChars.map((c, i) => (
              <div
                className="profile-polaroid profile-char-polaroid"
                key={c.id}
                style={{ '--rd-rot': `${TILTS[i % TILTS.length]}deg`, animationDelay: `${-i * 1.3}s` } as CSSProperties}
              >
                <span className="profile-polaroid-tape" />
                <div
                  className="profile-polaroid-pic small"
                  style={c.image ? { backgroundImage: `url(${c.image})` } : undefined}
                >
                  {!c.image && <span className="faint">{c.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="profile-polaroid-caption profile-polaroid-caption-hand">{c.name}</div>
              </div>
            ))}
            <button className="profile-new-card" onClick={onNewCharacter}>
              <PlusIcon />
              Nova ficha
            </button>
          </div>
        </div>
      </div>

      <div className="daily-sigil-small">
        <Sigil />
        <span className="daily-sigil-line" />
      </div>
    </div>
  );
}

function Sigil() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 3l11 6.5v8.5c0 6.6-4.4 11-11 13-6.6-2-11-6.4-11-13V9.5z"
        fill="none"
        stroke="var(--rd-conhecimento)"
        strokeWidth="2"
      />
      <circle cx="16" cy="16" r="3.4" fill="var(--rd-conhecimento)" />
      <path d="M16 6v20M6 16h20" stroke="var(--rd-conhecimento)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

// Nota de privacidade ("salvo só neste computador") — cadeado em traço, sem
// equivalente nos outros ícones compartilhados (icons.tsx), fica local igual
// ElementIcon em ElementQuizPage.tsx.
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Brilho do botão "Descobrir qual elemento combina com você" — mesmo desenho
// de estrela de 4 pontas da referência.
function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
