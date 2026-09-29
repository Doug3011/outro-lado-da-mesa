import { useEffect, useRef, useState } from 'react';
import type { MusicFolder, MusicTrack } from '../types';
import {
  createMusicFolder,
  deleteMusicFolder,
  deleteTrack,
  fetchMusicLibrary,
  moveTrack,
  renameTrack,
  trackUrl,
  uploadTracks,
} from '../lib/musicLibrary';
import { askText } from '../state/promptDialog';

// Biblioteca de música: pastas + faixas, importadas do PC do mestre. Usada em
// dois lugares — menu principal ("Músicas", só gerencia/pré-ouve) e dentro da
// mesa (aba Músicas do mestre, onde escolher uma faixa toca pra todo mundo).
// `mode="preview"` toca localmente (sem afetar ninguém); `mode="room"` chama
// `onSelectTrack` pra quem estiver por fora decidir o que fazer (tocar synced).
export function MusicLibraryManager({
  mode,
  activeTrackId,
  isPlaying,
  onSelectTrack,
  roomHost,
}: {
  mode: 'preview' | 'room';
  activeTrackId?: string | null;
  isPlaying?: boolean;
  onSelectTrack?: (trackId: string) => void;
  // host:porta da sala — só passado quando usado de dentro de uma mesa (ver
  // musicLibrary.ts); sem isso, fica relativo ao próprio servidor local
  // (uso no menu principal, fora de mesa).
  roomHost?: string | null;
}) {
  const [folders, setFolders] = useState<MusicFolder[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const refresh = () => {
    void fetchMusicLibrary(roomHost).then((data) => {
      setFolders(data.folders);
      setTracks(data.tracks);
      setLoading(false);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [roomHost]);

  const visible = tracks
    .filter((t) => filter === 'all' || t.folderId === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddFolder = async () => {
    const name = await askText('Nome da pasta:');
    if (!name?.trim()) return;
    void createMusicFolder(name.trim(), roomHost).then(() => refresh());
  };

  const onRemoveFolder = (id: string) => {
    if (!confirm('Excluir a pasta? As faixas dela não são apagadas, só ficam sem pasta.')) return;
    void deleteMusicFolder(id, roomHost).then(() => {
      if (filter === id) setFilter('all');
      refresh();
    });
  };

  const onImportFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    setImporting({ done: 0, total: list.length });
    void uploadTracks(
      list,
      filter === 'all' ? null : filter,
      (done, total) => setImporting({ done, total }),
      roomHost,
    ).then(() => {
      setImporting(null);
      refresh();
    });
  };

  const onRename = async (t: MusicTrack) => {
    const name = await askText('Nome da faixa:', t.name);
    if (!name?.trim() || name === t.name) return;
    void renameTrack(t.id, name.trim(), roomHost).then(() => refresh());
  };

  const onMove = (t: MusicTrack, folderId: string) => {
    void moveTrack(t.id, folderId || null, roomHost).then(() => refresh());
  };

  const onDelete = (t: MusicTrack) => {
    if (!confirm(`Excluir "${t.name}" de vez?`)) return;
    if (previewingId === t.id) {
      previewRef.current?.pause();
      setPreviewingId(null);
    }
    void deleteTrack(t.id, roomHost).then(() => refresh());
  };

  const togglePreview = (t: MusicTrack) => {
    const audio = previewRef.current;
    if (!audio) return;
    if (previewingId === t.id) {
      audio.pause();
      setPreviewingId(null);
      return;
    }
    audio.src = trackUrl(t.id, roomHost);
    audio.currentTime = 0;
    void audio.play();
    setPreviewingId(t.id);
  };

  return (
    <div>
      {mode === 'preview' && (
        <audio ref={previewRef} onEnded={() => setPreviewingId(null)} style={{ display: 'none' }} />
      )}

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
        <button
          className="primary music-import-btn"
          style={{ flex: 'none' }}
          onClick={() => fileInputRef.current?.click()}
        >
          Importar música{importing ? `… (${importing.done}/${importing.total})` : ''}
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
            ? 'Nenhuma música importada ainda. Clique em "Importar música" — pode selecionar vários arquivos de uma vez.'
            : 'Nenhuma música nessa pasta ainda.'}
        </p>
      )}

      {visible.map((t) => {
        const isActive = mode === 'room' && activeTrackId === t.id;
        const isPreviewing = mode === 'preview' && previewingId === t.id;
        return (
          <div className={`list-item music-row ${isActive ? 'music-row-active' : ''}`} key={t.id}>
            <button
              className="small"
              title={mode === 'room' ? 'Tocar pra mesa toda' : 'Ouvir prévia'}
              onClick={() => (mode === 'room' ? onSelectTrack?.(t.id) : togglePreview(t))}
            >
              {isActive && isPlaying ? '⏸' : isPreviewing ? '⏸' : '▶'}
            </button>
            <span className="music-row-name" title={t.name}>
              {t.name}
              {isActive && <span className="faint"> · tocando na mesa</span>}
            </span>
            <select
              className="small"
              style={{ flex: 'none', width: 120 }}
              value={t.folderId ?? ''}
              onChange={(e) => onMove(t, e.target.value)}
            >
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
        );
      })}
    </div>
  );
}
