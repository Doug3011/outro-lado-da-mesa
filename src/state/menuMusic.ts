import { create } from 'zustand';
import { type MenuTrack } from '../data/menuTracks';
import { loadSelectedMenuTrack, selectMenuTrack } from '../lib/menuTracks';

const VOLUME_KEY = 'ordem:menu-music-volume';

function loadVolume(): number {
  try {
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored === null) return 0.06; // ninguém mexeu ainda — usa o padrão discreto
    const raw = Number(stored);
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.06;
  } catch {
    return 0.06;
  }
}

interface MenuMusicStore {
  volume: number;
  track: MenuTrack;
  // play/pause não persiste entre sessões — sempre volta tocando ao abrir o app.
  playing: boolean;
  setVolume: (v: number) => void;
  setPlaying: (p: boolean) => void;
  changeTrack: (t: MenuTrack) => void;
}

// Estado global (não fica só dentro do Home) pra poder ser controlado pela
// engrenagem de configurações de qualquer tela — quem realmente toca o áudio
// é o MenuMusicController, sempre montado em App.tsx.
export const useMenuMusicStore = create<MenuMusicStore>((set) => ({
  volume: loadVolume(),
  track: loadSelectedMenuTrack(),
  playing: true,
  setVolume: (v) => {
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* ignora */
    }
    set({ volume: v });
  },
  setPlaying: (p) => set({ playing: p }),
  changeTrack: (t) => {
    selectMenuTrack(t.id);
    set({ track: t, playing: true });
  },
}));
