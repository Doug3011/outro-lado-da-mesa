// Tela cheia via Fullscreen API do navegador — no Electron, chamar isso no
// renderer já entra em tela cheia de verdade da janela (comportamento padrão
// do BrowserWindow, sem precisar de IPC com o processo principal).
export function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
