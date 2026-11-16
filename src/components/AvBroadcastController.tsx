import { useEffect, useRef } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { activeScene, useTableStore, type WebrtcSignal } from '../store/useTableStore';
import { getMixedAudioTrack } from '../lib/avMix';
import { onGmCanvas3dChange } from '../lib/gmCanvasRegistry';

// Vários STUN públicos (não só um) — pedido do usuário: tentar melhorar a
// taxa de conexão SEM adicionar um servidor TURN (já teve uma experiência
// ruim com TURN noutro projeto). Importante ser honesto sobre o limite
// disso: STUN só ajuda a descobrir o próprio endereço público — não existe
// jeito de "contornar" sem retransmissor quando as DUAS pontas estão atrás
// de NAT simétrico/firewall restritivo ao mesmo tempo (isso não é um bug,
// é como WebRTC funciona). O que isso aqui melhora de verdade são os casos
// hoje perdidos por um STUN só ser lento/instável, ou alguma rede bloquear
// especificamente o servidor do Google.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
// Quantas vezes tenta reconectar sozinho (ICE restart) antes de fechar e
// recriar a conexão do zero (nova oferta/negociação) em vez de desistir de
// vez — ver onconnectionstatechange em ensurePeer/recreatePeer.
const ICE_RESTART_MAX_ATTEMPTS = 4;
const ICE_RESTART_DELAY_MS = 4000;
// 'disconnected' costuma ser queda de pacote passageira (muitas vezes volta
// sozinho pra 'connected' sem fazer nada) — espera mais um pouco antes de
// contar como falha de verdade, diferente de 'failed' que já é definitivo.
const DISCONNECTED_GRACE_MS = 3000;
// pequena pausa antes de fechar e recriar a conexão do zero, só pra não
// brigar com um restartIce ainda em andamento na mesma hora.
const RECREATE_DELAY_MS = 1500;
// Sem isso, o WebRTC usa os padrões pensados pra webcam (bitrate baixo,
// prioridade em suavidade de movimento) — péssimo pra uma cena 3D parada a
// maior parte do tempo, onde nitidez importa muito mais que taxa de
// quadros. Pedido do usuário: "a resolução ficou pixelada e embaçada".
const VIDEO_MAX_BITRATE = 4_000_000; // 4 Mbps

// Teto de resolução REALMENTE capturada/transmitida — independente do
// tamanho da janela/monitor do mestre. Bug relatado pelo usuário: o app
// trava o PC inteiro (não só o app) pouco depois de começar a transmitir
// o mapa 3D — sintoma típico de driver de GPU engasgando (TDR) por
// `canvas.captureStream()` + `preserveDrawingBuffer` ficarem capturando e
// recodificando, quadro a quadro, um canvas WebGL do tamanho da tela
// cheia (num monitor 4K/ultrawide com devicePixelRatio alto, isso pode
// passar de 3840×2160 reais). Em vez de capturar o canvas 3D original
// direto, desenha uma cópia reduzida num canvas 2D à parte (mesma
// resolução sempre, não importa o monitor) e captura DELE — o mestre
// continua vendo a cena local na resolução cheia, sem perda nenhuma.
const MAX_BROADCAST_WIDTH = 1280;
const MAX_BROADCAST_HEIGHT = 720;
const BROADCAST_FPS = 24;

function createBoundedCaptureStream(source: HTMLCanvasElement): { stream: MediaStream; stop: () => void } {
  const proxy = document.createElement('canvas');
  proxy.width = MAX_BROADCAST_WIDTH;
  proxy.height = MAX_BROADCAST_HEIGHT;
  const ctx = proxy.getContext('2d', { alpha: false })!;
  let stopped = false;
  let timer = 0;
  const draw = () => {
    if (stopped) return;
    const scale = Math.min(MAX_BROADCAST_WIDTH / source.width, MAX_BROADCAST_HEIGHT / source.height, 1);
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, proxy.width, proxy.height);
    ctx.drawImage(source, (proxy.width - w) / 2, (proxy.height - h) / 2, w, h);
    timer = window.setTimeout(draw, 1000 / BROADCAST_FPS);
  };
  draw();
  return {
    stream: proxy.captureStream(BROADCAST_FPS),
    stop: () => {
      stopped = true;
      window.clearTimeout(timer);
    },
  };
}

