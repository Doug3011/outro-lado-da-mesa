import { useEffect, useRef } from 'react';
import { useTableStore } from '../store/useTableStore';

const VOLUME_KEY = 'ordem:music-volume';

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.7;
}

// Toca o áudio recebido do mestre via WebRTC (música + futuramente outros
// sons) numa mesa pela internet — só montado pro JOGADOR (ver Room.tsx).
// Sem UI própria, mesmo padrão "motor sem rosto" do MusicPlayer.tsx — usa o
// mesmo slider/evento 'ordem:music-volume' do MusicPanel (é o mesmo áudio
// pro jogador, só que chegando por WebRTC em vez de arquivo baixado).
export function RemoteAudioSink() {
  const stream = useTableStore((s) => s.remoteAvStream);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;
    audioRef.current.volume = readVolume();
  }

  useEffect(() => {
    const onVolume = (e: Event) => {
      const audio = audioRef.current;
      if (audio) audio.volume = (e as CustomEvent<number>).detail;
    };
    window.addEventListener('ordem:music-volume', onVolume);
    return () => window.removeEventListener('ordem:music-volume', onVolume);
  }, []);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.srcObject = stream;
    if (stream) {
      void audio.play().catch(() => {
        // autoplay bloqueado sem gesto do usuário — tenta de novo no
        // primeiro clique/tecla, mesmo padrão do MusicPlayer.tsx.
        const retry = () => {
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
          void audio.play().catch(() => {});
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
    }
  }, [stream]);

  return null;
}
