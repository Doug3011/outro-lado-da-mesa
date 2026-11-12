import { useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { loadMyCharacters } from '../lib/characterLibrary';
import { CharacterCard } from './CharacterCard';
import { CharacterSheet } from './CharacterSheet';

// Ícone de lixeira pro "Remover" — só usado aqui, mesmo padrão de outros
// ícones soltos locais no projeto (ex. Home.tsx) em vez de centralizar em
// icons.tsx pra algo tão específico de um lugar só.
function RemoveLinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.4A1.6 1.6 0 0 0 8.2 17h3.6a1.6 1.6 0 0 0 1.6-1.6L14 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Aba "Ficha" do mestre: lista as fichas vinculadas a esta mesa; clicar em
// "Abrir ficha" só avisa quem chama (`onOpen`) — o estado de quais estão
// abertas (`openIds`/`activeId`) e ONDE a ficha aberta aparece vivem em
// quem chama (BattleMap.tsx/Room.tsx), não aqui, porque são dois jeitos
// diferentes de mostrar a mesma lista:
//
//   - mapa 2D (dentro da janela flutuante "Ficha" do mestre — ver
//     BattleMap.tsx): cada ficha aberta vira sua PRÓPRIA `FloatingWindow`
//     (mesmo componente dos botões/janelas flutuantes da etapa 1), movível
//     e redimensionável à parte. Por isso esse componente só lista as
//     fichas pra abrir (`floatingPicker`) — a FloatingWindow de cada ficha
//     tem que nascer como IRMÃ da janela "Ficha" dentro de
//     `floatingLayerRef`, não aninhada dentro do corpo dela (senão fica
//     posicionada/recortada relativa à janela pequena, não à mesa
//     inteira). Corrige o bug relatado pelo usuário: antes "Abrir ficha"
//     caía na ficha-em-papel (removida — ver CharacterSheet.tsx), que
//     cobria a tela inteira num portal pro document.body em vez de abrir
//     como janela flutuante de verdade.
//   - painel lateral antigo (`floatingPicker` omitido, ainda usado pela
//     mesa 3D): mantém o comportamento anterior — abas estilo navegador,
//     com a ficha ativa embutida abaixo da lista.
export function GmCharacterTabs({
  openIds,
  activeId,
  onOpen,
  onClose,
  onSelect,
  floatingPicker,
}: {
  openIds: string[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onSelect: (id: string) => void;
  floatingPicker?: boolean;
}) {
  const characters = useTableStore((s) => s.characters);
  const deleteCharacter = useTableStore((s) => s.deleteCharacter);
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);
  const list = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));
  const activeChar = activeId ? characters[activeId] : null;
  const openTabs = openIds.map((id) => characters[id]).filter((c): c is (typeof characters)[string] => !!c);

  // Pedido do usuário: mestre poder colocar ficha na mesa direto (pra
  // testar combate, NPCs etc.) sem depender de um jogador vincular a
  // própria — pega da MESMA biblioteca local de "Minhas Fichas", só não
  // repete quem já está na mesa.
  const [addFilter, setAddFilter] = useState('');
  const myChars = loadMyCharacters().filter((c) => !characters[c.id]);
  const addMatches = myChars.filter((c) => !addFilter.trim() || c.name.toLowerCase().includes(addFilter.trim().toLowerCase()));

  return (
    <div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
        Fichas vinculadas a esta mesa (pelos jogadores que entraram, ou adicionadas por você logo
        abaixo). Clique pra abrir
        {floatingPicker ? ' numa janela.' : ' numa aba.'}
      </p>
      {list.length === 0 && (
        <p className="empty">Nenhuma ficha nesta mesa ainda.</p>
      )}
      {list.length > 0 && (
        <div className="char-card-list" style={{ marginBottom: 14 }}>
          {list.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CharacterCard character={c} onClick={() => onOpen(c.id)} cta="Abrir ficha" />
              </div>
              <button
                className="small ghost"
                title="Remover ficha desta mesa"
                aria-label={`Remover ficha de ${c.name} desta mesa`}
                style={{ flex: 'none', color: 'var(--rd-sangue-bright, var(--blood-bright))' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      `Remover a ficha de ${c.name} desta mesa? A ficha continua salva na biblioteca do jogador — isso só tira ela daqui.`,
                    )
                  ) {
                    if (activeId === c.id) onClose(c.id);
                    deleteCharacter(c.id);
                  }
                }}
              >
                <RemoveLinkIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {myChars.length > 0 && (
        <details className="ritual-picker" style={{ marginBottom: 14 }}>
          <summary>+ Adicionar ficha da sua biblioteca</summary>
          <input
            placeholder="Filtrar por nome…"
            value={addFilter}
            onChange={(e) => setAddFilter(e.target.value)}
            style={{ margin: '8px 0' }}
          />
          {addMatches.map((c) => (
            <div className="ritual-row" key={c.id}>
              <button className="small" title="Adicionar à mesa" onClick={() => upsertCharacter(c)}>
                +
              </button>
              <span>
                <strong>{c.name}</strong>{' '}
                <small className="faint">
                  {c.classe} · NEX {c.nex}%
                </small>
              </span>
            </div>
          ))}
          {addMatches.length === 0 && <p className="faint" style={{ fontSize: 12, padding: 8 }}>Nenhuma ficha encontrada.</p>}
        </details>
      )}

      {floatingPicker ? (
        openTabs.length > 0 && (
          <p className="faint" style={{ fontSize: 12 }}>
            {openTabs.length === 1
              ? `Ficha de ${openTabs[0].name} aberta numa janela própria — arraste pra mover.`
              : `${openTabs.length} fichas abertas em janelas próprias — arraste pra mover cada uma.`}
          </p>
        )
      ) : (
        <>
          {openTabs.length > 0 && (
            <div className="browser-tabs">
              {openTabs.map((c) => (
                <span
                  key={c.id}
                  className={`browser-tab ${activeId === c.id ? 'active' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="browser-tab-label">{c.name}</span>
                  <button
                    className="browser-tab-close"
                    title="Fechar aba"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(c.id);
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {activeChar && <CharacterSheet key={activeChar.id} character={activeChar} />}
        </>
      )}
    </div>
  );
}
