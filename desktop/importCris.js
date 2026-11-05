// Importa uma ficha pública do C.R.I.S. (crisordemparanormal.com) — pedido do
// usuário: colar o link da PRÓPRIA ficha (ex.: https://crisordemparanormal.com/
// agente/<id>) e trazer os dados pro wizard em vez de digitar tudo de novo.
//
// A página é uma SPA em Vue — o HTML inicial é só `<div id="app"></div>` vazio,
// os dados chegam via JS depois de uma consulta ao Firebase. Não dá pra pegar
// com fetch simples (rodaria sem JS). Como este é um app Electron, criamos uma
// BrowserWindow ESCONDIDA (`show:false`), deixamos a SPA carregar de verdade e
// extraímos os valores direto do DOM com `executeJavaScript` — os <input>
// ficam `disabled` (ficha pública, sem login) e sem `value` no HTML bruto (Vue
// seta a propriedade, não o atributo), então a extração lê `.value`/`.textContent`
// ao vivo, não o HTML estático.
//
// Estrutura real da página (inspecionada rodando a própria ficha de teste do
// usuário, iotKMvjoFUzGCpTnTDjl, nesta sessão, antes de escrever isso):
//   - `.header-info-container input` (4, nessa ordem): Personagem, Jogador, Origem, Classe
//   - `.attr.str/.dex/.int/.con/.pre` (texto) — atributos, na ordem FOR/AGI/INT/VIG/PRE
//   - `.nex-container .dropdown-button` (texto, ex. "55%") — NEX
//   - `.desl-container input` (2): deslocamento em metros, depois em "quadrados"
//   - `.defense-value h3` (texto) — defesa TOTAL já calculada
//   - `.defense-input input` (2): bônus de Equip. e Outros (somam no total acima)
//   - `.other-defense-div input` (2): Bloqueio, Esquiva — sem campo equivalente
//     no nosso Character, não são importados
//   - `.info-line` fora de `.header-info-container` (3): Proteção, Resistências,
//     Proficiências — texto livre
//   - `.info-bar-container` (3, por `.info-bar-label`: VIDA/SANIDADE/ESFORÇO) —
//     cada uma com 2 inputs (atual, máximo) em `.inputs-container`
//   - `.skills-table tbody tr` (uma por perícia): nome em `.naked-button`
//     (pode vir com sufixo "*"/"+" colado, igual ao nosso SKILLS), atributo em
//     `td:nth-child(3) .dropdown-button`, bônus TOTAL em `td:nth-child(4)
//     .skill-bonus` (= treino + outros), grau de treino em `td:nth-child(5)
//     .dropdown-button`, bônus "outros" no `input` de `td:nth-child(6)`
//   - `.profile-picture` (img src) — foto do agente, URL pública (Firebase Storage)
//
// Não existe campo de "Trilha" na ficha do C.R.I.S. — fica de fora (usuário
// preenche na mão se quiser).
'use strict';

const { BrowserWindow } = require('electron');

const READY_REGEX = /PER[IÍ]CIAS|ATRIBUTOS/i;
const LOAD_TIMEOUT_MS = 20000;
const SETTLE_MS = 700;
// Tempo de espera depois de clicar numa aba (Habilidades/Rituais/Inventário/
// Descrição) ou de expandir os cards — achado inspecionando a página de
// teste nesta sessão: o conteúdo troca via Vue (`v-if`), não é instantâneo,
// mas 700-900ms sempre foi de sobra nos testes feitos aqui.
const TAB_SETTLE_MS = 700;
const EXPAND_SETTLE_MS = 500;

function validateAgentUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || '').trim());
  } catch {
    throw new Error('Link inválido — cole a URL completa da ficha (https://crisordemparanormal.com/agente/...).');
  }
  if (!/(^|\.)crisordemparanormal\.com$/i.test(u.hostname)) {
    throw new Error('Esse link não é do C.R.I.S. (precisa ser de crisordemparanormal.com).');
  }
  if (!/^\/agente\//i.test(u.pathname)) {
    throw new Error('Esse link não parece ser de uma ficha de agente (precisa ter "/agente/" na URL).');
  }
  return u.toString();
}

