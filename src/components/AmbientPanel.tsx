import { useEffect, useState } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { useTableStore } from '../store/useTableStore';
import { AmbientLibraryManager } from './AmbientLibraryManager';

const VOLUME_KEY = 'ordem:ambient-volume';

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.8;
}

// Aba "Sons" da mesa — soundboard de sons ambiente, área separada da
// música (pedido do usuário). Só o mestre dispara (mesmo critério da
// música: evita cada um tocando efeito por conta própria); cada um ajusta
// só o PRÓPRIO volume dos efeitos, independente do volume da música.
export function AmbientPanel() {
  const { me } = useIdentity();
  const playAmbient = useTableStore((s) => s.playAmbient);
  const code = useTableStore((s) => s.code);
  const [volume, setVolume] = useState(readVolume);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  return (
    <div className="music-panel">
      <div className="field" style={{ marginBottom: 14, maxWidth: 260 }}>
        <label>🔊 Seu volume dos efeitos (só no seu aparelho)</label>
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
          <AmbientLibraryManager mode="room" onTrigger={playAmbient} roomHost={code} />
        </>
      ) : (
        <p className="faint" style={{ fontSize: 12 }}>
          Só o mestre dispara os sons ambiente — você só ajusta o seu volume.
        </p>
      )}
    </div>
  );
}
