// Ponte pequena entre o <audio> de verdade (vive só dentro de MusicPlayer.tsx,
// que não tem UI própria) e o resto do app — permite tentar tocar de novo a
// partir de um clique de verdade (gesto do usuário) quando o autoplay foi
// bloqueado pelo navegador. Só acontece em quem entra por um navegador comum
// (fora do app Electron, que já libera autoplay via linha de comando).
let audioEl: HTMLAudioElement | null = null;

export function setMusicAudioEl(el: HTMLAudioElement | null): void {
  audioEl = el;
}

export function retryMusicPlay(): void {
  audioEl?.play().catch(() => {
    /* ainda bloqueado — segue sem tocar até o próximo gesto */
  });
}
