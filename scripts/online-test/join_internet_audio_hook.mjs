// Igual join_internet.mjs, mas injeta um gancho no construtor `Audio` ANTES
// de entrar na mesa — RemoteAudioSink.tsx cria o áudio recebido via
// `new Audio()` (sem elemento <audio> no DOM), então não dá pra achar com
// querySelectorAll. O gancho guarda a instância em window.__capturedAudios
// pra inspecionar depois (readyState/currentTime/volume/paused).
import { connect, sleep, fullClickExpr, setValueExpr, applyNetworkProfile, HELPERS } from './cdp_lib.mjs';

function clickByText(tag, re) {
  return fullClickExpr(`Array.from(document.querySelectorAll('${tag}')).find(b => ${re}.test(b.textContent))`);
}

const AUDIO_HOOK = `
  window.__capturedAudios = window.__capturedAudios || [];
  if (!window.__audioHooked) {
    window.__audioHooked = true;
    const NativeAudio = window.Audio;
    window.Audio = function(...args) {
      const a = new NativeAudio(...args);
      window.__capturedAudios.push(a);
      return a;
    };
    window.Audio.prototype = NativeAudio.prototype;
  }
`;

const [, , portStr, name, code, profile] = process.argv;
const { ws, evalJs, send } = await connect(Number(portStr));
const log = (...a) => console.log(`[${name}]`, ...a);
try {
  await evalJs(HELPERS);
  await evalJs(AUDIO_HOOK);
  if (profile) {
    await applyNetworkProfile(send, profile);
    log('perfil de rede aplicado:', profile);
  }

  log('Menu inicial:', await evalJs(clickByText('button', '/Menu inicial/i')));
  await sleep(1000);
  log('Entrar numa Mesa:', await evalJs(clickByText('button', '/Entrar numa Mesa/i')));
  await sleep(500);
  log('Entrar na mesa (jogador):', await evalJs(clickByText('button', '/Entrar na mesa/i')));
  await sleep(500);
  log('Chip Pela internet:', await evalJs(clickByText('span', '/Pela internet/i')));
  await sleep(500);
  log('Nome:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="Ex.: Turma do Kléber"]')`, name)));
  await sleep(200);
  log('Código:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="ABC123"]')`, code)));
  await sleep(300);
  log('Entrar:', await evalJs(clickByText('button', '/^Entrar$/i')));
  await sleep(3000);

  const body = await evalJs(`document.body.textContent.slice(0,200).replace(/\\s+/g,' ')`);
  log('live:', body.includes('AO VIVO'));
  log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));
} finally {
  ws.close();
}
process.exit(0);
