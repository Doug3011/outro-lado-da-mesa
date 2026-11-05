import { useTableStore } from '../store/useTableStore';
import { CharacterCard } from './CharacterCard';
import { CharacterSheet } from './CharacterSheet';

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
  const list = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));
  const activeChar = activeId ? characters[activeId] : null;
  const openTabs = openIds.map((id) => characters[id]).filter((c): c is (typeof characters)[string] => !!c);

  return (
    <div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
        Fichas vinculadas a esta mesa pelos jogadores que entraram. Clique pra abrir
        {floatingPicker ? ' numa janela.' : ' numa aba.'}
      </p>
      {list.length === 0 && (
        <p className="empty">Nenhum jogador vinculou uma ficha a esta mesa ainda.</p>
      )}
      {list.length > 0 && (
        <div className="char-card-list" style={{ marginBottom: 14 }}>
          {list.map((c) => (
            <CharacterCard key={c.id} character={c} onClick={() => onOpen(c.id)} cta="Abrir ficha" />
          ))}
        </div>
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
