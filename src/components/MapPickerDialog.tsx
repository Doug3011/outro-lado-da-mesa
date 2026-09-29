import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AssetFolder, MapAsset } from '../types';
import { fetchMapLibrary, mapAssetUrl } from '../lib/mapLibrary';
import { urlToDownscaledDataURL } from '../lib/image';

// Aberto ao clicar em "+ cenário": em vez de criar um cenário em branco na
// hora, mostra os mapas 2D já importados na Área do Mestre, num estilo
// "gerenciador de arquivos" — pastas que você clica pra abrir, mapas com
// miniatura dentro. Escolher um mapa cria o cenário já com aquele fundo;
// "Cenário em branco" preserva o comportamento de sempre. Portal pro
// <body> (mesmo motivo do CharacterWizard/paper-overlay): sem isso, um
// modal aberto de dentro da mesa fica preso no contexto de empilhamento do
// Room e pode perder pra elementos fixos globais (engrenagem, outros
// diálogos).
//
// `onAdd3d` (pedido do usuário): antes só dava pra adicionar cenário do
// MESMO kind da mesa atual — de dentro do 2D não tinha jeito de criar um
// cenário 3D pra trocar pra ele depois (só saindo da sala). Opcional
// porque o mesmo componente também é usado noutro lugar sem esse contexto.
export function MapPickerDialog({
  onPick,
  onBlank,
  onAdd3d,
  onClose,
}: {
  onPick: (dataUrl: string) => void;
  onBlank: () => void;
  onAdd3d?: () => void;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [maps, setMaps] = useState<MapAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    void fetchMapLibrary().then((data) => {
      setFolders(data.folders);
      setMaps(data.items.filter((m) => m.kind === '2d'));
      setLoading(false);
    });
  }, []);

  const visibleFolders = openFolder === null ? folders : [];
  const visibleMaps = maps.filter((m) => (m.folderId ?? null) === openFolder);
  const currentFolderName = openFolder ? folders.find((f) => f.id === openFolder)?.name : null;

  const pick = async (m: MapAsset) => {
    if (picking) return;
    setPicking(true);
    const dataUrl = await urlToDownscaledDataURL(mapAssetUrl(m.id), 2400);
    onPick(dataUrl);
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
          {openFolder ? (
            <button className="small ghost" onClick={() => setOpenFolder(null)}>
              ← Mapas
            </button>
          ) : (
            <span className="map-picker-title">Escolher mapa pro cenário</span>
          )}
          {currentFolderName && <span className="map-picker-crumb">{currentFolderName}</span>}
          <button className="small ghost map-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="map-picker-body">
          {loading && <p className="faint">Carregando…</p>}

          {!loading && openFolder === null && (
            <button className="map-picker-blank" onClick={onBlank}>
              <span className="map-picker-blank-ico">＋</span>
              Cenário em branco (sem mapa)
            </button>
          )}

          {!loading && openFolder === null && onAdd3d && (
            <button className="map-picker-blank map-picker-3d" onClick={onAdd3d}>
              <span className="map-picker-blank-ico">🧊</span>
              Cenário 3D — a mesa troca de mestre e jogadores juntos ao trocar
            </button>
          )}

          {!loading && (
            <div className="asset-grid">
              {visibleFolders.map((f) => (
                <button key={f.id} className="map-picker-folder" onClick={() => setOpenFolder(f.id)}>
                  <span className="map-picker-folder-ico">📁</span>
                  <span className="asset-name">{f.name}</span>
                  <span className="faint" style={{ fontSize: 11 }}>
                    {maps.filter((m) => m.folderId === f.id).length} mapa(s)
                  </span>
                </button>
              ))}
              {visibleMaps.map((m) => (
                <button key={m.id} className="asset-card map-picker-map" disabled={picking} onClick={() => pick(m)}>
                  <div className="asset-thumb" style={{ backgroundImage: `url(${mapAssetUrl(m.id)})` }} />
                  <span className="asset-name" title={m.name}>
                    {m.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && visibleFolders.length === 0 && visibleMaps.length === 0 && (
            <p className="empty">
              {openFolder
                ? 'Pasta vazia.'
                : 'Nenhum mapa 2D importado ainda — vá em "Área do Mestre" → Mapas, no menu principal.'}
            </p>
          )}

          {picking && <p className="faint" style={{ marginTop: 10 }}>Preparando mapa…</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
