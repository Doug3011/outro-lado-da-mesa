// Servidor local do "Outro Lado" — roda dentro do executável.
// Serve o app (dist/), faz o relay de sala (WebSocket) e o anúncio/descoberta
// de mesas na rede local (broadcast UDP, igual ao "Mundo de LAN" do Minecraft).
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const dgram = require('node:dgram');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');
const { WebSocketServer } = require('ws');

const HTTP_PORT = Number(process.env.ORDEM_PORT) || 47300;
const DISCOVERY_PORT = 47310;
const APP_ID = 'outro-lado-v1';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
};

// Extensões de áudio aceitas na importação de música (aba Músicas) e o
// Content-Type que cada uma serve como.
const MUSIC_MIME = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  opus: 'audio/opus',
};

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  // prioriza adaptadores de VPN de LAN virtual (Radmin/Hamachi/ZeroTier) e físicos comuns
  const all = [];
  for (const name of Object.keys(ifaces)) {
    for (const i of ifaces[name] || []) {
      if (i.family === 'IPv4' && !i.internal) all.push({ name, address: i.address });
    }
  }
  const radmin = all.find((x) => /radmin/i.test(x.name));
  return (radmin || all[0] || { address: '127.0.0.1' }).address;
}

/* ---------------- servidor HTTP (arquivos + injeção do modo LAN) ---------------- */

function injectLanFlag(html) {
  const info = { available: true, localIp: getLocalIp(), port: HTTP_PORT };
  const tag = `<script>window.__ORDEM_LAN__=${JSON.stringify(info)};</script>`;
  return html.includes('</head>') ? html.replace('</head>', tag + '</head>') : tag + html;
}

