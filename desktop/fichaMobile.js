// Página da ficha pro celular (QR code no cabeçalho da ficha/janela "Ficha"
// na mesa — ver src/components/FichaQr.tsx, agora usada por detrás do botão
// "No celular") — pedido do usuário: escanear e ver (e poder mexer na)
// ficha pelo celular, na mesma rede.
//
// Fica FORA do bundle React/Vite de propósito: é uma página HTML+JS vanilla,
// servida direto pelo servidor local (`/ficha/:id`, ver server/main.cjs), que
// vira um cliente da MESMA sala WebSocket (`/lan/room`) que o app desktop já
// usa — o mesmo protocolo (__hello / sync:state / sheet:upsert / roll) que
// `src/lib/realtime.ts` (`lanRoom`) implementa. Isso evita duplicar
// armazenamento: o celular lê/escreve no MESMO estado em memória do
// servidor (`roomState`, em server/main.cjs), que já é a fonte da verdade
// pro resto da mesa — não existe um "banco" à parte pra essa página.
//
// A lista de perícias/condições (chave/nome/atributo/flags) é uma cópia
// pequena e estática de src/data/ordem.ts — esta página não pode importar
// TS/React (é servida crua, sem build), então duplica só esses dados de
// referência (não a lógica de regra: o cálculo de bônus/rolagem abaixo é o
// mesmo de src/domain/dice.ts e src/domain/character.ts, só reescrito em JS
// puro — inclusive o formato do evento `roll` enviado, pra bater exatamente
// com o que o resto da mesa espera ver no histórico).
//
// REDESIGN Passo 5 (Ficha de personagem): visual novo (Ficha-Celular.dc.html
// — topo fixo com mini-barras, 5 abas embaixo, botões grandes −5/−1/+1/+5,
// painel de rolagem subindo de baixo), mas ligado aos MESMOS dados/eventos
// de sempre — só o HTML/CSS/JS desta página mudou. Divergências da
// referência (documentadas no relatório do passo, não repetidas aqui linha
// a linha): sem "ACERTO" por ataque (a ficha de verdade também não tem —
// só "Rolar dano"); Rituais/Habilidades/Inventário ficam em modo leitura
// (editar isso pelo celular exigiria duplicar bastante lógica de edição
// que já existe só em CharacterSheet.tsx); Progressão mostra um resumo e
// manda abrir a ficha no computador em vez de reimplementar os pickers.
'use strict';

const SKILLS = [
  { key: 'acrobacia', name: 'Acrobacia', attr: 'AGI', loadPenalty: true },
  { key: 'adestramento', name: 'Adestramento', attr: 'PRE', onlyTrained: true },
  { key: 'artes', name: 'Artes', attr: 'PRE', onlyTrained: true },
  { key: 'atletismo', name: 'Atletismo', attr: 'FOR' },
  { key: 'atualidades', name: 'Atualidades', attr: 'INT' },
  { key: 'ciencias', name: 'Ciências', attr: 'INT', onlyTrained: true },
  { key: 'crime', name: 'Crime', attr: 'AGI', onlyTrained: true, loadPenalty: true },
  { key: 'diplomacia', name: 'Diplomacia', attr: 'PRE' },
  { key: 'enganacao', name: 'Enganação', attr: 'PRE' },
  { key: 'fortitude', name: 'Fortitude', attr: 'VIG' },
  { key: 'furtividade', name: 'Furtividade', attr: 'AGI', loadPenalty: true },
  { key: 'iniciativa', name: 'Iniciativa', attr: 'AGI' },
  { key: 'intimidacao', name: 'Intimidação', attr: 'PRE' },
  { key: 'intuicao', name: 'Intuição', attr: 'PRE' },
  { key: 'investigacao', name: 'Investigação', attr: 'INT' },
  { key: 'luta', name: 'Luta', attr: 'FOR' },
  { key: 'medicina', name: 'Medicina', attr: 'INT' },
  { key: 'ocultismo', name: 'Ocultismo', attr: 'INT', onlyTrained: true },
  { key: 'percepcao', name: 'Percepção', attr: 'PRE' },
  { key: 'pilotagem', name: 'Pilotagem', attr: 'AGI', onlyTrained: true },
  { key: 'pontaria', name: 'Pontaria', attr: 'AGI' },
  { key: 'profissao', name: 'Profissão', attr: 'INT', onlyTrained: true },
  { key: 'reflexos', name: 'Reflexos', attr: 'AGI' },
  { key: 'religiao', name: 'Religião', attr: 'PRE', onlyTrained: true },
  { key: 'sobrevivencia', name: 'Sobrevivência', attr: 'INT' },
  { key: 'tatica', name: 'Tática', attr: 'INT', onlyTrained: true },
  { key: 'tecnologia', name: 'Tecnologia', attr: 'INT', onlyTrained: true },
  { key: 'vontade', name: 'Vontade', attr: 'PRE' },
];

const CONDITIONS = [
  'Abalado', 'Agarrado', 'Alquebrado', 'Apavorado', 'Atordoado', 'Caído', 'Cego', 'Confuso',
  'Debilitado', 'Desprevenido', 'Doente', 'Enjoado', 'Enredado', 'Envenenado', 'Esmorecido',
  'Exausto', 'Fascinado', 'Fraco', 'Frustrado', 'Imóvel', 'Inconsciente', 'Indefeso', 'Lento',
  'Ofuscado', 'Paralisado', 'Petrificado', 'Sangrando', 'Surdo', 'Vulnerável',
];

