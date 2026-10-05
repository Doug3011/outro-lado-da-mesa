import { uid } from './ids';
import type { AmbientClip, AssetFolder } from '../types';

// Biblioteca de sons ambiente (soundboard) — mesmo padrão de musicLibrary.ts,
// inclusive o `roomHost` (ver comentário lá: sem isso, quem ENTROU na mesa
// de outro computador bateria no servidor local do PRÓPRIO jogador, não no
// do mestre, que é quem tem os arquivos).
function apiBase(roomHost?: string | null): string {
  return roomHost ? `http://${roomHost}` : '';
}

export interface AmbientLibraryData {
  folders: AssetFolder[];
  items: AmbientClip[];
}

export async function fetchAmbientLibrary(roomHost?: string | null): Promise<AmbientLibraryData> {
  try {
    const r = await fetch(`${apiBase(roomHost)}/api/ambient`);
    if (!r.ok) return { folders: [], items: [] };
    return (await r.json()) as AmbientLibraryData;
  } catch {
    return { folders: [], items: [] };
  }
}

export async function createAmbientFolder(name: string, roomHost?: string | null): Promise<AssetFolder | null> {
  try {
    const r = await fetch(`${apiBase(roomHost)}/api/ambient/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) return null;
    return (await r.json()) as AssetFolder;
  } catch {
    return null;
  }
}

export async function deleteAmbientFolder(id: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/ambient/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadAmbientClip(
  file: File,
  folderId: string | null,
  roomHost?: string | null,
): Promise<AmbientClip | null> {
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
    const r = await fetch(`${apiBase(roomHost)}/api/ambient/items/${id}?${qs.toString()}`, {
      method: 'PUT',
      body: file,
    });
    if (!r.ok) return null;
    return (await r.json()) as AmbientClip;
  } catch {
    return null;
  }
}

export async function uploadAmbientClips(
  files: File[],
  folderId: string | null,
  onProgress?: (done: number, total: number) => void,
  roomHost?: string | null,
): Promise<AmbientClip[]> {
  const out: AmbientClip[] = [];
  for (let i = 0; i < files.length; i++) {
    const c = await uploadAmbientClip(files[i], folderId, roomHost);
    if (c) out.push(c);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameAmbientClip(id: string, name: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/ambient/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveAmbientClip(id: string, folderId: string | null, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/ambient/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteAmbientClip(id: string, roomHost?: string | null): Promise<void> {
  try {
    await fetch(`${apiBase(roomHost)}/api/ambient/items/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function ambientClipUrl(id: string, roomHost?: string | null): string {
  return `${apiBase(roomHost)}/ambient/${id}`;
}
