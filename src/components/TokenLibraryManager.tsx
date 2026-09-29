import { useEffect, useRef, useState } from 'react';
import type { AssetFolder, TokenAsset } from '../types';
import {
  createTokenFolder,
  deleteTokenAsset,
  deleteTokenFolder,
  fetchTokenLibrary,
  moveTokenAsset,
  renameTokenAsset,
  TOKEN_DRAG_MIME,
  tokenAssetUrl,
  uploadTokenImages,
} from '../lib/tokenLibrary';
import { askText } from '../state/promptDialog';

// Biblioteca de tokens do mestre (Área do Mestre, menu principal) — importa
// imagens (uma a uma, várias de uma vez, ou uma pasta inteira do computador)
// e organiza em pastas, igual a biblioteca de música. Não toca a mesa ainda
// — é só o estoque pronto pra quando a aba "Ficha"/mapa da mesa ganhar um
// jeito de puxar daqui (próximo passo, não desta leva).
export function TokenLibraryManager() {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [items, setItems] = useState<TokenAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void fetchTokenLibrary().then((data) => {
      setFolders(data.folders);
      setItems(data.items);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const visible = items
    .filter((t) => filter === 'all' || t.folderId === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createTokenFolder(name.trim()).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? Os tokens dela não são apagados, só ficam sem pasta.')) return;
    void deleteTokenFolder(id).then(() => {
      if (filter === id) setFilter('all');
      refresh();
    });
  };

  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });
    void uploadTokenImages(list, filter === 'all' ? null : filter, (done, total) =>
      setImporting({ done, total }),
    ).then(() => {
      setImporting(null);
      refresh();
    });
  };

  const onRename = async (t: TokenAsset) => {
    const name = await askText('Nome do token:', t.name);
    if (!name?.trim() || name === t.name) return;
    void renameTokenAsset(t.id, name.trim()).then(() => refresh());
  };

  const onMove = (t: TokenAsset, folderId: string) => {
    void moveTokenAsset(t.id, folderId || null).then(() => refresh());
  };

  const onDelete = (t: TokenAsset) => {
    if (!confirm(`Excluir "${t.name}" de vez?`)) return;
    void deleteTokenAsset(t.id).then(() => refresh());
  };

  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          Todos
        </span>
        {folders.map((f) => (
          <span
            key={f.id}
            className={`chip ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
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

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="primary" style={{ flex: 'none' }} onClick={() => fileInputRef.current?.click()}>
          Importar imagens{importing ? `… (${importing.done}/${importing.total})` : ''}
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
          // `webkitdirectory` não tem tipo no React — Chromium/Electron aceitam
          // normalmente; sem isso não dá pra selecionar uma pasta inteira.
          // @ts-expect-error atributo não tipado, mas suportado no Chromium
          webkitdirectory=""
          onChange={(e) => {
            onImportFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {loading && <p className="faint">Carregando biblioteca…</p>}
      {!loading && visible.length === 0 && (
        <p className="empty">
          {filter === 'all'
            ? 'Nenhum token importado ainda. Clique em "Importar imagens" (ou "Importar pasta inteira" pra trazer várias de uma vez).'
            : 'Nenhum token nessa pasta ainda.'}
        </p>
      )}

      <div className="asset-grid">
        {visible.map((t) => (
          <div className="asset-card" key={t.id}>
            <div
              className="asset-thumb asset-thumb-draggable"
              style={{ backgroundImage: `url(${tokenAssetUrl(t.id)})` }}
              draggable
              title="Arraste pro mapa da mesa pra colocar como token"
              onDragStart={(e) => {
                e.dataTransfer.setData(TOKEN_DRAG_MIME, JSON.stringify({ id: t.id, name: t.name }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            />
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
