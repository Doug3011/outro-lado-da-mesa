import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenuMusicStore } from '../state/menuMusic';
import { loadDiceSoundVolume, saveDiceSoundVolume } from '../lib/diceSound';
import { toggleFullscreen } from '../lib/fullscreen';
import { getWindowState, isElectron, setBorderless, setWindowSize, setWindowedMode } from '../lib/windowControls';
import {
  DEFAULT_KEYBINDS,
  KEYBIND_LABELS,
  keyLabel,
  loadKeybinds,
  saveKeybinds,
  type KeybindAction,
} from '../lib/keybinds';
import { GearIcon, SpeakerIcon } from './icons';

const RESOLUTIONS = [
  { label: '1280 × 820', w: 1280, h: 820 },
  { label: '1600 × 900', w: 1600, h: 900 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

type SettingsTab = 'sons' | 'video' | 'controles';

// Engrenagem discreta (canto inferior direito) — pedido do usuário: deixou
// de abrir uma "janelinha pequena no canto" e agora abre uma aba cheia
// (overlay de tela inteira, mesmo padrão visual do editor de cenário —
// `.cine-page`), com 3 seções: Sons, Vídeo e a nova Controles (remapear
// cada atalho de teclado individualmente). Fica montada globalmente
// (App.tsx) pra funcionar tanto no menu quanto dentro de uma mesa.
export function SettingsGear() {
  const location = useLocation();
  const inMesa = location.pathname.startsWith('/sala/');

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('sons');

  const menuVolume = useMenuMusicStore((s) => s.volume);
  const setMenuVolume = useMenuMusicStore((s) => s.setVolume);

  const [diceVolume, setDiceVolume] = useState(loadDiceSoundVolume);

  const [isFull, setIsFull] = useState(!!document.fullscreenElement);
  const [isBorderless, setIsBorderless] = useState(false);

  const [binds, setBinds] = useState(loadKeybinds);
  const [capturing, setCapturing] = useState<KeybindAction | null>(null);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!open || !isElectron) return;
    getWindowState().then((s) => setIsBorderless(s.borderless));
  }, [open]);

  // Esc fecha a aba de configurações (igual qualquer overlay de tela
  // cheia do app) — mas não enquanto está capturando uma tecla nova (Esc
  // nesse caso cancela só a captura, ver onCapture abaixo).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !capturing) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, capturing]);

  // Enquanto `capturing` tem uma ação, o PRÓXIMO keydown em qualquer lugar
  // vira o novo atalho dela — Esc cancela sem mudar nada.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      // `stopImmediatePropagation` (não só stopPropagation) — outro
      // listener de teclado nessa mesma tecla (ex.: atalho de token do
      // BattleMap por trás do overlay) também está em `window`, mesmo
      // alvo; stopPropagation não bloqueia listeners irmãos no mesmo
      // elemento, só a propagação pra fora dele.
      e.stopImmediatePropagation();
      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }
      const next = { ...binds, [capturing]: e.code };
      setBinds(next);
      saveKeybinds(next);
      setCapturing(null);
    };
    // capture:true — roda ANTES de listeners em bubble-phase no mesmo
    // `window` (ex.: atalho de token do BattleMap por trás do overlay),
    // não importa a ordem de registro.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, binds]);

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

  const resetKeybinds = () => {
    setBinds({ ...DEFAULT_KEYBINDS });
    saveKeybinds({ ...DEFAULT_KEYBINDS });
  };

  return (
    <div className="settings-gear">
      <button
        className="settings-gear-btn"
        title="Configurações"
        aria-label="Configurações"
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>

      {open && (
        <div className="settings-overlay">
          <div className="settings-topbar">
            <button className="small ghost" onClick={() => setOpen(false)}>
              ← Fechar
            </button>
            <span className="settings-title">Configurações</span>
          </div>

          <div className="chip-row settings-tabs">
            <span className={`chip ${tab === 'sons' ? 'on' : ''}`} onClick={() => setTab('sons')}>
              🔊 Sons
            </span>
            <span className={`chip ${tab === 'video' ? 'on' : ''}`} onClick={() => setTab('video')}>
              🖥 Vídeo
            </span>
            <span className={`chip ${tab === 'controles' ? 'on' : ''}`} onClick={() => setTab('controles')}>
              🎮 Controles
            </span>
          </div>

          <div className="settings-overlay-body">
            {tab === 'sons' && (
              <div className="settings-page-section">
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
              </div>
            )}

            {tab === 'video' && (
              <div className="settings-page-section">
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

            {tab === 'controles' && (
              <div className="settings-page-section">
                <p className="faint" style={{ fontSize: 12, marginBottom: 12 }}>
                  Clique em "trocar" e aperte a tecla que você quer usar — cada pessoa pode deixar
                  do jeito que achar mais confortável. Hoje só os atalhos do token no mapa 2D são
                  configuráveis.
                </p>
                <div className="keybind-list">
                  {(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => (
                    <div className="keybind-row" key={action}>
                      <span className="keybind-label">{KEYBIND_LABELS[action]}</span>
                      <button
                        className={'keybind-key' + (capturing === action ? ' capturing' : '')}
                        onClick={() => setCapturing(action)}
                      >
                        {capturing === action ? 'Pressione uma tecla…' : keyLabel(binds[action])}
                      </button>
                    </div>
                  ))}
                </div>
                <button className="settings-action" style={{ marginTop: 14 }} onClick={resetKeybinds}>
                  ↺ Restaurar padrão
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
