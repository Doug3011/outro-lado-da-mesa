import { useState } from 'react';
import type { Character } from '../domain/character';
import { deleteMyCharacter, loadMyCharacters, saveMyCharacter } from '../lib/characterLibrary';
import { uid } from '../lib/ids';
import { CharacterCard } from './CharacterCard';
import { CharacterSheet } from './CharacterSheet';
import { CharacterWizard } from './CharacterWizard';

// Biblioteca de fichas do jogador — vive fora de qualquer mesa. É aqui que se
// cria e edita ficha agora; a mesa só recebe uma cópia vinculada (veja
// roomLinks.ts / Home.tsx).
export function CharacterLibrary({
  ownerId,
  defaultPlayer,
  onBack,
}: {
  ownerId: string;
  defaultPlayer: string;
  onBack: () => void;
}) {
  const [list, setList] = useState<Character[]>(loadMyCharacters);
  const [selId, setSelId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const selected = list.find((c) => c.id === selId) ?? null;
  const wide = wizard || !!selected;

  const refresh = () => setList(loadMyCharacters());

  return (
    <div className="daily-page library-page">
      <img className="daily-sigil-corner" src="/sigils/sigil-red.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <Sigil />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className={'daily-content library-content' + (wide ? ' library-content-wide' : '')}>
        {wizard ? (
          <CharacterWizard
            ownerId={ownerId}
            defaultPlayer={defaultPlayer}
            onCancel={() => setWizard(false)}
            onDone={(c) => {
              saveMyCharacter(c);
              refresh();
              setSelId(c.id);
              setWizard(false);
            }}
          />
        ) : selected ? (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <button className="link-back" style={{ flex: 1 }} onClick={() => setSelId(null)}>
                ← voltar à lista de fichas
              </button>
              <button
                className="ghost"
                onClick={() => {
                  const copy: Character = {
                    ...selected,
                    id: uid(),
                    name: `${selected.name} (cópia)`,
                    updatedAt: Date.now(),
                  };
                  saveMyCharacter(copy);
                  refresh();
                  setSelId(copy.id);
                }}
              >
                Duplicar
              </button>
              <button
                className="ghost"
                style={{ flex: 'none' }}
                onClick={() => {
                  if (confirm(`Excluir a ficha de ${selected.name}?`)) {
                    deleteMyCharacter(selected.id);
                    refresh();
                    setSelId(null);
                  }
                }}
              >
                Excluir
              </button>
            </div>
            <CharacterSheet
              key={selected.id}
              character={selected}
              onSave={(c) => {
                saveMyCharacter(c);
                refresh();
              }}
            />
          </>
        ) : (
          <>
            <button className="daily-back" onClick={onBack}>
              ← Voltar
            </button>

            <h1 className="daily-title">Minhas Fichas</h1>
            <div className="daily-title-rule" />

            <p className="daily-rule-box">
              Crie e edite suas fichas por aqui, fora de qualquer mesa. Ao entrar numa mesa
              como jogador, você escolhe qual dessas fichas leva com você.
            </p>

            <div className="row" style={{ marginBottom: 20 }}>
              <button className="primary" style={{ flex: 'none' }} onClick={() => setWizard(true)}>
                + Criar ficha
              </button>
            </div>

            {list.length === 0 && (
              <p className="empty">
                Você ainda não criou nenhuma ficha. Clique em "+ Criar ficha" pra começar
                — pode fazer isso antes mesmo de entrar numa mesa.
              </p>
            )}

            {list.length > 0 && (
              <div className="char-card-list">
                {list.map((c) => (
                  <CharacterCard key={c.id} character={c} onClick={() => setSelId(c.id)} />
                ))}
              </div>
            )}
          </>
        )}
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
        stroke="#e01e2b"
        strokeWidth="2"
      />
      <circle cx="16" cy="16" r="3.4" fill="#e01e2b" />
      <path d="M16 6v20M6 16h20" stroke="#e01e2b" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
