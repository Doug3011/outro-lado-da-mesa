// Ponte pro `window.electronAPI` exposto pelo desktop/preload.js. Fora do
// Electron (ex.: testando no navegador) tudo aqui vira no-op — nada quebra.
export interface WindowState {
  isElectron: boolean;
  borderless: boolean;
  fullscreen: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      getWindowState: () => Promise<{ isElectron: true; borderless: boolean; fullscreen: boolean }>;
      setWindowSize: (width: number, height: number) => Promise<void>;
      setBorderless: (on: boolean) => Promise<void>;
      setWindowed: () => Promise<void>;
    };
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export async function getWindowState(): Promise<WindowState> {
  if (!isElectron) return { isElectron: false, borderless: false, fullscreen: !!document.fullscreenElement };
  return window.electronAPI!.getWindowState();
}

export function setWindowSize(width: number, height: number): void {
  if (!isElectron) return;
  window.electronAPI!.setWindowSize(width, height).catch(() => {});
}

export function setBorderless(on: boolean): void {
  if (!isElectron) return;
  window.electronAPI!.setBorderless(on).catch(() => {});
}

export function setWindowedMode(): void {
  if (!isElectron) return;
  window.electronAPI!.setWindowed().catch(() => {});
}
