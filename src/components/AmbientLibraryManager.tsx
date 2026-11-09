import { useEffect, useRef, useState } from 'react';
import type { AmbientClip, AssetFolder } from '../types';
import {
  ambientClipUrl,
  createAmbientFolder,
  deleteAmbientClip,
  deleteAmbientFolder,
  fetchAmbientLibrary,
  moveAmbientClip,
  renameAmbientClip,
  uploadAmbientClips,
} from '../lib/ambientLibrary';
import { askText } from '../state/promptDialog';
import { CloseFloatIcon, PauseIcon, PencilIcon, PlayIcon, UploadIcon } from './icons';

// Biblioteca de sons ambiente: pastas + clipes, mesmo padrão de
// MusicLibraryManager.tsx — a diferença é que não existe "faixa tocando
// agora" nenhuma (soundboard, não player): `mode="preview"` ouve localmente
// (Área do Mestre, fora de mesa, só pra conferir o som); `mode="room"` chama
// `onTrigger` pra tocar pra mesa toda (ver AmbientPanel.tsx/playAmbient).
export function AmbientLibraryManager({
  mode,
  onTrigger,
  roomHost,
}: {
  mode: 'preview' | 'room';
  onTrigger?: (clipId: string) => void;
  roomHost?: string | null;
}) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [clips, setClips] = useState<AmbientClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  // Só usado no visual novo (Área do mestre, tema Energia, `mode="preview"`)
  // pro realce ao arrastar por cima do estado vazio — chama o mesmo
  // `onImportFiles` de sempre no drop, nada na lógica de upload muda.
  const [dragOver, setDragOver] = useState(false);

  const refresh = () => {
    void fetchAmbientLibrary(roomHost).then((data) => {
      setFolders(data.folders);
      setClips(data.items);
      setLoading(false);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [roomHost]);

  const visible = clips
    .filter((c) => filter === 'all' || c.folderId === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createAmbientFolder(name.trim(), roomHost).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? Os sons dela não são apagados, só ficam sem pasta.')) return;
    void deleteAmbientFolder(id, roomHost).then(() => {
      if (filter === id) setFilter('all');
      refresh();
    });
  };

  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    setImporting({ done: 0, total: list.length });
    void uploadAmbientClips(
      list,
      filter === 'all' ? null : filter,
      (done, total) => setImporting({ done, total }),
      roomHost,
    ).then(() => {
      setImporting(null);
      refresh();
    });
  };

  const onRename = async (c: AmbientClip) => {
    const name = await askText('Nome do som:', c.name);
    if (!name?.trim() || name === c.name) return;
    void renameAmbientClip(c.id, name.trim(), roomHost).then(() => refresh());
  };

  const onMove = (c: AmbientClip, folderId: string) => {
    void moveAmbientClip(c.id, folderId || null, roomHost).then(() => refresh());
  };

  const onDelete = (c: AmbientClip) => {
    if (!confirm(`Excluir "${c.name}" de vez?`)) return;
    if (previewingId === c.id) {
      previewRef.current?.pause();
      setPreviewingId(null);
    }
    void deleteAmbientClip(c.id, roomHost).then(() => refresh());
  };

  const togglePreview = (c: AmbientClip) => {
    const audio = previewRef.current;
    if (!audio) return;
    if (previewingId === c.id) {
      audio.pause();
      setPreviewingId(null);
      return;
    }
    audio.src = ambientClipUrl(c.id, roomHost);
    audio.currentTime = 0;
    void audio.play();
    setPreviewingId(c.id);
  };

  const audioEl = mode === 'preview' && (
    <audio ref={previewRef} onEnded={() => setPreviewingId(null)} style={{ display: 'none' }} />
  );

  // Visual novo (Área do mestre, tema Energia) — só quando `mode="preview"`,
  // ou seja, só fora de mesa (ver Home.tsx). Dentro de uma mesa (`mode="room"`,
  // AmbientPanel.tsx, soundboard de pads) continua no visual antigo abaixo.
  if (mode === 'preview') {
    return (
      <>
        {audioEl}

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
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => {
              onImportFiles(e.target.files);
              e.target.value = '';
            }}
          />
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
            <span className="rd-gm-empty-title">Importar som</span>
            <span className="rd-gm-empty-sub">
              {filter === 'all'
                ? 'Nenhum som importado ainda. Clique ou arraste os arquivos aqui — pode soltar vários de uma vez.'
                : 'Nenhum som nessa pasta ainda.'}
            </span>
          </button>
        )}

        {!loading && visible.length > 0 && (
          <>
            <div className="rd-gm-toolbar" style={{ marginTop: -4 }}>
              <button className="rd-gm-btn-primary" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon />
                {importing ? `IMPORTANDO… (${importing.done}/${importing.total})` : 'IMPORTAR SOM'}
              </button>
            </div>
            <div className="rd-gm-list">
              {visible.map((c) => {
                const isPreviewing = previewingId === c.id;
                return (
                  <div className={`rd-gm-row${isPreviewing ? ' playing' : ''}`} key={c.id}>
                    <button
                      className="rd-gm-row-play"
                      title="Ouvir prévia"
                      onClick={() => togglePreview(c)}
                    >
                      {isPreviewing ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <div className="rd-gm-row-info">
                      <span className="rd-gm-row-name" title={c.name}>
                        {c.name}
                      </span>
                    </div>
                    {isPreviewing && (
                      <div className="rd-gm-row-eq" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    <select
                      className="rd-gm-select"
                      style={{ width: 120 }}
                      value={c.folderId ?? ''}
                      onChange={(e) => onMove(c, e.target.value)}
                    >
                      <option value="">sem pasta</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <button className="rd-gm-icon-btn" title="Renomear" onClick={() => onRename(c)}>
                      <PencilIcon />
                    </button>
                    <button className="rd-gm-icon-btn" title="Excluir" onClick={() => onDelete(c)}>
                      <CloseFloatIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      {audioEl}

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
        <button
          className="primary music-import-btn"
          style={{ flex: 'none' }}
          onClick={() => fileInputRef.current?.click()}
        >
          Importar som{importing ? `… (${importing.done}/${importing.total})` : ''}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
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
            ? 'Nenhum som importado ainda. Clique em "Importar som" — pode selecionar vários arquivos de uma vez.'
            : 'Nenhum som nessa pasta ainda.'}
        </p>
      )}

      {/* Chegando aqui, `mode` só pode ser 'room' — o `mode === 'preview'`
          já retornou lá em cima. Soundboard de pads pra tocar pra mesa
          toda (AmbientPanel.tsx); a lista de prévia (pra gerenciar/ouvir
          sozinho) é só pro visual novo, no branch acima. */}
      <div className="ambient-board">
        {visible.map((c) => (
          <button key={c.id} className="ambient-pad" title={`Tocar "${c.name}" pra mesa toda`} onClick={() => onTrigger?.(c.id)}>
            <span className="ambient-pad-ico">🔊</span>
            <span className="ambient-pad-name">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
