import { create } from 'zustand';
import { connectRoom, type Camera3D, type ProfileEntry, type RoomConnection, type RoomEvent } from '../lib/realtime';
import { loadRoom, removeCharacter, saveCharacter, saveScenes } from '../lib/persistence';
import { rollExpression, rollOrdemTest } from '../domain/dice';
import type { Character } from '../domain/character';
import { ELEMENT_COLOR } from '../data/ordem';
import { uid } from '../lib/ids';
import { saveMyCharacter } from '../lib/characterLibrary';
import type { PlayerProfile } from '../domain/profile';
import { placeToScene, type Place } from '../lib/placeLibrary';
import {
  DEFAULT_MUSIC_STATE,
  makeScene,
  type GroundConfig,
  type MapState,
  type MusicState,
  type NotifyEntry,
  type PlaceObject,
  type PresenceUser,
  type RollLogEntry,
  type Scene,
  type SkyPreset,
  type TerrainConfig,
  type Token,
} from '../types';

interface Cache {
  characters: Character[];
  scenes: Scene[];
  activeSceneId: string;
  rollLog: RollLogEntry[];
  notifications: NotifyEntry[];
}

const cacheKey = (code: string) => `ordem:room:${code}`;
// perfis de jogador ficam num cache separado, só o mestre escreve/lê
const gmCacheKey = (code: string) => `ordem:room:${code}:gm`;

