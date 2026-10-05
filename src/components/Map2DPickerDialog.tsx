import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchMap2D, fetchMap2Ds, type Map2D, type Map2DSummary } from '../lib/map2dLibrary';

// Escolher um mapa 2D salvo (Área do Mestre → Cenário 2D → "+ Novo mapa 2D")
// pra virar o cenário de uma mesa 2D nova — usado ao hospedar. Mesmo padrão
// visual/portal do PlacePickerDialog (cenário 3D).
export function Map2DPickerDialog({
  onPick,
  onBlank,
  onClose,
}: {
  onPick: (map2d: Map2D) => void;
  onBlank: () => void;
  onClose: () => void;
}) {
  const [maps, setMaps] = useState<Map2DSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    void fetchMap2Ds().then((data) => {
      setMaps([...data].sort((a, b) => b.updatedAt - a.updatedAt));
      setLoading(false);
    });
  }, []);

  const pick = async (m: Map2DSummary) => {
    if (picking) return;
    setPicking(m.id);
    const full = await fetchMap2D(m.id);
    setPicking(null);
    if (full) onPick(full);
  };

  return createPortal(
    <div
      className="prompt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="map-picker">
        <div className="map-picker-head">
          <span className="map-picker-title">Escolher mapa 2D</span>
          <button className="small ghost map-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="map-picker-body">
          {loading && <p className="faint">Carregando…</p>}

          {!loading && (
            <button className="map-picker-blank" onClick={onBlank}>
              <span className="map-picker-blank-ico">＋</span>
              Mapa em branco (sem cenário)
            </button>
          )}

          {!loading && maps.length > 0 && (
            <div className="asset-grid">
              {maps.map((m) => (
                <button
                  key={m.id}
                  className="asset-card map-picker-map"
                  disabled={picking === m.id}
                  onClick={() => pick(m)}
                >
                  <div className="asset-thumb proto3d-place-thumb">🗺️</div>
                  <span className="asset-name" title={m.name}>
                    {picking === m.id ? 'Carregando…' : m.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && maps.length === 0 && (
            <p className="empty">
              Nenhum mapa 2D montado ainda — vá em "Área do Mestre" → Cenário 2D, no menu
              principal.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
