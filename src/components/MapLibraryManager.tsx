import { useEffect, useRef, useState } from 'react';
import type { AssetFolder, MapAsset, MapAssetKind } from '../types';
import {
  createMapFolder,
  deleteMapAsset,
  deleteMapFolder,
  fetchMapLibrary,
  mapAssetUrl,
  moveMapAsset,
  renameMapAsset,
  uploadMapImages,
} from '../lib/mapLibrary';
import { askText } from '../state/promptDialog';

// Biblioteca de mapas do mestre (Área do Mestre, menu principal) — mesma
// mecânica da de tokens, só que cada mapa é marcado como 2D ou 3D na hora de
// importar (mesa 2D e mesa 3D são separadas — ver memória da sessão — então
// um mapa serve só uma das duas). Hoje é só uma etiqueta organizacional: a
// mesa 3D em si ainda não existe.
export function MapLibraryManager() {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [items, setItems] = useState<MapAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | MapAssetKind>('all');
  const [importKind, setImportKind] = useState<MapAssetKind>('2d');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void fetchMapLibrary().then((data) => {
      setFolders(data.folders);
      setItems(data.items);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const visible = items
    .filter((t) => folderFilter === 'all' || t.folderId === folderFilter)
    .filter((t) => kindFilter === 'all' || t.kind === kindFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createMapFolder(name.trim()).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? Os mapas dela não são apagados, só ficam sem pasta.')) return;
    void deleteMapFolder(id).then(() => {
      if (folderFilter === id) setFolderFilter('all');
      refresh();
    });
  };

  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });
    void uploadMapImages(list, folderFilter === 'all' ? null : folderFilter, importKind, (done, total) =>
      setImporting({ done, total }),
    ).then(() => {
      setImporting(null);
      refresh();
    });
  };

  const onRename = async (t: MapAsset) => {
    const name = await askText('Nome do mapa:', t.name);
    if (!name?.trim() || name === t.name) return;
    void renameMapAsset(t.id, name.trim()).then(() => refresh());
  };

  const onMove = (t: MapAsset, folderId: string) => {
    void moveMapAsset(t.id, folderId || null).then(() => refresh());
  };

  const onDelete = (t: MapAsset) => {
    if (!confirm(`Excluir "${t.name}" de vez?`)) return;
    void deleteMapAsset(t.id).then(() => refresh());
  };

  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        <span className={`chip ${kindFilter === 'all' ? 'on' : ''}`} onClick={() => setKindFilter('all')}>
          Todos
        </span>
        <span className={`chip ${kindFilter === '2d' ? 'on' : ''}`} onClick={() => setKindFilter('2d')}>
          Mesa 2D
        </span>
        <span className={`chip ${kindFilter === '3d' ? 'on' : ''}`} onClick={() => setKindFilter('3d')}>
          Mesa 3D
        </span>
      </div>

      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span className={`chip ${folderFilter === 'all' ? 'on' : ''}`} onClick={() => setFolderFilter('all')}>
          Todas as pastas
        </span>
        {folders.map((f) => (
          <span
            key={f.id}
            className={`chip ${folderFilter === f.id ? 'on' : ''}`}
            onClick={() => setFolderFilter(f.id)}
            title="Clique pra filtrar; ✕ apaga a pasta"
          >
            {f.name}
            <button
              className="chip-x"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFolder(f.id);
              }}
            >
              ✕
            </button>
          </span>
        ))}
        <span className="chip" onClick={onAddFolder}>
          + pasta
        </span>
      </div>

      <div className="row" style={{ marginBottom: 10, alignItems: 'center' }}>
        <select
          className="small"
          style={{ flex: 'none', width: 120 }}
          value={importKind}
          onChange={(e) => setImportKind(e.target.value as MapAssetKind)}
          title="Pra qual mesa esses mapas são"
        >
          <option value="2d">Mesa 2D</option>
          <option value="3d">Mesa 3D</option>
        </select>
        <button className="primary" style={{ flex: 'none' }} onClick={() => fileInputRef.current?.click()}>
          Importar mapas{importing ? `… (${importing.done}/${importing.total})` : ''}
        </button>
        <button className="ghost" style={{ flex: 'none' }} onClick={() => folderInputRef.current?.click()}>
          Importar pasta inteira
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onImportFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          // @ts-expect-error atributo não tipado, mas suportado no Chromium
          webkitdirectory=""
          onChange={(e) => {
            onImportFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
        Escolha "Mesa 2D" ou "Mesa 3D" antes de importar — é só uma etiqueta pra organizar, cada mapa serve
        uma das duas.
      </p>

      {loading && <p className="faint">Carregando biblioteca…</p>}
      {!loading && visible.length === 0 && (
        <p className="empty">
          {folderFilter === 'all' && kindFilter === 'all'
            ? 'Nenhum mapa importado ainda.'
            : 'Nenhum mapa nesse filtro ainda.'}
        </p>
      )}

      <div className="asset-grid">
        {visible.map((t) => (
          <div className="asset-card" key={t.id}>
            <div className="asset-thumb" style={{ backgroundImage: `url(${mapAssetUrl(t.id)})` }}>
              <span className={`asset-kind-badge asset-kind-${t.kind}`}>{t.kind.toUpperCase()}</span>
            </div>
            <span className="asset-name" title={t.name}>
              {t.name}
            </span>
            <div className="asset-actions">
              <select className="small" value={t.folderId ?? ''} onChange={(e) => onMove(t, e.target.value)}>
                <option value="">sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button className="small ghost" title="Renomear" onClick={() => onRename(t)}>
                ✎
              </button>
              <button className="small ghost" title="Excluir" onClick={() => onDelete(t)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
