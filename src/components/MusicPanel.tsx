import { useEffect, useState } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { fetchMusicLibrary } from '../lib/musicLibrary';
import { retryMusicPlay } from '../lib/musicAudio';
import type { MusicTrack } from '../types';
import { MusicLibraryManager } from './MusicLibraryManager';

const VOLUME_KEY = 'ordem:music-volume';

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.7;
}

// Aba "Músicas" da mesa. O mestre importa/organiza e controla o que toca pra
// todo mundo (play/pause/trocar/loop); cada participante (incluindo o
// mestre) tem seu próprio volume local — não é sincronizado, é só do
// alto-falante de cada um.
export function MusicPanel() {
  const { me } = useIdentity();
  const music = useTableStore((s) => s.music);
  const setMusicState = useTableStore((s) => s.setMusicState);
  const code = useTableStore((s) => s.code);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [volume, setVolume] = useState(readVolume);
  const [blocked, setBlocked] = useState(false);

  // `code` (o host:porta da sala) garante que isso bate no servidor certo
  // mesmo pra quem entrou na mesa de outro computador — ver comentário em
  // src/lib/musicLibrary.ts (apiBase). Sem isso, um jogador só enxergava a
  // biblioteca vazia do PRÓPRIO app, nunca a do mestre.
  useEffect(() => {
    void fetchMusicLibrary(code).then((d) => setTracks(d.tracks));
  }, [music.trackId, code]);

  // Se o navegador bloquear o autoplay (comum em quem entra por um navegador
  // comum, sem ser pelo app instalado), MusicPlayer.tsx avisa por aqui — mostra
  // um botão manual, já que um clique de verdade sempre libera o áudio.
  useEffect(() => {
    const onBlocked = (e: Event) => setBlocked((e as CustomEvent<boolean>).detail);
    window.addEventListener('ordem:music-blocked', onBlocked);
    return () => window.removeEventListener('ordem:music-blocked', onBlocked);
  }, []);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    window.dispatchEvent(new CustomEvent('ordem:music-volume', { detail: volume }));
  }, [volume]);

  const current = music.trackId ? tracks.find((t) => t.id === music.trackId) : null;

  const play = (trackId: string) => {
    setMusicState({ trackId, playing: true, startedAt: Date.now(), positionAtStart: 0, loop: music.loop });
  };
  const togglePlayPause = () => {
    if (!music.trackId) return;
    if (music.playing) {
      const elapsed = music.positionAtStart + (Date.now() - music.startedAt) / 1000;
      setMusicState({ ...music, playing: false, positionAtStart: Math.max(0, elapsed) });
    } else {
      setMusicState({ ...music, playing: true, startedAt: Date.now() });
    }
  };
  const stop = () => setMusicState({ trackId: null, playing: false, startedAt: 0, positionAtStart: 0, loop: music.loop });
  const toggleLoop = () => setMusicState({ ...music, loop: !music.loop });

  return (
    <div className="music-panel">
      <div className="music-now-playing">
        <div className="section-title" style={{ margin: 0 }}>
          Tocando agora
        </div>
        {!current && <p className="faint">Nada tocando. Escolha uma faixa na lista abaixo.</p>}
        {current && blocked && (
          <button
            className="small primary"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={() => {
              retryMusicPlay();
              setBlocked(false);
            }}
          >
            ▶ Tocar (o navegador bloqueou o som automático)
          </button>
        )}
        {current && (
          <div className="music-now-row">
            <span className="music-now-name">{current.name}</span>
            {me.isGM && (
              <div className="chip-row" style={{ flex: 'none' }}>
                <button className="small" onClick={togglePlayPause}>
                  {music.playing ? '⏸ Pausar' : '▶ Tocar'}
                </button>
                <button
                  className={`small ${music.loop ? 'primary' : ''}`}
                  title="Repetir esta faixa ao terminar (senão passa pra próxima da pasta)"
                  onClick={toggleLoop}
                >
                  🔁 {music.loop ? 'Loop' : 'Próxima'}
                </button>
                <button className="small ghost" onClick={stop}>
                  ⏹ Parar
                </button>
              </div>
            )}
          </div>
        )}
        <div className="field" style={{ marginTop: 10, maxWidth: 260 }}>
          <label>🔊 Seu volume (só no seu aparelho)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>

      {me.isGM ? (
        <>
          <div className="section-title">Biblioteca</div>
          <MusicLibraryManager
            mode="room"
            activeTrackId={music.trackId}
            isPlaying={music.playing}
            onSelectTrack={play}
            roomHost={code}
          />
        </>
      ) : (
        <p className="faint" style={{ fontSize: 12 }}>
          Só o mestre escolhe e controla a música da mesa — você só ajusta o seu volume.
        </p>
      )}
    </div>
  );
}
