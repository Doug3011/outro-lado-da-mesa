// Persistencia duravel opcional no Supabase. Sem Supabase configurado, tudo vira no-op
// e o app depende do cache em localStorage + sincronizacao entre os participantes.
//
// Nota: as imagens (fundo de mapa / token) sao guardadas como data URL dentro do
// JSONB de `rooms.scenes`. Funciona, mas para salas com muitas imagens o ideal
// futuro e mover os arquivos para o Supabase Storage e guardar so a URL.

import { supabase } from './supabase';
import type { Character } from '../domain/character';
import type { Scene } from '../types';

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
    return {
      characters: (chars.data ?? []).map((r) => r.data as Character),
      scenes: rd.scenes ?? [],
      activeSceneId: rd.active_scene_id ?? '',
    };
  } catch (err) {
    console.warn('[persistence] loadRoom falhou (rode o schema.sql?)', err);
    return null;
  }
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

let scenesTimer: ReturnType<typeof setTimeout> | null = null;
// escrita agregada: muitos movimentos de token não devem virar muitas gravações
export function saveScenes(code: string, scenes: Scene[], activeSceneId: string): void {
  if (!supabase) return;
  if (scenesTimer) clearTimeout(scenesTimer);
  scenesTimer = setTimeout(async () => {
    try {
      await supabase!
        .from('rooms')
        .upsert({
          code,
          scenes,
          active_scene_id: activeSceneId,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('[persistence] saveScenes', err);
    }
  }, 1200);
}
