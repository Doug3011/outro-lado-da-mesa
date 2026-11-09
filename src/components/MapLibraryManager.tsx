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
import { CloseFloatIcon, PencilIcon, UploadIcon } from './icons';

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
  const [dragOver, setDragOver] = useState(false);

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
      <div className="rd-gm-toolbar">
        <div className="rd-gm-segmented" role="group" aria-label="Tipo de mesa">
          <button
            className={`rd-gm-segmented-btn ${kindFilter === 'all' ? 'active' : ''}`}
            aria-pressed={kindFilter === 'all'}
            onClick={() => setKindFilter('all')}
          >
            Todos
          </button>
          <button
            className={`rd-gm-segmented-btn ${kindFilter === '2d' ? 'active' : ''}`}
            aria-pressed={kindFilter === '2d'}
            onClick={() => setKindFilter('2d')}
          >
            Mesa 2D
          </button>
          <button
            className={`rd-gm-segmented-btn ${kindFilter === '3d' ? 'active' : ''}`}
            aria-pressed={kindFilter === '3d'}
            onClick={() => setKindFilter('3d')}
          >
            Mesa 3D
          </button>
        </div>
        <span
          className={`rd-gm-chip ${folderFilter === 'all' ? 'active' : ''}`}
          onClick={() => setFolderFilter('all')}
        >
          Todas as pastas
        </span>
        {folders.map((f) => (
          <span
            key={f.id}
            className={`rd-gm-chip ${folderFilter === f.id ? 'active' : ''}`}
            onClick={() => setFolderFilter(f.id)}
            title="Clique pra filtrar; ✕ apaga a pasta"
          >
            {f.name}
            <button
              className="rd-gm-chip-x"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFolder(f.id);
              }}
            >
              <CloseFloatIcon />
            </button>
          </span>
        ))}
        <span className="rd-gm-chip-ghost" onClick={onAddFolder}>
          + pasta
        </span>
      </div>

      <div className="rd-gm-field-row">
        <label className="rd-gm-field">
          <span className="rd-gm-field-label">Importar como</span>
          <select
            className="rd-gm-select-lg"
            value={importKind}
            onChange={(e) => setImportKind(e.target.value as MapAssetKind)}
            title="Pra qual mesa esses mapas são"
          >
            <option value="2d">Mesa 2D</option>
            <option value="3d">Mesa 3D</option>
          </select>
        </label>
        <button className="rd-gm-btn-primary" onClick={() => fileInputRef.current?.click()}>
          <UploadIcon />
          {importing ? `IMPORTANDO… (${importing.done}/${importing.total})` : 'IMPORTAR MAPAS'}
        </button>
        <button className="rd-gm-btn-ghost" onClick={() => folderInputRef.current?.click()}>
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
        <span className="rd-gm-field-hint">
          "Mesa 2D" ou "Mesa 3D" é só uma etiqueta pra organizar; cada mapa serve nas duas.
        </span>
      </div>

      {loading && <p className="rd-gm-hint">Carregando biblioteca…</p>}

      {!loading && visible.length === 0 && (
        <button
          type="button"
          className={`rd-gm-empty${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onImportFiles(e.dataTransfer.files);
          }}
        >
          <span className="rd-gm-empty-icon">
            <UploadIcon />
          </span>
          <span className="rd-gm-empty-title">Importar mapas</span>
          <span className="rd-gm-empty-sub">
            {folderFilter === 'all' && kindFilter === 'all'
              ? 'Nenhum mapa importado ainda. Clique ou arraste as imagens aqui.'
              : 'Nenhum mapa nesse filtro ainda.'}
          </span>
        </button>
      )}

      {!loading && visible.length > 0 && (
        <div className="rd-gm-grid">
          {visible.map((t) => (
            <div className="rd-gm-card" key={t.id}>
              <div className="rd-gm-card-thumb" style={{ backgroundImage: `url(${mapAssetUrl(t.id)})` }}>
                <span className="rd-gm-card-kind">{t.kind.toUpperCase()}</span>
              </div>
              <span className="rd-gm-card-name" title={t.name}>
                {t.name}
              </span>
              <div className="rd-gm-card-actions">
                <select className="rd-gm-select" value={t.folderId ?? ''} onChange={(e) => onMove(t, e.target.value)}>
                  <option value="">sem pasta</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <button className="rd-gm-icon-btn" title="Renomear" onClick={() => onRename(t)}>
                  <PencilIcon />
                </button>
                <button className="rd-gm-icon-btn" title="Excluir" onClick={() => onDelete(t)}>
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
