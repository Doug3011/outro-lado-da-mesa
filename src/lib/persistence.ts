// Persistencia duravel opcional no Supabase. Sem Supabase configurado, tudo vira no-op
// e o app depende do cache em localStorage + sincronizacao entre os participantes.
//
// Nota: as imagens (fundo de mapa / token) sao guardadas como data URL dentro do
// JSONB de `rooms.scenes`. Funciona, mas para salas com muitas imagens o ideal
// futuro e mover os arquivos para o Supabase Storage e guardar so a URL.

import { supabase } from './supabase';
import type { Character } from '../domain/character';
import type { Scene } from '../types';
import { loadHeavySceneData, saveHeavySceneData } from './localSceneCache';

export interface LoadedRoom {
  characters: Character[];
  scenes: Scene[];
  activeSceneId: string;
}

export async function loadRoom(code: string): Promise<LoadedRoom | null> {
  if (!supabase) return null;
  try {
    const [chars, room] = await Promise.all([
      supabase.from('characters').select('data').eq('room_code', code),
      supabase.from('rooms').select('scenes, active_scene_id').eq('code', code).maybeSingle(),
    ]);
    if (chars.error || room.error) {
      console.warn('[persistence] leitura parcial', chars.error || room.error);
    }
    const rd = (room.data ?? {}) as unknown as { scenes?: Scene[]; active_scene_id?: string };
    const scenes = await Promise.all((rd.scenes ?? []).map(rehydrateHeavySceneData));
    return {
      characters: (chars.data ?? []).map((r) => r.data as Character),
      scenes,
      activeSceneId: rd.active_scene_id ?? '',
    };
  } catch (err) {
    console.warn('[persistence] loadRoom falhou (rode o schema.sql?)', err);
    return null;
  }
}

// O banco guarda cenário 3D sem `ground`/`objects3d` (ver stripHeavySceneData
// abaixo) — religa de volta a partir do cache local (IndexedDB, mesmo
// computador) deste mestre, se existir. Cena 2D ou cenário 3D vindo de
// outro computador (nunca salvou aqui) fica como veio do banco mesmo —
// sem o cache local, não tem como ter essa parte, mas pelo menos o resto
// da cena (tokens, nome) continua certo.
async function rehydrateHeavySceneData(sc: Scene): Promise<Scene> {
  if (sc.kind !== '3d') return sc;
  const cached = await loadHeavySceneData(sc.id);
  if (!cached) return sc;
  return { ...sc, ground: cached.ground, objects3d: cached.objects3d };
}

// Separa o que é pesado demais pro banco (textura/modelo 3D embutidos como
// data URL, podem passar de dezenas de MB — o mesmo estouro de tamanho já
// corrigido pro broadcast em tempo real, ver sceneForBroadcast em
// useTableStore.ts) do resto da cena. A parte pesada vai só pro cache
// local (IndexedDB); o banco guarda uma versão enxuta (nome/tokens/etc.),
// que é o suficiente pra outro computador saber que aquela cena existe.
function stripHeavySceneData(sc: Scene): Scene {
  if (sc.kind !== '3d') return sc;
  void saveHeavySceneData(sc.id, { ground: sc.ground, objects3d: sc.objects3d });
  return { ...sc, ground: null, objects3d: [] };
}

export async function saveCharacter(code: string, c: Character): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('characters')
      .upsert({ id: c.id, room_code: code, data: c, updated_at: new Date().toISOString() });
  } catch (err) {
    console.warn('[persistence] saveCharacter', err);
  }
}

export async function removeCharacter(_code: string, id: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('characters').delete().eq('id', id);
  } catch (err) {
    console.warn('[persistence] removeCharacter', err);
  }
}

async function upsertRoomScenes(code: string, scenes: Scene[], activeSceneId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('rooms')
      .upsert({
        code,
        scenes: scenes.map(stripHeavySceneData),
        active_scene_id: activeSceneId,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[persistence] saveScenes', err);
  }
}

let scenesTimer: ReturnType<typeof setTimeout> | null = null;
// escrita agregada: muitos movimentos de token não devem virar muitas gravações
export function saveScenes(code: string, scenes: Scene[], activeSceneId: string): void {
  if (!supabase) return;
  if (scenesTimer) clearTimeout(scenesTimer);
  scenesTimer = setTimeout(() => {
    void upsertRoomScenes(code, scenes, activeSceneId);
  }, 1200);
}

// Versão sem debounce — usada só ao CRIAR um cenário novo (addScene/
// addScene3d em useTableStore.ts). O broadcast em tempo real (Supabase
// Realtime) tem limite de 256KB por mensagem; um cenário com imagem de
// fundo/modelo 3D embutido como data URL estoura isso fácil e o
// `scene:upsert` correspondente simplesmente não chega nos outros
// participantes (sem erro nenhum visível) — o jogador então recebe só o
// `scene:switch` (evento pequeno, esse sempre chega) apontando pra uma
// cena que ele nunca viu. O self-heal em `scene:switch` (useTableStore.ts)
// busca a cena que falta direto daqui, do banco — por isso não dá pra
// esperar o debounce de 1200ms de `saveScenes`, senão o self-heal busca
// cedo demais e não acha nada.
export function saveScenesNow(code: string, scenes: Scene[], activeSceneId: string): Promise<void> {
  if (scenesTimer) {
    clearTimeout(scenesTimer);
    scenesTimer = null;
  }
  return upsertRoomScenes(code, scenes, activeSceneId);
}
