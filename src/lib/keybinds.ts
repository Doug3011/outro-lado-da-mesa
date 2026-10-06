import { useEffect, useState } from 'react';

// Teclas configuráveis — pedido do usuário: "uma aba controles aonde eu
// possa configurar cada botão de forma independente pra pessoa se sentir
// confortável". Guarda `KeyboardEvent.code` (posição física da tecla,
// independente de layout/idioma do teclado — "ArrowLeft" sempre é a seta
// esquerda, não muda com teclado ABNT2 vs US) em vez de `.key`.
export type KeybindAction =
  | 'token-rotate-left'
  | 'token-rotate-right'
  | 'token-resize-up'
  | 'token-resize-down'
  | 'token-cycle-sprite'
  | 'token-open-panel';

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  'token-rotate-left': 'Girar token pra esquerda',
  'token-rotate-right': 'Girar token pra direita',
  'token-resize-up': 'Aumentar token',
  'token-resize-down': 'Diminuir token',
  'token-cycle-sprite': 'Trocar variante de imagem do token',
  'token-open-panel': 'Abrir ficha do token selecionado',
};

export const DEFAULT_KEYBINDS: Record<KeybindAction, string> = {
  'token-rotate-left': 'ArrowLeft',
  'token-rotate-right': 'ArrowRight',
  'token-resize-up': 'ArrowUp',
  'token-resize-down': 'ArrowDown',
  'token-cycle-sprite': 'KeyV',
  'token-open-panel': 'Enter',
};

const STORAGE_KEY = 'ordem:keybinds';
const CHANGE_EVENT = 'ordem:keybinds-changed';

export function loadKeybinds(): Record<KeybindAction, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw) as Partial<Record<KeybindAction, string>>;
    return { ...DEFAULT_KEYBINDS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function saveKeybinds(binds: Record<KeybindAction, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(binds));
  } catch {
    /* ignora — configuração só não persiste entre sessões */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// Hook pra quem CONSOME os atalhos (ex.: BattleMap.tsx) — lê do
// localStorage uma vez e atualiza sozinho se a aba Controles mudar algo
// (mesmo padrão de evento customizado já usado pro volume de música/dados).
export function useKeybinds(): Record<KeybindAction, string> {
  const [binds, setBinds] = useState(loadKeybinds);
  useEffect(() => {
    const onChange = () => setBinds(loadKeybinds());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return binds;
}

// Rótulo curto e legível pra mostrar na UI — "ArrowLeft" vira "←", "KeyV"
// vira "V", o resto cai no próprio `code` cru (ainda legível o bastante).
export function keyLabel(code: string): string {
  const named: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Enter: 'Enter',
    Space: 'Espaço',
    Escape: 'Esc',
    Tab: 'Tab',
    ShiftLeft: 'Shift esq.',
    ShiftRight: 'Shift dir.',
    ControlLeft: 'Ctrl esq.',
    ControlRight: 'Ctrl dir.',
  };
  if (named[code]) return named[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
