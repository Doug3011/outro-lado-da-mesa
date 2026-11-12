import { create } from 'zustand';
import { connectRoom, type Camera3D, type ProfileEntry, type RoomConnection, type RoomEvent } from '../lib/realtime';
import { loadRoom, removeCharacter, saveCharacter, saveScenes, saveScenesNow } from '../lib/persistence';
import { rollExpression, rollOrdemTest } from '../domain/dice';
import type { Character } from '../domain/character';
import { ELEMENT_COLOR } from '../data/ordem';
import { uid } from '../lib/ids';
import { saveMyCharacter } from '../lib/characterLibrary';
import type { PlayerProfile } from '../domain/profile';
import { placeToScene, type Place } from '../lib/placeLibrary';
import { map2dToScene, type Map2D } from '../lib/map2dLibrary';
import { loadHeavySceneData, saveHeavySceneData } from '../lib/localSceneCache';
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

// Sinalização WebRTC (Entrega 2 da mesa pela internet, AvBroadcastController)
// — fica FORA do estado reativo de propósito: isso é controle de conexão
// efêmero, não dado de mesa (não deveria persistir/causar re-render de quem
// só lê characters/scenes etc). `AvBroadcastController` registra um único
// handler ao montar; `applyEvent` repassa os 4 tipos `webrtc:*` endereçados
// a ESTE participante (`payload.to === me.id`) pra ele, sem passar pelo
// `set()` do Zustand.
export type WebrtcSignal = Extract<RoomEvent, { type: `webrtc:${string}` }>;
let webrtcHandler: ((ev: WebrtcSignal) => void) | null = null;

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
  // Stream de áudio/vídeo recebido do mestre via WebRTC (mesa pela internet,
  // AvBroadcastController) — só preenchido pro lado do JOGADOR. Troca de
  // referência (novo MediaStream) sempre que uma faixa é adicionada/removida
  // (ex.: cenário virou 3D), pra garantir que quem consome (ex.: a tag
  // <video>/<audio>) perceba a mudança — efêmero, não persiste.
  remoteAvStream: MediaStream | null;
  setRemoteAvStream: (s: MediaStream | null) => void;

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
  // Passthrough genérico pro AvBroadcastController mandar sinalização WebRTC
  // sem precisar conhecer `conn` diretamente.
  sendRoomEvent: (ev: RoomEvent) => void;
  // Registra/limpa o único handler que recebe os eventos `webrtc:*`
  // endereçados a este participante (ver comentário acima de `webrtcHandler`).
  setWebrtcHandler: (fn: ((ev: WebrtcSignal) => void) | null) => void;

  upsertToken: (t: Token) => void;
  // versão "leve" de upsertToken pros commits PERIÓDICOS do giro/resize
  // contínuo de token (ver `patchSelectedLive` em BattleMap.tsx) — só
  // estado+rede, sem persist()/pushScenesToDb(), mesmo motivo de
  // moveObject3dLive (achado numa varredura de performance: `upsertToken`
  // chamado a cada ~45ms durante uma tecla de giro/resize segurada gravava a
  // cena INTEIRA no localStorage e disparava um PUT assíncrono pro banco a
  // cada tique, travando a UI — mesmo bug já corrigido pro arraste de
  // token/objeto, só não tinha sido aplicado aqui ainda). O commit "de
  // verdade" (com persist) continua sendo `upsertToken`, chamado só uma vez
  // ao soltar a tecla.
  patchTokenLive: (t: Token) => void;
  moveToken: (id: string, x: number, y: number) => void;
  // Mesmo payload de rede de `moveToken`, mas SEM `set()` local — ver uso em
  // Battle3D.tsx/moveTokenLive. Pensado pro tique throttled de um arraste de
  // token no 3D: quem está arrastando já vê a posição certa via mutação
  // direta do `Object3D` (ref do three.js, bypass de React) e não precisa
  // que o PRÓPRIO Zustand mude pra isso — só os outros clientes (que recebem
  // o evento e não têm esse bypass) precisam do commit de verdade.
  broadcastTokenMove: (id: string, x: number, y: number) => void;
  deleteToken: (id: string) => void;
  updateMap: (patch: Partial<MapState>) => void;

  addScene: (name?: string) => void;
  addScene3d: (place: Place | null, name?: string) => void;
  // Cria um cenário 2D a partir de um mapa já montado (peças/chão salvos na
  // Área do Mestre, ver map2dLibrary.ts) — pedido do usuário: poder usar um
  // mapa 2D já pronto como cenário novo direto de dentro da mesa, igual já
  // dava pra fazer com cenário 3D (addScene3d/place).
  addSceneFromMap2d: (map2d: Map2D, name?: string) => void;
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
  // versão "leve" de updatePlace3d pra arraste AO VIVO de objeto 3D — só
  // estado+rede, sem persist()/pushScenesToDb() (ver comentário na
  // implementação, achado numa varredura de performance: isso rodando a
  // cada ~60ms durante um arraste gravava a cena INTEIRA no localStorage e
  // disparava um PUT assíncrono pro banco a cada tick, travando a UI).
  moveObject3dLive: (id: string, x: number, z: number) => void;
  setCamera3d: (position: [number, number, number], target: [number, number, number]) => void;

  setMusicState: (next: MusicState) => void;
  playAmbient: (clipId: string) => void;
}

