// Processo principal do Electron. Sobe o mesmo servidor local (HTTP + WebSocket +
// descoberta UDP) que o app já usava, só que agora dentro de uma janela de verdade
// em vez de abrir o navegador em modo "app" — vira um aplicativo desktop de fato,
// com ícone, atalho e instalador próprios.
'use strict';

const path = require('node:path');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

// O servidor abre a própria janela via `start msedge --app=...` quando rodado
// como .exe portátil — aqui quem cria a janela é o Electron, então isso é desligado.
process.env.ORDEM_NO_OPEN = '1';

// Sem isso, o Chromium bloqueia autoplay de áudio com som (política padrão de
// navegador) até um clique do usuário — como aqui é nosso próprio app, não um
// site de terceiros, não faz sentido essa restrição pra música ambiente do menu.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Cópia local de server/main.cjs (colocada aqui pelo script de build) — veja
// build-installer.ps1. Rodar como require() local (não vindo de outra pasta)
// evita qualquer problema de caminho quando o app está empacotado num .asar.
require('./server.cjs');

const PORT = Number(process.env.ORDEM_PORT) || 47300;

// Auto-update (GitHub Releases via electron-builder --publish) — pedido do
// usuário, mesmo esquema já usado em outro app Electron dele ("Suvaco da
// Jinx"). Baixa sozinho em segundo plano; só pergunta na hora de REINICIAR
// (não trava o uso no meio de uma sessão — quem tá numa mesa não quer ser
// interrompido). `autoInstallOnAppQuit` cobre quem nunca clica em
// "Reiniciar agora": aplica ao fechar o app normalmente de qualquer jeito.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Atualização pronta',
      message: `Uma nova versão (${info.version}) foi baixada.`,
      detail: 'Reiniciar agora pra aplicar, ou continuar usando e aplicar só quando fechar o app.',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
});

autoUpdater.on('error', (err) => {
  console.warn('[auto-update] erro ao checar/baixar atualização:', err.message);
});

let win;
// `frame` do BrowserWindow só pode ser definido na criação — não dá pra
// alternar "janela sem borda" numa janela já existente, então esse toggle
// recria a janela do zero (guardando posição/tamanho/página atual antes).
let borderless = false;

function createWindow(opts = {}) {
  const {
    width = 1280,
    height = 820,
    x,
    y,
    frame = true,
    urlPath = '/',
  } = opts;

  win = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 900,
    minHeight: 600,
    frame,
    title: 'O Outro Lado da Mesa',
    backgroundColor: '#0b0b0d',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    // usado só por script de teste automatizado, pra checar o servidor sem
    // abrir uma janela visível na tela de quem estiver rodando
    show: !process.env.ORDEM_TEST_HEADLESS,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  Menu.setApplicationMenu(null);
  // sem isso, um link `target="_blank"` (ex.: recomendação de site de
  // modelo 3D na Área do Mestre) fica bloqueado por padrão pelo Electron
  // em vez de abrir — manda pro navegador padrão do sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL(`http://localhost:${PORT}${urlPath}`);
  return win;
}

// Recria a janela preservando onde o usuário estava (ex.: dentro de uma mesa)
// e a posição/tamanho atuais, só trocando `frame`.
async function recreateWindow(overrides) {
  const prev = win;
  const bounds = prev ? prev.getBounds() : {};
  let urlPath = '/';
  try {
    if (prev) {
      const current = new URL(prev.webContents.getURL());
      urlPath = current.pathname + current.search;
    }
  } catch {
    /* ignora — cai no padrão "/" */
  }
  const wasFullscreen = prev ? prev.isFullScreen() : false;

  const next = createWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    urlPath,
    ...overrides,
  });
  if (wasFullscreen) next.setFullScreen(true);
  if (prev) prev.destroy();
}

ipcMain.handle('window:get-state', () => ({
  isElectron: true,
  borderless,
  fullscreen: win ? win.isFullScreen() : false,
}));

ipcMain.handle('window:set-size', (_e, width, height) => {
  if (!win) return;
  if (win.isFullScreen()) win.setFullScreen(false);
  win.setSize(Math.round(width), Math.round(height));
  win.center();
});

ipcMain.handle('window:set-borderless', (_e, on) => {
  borderless = !!on;
  return recreateWindow({ frame: !borderless });
});

// "Modo janela": garante que não está nem em tela cheia nem sem borda — volta
// pro jeito padrão (com moldura, redimensionável, não tela cheia).
ipcMain.handle('window:set-windowed', () => {
  if (win && win.isFullScreen()) win.setFullScreen(false);
  if (borderless) {
    borderless = false;
    return recreateWindow({ frame: true });
  }
});

app.whenReady().then(() => {
  createWindow();
  // só em produção de verdade — `npm start`/dev não tem feed de update
  // nenhum (não veio de um instalador publicado), então checar daria erro
  // à toa toda vez.
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[auto-update] não deu pra checar atualização agora:', err.message);
    });
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
