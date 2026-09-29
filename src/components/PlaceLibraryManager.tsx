import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deletePlace, fetchPlaces, newPlaceId, type PlaceSummary } from '../lib/placeLibrary';

// Lista de cenários 3D ("places") salvos — cada um foi montado no editor
// (câmera livre, objetos-imagem, textura de chão) e fica pronto pra usar
// como ponto de partida de qualquer mesa 3D futura (ainda não ligado numa
// mesa de verdade — isso é a fase seguinte, combinada com o usuário).
export function PlaceLibraryManager() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    void fetchPlaces().then((data) => {
      setPlaces([...data].sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const onRemove = (id: string) => {
    if (!confirm('Excluir este cenário 3D de vez?')) return;
    void deletePlace(id).then(() => refresh());
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR');

  return (
    <div>
      <button className="primary" style={{ marginBottom: 14 }} onClick={() => navigate(`/prototipo-3d/${newPlaceId()}`)}>
        ＋ Novo cenário 3D
      </button>

      {loading && <p className="faint">Carregando…</p>}
      {!loading && places.length === 0 && (
        <p className="empty">Nenhum cenário 3D criado ainda — clique em "Novo cenário 3D" pra começar.</p>
      )}

      <div className="asset-grid">
        {places.map((p) => (
          <div key={p.id} className="asset-card">
            <div className="asset-thumb proto3d-place-thumb" onClick={() => navigate(`/prototipo-3d/${p.id}`)}>
              🧊
            </div>
            <span className="asset-name" title={p.name}>
              {p.name}
            </span>
            <span className="faint" style={{ fontSize: 11 }}>
              {formatDate(p.updatedAt)}
            </span>
            <div className="asset-actions">
              <button className="small" onClick={() => navigate(`/prototipo-3d/${p.id}`)}>
                Editar
              </button>
              <button className="small ghost" title="Excluir" onClick={() => onRemove(p.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