function serveStatic(req, res) {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.normalize(path.join(DIST_DIR, p));
  if (!full.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(full, (err, data) => {
    const target = err ? path.join(DIST_DIR, 'index.html') : full;
    fs.readFile(target, (e2, data2) => {
      if (e2) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(target);
      const isHtml = ext === '.html';
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(isHtml ? injectLanFlag(data2.toString('utf8')) : data2);
    });
  });
}

const server = http.createServer((req, res) => {
  // CORS liberado geral: um jogador entra na mesa mas continua com a PÁGINA
  // carregada do PRÓPRIO servidor local dele (o app sempre sobe o dele
  // próprio em localhost, mesmo quando só vai entrar numa mesa de outro
  // computador) — só o WebSocket da sala aponta pro host remoto. Sem isso,
  // `fetch('/api/music')` feito a partir do host do mestre (URL absoluta,
  // ver src/lib/musicLibrary.ts) seria bloqueado por CORS no navegador do
  // jogador. Sem risco aqui: mesa é só rede local, sem conta/autenticação.
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === '/lan/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ available: true, localIp: getLocalIp(), hostname: os.hostname() }));
    return;
  }
  const urlObj = new URL(req.url || '/', 'http://localhost');
  if (urlObj.pathname.startsWith('/api/music') || urlObj.pathname.startsWith('/music/')) {
    if (handleMusicApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/tokens') || urlObj.pathname.startsWith('/tokens/')) {
    if (tokenLibrary.handleApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/maps') || urlObj.pathname.startsWith('/maps/')) {
    if (mapLibrary.handleApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/ambient') || urlObj.pathname.startsWith('/ambient/')) {
    if (ambientLibrary.handleApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/scenery') || urlObj.pathname.startsWith('/scenery/')) {
    if (sceneryLibrary.handleApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/places')) {
    if (handlePlacesApi(req, res, urlObj)) return;
  }
  if (urlObj.pathname.startsWith('/api/map2d')) {
    if (handleMap2DApi(req, res, urlObj)) return;
  }
  serveStatic(req, res);
});

/* ---------------- estado da mesa: salvo em arquivo, sobrevive a reinícios ---------------- */
// O relay não é mais "burro": ele também aplica cada evento a um estado em memória
// e grava em disco (debounced). Assim, fechar e abrir o app de novo — ou trocar de
// IP na rede — não perde a mesa: quem conectar recebe esse estado na hora.

const SAVE_DIR = path.join(process.env.APPDATA || os.homedir(), 'OutroLado');
const SAVE_FILE = path.join(SAVE_DIR, 'save.json');

const DEFAULT_MUSIC = { trackId: null, playing: false, startedAt: 0, positionAtStart: 0, loop: true };

let roomState = {
  characters: {},
  scenes: [],
  activeSceneId: '',
  profiles: {},
  music: { ...DEFAULT_MUSIC },
  // câmera livre do mestre numa mesa 3D — só em memória, nunca vai pro
  // save.json (é view efêmera, não estado da mesa), mas fica disponível pra
  // quem conectar no meio da sessão já ver o enquadramento atual em vez de
  // esperar o próximo movimento do mestre.
  camera3d: null,
};

function loadState() {
  try {
    const raw = fs.readFileSync(SAVE_FILE, 'utf8');
    const data = JSON.parse(raw);
    roomState = {
      characters: data.characters || {},
      scenes: Array.isArray(data.scenes) ? data.scenes : [],
      activeSceneId: data.activeSceneId || '',
      profiles: data.profiles || {},
      music: data.music ? { ...DEFAULT_MUSIC, ...data.music } : { ...DEFAULT_MUSIC },
      camera3d: null,
    };
    console.log('Save carregado: ' + SAVE_FILE);
  } catch {
    console.log('Nenhum save anterior encontrado — começando mesa nova.');
  }
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
      fs.writeFileSync(SAVE_FILE, JSON.stringify(roomState));
    } catch (e) {
      console.error('Erro salvando a mesa:', e.message);
    }
  }, 800);
}

function findScene(sceneId) {
  return roomState.scenes.find((s) => s.id === sceneId);
}

// Cria o cenário do zero se o servidor ainda não sabia dele — cobre o cenário
// padrão que cada cliente gera sozinho ao conectar pela 1ª vez, antes de
// existir um "scene:upsert" explícito.
function findOrCreateScene(sceneId) {
  let sc = findScene(sceneId);
  if (!sc) {
    sc = {
      id: sceneId,
      name: 'Cenário 1',
      kind: '2d',
      map: { cols: 30, rows: 20, cellSize: 48, showGrid: true, metersPerCell: 1.5, fogHidden: [] },
      ground: null,
      objects3d: [],
      tokens: {},
    };
    roomState.scenes.push(sc);
  }
  return sc;
}

function applyToState(ev) {
  if (!ev || typeof ev !== 'object') return;
  switch (ev.type) {
    case 'sheet:upsert':
      roomState.characters[ev.payload.id] = ev.payload;
      break;
    case 'sheet:delete':
      delete roomState.characters[ev.payload.id];
      break;
    case 'profile:upsert':
      roomState.profiles[ev.payload.ownerId] = ev.payload;
      break;
    case 'token:upsert': {
      const sc = findOrCreateScene(ev.payload.sceneId);
      sc.tokens[ev.payload.token.id] = ev.payload.token;
      break;
    }
    case 'token:move': {
      const sc = findScene(ev.payload.sceneId);
      const t = sc && sc.tokens[ev.payload.id];
      if (t) {
        t.x = ev.payload.x;
        t.y = ev.payload.y;
      }
      break;
    }
    case 'token:delete': {
      const sc = findScene(ev.payload.sceneId);
      if (sc) delete sc.tokens[ev.payload.id];
      break;
    }
    case 'map:update': {
      const sc = findOrCreateScene(ev.payload.sceneId);
      Object.assign(sc.map, ev.payload.patch);
      break;
    }
    case 'scene:upsert': {
      const i = roomState.scenes.findIndex((s) => s.id === ev.payload.id);
      if (i >= 0) roomState.scenes[i] = ev.payload;
      else roomState.scenes.push(ev.payload);
      break;
    }
    case 'scene:delete':
      roomState.scenes = roomState.scenes.filter((s) => s.id !== ev.payload.id);
      break;
    case 'scene:switch':
      roomState.activeSceneId = ev.payload.id;
      break;
    case 'music:state':
      roomState.music = ev.payload;
      break;
    case 'place3d:update': {
      // BUG achado numa varredura (ground/objects3d eram os únicos campos
      // aplicados aqui) — groundSize/terrain/sky/skyPreset do mestre nunca
      // chegavam no estado AUTORITATIVO do servidor: ficavam de fora do
      // save.json e, pior, de quem reconectava/entrava no meio da sessão
      // (stateForClient manda roomState.scenes, que nunca tinha esses
      // campos atualizados — via o cliente, o mestre via relevo/céu
      // certinho, mas quem reconectava via o chão liso/sem céu).
      const sc = findOrCreateScene(ev.payload.sceneId);
      if (ev.payload.ground !== undefined) sc.ground = ev.payload.ground;
      if (ev.payload.groundSize !== undefined) sc.groundSize = ev.payload.groundSize;
      if (ev.payload.terrain !== undefined) sc.terrain = ev.payload.terrain;
      if (ev.payload.sky !== undefined) sc.sky = ev.payload.sky;
      if (ev.payload.skyPreset !== undefined) sc.skyPreset = ev.payload.skyPreset;
      if (ev.payload.objects3d !== undefined) sc.objects3d = ev.payload.objects3d;
      break;
    }
    case 'camera3d:update':
      // efêmero — atualiza só em memória (pra quem conectar no meio da
      // sessão), nunca grava no save.json.
      roomState.camera3d = ev.payload;
      return;
    default:
      return; // roll/notify/sync:* não fazem parte do estado salvo
  }
  scheduleSave();
}

function stateForClient(isGM) {
  return {
    type: 'sync:state',
    payload: {
      characters: Object.values(roomState.characters),
      scenes: roomState.scenes,
      activeSceneId: roomState.activeSceneId,
      profiles: isGM ? Object.values(roomState.profiles) : undefined,
      music: roomState.music,
      camera3d: roomState.camera3d,
      authoritative: true,
    },
  };
}

loadState();

/* ---------------- biblioteca de música: arquivos + metadados, sobrevive entre ---------------- */
/* mesas (não é "estado da mesa" — é da instalação, igual biblioteca de fichas/  */
/* criaturas: importa uma vez, fica pronta pra qualquer mesa futura no menu).    */

const MUSIC_DIR = path.join(SAVE_DIR, 'music');
const MUSIC_LIB_FILE = path.join(SAVE_DIR, 'music-library.json');
let musicLibrary = { folders: [], tracks: [] };

function loadMusicLibrary() {
  try {
    const raw = fs.readFileSync(MUSIC_LIB_FILE, 'utf8');
    const data = JSON.parse(raw);
    musicLibrary = {
      folders: Array.isArray(data.folders) ? data.folders : [],
      tracks: Array.isArray(data.tracks) ? data.tracks : [],
    };
  } catch {
    musicLibrary = { folders: [], tracks: [] };
  }
}

function saveMusicLibrary() {
  try {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    fs.writeFileSync(MUSIC_LIB_FILE, JSON.stringify(musicLibrary));
  } catch (e) {
    console.error('Erro salvando biblioteca de música:', e.message);
  }
}

loadMusicLibrary();

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let destroyed = false;
    req.on('data', (c) => {
      data += c;
      // limite generoso (700MB) — as "places" da mesa 3D guardam as imagens
      // dos objetos/chão E modelos .glb/.fbx/.stl como data URL embutida
      // direto no JSON (mesmo formato de sempre pra token/mapa/personagem),
      // então o corpo de uma place com vários modelos pesados (ex.: cidade
      // inteira) passa fácil de centenas de MB (achado real: um único
      // modelo .glb de 96MB no disco já vira ~122MB em base64). Pedido do
      // usuário pra subir de 200MB pra 700MB — mantém margem segura abaixo
      // do teto de ~1GB do V8 pra tamanho de string (`JSON.stringify`
      // quebra com RangeError acima disso, tanto aqui quanto no app que
      // monta o payload — não é um limite arbitrário meu, é do motor JS).
      if (data.length > 700e6) {
        destroyed = true;
        // BUG achado (usuário: "salvei o mapa mas ele reseta"): destroy()
        // sem argumento de erro não disparava 'error' nenhum aqui — a
        // promise ficava pendurada pra sempre, então quem chamava nunca via
        // rejeição nenhuma (só o fetch do cliente quebrando por conta
        // própria, sem o servidor nunca respondendo nada de jeito nenhum).
        // Passar um Error pra destroy() garante que 'error' dispara.
        req.destroy(new Error('payload too large'));
      }
    });
    req.on('end', () => {
      if (destroyed) return; // já rejeitado via 'error'
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('request aborted')));
  });
}

