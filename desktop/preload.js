// Ponte segura entre a janela (sandboxed, sem acesso a Node/Electron) e o
// processo principal. Só expõe as operações de janela que o painel de
// configurações precisa — nada de acesso livre a `ipcRenderer`.
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  setWindowSize: (width, height) => ipcRenderer.invoke('window:set-size', width, height),
  setBorderless: (on) => ipcRenderer.invoke('window:set-borderless', on),
  setWindowed: () => ipcRenderer.invoke('window:set-windowed'),
});
