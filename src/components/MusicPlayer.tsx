import { useEffect, useRef } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { fetchMusicLibrary, trackUrl } from '../lib/musicLibrary';
import { setMusicAudioEl } from '../lib/musicAudio';

const VOLUME_KEY = 'ordem:music-volume';
const DRIFT_TOLERANCE_S = 1.2;

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.7;
}

// Motor de reprodução da mesa — sem UI própria, só o <audio> de verdade.
// Fica montado direto no Room (não dentro da aba Músicas), porque o painel
// lateral remonta toda vez que o mestre troca de aba — se o áudio vivesse lá
// dentro, a música pararia sozinha ao abrir "Dados" ou "Ficha".
export function MusicPlayer() {
  const { me } = useIdentity();
  const music = useTableStore((s) => s.music);
  const setMusicState = useTableStore((s) => s.setMusicState);
  const code = useTableStore((s) => s.code);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    setMusicAudioEl(audioRef.current);
  }

  // Pára o áudio de vez quando o MusicPlayer desmonta (saiu da mesa — Room
  // inteiro desmonta na troca de rota). Sem isso o <audio> criado via
  // `new Audio()` não tem dono nenhum na árvore do React pra parar sozinho —
  // ele só some quando o navegador decidir, o que pode nunca acontecer
  // enquanto estiver tocando. Efeito separado, só de limpeza (por isso o
  // corpo fica vazio: a única coisa que interessa é o `return` da limpeza).
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      setMusicAudioEl(null);
    };
  }, []);

  // volume é só local (cada um mexe no seu) — lê do storage e escuta o evento
  // que o MusicPanel dispara quando o slider muda, sem precisar remontar nada.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = readVolume();
    const onVolume = (e: Event) => {
      const v = (e as CustomEvent<number>).detail;
      if (audio) audio.volume = v;
    };
    window.addEventListener('ordem:music-volume', onVolume);
    return () => window.removeEventListener('ordem:music-volume', onVolume);
  }, []);

  // sincroniza posição/estado toda vez que o estado de música da mesa muda
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!music.trackId) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }
    const src = trackUrl(music.trackId, code);
    if (!audio.src.endsWith(src)) {
      audio.src = src;
    }
    audio.loop = music.loop;
    const target = music.playing
      ? music.positionAtStart + (Date.now() - music.startedAt) / 1000
      : music.positionAtStart;
    if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE_S) {
      audio.currentTime = Math.max(0, target);
    }
    if (music.playing) {
      audio
        .play()
        .then(() => window.dispatchEvent(new CustomEvent('ordem:music-blocked', { detail: false })))
        .catch(() => {
          // navegador bloqueou autoplay sem gesto do usuário (comum em quem
          // entra pela mesa por um navegador comum, não pelo app Electron —
          // esse já libera autoplay via linha de comando). Avisa a aba
          // Músicas pra mostrar um botão manual, e tenta de novo sozinho no
          // primeiro clique/tecla que a pessoa der em qualquer lugar da página.
          window.dispatchEvent(new CustomEvent('ordem:music-blocked', { detail: true }));
          const retry = () => {
            window.removeEventListener('pointerdown', retry);
            window.removeEventListener('keydown', retry);
            void audio
              .play()
              .then(() => window.dispatchEvent(new CustomEvent('ordem:music-blocked', { detail: false })))
              .catch(() => {});
          };
          window.addEventListener('pointerdown', retry, { once: true });
          window.addEventListener('keydown', retry, { once: true });
        });
    } else {
      audio.pause();
    }
  }, [music.trackId, music.playing, music.startedAt, music.positionAtStart, music.loop, code]);

  // avança pra próxima faixa da mesma pasta ao terminar — só quando não está
  // em loop (loop de verdade usa o `audio.loop` nativo, então isso nem
  // dispara nesse caso) e só o mestre decide (evita cada cliente escolher
  // uma "próxima" diferente e brigar por telefone sem fio).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !me.isGM) return;
    const onEnded = () => {
      if (!music.trackId) return;
      void fetchMusicLibrary().then(({ tracks }) => {
        const cur = tracks.find((t) => t.id === music.trackId);
        if (!cur) return;
        const siblings = tracks
          .filter((t) => t.folderId === cur.folderId)
          .sort((a, b) => a.name.localeCompare(b.name));
        const i = siblings.findIndex((t) => t.id === cur.id);
        const next = siblings.length > 1 ? siblings[(i + 1) % siblings.length] : null;
        if (next) {
          setMusicState({
            trackId: next.id,
            playing: true,
            startedAt: Date.now(),
            positionAtStart: 0,
            loop: music.loop,
          });
        } else {
          setMusicState({ trackId: cur.id, playing: false, startedAt: 0, positionAtStart: 0, loop: music.loop });
        }
      });
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.isGM, music.trackId, music.loop]);

  return null;
}