// Upload de uma faixa: corpo da requisição é o arquivo cru (sem multipart —
// evita puxar dependência nova só pra isso), nome/pasta/extensão vêm na query.
function handleTrackUpload(req, res, id, urlObj) {
  const name = decodeURIComponent(urlObj.searchParams.get('name') || 'Música').slice(0, 120);
  let ext = (urlObj.searchParams.get('ext') || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!MUSIC_MIME[ext]) ext = 'mp3';
  const folderId = urlObj.searchParams.get('folderId') || null;

  fs.mkdirSync(MUSIC_DIR, { recursive: true });
  const filePath = path.join(MUSIC_DIR, id + '.' + ext);
  const out = fs.createWriteStream(filePath);
  req.pipe(out);
  out.on('finish', () => {
    const track = { id, name, ext, folderId, addedAt: Date.now() };
    const i = musicLibrary.tracks.findIndex((t) => t.id === id);
    if (i >= 0) musicLibrary.tracks[i] = track;
    else musicLibrary.tracks.push(track);
    saveMusicLibrary();
    sendJson(res, 200, track);
  });
  out.on('error', (e) => {
    res.writeHead(500);
    res.end('falha no upload: ' + e.message);
  });
  req.on('error', () => out.destroy());
}

// Serve o arquivo de áudio com suporte a Range (o <audio> do navegador pede em
// pedaços — sem isso ele baixa o arquivo inteiro antes de tocar/permitir seek).
function serveMusicFile(req, res, id) {
  const track = musicLibrary.tracks.find((t) => t.id === id);
  if (!track) {
    res.writeHead(404);
    res.end();
    return;
  }
  const filePath = path.join(MUSIC_DIR, id + '.' + track.ext);
  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    const mime = MUSIC_MIME[track.ext] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mime,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// Roteador da API de música — devolve true se já respondeu a requisição.
function handleMusicApi(req, res, urlObj) {
  const p = urlObj.pathname;

  if (p === '/api/music' && req.method === 'GET') {
    sendJson(res, 200, musicLibrary);
    return true;
  }
  if (p === '/api/music/folders' && req.method === 'POST') {
    readJsonBody(req)
      .then((body) => {
        const folder = { id: crypto.randomUUID(), name: String(body.name || 'Pasta').slice(0, 60) };
        musicLibrary.folders.push(folder);
        saveMusicLibrary();
        sendJson(res, 200, folder);
      })
      .catch(() => {
        res.writeHead(400);
        res.end();
      });
    return true;
  }
  let m;
  if ((m = /^\/api\/music\/folders\/([^/]+)$/.exec(p)) && req.method === 'DELETE') {
    const id = m[1];
    musicLibrary.folders = musicLibrary.folders.filter((f) => f.id !== id);
    for (const t of musicLibrary.tracks) if (t.folderId === id) t.folderId = null;
    saveMusicLibrary();
    sendJson(res, 200, { ok: true });
    return true;
  }
  if ((m = /^\/api\/music\/tracks\/([^/]+)$/.exec(p))) {
    const id = m[1];
    if (req.method === 'PUT') {
      handleTrackUpload(req, res, id, urlObj);
      return true;
    }
    if (req.method === 'PATCH') {
      readJsonBody(req)
        .then((body) => {
          const t = musicLibrary.tracks.find((x) => x.id === id);
          if (!t) {
            res.writeHead(404);
            res.end();
            return;
          }
          if (typeof body.name === 'string') t.name = body.name.slice(0, 120);
          if ('folderId' in body) t.folderId = body.folderId || null;
          saveMusicLibrary();
          sendJson(res, 200, t);
        })
        .catch(() => {
          res.writeHead(400);
          res.end();
        });
      return true;
    }
    if (req.method === 'DELETE') {
      const t = musicLibrary.tracks.find((x) => x.id === id);
      musicLibrary.tracks = musicLibrary.tracks.filter((x) => x.id !== id);
      saveMusicLibrary();
      if (t) {
        try {
          fs.unlinkSync(path.join(MUSIC_DIR, id + '.' + t.ext));
        } catch {
          /* já não tinha arquivo — ignora */
        }
      }
      sendJson(res, 200, { ok: true });
      return true;
    }
  }
  if ((m = /^\/music\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    serveMusicFile(req, res, m[1]);
    return true;
  }
  return false;
}

/* ---------------- bibliotecas de token e de mapa: mesma ideia da de música ---
   (pastas + itens, arquivo cru servido por HTTP), só que genérica — em vez de
   copiar o bloco de música duas vezes, uma fábrica cria as duas instâncias.
   Não toquei no código de música acima pra não arriscar quebrar o que já
   funciona; esse é só o molde novo pros dois tipos de biblioteca novos. --- */

const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function createAssetLibrary({ apiPrefix, fileRoutePrefix, dir, libFile, mimeMap, defaultExt, extraFields = [] }) {
  let library = { folders: [], items: [] };

  function load() {
    try {
      const raw = fs.readFileSync(libFile, 'utf8');
      const data = JSON.parse(raw);
      library = {
        folders: Array.isArray(data.folders) ? data.folders : [],
        items: Array.isArray(data.items) ? data.items : [],
      };
    } catch {
      library = { folders: [], items: [] };
    }
  }

  function save() {
    try {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
      fs.writeFileSync(libFile, JSON.stringify(library));
    } catch (e) {
      console.error(`Erro salvando biblioteca (${apiPrefix}):`, e.message);
    }
  }

  load();

  function handleUpload(req, res, id, urlObj) {
    const name = decodeURIComponent(urlObj.searchParams.get('name') || 'Item').slice(0, 120);
    let ext = (urlObj.searchParams.get('ext') || defaultExt).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!mimeMap[ext]) ext = defaultExt;
    const folderId = urlObj.searchParams.get('folderId') || null;
    const extra = {};
    for (const f of extraFields) extra[f.key] = f.parse(urlObj.searchParams.get(f.key));

    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, id + '.' + ext);
    const out = fs.createWriteStream(filePath);
    req.pipe(out);
    out.on('finish', () => {
      const item = { id, name, ext, folderId, addedAt: Date.now(), ...extra };
      const i = library.items.findIndex((x) => x.id === id);
      if (i >= 0) library.items[i] = item;
      else library.items.push(item);
      save();
      sendJson(res, 200, item);
    });
    out.on('error', (e) => {
      res.writeHead(500);
      res.end('falha no upload: ' + e.message);
    });
    req.on('error', () => out.destroy());
  }

  function serveFile(req, res, id) {
    const item = library.items.find((x) => x.id === id);
    if (!item) {
      res.writeHead(404);
      res.end();
      return;
    }
    const filePath = path.join(dir, id + '.' + item.ext);
    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      const mime = mimeMap[item.ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': mime, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  function handleApi(req, res, urlObj) {
    const p = urlObj.pathname;
    if (p === apiPrefix && req.method === 'GET') {
      sendJson(res, 200, library);
      return true;
    }
    if (p === apiPrefix + '/folders' && req.method === 'POST') {
      readJsonBody(req)
        .then((body) => {
          const folder = { id: crypto.randomUUID(), name: String(body.name || 'Pasta').slice(0, 60) };
          library.folders.push(folder);
          save();
          sendJson(res, 200, folder);
        })
        .catch(() => {
          res.writeHead(400);
          res.end();
        });
      return true;
    }
    let m;
    if ((m = new RegExp(`^${apiPrefix}/folders/([^/]+)$`).exec(p)) && req.method === 'DELETE') {
      const id = m[1];
      library.folders = library.folders.filter((f) => f.id !== id);
      for (const x of library.items) if (x.folderId === id) x.folderId = null;
      save();
      sendJson(res, 200, { ok: true });
      return true;
    }
    if ((m = new RegExp(`^${apiPrefix}/items/([^/]+)$`).exec(p))) {
      const id = m[1];
      if (req.method === 'PUT') {
        handleUpload(req, res, id, urlObj);
        return true;
      }
      if (req.method === 'PATCH') {
        readJsonBody(req)
          .then((body) => {
            const x = library.items.find((it) => it.id === id);
            if (!x) {
              res.writeHead(404);
              res.end();
              return;
            }
            if (typeof body.name === 'string') x.name = body.name.slice(0, 120);
            if ('folderId' in body) x.folderId = body.folderId || null;
            for (const f of extraFields) if (f.key in body) x[f.key] = f.parse(body[f.key]);
            save();
            sendJson(res, 200, x);
          })
          .catch(() => {
            res.writeHead(400);
            res.end();
          });
        return true;
      }
      if (req.method === 'DELETE') {
        const x = library.items.find((it) => it.id === id);
        library.items = library.items.filter((it) => it.id !== id);
        save();
        if (x) {
          try {
            fs.unlinkSync(path.join(dir, id + '.' + x.ext));
          } catch {
            /* já não tinha arquivo — ignora */
          }
        }
        sendJson(res, 200, { ok: true });
        return true;
      }
    }
    if ((m = new RegExp(`^${fileRoutePrefix}/([^/]+)$`).exec(p)) && req.method === 'GET') {
      serveFile(req, res, m[1]);
      return true;
    }
    return false;
  }

  return { handleApi };
}

const tokenLibrary = createAssetLibrary({
  apiPrefix: '/api/tokens',
  fileRoutePrefix: '/tokens',
  dir: path.join(SAVE_DIR, 'tokens'),
  libFile: path.join(SAVE_DIR, 'token-library.json'),
  mimeMap: IMAGE_MIME,
  defaultExt: 'png',
});

const mapLibrary = createAssetLibrary({
  apiPrefix: '/api/maps',
  fileRoutePrefix: '/maps',
  dir: path.join(SAVE_DIR, 'maps'),
  libFile: path.join(SAVE_DIR, 'map-library.json'),
  mimeMap: IMAGE_MIME,
  defaultExt: 'png',
  extraFields: [{ key: 'kind', parse: (v) => (v === '3d' ? '3d' : '2d') }],
});

// Sons ambiente (soundboard: porta abrindo, trovão etc.) — pedido do
// usuário, "área separada das músicas". Mesma fábrica genérica de
// token/mapa; a diferença de "toca uma vez pra mesa toda" (em vez de "faixa
// tocando agora") é só do lado do cliente (ambientCue efêmero em
// useTableStore.ts) — aqui é só mais uma biblioteca de arquivo+metadados.
const ambientLibrary = createAssetLibrary({
  apiPrefix: '/api/ambient',
  fileRoutePrefix: '/ambient',
  dir: path.join(SAVE_DIR, 'ambient'),
  libFile: path.join(SAVE_DIR, 'ambient-library.json'),
  mimeMap: MUSIC_MIME,
  defaultExt: 'mp3',
});

// Biblioteca de peças pra montar mapa 2D (móveis, paredes, texturas de
// chão etc.) — pedido do usuário, que já tem uma pasta organizada por
// categoria pronta pra importar. Mesma fábrica genérica de sempre; cada
// pasta da biblioteca vira uma categoria (Cadeiras, Paredes...). O objeto
// POSICIONADO no mapa (MapObject2D, em types.ts) embute a própria imagem
// (mesmo padrão de PlaceObject no 3D) — essa biblioteca aqui é só a fonte
// de onde o mestre escolhe o que plantar, não o que fica salvo na cena.
const sceneryLibrary = createAssetLibrary({
  apiPrefix: '/api/scenery',
  fileRoutePrefix: '/scenery',
  dir: path.join(SAVE_DIR, 'scenery'),
  libFile: path.join(SAVE_DIR, 'scenery-library.json'),
  mimeMap: IMAGE_MIME,
  defaultExt: 'png',
});

/* ---------------- "places" da mesa 3D: cenário salvo (nome + textura de ---
   chão + lista de objetos), da instalação — igual às bibliotecas acima,
   mas cada item é uma composição de cena inteira (JSON puro, com as imagens
   já embutidas como data URL dentro dela), não um arquivo binário — por
   isso não usa a fábrica `createAssetLibrary`, que pressupõe "um arquivo
   por item". Fica tudo num único `places.json` (lista). --------------- */
const PLACES_FILE = path.join(SAVE_DIR, 'places.json');
let places = [];

function loadPlaces() {
  try {
    const raw = fs.readFileSync(PLACES_FILE, 'utf8');
    const data = JSON.parse(raw);
    places = Array.isArray(data) ? data : [];
  } catch {
    places = [];
  }
}

function savePlaces() {
  try {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    fs.writeFileSync(PLACES_FILE, JSON.stringify(places));
  } catch (e) {
    console.error('Erro salvando cenários 3D (places):', e.message);
  }
}

loadPlaces();

function handlePlacesApi(req, res, urlObj) {
  const p = urlObj.pathname;
  if (p === '/api/places' && req.method === 'GET') {
    // lista só com metadados (sem objetos/imagens) — o corpo pesado só é
    // carregado quando o mestre abre um cenário específico pra editar.
    sendJson(res, 200, places.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })));
    return true;
  }
  let m;
  if ((m = /^\/api\/places\/([^/]+)$/.exec(p))) {
    const id = m[1];
    if (req.method === 'GET') {
      const place = places.find((x) => x.id === id);
      if (!place) {
        res.writeHead(404);
        res.end();
        return true;
      }
      sendJson(res, 200, place);
      return true;
    }
    if (req.method === 'PUT') {
      readJsonBody(req)
        .then((body) => {
          const place = {
            id,
            name: String(body.name || 'Cenário sem nome').slice(0, 120),
            updatedAt: Date.now(),
            ground: body.ground && typeof body.ground === 'object' ? body.ground : null,
            // BUG achado: esses campos (groundSize/sky corrigidos numa leva
            // anterior; terrain/skyPreset achados numa varredura de bugs
            // depois) não estavam na reconstrução aqui, então eram
            // silenciosamente descartados em TODO save, mesmo sem nenhum
            // problema de tamanho.
            groundSize: typeof body.groundSize === 'number' ? body.groundSize : undefined,
            terrain: body.terrain && typeof body.terrain === 'object' ? body.terrain : null,
            sky: typeof body.sky === 'boolean' ? body.sky : undefined,
            skyPreset: typeof body.skyPreset === 'string' ? body.skyPreset : undefined,
            objects: Array.isArray(body.objects) ? body.objects : [],
          };
          const i = places.findIndex((x) => x.id === id);
          if (i >= 0) places[i] = place;
          else places.push(place);
          savePlaces();
          sendJson(res, 200, place);
        })
        .catch((err) => {
          const tooLarge = err && String(err.message).includes('payload too large');
          res.writeHead(tooLarge ? 413 : 400);
          res.end();
        });
      return true;
    }
    if (req.method === 'DELETE') {
      places = places.filter((x) => x.id !== id);
      savePlaces();
      sendJson(res, 200, { ok: true });
      return true;
    }
  }
  return false;
}

