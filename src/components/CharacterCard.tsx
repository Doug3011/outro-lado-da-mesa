import type { CSSProperties } from 'react';
import type { Character } from '../domain/character';
import { CLASS_BY_KEY, ELEMENT_COLOR } from '../data/ordem';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR');
}

// Cartão de ficha: retrato que o jogador escolheu na criação + nome ao lado,
// igual ao card de seleção de personagem de referência. Ganha um destaque na
// cor do elemento de afinidade escolhido (Sangue/Morte/Energia/Conhecimento/
// Medo) quando a ficha já tem um — antes de NEX 50% ainda não tem, e fica na
// cor neutra padrão.
export function CharacterCard({
  character,
  active,
  onClick,
  cta = 'Acessar Ficha',
}: {
  character: Character;
  active?: boolean;
  onClick: () => void;
  cta?: string;
}) {
  const created = character.createdAt ?? character.updatedAt;
  const elementColor = character.affinityElement ? ELEMENT_COLOR[character.affinityElement] : undefined;
  const style = elementColor ? ({ '--el-accent': elementColor } as CSSProperties) : undefined;
  return (
    <button className={'char-card' + (active ? ' active' : '')} style={style} onClick={onClick}>
      <span
        className="char-card-portrait"
        style={character.image ? { backgroundImage: `url(${character.image})` } : undefined}
      >
        {!character.image && (character.name?.[0]?.toUpperCase() ?? '?')}
      </span>
      <span className="char-card-info">
        <strong>{character.name || 'Sem nome'}</strong>
        <span className="char-card-class">
          {CLASS_BY_KEY[character.classe]?.name ?? character.classe} · NEX {character.nex}%
        </span>
        <span className="char-card-date">Registrada em {formatDate(created)}</span>
      </span>
      <span className="char-card-cta">{cta}</span>
    </button>
  );
}
