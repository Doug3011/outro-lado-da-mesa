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
import { CloseFloatIcon, PencilIcon, UploadIcon } from './icons';

// Biblioteca de tokens do mestre (Área do Mestre, menu principal) — importa
// imagens (uma a uma, várias de uma vez, ou uma pasta inteira do computador)
// e organiza em pastas, igual a biblioteca de música. Também é usada DENTRO
// de uma mesa (BattleMap.tsx/Battle3D.tsx, via TokenPanel.tsx) pra arrastar
// um token pro mapa — mesmo componente, mesma lógica, só o visual muda.
export function TokenLibraryManager({
  // Com um token selecionado no mapa (ver BattleMap.tsx), Shift+clique numa
  // miniatura chama isso em vez do arraste normal — adiciona a imagem como
  // VARIANTE do token selecionado (ver TokenSprite em types.ts) em vez de
  // criar um token novo. Ausente (ou sem token selecionado) = Shift+clique
  // não faz nada, só o arraste de sempre continua funcionando.
  onShiftClickAsset,
  // 'energia' = visual novo do redesign (Passo 8, só a Área do Mestre fora
  // de mesa — ver Home.tsx). Ausente/undefined = visual antigo, inclusive
  // dentro de uma mesa (BattleMap.tsx/Battle3D.tsx/TokenPanel.tsx), que
  // ainda não foi redesenhada nesta leva.
  theme,
}: {
  onShiftClickAsset?: (asset: TokenAsset) => void;
  theme?: 'energia';
} = {}) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [items, setItems] = useState<TokenAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const hiddenInputs = (
    <>
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
    </>
  );

  // Visual novo (Área do mestre, tema Energia) — só quando `theme="energia"`
  // (ver Home.tsx). Dentro de uma mesa (BattleMap.tsx/Battle3D.tsx, via
  // TokenPanel.tsx) continua no visual antigo mais abaixo, intocado.
  if (theme === 'energia') {
    return (
      <div>
        <div className="rd-gm-toolbar">
          <span
            className={`rd-gm-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </span>
          {folders.map((f) => (
            <span
              key={f.id}
              className={`rd-gm-chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
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
          <span style={{ flex: 1 }} />
          <button className="rd-gm-btn-ghost" onClick={() => folderInputRef.current?.click()}>
            Importar pasta inteira
          </button>
          <button className="rd-gm-btn-primary" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon />
            {importing ? `IMPORTANDO… (${importing.done}/${importing.total})` : 'IMPORTAR IMAGENS'}
          </button>
          {hiddenInputs}
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
            <span className="rd-gm-empty-title">Importar tokens</span>
            <span className="rd-gm-empty-sub">
              {filter === 'all'
                ? 'Nenhum token importado ainda. Clique ou arraste as imagens aqui (ou use "Importar pasta inteira" pra trazer várias de uma vez).'
                : 'Nenhum token nessa pasta ainda.'}
            </span>
          </button>
        )}

        {!loading && visible.length > 0 && (
          <div className="rd-gm-grid">
            {visible.map((t) => (
              <div className="rd-gm-card" key={t.id}>
                <div
                  className="rd-gm-card-thumb rd-gm-card-thumb-draggable"
                  style={{ backgroundImage: `url(${tokenAssetUrl(t.id)})` }}
                  draggable
                  title={
                    onShiftClickAsset
                      ? 'Arraste pro mapa pra colocar como token novo — Shift+clique adiciona como variante do token selecionado'
                      : 'Arraste pro mapa da mesa pra colocar como token'
                  }
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TOKEN_DRAG_MIME, JSON.stringify({ id: t.id, name: t.name }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={(e) => {
                    if (e.shiftKey && onShiftClickAsset) onShiftClickAsset(t);
                  }}
                />
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
            <button type="button" className="rd-gm-dropcard" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon />
              Arraste imagens aqui
            </button>
          </div>
        )}
      </div>
    );
  }

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
        {hiddenInputs}
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
              title={
                onShiftClickAsset
                  ? 'Arraste pro mapa pra colocar como token novo — Shift+clique adiciona como variante do token selecionado'
                  : 'Arraste pro mapa da mesa pra colocar como token'
              }
              onDragStart={(e) => {
                e.dataTransfer.setData(TOKEN_DRAG_MIME, JSON.stringify({ id: t.id, name: t.name }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={(e) => {
                if (e.shiftKey && onShiftClickAsset) onShiftClickAsset(t);
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