/* ---------------- "mapas 2D" montados (Área do Mestre): composição --------
   salva de peças de cenário 2D (ver MapObject2D em types.ts) — mesmo padrão
   de "places" acima (JSON único por item, não arquivo binário, por isso não
   usa createAssetLibrary), só que pro lado 2D. --------------------------- */
const MAP2D_FILE = path.join(SAVE_DIR, 'map2d.json');
let map2ds = [];

function loadMap2Ds() {
  try {
    const raw = fs.readFileSync(MAP2D_FILE, 'utf8');
    const data = JSON.parse(raw);
    map2ds = Array.isArray(data) ? data : [];
  } catch {
    map2ds = [];
  }
}

function saveMap2Ds() {
  try {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    fs.writeFileSync(MAP2D_FILE, JSON.stringify(map2ds));
  } catch (e) {
    console.error('Erro salvando mapas 2D:', e.message);
  }
}

loadMap2Ds();

function handleMap2DApi(req, res, urlObj) {
  const p = urlObj.pathname;
  if (p === '/api/map2d' && req.method === 'GET') {
    sendJson(res, 200, map2ds.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })));
    return true;
  }
  let m;
  if ((m = /^\/api\/map2d\/([^/]+)$/.exec(p))) {
    const id = m[1];
    if (req.method === 'GET') {
      const map2d = map2ds.find((x) => x.id === id);
      if (!map2d) {
        res.writeHead(404);
        res.end();
        return true;
      }
      sendJson(res, 200, map2d);
      return true;
    }
    if (req.method === 'PUT') {
      readJsonBody(req)
        .then((body) => {
          const map2d = {
            id,
            name: String(body.name || 'Mapa sem nome').slice(0, 120),
            updatedAt: Date.now(),
            cols: typeof body.cols === 'number' ? body.cols : 30,
            rows: typeof body.rows === 'number' ? body.rows : 20,
            cellSize: typeof body.cellSize === 'number' ? body.cellSize : 48,
            background: typeof body.background === 'string' ? body.background : undefined,
            objects2d: Array.isArray(body.objects2d) ? body.objects2d : [],
          };
          const i = map2ds.findIndex((x) => x.id === id);
          if (i >= 0) map2ds[i] = map2d;
          else map2ds.push(map2d);
          saveMap2Ds();
          sendJson(res, 200, map2d);
        })
        .catch((err) => {
          const tooLarge = err && String(err.message).includes('payload too large');
          res.writeHead(tooLarge ? 413 : 400);
          res.end();
        });
      return true;
    }
    if (req.method === 'DELETE') {
      map2ds = map2ds.filter((x) => x.id !== id);
      saveMap2Ds();
      sendJson(res, 200, { ok: true });
      return true;
    }
  }
  return false;
}