async function applyVideoQuality(sender: RTCRtpSender) {
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
    params.encodings[0].scaleResolutionDownBy = 1;
    await sender.setParameters(params);
  } catch {
    // alguns navegadores só aceitam setParameters depois da 1ª negociação
    // terminar — se falhar aqui, a qualidade só fica no padrão mesmo.
  }
}

// Transmissão ao vivo (WebRTC) do mestre pros jogadores numa mesa pela
// internet (Entrega 2 — ver plano) — substitui distribuir arquivo de
// música/modelo 3D pra cada jogador: o mestre manda a PRÓPRIA tela 3D
// (captura do canvas, só quando o cenário é 3D) + o áudio que está tocando
// (sempre), e cada jogador só recebe e exibe. Sem isso (mesa em rede local),
// este componente não faz nada — continua tudo como já era.
//
// Topologia: estrela centrada no mestre — uma RTCPeerConnection por
// jogador presente, nenhuma conexão jogador-jogador (ninguém precisa da
// mídia de outro jogador). Sinalização (offer/answer/ice) viaja pelo MESMO
// canal de eventos da mesa (`sendRoomEvent`/`webrtc:*` em realtime.ts) —
// funciona idêntico em LAN ou Supabase, sem precisar de um servidor de
// sinalização à parte. Só STUN (sem TURN) nesta primeira versão — cobre a
// maioria das redes; redes muito restritas podem falhar em conectar.
export function AvBroadcastController() {
  const { me } = useIdentity();
  const mode = useTableStore((s) => s.mode);
  const users = useTableStore((s) => s.users);
  const sendRoomEvent = useTableStore((s) => s.sendRoomEvent);
  const setWebrtcHandler = useTableStore((s) => s.setWebrtcHandler);
  const setRemoteAvStream = useTableStore((s) => s.setRemoteAvStream);
  const setAvLinkDown = useTableStore((s) => s.setAvLinkDown);
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const is3d = activeScene({ scenes, activeSceneId }).kind === '3d';

  const active = mode !== null && mode !== 'lan';

  // mestre: uma conexão por jogador presente
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const negotiatingRef = useRef<Set<string>>(new Set());
  // tentativas de ICE restart por jogador (zera quando reconecta) — ver
  // onconnectionstatechange em ensurePeer.
  const restartAttemptsRef = useRef<Map<string, number>>(new Map());
  const restartTimersRef = useRef<Map<string, number>>(new Map());
  // jogador: a única conexão com o mestre
  const playerPcRef = useRef<RTCPeerConnection | null>(null);
  const playerReconnectTimerRef = useRef<number | undefined>(undefined);

  // ---- lado do MESTRE: mantém uma conexão por jogador presente ----
  useEffect(() => {
    if (!active || !me.isGM) return;

    const ensurePeer = (playerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(playerId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(playerId, pc);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendRoomEvent({
            type: 'webrtc:ice',
            payload: { to: playerId, from: me.id, candidate: e.candidate.toJSON() },
          });
        }
      };
      pc.onnegotiationneeded = () => {
        if (negotiatingRef.current.has(playerId)) return;
        negotiatingRef.current.add(playerId);
        void (async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendRoomEvent({
              type: 'webrtc:offer',
              payload: { to: playerId, from: me.id, sdp: offer.sdp ?? '' },
            });
          } catch {
            // conexão pode já ter fechado no meio do caminho — ignora
          } finally {
            negotiatingRef.current.delete(playerId);
          }
        })();
      };
      // Sem servidor TURN (pedido do usuário), uma conexão direta pode
      // falhar por causa da rede de QUALQUER uma das duas pontas — isso não
      // é tratável no código (é o próprio limite do WebRTC só-STUN), mas
      // tentar de novo sozinho (ICE restart) resolve os casos de falha
      // transitória/lentidão, não só NAT impossível de verdade. Reage tanto
      // a 'failed' quanto a 'disconnected' (com uma folga maior pra esse
      // último, que costuma se resolver sozinho); quando esgota as
      // tentativas de ICE restart, fecha e recria a conexão do zero (nova
      // oferta) em vez de ficar morta pra sempre.
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          restartAttemptsRef.current.delete(playerId);
          clearRestartTimer(playerId);
          return;
        }
        if (state !== 'failed' && state !== 'disconnected') return;
        if (restartTimersRef.current.has(playerId)) return; // já tem uma tentativa agendada
        const attempts = restartAttemptsRef.current.get(playerId) ?? 0;
        const delay = state === 'disconnected' ? DISCONNECTED_GRACE_MS : ICE_RESTART_DELAY_MS;
        if (attempts >= ICE_RESTART_MAX_ATTEMPTS) {
          const timer = window.setTimeout(() => {
            restartTimersRef.current.delete(playerId);
            if (peersRef.current.get(playerId) !== pc) return; // peer já foi trocado/fechado
            if (pc.connectionState === 'connected') return; // recuperou sozinho antes do timer
            recreatePeer(playerId);
          }, RECREATE_DELAY_MS);
          restartTimersRef.current.set(playerId, timer);
          return;
        }
        restartAttemptsRef.current.set(playerId, attempts + 1);
        const timer = window.setTimeout(() => {
          restartTimersRef.current.delete(playerId);
          if (peersRef.current.get(playerId) !== pc) return; // peer já foi trocado/fechado
          if (pc.connectionState === 'connected') return; // recuperou sozinho antes do timer
          try {
            pc.restartIce();
          } catch {
            // conexão já deve estar fechando — ignora
          }
        }, delay);
        restartTimersRef.current.set(playerId, timer);
      };
      const audioTrack = getMixedAudioTrack();
      if (audioTrack) pc.addTrack(audioTrack);
      if (videoTrackRef.current) void applyVideoQuality(pc.addTrack(videoTrackRef.current));
      return pc;
    };

    const clearRestartTimer = (playerId: string) => {
      const t = restartTimersRef.current.get(playerId);
      if (t) {
        window.clearTimeout(t);
        restartTimersRef.current.delete(playerId);
      }
    };

    const teardownPeer = (playerId: string) => {
      const pc = peersRef.current.get(playerId);
      if (!pc) return;
      pc.close();
      peersRef.current.delete(playerId);
      restartAttemptsRef.current.delete(playerId);
      clearRestartTimer(playerId);
    };

    // fecha e recria a conexão do zero (nova RTCPeerConnection, nova
    // oferta) — usado quando esgotam as tentativas de ICE restart, e
    // também quando o PRÓPRIO jogador pede reconexão (ver 'webrtc:bye'
    // abaixo, mandado pelo lado do jogador quando ele não consegue
    // recuperar sozinho, já que só o mestre oferta nesta topologia).
    const recreatePeer = (playerId: string) => {
      teardownPeer(playerId);
      ensurePeer(playerId);
    };

    const presentIds = new Set(users.filter((u) => u.id !== me.id).map((u) => u.id));
    for (const id of presentIds) ensurePeer(id);
    for (const id of [...peersRef.current.keys()]) {
      if (!presentIds.has(id)) teardownPeer(id);
    }

    setWebrtcHandler((ev: WebrtcSignal) => {
      const pc = peersRef.current.get(ev.payload.from);
      if (!pc) return;
      if (ev.type === 'webrtc:answer') {
        void pc.setRemoteDescription({ type: 'answer', sdp: ev.payload.sdp }).catch(() => {});
      } else if (ev.type === 'webrtc:ice') {
        void pc.addIceCandidate(ev.payload.candidate).catch(() => {});
      } else if (ev.type === 'webrtc:bye') {
        teardownPeer(ev.payload.from);
        // o jogador manda 'bye' quando não consegue recuperar a conexão
        // sozinho (ver lado do jogador, abaixo) — se ele ainda estiver na
        // mesa, recria a conexão e já manda uma oferta nova.
        if (presentIds.has(ev.payload.from)) ensurePeer(ev.payload.from);
      }
    });

    return () => {
      setWebrtcHandler(null);
      for (const id of [...peersRef.current.keys()]) teardownPeer(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, me.isGM, me.id, users]);

  // ---- lado do MESTRE: captura o canvas 3D como stream de vídeo só
  // enquanto o cenário ativo é 3D; tira a track quando volta pro 2D ----
  useEffect(() => {
    if (!active || !me.isGM) return;

    if (!is3d) {
      if (videoTrackRef.current) {
        const track = videoTrackRef.current;
        for (const pc of peersRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track === track);
          if (sender) pc.removeTrack(sender);
        }
        track.stop();
        videoTrackRef.current = null;
        stopCaptureRef.current?.();
        stopCaptureRef.current = null;
      }
      return;
    }

    return onGmCanvas3dChange((canvas) => {
      if (!canvas || videoTrackRef.current) return;
      const { stream, stop } = createBoundedCaptureStream(canvas);
      const track = stream.getVideoTracks()[0];
      if (!track) {
        stop();
        return;
      }
      // "detail" em vez do padrão ("motion") — pede pro navegador priorizar
      // nitidez espacial sobre suavidade de movimento ao decidir como gastar
      // o bitrate, o jeito certo pra conteúdo tipo "tela compartilhada"
      // (mesa 3D), diferente de webcam/chamada de vídeo.
      track.contentHint = 'detail';
      videoTrackRef.current = track;
      stopCaptureRef.current = stop;
      for (const pc of peersRef.current.values()) void applyVideoQuality(pc.addTrack(track));
    });
  }, [active, me.isGM, is3d]);

  // ---- lado do JOGADOR: uma única conexão, respondendo ao mestre ----
  useEffect(() => {
    if (!active || me.isGM) return;

    const applyTrackSnapshot = (pc: RTCPeerConnection) => {
      const tracks = pc
        .getReceivers()
        .map((r) => r.track)
        .filter((t): t is MediaStreamTrack => !!t);
      setRemoteAvStream(tracks.length ? new MediaStream(tracks) : null);
    };

    setWebrtcHandler((ev: WebrtcSignal) => {
      if (ev.type === 'webrtc:offer') {
        void (async () => {
          let pc = playerPcRef.current;
          if (!pc) {
            pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            playerPcRef.current = pc;
            pc.onicecandidate = (e) => {
              if (e.candidate) {
                sendRoomEvent({
                  type: 'webrtc:ice',
                  payload: { to: ev.payload.from, from: me.id, candidate: e.candidate.toJSON() },
                });
              }
            };
            pc.ontrack = () => applyTrackSnapshot(pc!);
            // Mesmo limite de sempre (sem TURN): avisa o jogador quando a
            // conexão direta com o mestre cai, em vez de ficar mudo sem
            // explicação nenhuma. O jogador nunca cria oferta nesta
            // topologia (só o mestre), então não adianta tentar
            // restartIce() sozinho aqui — em vez disso, se a conexão não
            // voltar depois de uma folga (maior pra 'disconnected', que
            // costuma se resolver sozinho), fecha a própria conexão e
            // manda 'webrtc:bye' pro mestre pedindo uma conexão nova (o
            // mestre recria do zero e manda oferta nova — ver 'webrtc:bye'
            // no lado do mestre).
            pc.onconnectionstatechange = () => {
              const state = pc!.connectionState;
              setAvLinkDown(state === 'failed' || state === 'disconnected');
              if (state === 'connected') {
                window.clearTimeout(playerReconnectTimerRef.current);
                playerReconnectTimerRef.current = undefined;
                return;
              }
              if (state !== 'failed' && state !== 'disconnected') return;
              if (playerReconnectTimerRef.current != null) return; // já tem reconexão agendada
              const delay = state === 'disconnected' ? DISCONNECTED_GRACE_MS : ICE_RESTART_DELAY_MS;
              playerReconnectTimerRef.current = window.setTimeout(() => {
                playerReconnectTimerRef.current = undefined;
                if (playerPcRef.current !== pc) return; // já foi trocada/fechada
                if (pc!.connectionState === 'connected') return; // recuperou sozinho antes do timer
                sendRoomEvent({ type: 'webrtc:bye', payload: { to: ev.payload.from, from: me.id } });
                pc!.close();
                playerPcRef.current = null;
                setRemoteAvStream(null);
              }, delay);
            };
          }
          try {
            await pc.setRemoteDescription({ type: 'offer', sdp: ev.payload.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendRoomEvent({
              type: 'webrtc:answer',
              payload: { to: ev.payload.from, from: me.id, sdp: answer.sdp ?? '' },
            });
          } catch {
            // oferta chegou fora de ordem/conexão já fechada — ignora
          }
        })();
      } else if (ev.type === 'webrtc:ice') {
        void playerPcRef.current?.addIceCandidate(ev.payload.candidate).catch(() => {});
      } else if (ev.type === 'webrtc:bye') {
        playerPcRef.current?.close();
        playerPcRef.current = null;
        setRemoteAvStream(null);
        setAvLinkDown(false);
      }
    });

    return () => {
      setWebrtcHandler(null);
      window.clearTimeout(playerReconnectTimerRef.current);
      playerReconnectTimerRef.current = undefined;
      playerPcRef.current?.close();
      playerPcRef.current = null;
      setRemoteAvStream(null);
      setAvLinkDown(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, me.isGM, me.id]);

  return null;
}
