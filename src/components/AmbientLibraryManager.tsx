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

  return (
    <div>
      {mode === 'preview' && (
        <audio ref={previewRef} onEnded={() => setPreviewingId(null)} style={{ display: 'none' }} />
      )}

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

      <div className={mode === 'room' ? 'ambient-board' : undefined}>
        {visible.map((c) => {
          const isPreviewing = mode === 'preview' && previewingId === c.id;
          if (mode === 'room') {
            return (
              <button key={c.id} className="ambient-pad" title={`Tocar "${c.name}" pra mesa toda`} onClick={() => onTrigger?.(c.id)}>
                <span className="ambient-pad-ico">🔊</span>
                <span className="ambient-pad-name">{c.name}</span>
              </button>
            );
          }
          return (
            <div className="list-item music-row" key={c.id}>
              <button className="small" title="Ouvir prévia" onClick={() => togglePreview(c)}>
                {isPreviewing ? '⏸' : '▶'}
              </button>
              <span className="music-row-name" title={c.name}>
                {c.name}
              </span>
              <select
                className="small"
                style={{ flex: 'none', width: 120 }}
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
              <button className="small ghost" title="Renomear" onClick={() => onRename(c)}>
                ✎
              </button>
              <button className="small ghost" title="Excluir" onClick={() => onDelete(c)}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
