import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenuMusicStore } from '../state/menuMusic';
import { loadDiceSoundVolume, saveDiceSoundVolume } from '../lib/diceSound';
import { toggleFullscreen } from '../lib/fullscreen';
import { getWindowState, isElectron, setBorderless, setWindowSize, setWindowedMode } from '../lib/windowControls';
import { GearIcon, SpeakerIcon } from './icons';

const RESOLUTIONS = [
  { label: '1280 × 820', w: 1280, h: 820 },
  { label: '1600 × 900', w: 1600, h: 900 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

// Engrenagem discreta (canto inferior direito, mesmo lugar/estilo do antigo
// botão de tela cheia) que abre o painel de configurações: sons (música do
// menu + dado) e vídeo (resolução, tela cheia, janela sem borda, modo janela).
// Fica montada globalmente (App.tsx) pra funcionar tanto no menu quanto na mesa.
export function SettingsGear() {
  const location = useLocation();
  const inMesa = location.pathname.startsWith('/sala/');

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const menuVolume = useMenuMusicStore((s) => s.volume);
  const setMenuVolume = useMenuMusicStore((s) => s.setVolume);

  const [diceVolume, setDiceVolume] = useState(loadDiceSoundVolume);

  const [isFull, setIsFull] = useState(!!document.fullscreenElement);
  const [isBorderless, setIsBorderless] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!open || !isElectron) return;
    getWindowState().then((s) => setIsBorderless(s.borderless));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const handleDiceVolume = (v: number) => {
    setDiceVolume(v);
    saveDiceSoundVolume(v);
  };

  const handleBorderless = () => {
    const next = !isBorderless;
    setIsBorderless(next);
    setBorderless(next);
  };

  const handleWindowed = () => {
    setIsBorderless(false);
    setWindowedMode();
  };

  return (
    <div className="settings-gear" ref={rootRef}>
      <button
        className="settings-gear-btn"
        title="Configurações"
        aria-label="Configurações"
        onClick={() => setOpen((v) => !v)}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="settings-panel">
          <div className="settings-section-title">Sons</div>

          {!inMesa && (
            <label className="settings-row">
              <span>Música do menu</span>
              <span className="settings-row-control">
                <SpeakerIcon level={menuVolume} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={menuVolume}
                  onChange={(e) => setMenuVolume(Number(e.target.value))}
                  aria-label="Volume da música do menu"
                />
              </span>
            </label>
          )}

          <label className="settings-row">
            <span>Sons de dados</span>
            <span className="settings-row-control">
              <SpeakerIcon level={diceVolume} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={diceVolume}
                onChange={(e) => handleDiceVolume(Number(e.target.value))}
                aria-label="Volume dos sons de dados"
              />
            </span>
          </label>

          <div className="settings-section-title">Configurações de vídeo</div>

          {isElectron && (
            <div className="settings-row settings-row-col">
              <span>Resoluções</span>
              <div className="settings-chip-row">
                {RESOLUTIONS.map((r) => (
                  <button key={r.label} className="settings-chip" onClick={() => setWindowSize(r.w, r.h)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="settings-action" onClick={toggleFullscreen}>
            {isFull ? '⤡ Sair da tela cheia' : '⛶ Tela cheia'}
          </button>

          {isElectron && (
            <>
              <button className="settings-action" onClick={handleBorderless}>
                {isBorderless ? '▢ Tirar janela sem borda' : '▢ Janela sem borda'}
              </button>
              <button className="settings-action" onClick={handleWindowed}>
                🗗 Modo janela
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