const ATTRS = [
  { key: 'AGI', name: 'Agilidade', left: 50.3, top: 15.9 },
  { key: 'INT', name: 'Intelecto', left: 83.7, top: 41.0 },
  { key: 'VIG', name: 'Vigor', left: 71.0, top: 81.4 },
  { key: 'PRE', name: 'Presença', left: 29.7, top: 81.4 },
  { key: 'FOR', name: 'Força', left: 17.0, top: 41.0 },
];

function escapeJs(s) {
  return JSON.stringify(String(s ?? ''));
}

function renderFichaPage(id) {
  const safeId = escapeJs(id);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
<title>Ficha — O Outro Lado da Mesa</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #0a090c; --line: #2a1c22; --panel: rgba(18, 13, 17, .92);
  --sangue: #e0161e; --sangue-bright: #ff4a50; --sangue-soft: #ff6a70; --sangue-deep: #b80f16;
  --ink: #eee8ec; --dim: #b9aeb3; --faint: #8e8088;
  --vida-a: #c8141c; --vida-b: #ff4a50; --san-a: #6a2bd6; --san-b: #a974ff; --esf-a: #e06a0e; --esf-b: #ffa040;
  --disp: 'Oswald', sans-serif; --mono: 'IBM Plex Mono', monospace; --body: 'Inter Tight', system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--body); }
button, input, textarea, select { font-family: inherit; }
button { cursor: pointer; }
input::placeholder, textarea::placeholder { color: #6e6670; }
body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
@keyframes fc-draw { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
@keyframes fc-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes fc-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes fc-sheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes fc-shimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(250%); } }
@keyframes fc-dot { 0%, 100% { box-shadow: 0 0 0 0 rgba(61,220,132,.6); } 50% { box-shadow: 0 0 0 5px rgba(61,220,132,0); } }
.fc-press:active { transform: scale(.96); }

header.top {
  position: relative;
  flex: 0 0 auto;
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  background: rgba(12, 9, 12, .95);
}
.top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.status-chip {
  height: 24px; padding: 0 10px; border-radius: 999px; border: 1px solid #1f4a32;
  background: rgba(61,220,132,.06); display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--mono); font-size: 10.5px; color: #9fe8bf; white-space: nowrap;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #3ddc84; animation: fc-dot 2s ease-in-out infinite; }