// Roda DENTRO da página (via executeJavaScript) — sem acesso a nada fora do
// DOM dela. Lê tudo via propriedade (.value/.textContent), não via atributo
// cru, porque os inputs da ficha pública vêm `disabled` com o valor setado só
// pela reatividade do Vue (não aparece no HTML serializado).
const EXTRACT_SCRIPT = `
(() => {
  const q = (sel, root) => (root || document).querySelector(sel);
  const qa = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const txt = (sel, root) => q(sel, root)?.textContent?.trim() || '';
  const val = (sel, root) => q(sel, root)?.value ?? '';

  const headerInputs = qa('.header-info-container input').map((i) => i.value || '');
  const attrs = {
    FOR: txt('.attr.str'),
    AGI: txt('.attr.dex'),
    INT: txt('.attr.int'),
    VIG: txt('.attr.con'),
    PRE: txt('.attr.pre'),
  };
  const nex = txt('.nex-container .dropdown-button');
  const displacementInputs = qa('.desl-container input').map((i) => i.value || '');
  const defenseTotal = txt('.defense-value h3');
  const defenseExtras = qa('.defense-input input').map((i) => i.value || '');
  const infoLines = qa('.info-line')
    .filter((el) => !el.closest('.header-info-container'))
    .map((el) => ({ label: txt('h3', el), value: val('input', el) }));
  const bars = qa('.info-bar-container').map((el) => {
    const inputs = qa('.inputs-container input', el);
    return {
      label: txt('.info-bar-label', el),
      current: inputs[0]?.value || '',
      max: inputs[1]?.value || '',
    };
  });
  const skills = qa('.skills-table tbody tr').map((tr) => {
    const tds = tr.querySelectorAll('td');
    return {
      name: txt('.naked-button', tds[1]),
      attr: txt('.dropdown-button', tds[2]),
      training: txt('.dropdown-button', tds[4]),
      outros: val('input', tds[5]),
    };
  });
  const image = q('.profile-picture')?.src || '';

  return JSON.stringify({
    name: headerInputs[0] || '',
    player: headerInputs[1] || '',
    origem: headerInputs[2] || '',
    classeText: headerInputs[3] || '',
    attrs,
    nex,
    displacementInputs,
    defenseTotal,
    defenseExtras,
    infoLines,
    bars,
    skills,
    image,
  });
})()
`;

// A ficha pública fica numa SPA com 5 abas (COMBATE, HABILIDADES, RITUAIS,
// INVENTÁRIO, DESCRIÇÃO — ver `.tab-nav-container button.tab`), cada uma só
// renderiza o conteúdo dela quando clicada (Vue troca via `v-if`). COMBATE
// (a aba que já abre sozinha) é a única lida por EXTRACT_SCRIPT acima — as
// outras 4 precisam de um clique real no botão da aba, uma espera pro
// conteúdo trocar, e aí sim dão pra ler. Estrutura inspecionada rodando a
// própria ficha de teste do usuário (iotKMvjoFUzGCpTnTDjl) nesta sessão:
//   - `.tab-nav-container button.tab` (5, nessa ordem) — os botões da aba
//   - o painel de conteúdo da aba ativa é `.sheet-tab-container > .tab`
//     (um DIV, não confundir com os BUTTONs de mesma classe "tab" acima)
//   - dentro de cada card (`.sheet-card-list .card` / `.sheet-cards-container
//     .card`) tem um botão `.show-more` que expande a descrição — sem
//     clicar nele primeiro, a descrição/detalhe não está no DOM ainda.
function clickTabScript(label) {
  return `
  (() => {
    const btns = [...document.querySelectorAll('.tab-nav-container button.tab')];
    const b = btns.find((x) => (x.textContent || '').trim().toUpperCase() === ${JSON.stringify(label)});
    if (!b) return false;
    b.click();
    return true;
  })()
  `;
}

const EXPAND_ALL_SCRIPT = `
(() => {
  const btns = [...document.querySelectorAll('.sheet-tab-container .show-more')];
  btns.forEach((b) => b.click());
  return btns.length;
})()
`;

