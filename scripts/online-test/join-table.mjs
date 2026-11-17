// Monta a mesa de teste: mestre hospeda (modo LAN, endereço manual
// 127.0.0.1:<porta>) e N jogadores entram, UM DE CADA VEZ (importante —
// rodar todos em paralelo/rápido demais numa sequência só deixou a
// conexão instável nos primeiros testes; um de cada vez com uma pausa
// depois de cada "Entrar" é o que funcionou de verdade), cada um já com
// seu perfil de rede aplicado (ver cdp_lib.mjs: NETWORK_PROFILES). Lê as
// portas de cluster-roles.json (gerado por launch-cluster.ps1).
import { readFileSync, writeFileSync } from 'node:fs';
import { connect, sleep, fullClickExpr, setValueExpr, HELPERS, applyNetworkProfile } from './cdp_lib.mjs';

function fullClick(s) {
  return fullClickExpr(s);
}

const roles = JSON.parse(readFileSync(new URL('./cluster-roles.json', import.meta.url), 'utf8').replace(/^﻿/, ''));
const mestre = roles.find((r) => r.Name === 'mestre');
const jogadores = roles.filter((r) => r.Name !== 'mestre');

// Perfil de rede por jogador — ordem pedida pelo usuário (50/150/300/600ms).
const PROFILE_BY_INDEX = ['latencia50', 'latencia150', 'latencia300', 'latencia600', 'bandaBaixa'];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function hostMestre() {
  const { ws, evalJs } = await connect(mestre.CdpPort);
  await evalJs(HELPERS);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Entrar numa Mesa/i.test(b.textContent))`));
  await sleep(500);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Conduzir a mesa/i.test(b.textContent))`));
  await sleep(500);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('role')==='tab' && /Criar nova mesa/i.test(b.textContent))`));
  await sleep(400);
  await evalJs(setValueExpr(`document.querySelector('input[placeholder="Ex.: Mestre Kléber"]')`, 'Mestre Teste Online'));
  await sleep(200);
  await evalJs(setValueExpr(`document.querySelector('input[placeholder="Mesa de sexta"]')`, 'Mesa Teste Online'));
  await sleep(200);
  log('mestre: hospedando mesa em porta', mestre.HttpPort);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /HOSPEDAR MESA/i.test(b.textContent))`));
  await sleep(2000);
  const errors = await evalJs('JSON.stringify(window.__jsErrors||[])');
  const url = await evalJs('location.href');
  log('mestre: hospedagem feita, url=', url, 'errors=', errors);
  ws.close();
  return url.includes('/sala/');
}

async function joinJogador(r, idx) {
  const profile = PROFILE_BY_INDEX[idx] ?? 'perfeita';
  const { ws, send, evalJs } = await connect(r.CdpPort);
  await evalJs(HELPERS);
  await applyNetworkProfile(send, profile);
  await sleep(100);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Entrar numa Mesa/i.test(b.textContent))`));
  await sleep(500);
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Entrar na mesa/i.test(b.textContent))`));
  await sleep(500);
  await evalJs(setValueExpr(`document.querySelector('input[placeholder="Ex.: Turma do Kléber"]')`, r.Name));
  await sleep(200);
  await evalJs(setValueExpr(`document.querySelector('input[placeholder="25.10.20.30:47300"]')`, `127.0.0.1:${mestre.HttpPort}`));
  await sleep(200);
  log(r.Name + ': entrando (perfil ' + profile + ', endereço 127.0.0.1:' + mestre.HttpPort + ')');
  await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Entrar')`));
  await sleep(2000);
  const live = await evalJs(`document.body.textContent.includes('AO VIVO')`);
  const errors = await evalJs('JSON.stringify(window.__jsErrors||[])');
  log(r.Name + ': ' + (live ? 'AO VIVO' : 'NÃO CONECTOU') + ', errors=' + errors);
  ws.close();
  return { name: r.Name, profile, live, errors: JSON.parse(errors) };
}

async function main() {
  const hosted = await hostMestre();
  if (!hosted) {
    console.error('Mestre não ficou em estado de hospedagem — abortando.');
    process.exit(1);
  }
  const results = [];
  for (let i = 0; i < jogadores.length; i++) {
    results.push(await joinJogador(jogadores[i], i));
    await sleep(700); // dá tempo da conexão assentar antes do próximo entrar
  }
  writeFileSync(new URL('./last-join-results.json', import.meta.url), JSON.stringify(results, null, 2));
  const allLive = results.every((r) => r.live);
  log(allLive ? 'TODOS conectados com sucesso.' : 'ATENÇÃO: nem todos conectaram — ver last-join-results.json');
}

main().catch((e) => {
  console.error('ERRO:', e);
  process.exit(1);
});
