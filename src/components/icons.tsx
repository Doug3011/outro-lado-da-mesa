export function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {level > 0.02 && (
        <path
          d="M16.5 9c1 1 1 5 0 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity={level > 0.5 ? 1 : 0.45}
        />
      )}
      {level > 0.5 && (
        <path
          d="M19 6.5c2.2 2.2 2.2 8.8 0 11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
      {level <= 0.02 && (
        <path d="M17 8.5l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

// Ícones dos botões flutuantes do mapa 2D (Mestre/Tokens/Mapas/Ficha/Mapa) —
// mesmos traços do mockup aprovado, só redesenhados como componentes.
export function FichaFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function MestreFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="15.2" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.3 12.9 18.5 4.7h3v3l-1.9 1.9h-2.6v2.6h-2.6l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TokensFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MapasFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

// Botão "Mapa" (zoom + medir + token) do lado do jogador, sem acesso às
// ferramentas de mestre — lupa simples.
export function ViewFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Ícones dos botões flutuantes "universais" (Dados/Histórico/Músicas/
// Perfis) — mesma família visual dos ícones do mapa 2D acima.
export function DadosFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" />
      <circle cx="15.7" cy="8.3" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="8.3" cy="15.7" r="1.3" fill="currentColor" />
      <circle cx="15.7" cy="15.7" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function HistoricoFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5a7 7 0 1 1-6.3 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.5V12l2.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MusicasFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 17V5l11-2v12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PerfisFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14.8 19c.4-2.3 1.7-3.6 3.3-3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Ícone do botão flutuante "Câmera" (mesa 3D) — reset de enquadramento +
// toggle órbita/voo, mesma família visual dos ícones acima.
export function CameraFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-1.5h7L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Ícone do botão flutuante "Peças"/"Modelos" (bibliotecas de asset dos
// editores de cenário 2D/3D, Prototype2D.tsx/Prototype3D.tsx) — camadas
// empilhadas, mesma família visual dos ícones acima.
export function LibraryFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3.5 12 12 16.5 20.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M3.5 16 12 20.5 20.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Ícone do botão flutuante "Selecionada"/"Objetos" (editor da peça/objeto
// selecionado nos editores de cenário 2D/3D) — retângulo com cantos de
// seleção, mesma família visual dos ícones acima.
export function SelectionFloatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l1.9-1.3-1.6-2.8-2.2.7a7.7 7.7 0 0 0-2.8-1.6L14.3 3h-3.2l-.4 2.4a7.7 7.7 0 0 0-2.8 1.6l-2.2-.7-1.6 2.8 1.9 1.3a7.6 7.6 0 0 0 0 3.2l-1.9 1.3 1.6 2.8 2.2-.7a7.7 7.7 0 0 0 2.8 1.6l.4 2.4h3.2l.4-2.4a7.7 7.7 0 0 0 2.8-1.6l2.2.7 1.6-2.8-1.9-1.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
