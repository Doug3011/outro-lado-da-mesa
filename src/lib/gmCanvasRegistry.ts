// Ponte entre Battle3D.tsx (canvas 3D do MESTRE, via `onCreated`) e
// AvBroadcastController.tsx — sem isso, capturar o canvas como stream de
// vídeo (mesa pela internet, Entrega 2) exigiria Context/prop-drilling
// entre dois componentes que não têm relação de pai/filho direta. Só o
// mestre publica (`setGmCanvas3d`); só é lido quando a mesa é pela internet.
let canvas: HTMLCanvasElement | null = null;
let listener: ((c: HTMLCanvasElement | null) => void) | null = null;

export function setGmCanvas3d(c: HTMLCanvasElement | null): void {
  canvas = c;
  listener?.(c);
}

// Assina mudanças (chama imediatamente com o valor atual, mesmo padrão de
// um "store" simples) — devolve a função de cancelar inscrição.
export function onGmCanvas3dChange(fn: (c: HTMLCanvasElement | null) => void): () => void {
  listener = fn;
  fn(canvas);
  return () => {
    if (listener === fn) listener = null;
  };
}
