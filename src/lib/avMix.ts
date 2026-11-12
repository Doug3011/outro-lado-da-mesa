// Grafo de áudio compartilhado do MESTRE numa mesa pela internet — pega o
// que já está tocando (música, por enquanto) e também manda pra fora, pros
// jogadores, via WebRTC (ver AvBroadcastController.tsx), em vez de cada
// jogador baixar o arquivo de música e tocar a própria cópia. O mestre
// continua ouvindo normal (os nós HTMLAudioElement continuam ligados nos
// alto-falantes também — `connectAudioElement` liga em PARALELO, não troca).
//
// Isso só existe/é usado no lado do mestre; jogador nunca chama nada daqui.

let ctx: AudioContext | null = null;
let dest: MediaStreamAudioDestinationNode | null = null;
const connected = new WeakSet<HTMLMediaElement>();

function ensureContext(): { ctx: AudioContext; dest: MediaStreamAudioDestinationNode } {
  if (!ctx || !dest) {
    ctx = new AudioContext();
    dest = ctx.createMediaStreamDestination();
  }
  return { ctx, dest };
}

// Chamado pelo MusicPlayer.tsx (e, futuramente, AmbientPlayer.tsx) do
// mestre assim que o elemento `<audio>` existe — idempotente (seguro
// chamar de novo com o mesmo elemento, ex.: a cada render).
export function connectAudioElement(el: HTMLMediaElement): void {
  if (connected.has(el)) return;
  const { ctx, dest } = ensureContext();
  try {
    const source = ctx.createMediaElementSource(el);
    source.connect(ctx.destination); // mantém saindo pelos alto-falantes do mestre
    source.connect(dest); // e também pro stream que vai pros jogadores
    connected.add(el);
  } catch {
    // createMediaElementSource só pode ser chamado 1x por elemento (lança
    // se já tiver sido usado por outro contexto/motivo) — ignora, já deve
    // estar conectado por outra via.
  }
}

// A faixa de áudio combinada atual, pra entrar na RTCPeerConnection de cada
// jogador. `null` até o primeiro `connectAudioElement`/getter ser chamado.
export function getMixedAudioTrack(): MediaStreamTrack | null {
  if (!dest) return null;
  return dest.stream.getAudioTracks()[0] ?? null;
}

// Autoplay: AudioContext nasce "suspended" até um gesto do usuário em
// alguns navegadores/Electron — MusicPlayer.tsx já trata autoplay bloqueado
// pro próprio áudio local; chamamos isso no mesmo gatilho (primeiro
// clique/tecla) pra destravar também o contexto que alimenta o stream.
export function resumeAvMix(): void {
  void ctx?.resume();
}
