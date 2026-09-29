import { uid } from './ids';
import type { AssetFolder, TokenAsset } from '../types';

// Biblioteca de tokens do mestre — importada uma vez na Área do Mestre (menu
// principal), fica salva no servidor local (fora de qualquer mesa) pronta
// pra usar em qualquer mesa futura. Sempre relativo: essa tela só existe fora
// de mesa, no PRÓPRIO servidor local de quem está gerenciando (diferente da
// música, que precisa tocar pro resto da mesa — token só é usado por quem tá
// montando a própria biblioteca, então não tem o problema de "origem errada"
// que a música tinha).

export interface TokenLibraryData {
  folders: AssetFolder[];
  items: TokenAsset[];
}

// Tipo MIME próprio pro drag-and-drop de token da biblioteca pro mapa (ver
// TokenLibraryManager.tsx / BattleMap.tsx) — string compartilhada pra não
// arriscar os dois lados divergirem por um erro de digitação.
export const TOKEN_DRAG_MIME = 'application/x-ordem-token';

export interface TokenDragPayload {
  id: string;
  name: string;
}

export async function fetchTokenLibrary(): Promise<TokenLibraryData> {
  try {
    const r = await fetch('/api/tokens');
    if (!r.ok) return { folders: [], items: [] };
    return (await r.json()) as TokenLibraryData;
  } catch {
    return { folders: [], items: [] };
  }
}

export async function createTokenFolder(name: string): Promise<AssetFolder | null> {
  try {
    const r = await fetch('/api/tokens/folders', {
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

export async function deleteTokenFolder(id: string): Promise<void> {
  try {
    await fetch(`/api/tokens/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadTokenImage(file: File, folderId: string | null): Promise<TokenAsset | null> {
  const id = uid();
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = (extMatch?.[1] || 'png').toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const qs = new URLSearchParams({ name: encodeURIComponent(name), ext, folderId: folderId ?? '' });
  try {
    const r = await fetch(`/api/tokens/items/${id}?${qs.toString()}`, { method: 'PUT', body: file });
    if (!r.ok) return null;
    return (await r.json()) as TokenAsset;
  } catch {
    return null;
  }
}

// Importa vários arquivos (ou uma pasta inteira, via <input webkitdirectory>)
// de uma vez — sequencial, mesmo motivo da música: evita saturar o servidor
// local com uploads grandes em paralelo.
export async function uploadTokenImages(
  files: File[],
  folderId: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<TokenAsset[]> {
  const out: TokenAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const t = await uploadTokenImage(files[i], folderId);
    if (t) out.push(t);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameTokenAsset(id: string, name: string): Promise<void> {
  try {
    await fetch(`/api/tokens/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveTokenAsset(id: string, folderId: string | null): Promise<void> {
  try {
    await fetch(`/api/tokens/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteTokenAsset(id: string): Promise<void> {
  try {
    await fetch(`/api/tokens/items/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function tokenAssetUrl(id: string): string {
  return `/tokens/${id}`;
}
