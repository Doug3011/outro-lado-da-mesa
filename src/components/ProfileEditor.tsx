import { useRef, useState, type CSSProperties } from 'react';
import { PROFILE_FIELDS, hasFilledProfile, type PlayerProfile } from '../domain/profile';
import { loadProfile, saveProfile } from '../lib/profile';
import { loadMyCharacters } from '../lib/characterLibrary';
import { useIdentity } from '../hooks/useIdentity';
import { fileToDownscaledDataURL } from '../lib/image';
import { ElementQuizPage } from './ElementQuizPage';
import { ELEMENTS, ELEMENT_COLOR, type Element } from '../data/ordem';

// Leve alternância de ângulo nas polaroids das fichas, pra parecer coladas
// meio torto num mural — não é aleatório de verdade (senão giraria a cada
// render), é só um padrão fixo pelo índice.
const TILTS = [-4, 3, -2, 5, -3, 2];

export function ProfileEditor({ onBack }: { onBack: () => void }) {
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

  return (
    <div className="profile-page">
      <img className="profile-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <Sigil />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="profile-board">
        <button className="link-back" onClick={onBack}>
          ← voltar
        </button>
        <p className="home-sub" style={{ marginBottom: 18 }}>
          Perguntas pro mestre te conhecer melhor antes da mesa — nada disso é sobre o
          personagem, é sobre você. Fica salvo neste computador e só o mestre das mesas
          que você entrar consegue ver.
        </p>

        <div className="profile-layout">
        <div className="profile-main">
          <div className="profile-top">
            <div
              className="profile-polaroid profile-photo"
              style={photoStyle}
              onClick={() => photoInputRef.current?.click()}
              title="Clique pra trocar a foto"
            >
              <span className="profile-polaroid-tape" />
              <div
                className="profile-polaroid-pic"
                style={profile.photo ? { backgroundImage: `url(${profile.photo})` } : undefined}
              >
                {!profile.photo && <span className="faint">Foto do player</span>}
              </div>
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
              <input
                className="profile-name-input"
                value={me.name}
                placeholder="Nome do player"
                onChange={(e) => update({ name: e.target.value })}
              />
              <div className="profile-meta-row">
                <div className="profile-meta-field">
                  <label>Idade</label>
                  <input
                    value={profile.age}
                    placeholder="—"
                    onChange={(e) => patch('age', e.target.value)}
                  />
                </div>
                <div className="profile-meta-field">
                  <label>Aniversário</label>
                  <input
                    value={profile.birthday}
                    placeholder="dd/mm"
                    onChange={(e) => patch('birthday', e.target.value)}
                  />
                </div>
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
                    ✦ Descobrir qual elemento combina com você
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="profile-qa-list">
            {PROFILE_FIELDS.map((f) => (
              <div className="profile-qa" key={f.key}>
                <label>{f.label}</label>
                <textarea
                  rows={2}
                  placeholder={f.placeholder}
                  value={profile[f.key]}
                  onChange={(e) => patch(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button className="profile-save-ribbon" onClick={save}>
            <span className="profile-save-arrow">«</span>
            📖 {saved ? 'Salvo!' : 'Salvar perfil'}
            <span className="profile-save-arrow">»</span>
          </button>
          {!hasFilledProfile(profile) && (
            <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              Tudo opcional — pode deixar em branco o que não quiser responder.
            </p>
          )}
        </div>

        <div className="profile-chars-rail">
          <div className="profile-chars-title">Fichas criadas</div>
          {myChars.length === 0 && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhuma ficha ainda — crie uma em "Minhas Fichas".
            </p>
          )}
          {myChars.map((c, i) => (
            <div
              className="profile-polaroid profile-char-polaroid"
              key={c.id}
              style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
            >
              <span className="profile-polaroid-tape" />
              <div
                className="profile-polaroid-pic small"
                style={c.image ? { backgroundImage: `url(${c.image})` } : undefined}
              >
                {!c.image && <span className="faint">{c.name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="profile-polaroid-caption">{c.name}</div>
            </div>
          ))}
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
        stroke="var(--gold)"
        strokeWidth="2"
      />
      <circle cx="16" cy="16" r="3.4" fill="var(--gold)" />
      <path d="M16 6v20M6 16h20" stroke="var(--gold)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
