import type { OrdemTestResult, ExpressionResult } from './domain/dice';

// type (nao interface) de proposito: precisa ser aceito onde o supabase-js
// espera `{ [key: string]: any }` (presence / track).
export type PresenceUser = {
  id: string;
  name: string;
  color: string;
  isGM: boolean;
};

export interface RollLogEntry {
  id: string;
  at: number;
  authorId: string;
  authorName: string;
  authorColor: string;
  label: string; // ex.: "Percepção (PRE)" ou "Dano"
  result: OrdemTestResult | ExpressionResult;
  private?: boolean; // rolagem so do mestre (nao implementado no v1, reservado)
}

// Notificação de "subiu de NEX" — o que o personagem ganhou/pode escolher agora.
export interface NotifyEntry {
  id: string;
  at: number;
  charId: string;
  charName: string;
  ownerId: string; // dono do personagem — quem vê o toast (+ o mestre, sempre)
  fromNex: number;
  toNex: number;
  lines: string[];
}

// Variante de imagem de um token (pedido do usuário: "sem nada segurando
// arma, e pra lá vai" — um personagem com vários estados visuais: sem arma,
// com arma, ferido etc.). `image` do Token continua sendo a imagem ATUAL
// exibida — trocar de variante só atualiza esse campo, então todo lugar que
// já lê `token.image` (BattleMap.tsx, Battle3D.tsx) continua igual, sem
// precisar saber que sprites existem.
export interface TokenSprite {
  id: string;
  name: string;
  image: string;
}

export interface Token {
  id: string;
  label: string;
  color: string;
  image?: string;
  shape?: 'circle' | 'free'; // legado — tokens com imagem sempre renderizam sem recorte agora
  rotation?: number; // graus (0-359) — gira só a imagem, pra simular virar de lado
  x: number; // coordenada em celulas (pode ser fracionaria durante o arraste)
  y: number;
  size: number; // 1 = 1x1, 2 = 2x2 ... (múltiplo de célula, escolhido no seletor "Tamanho")
  sizePx?: number; // ajuste fino em px por cima de `size` (atalho ↑/↓, pixel a pixel)
  ownerId: string; // quem controla o token — pode ser reatribuído a qualquer momento
  characterId?: string;
  hp?: { current: number; max: number };
  // só usado na mesa 3D (Battle3D.tsx) — ajuste fino de altura acima (+) ou
  // abaixo (-) do chão, em metros, pra corrigir imagem com margem
  // transparente embaixo do desenho (senão o token "flutua").
  elevation?: number;
  // variantes de imagem (opcional — ausente/vazio = token "clássico" de uma
  // imagem só, igual sempre foi). `activeSpriteId` diz qual item de
  // `sprites` corresponde à `image` atual, pra tecla de atalho saber pra
  // qual vem a seguir ao ciclar.
  sprites?: TokenSprite[];
  activeSpriteId?: string;
}

// Peça solta plantada num mapa 2D (móvel, parede, decoração, textura de
// chão) — pedido do usuário: montar o mapa a partir de assets em vez de só
// uma imagem de fundo única. `imageUrl` vem EMBUTIDA (data URL), mesmo
// padrão de `PlaceObject` no 3D: o mapa fica autocontido, apagar o asset
// da biblioteca depois não quebra mapas que já usam ele. `x`/`y` em
// CÉLULAS, fracionário — mesmo sistema já usado por `Token.x/y`, assim o
// objeto acompanha o mapa corretamente se `cellSize` mudar. `mode:'tile'`
// é pra peças grandes de textura de chão que devem repetir em vez de
// esticar (mesma ideia de `GroundConfig` no 3D) — sem isso é `'stretch'`.
export interface MapObject2D {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // graus
  zIndex: number;
  mode?: 'stretch' | 'tile';
  repeat?: number; // junto com mode:'tile'
  locked?: boolean; // trava arraste sem querer (útil com o mapa cheio de peças)
}

export interface MapState {
  cols: number;
  rows: number;
  cellSize: number; // px
  background?: string; // url da imagem de fundo
  showGrid: boolean;
  metersPerCell: number; // Ordem usa 1,5 m por quadrado
  fogHidden?: string[]; // fog of war: chaves "x,y" das células escondidas dos jogadores
  // peças de cenário 2D plantadas no mapa (ver MapObject2D) — opcional,
  // ausente/vazio = mapa "clássico" de só uma imagem de fundo, zero
  // regressão em mesas salvas antes desse campo existir.
  objects2d?: MapObject2D[];
}

