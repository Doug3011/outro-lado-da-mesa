// Ponte pra versão nova do app (Godot) — pedido do usuário: quando o app novo
// for instalado, ele tem que já encontrar as fichas e preferências de cada
// pessoa. O Godot não consegue ler o localStorage do Electron, então este app
// mantém uma cópia em arquivo comum: %APPDATA%\OutroLado\export-godot.json
// (gravado pelo servidor local, ver `/api/godot-export` em desktop/server.cjs).
// O Godot só LÊ esse arquivo (domain/old_import.gd no projeto Godot).
//
// Valores vão no MESMO formato em que já estão salvos no localStorage (sem
// converter nada) — quem converte é o lado Godot.
import { hasLan } from './lan';

const KEYS = {
  me: 'ordem:me',
  profile: 'ordem:profile',
  myCharacters: 'ordem:my-characters',
  myCreatures: 'ordem:my-creatures',
  keybinds: 'ordem:keybinds',
  diceVolume: 'ordem:dice-sound-volume',
  menuVolume: 'ordem:menu-music-volume',
  menuTrack: 'ordem:menu-track-selected',
  menuUnlocked: 'ordem:menu-tracks-unlocked',
  dailyChallenge: 'ordem:daily-challenge',
  customDice: 'ordem:custom-dice',
} as const;

const ENDPOINT = '/api/godot-export';
const INTERVAL_MS = 20000;

function read(key: string): unknown {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // alguns valores são texto puro (ex.: id da música do menu)
  }
}

export function buildGodotExport(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, key] of Object.entries(KEYS)) {
    const v = read(key);
    if (v !== undefined) out[field] = v;
  }
  return out;
}

let lastSent = '';
let sending = false;

// Manda só quando alguma coisa mudou desde o último envio que deu certo.
export async function exportForGodot(): Promise<boolean> {
  if (sending) return false;
  const data = buildGodotExport();
  const json = JSON.stringify(data);
  if (json === lastSent) return false;
  sending = true;
  try {
    const r = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, exportedAt: Date.now(), ...data }),
    });
    if (r.ok) lastSent = json;
    return r.ok;
  } catch {
    return false; // servidor local fora do ar (ex.: `npm run dev`) — tenta de novo depois
  } finally {
    sending = false;
  }
}

// Ao fechar o app: `sendBeacon` ainda sai mesmo com a janela fechando
// (fetch normal pode ser cortado no meio).
function flushOnClose() {
  const data = buildGodotExport();
  const json = JSON.stringify(data);
  if (json === lastSent) return;
  try {
    const body = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), ...data })], { type: 'application/json' });
    if (navigator.sendBeacon(ENDPOINT, body)) lastSent = json;
  } catch {
    /* ignora */
  }
}

let started = false;

// Só no executável (servidor local disponível) — no navegador puro não tem
// onde gravar o arquivo.
export function startGodotExport(): void {
  if (started || !hasLan) return;
  started = true;
  void exportForGodot();
  window.setInterval(() => void exportForGodot(), INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void exportForGodot();
  });
  window.addEventListener('beforeunload', flushOnClose);
}
