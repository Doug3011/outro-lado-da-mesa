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
import { CloseFloatIcon, PauseIcon, PencilIcon, PlayIcon, UploadIcon } from './icons';

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
  // Só usado no visual novo (Área do mestre, tema Energia, `mode="preview"`)
  // pro realce ao arrastar um arquivo por cima do estado vazio — o mesmo
  // `onImportFiles` de sempre é chamado no drop, nada na lógica de upload
  // muda. Dentro de uma mesa (`mode="room"`, visual antigo) fica sem uso.
  const [dragOver, setDragOver] = useState(false);

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

  const audioEl = mode === 'preview' && (
    <audio ref={previewRef} onEnded={() => setPreviewingId(null)} style={{ display: 'none' }} />
  );

  // Visual novo (Área do mestre, tema Energia) — só quando `mode="preview"`,
  // ou seja, só fora de mesa (ver Home.tsx). Dentro de uma mesa (`mode="room"`,
  // MusicPanel.tsx) continua no visual antigo mais abaixo, intocado.
  if (mode === 'preview') {
    return (
      <>
        {audioEl}

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
          <button
            className="rd-gm-btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            {importing ? `IMPORTANDO… (${importing.done}/${importing.total})` : 'IMPORTAR MÚSICA'}
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
            <span className="rd-gm-empty-title">Importar música</span>
            <span className="rd-gm-empty-sub">
              {filter === 'all'
                ? 'Nenhuma música importada ainda. Clique ou arraste os arquivos aqui — pode soltar vários de uma vez.'
                : 'Nenhuma música nessa pasta ainda.'}
            </span>
          </button>
        )}

        {!loading && visible.length > 0 && (
          <div className="rd-gm-list">
            {visible.map((t) => {
              const isPreviewing = previewingId === t.id;
              return (
                <div className={`rd-gm-row${isPreviewing ? ' playing' : ''}`} key={t.id}>
                  <button
                    className="rd-gm-row-play"
                    title={isPreviewing ? 'Pausar prévia' : 'Ouvir prévia'}
                    onClick={() => togglePreview(t)}
                  >
                    {isPreviewing ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <div className="rd-gm-row-info">
                    <span className="rd-gm-row-name" title={t.name}>
                      {t.name}
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
                  <button className="rd-gm-icon-btn" title="Renomear" onClick={() => onRename(t)}>
                    <PencilIcon />
                  </button>
                  <button className="rd-gm-icon-btn" title="Excluir" onClick={() => onDelete(t)}>
                    <CloseFloatIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {audioEl}

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

      {/* Chegando aqui, `mode` só pode ser 'room' — o `mode === 'preview'`
          já retornou lá em cima. Lista pra escolher a faixa que toca pra
          mesa toda (MusicPanel.tsx); a lista de prévia (ouvir sozinho) é
          só pro visual novo, no branch acima. */}
      {visible.map((t) => {
        const isActive = activeTrackId === t.id;
        return (
          <div className={`list-item music-row ${isActive ? 'music-row-active' : ''}`} key={t.id}>
            <button className="small" title="Tocar pra mesa toda" onClick={() => onSelectTrack?.(t.id)}>
              {isActive && isPlaying ? '⏸' : '▶'}
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
