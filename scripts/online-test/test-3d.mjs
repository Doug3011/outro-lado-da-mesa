// Testa a mesa 3D nos dois transportes que o app usa (achado desta sessão
// — não é "um 3D só"):
//   - modo LAN (host:porta): cada cliente desenha a própria cena 3D local
//     (WebGL) a partir do cenário sincronizado — sem vídeo.
//   - modo "Pela internet" (Supabase): o mestre transmite a própria tela
//     3D por WebRTC (AvBroadcastController.tsx) — jogadores recebem vídeo
//     de verdade.
//
// Pré-requisito: cluster já no ar (launch-cluster.ps1) e TODOS já
// conectados na mesma mesa — modo lan via join-table.mjs, modo internet via
// host_internet.mjs + join_internet.mjs (nessa ordem, um de cada vez).
//
// IMPORTANTE (achado desta sessão): se o cluster tem várias janelas
// empilhadas, o Windows/Chromium pode "ocluir" a do mestre e travar o
// canvas dele em 300x150 (nunca desenha nada de verdade pra capturar) —
// isso quebra o teste do modo internet (vídeo chega 0x0, trava em
// "Preparando a mesa…"). Rode `.\fix-window-occlusion.ps1 -CdpPort 9601`
// ANTES deste script se isso acontecer.
//
// Uso: node test-3d.mjs <lan|internet>

import { connect, sleep, fullClickExpr } from './cdp_lib.mjs';
import { readFileSync } from 'fs';

const mode = process.argv[2];
if (mode !== 'lan' && mode !== 'internet') {
  console.error('Uso: node test-3d.mjs <lan|internet>');
  process.exit(1);
}

const roles = JSON.parse(readFileSync('./cluster-roles.json', 'utf8').replace(/^﻿/, ''));
const mestreRole = roles.find((r) => r.Name === 'mestre');
const jogadorRoles = roles.filter((r) => r.Name !== 'mestre');

function clickByText(tag, re) {
  return fullClickExpr(`Array.from(document.querySelectorAll('${tag}')).find(b => ${re}.test(b.textContent))`);
}

// (a troca de cenário usa texto/emoji exato da UI atual — se a UI mudar e
// isto parar de achar os botões, confira o aria-label "Mapa"/"Câmera" e os
// textos "＋"/"Cenário 3D"/"Cenário 3D em branco" na tela do mestre)
async function doSwitch3d() {
  const { ws, evalJs } = await connect(mestreRole.CdpPort);
  const log = (...a) => console.log('[mestre]', ...a);
  try {
    log('abrir Mapas:', await evalJs(fullClickExpr(
      `Array.from(document.querySelectorAll('[aria-label]')).find(e => /Mapa/i.test(e.getAttribute('aria-label')||''))`,
    )));
    await sleep(1000);
    log('click ＋:', await evalJs(fullClickExpr(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '＋')`)));
    await sleep(1000);
    log('click Cenário 3D:', await evalJs(fullClickExpr(`Array.from(document.querySelectorAll('button')).find(b => /Cenário 3D/i.test(b.textContent))`)));
    await sleep(1000);
    log('click Cenário 3D em branco:', await evalJs(fullClickExpr(`Array.from(document.querySelectorAll('button')).find(b => /Cenário 3D em branco/i.test(b.textContent))`)));
    await sleep(3000);
    log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));
    log('canvas presente (mestre)?', await evalJs(`!!document.querySelector('canvas')`));
  } finally {
    ws.close();
  }
}

async function checkJogador(role) {
  const { ws, evalJs } = await connect(role.CdpPort);
  try {
    const videoCount = await evalJs(`document.querySelectorAll('video').length`);
    const canvasCount = await evalJs(`document.querySelectorAll('canvas').length`);
    const videoDims = JSON.parse(await evalJs(`JSON.stringify(Array.from(document.querySelectorAll('video')).map(v => [v.videoWidth, v.videoHeight]))`));
    const errors = JSON.parse(await evalJs('JSON.stringify(window.__jsErrors||[])'));
    const body = await evalJs(`document.body.textContent.slice(0,200).replace(/\\s+/g,' ')`);
    return { name: role.Name, videoCount, canvasCount, videoDims, errors, body };
  } finally {
    ws.close();
  }
}

console.log(`\n=== Testando mesa 3D — modo ${mode.toUpperCase()} ===\n`);
await doSwitch3d();
await sleep(4000);

for (const r of jogadorRoles) {
  const res = await checkJogador(r);
  const ok =
    mode === 'lan'
      ? res.canvasCount > 0 && res.videoCount === 0 && res.errors.length === 0
      : res.videoCount > 0 && res.videoDims.every(([w, h]) => w > 0 && h > 0) && res.errors.length === 0;
  console.log(`[${res.name}] ${ok ? 'OK' : 'FALHOU'} — canvas=${res.canvasCount} video=${res.videoCount} dims=${JSON.stringify(res.videoDims)} erros=${res.errors.length}`);
  if (!ok) console.log(`  body: ${res.body}`);
}

console.log('\nDica: modo internet com vídeo 0x0 travado em "Preparando a mesa…"?');
console.log('Rode: .\\fix-window-occlusion.ps1 -CdpPort ' + mestreRole.CdpPort + '  (janelas empilhadas confundem o Chromium)');
process.exit(0);
