import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deletePlace, fetchPlaces, newPlaceId, type PlaceSummary } from '../lib/placeLibrary';
import { CloseFloatIcon, PlusIcon, SceneObjectToolIcon } from './icons';

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
      <button className="rd-gm-btn-primary" style={{ marginBottom: 2 }} onClick={() => navigate(`/prototipo-3d/${newPlaceId()}`)}>
        <PlusIcon /> NOVO CENÁRIO 3D
      </button>

      {loading && <p className="rd-gm-hint">Carregando…</p>}
      {!loading && places.length === 0 && (
        <p className="rd-gm-hint">Nenhum cenário 3D criado ainda — clique em "Novo cenário 3D" pra começar.</p>
      )}

      {!loading && places.length > 0 && (
        <div className="rd-gm-grid rd-gm-grid-lg">
          {places.map((p) => (
            <div key={p.id} className="rd-gm-card">
              <div className="rd-gm-3d-thumb" onClick={() => navigate(`/prototipo-3d/${p.id}`)} style={{ cursor: 'pointer' }}>
                <SceneObjectToolIcon />
              </div>
              <span className="rd-gm-card-name" title={p.name}>
                {p.name}
              </span>
              <span className="rd-gm-card-meta">{formatDate(p.updatedAt)}</span>
              <div className="rd-gm-card-actions">
                <button className="rd-gm-card-btn" onClick={() => navigate(`/prototipo-3d/${p.id}`)}>
                  Editar
                </button>
                <button className="rd-gm-icon-btn" title="Excluir" onClick={() => onRemove(p.id)}>
                  <CloseFloatIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
