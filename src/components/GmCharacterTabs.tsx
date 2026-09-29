import { useTableStore } from '../store/useTableStore';
import { CharacterCard } from './CharacterCard';
import { CharacterSheet } from './CharacterSheet';

// Aba "Ficha" do mestre: abre a ficha de cada jogador como uma aba estilo
// navegador, que continua aberta enquanto o mestre navega pelas outras abas
// da mesa (Dados, Histórico...) — por isso o estado de quais abas estão
// abertas vive no Room, não aqui (o painel lateral remonta por `key={tab}`
// toda vez que o mestre troca de aba no trilho de ícones).
export function GmCharacterTabs({
  openIds,
  activeId,
  onOpen,
  onClose,
  onSelect,
}: {
  openIds: string[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const characters = useTableStore((s) => s.characters);
  const list = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));
  const activeChar = activeId ? characters[activeId] : null;
  const openTabs = openIds.map((id) => characters[id]).filter((c): c is (typeof characters)[string] => !!c);

  return (
    <div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
        Fichas vinculadas a esta mesa pelos jogadores que entraram. Clique pra abrir numa aba.
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

      {activeChar && <CharacterSheet key={activeChar.id} character={activeChar} defaultView="papel" />}
    </div>
  );
}
