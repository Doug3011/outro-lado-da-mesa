import { useNavigate } from 'react-router-dom';
import { loadMatchHistory, removeMatch } from '../lib/matchHistory';
import { useIdentity } from '../hooks/useIdentity';
import { useState } from 'react';

function relativeTime(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `há ${diffD} dia${diffD === 1 ? '' : 's'}`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function MatchHistoryPanel({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { update } = useIdentity();
  const [list, setList] = useState(loadMatchHistory);

  const rejoin = (code: string, role: 'gm' | 'player') => {
    update({ isGM: role === 'gm' });
    navigate(`/sala/${code}`);
  };

  const remove = (code: string) => {
    removeMatch(code);
    setList(loadMatchHistory());
  };

  return (
    <div className="home-card" style={{ maxWidth: 560 }}>
      <button className="link-back" onClick={onBack}>
        ← voltar
      </button>
      <div className="home-brand" style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22 }}>Histórico de Mesas</h1>
      </div>
      <p className="home-sub" style={{ marginBottom: 18 }}>
        Mesas que você já jogou neste computador, com a mais recente primeiro.
      </p>

      {list.length === 0 && (
        <p className="empty">Nenhuma mesa jogada ainda por aqui — entre numa mesa pra começar.</p>
      )}

      {list.map((m) => (
        <div className="list-item" key={m.code}>
          <div className="li-head">
            <span style={{ flex: 1 }}>
              <strong>{m.name}</strong>
              {m.name !== m.code && <small className="faint"> · {m.code}</small>}
            </span>
            <span className={`tag ${m.role === 'gm' ? 'tag-gm' : ''}`} style={{ flex: 'none' }}>
              {m.role === 'gm' ? '★ Mestre' : 'Jogador'}
            </span>
          </div>
          <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
            <small className="faint" style={{ flex: 1 }}>
              última vez {relativeTime(m.lastPlayed)}
            </small>
            <button className="small" style={{ flex: 'none' }} onClick={() => rejoin(m.code, m.role)}>
              Entrar de novo
            </button>
            <button className="small ghost" style={{ flex: 'none' }} onClick={() => remove(m.code)}>
              remover
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
