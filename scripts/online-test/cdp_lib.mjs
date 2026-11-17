// Biblioteca CDP reaproveitada pros testes online (conecta em qualquer
// porta --remote-debugging-port de uma instância Electron isolada deste
// projeto). Mesmo padrão já usado nos testes manuais de bug fixes deste
// projeto, só que pensada pra várias conexões ao mesmo tempo (1 mestre +
// N jogadores).

export async function connect(port) {
  const r = await fetch(`http://localhost:${port}/json`);
  const targets = await r.json();
  const target = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const myId = ++id;
      pending.set(myId, { resolve, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  await new Promise((res) => ws.addEventListener('open', res));
  await send('Runtime.enable');
  await send('DOM.enable');
  await send('Network.enable');
  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error('EVAL ERROR: ' + JSON.stringify(res.exceptionDetails));
    return res.result.value;
  }
  return { ws, send, evalJs, port };
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function fullClickExpr(selExpr) {
  return `
    (function() {
      const btn = ${selExpr};
      if (!btn) return 'NONE';
      const rect = btn.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2, button: 0, pointerId: 1 };
      btn.dispatchEvent(new PointerEvent('pointerdown', opts));
      btn.dispatchEvent(new MouseEvent('mousedown', opts));
      btn.dispatchEvent(new PointerEvent('pointerup', opts));
      btn.dispatchEvent(new MouseEvent('mouseup', opts));
      btn.dispatchEvent(new MouseEvent('click', opts));
      return 'clicked';
    })()
  `;
}

export function setValueExpr(selExpr, value) {
  const escaped = JSON.stringify(value);
  return `
    (function() {
      const el = ${selExpr};
      if (!el) return 'NONE';
      const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, ${escaped});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'OK';
    })()
  `;
}

export const HELPERS = `
  window.__jsErrors = window.__jsErrors || [];
  if (!window.__jsErrorsHooked) {
    window.__jsErrorsHooked = true;
    window.addEventListener('error', (e) => window.__jsErrors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__jsErrors.push('unhandled: ' + String(e.reason)));
  }
  function __setByLabel(labelText, value) {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((l) => l.textContent.toUpperCase().includes(labelText.toUpperCase()));
    if (!label) return 'NOT_FOUND_LABEL:' + labelText;
    const input = label.querySelector('input');
    if (!input) return 'NOT_FOUND_INPUT_IN_LABEL:' + labelText;
    const proto = window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  }
`;

// Perfis de rede (pedido do usuário: 50/150/300/600ms de latência, banda
// baixa). CDP Network.emulateNetworkConditions cobre latência e
// banda (upload/download) de verdade — é throttling real do Chromium, a
// mesma ferramenta do painel Network do DevTools. NÃO cobre perda de
// pacote (%): essa API do Chromium não tem esse parâmetro; perda de
// pacote de verdade exigiria uma ferramenta de SO (ex. "clumsy" no
// Windows, que usa um driver WinDivert) — não está instalada nesta
// máquina e instalar um driver de rede é uma decisão que pede
// autorização antes. Os perfis "comPerda" abaixo aproximam uma conexão
// ruim derrubando a conexão por instantes repetidamente (liga/desliga
// offline em rajadas curtas) em vez de perda por pacote de verdade — é
// uma aproximação, não a mesma coisa, e está marcado como tal nos
// resultados.
export const NETWORK_PROFILES = {
  perfeita: { latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  latencia50: { latency: 50, downloadThroughput: -1, uploadThroughput: -1 },
  latencia150: { latency: 150, downloadThroughput: -1, uploadThroughput: -1 },
  latencia300: { latency: 300, downloadThroughput: -1, uploadThroughput: -1 },
  latencia600: { latency: 600, downloadThroughput: -1, uploadThroughput: -1 },
  bandaBaixa: { latency: 150, downloadThroughput: (256 * 1024) / 8, uploadThroughput: (64 * 1024) / 8 }, // ~256kbps down / 64kbps up
};

export async function applyNetworkProfile(send, profileKey) {
  const p = NETWORK_PROFILES[profileKey];
  if (!p) throw new Error('perfil desconhecido: ' + profileKey);
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: p.latency,
    downloadThroughput: p.downloadThroughput,
    uploadThroughput: p.uploadThroughput,
  });
}

export async function setOffline(send, offline) {
  await send('Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}
