// Modo "rede local" — só existe quando o app está sendo servido pelo executável
// (server/main.cjs injeta window.__ORDEM_LAN__ no index.html). Fora disso (site
// publicado, ou o preview.html) esse modo simplesmente não aparece.

declare global {
  interface Window {
    __ORDEM_LAN__?: { available: boolean; localIp: string; port: number };
  }
}

export const LAN_INFO = typeof window !== 'undefined' ? window.__ORDEM_LAN__ : undefined;
export const hasLan = !!LAN_INFO?.available;

export interface LanTable {
  app: string;
  name: string;
  host: string;
  port: number;
  players: number;
  lastSeen: number;
}

type CtlHandler = {
  onHosting?: (hosting: boolean, name?: string) => void;
  onTables?: (tables: LanTable[]) => void;
};

// Canal de controle local (mesma máquina) pro servidor embutido: hospedar mesa,
// procurar mesas na rede e receber a lista encontrada.
export class LanControl {
  private ws: WebSocket | null = null;
  private handlers: CtlHandler = {};

  connect(handlers: CtlHandler) {
    this.handlers = handlers;
    if (!hasLan || !LAN_INFO) return;
    const url = `ws://localhost:${LAN_INFO.port}/lan/ctl`;
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === 'hosting') this.handlers.onHosting?.(msg.value, msg.name);
        if (msg.type === 'tables') this.handlers.onTables?.(msg.tables ?? []);
      } catch {
        /* ignora */
      }
    };
    this.ws = ws;
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
    else this.ws?.addEventListener('open', () => this.ws!.send(JSON.stringify(obj)), { once: true });
  }

  hostStart(name: string) {
    this.send({ type: 'host:start', name });
  }
  hostStop() {
    this.send({ type: 'host:stop' });
  }
  discoverStart() {
    this.send({ type: 'discover:start' });
  }
  discoverStop() {
    this.send({ type: 'discover:stop' });
  }
  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
