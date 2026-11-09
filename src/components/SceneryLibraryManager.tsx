import { useEffect, useRef, useState } from 'react';
import type { AssetFolder, SceneryAsset } from '../types';
import {
  createSceneryFolder,
  deleteSceneryAsset,
  deleteSceneryFolder,
  fetchSceneryLibrary,
  moveSceneryAsset,
  renameSceneryAsset,
  sceneryAssetUrl,
  uploadSceneryImage,
} from '../lib/sceneryLibrary';
import { askText } from '../state/promptDialog';
import { CloseFloatIcon, PencilIcon, UploadIcon } from './icons';

// Tipo MIME próprio pro drag-and-drop de peça de cenário da biblioteca pro
// mapa (ver BattleMap.tsx) — mesmo padrão de TOKEN_DRAG_MIME.
export const SCENERY_DRAG_MIME = 'application/x-ordem-scenery';

export interface SceneryDragPayload {
  id: string;
  name: string;
}

interface SceneryLibraryManagerProps {
  // Quando passado (uso dentro da mesa, ver BattleMap.tsx), clicar numa
  // miniatura planta ela no mapa em vez de só gerenciar a biblioteca — a
  // peça também continua arrastável pro mapa (SCENERY_DRAG_MIME), as duas
  // formas convivem.
  //
  // Essa prop também é o que escolhe o visual (Passo 8): só existe uma mesa
  // de verdade passando `onPlant` (BattleMap.tsx) — a Área do Mestre
  // (Home.tsx) chama sem essa prop. Então "sem onPlant" = visual novo
  // (tema Energia); "com onPlant" = visual antigo, ainda não redesenhado.
  onPlant?: (asset: SceneryAsset) => void;
}

