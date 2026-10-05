import { uid } from './ids';
import type { AssetFolder, SceneryAsset } from '../types';

// Biblioteca de peças de cenário 2D do mestre (móveis, paredes, texturas de
// chão) — importada uma vez na Área do Mestre, fica salva no servidor local
// pronta pra usar em qualquer mesa futura. Mesmo padrão de tokenLibrary.ts:
// sempre relativo, só existe fora de mesa no PRÓPRIO servidor local de quem
// está montando a biblioteca.

export interface SceneryLibraryData {
  folders: AssetFolder[];
  items: SceneryAsset[];
}

export async function fetchSceneryLibrary(): Promise<SceneryLibraryData> {
  try {
    const r = await fetch('/api/scenery');
    if (!r.ok) return { folders: [], items: [] };
    return (await r.json()) as SceneryLibraryData;
  } catch {
    return { folders: [], items: [] };
  }
}

export async function createSceneryFolder(name: string): Promise<AssetFolder | null> {
  try {
    const r = await fetch('/api/scenery/folders', {
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

export async function deleteSceneryFolder(id: string): Promise<void> {
  try {
    await fetch(`/api/scenery/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadSceneryImage(file: File, folderId: string | null): Promise<SceneryAsset | null> {
  const id = uid();
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = (extMatch?.[1] || 'png').toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const qs = new URLSearchParams({ name: encodeURIComponent(name), ext, folderId: folderId ?? '' });
  try {
    const r = await fetch(`/api/scenery/items/${id}?${qs.toString()}`, { method: 'PUT', body: file });
    if (!r.ok) return null;
    return (await r.json()) as SceneryAsset;
  } catch {
    return null;
  }
}

export async function uploadSceneryImages(
  files: File[],
  folderId: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<SceneryAsset[]> {
  const out: SceneryAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const a = await uploadSceneryImage(files[i], folderId);
    if (a) out.push(a);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameSceneryAsset(id: string, name: string): Promise<void> {
  try {
    await fetch(`/api/scenery/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveSceneryAsset(id: string, folderId: string | null): Promise<void> {
  try {
    await fetch(`/api/scenery/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteSceneryAsset(id: string): Promise<void> {
  try {
    await fetch(`/api/scenery/items/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function sceneryAssetUrl(id: string): string {
  return `/scenery/${id}`;
}
