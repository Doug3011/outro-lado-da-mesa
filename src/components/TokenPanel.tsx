import { TokenLibraryManager } from './TokenLibraryManager';

// Aba "Tokens" da mesa — só o mestre vê (gate fica em Room.tsx, igual
// Perfis). Reusa o MESMO gerenciador de biblioteca da Área do Mestre (menu
// principal) — dá pra importar novos tokens sem sair da mesa, igual a aba
// Músicas já deixa importar música sem sair. A novidade aqui é só arrastar:
// cada miniatura já é `draggable` (ver TokenLibraryManager.tsx); soltar em
// cima do mapa cria um token novo naquele ponto (ver BattleMap.tsx).
export function TokenPanel() {
  return (
    <div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
        Arraste um token daqui pra dentro do mapa pra colocar. Pode importar mais a qualquer
        momento, sem sair da mesa.
      </p>
      <TokenLibraryManager />
    </div>
  );
}