// HABILIDADES — cada "card" é um poder/habilidade solta (de classe, trilha,
// poder paranormal, origem etc.), sem estrutura própria além de nome +
// descrição livre — bate direto com nosso `Ability { name, source,
// description }` (ver src/domain/character.ts), então não tenta adivinhar
// de qual sistema interno (trilha/classe/paranormal) cada uma veio.
const EXTRACT_ABILITIES_SCRIPT = `
(() => {
  const cards = [...document.querySelectorAll('.sheet-tab-container > .tab .sheet-card-list .card')];
  return JSON.stringify(cards.map((c) => {
    const name = c.querySelector('h3.title')?.textContent?.trim() || '';
    const full = (c.textContent || '').replace(/\\s+/g, ' ').trim();
    // o texto completo do card começa repetindo o nome (ele também é um
    // filho do card, sem separador) — tira esse prefixo pra não duplicar.
    const description = full.startsWith(name) ? full.slice(name.length).trim() : full;
    return { name, description };
  }).filter((a) => a.name));
})()
`;

// RITUAIS — cada card tem um rótulo "<ELEMENTO> <CÍRCULO>" (ex. "ENERGIA 1"),
// Execução/Alcance/Alvo/Duração como pares rótulo:valor, e a descrição em
// parágrafos. Não existe campo de custo-base em PE visível no card (fica
// implícito pelo círculo nas regras) — fica em branco, igual ao fluxo
// "adicionar ritual do catálogo" que a ficha já tinha antes de puxar da Cris
// (ver addRitualFromDef em CharacterSheet.tsx).
const EXTRACT_RITUALS_SCRIPT = `
(() => {
  const cards = [...document.querySelectorAll('.sheet-tab-container > .tab .sheet-card-list .card')];
  return JSON.stringify(cards.map((c) => {
    const name = c.querySelector('h3.title')?.textContent?.trim() || '';
    const circleText = c.querySelector('.ritual-circle h3')?.textContent?.trim() || '';
    const infoPairs = [...c.querySelectorAll('.ritual-info')].map((el) => ({
      label: el.querySelector('h3')?.childNodes?.[0]?.textContent?.replace(':','').trim() || '',
      value: el.querySelector('h3 span')?.textContent?.trim() || '',
    }));
    const description = [...c.querySelectorAll('.description.sheet-content p')]
      .map((p) => p.textContent.trim())
      .filter(Boolean)
      .join('\\n\\n');
    return { name, circleText, infoPairs, description };
  }).filter((r) => r.name));
})()
`;

// INVENTÁRIO — cada card é um item: nome, "Categoria: X", "Espaços: N" (pode
// ser negativo, ex. mochilas que aumentam carga), mais uma categoria livre
// ("Itens Operacionais"/"Acessórios"/"Armas"...) e descrição, só visíveis
// depois de expandir (ver EXPAND_ALL_SCRIPT). Não tem campo de quantidade
// visível no card — a Cris lista cada unidade como um item separado, então
// quantidade sempre vira 1 (ver crisImport.ts).
const EXTRACT_INVENTORY_SCRIPT = `
(() => {
  const cards = [...document.querySelectorAll('.sheet-tab-container > .tab .sheet-cards-container .card')];
  return JSON.stringify(cards.map((c) => {
    const name = c.querySelector('h3.title')?.textContent?.trim() || '';
    const infoPairs = [...c.querySelectorAll('.item-info h3')].map((h3) => ({
      label: (h3.childNodes?.[0]?.textContent || '').replace(':','').trim(),
      value: h3.querySelector('span')?.textContent?.trim() || '',
    }));
    const kind = c.querySelector('.item-info-category-sheet i')?.textContent?.trim() || '';
    const description = c.querySelector('.description.sheet-content')?.textContent?.trim() || '';
    return { name, infoPairs, kind, description };
  }).filter((i) => i.name));
})()
`;

