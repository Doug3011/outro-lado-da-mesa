import { useEffect, useRef } from 'react';
import { useIdentity } from '../hooks/useIdentity';
import { activeScene, useTableStore, type WebrtcSignal } from '../store/useTableStore';
import { getMixedAudioTrack } from '../lib/avMix';
import { onGmCanvas3dChange } from '../lib/gmCanvasRegistry';

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
// Sem isso, o WebRTC usa os padrões pensados pra webcam (bitrate baixo,
// prioridade em suavidade de movimento) — péssimo pra uma cena 3D parada a
// maior parte do tempo, onde nitidez importa muito mais que taxa de
// quadros. Pedido do usuário: "a resolução ficou pixelada e embaçada".
const VIDEO_MAX_BITRATE = 4_000_000; // 4 Mbps

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
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const is3d = activeScene({ scenes, activeSceneId }).kind === '3d';

  const active = mode !== null && mode !== 'lan';

  // mestre: uma conexão por jogador presente
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const negotiatingRef = useRef<Set<string>>(new Set());
  // jogador: a única conexão com o mestre
  const playerPcRef = useRef<RTCPeerConnection | null>(null);

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
      const audioTrack = getMixedAudioTrack();
      if (audioTrack) pc.addTrack(audioTrack);
      if (videoTrackRef.current) void applyVideoQuality(pc.addTrack(videoTrackRef.current));
      return pc;
    };

    const teardownPeer = (playerId: string) => {
      const pc = peersRef.current.get(playerId);
      if (!pc) return;
      pc.close();
      peersRef.current.delete(playerId);
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
      }
      return;
    }

    return onGmCanvas3dChange((canvas) => {
      if (!canvas || videoTrackRef.current) return;
      const stream = canvas.captureStream(24);
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      // "detail" em vez do padrão ("motion") — pede pro navegador priorizar
      // nitidez espacial sobre suavidade de movimento ao decidir como gastar
      // o bitrate, o jeito certo pra conteúdo tipo "tela compartilhada"
      // (mesa 3D), diferente de webcam/chamada de vídeo.
      track.contentHint = 'detail';
      videoTrackRef.current = track;
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
      }
    });

    return () => {
      setWebrtcHandler(null);
      playerPcRef.current?.close();
      playerPcRef.current = null;
      setRemoteAvStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, me.isGM, me.id]);

  return null;
}
