import { useEffect, useRef } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { ambientClipUrl } from '../lib/ambientLibrary';
import { connectAudioElement } from '../lib/avMix';

const VOLUME_KEY = 'ordem:ambient-volume';

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.8;
}

// Motor do soundboard — sem UI própria (só o AmbientPanel tem UI), fica
// montado direto no Room (mesmo motivo do MusicPlayer: não pode viver dentro
// da aba, que remonta a cada troca). Ao contrário da música, não há "estado
// tocando" nenhum pra sincronizar — é só reagir ao `ambientCue` (um disparo
// efêmero) criando um `<audio>` novo por vez, tocando uma vez e descartando.
// Vários sons podem tocar sobrepostos (cada disparo ganha seu próprio
// elemento de áudio) — soundboard de verdade, não troca o que já está tocando.
export function AmbientPlayer() {
  const { me } = useIdentity();
  const ambientCue = useTableStore((s) => s.ambientCue);
  const code = useTableStore((s) => s.code);
  const roomMode = useTableStore((s) => s.mode);
  const lastNonceRef = useRef<string | null>(null);
  // Vários efeitos podem tocar sobrepostos (soundboard de verdade) — guarda
  // TODOS os <audio> ativos no momento, não só o último, pra conseguir
  // ajustar o volume de todos ao vivo quando o slider mexe (ver useEffect
  // de baixo). Cada um se remove sozinho da lista quando termina.
  const activeAudiosRef = useRef<Set<HTMLAudioElement>>(new Set());

  useEffect(() => {
    if (!ambientCue || ambientCue.nonce === lastNonceRef.current) return;
    lastNonceRef.current = ambientCue.nonce;
    // Jogador numa mesa pela internet não busca o efeito aqui — não alcança
    // o servidor local do mestre (só `code` em rede local, "host:porta", é
    // um endereço válido pra isso) e de qualquer forma vai ouvir o efeito já
    // misturado no áudio recebido via WebRTC (RemoteAudioSink.tsx), igual já
    // acontece com a música — ver `connectAudioElement` abaixo.
    if (!me.isGM && roomMode !== 'lan') return;
    const roomHostForClip = !me.isGM && roomMode === 'lan' ? code : null;
    const audio = new Audio(ambientClipUrl(ambientCue.clipId, roomHostForClip));
    audio.volume = readVolume();
    // Mesa pela internet: manda esse efeito também pro mix que vai pros
    // jogadores via WebRTC (mesmo grafo de áudio da música, ver avMix.ts) —
    // como o volume do elemento é aplicado ANTES de entrar no grafo, o
    // slider de volume do mestre (readVolume acima / evento de baixo) já
    // controla sozinho o quanto o efeito sai pra mesa toda, sem precisar de
    // um controle de volume "de saída" separado.
    if (me.isGM && roomMode !== 'lan') connectAudioElement(audio);
    activeAudiosRef.current.add(audio);
    const cleanup = () => activeAudiosRef.current.delete(audio);
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    void audio.play().catch(() => {
      // autoplay bloqueado é bem mais raro aqui do que na música — o disparo
      // normalmente nasce de um clique de verdade (o próprio mestre, pra ele
      // mesmo); pros outros, só não toca silenciosamente, sem travar nada.
      cleanup();
    });
  }, [ambientCue, code, me.isGM, roomMode]);

  // Achado num bug reportado pelo usuário: o volume só valia pro som
  // seguinte, nunca pro que já estava tocando — mesmo padrão que a música
  // já usa (MusicPanel/MusicPlayer), aplicado em TODOS os áudios ativos de
  // uma vez (aqui pode ter mais de um sobreposto, diferente da música).
  useEffect(() => {
    const onVolume = (e: Event) => {
      const v = (e as CustomEvent<number>).detail;
      for (const audio of activeAudiosRef.current) audio.volume = v;
    };
    window.addEventListener('ordem:ambient-volume', onVolume);
    return () => window.removeEventListener('ordem:ambient-volume', onVolume);
  }, []);

  return null;
}
