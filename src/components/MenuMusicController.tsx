import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenuMusicStore } from '../state/menuMusic';

// Motor de áudio invisível da música do menu — fica montado o tempo todo em
// App.tsx (não só dentro de Home) pra sobreviver à troca de rota e pra poder
// ser controlado pela engrenagem de configurações também de dentro da mesa.
// Pausa sozinho ao entrar numa mesa (a mesa tem sua própria música, tocada
// pelo MusicPlayer) e retoma ao voltar pro menu, sem perder a posição.
export function MenuMusicController() {
  const location = useLocation();
  const inMesa = location.pathname.startsWith('/sala/');

  const volume = useMenuMusicStore((s) => s.volume);
  const track = useMenuMusicStore((s) => s.track);
  const playing = useMenuMusicStore((s) => s.playing);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIdRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || trackIdRef.current === track.id) return;
    trackIdRef.current = track.id;
    audio.src = track.file;
    audio.currentTime = 0;
    if (playing && !inMesa) audio.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && !inMesa) audio.play().catch(() => {});
    else audio.pause();
  }, [playing, inMesa]);

  return null;
}
