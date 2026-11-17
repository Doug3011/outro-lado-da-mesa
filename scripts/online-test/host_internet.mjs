import { connect, sleep, fullClickExpr, setValueExpr, HELPERS } from './cdp_lib.mjs';

const { ws, evalJs, send } = await connect(9601);
const log = (...a) => console.log('[mestre-internet]', ...a);

function clickByText(tag, re) {
  return fullClickExpr(
    `Array.from(document.querySelectorAll('${tag}')).find(b => ${re}.test(b.textContent))`,
  );
}

try {
  await evalJs(HELPERS);
  // sai pro hub (se já estiver em alguma sala, "Menu inicial" existe; senão já estamos no hub)
  await evalJs(clickByText('button', '/Menu inicial/i'));
  await sleep(1200);

  log('Entrar numa Mesa:', await evalJs(clickByText('button', '/Entrar numa Mesa/i')));
  await sleep(500);
  log('Conduzir a mesa:', await evalJs(clickByText('button', '/Conduzir a mesa/i')));
  await sleep(500);
  log('Chip Pela internet:', await evalJs(clickByText('span', '/Pela internet/i')));
  await sleep(500);

  log('Nome mestre:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="Ex.: Mestre Kléber"]')`, 'Mestre Teste Internet')));
  log('Nome mesa:', await evalJs(setValueExpr(`document.querySelector('input[placeholder="Mesa de sexta"]')`, 'Mesa Teste Internet')));
  await sleep(300);

  log('Criar mesa:', await evalJs(clickByText('button', '/Criar mesa/i')));
  await sleep(3000);

  const url = await evalJs(`location.pathname`);
  log('URL após criar:', url);
  const code = url.split('/sala/')[1];
  log('CÓDIGO DA MESA:', code);
  log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));

  const fs = await import('fs');
  fs.writeFileSync('./internet-room-code.json', JSON.stringify({ code }, null, 2), 'utf8');
} finally {
  ws.close();
}
process.exit(0);
