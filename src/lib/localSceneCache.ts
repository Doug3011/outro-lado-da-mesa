// Cache local (IndexedDB) do conteúdo PESADO de cenário 3D — chão/objetos
// com textura/modelo embutidos como data URL (podem passar de dezenas de
// MB). Pedido do usuário: "só o cenário 2D fica salvo quando eu saio e
// volto — tentar fazer o 3D ficar salvo também".
//
// O banco Supabase (tabela `rooms`, ver persistence.ts) tem limite de
// tamanho de requisição que um cenário 3D de verdade estoura fácil (mesmo
// problema do limite de 256KB do Realtime Broadcast, já corrigido em
// `sceneForBroadcast` no useTableStore.ts) — então `ground`/`objects3d` de
// cena 3D NUNCA vão pro banco; ficam só aqui, no disco do PRÓPRIO
// computador do mestre (IndexedDB não tem um limite realista pra esse uso),
// e são religados de volta na hora de carregar a mesa salva.
import type { GroundConfig, PlaceObject } from '../types';

interface HeavySceneData {
  ground: GroundConfig | null;
  objects3d: PlaceObject[];
}

const DB_NAME = 'ordem-scene-cache';
const STORE = 'scenes3d';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHeavySceneData(sceneId: string, data: HeavySceneData): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, sceneId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB indisponível (ex.: aba anônima) — sem essa camada extra de
    // persistência, tudo bem, o resto da mesa continua funcionando.
  }
}

export async function loadHeavySceneData(sceneId: string): Promise<HeavySceneData | null> {
  try {
    const db = await openDb();
    const result = await new Promise<HeavySceneData | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(sceneId);
      req.onsuccess = () => resolve((req.result as HeavySceneData | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function deleteHeavySceneData(sceneId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(sceneId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignora */
  }
}
