import { connect, sleep, fullClickExpr, setValueExpr, HELPERS, applyNetworkProfile } from './cdp_lib.mjs';
function fullClick(s) { return fullClickExpr(s); }

const cdpPort = Number(process.argv[2]);
const name = process.argv[3];
const mestreHttpPort = Number(process.argv[4]);
const profile = process.argv[5] || 'perfeita';

const { ws, send, evalJs } = await connect(cdpPort);
const log = (...a) => console.log(`[${name}]`, ...a);
try {
  await evalJs(HELPERS);
  log('perfil de rede:', profile);
  await applyNetworkProfile(send, profile);
  await sleep(100);
  log('1) Entrar numa Mesa:', await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Entrar numa Mesa/i.test(b.textContent))`)));
  await sleep(500);
  log('2) Entrar na mesa (jogador):', await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => /Entrar na mesa/i.test(b.textContent))`)));
  await sleep(500);
  log('3) nome:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="Ex.: Turma do Kléber"]')`, name)));
  await sleep(200);
  log('4) endereco:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="25.10.20.30:47300"]')`, `127.0.0.1:${mestreHttpPort}`)));
  await sleep(200);
  log('5) Entrar:', await evalJs(fullClick(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Entrar')`)));
  await sleep(2000);
  const liveText = await evalJs(`document.body.textContent.includes('AO VIVO') ? 'AO VIVO' : 'NAO CONECTADO'`);
  log('status:', liveText);
  log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));
  log('url:', await evalJs('location.href'));
} finally {
  ws.close();
}
process.exit(0);