export const activeScene = (s: Pick<TableState, 'scenes' | 'activeSceneId'>): Scene =>
  s.scenes.find((sc) => sc.id === s.activeSceneId) ?? s.scenes[0];

export const useTableStore = create<TableState>((set, get) => {
  // Mesmo problema do limite de tamanho do Supabase (ver sceneForBroadcast/
  // rehydrateHeavySceneData), só que agora é a cota do PRÓPRIO localStorage
  // (uns 5-10MB por origem) — um cenário 3D de verdade (chão/objetos como
  // data URL) sozinho já pode estourar isso, e o `try/catch` abaixo então
  // silenciosamente MANTINHA o valor antigo em cache (sem o cenário 3D
  // novo), dando a impressão de "só o 2D fica salvo". Tira `ground`/
  // `objects3d` antes de gravar no localStorage e manda pro mesmo cache
  // IndexedDB (sem limite realista) usado pelo lado do Supabase.
  const stripHeavySceneDataLocal = (sc: Scene): Scene => {
    if (sc.kind !== '3d') return sc;
    void saveHeavySceneData(sc.id, { ground: sc.ground, objects3d: sc.objects3d });
    return { ...sc, ground: null, objects3d: [] };
  };

  // Religa `ground`/`objects3d` de volta num array de cenas a partir do
  // cache IndexedDB — usado depois de ler o cache leve do localStorage (ver
  // persist()) e depois do merge com o que vier do Supabase em connect(),
  // sem depender da guarda "untouched" (que só decide se usa dados vindos
  // do banco pro resto da cena, não se religa o 3D pesado).
  const rehydrateHeavySceneDataLocal = async (scenes: Scene[]): Promise<Scene[]> =>
    Promise.all(
      scenes.map(async (sc) => {
        if (sc.kind !== '3d' || sc.ground || sc.objects3d.length > 0) return sc;
        const cached = await loadHeavySceneData(sc.id);
        if (!cached) return sc;
        return { ...sc, ground: cached.ground, objects3d: cached.objects3d };
      }),
    );

  const persist = () => {
    const s = get();
    if (!s.code) return;
    const cache: Cache = {
      characters: Object.values(s.characters),
      scenes: s.scenes.map(stripHeavySceneDataLocal),
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

  // Religa `ground`/`objects3d` em qualquer cena 3D que ainda esteja sem
  // eles — chamado depois de carregar o cache local (localStorage, que
  // agora guarda a versão enxuta, ver persist()) e de novo depois do merge
  // com o Supabase em connect(), sem depender da guarda "untouched" (essa
  // só decide se adota o RESTO da cena vindo do banco, não afeta isso).
  // Só patcheia cenas que CONTINUAM sem dado pesado no momento em que a
  // busca no IndexedDB termina — se enquanto isso outra fonte (ex. o merge
  // do Supabase) já preencheu, não sobrescreve.
  const rehydrateHeavySceneDataNow = () => {
    const snapshot = get().scenes;
    if (!snapshot.some((sc) => sc.kind === '3d' && !sc.ground && sc.objects3d.length === 0)) return;
    void rehydrateHeavySceneDataLocal(snapshot).then((rehydrated) => {
      set((st) => ({
        scenes: st.scenes.map((sc) => {
          if (sc.kind !== '3d' || sc.ground || sc.objects3d.length > 0) return sc;
          return rehydrated.find((r) => r.id === sc.id) ?? sc;
        }),
      }));
    });
  };

  const pushScenesToDb = () => {
    const s = get();
    if (s.code) void saveScenes(s.code, s.scenes, s.activeSceneId);
  };

  // aplica uma mutação a um cenário pelo id, devolvendo o novo array de cenas
  const patchScene = (id: string, fn: (sc: Scene) => Scene): Scene[] =>
    get().scenes.map((sc) => (sc.id === id ? fn(sc) : sc));

  // Numa mesa pela internet (Supabase), o JOGADOR não renderiza mais a cena
  // 3D localmente — só assiste o vídeo que o mestre transmite ao vivo (ver
  // AvBroadcastController.tsx) — então não precisa receber chão/objetos
  // 3D nenhum, que é exatamente o que costuma estourar o limite de 256KB
  // por mensagem do Supabase Realtime Broadcast (modelo/textura embutidos
  // como data URL em `ground`/`objects3d`). Bug relatado pelo usuário:
  // trocar pra um cenário 3D DE VERDADE (com chão/objetos, não em branco)
  // nunca chegava no jogador — o `scene:upsert` correspondente nem saía
  // do lugar. Em rede local (`mode === 'lan'`) o relay local aceita
  // mensagens bem maiores (ver maxPayload em server/main.cjs), então isso
  // não muda nada lá — só afeta o que é mandado pela internet.
  const sceneForBroadcast = (sc: Scene): Scene => {
    if (get().mode === 'lan' || sc.kind !== '3d') return sc;
    return { ...sc, ground: null, objects3d: [] };
  };

  // Chega um `scene:switch` pra uma cena que este cliente não conhece —
  // normalmente porque o `scene:upsert` correspondente nunca chegou (mesa
  // pela internet/Supabase: broadcast tem limite de 256KB por mensagem, um
  // cenário com imagem de fundo ou modelo 3D embutido estoura isso fácil e
  // a mensagem simplesmente não chega, sem erro nenhum visível). Em vez de
  // ficar preso mostrando a cena errada (`activeScene` cai pro scenes[0]),
  // busca o cenário certo direto do banco — já é escrito lá em paralelo
  // (ver saveScenesNow/saveScenes). Tenta de novo 2x com um intervalo (a
  // escrita no banco pode ainda não ter terminado na primeira tentativa).
  const healMissingScene = (id: string, attempt = 0) => {
    const code = get().code;
    if (!code) return;
    void loadRoom(code).then((loaded) => {
      if (!loaded) return;
      const hasIt = loaded.scenes.some((sc) => sc.id === id);
      // O banco sempre guarda a versão COMPLETA (o mestre precisa dela pra
      // reconectar); se quem está curando é um jogador, aplica o mesmo
      // corte de `sceneForBroadcast` antes de adotar, só por economia —
      // não muda nada visualmente pro jogador (ele só assiste vídeo).
      const scenes = get().me?.isGM ? loaded.scenes : loaded.scenes.map(sceneForBroadcast);
      set((st) => ({
        scenes: scenes.length ? scenes : st.scenes,
        activeSceneId: hasIt ? id : st.activeSceneId,
      }));
      persist();
      if (!hasIt && attempt < 2) {
        window.setTimeout(() => healMissingScene(id, attempt + 1), 1200);
      }
    });
  };

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
        if (s.scenes.some((sc) => sc.id === ev.payload.id)) {
          set({ activeSceneId: ev.payload.id });
          persist();
        } else {
          healMissingScene(ev.payload.id);
        }
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
      case 'webrtc:offer':
      case 'webrtc:answer':
      case 'webrtc:ice':
      case 'webrtc:bye':
        if (ev.payload.to === s.me?.id) webrtcHandler?.(ev);
        break;
      case 'sync:request': {
        if (ev.payload.from === s.me?.id) break;
        setTimeout(() => {
          const g = get();
          g.conn?.send({
            type: 'sync:state',
            payload: {
              characters: Object.values(g.characters),
              scenes: g.scenes.map(sceneForBroadcast),
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
    remoteAvStream: null,

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
        remoteAvStream: null,
      });
      rehydrateHeavySceneDataNow();

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
        conn.send({ type: 'scene:upsert', payload: sceneForBroadcast(opts.initialScene) });
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
        rehydrateHeavySceneDataNow();
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
        remoteAvStream: null,
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

    sendRoomEvent: (ev) => {
      get().conn?.send(ev);
    },
    setWebrtcHandler: (fn) => {
      webrtcHandler = fn;
    },
    setRemoteAvStream: (s) => set({ remoteAvStream: s }),

    upsertToken: (t) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => ({ ...sc, tokens: { ...sc.tokens, [t.id]: t } })),
      }));
      persist();
      pushScenesToDb();
      get().conn?.send({ type: 'token:upsert', payload: { sceneId, token: t } });
    },

    patchTokenLive: (t) => {
      const sceneId = get().activeSceneId;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => ({ ...sc, tokens: { ...sc.tokens, [t.id]: t } })),
      }));
      // sem persist()/pushScenesToDb() de propósito — ver comentário na
      // interface, acima. Mesmo tipo de mensagem de rede que upsertToken (o
      // servidor/outros clientes não distinguem "leve" de "de verdade" —
      // só QUEM chamou decide se persiste).
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

    // Achado numa varredura de performance (usuário: "no 3D trava só de
    // mexer, mesmo devagar" — continuava mesmo depois do fix de useCallback/
    // `live.ref` de uma leva anterior). Medido de verdade (FPS real via
    // requestAnimationFrame, numa mesa 3D de teste com ~80 tokens, chamando
    // `moveToken` a cada 60ms sem nenhum clique/arraste real envolvido, só
    // pra isolar o custo do COMMIT em si): em várias rodadas, `moveToken`
    // (que faz `set()`) ocasionalmente derrubava o FPS de ~60 pra algo entre
    // 55 e 50, com picos de frame de até 68-84ms (orçamento normal é 16.6ms
    // a 60fps) — picos que `broadcastTokenMove` (sem `set()`) nunca
    // reproduziu nas mesmas condições, e que não apareciam com a cena mais
    // vazia (~40 tokens). O efeito variou de rodada pra rodada (ruído de
    // GC/thread principal), mas a tendência foi consistente: menos trabalho
    // de reconciliação por commit = menos chance de estourar o orçamento de
    // frame. Causa provável: `set()` troca a referência de `scenes`, o que
    // faz `Battle3D()` re-executar e o React reconciliar a lista INTEIRA de
    // `Token3D`/`SceneObject` de novo (o `memo` deles bloqueia o RE-RENDER
    // de cada um, mas o CUSTO de comparar as props de todo mundo pra decidir
    // isso ainda existe, e num orçamento de 16.6ms/frame isso é visível de
    // um jeito que não é no 2D, que não tem relógio de frame). Igual ao 2D, a posição
    // VISUAL de quem está arrastando já vem 100% do `live.ref` (mutação
    // direta do `Object3D`, bypass de React — ver `useGroundDrag`,
    // lib/scene3d.tsx) — então o commit local nem É necessário pra quem tá
    // arrastando ver a posição certa. Só manda pela rede (quem recebe isso
    // noutro cliente SEM bypass próprio) — o commit de verdade (com persist)
    // continua acontecendo uma vez só, ao soltar (`onTokenDragEnd` →
    // `upsertToken`).
    broadcastTokenMove: (id, x, y) => {
      const sceneId = get().activeSceneId;
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
      const s = get();
      if (s.code) void saveScenesNow(s.code, s.scenes, s.activeSceneId);
      get().conn?.send({ type: 'scene:upsert', payload: sceneForBroadcast(sc) });
      get().conn?.send({ type: 'scene:switch', payload: { id: sc.id } });
    },

    addSceneFromMap2d: (map2d, name) => {
      const sc = map2dToScene(map2d, name);
      set((s) => ({ scenes: [...s.scenes, sc], activeSceneId: sc.id }));
      persist();
      const s = get();
      if (s.code) void saveScenesNow(s.code, s.scenes, s.activeSceneId);
      get().conn?.send({ type: 'scene:upsert', payload: sceneForBroadcast(sc) });
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
      const s = get();
      if (s.code) void saveScenesNow(s.code, s.scenes, s.activeSceneId);
      get().conn?.send({ type: 'scene:upsert', payload: sceneForBroadcast(sc) });
      get().conn?.send({ type: 'scene:switch', payload: { id: sc.id } });
    },

    renameScene: (id, name) => {
      set((s) => ({ scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, name } : sc)) }));
      persist();
      pushScenesToDb();
      const sc = get().scenes.find((x) => x.id === id);
      if (sc) get().conn?.send({ type: 'scene:upsert', payload: sceneForBroadcast(sc) });
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

    // Mesma ideia de moveToken (lado 2D): só atualiza estado local + manda
    // pela rede, sem persist()/pushScenesToDb() — o commit "de verdade" (com
    // persistência) acontece em onDragEnd, via updatePlace3d. Achado numa
    // varredura de performance: moveObjectLive (Battle3D.tsx) chamava
    // updatePlace3d DIRETO a cada ~60ms durante o arraste de um objeto 3D —
    // isso serializa a cena INTEIRA (possivelmente com modelo .glb grande
    // embutido) pro localStorage de forma SÍNCRONA, travando a thread
    // principal, e ainda dispara um PUT assíncrono pro banco a cada tick.
    moveObject3dLive: (id, x, z) => {
      const sceneId = get().activeSceneId;
      let nextObjects: PlaceObject[] | undefined;
      set(() => ({
        scenes: patchScene(sceneId, (sc) => {
          nextObjects = sc.objects3d.map((o) => (o.id === id ? { ...o, x, z } : o));
          return { ...sc, objects3d: nextObjects };
        }),
      }));
      if (nextObjects) {
        get().conn?.send({ type: 'place3d:update', payload: { sceneId, objects3d: nextObjects } });
      }
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