/* ---------------- WebSocket: relay da sala (/lan/room) ---------------- */

// BUG achado (usuário: app crashou de vez, "A JavaScript error occurred in
// the main process") — trocar de mesa 2D pra 3D manda o cenário inteiro
// (incluindo modelo .glb grande embutido) pelo WebSocket da sala, e o `ws`
// tem um `maxPayload` PRÓPRIO (default 100MB) separado do limite HTTP da
// API de places (esse já tinha subido pra 700MB numa leva anterior, mas
// esse aqui não). Sem `maxPayload` configurado, uma mensagem grande demais
// vira um RangeError NÃO capturado que sobe até o processo principal do
// Electron — que aí morre pra TODO MUNDO (não é só uma sala que cai, é o
// app inteiro fechando). Alinhado com a mesma margem de 700MB.
const wss = new WebSocketServer({ noServer: true, maxPayload: 750 * 1024 * 1024 });
const roomClients = new Set(); // { ws, me }

function broadcastPresence() {
  const users = [...roomClients].map((c) => c.me).filter(Boolean);
  const payload = JSON.stringify({ __presence: users });
  for (const c of roomClients) if (c.ws.readyState === c.ws.OPEN) c.ws.send(payload);
}

function handleRoomConn(ws) {
  const client = { ws, me: null };
  roomClients.add(client);
  // rede de segurança: mesmo com `maxPayload` configurado certo, qualquer
  // outro erro de socket (conexão resetada, frame corrompido etc.) subindo
  // sem handler derrubava o processo principal do Electron inteiro — agora
  // só fecha ESSA conexão e segue o jogo pros outros clientes.
  ws.on('error', (err) => {
    console.error('[lan/room] erro na conexão, fechando só ela:', err.message);
    try {
      ws.terminate();
    } catch {
      /* já deve estar fechando */
    }
  });
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg && msg.__hello) {
      client.me = msg.me;
      broadcastPresence();
      // manda pro recém-chegado tudo que a mesa já tem salvo
      ws.send(JSON.stringify(stateForClient(!!(msg.me && msg.me.isGM))));
      return;
    }
    // grava no estado da mesa e repassa pra todo mundo, menos quem mandou
    applyToState(msg);
    const str = raw.toString();
    for (const c of roomClients) {
      if (c.ws !== ws && c.ws.readyState === c.ws.OPEN) c.ws.send(str);
    }
  });
  ws.on('close', () => {
    roomClients.delete(client);
    broadcastPresence();
  });
}

