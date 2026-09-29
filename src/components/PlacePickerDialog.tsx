import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchPlace, fetchPlaces, type Place, type PlaceSummary } from '../lib/placeLibrary';

// Escolher uma place salva (Área do Mestre → Cenários 3D) pra virar o cenário
// de uma mesa 3D — usado tanto ao hospedar uma mesa 3D nova quanto no "+
// cenário" de dentro de uma mesa 3D já em andamento (Battle3D.tsx). Mesmo
// padrão visual/portal do MapPickerDialog (mapas 2D) — aqui não tem
// miniatura de verdade (place não guarda uma prévia própria), só nome+data.
// `onAdd2d` (pedido do usuário, mesma folga que o MapPickerDialog ganhou do
// lado 2D): de dentro do 3D também dá pra criar um cenário 2D pra trocar
// pra ele depois, sem sair da sala. Opcional pelo mesmo motivo do outro lado.
export function PlacePickerDialog({
  onPick,
  onBlank,
  onAdd2d,
  onClose,
}: {
  onPick: (place: Place) => void;
  onBlank: () => void;
  onAdd2d?: () => void;
  onClose: () => void;
}) {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlaces().then((data) => {
      setPlaces(data);
      setLoading(false);
    });
  }, []);

  const pick = async (p: PlaceSummary) => {
    if (picking) return;
    setPicking(p.id);
    const full = await fetchPlace(p.id);
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
          <span className="map-picker-title">Escolher cenário 3D</span>
          <button className="small ghost map-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="map-picker-body">
          {loading && <p className="faint">Carregando…</p>}

          {!loading && (
            <button className="map-picker-blank" onClick={onBlank}>
              <span className="map-picker-blank-ico">＋</span>
              Cenário 3D em branco (sem chão/objetos)
            </button>
          )}

          {!loading && onAdd2d && (
            <button className="map-picker-blank map-picker-2d" onClick={onAdd2d}>
              <span className="map-picker-blank-ico">🗺</span>
              Cenário 2D — a mesa troca de mestre e jogadores juntos ao trocar
            </button>
          )}

          {!loading && places.length > 0 && (
            <div className="asset-grid">
              {places.map((p) => (
                <button
                  key={p.id}
                  className="asset-card map-picker-map"
                  disabled={picking === p.id}
                  onClick={() => pick(p)}
                >
                  <div className="asset-thumb proto3d-place-thumb">🧊</div>
                  <span className="asset-name" title={p.name}>
                    {picking === p.id ? 'Carregando…' : p.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && places.length === 0 && (
            <p className="empty">
              Nenhum cenário 3D salvo ainda — vá em "Área do Mestre" → Cenários 3D, no menu
              principal.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
