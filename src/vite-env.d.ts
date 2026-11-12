/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injetado em build-time pelo vite.config.ts, lendo desktop/package.json —
// pedido do usuário: mostrar a versão na tela inicial pra saber se está
// testando o build certo depois de uma atualização.
declare const __APP_VERSION__: string;
