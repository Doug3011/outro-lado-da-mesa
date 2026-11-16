import { supabase } from './supabase';

// Resolve/envia a imagem de uma prova do Quadro de investigação. O BoardItem
// só guarda o `imageId` (nunca os bytes), pra nunca estourar o teto de
// 256KB do broadcast em tempo real (ver comentário em types.ts) — a imagem
// em si é buscada à parte, por um caminho que depende do modo da mesa:
//
//   - rede local: servidor local do mestre (mesmo mecanismo de tokens/
//     música — `/api/quadro-imagens`, ver server/main.cjs). Quem entrou de
//     outro computador precisa do endereço absoluto (`roomCode` = "host:
//     porta"), senão bateria no PRÓPRIO servidor local de quem pediu (vazio)
//     — mesmo motivo já documentado em musicLibrary.ts/trackUrl.
//   - pela internet: não existe servidor único alcançável por todo mundo
//     (cada um roda o próprio, em redes diferentes — mesmo problema que já
//     levou música/vídeo a usar WebRTC em vez de arquivo). Aqui sobe pro
//     Supabase Storage (bucket "quadro-provas", público) em vez disso.
//
// `registerLocalBoardImage` é um atalho só pra quem ACABOU de enviar (já
// tem a imagem em memória, não precisa buscar de novo da própria rede).

const memoryCache = new Map<string, string>();

export function registerLocalBoardImage(imageId: string, dataUrl: string): void {
  memoryCache.set(imageId, dataUrl);
}

function apiBase(roomHost?: string | null): string {
  return roomHost ? `http://${roomHost}` : '';
}

type RoomMode = 'supabase' | 'local' | 'lan' | null;

const STORAGE_BUCKET = 'quadro-provas';

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const r = await fetch(dataUrl);
  return r.blob();
}

export async function uploadBoardImage(
  imageId: string,
  blob: Blob,
  mode: RoomMode,
  roomCode: string | null,
): Promise<boolean> {
  if (mode === 'lan') {
    const roomHost = roomCode && roomCode.includes(':') ? roomCode : null;
    try {
      const r = await fetch(`${apiBase(roomHost)}/api/quadro-imagens/items/${imageId}?ext=webp`, {
        method: 'PUT',
        body: blob,
      });
      return r.ok;
    } catch {
      return false;
    }
  }
  if (mode === 'supabase' && supabase) {
    try {
      const path = `${roomCode ?? 'sem-sala'}/${imageId}.webp`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      });
      return !error;
    } catch {
      return false;
    }
  }
  // modo "local" (BroadcastChannel entre abas, sem servidor) — não tem onde
  // subir a imagem; o item fica sem src pros outros (mesma limitação já
  // documentada pro QR/ficha no celular nesse modo).
  return false;
}

export function boardImageUrl(imageId: string, mode: RoomMode, roomCode: string | null): string | null {
  if (mode === 'lan') {
    const roomHost = roomCode && roomCode.includes(':') ? roomCode : null;
    return `${apiBase(roomHost)}/quadro-imagens/${imageId}`;
  }
  if (mode === 'supabase' && supabase) {
    const path = `${roomCode ?? 'sem-sala'}/${imageId}.webp`;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  return null;
}

export function boardImageSrc(imageId: string | undefined, mode: RoomMode, roomCode: string | null): string | null {
  if (!imageId) return null;
  const cached = memoryCache.get(imageId);
  if (cached) return cached;
  return boardImageUrl(imageId, mode, roomCode);
}
