import { useEffect, useRef } from 'react';
import { useTableStore } from '../store/useTableStore';
import { ambientClipUrl } from '../lib/ambientLibrary';

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
  const ambientCue = useTableStore((s) => s.ambientCue);
  const code = useTableStore((s) => s.code);
  const lastNonceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ambientCue || ambientCue.nonce === lastNonceRef.current) return;
    lastNonceRef.current = ambientCue.nonce;
    const audio = new Audio(ambientClipUrl(ambientCue.clipId, code));
    audio.volume = readVolume();
    void audio.play().catch(() => {
      // autoplay bloqueado é bem mais raro aqui do que na música — o disparo
      // normalmente nasce de um clique de verdade (o próprio mestre, pra ele
      // mesmo); pros outros, só não toca silenciosamente, sem travar nada.
    });
  }, [ambientCue, code]);

  return null;
}
