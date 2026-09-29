import { create } from 'zustand';

// Substituto de window.prompt() — o Electron não implementa prompt() de
// verdade (só alert/confirm têm diálogo nativo; prompt() sempre devolve null
// sem mostrar nada, silenciosamente). Modal próprio, controlado por store
// global (montado uma vez em App.tsx) pra poder ser chamado de qualquer
// componente via `askText(...)`, com a mesma cara de uso do prompt() nativo.
interface PromptStore {
  open: boolean;
  message: string;
  value: string;
  resolve: ((v: string | null) => void) | null;
  ask: (message: string, defaultValue?: string) => Promise<string | null>;
  setValue: (v: string) => void;
  confirm: () => void;
  cancel: () => void;
}

export const usePromptDialog = create<PromptStore>((set, get) => ({
  open: false,
  message: '',
  value: '',
  resolve: null,
  ask: (message, defaultValue = '') =>
    new Promise((resolve) => {
      // se já tinha um prompt pendente (não devia rolar na prática), cancela
      // ele antes de abrir o novo, pra nunca vazar uma Promise sem resolver
      get().resolve?.(null);
      set({ open: true, message, value: defaultValue, resolve });
    }),
  setValue: (value) => set({ value }),
  confirm: () => {
    const { value, resolve } = get();
    resolve?.(value);
    set({ open: false, resolve: null });
  },
  cancel: () => {
    const { resolve } = get();
    resolve?.(null);
    set({ open: false, resolve: null });
  },
}));

export function askText(message: string, defaultValue?: string): Promise<string | null> {
  return usePromptDialog.getState().ask(message, defaultValue);
}
