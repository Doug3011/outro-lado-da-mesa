// Testa a música da mesa pela internet (WebRTC, mesma conexão/track do
// AvBroadcastController usada pra mesa 3D — ver avMix.ts/
// RemoteAudioSink.tsx). RemoteAudioSink cria o áudio recebido via
// `new Audio()` sem elemento no DOM, então jogadores precisam ter entrado
// com join_internet_audio_hook.mjs (não o join_internet.mjs comum) pra dar
// pra inspecionar.
//
// Pré-requisito: cluster no ar (launch-cluster.ps1), mestre já hospedou
// pela internet (host_internet.mjs) e os jogadores já entraram com
// join_internet_audio_hook.mjs.
//
// Uso: node test-music.mjs <caminho-do-wav-de-teste>
// (gere um com make_test_tone.mjs se não tiver um à mão)

import { connect, sleep, fullClickExpr } from './cdp_lib.mjs';
import { readFileSync } from 'fs';

const wavPath = process.argv[2];
if (!wavPath) {
  console.error('Uso: node test-music.mjs <caminho-do-wav-de-teste>');
  process.exit(1);
}

const roles = JSON.parse(readFileSync('./cluster-roles.json', 'utf8').replace(/^﻿/, ''));
const mestreRole = roles.find((r) => r.Name === 'mestre');
const jogadorRoles = roles.filter((r) => r.Name !== 'mestre');

async function importAndPlay() {
  const { ws, evalJs, send } = await connect(mestreRole.CdpPort);
  const log = (...a) => console.log('[mestre]', ...a);
  try {
    const alreadyOpen = await evalJs(`document.body.textContent.includes('Biblioteca')`);
    if (!alreadyOpen) {
      log('abrir Músicas:', await evalJs(fullClickExpr(
        `Array.from(document.querySelectorAll('[aria-label]')).find(e => /Músicas/i.test(e.getAttribute('aria-label')||''))`,
      )));
      await sleep(1000);
    } else {
      log('aba Músicas já estava aberta');
    }

    const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
    const found = await send('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: 'input[type="file"][accept="audio/*"]',
    });
    if (!found.nodeId) throw new Error('input de música não encontrado');
    await send('DOM.setFileInputFiles', { files: [wavPath], nodeId: found.nodeId });
    log('arquivo importado, aguardando...');
    await sleep(2000);

    log('play:', await evalJs(fullClickExpr(`document.querySelector('button[title="Tocar pra mesa toda"]')`)));
    await sleep(1500);
    log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));
  } finally {
    ws.close();
  }
}

async function checkJogador(role) {
  const { ws, evalJs } = await connect(role.CdpPort);
  try {
    const before = JSON.parse(await evalJs(`
      JSON.stringify((window.__capturedAudios||[]).map(a => ({ paused: a.paused, currentTime: a.currentTime, volume: a.volume, readyState: a.readyState, muted: a.muted })))
    `));
    await new Promise((r) => setTimeout(r, 2500));
    const after = JSON.parse(await evalJs(`
      JSON.stringify((window.__capturedAudios||[]).map(a => ({ paused: a.paused, currentTime: a.currentTime, volume: a.volume, readyState: a.readyState, muted: a.muted })))
    `));
    return { name: role.Name, before, after };
  } finally {
    ws.close();
  }
}

console.log('\n=== Testando música (WebRTC, modo internet) ===\n');
await importAndPlay();
await sleep(2000);

for (const r of jogadorRoles) {
  const res = await checkJogador(r);
  const a0 = res.before[0];
  const a1 = res.after[0];
  const advancing = a0 && a1 && a1.currentTime > a0.currentTime + 1;
  const ok = a1 && !a1.paused && a1.volume > 0 && !a1.muted && a1.readyState === 4 && advancing;
  console.log(`[${res.name}] ${ok ? 'OK' : 'FALHOU'} — antes=${JSON.stringify(a0)} depois=${JSON.stringify(a1)}`);
}
process.exit(0);
