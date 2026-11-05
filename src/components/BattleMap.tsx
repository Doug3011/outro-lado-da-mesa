import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { randomColor, uid } from '../lib/ids';
import { fileToDownscaledDataURL, urlToDownscaledDataURL } from '../lib/image';
import { askText } from '../state/promptDialog';
import { TOKEN_DRAG_MIME, tokenAssetUrl, type TokenDragPayload } from '../lib/tokenLibrary';
import { keyLabel, useKeybinds } from '../lib/keybinds';
import { hasLan } from '../lib/lan';
import { MapPickerDialog } from './MapPickerDialog';
import { PlacePickerDialog } from './PlacePickerDialog';
import { FloatingButton } from './FloatingButton';
import { FloatingWindow } from './FloatingWindow';
import { TokenLibraryManager } from './TokenLibraryManager';
import { Map2DLibraryManager } from './Map2DLibraryManager';
import { CharacterPanel } from './CharacterPanel';
import { CharacterSheet } from './CharacterSheet';
import { GmCharacterTabs } from './GmCharacterTabs';
import { DiceRoller } from './DiceRoller';
import { RollLog } from './RollLog';
import { MusicAndAmbientPanel } from './MusicAndAmbientPanel';
import { PlayerProfilesPanel } from './PlayerProfilesPanel';
import {
  DadosFloatIcon,
  FichaFloatIcon,
  HistoricoFloatIcon,
  MapasFloatIcon,
  MestreFloatIcon,
  MusicasFloatIcon,
  PerfisFloatIcon,
  TokensFloatIcon,
  ViewFloatIcon,
} from './icons';
import type { Token, TokenSprite } from '../types';

const SEND_EVERY_MS = 45;

type TokenElProps = {
  t: Token;
  selected: boolean;
  cellSize: number;
  onPointerDown: (e: React.PointerEvent, t: Token) => void;
  registerEl: (id: string, el: HTMLDivElement | null) => void;
};

// Extraído de dentro do `.map()` do BattleMap (varredura de performance:
// "ainda trava ao arrastar, mesmo depois do fix anterior") — SEM isso,
// cada token era um `<div>` cru dentro do JSX do BattleMap inteiro, não um
// componente próprio: toda vez que `moveToken` comitava (a cada
// SEND_EVERY_MS, durante QUALQUER arraste), o React re-executava e
// re-diffava a lista INTEIRA de tokens de novo — medido via instrumentação
// temporária: o número de "avaliações de token" por segundo era
// `renders-do-BattleMap × quantidade-de-tokens-na-cena`, não só o token
// arrastado. Com poucos tokens isso não aparece, mas numa mesa cheia (vários
// tokens + névoa + peças de cenário) o custo por commit cresce com o tamanho
// da cena, não fica fixo. Igual ao `Token3D`/`SceneObject` do lado 3D
// (lib/scene3d.tsx) — token NÃO envolvido no arraste mantém a MESMA
// referência de objeto (`patchScene`/`moveToken` só trocam a entrada do
// token movido), então o `memo` abaixo bloqueia o re-render de todo o resto
// — só o token realmente arrastado continua recalculando a cada commit.
const TokenEl = memo(function TokenEl({ t, selected, cellSize, onPointerDown, registerEl }: TokenElProps) {
  const free = !!t.image;
  const px = t.sizePx ?? t.size * cellSize - 6;
  return (
    <div
      ref={(el) => registerEl(t.id, el)}
      className={'token ' + (free ? 'token-free ' : '') + (selected ? 'selected ' : '') + (t.lanternOn ? 'lantern-on' : '')}
      onPointerDown={(e) => onPointerDown(e, t)}
      style={{
        left: t.x * cellSize,
        top: t.y * cellSize,
        width: px,
        height: px,
        margin: 3,
        background: t.image ? undefined : t.color,
        borderColor: free ? 'transparent' : t.color,
        fontSize: Math.min(18, px * 0.3),
      }}
    >
      {t.image && (
        <span
          className="tk-img"
          style={{
            backgroundImage: `url(${t.image})`,
            backgroundSize: free ? 'contain' : 'cover',
            transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
          }}
        />
      )}
      {!t.image && t.label.slice(0, 2).toUpperCase()}
      {t.hp && t.hp.max > 0 && (
        <span className="tk-hp">
          <span
            style={{
              width: `${Math.max(0, Math.min(100, (t.hp.current / t.hp.max) * 100))}%`,
              background: t.hp.current / t.hp.max < 0.3 ? 'var(--blood)' : 'var(--green)',
            }}
          />
        </span>
      )}
      <span className="tk-label">{t.label}</span>
    </div>
  );
});