// DESCRIÇÃO — 5 textareas fixas (Anotações/Aparência/Personalidade/
// Histórico/Objetivo), cada uma com o rótulo no `h3` logo antes dela.
const EXTRACT_DESCRIPTION_SCRIPT = `
(() => {
  const blocks = [...document.querySelectorAll('.sheet-tab-container > .tab .textarea-container')];
  return JSON.stringify(blocks.map((b) => ({
    label: b.querySelector('h3')?.textContent?.trim() || '',
    value: b.querySelector('textarea')?.value?.trim() || '',
  })).filter((b) => b.value));
})()
`;

// Clica na aba `label`, espera a troca de conteúdo assentar, expande todos
// os cards dela ("ver mais") e roda `extractScript` — usado pras 4 abas que
// só renderizam o conteúdo quando clicadas (ver comentário acima de
// clickTabScript). Em caso de qualquer falha (aba não encontrada, JS
// quebrou, JSON inválido) devolve `[]` em vez de derrubar a importação
// inteira — essas seções são um bônus sobre a importação que já
// funcionava (atributos/perícias/combate), não motivo pra bloquear tudo.
async function readTab(win, label, extractScript) {
  try {
    const clicked = await win.webContents.executeJavaScript(clickTabScript(label));
    if (!clicked) return [];
    await new Promise((r) => setTimeout(r, TAB_SETTLE_MS));
    await win.webContents.executeJavaScript(EXPAND_ALL_SCRIPT).catch(() => 0);
    await new Promise((r) => setTimeout(r, EXPAND_SETTLE_MS));
    const raw = await win.webContents.executeJavaScript(extractScript);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Abre a ficha numa janela escondida, espera a SPA renderizar de verdade e
// devolve os dados crus extraídos do DOM (sem nenhum mapeamento pro nosso
// `Character` ainda — isso fica no lado do app, que já tem a lista de
// perícias/classes do sistema, ver src/lib/crisImport.ts).
async function scrapeCris(rawUrl) {
  const url = validateAgentUrl(rawUrl);
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 1600,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      javascript: true,
    },
  });
  try {
    try {
      await win.loadURL(url);
    } catch (e) {
      throw new Error('Não deu pra carregar essa página — confira sua conexão e o link.');
    }

    const deadline = Date.now() + LOAD_TIMEOUT_MS;
    let ready = false;
    while (Date.now() < deadline) {
      if (win.isDestroyed()) throw new Error('A janela de importação fechou antes de terminar.');
      const text = await win.webContents.executeJavaScript('document.body.innerText || ""').catch(() => '');
      if (READY_REGEX.test(text)) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!ready) {
      throw new Error('A ficha não terminou de carregar a tempo — confira se o link abre normal no navegador e tente de novo.');
    }
    // dá um tempinho extra pra reatividade do Vue assentar todos os campos
    // (achado na inspeção: alguns valores só chegam um pouco depois do texto
    // "PERÍCIAS" já estar visível, vindos de uma 2ª leitura no Firebase).
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    const raw = await win.webContents.executeJavaScript(EXTRACT_SCRIPT);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Não consegui ler os dados da ficha — o site pode ter mudado de layout.');
    }
    if (!data || !Array.isArray(data.skills) || data.skills.length === 0) {
      throw new Error('Essa ficha parece vazia ou não encontrada — confira o link.');
    }

    // Habilidades/Rituais/Inventário/Descrição ficam em abas que só
    // renderizam o conteúdo quando clicadas — clica em cada uma, espera a
    // troca assentar, expande todos os cards (".show-more") e só então lê.
    // Se uma aba falhar (site mudou, timing diferente etc.) a importação
    // não quebra inteira — só fica sem aquele pedaço (igual ao resto do
    // scraper, que já ignora linha/perícia não reconhecida em vez de
    // travar tudo).
    data.abilities = await readTab(win, 'HABILIDADES', EXTRACT_ABILITIES_SCRIPT);
    data.ritualsRaw = await readTab(win, 'RITUAIS', EXTRACT_RITUALS_SCRIPT);
    data.inventoryRaw = await readTab(win, 'INVENTÁRIO', EXTRACT_INVENTORY_SCRIPT);
    data.descriptionBlocks = await readTab(win, 'DESCRIÇÃO', EXTRACT_DESCRIPTION_SCRIPT);

    return data;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

module.exports = { scrapeCris, validateAgentUrl };
