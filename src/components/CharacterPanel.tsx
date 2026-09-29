import { useMemo, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { loadMyCharacters } from '../lib/characterLibrary';
import { setLinkedCharacterId } from '../lib/roomLinks';
import type { Character } from '../domain/character';
import { CharacterCard } from './CharacterCard';
import { CharacterSheet } from './CharacterSheet';

// A ficha não é mais criada aqui — isso agora acontece só na biblioteca do
// jogador (menu principal → Minhas Fichas), antes de entrar na mesa. Esta aba
// só mostra (e deixa trocar) a ficha já vinculada a esta mesa. Visão do
// mestre é outro componente (`GmCharacterTabs`, abas estilo navegador).
export function CharacterPanel() {
  const { me } = useIdentity();
  const characters = useTableStore((s) => s.characters);
  const code = useTableStore((s) => s.code);
  const setActive = useTableStore((s) => s.setActiveCharacter);
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);

  const list = useMemo(
    () => Object.values(characters).sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  );

  const [swapping, setSwapping] = useState(false);

  // jogador: mostra só a própria ficha vinculada a esta mesa
  const mine = list.find((c) => c.ownerId === me.id) ?? null;

  const linkAndUse = (c: Character) => {
    if (code) setLinkedCharacterId(code, c.id);
    upsertCharacter(c);
    setActive(c.id);
    setSwapping(false);
  };

  if (!mine || swapping) {
    const myChars = loadMyCharacters();
    return (
      <div>
        {!mine && (
          <p className="empty">
            Você ainda não vinculou uma ficha a esta mesa.
          </p>
        )}
        {myChars.length === 0 ? (
          <p className="faint" style={{ fontSize: 12 }}>
            Você não tem nenhuma ficha criada. Saia da mesa e crie uma pelo menu
            principal → Minhas Fichas.
          </p>
        ) : (
          <>
            <div className="section-title">Escolha uma ficha</div>
            <div className="char-card-list">
              {myChars.map((c) => (
                <CharacterCard key={c.id} character={c} onClick={() => linkAndUse(c)} cta="Usar nesta mesa" />
              ))}
            </div>
          </>
        )}
        {mine && swapping && (
          <button className="small ghost" style={{ marginTop: 10 }} onClick={() => setSwapping(false)}>
            cancelar
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="small ghost" onClick={() => setSwapping(true)}>
          trocar ficha
        </button>
      </div>
      <CharacterSheet key={mine.id} character={mine} />
    </div>
  );
}
