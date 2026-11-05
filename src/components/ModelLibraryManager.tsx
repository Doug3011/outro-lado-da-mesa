import { useEffect, useRef, useState } from 'react';
import type { AssetFolder, ModelAsset, ModelAssetKind } from '../types';
import { MODEL_FILE_ACCEPT } from '../lib/scene3d';
import {
  createModelFolder,
  deleteModelAsset,
  deleteModelFolder,
  fetchModelLibrary,
  modelAssetUrl,
  moveModelAsset,
  renameModelAsset,
  uploadModelAssets,
} from '../lib/modelLibrary';
import { askText } from '../state/promptDialog';

// Tipo MIME próprio pro drag-and-drop de item da biblioteca de modelos pro
// cenário 3D (ver onCanvasDrop em Prototype3D.tsx) — mesmo padrão de
// SCENERY_DRAG_MIME/TOKEN_DRAG_MIME.
export const MODEL_DRAG_MIME = 'application/x-ordem-model';

export interface ModelDragPayload {
  id: string;
  name: string;
  ext: string;
  kind: ModelAssetKind;
}

interface ModelLibraryManagerProps {
  // Clicar numa miniatura planta ela no cenário na posição padrão — imagem
  // vira objeto "em pé" (billboard), modelo vira objeto "modelo 3D" (mesma
  // escolha padrão do arraste, ver onCanvasDrop em Prototype3D.tsx).
  onPlant: (asset: ModelAsset) => void;
  // Ações extras só pra itens `kind:'image'` — a mesma imagem também pode
  // virar decalque deitado no chão ou textura de chão, sem precisar
  // reimportar (igual os botões "+Decalque"/"+Chão" de antes faziam a
  // partir de um arquivo novo).
  onPlantAsPatch: (asset: ModelAsset) => void;
  onPlantAsGround: (asset: ModelAsset) => void;
}