.status-chip.off { border-color: var(--line); background: transparent; color: var(--faint); }
.status-chip.off .status-dot { background: var(--faint); animation: none; }
.id-row { display: flex; align-items: center; gap: 10px; }
.portrait {
  width: 50px; height: 50px; border-radius: 12px; border: 1.5px solid var(--sangue);
  background: radial-gradient(circle at 50% 35%, #3a1a40, #160c18); display: flex; align-items: center;
  justify-content: center; font-family: var(--disp); font-size: 20px; font-weight: 700; color: #c9a0ff; flex: none;
}
.id-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.id-name { font-family: var(--disp); font-size: 19px; font-weight: 700; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.id-sub { font-size: 11.5px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nex-box { display: flex; flex-direction: column; align-items: center; padding: 5px 9px; border-radius: 10px; border: 1px solid #5a1a20; background: #1a0e12; flex: none; }
.nex-box b { font-family: var(--mono); font-size: 15px; font-weight: 600; color: var(--sangue-soft); }
.nex-box span { font-family: var(--disp); font-size: 8.5px; letter-spacing: .14em; color: #9e9298; }
.mini-bars { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
.mini-bar { display: flex; flex-direction: column; gap: 3px; }
.mini-bar-head { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; }
.mini-track { height: 5px; border-radius: 4px; background: #1e1418; overflow: hidden; }
.mini-fill { height: 100%; transition: width .3s; }

main { position: relative; flex: 1; overflow-y: auto; padding: 14px 14px 20px; display: flex; flex-direction: column; gap: 14px; }
.panel { display: flex; flex-direction: column; gap: 14px; animation: fc-rise .22s ease-out both; }

.card { border-radius: 14px; border: 1px solid var(--line); background: var(--panel); padding: 10px; }
.subhead { font-family: var(--disp); font-size: 11px; letter-spacing: .16em; color: var(--sangue-soft); text-transform: uppercase; }

.pentagon-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.pentagon-head small { font-family: var(--mono); font-size: 10px; color: #7e7078; }
.pentagon { position: relative; width: 100%; max-width: 300px; aspect-ratio: 300/270; margin: 2px auto 0; }
.pentagon svg.bg { position: absolute; inset: 0; }
.pentagon svg.bg polygon { fill: none; stroke: #5a1a20; stroke-width: 1.5; stroke-dasharray: 600; animation: fc-draw 1.2s ease-out both; }
.pentagon svg.bg path { stroke: #3a1418; stroke-width: 1; stroke-dasharray: 600; animation: fc-draw 1.4s .15s ease-out both; }
.pentagon-center {
  position: absolute; left: 50%; top: 50%; width: 30%; height: 30%; transform: translate(-50%,-50%);
  border-radius: 50%; border: 1.5px solid var(--sangue); background: radial-gradient(circle, #2a1016, #120a0e 70%);
  display: flex; align-items: center; justify-content: center; text-align: center; padding: 4px;
  font-family: var(--disp); font-size: 9.5px; letter-spacing: .1em;
}
.pentagon-node {
  position: absolute; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%;
  border: 2px solid var(--sangue); background: radial-gradient(circle at 50% 35%, #2a1016, #140a0e);
  color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; border-width: 0;
}
.pentagon-node b { font-family: var(--disp); font-size: 22px; font-weight: 700; line-height: 1; }
.pentagon-node span { font-family: var(--disp); font-size: 10px; letter-spacing: .08em; color: #e9a0a4; }

.ministats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
.ministat { border-radius: 12px; border: 1px solid var(--line); background: var(--panel); padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.ministat b { font-family: var(--mono); font-size: 17px; font-weight: 600; }
.ministat span { font-family: var(--disp); font-size: 9px; letter-spacing: .12em; color: var(--faint); }

.bar { display: flex; flex-direction: column; gap: 6px; }
.bar-head { display: flex; justify-content: space-between; align-items: baseline; }
.bar-head span:first-child { font-family: var(--disp); font-size: 13px; letter-spacing: .14em; }
.bar-head span:last-child { font-family: var(--mono); font-size: 15px; font-weight: 600; }
.bar-track { position: relative; height: 16px; border-radius: 10px; background: #1a1216; overflow: hidden; border: 1px solid var(--track-a); }
.bar-fill { position: relative; height: 100%; overflow: hidden; background: linear-gradient(90deg, var(--track-a), var(--track-b)); box-shadow: 0 0 12px var(--track-b); transition: width .35s; }
.bar-fill::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); animation: fc-shimmer 3.5s ease-in-out infinite; }
.bar-steps { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 6px; }
.bar-steps button { height: 42px; border-radius: 10px; border: 1px solid var(--track-a); background: color-mix(in srgb, var(--track-a) 14%, transparent); color: #fff; font-family: var(--mono); font-size: 14px; font-weight: 600; }

.conditions { display: flex; flex-wrap: wrap; gap: 6px; }
.cond-chip { height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: #9e9298; font-size: 12px; }
.cond-chip.on { border-color: var(--sangue); background: rgba(224,22,30,.2); color: #fff; box-shadow: 0 0 10px rgba(224,22,30,.3); }

.skills-toolbar { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 4px; padding: 4px; border-radius: 12px; background: #120d11; border: 1px solid var(--line); }
.skills-toolbar button { height: 36px; border-radius: 9px; border: 0; background: transparent; color: var(--dim); font-size: 12.5px; font-weight: 600; }
.skills-toolbar button.on { background: var(--sangue); color: #fff; }
.skill-row { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); padding: 0 12px; display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; }
.skill-row svg { flex: none; }
.skill-row .names { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.skill-row .names b { font-size: 14px; }
.skill-row .names small { font-family: var(--mono); font-size: 10.5px; color: var(--faint); }
.skill-row .bonus { font-family: var(--mono); font-size: 15px; font-weight: 600; }
.skills-foot { font-size: 10.5px; color: #7e7078; margin: 0; }

.attack-card { border-radius: 14px; border: 1px solid #3a1d22; background: linear-gradient(160deg, rgba(224,22,30,.12), rgba(18,13,17,.95)); padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.attack-top { display: flex; align-items: center; gap: 10px; }
.attack-top .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.attack-top .info b { font-family: var(--disp); font-size: 17px; font-weight: 600; }
.attack-top .info span { font-family: var(--mono); font-size: 11.5px; color: var(--dim); }
.attack-dmg-btn { height: 44px; border-radius: 10px; border: 0; background: var(--sangue); color: #fff; font-family: var(--disp); font-size: 13px; letter-spacing: .08em; box-shadow: 0 6px 16px rgba(224,22,30,.35); }
.attack-dmg-btn:disabled { opacity: .4; }
.quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
.quick-grid button { height: 50px; border-radius: 12px; border: 1px solid var(--line); background: #120d11; color: var(--ink); font-family: var(--mono); font-size: 13px; font-weight: 600; }

.ritual-card { border-radius: 14px; border: 1px solid var(--line); background: var(--panel); padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.ritual-card b { font-size: 14.5px; }
.ritual-card span { font-family: var(--mono); font-size: 11px; color: var(--dim); }

.more-tabs { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.more-tabs button { height: 44px; border-radius: 10px; border: 1px solid var(--line); background: transparent; color: var(--dim); font-size: 13px; font-weight: 600; }
.more-tabs button.on { border-color: var(--sangue); background: rgba(224,22,30,.16); color: #fff; }
.item-row { min-height: 50px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); padding: 8px 12px; display: flex; flex-direction: column; gap: 1px; justify-content: center; }
.item-row b { font-size: 14px; }
.item-row span { font-family: var(--mono); font-size: 11px; color: var(--faint); }
.ability-row { min-height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); padding: 0 14px; display: flex; align-items: center; font-size: 14px; font-weight: 600; }
.progress-hint { padding: 12px 14px; border-radius: 12px; background: rgba(224,22,30,.07); border-left: 3px solid var(--sangue); font-size: 13px; color: #d9cfd3; line-height: 1.5; }
textarea.desc { width: 100%; min-height: 220px; resize: vertical; border-radius: 12px; border: 1px solid var(--line); background: #120d11; color: var(--ink); padding: 10px 12px; font-size: 15px; line-height: 1.5; }
.empty { color: #7e7078; font-size: 13px; padding: 16px 0; text-align: center; }

nav.tabs { flex: 0 0 auto; display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); padding: 6px 6px calc(10px + env(safe-area-inset-bottom, 0)); border-top: 1px solid var(--line); background: rgba(12,9,12,.98); }
nav.tabs button { position: relative; min-height: 54px; border: 0; background: transparent; color: #8e8088; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
nav.tabs button.on { color: #ff4a50; }
nav.tabs button span.label { font-size: 10.5px; font-weight: 600; }
nav.tabs button .dot { position: absolute; top: 0; left: 30%; right: 30%; height: 3px; border-radius: 0 0 3px 3px; background: var(--sangue); opacity: 0; }
nav.tabs button.on .dot { opacity: 1; }

.roll-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 20; }
.roll-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 21; border-radius: 22px 22px 0 0; border-top: 2px solid var(--sangue);
  background: #140c10; padding: 10px 18px calc(22px + env(safe-area-inset-bottom, 0)); display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 -20px 50px rgba(0,0,0,.6); animation: fc-sheet .28s cubic-bezier(.2,.8,.2,1) both;
}
.roll-grip { align-self: center; width: 40px; height: 4px; border-radius: 4px; background: #3a2a30; }
.roll-head { display: flex; justify-content: space-between; align-items: baseline; }
.roll-head b { font-family: var(--disp); font-size: 14px; letter-spacing: .12em; color: #ff8a8e; }
.roll-dice { display: flex; align-items: center; gap: 12px; }
.roll-dice-list { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.roll-die { width: 38px; height: 38px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 15px; font-weight: 600; background: #1e1418; color: #9e9298; border: 1px solid #3a2228; }
.roll-die.best { background: var(--sangue); color: #fff; box-shadow: 0 0 14px rgba(224,22,30,.6); }
.roll-total { font-family: var(--disp); font-size: 54px; font-weight: 700; line-height: 1; }
.roll-foot { display: flex; justify-content: space-between; align-items: center; }
.roll-foot span { font-family: var(--mono); font-size: 12px; color: var(--dim); }
.roll-crit { font-family: var(--disp); font-size: 13px; letter-spacing: .2em; color: #ffd166; }
.roll-close { height: 48px; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: var(--ink); font-family: var(--disp); font-size: 14px; letter-spacing: .1em; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
  <header class="top">
    <div class="top-row">
      <span class="status-chip off" id="status"><span class="status-dot"></span><span id="statusText">conectando…</span></span>
    </div>
    <div class="id-row">
      <div class="portrait" id="portrait">?</div>
      <div class="id-text">
        <span class="id-name" id="name">Carregando…</span>
        <span class="id-sub" id="sub"></span>
      </div>
      <div class="nex-box"><b id="nexVal">0%</b><span>NEX</span></div>
    </div>
    <div class="mini-bars" id="miniBars"></div>
  </header>

  <main id="app"><p class="empty">Carregando ficha…</p></main>

  <nav class="tabs" id="tabs"></nav>
  <div id="rollLayer"></div>

<script>
(function () {
  var CHAR_ID = ${safeId};
  var SKILLS = ${JSON.stringify(SKILLS)};
  var CONDITIONS = ${JSON.stringify(CONDITIONS)};
  var ATTRS = ${JSON.stringify(ATTRS)};
  var ME_ID = 'phone-' + Math.random().toString(36).slice(2);
  var state = null;
  var ws = null;
  var connected = false;

  var tab = 0; // 0 Status, 1 Pericias, 2 Ataques, 3 Rituais, 4 Mais
  var moreTab = 0; // dentro de "Mais": 0 Inventario, 1 Habilidades, 2 Progressao, 3 Descricao
  var skillFilter = 'trained'; // 'trained' | 'all'
  var roll = null;
  var patchTimer = null;
  var notesDraft = null;

  var elStatus = document.getElementById('status');
  var elStatusText = document.getElementById('statusText');
  var elPortrait = document.getElementById('portrait');
  var elName = document.getElementById('name');
  var elSub = document.getElementById('sub');
  var elNexVal = document.getElementById('nexVal');
  var elMiniBars = document.getElementById('miniBars');
  var elApp = document.getElementById('app');
  var elTabs = document.getElementById('tabs');
  var elRollLayer = document.getElementById('rollLayer');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setStatus(connectedNow, text) {
    connected = connectedNow;
    elStatusText.textContent = text;
    elStatus.className = 'status-chip' + (connectedNow ? '' : ' off');
  }

  function connect() {
    setStatus(false, 'conectando…');
    ws = new WebSocket('ws://' + location.host + '/lan/room');
    ws.onopen = function () {
      setStatus(false, 'conectado — carregando ficha…');
      ws.send(JSON.stringify({ __hello: true, me: { id: ME_ID, name: 'Celular', color: '#e01e2b', isGM: false } }));
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.__presence) return;
      if (msg.type === 'sync:state') {
        var found = (msg.payload.characters || []).filter(function (c) { return c.id === CHAR_ID; })[0];
        if (found) { state = found; setStatus(true, 'ao vivo'); renderAll(); }
        else if (!state) { showNotFound(); }
      } else if (msg.type === 'sheet:upsert' && msg.payload && msg.payload.id === CHAR_ID) {
        state = msg.payload;
        renderAll();
      } else if (msg.type === 'sheet:delete' && msg.payload && msg.payload.id === CHAR_ID) {
        state = null;
        showNotFound();
      }
    };
    ws.onclose = function () {
      setStatus(false, 'desconectado — reconectando…');
      setTimeout(connect, 1500);
    };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  function send(ev) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(ev));
  }

  function showNotFound() {
    elName.textContent = 'Ficha não encontrada';
    elSub.textContent = 'Confira se o QR code é o mais recente (reabra a ficha no PC).';
    elMiniBars.innerHTML = '';
    elApp.innerHTML = '<p class="empty">Confira se o QR code é o mais recente (reabra a ficha no PC).</p>';
    elTabs.innerHTML = '';
  }

  // ---- escrita (debounced igual ao CharacterSheet.tsx — 350ms pra texto,
  // imediato pra toggles/barras/dados) ----
  function patchState(partial, immediate) {
    if (!state) return;
    state = Object.assign({}, state, partial, { updatedAt: Date.now() });
    window.clearTimeout(patchTimer);
    if (immediate) {
      send({ type: 'sheet:upsert', payload: state });
    } else {
      patchTimer = window.setTimeout(function () { send({ type: 'sheet:upsert', payload: state }); }, 350);
    }
  }

  function updateBar(field, delta) {
    if (!state) return;
    var cur = state[field];
    var next = Math.max(0, Math.min(cur.max, cur.current + delta));
    if (next === cur.current) return;
    var obj = {};
    obj[field] = Object.assign({}, cur, { current: next });
    patchState(obj, true);
    renderApp();
    renderMiniBars();
  }

  function toggleCondition(label) {
    if (!state) return;
    var list = state.conditions || [];
    var on = list.indexOf(label) !== -1;
    var next = on ? list.filter(function (x) { return x !== label; }) : list.concat([label]);
    patchState({ conditions: next }, true);
    renderApp();
  }

  // ---- dados (mesmo motor de src/domain/dice.ts, reescrito em JS puro —
  // formato do evento \`roll\` igual ao resto do app, ver OrdemTestResult/
  // ExpressionResult em src/domain/dice.ts) ----
  function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

  function rollTest(label, attrVal, bonus) {
    if (!state) return;
    var pickedLowest = attrVal <= 0;
    var n = pickedLowest ? 2 : attrVal;
    var dice = [];
    for (var i = 0; i < n; i++) dice.push(rollDie(20));
    var chosen = pickedLowest ? Math.min.apply(null, dice) : Math.max.apply(null, dice);
    var total = chosen + bonus;
    var critical = !pickedLowest && chosen === 20;
    var entry = {
      id: Math.random().toString(36).slice(2), at: Date.now(), authorId: ME_ID,
      authorName: state.name + ' (celular)', authorColor: '#e01e2b', label: label,
      result: {
        kind: 'ordem-test', attributeValue: attrVal, diceCount: n, dice: dice, chosen: chosen,
        pickedLowest: pickedLowest, bonus: bonus, total: total, dt: null, success: null,
        critical: critical, fumble: chosen === 1,
      },
    };
    send({ type: 'roll', payload: entry });
    var shown = dice.map(function (v) { return { v: v, best: v === chosen }; });
    openRoll(label, shown, total, n + 'd20 (' + (pickedLowest ? 'menor' : 'maior') + (bonus ? ' + ' + bonus : '') + ')', critical);
  }

  function rollSkillByKey(key) {
    var def = null;
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].key === key) def = SKILLS[i];
    if (!def || !state) return;
    var st = (state.skills && state.skills[key]) || { training: 0, bonus: 0 };
    var bonus = (st.training || 0) + (st.bonus || 0);
    var attrVal = (state.attributes && state.attributes[def.attr]) || 0;
    rollTest(state.name + ' · ' + def.name + ' (' + def.attr + ')', attrVal, bonus);
  }

  function rollAttrByKey(key, name) {
    if (!state) return;
    var attrVal = (state.attributes && state.attributes[key]) || 0;
    rollTest(state.name + ' · Teste de ' + name, attrVal, 0);
  }

  function rollDamageExpr(label, expr) {
    if (!state) return;
    var m = /^(\\d+)d(\\d+)(?:\\+(\\d+))?$/.exec(expr.trim());
    if (!m) return;
    var n = +m[1], f = +m[2], add = +(m[3] || 0);
    var dice = [];
    for (var i = 0; i < n; i++) dice.push(rollDie(f));
    var subtotal = dice.reduce(function (a, v) { return a + v; }, 0);
    var total = subtotal + add;
    var entry = {
      id: Math.random().toString(36).slice(2), at: Date.now(), authorId: ME_ID,
      authorName: state.name + ' (celular)', authorColor: '#e01e2b', label: label,
      result: {
        kind: 'expression', expression: expr, modifier: add, valid: true, total: total,
        terms: [{ raw: n + 'd' + f, count: n, sides: f, keep: null, results: dice, kept: dice, sign: 1, subtotal: subtotal }],
      },
    };
    send({ type: 'roll', payload: entry });
    var shown = dice.map(function (v) { return { v: v, best: false }; });
    openRoll(label, shown, total, expr, false);
  }

  // ---- painel de rolagem (sobe de baixo) ----
  function openRoll(label, dice, total, formula, crit) {
    roll = { label: label, dice: dice, total: total, formula: formula, crit: crit };
    renderRoll();
  }
  function closeRoll() {
    roll = null;
    renderRoll();
  }
  function renderRoll() {
    if (!roll) { elRollLayer.innerHTML = ''; return; }
    var diceHtml = roll.dice.map(function (d) {
      return '<span class="roll-die' + (d.best ? ' best' : '') + '">' + d.v + '</span>';
    }).join('');
    elRollLayer.innerHTML =
      '<div class="roll-overlay" id="rollOverlay"></div>' +
      '<div class="roll-sheet" role="dialog" aria-label="Resultado">' +
      '<span class="roll-grip"></span>' +
      '<div class="roll-head"><b>' + esc(roll.label) + '</b><span style="font-family:var(--mono);font-size:11px;color:#8e8088">enviado pra mesa</span></div>' +
      '<div class="roll-dice"><div class="roll-dice-list">' + diceHtml + '</div><span class="roll-total">' + roll.total + '</span></div>' +
      '<div class="roll-foot"><span>' + esc(roll.formula) + '</span>' + (roll.crit ? '<span class="roll-crit">★ CRÍTICO</span>' : '') + '</div>' +
      '<button class="roll-close fc-press" id="rollCloseBtn">FECHAR</button>' +
      '</div>';
    document.getElementById('rollOverlay').onclick = closeRoll;
    document.getElementById('rollCloseBtn').onclick = closeRoll;
  }

  // ---- cabeçalho fixo (retrato/nome/NEX/mini-barras) ----
  function renderHeader() {
    if (!state) return;
    elPortrait.textContent = (state.name || '?').trim().charAt(0).toUpperCase() || '?';
    elName.textContent = state.name || 'Agente';
    elSub.textContent = [state.classe, state.origem].filter(Boolean).join(' · ');
    elNexVal.textContent = state.nex + '%';
    renderMiniBars();
  }

  function renderMiniBars() {
    if (!state) return;
    var defs = [
      ['PV', state.pv, '#ff4a50'],
      [state.pdMode ? 'PD' : 'SAN', state.pdMode ? state.pe : state.sanity, '#a974ff'],
      ['PE', state.pe, '#ffa040'],
    ];
    elMiniBars.innerHTML = defs.map(function (d) {
      var v = d[1];
      var pct = v.max > 0 ? Math.max(0, Math.min(100, (v.current / v.max) * 100)) : 0;
      return (
        '<div class="mini-bar"><div class="mini-bar-head"><span style="color:' + d[2] + '">' + d[0] + '</span><span>' + v.current + '/' + v.max + '</span></div>' +
        '<div class="mini-track"><div class="mini-fill" style="width:' + pct + '%;background:' + d[2] + '"></div></div></div>'
      );
    }).join('');
  }

  // ---- abas de baixo ----
  var TAB_DEFS = [
    { label: 'Status', icon: 'M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z' },
    { label: 'Perícias', icon: 'M12 2 21 7v10l-9 5-9-5V7zM12 2 7.5 9.5h9zM7.5 9.5 12 22l4.5-12.5' },
    { label: 'Ataques', icon: 'M14.5 4.5 19.5 9.5M4 20l9-9M16 3l5 5-3 3-5-5zM6 14l4 4' },
    { label: 'Rituais', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5 12q7-6 14 0q-7 6-14 0z' },
    { label: 'Mais', icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  function renderTabs() {
    if (!state) return;
    elTabs.innerHTML = TAB_DEFS.map(function (t, i) {
      var on = tab === i;
      return (
        '<button type="button" class="' + (on ? 'on' : '') + '" data-tab="' + i + '">' +
        '<span class="dot"></span>' +
        '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + t.icon + '"></path></svg>' +
        '<span class="label">' + t.label + '</span></button>'
      );
    }).join('');
    Array.prototype.forEach.call(elTabs.querySelectorAll('[data-tab]'), function (btn) {
      btn.onclick = function () { tab = Number(btn.getAttribute('data-tab')); renderAll(); };
    });
  }

  // ---- aba Status ----
  function renderStatus() {
    var pentagonNodes = ATTRS.map(function (a) {
      var val = (state.attributes && state.attributes[a.key]) || 0;
      return (
        '<button type="button" class="pentagon-node fc-press" style="left:' + a.left + '%;top:' + a.top + '%" data-attr="' + a.key + '" data-name="' + a.name + '" aria-label="Rolar ' + a.name + '">' +
        '<b>' + val + '</b><span>' + a.key + '</span></button>'
      );
    }).join('');

    var barDefs = [
      { label: 'VIDA', field: 'pv', a: 'var(--vida-a)', b: 'var(--vida-b)' },
    ];
    if (!state.pdMode) barDefs.push({ label: 'SANIDADE', field: 'sanity', a: 'var(--san-a)', b: 'var(--san-b)' });
    barDefs.push({ label: state.pdMode ? 'PONTOS DE DETERMINAÇÃO' : 'ESFORÇO', field: 'pe', a: 'var(--esf-a)', b: 'var(--esf-b)' });

    var barsHtml = barDefs.map(function (b) {
      var v = state[b.field];
      var pct = v.max > 0 ? Math.max(0, Math.min(100, (v.current / v.max) * 100)) : 0;
      return (
        '<div class="bar" style="--track-a:' + b.a + ';--track-b:' + b.b + '">' +
        '<div class="bar-head"><span>' + b.label + '</span><span>' + v.current + ' / ' + v.max + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar-steps">' +
        '<button type="button" class="fc-press" data-stepfield="' + b.field + '" data-delta="-5">−5</button>' +
        '<button type="button" class="fc-press" data-stepfield="' + b.field + '" data-delta="-1">−1</button>' +
        '<button type="button" class="fc-press" data-stepfield="' + b.field + '" data-delta="1">+1</button>' +
        '<button type="button" class="fc-press" data-stepfield="' + b.field + '" data-delta="5">+5</button>' +
        '</div></div>'
      );
    }).join('');

    var pePerTurn = state.nex >= 99 ? 20 : Math.max(1, Math.round(state.nex / 5));
    var ministatsHtml =
      '<div class="ministat"><b>' + (state.autoCalc ? (10 + ((state.attributes && state.attributes.AGI) || 0) + (state.defenseBonus || 0)) : state.defense) + '</b><span>DEFESA</span></div>' +
      '<div class="ministat"><b>' + pePerTurn + '</b><span>PE / TURNO</span></div>' +
      '<div class="ministat"><b>' + state.displacement + 'm</b><span>DESLOC.</span></div>';

    var condsHtml = CONDITIONS.map(function (c) {
      var on = (state.conditions || []).indexOf(c) !== -1;
      return '<button type="button" class="cond-chip' + (on ? ' on' : '') + '" data-cond="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');

    elApp.innerHTML =
      '<div class="panel">' +
      '<div class="card"><div class="pentagon-head"><span class="subhead">Atributos</span><small>toque pra rolar</small></div>' +
      '<div class="pentagon"><svg class="bg" viewBox="0 0 300 270"><polygon points="150,42 250,111 212,219 88,219 50,111"></polygon><path d="M150 135 150 42M150 135 250 111M150 135 212 219M150 135 88 219M150 135 50 111"></path></svg>' +
      '<span class="pentagon-center">ATRIBUTOS</span>' + pentagonNodes + '</div></div>' +
      barsHtml +
      '<div class="ministats">' + ministatsHtml + '</div>' +
      '<div><span class="subhead">Condições</span><div class="conditions" style="margin-top:8px">' + condsHtml + '</div></div>' +
      '</div>';

    Array.prototype.forEach.call(elApp.querySelectorAll('[data-attr]'), function (btn) {
      btn.onclick = function () { rollAttrByKey(btn.getAttribute('data-attr'), btn.getAttribute('data-name')); };
    });
    Array.prototype.forEach.call(elApp.querySelectorAll('[data-stepfield]'), function (btn) {
      btn.onclick = function () { updateBar(btn.getAttribute('data-stepfield'), Number(btn.getAttribute('data-delta'))); };
    });
    Array.prototype.forEach.call(elApp.querySelectorAll('[data-cond]'), function (btn) {
      btn.onclick = function () { toggleCondition(btn.getAttribute('data-cond')); };
    });
  }

  // ---- aba Perícias ----
  function tierColor(t) { return t >= 15 ? '#ffb547' : t >= 10 ? '#6fa8ff' : t >= 5 ? '#5bd48a' : '#d9d2cc'; }
  function tierLabel(t) { return t >= 15 ? 'expert' : t >= 10 ? 'veterano' : t >= 5 ? 'treinado' : 'destreinado'; }

  function renderSkills() {
    var list = SKILLS.filter(function (s) {
      if (skillFilter === 'all') return true;
      var st = (state.skills && state.skills[s.key]) || { training: 0 };
      return (st.training || 0) > 0;
    });
    var rowsHtml = list.length
      ? list.map(function (s) {
          var st = (state.skills && state.skills[s.key]) || { training: 0, bonus: 0 };
          var total = (st.training || 0) + (st.bonus || 0);
          var c = tierColor(st.training || 0);
          return (
            '<button type="button" class="skill-row fc-press" data-skill="' + s.key + '">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2 21 7v10l-9 5-9-5V7z"></path><path d="M12 2 7.5 9.5h9zM7.5 9.5 12 22l4.5-12.5"></path></svg>' +
            '<span class="names"><b style="color:' + c + '">' + esc(s.name) + (s.onlyTrained ? '*' : '') + (s.loadPenalty ? '+' : '') + '</b><small>' + s.attr + ' · ' + tierLabel(st.training || 0) + '</small></span>' +
            '<span class="bonus" style="color:' + (total ? c : '#6e6670') + '">' + (total >= 0 ? '+' : '') + total + '</span>' +
            '</button>'
          );
        }).join('')
      : '<p class="empty">Nenhuma perícia treinada ainda.</p>';

    elApp.innerHTML =
      '<div class="panel">' +
      '<div class="skills-toolbar">' +
      '<button type="button" id="filterTrained" class="' + (skillFilter === 'trained' ? 'on' : '') + '">Treinadas</button>' +
      '<button type="button" id="filterAll" class="' + (skillFilter === 'all' ? 'on' : '') + '">Todas (' + SKILLS.length + ')</button>' +
      '</div>' + rowsHtml +
      '<p class="skills-foot">+ penalidade de carga · * somente treinada</p>' +
      '</div>';

    document.getElementById('filterTrained').onclick = function () { skillFilter = 'trained'; renderApp(); };
    document.getElementById('filterAll').onclick = function () { skillFilter = 'all'; renderApp(); };
    Array.prototype.forEach.call(elApp.querySelectorAll('[data-skill]'), function (btn) {
      btn.onclick = function () { rollSkillByKey(btn.getAttribute('data-skill')); };
    });
  }

  // ---- aba Ataques ----
  function renderAttacks() {
    var attacks = state.attacks || [];
    var attacksHtml = attacks.length
      ? attacks.map(function (atk, i) {
          var meta = [atk.test, atk.damage ? ('Dano ' + atk.damage) : '', atk.crit ? ('Crítico ' + atk.crit) : '']
            .filter(Boolean).join(' · ');
          return (
            '<div class="attack-card">' +
            '<div class="attack-top"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ff6a70" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h13l3-3h2v6h-2l-3-3M7 12v4h3l1-4"></path></svg>' +
            '<div class="info"><b>' + esc(atk.name || 'Ataque') + '</b><span>' + esc(meta || '—') + '</span></div></div>' +
            '<button type="button" class="attack-dmg-btn fc-press" data-dmg="' + i + '"' + (atk.damage ? '' : ' disabled') + '>ROLAR DANO</button>' +
            '</div>'
          );
        }).join('')
      : '<p class="empty">Nenhum ataque cadastrado — adicione na ficha do computador.</p>';

    elApp.innerHTML =
      '<div class="panel">' + attacksHtml +
      '<span class="subhead">Rolagem rápida</span>' +
      '<div class="quick-grid">' +
      [4, 6, 8, 10, 12, 20].map(function (f) { return '<button type="button" class="fc-press" data-quick="1d' + f + '">d' + f + '</button>'; }).join('') +
      '<button type="button" class="fc-press" data-quick="2d6">2d6</button>' +
      '<button type="button" class="fc-press" data-quick="3d8">3d8</button>' +
      '</div></div>';

    Array.prototype.forEach.call(elApp.querySelectorAll('[data-dmg]'), function (btn) {
      btn.onclick = function () {
        var atk = attacks[Number(btn.getAttribute('data-dmg'))];
        if (atk && atk.damage) rollDamageExpr(state.name + ' · ' + (atk.name || 'ataque') + ' (dano)', atk.damage);
      };
    });
    Array.prototype.forEach.call(elApp.querySelectorAll('[data-quick]'), function (btn) {
      btn.onclick = function () { rollDamageExpr('ROLAGEM LIVRE', btn.getAttribute('data-quick')); };
    });
  }

  // ---- aba Rituais (leitura — editar pelo celular duplicaria bastante
  // lógica que hoje só existe em CharacterSheet.tsx) ----
  function renderRituals() {
    var rituals = state.rituals || [];
    var html = rituals.length
      ? rituals.map(function (r) {
          return (
            '<div class="ritual-card"><b>' + esc(r.name || 'Ritual') + '</b>' +
            '<span>' + r.circle + 'º círculo · ' + esc(r.element) + (r.cost ? ' · ' + esc(r.cost) : '') + '</span></div>'
          );
        }).join('')
      : '<p class="empty">Nenhum ritual cadastrado ainda.</p>';
    elApp.innerHTML = '<div class="panel">' + html + '</div>';
  }

  // ---- aba Mais (inventário / habilidades / progressão / descrição) ----
  var MORE_LABELS = ['Inventário', 'Habilidades', 'Progressão', 'Descrição'];

  function renderMore() {
    var tabsHtml = MORE_LABELS.map(function (label, i) {
      return '<button type="button" class="' + (moreTab === i ? 'on' : '') + '" data-more="' + i + '">' + label + '</button>';
    }).join('');

    var body = '';
    if (moreTab === 0) {
      var items = (state.inventory || []).filter(function (it) { return it.name; });
      body = items.length
        ? items.map(function (it) {
            var meta = [it.category, it.qty > 1 ? '×' + it.qty : '', it.notes].filter(Boolean).join(' · ');
            return '<div class="item-row"><b>' + esc(it.name) + '</b>' + (meta ? '<span>' + esc(meta) + '</span>' : '') + '</div>';
          }).join('')
        : '<p class="empty">Inventário vazio.</p>';
    } else if (moreTab === 1) {
      var abilities = state.abilities || [];
      body = abilities.length
        ? abilities.map(function (ab) { return '<div class="ability-row">' + esc(ab.name || '—') + '</div>'; }).join('')
        : '<p class="empty">Nenhuma habilidade ainda.</p>';
    } else if (moreTab === 2) {
      body =
        '<div class="progress-hint">Progressão (poder de classe, aumento de atributo, grau de treinamento) tem ' +
        'vários passos pra escolher — abra a ficha no computador pra fazer essas escolhas com calma.</div>';
    } else {
      body =
        '<textarea class="desc" id="notesArea" placeholder="Histórico, objetivos, segredos do personagem...">' +
        esc(state.notes || '') + '</textarea>';
    }

    elApp.innerHTML = '<div class="panel"><div class="more-tabs">' + tabsHtml + '</div>' + body + '</div>';

    Array.prototype.forEach.call(elApp.querySelectorAll('[data-more]'), function (btn) {
      btn.onclick = function () { moreTab = Number(btn.getAttribute('data-more')); renderApp(); };
    });
    var notesArea = document.getElementById('notesArea');
    if (notesArea) {
      notesArea.oninput = function () { patchState({ notes: notesArea.value }, false); };
    }
  }

  function renderApp() {
    if (!state) return;
    if (tab === 0) renderStatus();
    else if (tab === 1) renderSkills();
    else if (tab === 2) renderAttacks();
    else if (tab === 3) renderRituals();
    else renderMore();
  }

  function renderAll() {
    if (!state) return;
    renderHeader();
    renderTabs();
    renderApp();
  }

  connect();
})();
</script>
</body>
</html>`;
}

module.exports = { renderFichaPage };
