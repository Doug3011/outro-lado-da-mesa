import { uid } from './ids';
import type { AssetFolder, ModelAsset, ModelAssetKind } from '../types';
import { MODEL_FILE_ACCEPT } from './scene3d';

// Biblioteca de modelos/imagens pro editor de cenário 3D do mestre
// (Prototype3D.tsx) — importada uma vez, fica salva no servidor local pronta
// pra arrastar em qualquer cenário futuro sem reimportar. Mesmo padrão de
// sceneryLibrary.ts (a versão 2D disso), só que cada item carrega também o
// próprio `kind` ('image' ou 'model') — a biblioteca é uma só, mista.

export interface ModelLibraryData {
  folders: AssetFolder[];
  items: ModelAsset[];
}

// Extensões de modelo 3D de verdade aceitas (MODEL_FILE_ACCEPT, ex.:
// ".glb,.gltf,.fbx,.stl") — usado aqui só pra decidir o `kind` de um arquivo
// recém-escolhido no importador único da biblioteca, sem duplicar a lista.
const MODEL_EXTS = new Set(MODEL_FILE_ACCEPT.split(',').map((e) => e.replace('.', '').toLowerCase()));

export function modelKindFromFileName(name: string): ModelAssetKind {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return MODEL_EXTS.has(ext) ? 'model' : 'image';
}

export async function fetchModelLibrary(): Promise<ModelLibraryData> {
  try {
    const r = await fetch('/api/models');
    if (!r.ok) return { folders: [], items: [] };
    return (await r.json()) as ModelLibraryData;
  } catch {
    return { folders: [], items: [] };
  }
}

export async function createModelFolder(name: string): Promise<AssetFolder | null> {
  try {
    const r = await fetch('/api/models/folders', {
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

export async function deleteModelFolder(id: string): Promise<void> {
  try {
    await fetch(`/api/models/folders/${id}`, { method: 'DELETE' });
  } catch {
    /* segue mesmo se falhar — biblioteca só não atualiza até o refresh */
  }
}

export async function uploadModelAsset(file: File, folderId: string | null): Promise<ModelAsset | null> {
  const id = uid();
  const kind = modelKindFromFileName(file.name);
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = (extMatch?.[1] || (kind === 'model' ? 'glb' : 'png')).toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const qs = new URLSearchParams({
    name: encodeURIComponent(name),
    ext,
    folderId: folderId ?? '',
    kind,
  });
  try {
    const r = await fetch(`/api/models/items/${id}?${qs.toString()}`, { method: 'PUT', body: file });
    if (!r.ok) return null;
    return (await r.json()) as ModelAsset;
  } catch {
    return null;
  }
}

export async function uploadModelAssets(
  files: File[],
  folderId: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<ModelAsset[]> {
  const out: ModelAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const a = await uploadModelAsset(files[i], folderId);
    if (a) out.push(a);
    onProgress?.(i + 1, files.length);
  }
  return out;
}

export async function renameModelAsset(id: string, name: string): Promise<void> {
  try {
    await fetch(`/api/models/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch {
    /* ignora */
  }
}

export async function moveModelAsset(id: string, folderId: string | null): Promise<void> {
  try {
    await fetch(`/api/models/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
  } catch {
    /* ignora */
  }
}

export async function deleteModelAsset(id: string): Promise<void> {
  try {
    await fetch(`/api/models/items/${id}`, { method: 'DELETE' });
  } catch {
    /* ignora */
  }
}

export function modelAssetUrl(id: string): string {
  return `/models/${id}`;
}