// Biblioteca de modelos/imagens do editor de cenário 3D (Prototype3D.tsx) —
// Área do Mestre, fora de mesa. Mesmo padrão de SceneryLibraryManager (a
// versão 2D disso), com um filtro extra de TIPO (imagem/modelo 3D) por cima
// do filtro de pasta, já que aqui os dois convivem na mesma biblioteca.
export function ModelLibraryManager({ onPlant, onPlantAsPatch, onPlantAsGround }: ModelLibraryManagerProps) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [items, setItems] = useState<ModelAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | ModelAssetKind>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void fetchModelLibrary().then((data) => {
      setFolders(data.folders);
      setItems(data.items);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const visible = items
    .filter((a) => folderFilter === 'all' || a.folderId === folderFilter)
    .filter((a) => kindFilter === 'all' || a.kind === kindFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createModelFolder(name.trim()).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? Os itens dela não são apagados, só ficam sem pasta.')) return;
    void deleteModelFolder(id).then(() => {
      if (folderFilter === id) setFolderFilter('all');
      refresh();
    });
  };

  // Importador único — aceita imagem OU modelo 3D no mesmo input (cada
  // arquivo escolhido já sabe o próprio tipo pela extensão, ver
  // modelKindFromFileName em lib/modelLibrary.ts); pedido do usuário: um só
  // botão "Importar" no lugar dos 4 antigos (+Objeto/+Chão/+Decalque/+Modelo).
  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });
    const folderId = folderFilter === 'all' ? null : folderFilter;
    void uploadModelAssets(list, folderId, (done, total) => setImporting({ done, total })).then(() => {
      setImporting(null);
      refresh();
    });
  };

  // Importar pasta inteira preservando a organização — mesma lógica de
  // SceneryLibraryManager.tsx (a versão 2D disso): `webkitRelativePath` vem
  // tipo "Pack de Modelos/Móveis/cadeira.glb", agrupa por SUBPASTA IMEDIATA
  // (penúltimo segmento do caminho) e cria/reaproveita uma pasta da
  // biblioteca por grupo, em vez de jogar tudo solto. Arquivo direto na raiz
  // da pasta escolhida (sem subpasta) cai em "sem pasta". Diferente da
  // versão 2D, aqui NÃO filtra por `image/*` — a pasta pode ter tanto
  // imagens quanto modelos 3D misturados (cada arquivo já sabe o próprio
  // `kind` pela extensão, ver modelKindFromFileName em lib/modelLibrary.ts).
  const onImportFolder = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    if (list.length === 0) return;
    setImporting({ done: 0, total: list.length });

    const groups = new Map<string, File[]>(); // nome da subpasta -> arquivos
    const noGroup: File[] = [];
    for (const f of list) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const parts = rel.split('/').filter(Boolean);
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
        const created = await createModelFolder(groupName);
        if (created) {
          folderId = created.id;
          folderIdByName.set(groupName, created.id);
          setFolders((cur) => [...cur, created]);
        }
      }
      await uploadModelAssets(groupFiles, folderId ?? null, () => {
        done++;
        setImporting({ done, total });
      });
    }
    if (noGroup.length > 0) {
      await uploadModelAssets(noGroup, null, () => {
        done++;
        setImporting({ done, total });
      });
    }

    setImporting(null);
    refresh();
  };

  const onRename = async (a: ModelAsset) => {
    const name = await askText('Nome do item:', a.name);
    if (!name?.trim() || name === a.name) return;
    void renameModelAsset(a.id, name.trim()).then(() => refresh());
  };

  const onMove = (a: ModelAsset, folderId: string) => {
    void moveModelAsset(a.id, folderId || null).then(() => refresh());
  };

  const onDelete = (a: ModelAsset) => {
    if (!confirm(`Excluir "${a.name}" de vez?`)) return;
    void deleteModelAsset(a.id).then(() => refresh());
  };

  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 6 }}>
        <span className={`chip ${kindFilter === 'all' ? 'on' : ''}`} onClick={() => setKindFilter('all')}>
          Tudo
        </span>
        <span className={`chip ${kindFilter === 'image' ? 'on' : ''}`} onClick={() => setKindFilter('image')}>
          🖼 Imagens
        </span>
        <span className={`chip ${kindFilter === 'model' ? 'on' : ''}`} onClick={() => setKindFilter('model')}>
          🧊 Modelos 3D
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

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="primary" style={{ flex: 'none' }} onClick={() => fileInputRef.current?.click()}>
          Importar{importing ? `… (${importing.done}/${importing.total})` : ''}
        </button>
        <button className="ghost" style={{ flex: 'none' }} onClick={() => folderInputRef.current?.click()}>
          Importar pasta inteira
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={`image/*,${MODEL_FILE_ACCEPT}`}
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
          accept={`image/*,${MODEL_FILE_ACCEPT}`}
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
        Aceita imagem (objeto em pé, decalque ou chão) e modelo 3D (.glb/.gltf/.fbx/.stl) no mesmo
        botão. Depois de importado, clique ou arraste o item pro cenário — fica aqui pronto pra
        reaproveitar sem reimportar. "Importar pasta inteira" cria uma pasta da biblioteca pra cada
        subpasta automaticamente — mantém a organização que você já tem no computador.
      </p>

      {loading && <p className="faint">Carregando biblioteca…</p>}
      {!loading && visible.length === 0 && (
        <p className="empty">
          {items.length === 0
            ? 'Nenhum item importado ainda. Clique em "Importar" pra trazer imagens ou modelos 3D.'
            : 'Nenhum item nesse filtro ainda.'}
        </p>
      )}

      <div className="asset-grid">
        {visible.map((a) => (
          <div className="asset-card" key={a.id}>
            {a.kind === 'model' ? (
              <span
                className="asset-thumb asset-thumb-draggable proto3d-model-thumb"
                title="Arraste pro cenário, ou clique pra plantar no centro"
                draggable
                onClick={() => onPlant(a)}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    MODEL_DRAG_MIME,
                    JSON.stringify({ id: a.id, name: a.name, ext: a.ext, kind: a.kind }),
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                🧊
              </span>
            ) : (
              <div
                className="asset-thumb asset-thumb-draggable"
                style={{ backgroundImage: `url(${modelAssetUrl(a.id)})` }}
                draggable
                title="Arraste pro cenário (objeto em pé), ou clique pra plantar no centro"
                onClick={() => onPlant(a)}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    MODEL_DRAG_MIME,
                    JSON.stringify({ id: a.id, name: a.name, ext: a.ext, kind: a.kind }),
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              />
            )}
            <span className="asset-name" title={a.name}>
              {a.name}
            </span>
            {a.kind === 'image' && (
              <div className="asset-actions">
                <button className="small ghost" title="Plantar como decalque de chão" onClick={() => onPlantAsPatch(a)}>
                  🟫
                </button>
                <button className="small ghost" title="Usar como textura de chão" onClick={() => onPlantAsGround(a)}>
                  🛣️
                </button>
              </div>
            )}
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
