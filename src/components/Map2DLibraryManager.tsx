import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteMap2D, fetchMap2Ds, newMap2DId, type Map2DSummary } from '../lib/map2dLibrary';

// Lista de mapas 2D montados ("Map2D") — cada um foi composto no editor
// (peças de cenário plantadas/arrastadas, ver Prototype2D.tsx) e fica
// pronto pra usar como ponto de partida ao hospedar uma mesa 2D.
export function Map2DLibraryManager() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<Map2DSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    void fetchMap2Ds().then((data) => {
      setMaps([...data].sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const onRemove = (id: string) => {
    if (!confirm('Excluir este mapa 2D de vez?')) return;
    void deleteMap2D(id).then(() => refresh());
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR');

  return (
    <div>
      <button className="primary" style={{ marginBottom: 14 }} onClick={() => navigate(`/mapa-2d/${newMap2DId()}`)}>
        ＋ Novo mapa 2D
      </button>

      {loading && <p className="faint">Carregando…</p>}
      {!loading && maps.length === 0 && (
        <p className="empty">Nenhum mapa 2D montado ainda — clique em "Novo mapa 2D" pra começar.</p>
      )}

      <div className="asset-grid">
        {maps.map((m) => (
          <div key={m.id} className="asset-card">
            <div className="asset-thumb proto3d-place-thumb" onClick={() => navigate(`/mapa-2d/${m.id}`)}>
              🗺️
            </div>
            <span className="asset-name" title={m.name}>
              {m.name}
            </span>
            <span className="faint" style={{ fontSize: 11 }}>
              {formatDate(m.updatedAt)}
            </span>
            <div className="asset-actions">
              <button className="small" onClick={() => navigate(`/mapa-2d/${m.id}`)}>
                Editar
              </button>
              <button className="small ghost" title="Excluir" onClick={() => onRemove(m.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
