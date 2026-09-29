import { uid } from './ids';
import type { AssetFolder, MapAsset, MapAssetKind } from '../types';

// Biblioteca de mapas do mestre — mesma ideia da de tokens (ver
// tokenLibrary.ts), só que cada item guarda também `kind` ('2d' ou '3d'):
// mesa 2D e mesa 3D são coisas separadas (não um modo de exibição da mesma
// cena), então um mapa importado serve só uma das duas — é só uma etiqueta
// organizacional por enquanto, a mesa 3D em si ainda não existe.

export interface MapLibraryData {
  folders: AssetFolder[];
  items: MapAsset[];
}

export async function fetchMapLibrary(): Promise<MapLibraryData> {
  try {
    const r = await fetch('/api/maps');
    if (!r.ok) return { folders: [], items: [] };
    return (await r.json()) as MapLibraryData;
  } catch {
    return { folders: [], items: [] };
  }
}

export async function createMapFolder(name: string): Promise<AssetFolder | null> {
  try {
    const r = await fetch('/api/maps/folders', {
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

export async function deleteMapFolder(id: string): Promise<void> {
  try {
    await fetch(`/api/maps/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadMapImage(
  file: File,
  folderId: string | null,
  kind: MapAssetKind,
): Promise<MapAsset | null> {
  const id = uid();
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = (extMatch?.[1] || 'png').toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const qs = new URLSearchParams({ name: encodeURIComponent(name), ext, folderId: folderId ?? '', kind });
  try {
    const r = await fetch(`/api/maps/items/${id}?${qs.toString()}`, { method: 'PUT', body: file });
    if (!r.ok) return null;
    return (await r.json()) as MapAsset;
  } catch {
    return null;
  }
}

export async function uploadMapImages(
  files: File[],
  folderId: string | null,
  kind: MapAssetKind,
  onProgress?: (done: number, total: number) => void,
): Promise<MapAsset[]> {
  const out: MapAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const t = await uploadMapImage(files[i], folderId, kind);
    if (t) out.push(t);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameMapAsset(id: string, name: string): Promise<void> {
  try {
    await fetch(`/api/maps/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveMapAsset(id: string, folderId: string | null): Promise<void> {
  try {
    await fetch(`/api/maps/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteMapAsset(id: string): Promise<void> {
  try {
    await fetch(`/api/maps/items/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function mapAssetUrl(id: string): string {
  return `/maps/${id}`;
}
