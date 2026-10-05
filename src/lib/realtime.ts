import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { hasLan } from './lan';
import type { Character } from '../domain/character';
import type { PlayerProfile } from '../domain/profile';
import type {
  GroundConfig,
  MapState,
  MusicState,
  NotifyEntry,
  PlaceObject,
  PresenceUser,
  RollLogEntry,
  Scene,
  SkyPreset,
  TerrainConfig,
  Token,
} from '../types';

// Posição+alvo de câmera de uma mesa 3D — o suficiente pra qualquer cliente
// reconstruir o mesmo enquadramento do OrbitControls do mestre (câmera livre
// só pro mestre; jogador só assiste, ver Battle3D.tsx).
export interface Camera3D {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ProfileEntry {
  ownerId: string;
  name: string;
  profile: PlayerProfile;
  updatedAt: number;
}

export type RoomEvent =
  | { type: 'roll'; payload: RollLogEntry }
  | { type: 'notify:add'; payload: NotifyEntry }
  | { type: 'profile:upsert'; payload: ProfileEntry } // só mestres processam
  | { type: 'sheet:upsert'; payload: Character }
  | { type: 'sheet:delete'; payload: { id: string } }
  | { type: 'token:upsert'; payload: { sceneId: string; token: Token } }
  | { type: 'token:move'; payload: { sceneId: string; id: string; x: number; y: number } }
  | { type: 'token:delete'; payload: { sceneId: string; id: string } }
  | { type: 'map:update'; payload: { sceneId: string; patch: Partial<MapState> } }
  | { type: 'scene:upsert'; payload: Scene }
  | { type: 'scene:delete'; payload: { id: string } }
  | { type: 'scene:switch'; payload: { id: string } }
  | { type: 'music:state'; payload: MusicState } // só o mestre emite — play/pause/trocar faixa
  // edição de cenário (chão/objetos) numa mesa 3D — só o mestre emite. Manda
  // o array inteiro de objetos (não um patch granular por objeto, como os
  // tokens têm): cenário só é editado por uma pessoa de cada vez e muda com
  // bem menos frequência que posição de token, então não compensa a
  // complexidade de eventos por-objeto aqui.
  | {
      type: 'place3d:update';
      payload: {
        sceneId: string;
        ground?: GroundConfig | null;
        groundSize?: number;
        terrain?: TerrainConfig | null;
        sky?: boolean;
        skyPreset?: SkyPreset;
        objects3d?: PlaceObject[];
      };
    }
  // câmera livre do mestre numa mesa 3D, espelhada pros jogadores (view-only)
  // — efêmero, não faz parte do estado salvo da mesa.
  | { type: 'camera3d:update'; payload: Camera3D }
  // soundboard de sons ambiente — dispara UMA VEZ pra mesa toda (não é
  // "estado tocando", é um evento; `nonce` evita o próprio mestre tocar o
  // som 2x ao receber o eco da sua própria rede, ver AmbientPlayer.tsx).
  | { type: 'ambient:play'; payload: { clipId: string; nonce: string } }
  | { type: 'sync:request'; payload: { from: string } }
  | {
      type: 'sync:state';
      payload: {
        characters: Character[];
        scenes: Scene[];
        activeSceneId: string;
        profiles?: ProfileEntry[]; // preenchido só quando o emissor é mestre
        music?: MusicState;
        camera3d?: Camera3D | null;
        // true quando vem do servidor local (save em arquivo) — nesse caso
        // o cliente confia no cenário recebido mesmo já tendo algo carregado
        // do próprio cache, em vez de só adotar quando "intocado".
        authoritative?: boolean;
      };
    };

export interface RoomConnection {
  mode: 'supabase' | 'local' | 'lan';
  send(ev: RoomEvent): void;
  disconnect(): void;
}

interface Handlers {
  onEvent: (ev: RoomEvent) => void;
  onPresence: (users: PresenceUser[]) => void;
  onStatus: (connected: boolean) => void;
}

export function connectRoom(
  code: string,
  me: PresenceUser,
  handlers: Handlers,
): RoomConnection {
  if (hasLan) return lanRoom(code, me, handlers);
  return supabase ? supabaseRoom(code, me, handlers) : localRoom(code, me, handlers);
}

/* -------------------------------------------------------------------------- */
/*  Rede local (executável) — relay via WebSocket + descoberta por broadcast   */
/* -------------------------------------------------------------------------- */
// `code` aqui é "host:porta" do computador que está hospedando a mesa.

function lanRoom(code: string, me: PresenceUser, h: Handlers): RoomConnection {
  const [host, portStr] = code.split(':');
  const port = Number(portStr) || 47300;
  let ws: WebSocket | null = null;
  let reconnectTimer: number | undefined;
  let closed = false;
  // Eventos mandados antes do WS terminar de abrir (ex.: anunciar o cenário
  // inicial de uma mesa 3D recém-hospedada, logo depois de connect()) ficam
  // na fila em vez de serem descartados em silêncio — sem isso, qualquer
  // `send()` chamado nos primeiros milissegundos da conexão simplesmente
  // sumia (readyState ainda não era OPEN), e o servidor nunca ficava
  // sabendo daquele evento.
  let queue: RoomEvent[] = [];

  const open = () => {
    ws = new WebSocket(`ws://${host}:${port}/lan/room`);
    ws.onopen = () => {
      h.onStatus(true);
      ws?.send(JSON.stringify({ __hello: true, me }));
      for (const ev of queue) ws?.send(JSON.stringify(ev));
      queue = [];
    };
    ws.onmessage = (ev) => {
      let data: unknown;
      try {
        data = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      const msg = data as { __presence?: PresenceUser[] } & Partial<RoomEvent>;
      if (msg.__presence) h.onPresence(msg.__presence);
      else h.onEvent(data as RoomEvent);
    };
    ws.onclose = () => {
      h.onStatus(false);
      if (!closed) reconnectTimer = window.setTimeout(open, 1500);
    };
  };
  open();

  return {
    mode: 'lan',
    send(ev) {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(ev));
      else queue.push(ev);
    },
    disconnect() {
      closed = true;
      queue = [];
      window.clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Supabase Realtime (broadcast + presence)                                   */
/* -------------------------------------------------------------------------- */

function supabaseRoom(code: string, me: PresenceUser, h: Handlers): RoomConnection {
  const channel: RealtimeChannel = supabase!.channel(`room:${code}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: me.id },
    },
  });

  channel.on('broadcast', { event: 'room' }, ({ payload }) => {
    h.onEvent(payload as RoomEvent);
  });

  const emitPresence = () => {
    const state = channel.presenceState<PresenceUser>();
    const users: PresenceUser[] = Object.values(state)
      .flat()
      .map((p) => ({ id: p.id, name: p.name, color: p.color, isGM: p.isGM }));
    // remove duplicados por id
    const seen = new Map<string, PresenceUser>();
    for (const u of users) seen.set(u.id, u);
    h.onPresence([...seen.values()]);
  };

  channel.on('presence', { event: 'sync' }, emitPresence);
  channel.on('presence', { event: 'join' }, emitPresence);
  channel.on('presence', { event: 'leave' }, emitPresence);

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      h.onStatus(true);
      channel.track(me);
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      h.onStatus(false);
    }
  });

  return {
    mode: 'supabase',
    send(ev) {
      channel.send({ type: 'broadcast', event: 'room', payload: ev });
    },
    disconnect() {
      channel.unsubscribe();
      supabase!.removeChannel(channel);
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Fallback local: BroadcastChannel (so entre abas do mesmo navegador)        */
/* -------------------------------------------------------------------------- */

function localRoom(code: string, me: PresenceUser, h: Handlers): RoomConnection {
  const bc = new BroadcastChannel(`ordem-room:${code}`);
  const presence = new Map<string, PresenceUser>([[me.id, me]]);

  const broadcastPresence = () => h.onPresence([...presence.values()]);

  bc.onmessage = (msg) => {
    const data = msg.data as
      | { kind: 'event'; ev: RoomEvent }
      | { kind: 'hello'; user: PresenceUser }
      | { kind: 'bye'; id: string };
    if (data.kind === 'event') {
      h.onEvent(data.ev);
    } else if (data.kind === 'hello') {
      presence.set(data.user.id, data.user);
      broadcastPresence();
      bc.postMessage({ kind: 'hello', user: me });
    } else if (data.kind === 'bye') {
      presence.delete(data.id);
      broadcastPresence();
    }
  };

  bc.postMessage({ kind: 'hello', user: me });
  h.onStatus(true);
  broadcastPresence();

  const onUnload = () => bc.postMessage({ kind: 'bye', id: me.id });
  window.addEventListener('beforeunload', onUnload);

  return {
    mode: 'local',
    send(ev) {
      bc.postMessage({ kind: 'event', ev });
    },
    disconnect() {
      window.removeEventListener('beforeunload', onUnload);
      bc.postMessage({ kind: 'bye', id: me.id });
      bc.close();
    },
  };
}
