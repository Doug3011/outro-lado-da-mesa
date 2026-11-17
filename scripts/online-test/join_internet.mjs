import { connect, sleep, fullClickExpr, setValueExpr, applyNetworkProfile, HELPERS } from './cdp_lib.mjs';

function clickByText(tag, re) {
  return fullClickExpr(
    `Array.from(document.querySelectorAll('${tag}')).find(b => ${re}.test(b.textContent))`,
  );
}

export async function joinInternet(cdpPort, name, code, profile) {
  const { ws, evalJs, send } = await connect(cdpPort);
  const log = (...a) => console.log(`[${name}]`, ...a);
  try {
    await evalJs(HELPERS);
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
    const url = await evalJs('location.pathname');
    const live = body.includes('AO VIVO');
    log('url:', url, '| live:', live);
    log('body:', body);
    log('errors:', await evalJs('JSON.stringify(window.__jsErrors||[])'));
    return { name, profile, live, url, errors: JSON.parse(await evalJs('JSON.stringify(window.__jsErrors||[])')) };
  } finally {
    ws.close();
  }
}

// uso direto via CLI: node join_internet.mjs <cdpPort> <name> <code> [profile]
if (process.argv[1] && process.argv[1].endsWith('join_internet.mjs')) {
  const [, , portStr, name, code, profile] = process.argv;
  const result = await joinInternet(Number(portStr), name, code, profile);
  console.log('RESULT', JSON.stringify(result));
  process.exit(0);
}
