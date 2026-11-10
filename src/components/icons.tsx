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

// ---------- REDESIGN Passo 4 (Mesa do mestre: dock + janelas) ----------
// Ícones novos usados só quando FloatingButton/FloatingWindow estão no modo
// `dock` (ver props em FloatingButton.tsx/FloatingWindow.tsx) — Prototype2D/
// Prototype3D continuam só com os ícones acima, sem nenhum destes.

// Fechar janela (substitui o "✕" de texto cru no modo dock).
export function CloseFloatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Órbita/voo livre (janela "Câmera", mesa 3D) — traços tirados direto da
// referência (Mesa-Mestre.dc.html, `camModes`).
export function OrbitModeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 12c0-3 4-6 9-6s9 3 9 6-4 6-9 6-9-3-9-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function FlyModeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2 4 20l8-4 8 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
export function ResetFrameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Adicionar na cena" (janela "Mestre", mesa 3D) — 5 ícones, cada um com a
// cor de destaque usada na referência (aplicada via prop `color`, ver uso
// em Battle3D.tsx).
export function SceneGroundToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 17 12 21l9-4-9-4zM3 12l9 4 9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function SceneObjectToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2 21 7v10l-9 5-9-5V7zM12 22V12M3 7l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function SceneDecalToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h16v16H4zM4 15l5-5 5 5 3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function SceneModelToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h10l4 6-9 12L3 9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
export function SceneLightToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Formas de dado (janela "Dados", aba "Rolagem livre") — mesmos traços da
// referência (`shapes`), um componente só por simplicidade de uso.
export function DiceShapeIcon({ sides }: { sides: number }) {
  const shapes: Record<number, string> = {
    4: 'M12 3 21 20H3z',
    6: 'M5 5h14v14H5z',
    8: 'M12 2 21 12 12 22 3 12z',
    10: 'M12 2 20 9l-3 11H7L4 9z',
    12: 'M12 2l8 5v10l-8 5-8-5V7z',
    20: 'M12 2 21 7v10l-9 5-9-5V7z',
    100: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12h8',
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={shapes[sides] ?? shapes[20]} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Marca ("olho") da barra superior da mesa — substitui o glifo "◈" cru.
export function BrandEyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 12q7-6 14 0q-7 6-14 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
export function BackChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function CopyAddressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
// "Importar imagem" (fundo do mapa 2D, janela "Mestre") e "Lanterna"
// (névoa modo Lanterna, mesma janela) — substituem os emoji 🖼/💡 cru.
export function ImportImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 16.5 8.5 11l3.5 3.5L16 11l5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function LanternIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GmBadgeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.9L22 9.3l-5.5 4.8L18.2 21 12 17.3 5.8 21l1.7-6.9L2 9.3l7.1-.4z" />
    </svg>
  );
}

// ---------- REDESIGN Passo 5 (Ficha de personagem) ----------
// Ícones novos usados pelo cabeçalho da ficha (tela cheia e janela na
// mesa) e pelo chrome extra da FloatingWindow quando `minimizable`/
// `maximizable` estão ligados (só a ficha usa essas duas por enquanto —
// ver BattleMap.tsx/Battle3D.tsx).

// "Vincular token" (cabeçalho da ficha) — dois elos de corrente, mesmo
// traço do botão equivalente em Mesa-Ficha.dc.html (`mf-tool`).
export function LinkTokenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "No celular" (abre o cartão com QR+endereço, reaproveitando FichaQr.tsx)
// — silhueta de telefone, mesmo traço da referência.
export function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// "Regra PD" (funde PE+Sanidade em Pontos de Determinação) — gota,
// mesmo traço da referência (`togglePd`).
export function PdIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" />
    </svg>
  );
}

// Minimizar/maximizar/restaurar a FloatingWindow (chrome extra opt-in via
// `minimizable`/`maximizable`, ver FloatingWindow.tsx) — mesmos traços da
// referência (Mesa-Ficha.dc.html, botões "Minimizar"/"Maximizar").
export function MinimizeWinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
export function MaximizeWinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
export function RestoreWinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="7" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 4h9a2 2 0 0 1 2 2v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

// ---------- REDESIGN Passo 6 (Minhas fichas) ----------
// Ícones novos pros botões/cartões da biblioteca de fichas (CharacterLibrary.tsx)
// — mesma família de traço fino dos ícones acima, substituindo os emoji
// cru (📥) e os glifos de texto ("+", "→") que a tela usava antes.

// "Criar ficha" / cartão tracejado "Novo agente" — cruz simples.
export function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// Seta do botão "Acessar" nos cartões de ficha.
export function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Importar da Cris" — seta descendo numa bandeja (substitui o 📥 cru).
export function ImportCrisIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- REDESIGN Passo 8 (Área do mestre) ----------
// Ícones novos pras bibliotecas de assets (música/som/token/cenário/mapa)
// quando renderizadas no tema Energia — substituem glifos de texto cru
// (▶/⏸/✎) usados nas mesmas listas quando aparecem DENTRO de uma mesa
// (visual antigo, ainda não redesenhado).

export function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
export function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
export function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
export function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15V3M7 8l5-5 5 5M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Scenery2DIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ---------- REDESIGN: Wizard de criação de ficha (6 etapas, CharacterWizard.tsx) ----------
// Ícones novos pra última tela do redesign — chegou depois das 17
// referências originais. Traços mesma família fina das demais; os 3
// pictogramas de classe reaproveitam os caminhos já estabelecidos pra
// Combatente/Especialista/Ocultista em MinigameTest.tsx (CLASS_ICON,
// Passo 10B) — mesmo pictograma, componente próprio aqui pra não acoplar
// os dois fluxos de criação de personagem.

export function ClassIcon({ classKey }: { classKey: 'combatente' | 'especialista' | 'ocultista' }) {
  const paths: Record<string, string> = {
    combatente: 'M5 19 19 5M15 5h4v4M9 19H5v-4M14 14l5 5M10 10 5 5',
    especialista: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
    ocultista: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5 12q7-6 14 0q-7 6-14 0zM12 12h.01',
  };
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[classKey]} />
    </svg>
  );
}

// "Retrato" (etapa Conceito do wizard) — câmera simples, substitui o 🖼 cru.
export function PortraitIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Estrela do destaque "poder de origem" (etapa Conceito) — contorno, maior
// que o selo preenchido de GmBadgeIcon (mesmo glifo da classe Especialista).
export function OriginPowerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Checkmark genérico (selo de etapa concluída, badge de classe/trilha
// selecionada, botão final "Criar agente").
export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
