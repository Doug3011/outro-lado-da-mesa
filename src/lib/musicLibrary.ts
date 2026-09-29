import { uid } from './ids';
import type { MusicFolder, MusicTrack } from '../types';

// Biblioteca de música: fica no servidor local (mesmo processo que serve o
// app), não em localStorage — arquivo de áudio é grande demais pra isso, e
// só o servidor pode tocar ele via HTTP pros outros participantes da mesa.
//
// `roomHost` (opcional, "ip:porta") é o pulo do gato pra quem ENTROU numa
// mesa de outro computador: o app de cada um sempre carrega sua PRÓPRIA
// página local (`localhost:porta`, ver desktop/main.js) — só o WebSocket da
// sala aponta pro host remoto. Um `fetch('/api/music')` relativo, sem isso,
// bateria no servidor local do JOGADOR (biblioteca vazia), não no do
// mestre, que é quem realmente tem os arquivos — daí a música nunca saía
// pro jogador. Passando `roomHost` (o código da sala, que já É "host:porta"),
// as chamadas viram absolutas apontando pro servidor certo. Sem `roomHost`
// (uso no menu principal, fora de mesa, gerenciando a biblioteca só sua),
// continua relativo, batendo no próprio servidor local — igual sempre foi.
function apiBase(roomHost?: string | null): string {
  return roomHost ? `http://${roomHost}` : '';
}

export interface MusicLibraryData {
  folders: MusicFolder[];
  tracks: MusicTrack[];
}

export async function fetchMusicLibrary(roomHost?: string | null): Promise<MusicLibraryData> {
  try {
    const r = await fetch(`${apiBase(roomHost)}/api/music`);
    if (!r.ok) return { folders: [], tracks: [] };
    return (await r.json()) as MusicLibraryData;
  } catch {
    return { folders: [], tracks: [] };
  }
}

export async function createMusicFolder(name: string, roomHost?: string | null): Promise<MusicFolder | null> {
  try {
    const r = await fetch(`${apiBase(roomHost)}/api/music/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) return null;
    return (await r.json()) as MusicFolder;
  } catch {
    return null;
  }
}

export async function deleteMusicFolder(id: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/music/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadTrack(
  file: File,
  folderId: string | null,
  roomHost?: string | null,
): Promise<MusicTrack | null> {
  const id = uid();
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = (extMatch?.[1] || 'mp3').toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const qs = new URLSearchParams({
    name: encodeURIComponent(name),
    ext,
    folderId: folderId ?? '',
  });
  try {
    const r = await fetch(`${apiBase(roomHost)}/api/music/tracks/${id}?${qs.toString()}`, {
      method: 'PUT',
      body: file,
    });
    if (!r.ok) return null;
    return (await r.json()) as MusicTrack;
  } catch {
    return null;
  }
}

// Importa vários arquivos de uma vez (upload sequencial — evita saturar o
// servidor local com uploads grandes em paralelo). Devolve as faixas que
// deram certo, na ordem em que foram enviadas.
export async function uploadTracks(
  files: File[],
  folderId: string | null,
  onProgress?: (done: number, total: number) => void,
  roomHost?: string | null,
): Promise<MusicTrack[]> {
  const out: MusicTrack[] = [];
  for (let i = 0; i < files.length; i++) {
    const t = await uploadTrack(files[i], folderId, roomHost);
    if (t) out.push(t);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameTrack(id: string, name: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/music/tracks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveTrack(id: string, folderId: string | null, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/music/tracks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteTrack(id: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/music/tracks/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function trackUrl(id: string, roomHost?: string | null): string {
  return `${apiBase(roomHost)}/music/${id}`;
}
