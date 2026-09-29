import { customAlphabet, nanoid } from 'nanoid';

export const uid = (): string => nanoid(12);

// Codigo de sala legivel: 6 caracteres, sem ambiguos (0/O, 1/I).
const roomAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newRoomCode = customAlphabet(roomAlphabet, 6);

export function randomColor(seed?: string): string {
  const palette = [
    '#c1121f',
    '#7b2cbf',
    '#2b9348',
    '#f4a259',
    '#4361ee',
    '#e5383b',
    '#118ab2',
    '#d4a373',
    '#8d99ae',
    '#ff8fab',
  ];
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }
  return palette[Math.floor(Math.random() * palette.length)];
}