export function BattleMap() {
  const { me } = useIdentity();
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const characters = useTableStore((s) => s.characters);
  const users = useTableStore((s) => s.users);
  const upsertToken = useTableStore((s) => s.upsertToken);
  const patchTokenLive = useTableStore((s) => s.patchTokenLive);
  const moveToken = useTableStore((s) => s.moveToken);
  const deleteToken = useTableStore((s) => s.deleteToken);
  const updateMap = useTableStore((s) => s.updateMap);
  const addScene = useTableStore((s) => s.addScene);
  const addScene3d = useTableStore((s) => s.addScene3d);
  const renameScene = useTableStore((s) => s.renameScene);
  const deleteScene = useTableStore((s) => s.deleteScene);
  const switchScene = useTableStore((s) => s.switchScene);

  const scene = activeScene({ scenes, activeSceneId });
  const map = scene.map;
  const tokens = scene.tokens;

  const [zoom, setZoom] = useState(1);
  const [selId, setSelId] = useState<string | null>(null);
  // Separado de `selId` de propósito — pedido do usuário: arrastar um
  // token seleciona ele (atalhos de teclado continuam funcionando) mas
  // NÃO deve abrir a ficha na tela; só um clique de verdade (sem
  // arrastar) ou a tecla configurada pra isso (padrão Enter) abre.
  const [panelOpen, setPanelOpen] = useState(false);
  const keybinds = useKeybinds();
  const [measure, setMeasure] = useState(false);
  const [measureLine, setMeasureLine] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);
  const [fogMode, setFogMode] = useState(false);
  const [fogWorking, setFogWorking] = useState<Set<string> | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  // ---- retrofit visual: toolbar antiga virou botões/janelas flutuantes
  // (ver FloatingButton/FloatingWindow, portados do protótipo Godot) ----
  const floatingLayerRef = useRef<HTMLDivElement>(null);
  const [mestreOpen, setMestreOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [mapasOpen, setMapasOpen] = useState(false);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false); // janela "Mapa" do jogador (zoom/medir/token)
  // Botões "universais" (Dados/Histórico/Músicas/Perfis) — moraram no
  // painel lateral antigo (Room.tsx), que ficava fixo na tela ao lado dos
  // botões flutuantes novos (bug relatado pelo usuário); agora entram
  // nesse mesmo sistema de botões/janelas flutuantes, igual Ficha/Mestre/
  // Tokens/Mapas acima. Room.tsx esconde o painel antigo pra cenário 2D
  // (ver Room.tsx) — ele continua existindo só pra mesa 3D, que ainda não
  // tem esse retrofit.
  const [dadosOpen, setDadosOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [musicasOpen, setMusicasOpen] = useState(false);
  const [perfisOpen, setPerfisOpen] = useState(false);
  // Abas de ficha abertas na janela flutuante "Ficha" do mestre — estado
  // independente das abas da barra lateral (Room.tsx/GmCharacterTabs), de
  // propósito: são duas visões opcionais da mesma ficha, não precisam
  // compartilhar estado.
  const [gmFichaTabs, setGmFichaTabs] = useState<string[]>([]);
  const [activeGmFichaTab, setActiveGmFichaTab] = useState<string | null>(null);
  const openGmFichaTab = (id: string) => {
    setGmFichaTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveGmFichaTab(id);
  };
  const closeGmFichaTab = (id: string) => {
    setGmFichaTabs((t) => {
      const next = t.filter((x) => x !== id);
      setActiveGmFichaTab((cur) => (cur === id ? next[next.length - 1] ?? null : cur));
      return next;
    });
  };

  const stageRef = useRef<HTMLDivElement>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const [panning, setPanning] = useState(false);
  const lastSentRef = useRef(0);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);
  // Acesso direto ao <div> de cada token na tela, pra mutar left/top sem
  // passar pelo React durante o arraste — ver onTokenPointerDown abaixo.
  const tokenElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const W = map.cols * map.cellSize;
  const H = map.rows * map.cellSize;
  const selected = selId ? tokens[selId] : null;
  // Cenário 2D (peças de parede/móveis/textura) plantado na Área do Mestre
  // (ver Prototype2D.tsx) — dentro da mesa fica só exibido, travado: o
  // pedido foi manter a mesa "limpa, só pra jogar", edição só fora de mesa.
  const objects2d = map.objects2d ?? [];

  const clientToCell = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      cx: (clientX - rect.left) / zoom / map.cellSize,
      cy: (clientY - rect.top) / zoom / map.cellSize,
    };
  };

  /* -------- arraste de token (listeners em window: não perde o mouse em movimento rápido) --------
     Achado numa varredura de bugs (usuário: "travamento ao arrastar o
     token rápido"): a posição ao vivo vinha de `setDrag(...)` chamado em
     TODO `pointermove` cru, sem throttle nenhum — cada pixel de mouse
     movido disparava um re-render do BattleMap inteiro (todos os tokens,
     peças de cenário, névoa, grade). Arrastando rápido, o navegador gera
     muito mais eventos de pointermove por segundo do que a UI dava conta
     de re-renderizar, travando visivelmente. Mesmo problema já resolvido
     no lado 3D (ref direto do three.js em vez de setState) — aqui o
     equivalente é mutar `style.left/top` do próprio <div> do token direto
     via `tokenElsRef`, sem passar pelo React. O envio pela rede continua
     throttled em SEND_EVERY_MS, só a atualização VISUAL local que deixou
     de depender de re-render.

     `useCallback` (mesma varredura que achou o problema do `TokenEl` acima)
     — sem isso, esse handler era uma função NOVA a cada render do
     BattleMap, o que por si quebrava o `memo` de `TokenEl` pra TODO token
     (prop "diferente" a cada comparação, mesmo sem mudança nenhuma). As
     dependências abaixo (`measure`/`fogMode`/`map`/`zoom`/`moveToken`/
     `upsertToken`) não mudam DURANTE um arraste — só quando o usuário troca
     de ferramenta/cenário/zoom de verdade — então o handler fica estável
     exatamente nos momentos em que importa (os commits throttled de
     `moveToken`, 22x/s). */
  const onTokenPointerDown = useCallback((e: React.PointerEvent, t: Token) => {
    if (measure || fogMode) return;
    e.stopPropagation();
    e.preventDefault();
    setSelId(t.id);
    setPanelOpen(false);

    const startX = e.clientX;
    const startY = e.clientY;
    const cell = map.cellSize;
    const cols = map.cols;
    const rows = map.rows;
    const size = t.size;
    const originX = t.x;
    const originY = t.y;
    let moved = false;
    let cur = { x: originX, y: originY };

    const clamp = (x: number, y: number) => ({
      x: Math.max(0, Math.min(cols - size, x)),
      y: Math.max(0, Math.min(rows - size, y)),
    });

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom / cell;
      const dy = (ev.clientY - startY) / zoom / cell;
      cur = clamp(originX + dx, originY + dy);
      moved = true;
      const el = tokenElsRef.current.get(t.id);
      if (el) {
        el.style.left = `${cur.x * cell}px`;
        el.style.top = `${cur.y * cell}px`;
      }
      const now = performance.now();
      if (now - lastSentRef.current > SEND_EVERY_MS) {
        lastSentRef.current = now;
        moveToken(t.id, cur.x, cur.y);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        // posição final via upsert: persiste no cache/BD além de sincronizar
        // — o re-render disparado por isso já traz left/top certinho de
        // volta (vindo de t.x/t.y), sem precisar "desfazer" a mutação direta.
        upsertToken({ ...t, x: Math.round(cur.x * 2) / 2, y: Math.round(cur.y * 2) / 2 });
      } else {
        // clique sem arrastar nenhum pixel = abre a ficha de verdade
        setPanelOpen(true);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, fogMode, map, zoom, moveToken, upsertToken]);

  // Ref-setter estável pro <div> de cada token em `tokenElsRef` — também
  // precisa ser estável (mesmo motivo do `onTokenPointerDown` acima) pra não
  // quebrar o `memo` de `TokenEl`.
  const registerTokenEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) tokenElsRef.current.set(id, el);
    else tokenElsRef.current.delete(id);
  }, []);

  /* -------- mover a câmera arrastando o fundo do mapa (botão esquerdo) --------
     Antes só dava pra reposicionar usando as barras de rolagem, o que é ruim
     de mirar; agora clicar e arrastar no vazio do mapa (não num token — o
     token já para a propagação em onTokenPointerDown) move a visão. Um clique
     sem arrastar continua desselecionando o token, igual antes. */
  const onStagePan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const scrollEl = mapScrollRef.current;
    if (!scrollEl) {
      setSelId(null);
      return;
    }
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = scrollEl.scrollLeft;
    const startScrollTop = scrollEl.scrollTop;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 3) {
        moved = true;
        setPanning(true);
      }
      if (moved) {
        scrollEl.scrollLeft = startScrollLeft - dx;
        scrollEl.scrollTop = startScrollTop - dy;
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPanning(false);
      if (!moved) setSelId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* -------- medição -------- */
  const onStagePointerDown = (e: React.PointerEvent) => {
    if (fogMode && me.isGM && map.fogKind !== 'lantern') {
      onFogPointerDown(e);
      return;
    }
    if (!measure) {
      onStagePan(e);
      return;
    }
    const start = clientToCell(e.clientX, e.clientY);
    setMeasureLine({ x1: start.cx, y1: start.cy, x2: start.cx, y2: start.cy });
    const onMove = (ev: PointerEvent) => {
      const p = clientToCell(ev.clientX, ev.clientY);
      setMeasureLine((l) => (l ? { ...l, x2: p.cx, y2: p.cy } : l));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMeasureLine(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* -------- fog of war (só mestre) -------- */
  const cellKey = (x: number, y: number) => `${x},${y}`;
  const onFogPointerDown = (e: React.PointerEvent) => {
    const start = clientToCell(e.clientX, e.clientY);
    const sx = Math.floor(start.cx);
    const sy = Math.floor(start.cy);
    const base = new Set(map.fogHidden ?? []);
    const paint: 'hide' | 'show' = base.has(cellKey(sx, sy)) ? 'show' : 'hide';
    const working = new Set(base);
    const applyCell = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return;
      const k = cellKey(x, y);
      if (paint === 'hide') working.add(k);
      else working.delete(k);
    };
    applyCell(sx, sy);
    setFogWorking(new Set(working));
    const onMove = (ev: PointerEvent) => {
      const p = clientToCell(ev.clientX, ev.clientY);
      applyCell(Math.floor(p.cx), Math.floor(p.cy));
      setFogWorking(new Set(working));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setFogWorking(null);
      updateMap({ fogHidden: [...working] });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  // Névoa modo "Lanterna" — ver MapState.fogKind em types.ts. Cálculo portado
  // do protótipo Godot (scenes/battle_map/FogLayer.cs, só leitura ali, usado
  // só como referência): direção do cone = rotação do token (0° = "pra
  // cima", mesmo sentido do `rotate()` CSS usado no sprite — cresce no
  // sentido horário); alcance = (tamanho do token / 2) * 6 células;
  // meio-ângulo do cone = 32°. A célula onde o próprio token está sempre
  // conta como iluminada (senão ele ficaria escuro embaixo de si mesmo).
  const LANTERN_HALF_ANGLE_DEG = 32;
  const lanternRangeCells = (t: Token) => (t.size / 2) * 6;
  const cellLitByToken = (cx: number, cy: number, t: Token) => {
    const centerX = t.x + t.size / 2;
    const centerY = t.y + t.size / 2;
    const dx = cx + 0.5 - centerX;
    const dy = cy + 0.5 - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > lanternRangeCells(t)) return false;
    if (dist <= t.size / 2 + 0.5) return true;
    const angleToCell = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0° = "pra cima"
    const diff = (((angleToCell - (t.rotation ?? 0) + 180) % 360) + 360) % 360 - 180;
    return Math.abs(diff) <= LANTERN_HALF_ANGLE_DEG;
  };
  const lanternTokens = useMemo(
    () => Object.values(tokens).filter((t) => t.lanternOn),
    [tokens],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cellLitByToken é recriada a cada render mas é pura (só lê os campos do token recebido)
  const lanternHidden = useMemo(() => {
    if (map.fogKind !== 'lantern') return null;
    const hidden = new Set<string>();
    for (let x = 0; x < map.cols; x++) {
      for (let y = 0; y < map.rows; y++) {
        if (!lanternTokens.some((t) => cellLitByToken(x, y, t))) hidden.add(cellKey(x, y));
      }
    }
    return hidden;
  }, [map.fogKind, map.cols, map.rows, lanternTokens]);

  const fogSet =
    map.fogKind === 'lantern' ? lanternHidden ?? new Set<string>() : fogWorking ?? new Set(map.fogHidden ?? []);
  const tokenHidden = (t: Token) => {
    if (fogSet.size === 0) return false;
    for (let dx = 0; dx < t.size; dx++) {
      for (let dy = 0; dy < t.size; dy++) {
        if (fogSet.has(cellKey(Math.floor(t.x) + dx, Math.floor(t.y) + dy))) return true;
      }
    }
    return false;
  };

  /* -------- tokens -------- */
  const addBlank = () => {
    const t: Token = {
      id: uid(),
      label: 'Token',
      color: randomColor(),
      x: Math.floor(map.cols / 2),
      y: Math.floor(map.rows / 2),
      size: 1,
      ownerId: me.id,
    };
    upsertToken(t);
    setSelId(t.id);
  };

  const addFromCharacter = (charId: string) => {
    const c = characters[charId];
    if (!c) return;
    const t: Token = {
      id: uid(),
      label: c.name,
      color: randomColor(c.id),
      image: c.image,
      x: Math.floor(map.cols / 2),
      y: Math.floor(map.rows / 2),
      size: 1,
      ownerId: me.id,
      characterId: c.id,
      hp: { current: c.pv.current, max: c.pv.max },
    };
    upsertToken(t);
    setSelId(t.id);
  };

  // Arrastar um token da biblioteca do mestre (aba Tokens, TokenLibraryManager)
  // e soltar aqui cria um token novo no ponto exato onde soltou. A imagem
  // vira data URL embutida (mesmo formato de sempre) — não fica dependendo
  // do arquivo continuar existindo na biblioteca depois.
  const onStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!me.isGM) return;
    const raw = e.dataTransfer.getData(TOKEN_DRAG_MIME);
    if (!raw) return;
    let payload: TokenDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const { cx, cy } = clientToCell(e.clientX, e.clientY);
    const size = 1;
    const x = Math.max(0, Math.min(map.cols - size, Math.round((cx - size / 2) * 2) / 2));
    const y = Math.max(0, Math.min(map.rows - size, Math.round((cy - size / 2) * 2) / 2));
    void urlToDownscaledDataURL(tokenAssetUrl(payload.id), 320).then((image) => {
      const t: Token = {
        id: uid(),
        label: payload.name,
        color: randomColor(),
        image: image || undefined,
        x,
        y,
        size,
        ownerId: me.id,
      };
      upsertToken(t);
      setSelId(t.id);
    });
  };

  const patchToken = (p: Partial<Token>) => {
    if (!selected) return;
    upsertToken({ ...selected, ...p });
  };

  // Tamanho de verdade em px do token na tela: usa o ajuste fino (`sizePx`)
  // se já foi mexido, senão cai no múltiplo de célula do seletor "Tamanho".
  const tokenPxSize = (t: Token) => t.sizePx ?? t.size * map.cellSize - 6;

  // Alterna pra próxima variante de imagem do token selecionado (ver
  // TokenSprite em types.ts) — cicla pela lista, voltando pro começo. Sem
  // efeito se o token não tem variante nenhuma registrada ainda.
  const cycleSprite = () => {
    if (!selected?.sprites?.length) return;
    const sprites = selected.sprites;
    const curIdx = sprites.findIndex((s) => s.id === selected.activeSpriteId);
    const next = sprites[(curIdx + 1) % sprites.length];
    patchToken({ image: next.image, activeSpriteId: next.id });
  };

  // Liga/desliga a lanterna do token selecionado (só importa visualmente
  // quando a Névoa está em modo "Lanterna", ver MapState.fogKind) — toque
  // único, igual cycleSprite acima.
  const toggleLantern = () => {
    if (!selected) return;
    patchToken({ lanternOn: !selected.lanternOn });
  };

  // Sempre aponta pro token selecionado MAIS RECENTE, sem precisar que o
  // loop de animação abaixo dependa dele (ver por quê no comentário do
  // useEffect principal) — lido a cada frame/evento, nunca fica obsoleto.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  // `persistNow` default false — achado numa varredura de performance: o
  // loop de giro/resize contínuo abaixo chama isso a cada ~45ms enquanto a
  // tecla fica segurada, e `upsertToken` grava a cena INTEIRA no
  // localStorage + dispara um PUT assíncrono pro banco (`persist()`/
  // `pushScenesToDb()`) a cada chamada — rodando em loop isso travava a UI
  // de verdade (igual ao bug já corrigido no arraste de token, que por isso
  // usa `moveToken`, sem persist, pros tiques intermediários). Os commits
  // PERIÓDICOS usam `patchTokenLive` (sem persist); só o commit FINAL, ao
  // soltar a tecla, passa `persistNow:true` pra gravar de verdade.
  const patchSelectedLive = (p: Partial<Token>, persistNow = false) => {
    const cur = selectedRef.current;
    if (!cur) return;
    const next = { ...cur, ...p };
    if (persistNow) upsertToken(next);
    else patchTokenLive(next);
  };

  // Atalhos de teclado pro token selecionado — teclas configuráveis (⚙
  // Configurações → Controles, ver lib/keybinds.ts), padrão ←/→ gira e
  // ↑/↓ redimensiona. Achado numa varredura de bugs (usuário: "quero que
  // ele gire mais fluido, está travado"): a versão antiga pulava um
  // ângulo FIXO a cada `keydown`, então segurar a tecla dependia do
  // repeat do sistema operacional (sempre com uma pausa inicial e um
  // ritmo irregular — nunca fica "fluido" de verdade). Agora é um loop de
  // animação (`requestAnimationFrame`) que gira/redimensiona de forma
  // CONTÍNUA enquanto a tecla está pressionada, à base de graus/px por
  // segundo. A posição "ao vivo" muta o DOM direto (mesmo padrão já usado
  // no arraste, `tokenElsRef`/`.tk-img`) — só o COMMIT pra store/rede fica
  // throttled em SEND_EVERY_MS, senão viraria o mesmo tipo de travamento
  // já corrigido no arraste (gravar o estado inteiro a cada frame).
  // R (padrão) alterna pra próxima variante de imagem, L (padrão) liga/
  // desliga a lanterna do token, Enter (padrão) abre a ficha — os três de
  // disparo único (toque), não contínuo.
  useEffect(() => {
    if (!selected) return;
    const heldCodes = new Set<string>();
    const ROTATE_DEG_PER_SEC = 240;
    const RESIZE_PX_PER_SEC = 160;
    let liveRotation = selected.rotation ?? 0;
    let liveSizePx = tokenPxSize(selected);
    let lastFrame = performance.now();
    let lastCommit = 0;

    // `setInterval`, não `requestAnimationFrame` — de propósito. rAF é
    // pausado pelo Chromium em janela oculta/minimizada/sem foco (achado
    // na hora de testar: numa janela `show:false` o giro simplesmente
    // parava depois do 1º tick), então um giro que depende dele também
    // travaria de verdade se a pessoa minimizar a janela no meio do jogo.
    // setInterval roda independente de composição visual — usa o tempo
    // decorrido de verdade (`dt`) a cada tique, então o RITMO continua
    // certo mesmo se o intervalo entre chamadas não for perfeitamente
    // regular.
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.1); // clamp: 2º plano não "pula"
      lastFrame = now;
      if (heldCodes.size === 0) return;
      let changed = false;
      if (heldCodes.has(keybinds['token-rotate-left'])) {
        liveRotation = (((liveRotation - ROTATE_DEG_PER_SEC * dt) % 360) + 360) % 360;
        changed = true;
      }
      if (heldCodes.has(keybinds['token-rotate-right'])) {
        liveRotation = (((liveRotation + ROTATE_DEG_PER_SEC * dt) % 360) + 360) % 360;
        changed = true;
      }
      if (heldCodes.has(keybinds['token-resize-up'])) {
        liveSizePx = Math.min(liveSizePx + RESIZE_PX_PER_SEC * dt, map.cellSize * 10);
        changed = true;
      }
      if (heldCodes.has(keybinds['token-resize-down'])) {
        liveSizePx = Math.max(liveSizePx - RESIZE_PX_PER_SEC * dt, 8);
        changed = true;
      }
      if (!changed) return;
      const cur = selectedRef.current;
      const el = cur ? tokenElsRef.current.get(cur.id) : null;
      if (el) {
        const img = el.querySelector<HTMLElement>('.tk-img');
        if (img) img.style.transform = `rotate(${liveRotation}deg)`;
        el.style.width = `${liveSizePx}px`;
        el.style.height = `${liveSizePx}px`;
      }
      if (now - lastCommit > SEND_EVERY_MS) {
        lastCommit = now;
        patchSelectedLive({ rotation: liveRotation, sizePx: liveSizePx });
      }
    };
    const intervalId = window.setInterval(tick, 16);

    const rotateResizeKeys = [
      keybinds['token-rotate-left'],
      keybinds['token-rotate-right'],
      keybinds['token-resize-up'],
      keybinds['token-resize-down'],
    ];
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (rotateResizeKeys.includes(e.code)) {
        e.preventDefault();
        heldCodes.add(e.code);
      } else if (e.code === keybinds['token-cycle-sprite']) {
        e.preventDefault();
        cycleSprite();
      } else if (e.code === keybinds['token-toggle-lantern']) {
        e.preventDefault();
        toggleLantern();
      } else if (e.code === keybinds['token-open-panel']) {
        e.preventDefault();
        setPanelOpen(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!heldCodes.delete(e.code)) return;
      // commit final na hora de soltar — não espera o próximo throttle, e
      // esse sim persiste de verdade (persistNow:true — ver patchSelectedLive)
      patchSelectedLive({ rotation: liveRotation, sizePx: liveSizePx }, true);
    };
    // solta tudo se a janela perder o foco com alguma tecla presa (alt-tab
    // no meio do giro, por exemplo) — senão o estado "preso" nunca solta.
    // Também persiste de verdade aqui (igual ao keyup) — sem isso, um
    // alt-tab no meio do giro deixava o último commit só na versão "leve"
    // (patchTokenLive, sem persist), podendo perder a rotação ao recarregar.
    const onBlur = () => {
      if (heldCodes.size > 0) patchSelectedLive({ rotation: liveRotation, sizePx: liveSizePx }, true);
      heldCodes.clear();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, keybinds]);

  const onPickTokenImage = async (file: File | undefined) => {
    if (!file || !selected) return;
    const url = await fileToDownscaledDataURL(file, 320);
    if (url) patchToken({ image: url });
  };

  // Adiciona uma variante nova à lista do token selecionado — se ele ainda
  // não tinha `sprites` registrado (token "clássico", só `image` solta),
  // promove a imagem atual pra "Padrão" primeiro, pra não perder ela da
  // lista. Compartilhado pelos dois jeitos de adicionar variante: escolher
  // um arquivo (addSprite) ou Shift+clique numa miniatura da biblioteca de
  // tokens (addVariantFromLibrary, ver TokenLibraryManager/TokenPanel).
  const pushSprite = (image: string, name: string) => {
    if (!selected) return;
    let sprites = selected.sprites ?? [];
    if (sprites.length === 0 && selected.image) {
      sprites = [{ id: uid(), name: 'Padrão', image: selected.image }];
    }
    const sprite: TokenSprite = { id: uid(), name: name.trim() || 'Sem nome', image };
    sprites = [...sprites, sprite];
    patchToken({ sprites, image: sprite.image, activeSpriteId: sprite.id });
  };

  const addSprite = async (file: File | undefined) => {
    if (!file || !selected) return;
    const url = await fileToDownscaledDataURL(file, 320);
    if (!url) return;
    const name = await askText('Nome dessa variante (ex.: "Com espada"):');
    if (name === null) return;
    pushSprite(url, name);
  };

  // Shift+clique numa miniatura da biblioteca de tokens, com um token já
  // selecionado no mapa, adiciona a imagem como VARIANTE dele em vez de criar
  // um token novo — mesma decisão tomada no protótipo Godot. Sem token
  // selecionado, o clique não faz nada (o jeito normal de usar a biblioteca
  // continua sendo arrastar pro mapa).
  const addVariantFromAsset = async (asset: { id: string; name: string }) => {
    if (!selected) return;
    const url = await urlToDownscaledDataURL(tokenAssetUrl(asset.id), 320);
    if (!url) return;
    pushSprite(url, asset.name);
  };

  const selectSprite = (sprite: TokenSprite) => {
    if (!selected) return;
    patchToken({ image: sprite.image, activeSpriteId: sprite.id });
  };

  const renameSprite = async (sprite: TokenSprite) => {
    if (!selected) return;
    const name = await askText('Nome da variante:', sprite.name);
    if (!name?.trim() || name === sprite.name) return;
    const sprites = (selected.sprites ?? []).map((s) => (s.id === sprite.id ? { ...s, name: name.trim() } : s));
    patchToken({ sprites });
  };

  const removeSprite = (sprite: TokenSprite) => {
    if (!selected) return;
    const sprites = (selected.sprites ?? []).filter((s) => s.id !== sprite.id);
    const patch: Partial<Token> = { sprites };
    // se removeu a variante que tava ativa, cai pra primeira que sobrou (ou
    // tira a imagem de vez se não sobrou nenhuma)
    if (selected.activeSpriteId === sprite.id) {
      patch.image = sprites[0]?.image;
      patch.activeSpriteId = sprites[0]?.id;
    }
    patchToken(patch);
  };

  const onPickBackground = async (file: File | undefined) => {
    if (!file) return;
    const url = await fileToDownscaledDataURL(file, 2400);
    if (url) updateMap({ background: url });
  };

  /* -------- zoom com Ctrl + scroll -------- */
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, +(z - Math.sign(e.deltaY) * 0.1).toFixed(2))));
  };

  const measureDist = measureLine
    ? Math.hypot(measureLine.x2 - measureLine.x1, measureLine.y2 - measureLine.y1)
    : 0;

  return (
    <>
      {/* HUD do cenário ativo — leve, não é uma janela flutuante (mesma ideia
          do "scene pill" do mockup aprovado). Gestão de cenário (trocar,
          +cenário, renomear, excluir) mora na janela "Mestre", só mestre. */}
      <div className="map-hud-badge">
        {!me.isGM && (
          <span className="live-badge" title="Você está vendo o mapa do mestre ao vivo">
            <span className="live-dot" /> AO VIVO
          </span>
        )}
        <span className="map-hud-scene">{scene.name}</span>
      </div>

      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onPickBackground(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={tokenInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onPickTokenImage(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {selected && panelOpen && (
        <div className="token-editor">
          <div className="row">
            <input value={selected.label} onChange={(e) => patchToken({ label: e.target.value })} />
            <input
              type="color"
              value={selected.color}
              style={{ flex: 'none', width: 38, padding: 2 }}
              onChange={(e) => patchToken({ color: e.target.value })}
            />
          </div>
          <p className="faint" style={{ fontSize: 11, margin: '6px 0 0' }}>
            Atalhos do token funcionam mesmo com a ficha fechada — configure em ⚙ Configurações
            → Controles.
          </p>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Tamanho</label>
              <select
                value={selected.size}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchToken({ size: n, sizePx: n * map.cellSize - 6 });
                }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}
                  </option>
                ))}
              </select>
              {selected.sizePx != null && selected.sizePx !== selected.size * map.cellSize - 6 && (
                <button
                  className="small ghost"
                  style={{ marginTop: 4 }}
                  title="Volta pro tamanho padrão dessa célula"
                  onClick={() => patchToken({ sizePx: undefined })}
                >
                  resetar tamanho
                </button>
              )}
            </div>
            <div>
              <label>PV atual</label>
              <input
                type="number"
                value={selected.hp?.current ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: {
                      current: Number(e.target.value),
                      max: selected.hp?.max ?? Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label>PV máx</label>
              <input
                type="number"
                value={selected.hp?.max ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: {
                      current: selected.hp?.current ?? Number(e.target.value),
                      max: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Dono / quem controla</label>
              <select
                value={selected.ownerId}
                onChange={(e) => patchToken({ ownerId: e.target.value })}
              >
                <option value="">— ninguém (livre) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.isGM ? ' (Mestre)' : ''}
                  </option>
                ))}
                {!users.some((u) => u.id === selected.ownerId) && selected.ownerId && (
                  <option value={selected.ownerId}>{selected.ownerId} (desconectado)</option>
                )}
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => tokenInputRef.current?.click()}>
              🖼 Importar imagem
            </button>
            {selected.image && (
              <button className="small ghost" onClick={() => patchToken({ image: undefined })}>
                tirar imagem
              </button>
            )}
          </div>
          {selected.image && (
            <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
              <label style={{ flex: 'none' }}>Virar pra</label>
              <button
                className="small"
                title="Girar pra esquerda"
                onClick={() =>
                  patchToken({ rotation: (((selected.rotation ?? 0) - 15) % 360 + 360) % 360 })
                }
              >
                ↺ Esquerda
              </button>
              <button
                className="small"
                title="Girar pra direita"
                onClick={() =>
                  patchToken({ rotation: (((selected.rotation ?? 0) + 15) % 360 + 360) % 360 })
                }
              >
                ↻ Direita
              </button>
              {(selected.rotation ?? 0) !== 0 && (
                <button className="small ghost" onClick={() => patchToken({ rotation: 0 })}>
                  resetar
                </button>
              )}
            </div>
          )}
          <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
            <label style={{ flex: 'none' }}>Lanterna</label>
            <button
              className={'small ' + (selected.lanternOn ? 'primary' : '')}
              title={`Tecla ${keyLabel(keybinds['token-toggle-lantern'])} liga/desliga — só importa com a Névoa em modo Lanterna`}
              onClick={toggleLantern}
            >
              {selected.lanternOn ? '💡 Ligada' : 'Desligada'}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Variantes de imagem</label>
            {selected.sprites && selected.sprites.length > 0 && (
              <p className="faint" style={{ fontSize: 11, margin: '0 0 4px' }}>
                Tecla <b>{keyLabel(keybinds['token-cycle-sprite'])}</b> alterna rápido pra próxima.
              </p>
            )}
            <div className="token-sprite-list">
              {(selected.sprites ?? []).map((s) => (
                <div
                  key={s.id}
                  className={'token-sprite-chip' + (selected.activeSpriteId === s.id ? ' on' : '')}
                  title={s.name}
                  onClick={() => selectSprite(s)}
                >
                  <span className="token-sprite-thumb" style={{ backgroundImage: `url(${s.image})` }} />
                  <span className="token-sprite-name">{s.name}</span>
                  <button
                    className="token-sprite-x"
                    title="Renomear"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameSprite(s);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="token-sprite-x"
                    title="Excluir"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSprite(s);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="small ghost" onClick={() => spriteInputRef.current?.click()}>
                + variante
              </button>
            </div>
            <input
              ref={spriteInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void addSprite(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => setPanelOpen(false)}>
              Fechar
            </button>
            <button
              className="small ghost"
              onClick={() => {
                deleteToken(selected.id);
                setSelId(null);
                setPanelOpen(false);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      )}

      <div className={'map-scroll' + (panning ? ' panning' : '')} ref={mapScrollRef} onWheel={onWheel}>
        <div
          className="grid-stage"
          ref={stageRef}
          style={{ width: W, height: H, transform: `scale(${zoom})` }}
          onPointerDown={onStagePointerDown}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onStageDrop}
        >
          {map.background && (
            <div className="grid-bg" style={{ backgroundImage: `url(${map.background})` }} />
          )}

          {[...objects2d]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((o) => (
              <div
                key={o.id}
                className="map-object2d"
                style={{
                  left: o.x * map.cellSize,
                  top: o.y * map.cellSize,
                  width: o.width * map.cellSize,
                  height: o.height * map.cellSize,
                  transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
                  backgroundImage: `url(${o.imageUrl})`,
                  backgroundSize:
                    o.mode === 'tile'
                      ? `${map.cellSize * (o.repeat || 1)}px ${map.cellSize * (o.repeat || 1)}px`
                      : '100% 100%',
                  backgroundRepeat: o.mode === 'tile' ? 'repeat' : 'no-repeat',
                }}
              />
            ))}

          {map.showGrid && (
            <div
              className="grid-lines"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px),' +
                  'linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px)',
                backgroundSize: `${map.cellSize}px ${map.cellSize}px`,
              }}
            />
          )}

          {[...fogSet].map((k) => {
            const [fx, fy] = k.split(',').map(Number);
            return (
              <div
                key={`fog-${k}`}
                className={'fog-tile ' + (me.isGM ? 'fog-gm' : 'fog-player')}
                style={{
                  left: fx * map.cellSize,
                  top: fy * map.cellSize,
                  width: map.cellSize,
                  height: map.cellSize,
                }}
              />
            );
          })}

          {Object.values(tokens)
            .filter((t) => me.isGM || !tokenHidden(t))
            .map((t) => (
              <TokenEl
                key={t.id}
                t={t}
                selected={selId === t.id}
                cellSize={map.cellSize}
                onPointerDown={onTokenPointerDown}
                registerEl={registerTokenEl}
              />
            ))}

          {measureLine && (
            <>
              <div
                className="measure-line"
                style={{
                  left: measureLine.x1 * map.cellSize,
                  top: measureLine.y1 * map.cellSize,
                  width:
                    Math.hypot(
                      measureLine.x2 - measureLine.x1,
                      measureLine.y2 - measureLine.y1,
                    ) * map.cellSize,
                  transform: `rotate(${Math.atan2(
                    measureLine.y2 - measureLine.y1,
                    measureLine.x2 - measureLine.x1,
                  )}rad)`,
                }}
              />
              <div
                className="measure-label"
                style={{
                  left: measureLine.x2 * map.cellSize + 6,
                  top: measureLine.y2 * map.cellSize - 6,
                }}
              >
                {measureDist.toFixed(1)} q · {(measureDist * map.metersPerCell).toFixed(1)} m
              </div>
            </>
          )}
        </div>
      </div>

      {showMapPicker && (
        <MapPickerDialog
          onClose={() => setShowMapPicker(false)}
          onBlank={() => {
            addScene();
            setShowMapPicker(false);
          }}
          onPick={(dataUrl) => {
            addScene();
            if (dataUrl) updateMap({ background: dataUrl });
            setShowMapPicker(false);
          }}
          onAdd3d={() => {
            setShowMapPicker(false);
            setShowPlacePicker(true);
          }}
        />
      )}

      {showPlacePicker && (
        <PlacePickerDialog
          onClose={() => setShowPlacePicker(false)}
          onBlank={() => {
            addScene3d(null);
            setShowPlacePicker(false);
          }}
          onPick={(place) => {
            addScene3d(place);
            setShowPlacePicker(false);
          }}
        />
      )}

      {/* ===================================================== */}
      {/* Botões/janelas flutuantes — casca visual nova do mapa 2D */}
      {/* (toolbar antiga vivia toda aqui, ver histórico do arquivo) */}
      {/* ===================================================== */}
      <div className="battle-floating-layer" ref={floatingLayerRef}>
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Ficha"
          icon={<FichaFloatIcon />}
          active={fichaOpen}
          onActivate={() => setFichaOpen((o) => !o)}
          topFrac={0.08}
          rightFrac={0.04}
        />
        {me.isGM && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Mestre"
            icon={<MestreFloatIcon />}
            active={mestreOpen}
            onActivate={() => setMestreOpen((o) => !o)}
            topFrac={0.19}
            rightFrac={0.04}
          />
        )}
        {me.isGM && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Tokens"
            icon={<TokensFloatIcon />}
            active={tokensOpen}
            onActivate={() => setTokensOpen((o) => !o)}
            topFrac={0.3}
            rightFrac={0.04}
          />
        )}
        {me.isGM && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Mapas"
            icon={<MapasFloatIcon />}
            active={mapasOpen}
            onActivate={() => setMapasOpen((o) => !o)}
            topFrac={0.41}
            rightFrac={0.04}
          />
        )}
        {!me.isGM && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Mapa"
            icon={<ViewFloatIcon />}
            active={viewOpen}
            onActivate={() => setViewOpen((o) => !o)}
            topFrac={0.19}
            rightFrac={0.04}
          />
        )}
        {/* Botões "universais" (Dados/Histórico/Músicas/Perfis) — ver
            comentário do estado `dadosOpen` acima; disponíveis pra
            mestre e jogador (Perfis só pra mestre), igual eram as abas
            equivalentes no painel lateral antigo (Room.tsx). */}
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Dados"
          icon={<DadosFloatIcon />}
          active={dadosOpen}
          onActivate={() => setDadosOpen((o) => !o)}
          topFrac={me.isGM ? 0.52 : 0.3}
          rightFrac={0.04}
        />
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Histórico"
          icon={<HistoricoFloatIcon />}
          active={historicoOpen}
          onActivate={() => setHistoricoOpen((o) => !o)}
          topFrac={me.isGM ? 0.63 : 0.41}
          rightFrac={0.04}
        />
        {hasLan && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Músicas"
            icon={<MusicasFloatIcon />}
            active={musicasOpen}
            onActivate={() => setMusicasOpen((o) => !o)}
            topFrac={me.isGM ? 0.74 : 0.52}
            rightFrac={0.04}
          />
        )}
        {me.isGM && (
          <FloatingButton
            containerRef={floatingLayerRef}
            label="Perfis"
            icon={<PerfisFloatIcon />}
            active={perfisOpen}
            onActivate={() => setPerfisOpen((o) => !o)}
            topFrac={0.85}
            rightFrac={0.04}
          />
        )}

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Ficha"
          open={fichaOpen}
          onClose={() => setFichaOpen(false)}
          leftFrac={0.5}
          topFrac={0.06}
          defaultWidth={420}
          defaultHeight={560}
        >
          {me.isGM ? (
            <GmCharacterTabs
              openIds={gmFichaTabs}
              activeId={activeGmFichaTab}
              onOpen={openGmFichaTab}
              onClose={closeGmFichaTab}
              onSelect={setActiveGmFichaTab}
              floatingPicker
            />
          ) : (
            <CharacterPanel />
          )}
        </FloatingWindow>

        {/* Fichas abertas pelo mestre (GmCharacterTabs acima, "Abrir ficha")
            — cada uma é sua PRÓPRIA FloatingWindow, IRMÃ da janela "Ficha"
            (não aninhada dentro dela, senão ficaria posicionada/recortada
            relativa à janelinha pequena em vez da mesa inteira). O
            `<CharacterSheet>` recebe `characters[id]` direto da store
            (useTableStore acima), por isso reflete em tempo real qualquer
            mudança vinda do celular (/ficha/:id, ver server/fichaMobile.js)
            sem precisar fechar/reabrir a janela — e vice-versa. */}
        {me.isGM &&
          gmFichaTabs.map((id, i) => {
            const c = characters[id];
            if (!c) return null;
            return (
              <FloatingWindow
                key={id}
                containerRef={floatingLayerRef}
                title={c.name}
                open
                onClose={() => closeGmFichaTab(id)}
                leftFrac={0.08 + (i % 4) * 0.1}
                topFrac={0.1 + (i % 3) * 0.1}
                defaultWidth={380}
                defaultHeight={480}
              >
                <CharacterSheet character={c} />
              </FloatingWindow>
            );
          })}

        {me.isGM && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Mestre"
            open={mestreOpen}
            onClose={() => setMestreOpen(false)}
            leftFrac={0.62}
            topFrac={0.06}
            defaultWidth={300}
            defaultHeight={460}
          >
            <div className="floating-row">
              <span className="floating-row-label">Grid</span>
              <button
                className={'small ' + (map.showGrid ? 'primary' : '')}
                onClick={() => updateMap({ showGrid: !map.showGrid })}
              >
                {map.showGrid ? 'Ligado' : 'Desligado'}
              </button>
            </div>

            <div className="floating-row">
              <span className="floating-row-label">Zoom</span>
              <div className="floating-row" style={{ gap: 4 }}>
                <button className="small" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}>
                  −
                </button>
                <button className="small" onClick={() => setZoom(1)} title="Ctrl + scroll no mapa também dá zoom">
                  {Math.round(zoom * 100)}%
                </button>
                <button className="small" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
                  +
                </button>
              </div>
            </div>

            <div className="floating-row">
              <span className="floating-row-label">Medir</span>
              <button
                className={'small ' + (measure ? 'primary' : '')}
                onClick={() => {
                  setMeasure((m) => !m);
                  setMeasureLine(null);
                  setFogMode(false);
                  setSelId(null);
                }}
              >
                {measure ? 'Ativo' : 'Ativar'}
              </button>
            </div>

            <div className="floating-sub">
              <div className="floating-row">
                <span className="floating-row-label">Névoa</span>
                <div className="floating-row" style={{ gap: 4 }}>
                  <button
                    className={'small ' + (map.fogKind !== 'lantern' ? 'primary' : '')}
                    title="Pintura manual — esconde/revela célula a célula"
                    onClick={() => updateMap({ fogKind: 'paint' })}
                  >
                    Padrão
                  </button>
                  <button
                    className={'small ' + (map.fogKind === 'lantern' ? 'primary' : '')}
                    title="Área escura por padrão — cada token com a lanterna ligada revela um cone na frente dele"
                    onClick={() => {
                      updateMap({ fogKind: 'lantern' });
                      setFogMode(false);
                    }}
                  >
                    Lanterna
                  </button>
                </div>
              </div>

              {map.fogKind !== 'lantern' ? (
                <>
                  <div className="floating-row">
                    <span className="floating-row-label" />
                    <button
                      className={'small ' + (fogMode ? 'primary' : '')}
                      title="Clique/arraste no mapa pra esconder ou revelar células dos jogadores"
                      onClick={() => {
                        setFogMode((f) => !f);
                        setMeasure(false);
                        setSelId(null);
                      }}
                    >
                      {fogMode ? 'Ativa' : 'Ativar'}
                    </button>
                  </div>
                  {fogMode && (
                    <div className="floating-row">
                      <button className="small" onClick={() => updateMap({ fogHidden: [] })}>
                        revelar tudo
                      </button>
                      <button
                        className="small"
                        onClick={() => {
                          const all: string[] = [];
                          for (let x = 0; x < map.cols; x++)
                            for (let y = 0; y < map.rows; y++) all.push(cellKey(x, y));
                          updateMap({ fogHidden: all });
                        }}
                      >
                        cobrir tudo
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="faint" style={{ fontSize: 11, margin: '4px 0' }}>
                    Tudo escuro por padrão. Selecione um token no mapa e aperte{' '}
                    <b>{keyLabel(keybinds['token-toggle-lantern'])}</b> (ou use a lista abaixo) pra
                    ligar a lanterna dele — revela um cone na direção que ele está virado
                    (tamanho do token = mais alcance).
                  </p>
                  <div className="floating-row wrap">
                    {Object.values(tokens).length === 0 && (
                      <span className="faint" style={{ fontSize: 11 }}>
                        Nenhum token no mapa ainda.
                      </span>
                    )}
                    {Object.values(tokens).map((t) => (
                      <button
                        key={t.id}
                        className={'small ' + (t.lanternOn ? 'primary' : 'ghost')}
                        onClick={() => upsertToken({ ...t, lanternOn: !t.lanternOn })}
                      >
                        {t.lanternOn ? '💡' : '·'} {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="floating-divider" />

            <div className="floating-row">
              <span className="floating-row-label">Fundo</span>
              <div className="floating-row" style={{ gap: 4 }}>
                <button className="small" onClick={() => bgInputRef.current?.click()}>
                  🖼 Importar
                </button>
                {map.background && (
                  <button className="small ghost" onClick={() => updateMap({ background: undefined })}>
                    limpar
                  </button>
                )}
              </div>
            </div>

            <div className="floating-sub">
              <span className="floating-row-label">Grade</span>
              <div className="row" style={{ marginTop: 8 }}>
                <div>
                  <label>Colunas</label>
                  <input
                    type="number"
                    value={map.cols}
                    onChange={(e) => updateMap({ cols: Math.max(5, Number(e.target.value)) })}
                  />
                </div>
                <div>
                  <label>Linhas</label>
                  <input
                    type="number"
                    value={map.rows}
                    onChange={(e) => updateMap({ rows: Math.max(5, Number(e.target.value)) })}
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: 6 }}>
                <label>Tamanho da célula (px)</label>
                <input
                  type="number"
                  value={map.cellSize}
                  onChange={(e) => updateMap({ cellSize: Math.max(20, Number(e.target.value)) })}
                />
              </div>
              <div className="field">
                <label>Metros por célula</label>
                <input
                  type="number"
                  step={0.5}
                  value={map.metersPerCell}
                  onChange={(e) => updateMap({ metersPerCell: Number(e.target.value) })}
                />
              </div>
            </div>
          </FloatingWindow>
        )}

        {me.isGM && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Tokens"
            open={tokensOpen}
            onClose={() => setTokensOpen(false)}
            leftFrac={0.62}
            topFrac={0.5}
            defaultWidth={320}
            defaultHeight={380}
          >
            <div className="floating-row wrap">
              <button className="small" onClick={addBlank}>
                ＋ Token em branco
              </button>
              {Object.keys(characters).length > 0 && (
                <select
                  className="small"
                  style={{ flex: 1, minWidth: 130, padding: '4px 6px' }}
                  value=""
                  onChange={(e) => e.target.value && addFromCharacter(e.target.value)}
                >
                  <option value="">＋ do personagem…</option>
                  {Object.values(characters).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="faint" style={{ fontSize: 11, margin: 0 }}>
              Arraste um token daqui pra dentro do mapa pra colocar.
              {selected && (
                <>
                  {' '}
                  Com o token <b>{selected.label}</b> selecionado, Shift+clique numa miniatura
                  adiciona ela como variante dele.
                </>
              )}
            </p>
            <TokenLibraryManager onShiftClickAsset={selected ? addVariantFromAsset : undefined} />
          </FloatingWindow>
        )}

        {me.isGM && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Mapas"
            open={mapasOpen}
            onClose={() => setMapasOpen(false)}
            leftFrac={0.34}
            topFrac={0.5}
            defaultWidth={320}
            defaultHeight={420}
          >
            {/* Cenário (trocar/+/renomear/excluir) morava na janela "Mestre"
                — pedido do usuário: faz mais sentido junto da gestão de
                mapas. Reorganização simples, lógica igual a antes. */}
            <div className="floating-sub">
              <span className="floating-row-label">Cenário</span>
              <div className="floating-row wrap" style={{ marginTop: 8 }}>
                <select
                  className="small"
                  style={{ flex: 1, minWidth: 110, padding: '4px 6px' }}
                  value={activeSceneId}
                  onChange={(e) => switchScene(e.target.value)}
                >
                  {scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
                <button className="small" title="Novo cenário" onClick={() => setShowMapPicker(true)}>
                  ＋
                </button>
                <button
                  className="small"
                  title="Renomear cenário"
                  onClick={async () => {
                    const n = await askText('Nome do cenário:', scene.name);
                    if (n !== null) renameScene(scene.id, n.trim() || scene.name);
                  }}
                >
                  ✎
                </button>
                <button
                  className="small"
                  title="Excluir cenário"
                  disabled={scenes.length <= 1}
                  onClick={() => {
                    if (confirm(`Excluir o cenário "${scene.name}" e seus tokens?`)) deleteScene(scene.id);
                  }}
                >
                  🗑
                </button>
              </div>
            </div>

            <div className="floating-divider" />

            <Map2DLibraryManager />
          </FloatingWindow>
        )}

        {!me.isGM && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Mapa"
            open={viewOpen}
            onClose={() => setViewOpen(false)}
            leftFrac={0.62}
            topFrac={0.22}
            defaultWidth={260}
            defaultHeight={280}
          >
            <div className="floating-row">
              <span className="floating-row-label">Zoom</span>
              <div className="floating-row" style={{ gap: 4 }}>
                <button className="small" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}>
                  −
                </button>
                <button className="small" onClick={() => setZoom(1)} title="Ctrl + scroll no mapa também dá zoom">
                  {Math.round(zoom * 100)}%
                </button>
                <button className="small" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}>
                  +
                </button>
              </div>
            </div>
            <div className="floating-row">
              <span className="floating-row-label">Medir</span>
              <button
                className={'small ' + (measure ? 'primary' : '')}
                onClick={() => {
                  setMeasure((m) => !m);
                  setMeasureLine(null);
                  setFogMode(false);
                  setSelId(null);
                }}
              >
                {measure ? 'Ativo' : 'Ativar'}
              </button>
            </div>
            <div className="floating-divider" />
            <div className="floating-row wrap">
              <button className="small" onClick={addBlank}>
                ＋ Token
              </button>
              {Object.keys(characters).length > 0 && (
                <select
                  className="small"
                  style={{ flex: 1, minWidth: 110, padding: '4px 6px' }}
                  value=""
                  onChange={(e) => e.target.value && addFromCharacter(e.target.value)}
                >
                  <option value="">＋ do personagem…</option>
                  {Object.values(characters).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </FloatingWindow>
        )}

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Dados"
          open={dadosOpen}
          onClose={() => setDadosOpen(false)}
          leftFrac={0.5}
          topFrac={0.3}
          defaultWidth={300}
          defaultHeight={420}
        >
          <DiceRoller />
        </FloatingWindow>

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Histórico"
          open={historicoOpen}
          onClose={() => setHistoricoOpen(false)}
          leftFrac={0.62}
          topFrac={0.1}
          defaultWidth={300}
          defaultHeight={420}
        >
          <RollLog />
        </FloatingWindow>

        {hasLan && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Músicas"
            open={musicasOpen}
            onClose={() => setMusicasOpen(false)}
            leftFrac={0.34}
            topFrac={0.1}
            defaultWidth={320}
            defaultHeight={460}
          >
            <MusicAndAmbientPanel />
          </FloatingWindow>
        )}

        {me.isGM && (
          <FloatingWindow
            containerRef={floatingLayerRef}
            title="Perfis"
            open={perfisOpen}
            onClose={() => setPerfisOpen(false)}
            leftFrac={0.46}
            topFrac={0.3}
            defaultWidth={320}
            defaultHeight={420}
          >
            <PlayerProfilesPanel />
          </FloatingWindow>
        )}
      </div>
    </>
  );
}