/* ---------------- WebSocket: canal de controle local (/lan/ctl) ---------------- */
// usado só pela própria aba do app (mesma máquina) pra: hospedar mesa,
// ligar/desligar a descoberta de mesas na rede e receber a lista encontrada.

const ctlClients = new Set();
let hosting = false;
let tableName = 'Mesa';
let beaconSocket = null;
let beaconTimer = null;
let discSocket = null;
let discPruneTimer = null;
const seenTables = new Map(); // "host:port" -> {app,name,host,port,players,lastSeen}

function ctlBroadcast(obj) {
  const s = JSON.stringify(obj);
  for (const c of ctlClients) if (c.readyState === c.OPEN) c.send(s);
}

function startHosting(name) {
  tableName = (name || 'Mesa').slice(0, 40);
  if (hosting) {
    ctlBroadcast({ type: 'hosting', value: true, name: tableName });
    return;
  }
  hosting = true;
  beaconSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  beaconSocket.bind(() => {
    try {
      beaconSocket.setBroadcast(true);
    } catch {
      /* ignora */
    }
  });
  beaconTimer = setInterval(() => {
    const msg = Buffer.from(
      JSON.stringify({
        app: APP_ID,
        name: tableName,
        host: getLocalIp(),
        port: HTTP_PORT,
        players: roomClients.size,
      }),
    );
    beaconSocket.send(msg, 0, msg.length, DISCOVERY_PORT, '255.255.255.255');
  }, 1500);
  ctlBroadcast({ type: 'hosting', value: true, name: tableName });
}

