import { useEffect, useRef } from 'react';
import { useTableStore } from '../store/useTableStore';

// Toca o áudio recebido do mestre via WebRTC (música + futuramente outros
// sons) numa mesa pela internet — só montado pro JOGADOR (ver Room.tsx).
// Sem UI própria, mesmo padrão "motor sem rosto" do MusicPlayer.tsx.
export function RemoteAudioSink() {
  const stream = useTableStore((s) => s.remoteAvStream);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;
  }

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