export const DEFAULT_MAP: MapState = {
  cols: 30,
  rows: 20,
  cellSize: 48,
  background: undefined,
  showGrid: true,
  metersPerCell: 1.5,
  fogHidden: [],
};

// Chão-base de um cenário 3D (só usado quando Scene.kind==='3d') — "stretch"
// espicha a imagem inteira sem repetir, "tile" repete lado a lado `repeat`
// vezes. Mesmos tipos usados pela biblioteca de "places" da Área do Mestre
// (lib/placeLibrary.ts) — uma mesa 3D nasce de uma place escolhida, mas o
// cenário na mesa é uma cópia independente (mesma lógica de "embutir, não
// referenciar" já usada pra fundo de mapa/token).
export type GroundMode = 'stretch' | 'tile';

export interface GroundConfig {
  imageUrl: string;
  mode: GroundMode;
  repeat: number;
}

// Relevo procedural do chão 3D — opcional, `null`/ausente = chão liso (igual
// sempre foi). `amplitude` = altura máxima das colinas (m), `scale` = "quão
// larga/suave" cada colina é (maior = mais suave), `seed` fixa o desenho do
// relevo (sorteado uma vez ao ligar, pra não mudar sozinho a cada render).
// Ver `terrainHeight` em lib/scene3d.tsx.
export interface TerrainConfig {
  amplitude: number;
  scale: number;
  seed: number;
}

// Variações do céu procedural (drei `<Sky>`) — só importa quando `sky:true`;
// ausente nesse caso é tratado como 'dia' (mesmo visual de antes desse campo
// existir, zero regressão em cenário salvo).
export type SkyPreset = 'dia' | 'entardecer' | 'noite' | 'nublado';

// três tipos de objeto de cenário num cenário 3D:
// - "standing": imagem em pé, billboard que sempre encara a câmera (árvore, poste)
// - "patch": imagem deitada no chão, decalque livre (posição/tamanho/rotação) —
//   usado pra sobrepor um caminho, uma mancha de textura diferente etc.
// - "model": modelo 3D de verdade (.glb) importado e plantado na cena
export type PlaceObject =
  | {
      id: string;
      kind: 'standing';
      imageUrl: string;
      x: number;
      z: number;
      height: number;
      // ajuste fino de altura acima (+) ou abaixo (-) do chão, em metros —
      // corrige imagens com margem transparente embaixo do desenho (a árvore/
      // personagem não ocupa a imagem até a borda), que senão "flutuam".
      // Opcional pra não quebrar objetos salvos antes desse campo existir
      // (`?? 0` em todo lugar que lê).
      elevation?: number;
      anchored: boolean;
    }
  | {
      id: string;
      kind: 'patch';
      imageUrl: string;
      x: number;
      z: number;
      width: number;
      depth: number;
      rotationY: number;
      anchored: boolean;
    }
  | {
      id: string;
      kind: 'model';
      modelUrl: string;
      // qual parser usar pra ler modelUrl — .glb já vem embutido de sempre
      // (geometria+textura+material tudo num arquivo só); .fbx só embute
      // textura se foi exportado assim (senão aparece sem textura); .stl não
      // tem cor/textura nenhuma (formato só de geometria, vira cinza liso).
      format: 'glb' | 'fbx' | 'stl';
      x: number;
      z: number;
      scale: number;
      rotationY: number;
      anchored: boolean;
    };

export type SceneKind = '2d' | '3d';