function stopHosting() {
  hosting = false;
  if (beaconTimer) clearInterval(beaconTimer);
  beaconTimer = null;
  if (beaconSocket) beaconSocket.close();
  beaconSocket = null;
  ctlBroadcast({ type: 'hosting', value: false });
}

function startDiscovery() {
  if (discSocket) {
    ctlBroadcast({ type: 'tables', tables: [...seenTables.values()] });
    return;
  }
  seenTables.clear();
  discSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  discSocket.on('message', (buf) => {
    let data;
    try {
      data = JSON.parse(buf.toString());
    } catch {
      return;
    }
    if (!data || data.app !== APP_ID) return;
    if (data.host === getLocalIp() && hosting) return; // não lista a própria mesa
    seenTables.set(data.host + ':' + data.port, { ...data, lastSeen: Date.now() });
  });
  discSocket.bind(DISCOVERY_PORT, () => {
    try {
      discSocket.setBroadcast(true);
    } catch {
      /* ignora */
    }
  });
  discPruneTimer = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [k, v] of seenTables) {
      if (now - v.lastSeen > 5000) {
        seenTables.delete(k);
        changed = true;
      }
    }
    ctlBroadcast({ type: 'tables', tables: [...seenTables.values()] });
    void changed;
  }, 1000);
}

