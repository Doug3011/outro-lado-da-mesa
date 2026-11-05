// Página da ficha pro celular (QR code no rodapé da janela "Ficha", ver
// src/components/FichaQr.tsx) — pedido do usuário: escanear e ver (e poder
// mexer em) a ficha pelo celular, na mesma rede.
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
// A lista de perícias (chave/nome/atributo) é uma cópia pequena e estática
// de src/data/ordem.ts — esta página não pode importar TS/React (é servida
// crua, sem build), então duplica só esses dados de referência (não a lógica
// de regra: o cálculo de bônus/rolagem abaixo é o mesmo de src/domain/dice.ts
// e src/domain/character.ts, só reescrito em JS puro).
'use strict';

const SKILLS = [
  { key: 'acrobacia', name: 'Acrobacia', attr: 'AGI' },
  { key: 'adestramento', name: 'Adestramento', attr: 'PRE' },
  { key: 'artes', name: 'Artes', attr: 'PRE' },
  { key: 'atletismo', name: 'Atletismo', attr: 'FOR' },
  { key: 'atualidades', name: 'Atualidades', attr: 'INT' },
  { key: 'ciencias', name: 'Ciências', attr: 'INT' },
  { key: 'crime', name: 'Crime', attr: 'AGI' },
  { key: 'diplomacia', name: 'Diplomacia', attr: 'PRE' },
  { key: 'enganacao', name: 'Enganação', attr: 'PRE' },
  { key: 'fortitude', name: 'Fortitude', attr: 'VIG' },
  { key: 'furtividade', name: 'Furtividade', attr: 'AGI' },
  { key: 'iniciativa', name: 'Iniciativa', attr: 'AGI' },
  { key: 'intimidacao', name: 'Intimidação', attr: 'PRE' },
  { key: 'intuicao', name: 'Intuição', attr: 'PRE' },
  { key: 'investigacao', name: 'Investigação', attr: 'INT' },
  { key: 'luta', name: 'Luta', attr: 'FOR' },
  { key: 'medicina', name: 'Medicina', attr: 'INT' },
  { key: 'ocultismo', name: 'Ocultismo', attr: 'INT' },
  { key: 'percepcao', name: 'Percepção', attr: 'PRE' },
  { key: 'pilotagem', name: 'Pilotagem', attr: 'AGI' },
  { key: 'pontaria', name: 'Pontaria', attr: 'AGI' },
  { key: 'profissao', name: 'Profissão', attr: 'INT' },
  { key: 'reflexos', name: 'Reflexos', attr: 'AGI' },
  { key: 'religiao', name: 'Religião', attr: 'PRE' },
  { key: 'sobrevivencia', name: 'Sobrevivência', attr: 'INT' },
  { key: 'tatica', name: 'Tática', attr: 'INT' },
  { key: 'tecnologia', name: 'Tecnologia', attr: 'INT' },
  { key: 'vontade', name: 'Vontade', attr: 'PRE' },
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
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Ficha — O Outro Lado da Mesa</title>
<style>
  :root {
    --bg: #0b0b0d; --bg-1: #141417; --bg-2: #1a1b1f; --bg-3: #232429;
    --line: #2c2d34; --text: #ededee; --text-dim: #9a9ba3; --text-faint: #6a6b73;
    --blood: #e01e2b; --blood-bright: #ff3b47; --blood-tint: #241016;
    --gold: #e8b21e; --green: #2fae66;
    --font-body: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    --font-disp: 'Oswald', 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); padding: 14px 14px 40px; }
  h1 { font-family: var(--font-disp); font-size: 20px; margin: 0 0 2px; }
  .sub { color: var(--text-dim); font-size: 13px; margin-bottom: 14px; }
  .status { font-size: 12px; color: var(--text-faint); margin-bottom: 10px; }
  .card { background: var(--bg-1); border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  .attr { flex: 1 1 60px; background: var(--bg-2); border-radius: 8px; padding: 6px 4px; text-align: center; }
  .attr b { display: block; font-family: var(--font-disp); font-size: 16px; }
  .attr span { font-size: 10px; color: var(--text-dim); }
  .bar-label { font-family: var(--font-disp); font-size: 12px; color: var(--text-dim); margin-bottom: 2px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .bar-row:last-child { margin-bottom: 0; }
  .bar-btn { flex: none; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg-2); color: var(--text); font-size: 16px; }
  .bar-btn:active { background: var(--bg-3); }
  .bar-val { flex: 1; text-align: center; font-family: var(--font-disp); font-size: 15px; }
  .skills { max-height: 52vh; overflow-y: auto; }
  .skill-row { display: flex; align-items: center; gap: 8px; padding: 6px 2px; border-bottom: 1px solid var(--line); }
  .skill-row:last-child { border-bottom: none; }
  .skill-name { flex: 1; font-size: 13.5px; }
  .skill-bonus { font-family: var(--font-disp); font-size: 13px; color: var(--text-dim); width: 38px; text-align: right; }
  .roll-btn { flex: none; background: var(--blood); color: #fff; border: none; border-radius: 8px; padding: 7px 10px; font-size: 13px; }
  .roll-btn:active { background: var(--blood-bright); }
  .toast { position: fixed; left: 14px; right: 14px; bottom: 14px; background: var(--bg-2); border: 1px solid var(--blood); border-radius: 10px; padding: 10px 12px; font-size: 13px; display: none; }
  .toast.on { display: block; }
  .toast b { color: var(--gold); }
  .item-row { font-size: 12.5px; color: var(--text-dim); padding: 3px 0; }
  .empty { color: var(--text-faint); font-size: 13px; padding: 20px 0; text-align: center; }
</style>
</head>
<body>
  <h1 id="name">Carregando…</h1>
  <div class="sub" id="sub"></div>
  <div class="status" id="status">conectando…</div>
  <div id="app"></div>
  <div class="toast" id="toast"></div>

<script>
(function () {
  var CHAR_ID = ${safeId};
  var SKILLS = ${JSON.stringify(SKILLS)};
  var ME_ID = 'phone-' + Math.random().toString(36).slice(2);
  var state = null;
  var ws = null;

  var elName = document.getElementById('name');
  var elSub = document.getElementById('sub');
  var elStatus = document.getElementById('status');
  var elApp = document.getElementById('app');
  var elToast = document.getElementById('toast');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function connect() {
    elStatus.textContent = 'conectando…';
    ws = new WebSocket('ws://' + location.host + '/lan/room');
    ws.onopen = function () {
      elStatus.textContent = 'conectado — carregando ficha…';
      ws.send(JSON.stringify({ __hello: true, me: { id: ME_ID, name: 'Celular', color: '#e01e2b', isGM: false } }));
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.__presence) return;
      if (msg.type === 'sync:state') {
        var found = (msg.payload.characters || []).filter(function (c) { return c.id === CHAR_ID; })[0];
        if (found) { state = found; elStatus.textContent = 'ao vivo'; render(); }
        else if (!state) { showNotFound(); }
      } else if (msg.type === 'sheet:upsert' && msg.payload && msg.payload.id === CHAR_ID) {
        state = msg.payload;
        render();
      } else if (msg.type === 'sheet:delete' && msg.payload && msg.payload.id === CHAR_ID) {
        state = null;
        showNotFound();
      }
    };
    ws.onclose = function () {
      elStatus.textContent = 'desconectado — reconectando…';
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
    elApp.innerHTML = '';
  }

  function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

  function toast(html, ms) {
    elToast.innerHTML = html;
    elToast.className = 'toast on';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { elToast.className = 'toast'; }, ms || 5000);
  }

  function updateBar(field, delta) {
    if (!state) return;
    var cur = state[field];
    var next = Math.max(0, Math.min(cur.max, cur.current + delta));
    if (next === cur.current) return;
    var patched = Object.assign({}, state, {
      updatedAt: Date.now(),
    });
    patched[field] = Object.assign({}, cur, { current: next });
    state = patched;
    send({ type: 'sheet:upsert', payload: state });
    render();
  }

  function rollSkill(key) {
    if (!state) return;
    var def = null;
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i].key === key) def = SKILLS[i];
    if (!def) return;
    var st = (state.skills && state.skills[key]) || { training: 0, bonus: 0 };
    var bonus = (st.training || 0) + (st.bonus || 0);
    var attrVal = (state.attributes && state.attributes[def.attr]) || 0;
    var pickedLowest = attrVal <= 0;
    var n = pickedLowest ? 2 : attrVal;
    var dice = [];
    for (var d = 0; d < n; d++) dice.push(rollDie(20));
    var chosen = pickedLowest ? Math.min.apply(null, dice) : Math.max.apply(null, dice);
    var total = chosen + bonus;
    var entry = {
      id: Math.random().toString(36).slice(2),
      at: Date.now(),
      authorId: ME_ID,
      authorName: state.name + ' (celular)',
      authorColor: '#e01e2b',
      label: state.name + ' · ' + def.name + ' (' + def.attr + ')',
      result: {
        kind: 'ordem-test',
        attributeValue: attrVal,
        diceCount: n,
        dice: dice,
        chosen: chosen,
        pickedLowest: pickedLowest,
        bonus: bonus,
        total: total,
        dt: null,
        success: null,
        critical: !pickedLowest && chosen === 20,
        fumble: chosen === 1,
      },
    };
    send({ type: 'roll', payload: entry });
    var tag = entry.result.critical ? ' <b>(crítico!)</b>' : entry.result.fumble ? ' <b>(1 natural)</b>' : '';
    toast('<b>' + esc(def.name) + '</b>: ' + chosen + ' + ' + bonus + ' = <b>' + total + '</b>' + tag);
  }

  function bar(label, field) {
    if (!state[field]) return '';
    var v = state[field];
    return (
      '<div class="bar-row">' +
      '<span class="bar-label" style="flex:none;width:64px">' + label + '</span>' +
      '<button class="bar-btn" data-act="dec" data-field="' + field + '">−</button>' +
      '<span class="bar-val">' + v.current + ' / ' + v.max + '</span>' +
      '<button class="bar-btn" data-act="inc" data-field="' + field + '">+</button>' +
      '</div>'
    );
  }

  function render() {
    if (!state) return;
    elName.textContent = state.name || 'Agente';
    elSub.textContent = [state.player ? 'Jogador: ' + state.player : '', state.classe, state.origem, 'NEX ' + state.nex + '%']
      .filter(Boolean)
      .join(' · ');

    var attrsHtml = ['AGI', 'FOR', 'INT', 'PRE', 'VIG']
      .map(function (k) {
        return '<div class="attr"><b>' + ((state.attributes && state.attributes[k]) || 0) + '</b><span>' + k + '</span></div>';
      })
      .join('');

    var skillsHtml = SKILLS.map(function (def) {
      var st = (state.skills && state.skills[def.key]) || { training: 0, bonus: 0 };
      var total = (st.training || 0) + (st.bonus || 0);
      return (
        '<div class="skill-row">' +
        '<span class="skill-name">' + esc(def.name) + ' <span style="color:var(--text-faint)">(' + def.attr + ')</span></span>' +
        '<span class="skill-bonus">' + (total >= 0 ? '+' : '') + total + '</span>' +
        '<button class="roll-btn" data-roll="' + def.key + '">🎲</button>' +
        '</div>'
      );
    }).join('');

    var inv = (state.inventory || [])
      .filter(function (it) { return it.name; })
      .map(function (it) { return '<div class="item-row">' + esc(it.name) + (it.qty > 1 ? ' ×' + it.qty : '') + '</div>'; })
      .join('');

    elApp.innerHTML =
      '<div class="card">' +
      '<div class="row" style="margin-bottom:10px">' + attrsHtml + '</div>' +
      bar('VIDA', 'pv') + bar('SANIDADE', 'sanity') + bar('ESFORÇO (PE)', 'pe') +
      '<div class="bar-row" style="margin-top:8px"><span class="bar-label" style="flex:none;width:64px">DEFESA</span><span class="bar-val" style="text-align:left">' + state.defense + '</span>' +
      '<span class="bar-label" style="flex:none;width:90px;text-align:right">Deslc. ' + state.displacement + 'm</span></div>' +
      '</div>' +
      '<div class="card"><div class="bar-label" style="margin-bottom:6px">PERÍCIAS</div><div class="skills">' + skillsHtml + '</div></div>' +
      (inv ? '<div class="card"><div class="bar-label" style="margin-bottom:6px">INVENTÁRIO</div>' + inv + '</div>' : '');

    elApp.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.onclick = function () {
        var delta = btn.getAttribute('data-act') === 'inc' ? 1 : -1;
        updateBar(btn.getAttribute('data-field'), delta);
      };
    });
    elApp.querySelectorAll('[data-roll]').forEach(function (btn) {
      btn.onclick = function () { rollSkill(btn.getAttribute('data-roll')); };
    });
  }

  connect();
})();
</script>
</body>
</html>`;
}

module.exports = { renderFichaPage };