function readCache(code: string): Cache | null {
  try {
    const raw = localStorage.getItem(cacheKey(code));
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

function readGmCache(code: string): ProfileEntry[] {
  try {
    const raw = localStorage.getItem(gmCacheKey(code));
    if (!raw) return [];
    const data = JSON.parse(raw) as { profiles?: ProfileEntry[] } | unknown[];
    if (Array.isArray(data)) return []; // formato antigo (bestiário, removido) — descarta
    return data.profiles ?? [];
  } catch {
    return [];
  }
}

function defaultScenes(): Scene[] {
  return [makeScene('Cenário 1')];
}

interface TableState {
  code: string | null;
  me: PresenceUser | null;
  conn: RoomConnection | null;
  connected: boolean;
  mode: 'supabase' | 'local' | 'lan' | null;
  users: PresenceUser[];
  rollLog: RollLogEntry[];
  notifications: NotifyEntry[];
  characters: Record<string, Character>;
  scenes: Scene[];
  activeSceneId: string;
  activeCharacterId: string | null;
  playerProfiles: Record<string, ProfileEntry>; // por ownerId — só populado/visível para o mestre
  music: MusicState;
  camera3d: Camera3D | null; // câmera livre do mestre numa mesa 3D — efêmero, não persiste
  ambientCue: { clipId: string; nonce: string } | null; // soundboard — efêmero, só um "disparo", não persiste

  connect: (code: string, me: PresenceUser, opts?: { initialScene?: Scene }) => void;
  disconnect: () => void;

  rollOrdem: (opts: {
    label: string;
    attributeValue: number;
    bonus: number;
    dt: number | null;
  }) => void;
  rollFree: (label: string, expression: string) => void;
  notify: (
    charId: string,
    charName: string,
    ownerId: string,
    fromNex: number,
    toNex: number,
    lines: string[],
  ) => void;

  upsertCharacter: (c: Character) => void;
  deleteCharacter: (id: string) => void;
  setActiveCharacter: (id: string | null) => void;
  sendProfile: (name: string, ownerId: string, profile: PlayerProfile) => void;

  upsertToken: (t: Token) => void;
  moveToken: (id: string, x: number, y: number) => void;
  deleteToken: (id: string) => void;
  updateMap: (patch: Partial<MapState>) => void;

  addScene: (name?: string) => void;
  addScene3d: (place: Place | null, name?: string) => void;
  renameScene: (id: string, name: string) => void;
  deleteScene: (id: string) => void;
  switchScene: (id: string) => void;

  updatePlace3d: (patch: {
    ground?: GroundConfig | null;
    groundSize?: number;
    terrain?: TerrainConfig | null;
    sky?: boolean;
    skyPreset?: SkyPreset;
    objects3d?: PlaceObject[];
  }) => void;
  setCamera3d: (position: [number, number, number], target: [number, number, number]) => void;

  setMusicState: (next: MusicState) => void;
  playAmbient: (clipId: string) => void;
}

export const activeScene = (s: Pick<TableState, 'scenes' | 'activeSceneId'>): Scene =>
  s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];

export const useTableStore = create<TableState>((set, get) => {
  const persist = () => {
    const s = get();
    if (!s.code) return;
    const cache: Cache = {
      characters: Object.values(s.characters),
      scenes: s.scenes,
      activeSceneId: s.activeSceneId,
      rollLog: s.rollLog.slice(0, 120),
      notifications: s.notifications.slice(0, 120),
    };
    try {
      localStorage.setItem(cacheKey(s.code), JSON.stringify(cache));
      if (s.me?.isGM) {
        localStorage.setItem(
          gmCacheKey(s.code),
          JSON.stringify({ profiles: Object.values(s.playerProfiles) }),
        );
      }
    } catch {
      /* quota cheia (imagens grandes) — o app segue, mas pode não persistir ao recarregar */
    }
  };

  const pushScenesToDb = () => {
    const s = get();
    if (s.code) void saveScenes(s.code, s.scenes, s.activeSceneId);
  };

  // aplica uma mutação a um cenário pelo id, devolvendo o novo array de cenas
  const patchScene = (id: string, fn: (sc: Scene) => Scene): Scene[] =>
    get().scenes.map((sc) => (sc.id === id ? fn(sc) : sc));

  const addRoll = (entry: RollLogEntry) => {
    set((s) => ({ rollLog: [entry, ...s.rollLog].slice(0, 200) }));
    persist();
  };

  // Cor do autor no histórico: a da ficha ativa (elemento de afinidade
  // escolhido), pra cada jogador aparecer com a cor do elemento — só cai na
  // cor pessoal (me.color) quando rola "valores manuais", sem ficha selecionada,
  // ou a ficha ainda não tem elemento (antes de NEX 50%).
  const rollAuthorColor = (): string => {
    const s = get();
    const activeChar = s.activeCharacterId ? s.characters[s.activeCharacterId] : null;
    const elementColor = activeChar?.affinityElement ? ELEMENT_COLOR[activeChar.affinityElement] : null;
    return elementColor ?? s.me?.color ?? 'var(--blood)';
  };

  const applyEvent = (ev: RoomEvent) => {
    const s = get();
    switch (ev.type) {
      case 'roll':
        set((st) => ({ rollLog: [ev.payload, ...st.rollLog].slice(0, 200) }));
        persist();
        break;
      case 'notify:add':
        set((st) =>
          st.notifications.some((n) => n.id === ev.payload.id)
            ? st
            : { notifications: [ev.payload, ...st.notifications].slice(0, 200) },
        );
        persist();
        break;
      case 'profile:upsert': {
        if (!s.me?.isGM) break; // só o mestre vê perfis de jogador
        const incoming = ev.payload;
        const cur = s.playerProfiles[incoming.ownerId];
        if (!cur || incoming.updatedAt >= cur.updatedAt) {
          set((st) => ({
            playerProfiles: { ...st.playerProfiles, [incoming.ownerId]: incoming },
          }));
          persist();
        }
        break;
      }
      case 'sheet:upsert': {
        const incoming = ev.payload;
        const current = s.characters[incoming.id];
        if (!current || incoming.updatedAt >= current.updatedAt) {
          set((st) => ({ characters: { ...st.characters, [incoming.id]: incoming } }));
          persist();
          // se for a MINHA ficha (ex.: o mestre ajustou meu PV em combate), a
          // biblioteca local também acompanha — não só o que eu mesmo edito.
          if (s.me?.id === incoming.ownerId) saveMyCharacter(incoming);
        }
        break;
      }
      case 'sheet:delete':
        set((st) => {
          const next = { ...st.characters };
          delete next[ev.payload.id];
          return { characters: next };
        });
        persist();
        break;
      case 'token:upsert': {
        const { sceneId, token } = ev.payload;
        set(() => ({
          scenes: patchScene(sceneId, (sc) => ({
            ...sc,
            tokens: { ...sc.tokens, [token.id]: token },
          })),
        }));
        persist();
        break;
      }
      case 'token:move': {
        const { sceneId, id, x, y } = ev.payload;
        set(() => ({
          scenes: patchScene(sceneId, (sc) => {
            const t = sc.tokens[id];
            if (!t) return sc;
            return { ...sc, tokens: { ...sc.tokens, [id]: { ...t, x, y } } };
          }),
        }));
        break;
      }
      case 'token:delete': {
        const { sceneId, id } = ev.payload;
        set(() => ({
          scenes: patchScene(sceneId, (sc) => {
            const tokens = { ...sc.tokens };
            delete tokens[id];
            return { ...sc, tokens };
          }),
        }));
        persist();
        break;
      }
      case 'map:update': {
        const { sceneId, patch } = ev.payload;
        set(() => ({
          scenes: patchScene(sceneId, (sc) => ({ ...sc, map: { ...sc.map, ...patch } })),
        }));
        persist();
        break;
      }
      case 'scene:upsert': {
        const incoming = ev.payload;
        set((st) => {
          const exists = st.scenes.some((sc) => sc.id === incoming.id);
          return {
            scenes: exists
              ? st.scenes.map((sc) => (sc.id === incoming.id ? incoming : sc))
              : [...st.scenes, incoming],
          };
        });
        persist();
        break;
      }
      case 'scene:delete':
        set((st) => {
          const scenes = st.scenes.filter((sc) => sc.id !== ev.payload.id);
          const safe = scenes.length ? scenes : defaultScenes();
          return {
            scenes: safe,
            activeSceneId: safe.some((sc) => sc.id === st.activeSceneId)
              ? st.activeSceneId
              : safe[0].id,
          };
        });
        persist();
        break;
      case 'scene:switch':
        set({ activeSceneId: ev.payload.id });
        persist();
        break;
      case 'music:state':
        set({ music: ev.payload });
        break;
      case 'place3d:update': {
        const { sceneId, ground, groundSize, terrain, sky, skyPreset, objects3d } = ev.payload;
        set(() => ({
          scenes: patchScene(sceneId, (sc) => ({
            ...sc,
            ...(ground !== undefined ? { ground } : {}),
            ...(groundSize !== undefined ? { groundSize } : {}),
            ...(terrain !== undefined ? { terrain } : {}),
            ...(sky !== undefined ? { sky } : {}),
            ...(skyPreset !== undefined ? { skyPreset } : {}),
            ...(objects3d !== undefined ? { objects3d } : {}),
          })),
        }));
        persist();
        break;
      }
      case 'camera3d:update':
        // o mestre é a fonte da própria câmera — não adota o que vem da rede
        // (nem de si mesmo ecoado por um peer), só quem está assistindo.
        if (!s.me?.isGM) set({ camera3d: ev.payload });
        break;
      case 'ambient:play':
        // aqui SIM adota o eco de volta (diferente da câmera) — quem disparou
        // (playAmbient, abaixo) já tocou localmente antes de mandar; o
        // `nonce` igual garante que o efeito em AmbientPlayer.tsx não toca 2x.
        set({ ambientCue: ev.payload });
        break;
      case 'sync:request': {
        if (ev.payload.from === s.me?.id) break;
        setTimeout(() => {
          const g = get();
          g.conn?.send({
            type: 'sync:state',
            payload: {
              characters: Object.values(g.characters),
              scenes: g.scenes,
              activeSceneId: g.activeSceneId,
              // perfis só são compartilhados entre mestres
              profiles: g.me?.isGM ? Object.values(g.playerProfiles) : undefined,
              music: g.music,
              camera3d: g.me?.isGM ? g.camera3d : undefined,
            },
          });
        }, 150 + Math.random() * 400);
        break;
      }
      case 'sync:state': {
        set((st) => {
          const characters = { ...st.characters };
          for (const c of ev.payload.characters) {
            const cur = characters[c.id];
            if (!cur || c.updatedAt >= cur.updatedAt) {
              characters[c.id] = c;
              if (st.me?.id === c.ownerId) saveMyCharacter(c);
            }
          }
          // Sync de um servidor local com save em arquivo é fonte da verdade: adota
          // direto. De um colega de mesa (peer), só adota se ainda não mexemos em nada
          // aqui — evita um sync atrasado sobrescrever o que já estava rolando.
          const untouched =
            st.scenes.length <= 1 && Object.keys(activeScene(st).tokens).length === 0;
          const trustScenes = ev.payload.authoritative || untouched;
          const scenes = trustScenes && ev.payload.scenes.length ? ev.payload.scenes : st.scenes;
          const activeSceneId =
            trustScenes && ev.payload.scenes.length ? ev.payload.activeSceneId : st.activeSceneId;
          const playerProfiles = { ...st.playerProfiles };
          if (st.me?.isGM && ev.payload.profiles) {
            for (const p of ev.payload.profiles) {
              const cur = playerProfiles[p.ownerId];
              if (!cur || p.updatedAt >= cur.updatedAt) playerProfiles[p.ownerId] = p;
            }
          }
          const music = ev.payload.music ?? st.music;
          const camera3d = !st.me?.isGM && ev.payload.camera3d ? ev.payload.camera3d : st.camera3d;
          return { characters, scenes, activeSceneId, playerProfiles, music, camera3d };
        });
        persist();
        break;
      }
    }
  };

  return {
    code: null,
    me: null,
    conn: null,
    connected: false,
    mode: null,
    users: [],
    rollLog: [],
    notifications: [],
    characters: {},
    scenes: defaultScenes(),
    activeSceneId: '',
    activeCharacterId: null,
    playerProfiles: {},
    music: DEFAULT_MUSIC_STATE,
    camera3d: null,
    ambientCue: null,

    connect: (code, me, opts) => {
      get().conn?.disconnect();

      const cached = readCache(code);
      const usingInitialScene = !cached?.scenes?.length && !!opts?.initialScene;
      const scenes = cached?.scenes?.length
        ? cached.scenes
        : opts?.initialScene
          ? [opts.initialScene]
          : defaultScenes();
      const gmProfiles = me.isGM ? readGmCache(code) : [];
      set({
        code,
        me,
        characters: Object.fromEntries((cached?.characters ?? []).map((c) => [c.id, c])),
        scenes,
        activeSceneId:
          cached?.activeSceneId && scenes.some((sc) => sc.id === cached.activeSceneId)
            ? cached.activeSceneId
            : scenes[0].id,
        playerProfiles: Object.fromEntries(gmProfiles.map((p) => [p.ownerId, p])),
        rollLog: cached?.rollLog ?? [],
        notifications: cached?.notifications ?? [],
        users: [me],
        music: DEFAULT_MUSIC_STATE,
        camera3d: null,
        ambientCue: null,
      });

      const conn = connectRoom(code, me, {
        onEvent: applyEvent,
        onPresence: (users) => set({ users }),
        onStatus: (connected) => set({ connected }),
      });
      set({ conn, mode: conn.mode });

      // Anuncia o cenário inicial de uma mesa nova pro servidor — sem isso,
      // a 1ª ação nele (token, chão…) faria o servidor "descobrir" o cenário
      // sozinho e recriá-lo como 2D por padrão (findOrCreateScene), perdendo
      // o kind:'3d' escolhido ao hospedar. `conn.send` já enfileira sozinho
      // se o socket ainda não abriu, então não precisa de setTimeout aqui.
      if (usingInitialScene && opts?.initialScene) {
        conn.send({ type: 'scene:upsert', payload: opts.initialScene });
        conn.send({ type: 'scene:switch', payload: { id: opts.initialScene.id } });
      }

      void loadRoom(code).then((loaded) => {
        if (!loaded) return;
        set((st) => {
          const characters = { ...st.characters };
          for (const c of loaded.characters) {
            const cur = characters[c.id];
            if (!cur || c.updatedAt >= cur.updatedAt) {
              characters[c.id] = c;
              if (st.me?.id === c.ownerId) saveMyCharacter(c);
            }
          }
          const untouched =
            st.scenes.length <= 1 && Object.keys(activeScene(st).tokens).length === 0;
          const useLoaded = untouched && loaded.scenes.length > 0;
          return {
            characters,
            scenes: useLoaded ? loaded.scenes : st.scenes,
            activeSceneId:
              useLoaded && loaded.activeSceneId ? loaded.activeSceneId : st.activeSceneId,
          };
        });
        persist();
      });

      setTimeout(() => {
        get().conn?.send({ type: 'sync:request', payload: { from: me.id } });
      }, 600);
    },

    disconnect: () => {
      get().conn?.disconnect();
      set({
        conn: null,
        connected: false,
        code: null,
        users: [],
        mode: null,
        music: DEFAULT_MUSIC_STATE,
        camera3d: null,
        ambientCue: null,
      });
    },

    rollOrdem: ({ label, attributeValue, bonus, dt }) => {
      const me = get().me;
      if (!me) return;
      const entry: RollLogEntry = {
        id: uid(),
        at: Date.now(),
        authorId: me.id,
        authorName: me.name,
        authorColor: rollAuthorColor(),
        label,
        result: rollOrdemTest(attributeValue, bonus, dt),
      };
      addRoll(entry);
      get().conn?.send({ type: 'roll', payload: entry });
    },

    rollFree: (label, expression) => {
      const me = get().me;
      if (!me) return;
      const entry: RollLogEntry = {
        id: uid(),
        at: Date.now(),
        authorId: me.id,
        authorName: me.name,
        authorColor: rollAuthorColor(),
        label,
        result: rollExpression(expression),
      };
      addRoll(entry);
      get().conn?.send({ type: 'roll', payload: entry });
    },

    notify: (charId, charName, ownerId, fromNex, toNex, lines) => {
      if (lines.length === 0) return;
      const entry: NotifyEntry = {
        id: uid(),
        at: Date.now(),
        charId,
        charName,
        ownerId,
        fromNex,
        toNex,
        lines,
      };
      set((s) => ({ notifications: [entry, ...s.notifications].slice(0, 200) }));
      persist();
      get().conn?.send({ type: 'notify:add', payload: entry });
    },

    upsertCharacter: (c) => {
      const next = { ...c, updatedAt: Date.now() };
      set((s) => ({ characters: { ...s.characters, [next.id]: next } }));
      persist();
      get().conn?.send({ type: 'sheet:upsert', payload: next });
      if (get().code) void saveCharacter(get().code!, next);
      // a ficha continua vivendo na biblioteca do jogador, independente da mesa —
      // qualquer edição feita durante o jogo já atualiza o que fica salvo lá.
      if (get().me?.id === next.ownerId) saveMyCharacter(next);
    },

    deleteCharacter: (id) => {
      set((s) => {
        const characters = { ...s.characters };
        delete characters[id];
        return {
          characters,
          activeCharacterId: s.activeCharacterId === id ? null : s.activeCharacterId,
        };
      });
      persist();
      get().conn?.send({ type: 'sheet:delete', payload: { id } });
      if (get().code) void removeCharacter(get().code!, id);
    },

    setActiveCharacter: (id) => set({ activeCharacterId: id }),

    sendProfile: (name, ownerId, profile) => {
      const entry: ProfileEntry = { ownerId, name, profile, updatedAt: Date.now() };
      set((s) => ({ playerProfiles: { ...s.playerProfiles, [ownerId]: entry } }));
      persist();
      get().conn?.send({ type: 'profile:upsert', payload: entry });
    },

    upsertToken: (t) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => ({ ...sc, tokens: { ...sc.tokens, [t.id]: t } })),
      }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'token:upsert', payload: { sceneId, token: t } });
    },

    moveToken: (id, x, y) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => {
          const t = sc.tokens[id];
          if (!t) return sc;
          return { ...sc, tokens: { ...sc.tokens, [id]: { ...t, x, y } } };
        }),
      }));
      get().conn?.send({ type: 'token:move', payload: { sceneId, id, x, y } });
    },

    deleteToken: (id) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => {
          const tokens = { ...sc.tokens };
          delete tokens[id];
          return { ...sc, tokens };
        }),
      }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'token:delete', payload: { sceneId, id } });
    },

    updateMap: (patch) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => ({ ...sc, map: { ...sc.map, ...patch } })),
      }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'map:update', payload: { sceneId, patch } });
    },

    addScene: (name) => {
      const sc = makeScene(name?.trim() || `Cenário ${get().scenes.length + 1}`);
      set((s) => ({ scenes: [...s.scenes, sc], activeSceneId: sc.id }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'scene:upsert', payload: sc });
      get().conn?.send({ type: 'scene:switch', payload: { id: sc.id } });
    },

    // `place` nulo = cenário 3D em branco (sem chão/objetos); com place, copia
    // o chão+objetos daquela place salva (cópia independente — editar aqui
    // não muda a place na Área do Mestre, ver placeToScene em placeLibrary.ts).
    addScene3d: (place, name) => {
      const sc = place
        ? placeToScene(place, name)
        : makeScene(name?.trim() || `Cenário ${get().scenes.length + 1}`, '3d');
      set((s) => ({ scenes: [...s.scenes, sc], activeSceneId: sc.id }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'scene:upsert', payload: sc });
      get().conn?.send({ type: 'scene:switch', payload: { id: sc.id } });
    },

    renameScene: (id, name) => {
      set((s) => ({ scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, name } : sc)) }));
      persist();
      pushScenesToDb();
      const sc = get().scenes.find((x) => x.id === id);
      if (sc) get().conn?.send({ type: 'scene:upsert', payload: sc });
    },

    deleteScene: (id) => {
      set((s) => {
        if (s.scenes.length <= 1) return s;
        const scenes = s.scenes.filter((sc) => sc.id !== id);
        return {
          scenes,
          activeSceneId: s.activeSceneId === id ? scenes[0].id : s.activeSceneId,
        };
      });
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'scene:delete', payload: { id } });
      get().conn?.send({ type: 'scene:switch', payload: { id: get().activeSceneId } });
    },

    switchScene: (id) => {
      set({ activeSceneId: id });
      persist();
      get().conn?.send({ type: 'scene:switch', payload: { id } });
    },

    updatePlace3d: (patch) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => ({
          ...sc,
          ...(patch.ground !== undefined ? { ground: patch.ground } : {}),
          ...(patch.groundSize !== undefined ? { groundSize: patch.groundSize } : {}),
          ...(patch.terrain !== undefined ? { terrain: patch.terrain } : {}),
          ...(patch.sky !== undefined ? { sky: patch.sky } : {}),
          ...(patch.skyPreset !== undefined ? { skyPreset: patch.skyPreset } : {}),
          ...(patch.objects3d !== undefined ? { objects3d: patch.objects3d } : {}),
        })),
      }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'place3d:update', payload: { sceneId, ...patch } });
    },

    setCamera3d: (position, target) => {
      if (!get().me?.isGM) return;
      set({ camera3d: { position, target } });
      get().conn?.send({ type: 'camera3d:update', payload: { position, target } });
    },

    setMusicState: (next) => {
      set({ music: next });
      get().conn?.send({ type: 'music:state', payload: next });
    },

    playAmbient: (clipId) => {
      if (!get().me?.isGM) return;
      const nonce = uid();
      set({ ambientCue: { clipId, nonce } });
      get().conn?.send({ type: 'ambient:play', payload: { clipId, nonce } });
    },
  };
});