function stopDiscovery() {
  if (discPruneTimer) clearInterval(discPruneTimer);
  discPruneTimer = null;
  if (discSocket) discSocket.close();
  discSocket = null;
  seenTables.clear();
}

function handleCtlConn(ws) {
  ctlClients.add(ws);
  // mesma rede de segurança do /lan/room — erro de socket sem handler
  // derruba o processo principal do Electron inteiro.
  ws.on('error', (err) => {
    console.error('[lan/ctl] erro na conexão, fechando só ela:', err.message);
    try {
      ws.terminate();
    } catch {
      /* já deve estar fechando */
    }
  });
  ws.send(JSON.stringify({ type: 'info', localIp: getLocalIp(), hosting }));
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || !msg.type) return;
    if (msg.type === 'host:start') startHosting(msg.name);
    else if (msg.type === 'host:stop') stopHosting();
    else if (msg.type === 'discover:start') startDiscovery();
    else if (msg.type === 'discover:stop') stopDiscovery();
  });
  ws.on('close', () => ctlClients.delete(ws));
}

server.on('upgrade', (req, socket, head) => {
  const pathname = (req.url || '').split('?')[0];
  if (pathname === '/lan/room') {
    wss.handleUpgrade(req, socket, head, handleRoomConn);
  } else if (pathname === '/lan/ctl') {
    wss.handleUpgrade(req, socket, head, handleCtlConn);
  } else {
    socket.destroy();
  }
});

/* ---------------- sobe o servidor e abre a janela do app ---------------- */

function openAppWindow(url) {
  // tenta abrir em "modo app" (sem barra de endereço) no Edge, depois no Chrome,
  // por fim cai pro navegador padrão.
  exec(`start msedge --app=${url}`, (err) => {
    if (!err) return;
    exec(`start chrome --app=${url}`, (err2) => {
      if (!err2) return;
      exec(`start ${url}`);
    });
  });
}

server.listen(HTTP_PORT, () => {
  const url = `http://localhost:${HTTP_PORT}`;
  console.log('=================================================');
  console.log('  OUTRO LADO - mesa de Ordem Paranormal');
  console.log('  ' + url);
  console.log('  IP nesta rede (pra outros conectarem): ' + getLocalIp());
  console.log('=================================================');
  if (!process.env.ORDEM_NO_OPEN) openAppWindow(url);
});