// Biblioteca de peças de cenário 2D do mestre (móveis, paredes, texturas de
// chão) — Área do Mestre, fora de mesa. Mesmo padrão de TokenLibraryManager,
// com uma diferença: "Importar pasta inteira" aqui é ESPERTO — o usuário já
// tem os assets organizados em subpastas por categoria (Cadeiras, Paredes,
// Texturas...) e pedido explícito foi preservar essa organização ao importar,
// em vez de jogar tudo solto numa pasta só.
export function SceneryLibraryManager({ onPlant }: SceneryLibraryManagerProps) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [items, setItems] = useState<SceneryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const refresh = () => {
    void fetchSceneryLibrary().then((data) => {
      setFolders(data.folders);
      setItems(data.items);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const visible = items
    .filter((a) => filter === 'all' || a.folderId === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createSceneryFolder(name.trim()).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? As peças dela não são apagadas, só ficam sem pasta.')) return;
    void deleteSceneryFolder(id).then(() => {
      if (filter === id) setFilter('all');
      refresh();
    });
  };

  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });
    const folderId = filter === 'all' ? null : filter;
    let done = 0;
    void (async () => {
      for (const f of list) {
        await uploadSceneryImage(f, folderId);
        done++;
        setImporting({ done, total: list.length });
      }
      setImporting(null);
      refresh();
    })();
  };

  // Importar pasta inteira preservando a organização: `webkitRelativePath`
  // vem tipo "Pack Mapmaking Básico/Cadeiras/cadeira_azul.png" — agrupa por
  // SUBPASTA IMEDIATA (penúltimo segmento do caminho) e cria/reaproveita uma
  // pasta da biblioteca por grupo, em vez de jogar tudo solto. Arquivo direto
  // na raiz da pasta escolhida (sem subpasta) cai em "sem pasta".
  const onImportFolder = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });

    const groups = new Map<string, File[]>(); // nome da subpasta -> arquivos
    const noGroup: File[] = [];
    for (const f of list) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const parts = rel.split('/').filter(Boolean);
      // parts = [pastaEscolhida, ...subpastas..., arquivo.png] — penúltimo
      // item é a subpasta imediata (ou a própria pasta escolhida se o
      // arquivo está direto nela, sem subpasta — nesse caso cai em "sem pasta").
      if (parts.length >= 3) {
        const groupName = parts[parts.length - 2];
        const arr = groups.get(groupName) ?? [];
        arr.push(f);
        groups.set(groupName, arr);
      } else {
        noGroup.push(f);
      }
    }

    // reaproveita pasta da biblioteca já existente com o mesmo nome (reimportar
    // não duplica pastas), cria só a que faltar.
    const folderIdByName = new Map<string, string>();
    for (const f of folders) folderIdByName.set(f.name, f.id);

    let done = 0;
    const total = list.length;
    for (const [groupName, groupFiles] of groups) {
      let folderId = folderIdByName.get(groupName);
      if (!folderId) {
        const created = await createSceneryFolder(groupName);
        if (created) {
          folderId = created.id;
          folderIdByName.set(groupName, created.id);
          setFolders((cur) => [...cur, created]);
        }
      }
      for (const f of groupFiles) {
        await uploadSceneryImage(f, folderId ?? null);
        done++;
        setImporting({ done, total });
      }
    }
    for (const f of noGroup) {
      await uploadSceneryImage(f, null);
      done++;
      setImporting({ done, total });
    }

    setImporting(null);
    refresh();
  };

  const onRename = async (a: SceneryAsset) => {
    const name = await askText('Nome da peça:', a.name);
    if (!name?.trim() || name === a.name) return;
    void renameSceneryAsset(a.id, name.trim()).then(() => refresh());
  };

  const onMove = (a: SceneryAsset, folderId: string) => {
    void moveSceneryAsset(a.id, folderId || null).then(() => refresh());
  };

  const onDelete = (a: SceneryAsset) => {
    if (!confirm(`Excluir "${a.name}" de vez?`)) return;
    void deleteSceneryAsset(a.id).then(() => refresh());
  };

  if (!onPlant) {
    // Visual novo (Área do mestre, tema Energia) — ver comentário em
    // `onPlant` na assinatura do componente sobre por que ele decide isso.
    return (
      <div>
        <div className="rd-gm-toolbar">
          <span
            className={`rd-gm-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas
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
        </div>

        <div className="rd-gm-toolbar">
          <button className="rd-gm-btn-primary" onClick={() => folderInputRef.current?.click()}>
            <UploadIcon />
            IMPORTAR PASTA INTEIRA
          </button>
          <button className="rd-gm-btn-ghost" onClick={() => fileInputRef.current?.click()}>
            Importar imagens{importing ? `… (${importing.done}/${importing.total})` : ''}
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
              void onImportFolder(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="rd-gm-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
          <span>
            "Importar pasta inteira" cria uma pasta da biblioteca pra cada subpasta
            automaticamente (ex.: Cadeiras, Paredes) — mantém a organização que você
            já tem no computador.
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
            <span className="rd-gm-empty-title">Importar peças</span>
            <span className="rd-gm-empty-sub">
              {filter === 'all'
                ? 'Nenhuma peça importada ainda. Clique ou arraste as imagens aqui, ou use "Importar pasta inteira" pra trazer tudo de uma vez.'
                : 'Nenhuma peça nessa pasta ainda.'}
            </span>
          </button>
        )}

        {!loading && visible.length > 0 && (
          <div className="rd-gm-grid">
            {visible.map((a) => (
              <div className="rd-gm-card" key={a.id}>
                <div
                  className="rd-gm-card-thumb rd-gm-card-thumb-draggable"
                  style={{ backgroundImage: `url(${sceneryAssetUrl(a.id)})` }}
                  draggable
                  title="Arraste pro mapa da mesa pra plantar"
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SCENERY_DRAG_MIME, JSON.stringify({ id: a.id, name: a.name }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                />
                <span className="rd-gm-card-name" title={a.name}>
                  {a.name}
                </span>
                <div className="rd-gm-card-actions">
                  <select className="rd-gm-select" value={a.folderId ?? ''} onChange={(e) => onMove(a, e.target.value)}>
                    <option value="">sem pasta</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button className="rd-gm-icon-btn" title="Renomear" onClick={() => onRename(a)}>
                    <PencilIcon />
                  </button>
                  <button className="rd-gm-icon-btn" title="Excluir" onClick={() => onDelete(a)}>
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
          Todas
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
          // @ts-expect-error atributo não tipado, mas suportado no Chromium
          webkitdirectory=""
          onChange={(e) => {
            void onImportFolder(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <p className="faint" style={{ fontSize: 11, marginTop: -4, marginBottom: 10 }}>
        "Importar pasta inteira" cria uma pasta da biblioteca pra cada subpasta
        automaticamente (ex.: Cadeiras, Paredes) — mantém a organização que você
        já tem no computador.
      </p>

      {loading && <p className="faint">Carregando biblioteca…</p>}
      {!loading && visible.length === 0 && (
        <p className="empty">
          {filter === 'all'
            ? 'Nenhuma peça importada ainda. Clique em "Importar pasta inteira" pra trazer tudo de uma vez.'
            : 'Nenhuma peça nessa pasta ainda.'}
        </p>
      )}

      <div className="asset-grid">
        {visible.map((a) => (
          <div className="asset-card" key={a.id}>
            <div
              className="asset-thumb asset-thumb-draggable"
              style={{ backgroundImage: `url(${sceneryAssetUrl(a.id)})` }}
              draggable
              title="Clique pra plantar no mapa, ou arraste"
              onClick={() => onPlant(a)}
              onDragStart={(e) => {
                e.dataTransfer.setData(SCENERY_DRAG_MIME, JSON.stringify({ id: a.id, name: a.name }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
            />
            <span className="asset-name" title={a.name}>
              {a.name}
            </span>
            <div className="asset-actions">
              <select className="small" value={a.folderId ?? ''} onChange={(e) => onMove(a, e.target.value)}>
                <option value="">sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button className="small ghost" title="Renomear" onClick={() => onRename(a)}>
                ✎
              </button>
              <button className="small ghost" title="Excluir" onClick={() => onDelete(a)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
