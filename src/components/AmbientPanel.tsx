import { useEffect, useState } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { AmbientLibraryManager } from './AmbientLibraryManager';

const VOLUME_KEY = 'ordem:ambient-volume';

function readVolume(): number {
  // Number(null) é 0 (não NaN) — sem o cheque de null, quem nunca tocou no
  // slider (perfil novo) começava com volume MUDO em vez do padrão, já que
  // `localStorage.getItem` devolve null quando a chave nunca foi escrita.
  const stored = localStorage.getItem(VOLUME_KEY);
  if (stored === null) return 0.8;
  const raw = Number(stored);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.8;
}

// Aba "Sons" da mesa — soundboard de sons ambiente, área separada da
// música (pedido do usuário). Só o mestre dispara (mesmo critério da
// música: evita cada um tocando efeito por conta própria); cada um ajusta
// só o PRÓPRIO volume dos efeitos, independente do volume da música.
export function AmbientPanel() {
  const { me } = useIdentity();
  const playAmbient = useTableStore((s) => s.playAmbient);
  const roomMode = useTableStore((s) => s.mode);
  const [volume, setVolume] = useState(readVolume);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    // Achado num bug reportado pelo usuário ("não está funcionando o
    // controlador de volume"): sem esse evento, o slider só mudava o
    // volume do PRÓXIMO som disparado — um som já tocando (ou vários
    // sobrepostos, o soundboard permite) ficava surdo pra mudança.
    // Mesmo padrão que o volume da música já usa (MusicPanel.tsx).
    window.dispatchEvent(new CustomEvent('ordem:ambient-volume', { detail: volume }));
  }, [volume]);

  return (
    <div className="music-panel">
      <div className="field" style={{ marginBottom: 14, maxWidth: 260 }}>
        <label>
          🔊{' '}
          {me.isGM && roomMode !== 'lan'
            ? 'Volume dos efeitos (numa mesa pela internet, é também o que os players ouvem)'
            : 'Seu volume dos efeitos (só no seu aparelho)'}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {me.isGM ? (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>
            Soundboard
          </div>
          <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
            Clique num som pra tocar pra mesa toda, na hora, por cima do que já estiver tocando.
          </p>
          <AmbientLibraryManager mode="room" onTrigger={playAmbient} />
        </>
      ) : (
        <p className="faint" style={{ fontSize: 12 }}>
          Só o mestre dispara os sons ambiente — você só ajusta o seu volume.
        </p>
      )}
    </div>
  );
}