// Um cenário = um mapa próprio (2D) OU chão+objetos (3D) + seus tokens. A sala
// tem vários; o mestre alterna. `map` e `ground`/`objects3d` convivem sempre
// no tipo (mais simples que campos opcionais espalhados por todo canto) mas só
// o par relevante ao `kind` é de fato usado/renderizado.
export interface Scene {
  id: string;
  name: string;
  kind: SceneKind;
  map: MapState;
  ground: GroundConfig | null;
  // lado do plano de chão 3D em metros — opcional, default 40 (ver
  // `GroundPlane` em lib/scene3d.tsx) pra não quebrar cenários salvos antes
  // desse campo existir. Pedido do usuário: place enorme pra caber uma
  // cidade/mapa grande.
  groundSize?: number;
  // relevo (colinas) no chão 3D — opcional, ausente/`null` = chão liso.
  terrain?: TerrainConfig | null;
  // mostra um céu procedural (drei `<Sky>`) em vez do fundo preto sólido
  // padrão — pedido do usuário ("fundo não fica preto, sólido e feio").
  sky?: boolean;
  // qual variação do céu (ver SkyPreset) — só importa quando sky:true.
  skyPreset?: SkyPreset;
  objects3d: PlaceObject[];
  tokens: Record<string, Token>;
}

// Biblioteca de música: arquivos ficam no servidor local do mestre (fora do
// save.json da mesa — é da instalação, igual a biblioteca de fichas), servidos
// via HTTP (`/music/:id`) e geridos via `lib/musicLibrary.ts` (`/api/music/*`).
export interface MusicFolder {
  id: string;
  name: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  ext: string;
  folderId: string | null;
  addedAt: number;
}

// Sons ambiente (porta abrindo, trovão etc.) — área separada da música,
// pedido do usuário. Mesma ideia de biblioteca (servidor local do mestre,
// `lib/ambientLibrary.ts`/`/api/ambient/*`), mas o jeito de tocar é
// diferente: em vez de "uma faixa tocando agora" (estado persistente, com
// posição/loop), é soundboard — cada clique dispara o som UMA VEZ pra mesa
// toda, por cima do que mais estiver tocando (ver `ambientCue` em
// useTableStore.ts). Reaproveita `AssetFolder` (abaixo) pras pastas.
export interface AmbientClip {
  id: string;
  name: string;
  ext: string;
  folderId: string | null;
  addedAt: number;
}

// Biblioteca de tokens e de mapas — mesma ideia da de música (arquivos no
// servidor local do mestre, fora do save.json da mesa, servidos via HTTP e
// geridos via lib/tokenLibrary.ts e lib/mapLibrary.ts), pra importar uma vez
// na Área do Mestre (menu principal) e ter pronto pra qualquer mesa futura.
export interface AssetFolder {
  id: string;
  name: string;
}

export interface TokenAsset {
  id: string;
  name: string;
  ext: string;
  folderId: string | null;
  addedAt: number;
}

// `kind` marca se o mapa é pra mesa 2D ou 3D — são mesas separadas (não um
// modo de exibição da mesma cena), então um mapa importado serve só uma
// delas. Hoje isso é só uma etiqueta organizacional: a mesa 3D em si ainda
// não existe.
export type MapAssetKind = '2d' | '3d';

export interface MapAsset {
  id: string;
  name: string;
  ext: string;
  folderId: string | null;
  addedAt: number;
  kind: MapAssetKind;
}

// Biblioteca de peças de cenário 2D (móveis, paredes, texturas de chão) —
// de onde o mestre escolhe o que plantar no mapa (ver MapObject2D acima);
// servida via `lib/sceneryLibrary.ts`/`/api/scenery/*`. Pastas da
// biblioteca (`AssetFolder`) funcionam como categorias (Cadeiras,
// Paredes...), preenchidas automaticamente ao importar uma pasta do PC.
export interface SceneryAsset {
  id: string;
  name: string;
  ext: string;
  folderId: string | null;
  addedAt: number;
}

// Estado de reprodução da mesa — sincronizado via RoomEvent `music:state`,
// controlado só pelo mestre. `positionAtStart` + `startedAt` (Date.now() de
// quando começou a tocar dali) deixam qualquer cliente calcular o ponto atual
// sem precisar de um "tique" constante pela rede.
export interface MusicState {
  trackId: string | null;
  playing: boolean;
  startedAt: number;
  positionAtStart: number;
  loop: boolean; // true = repete a mesma faixa; false = avança pra próxima da pasta ao terminar
}

export const DEFAULT_MUSIC_STATE: MusicState = {
  trackId: null,
  playing: false,
  startedAt: 0,
  positionAtStart: 0,
  loop: true,
};

export function makeScene(name: string, kind: SceneKind = '2d'): Scene {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    kind,
    map: { ...DEFAULT_MAP },
    ground: null,
    objects3d: [],
    tokens: {},
  };
}
