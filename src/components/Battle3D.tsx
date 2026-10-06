import { Suspense, memo, useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type React from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { activeScene, useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { randomColor, uid } from '../lib/ids';
import { fileToDataURL, fileToDownscaledDataURL, fileToStandingDataURL, urlToDownscaledDataURL } from '../lib/image';
import { askText } from '../state/promptDialog';
import { TOKEN_DRAG_MIME, tokenAssetUrl, type TokenDragPayload } from '../lib/tokenLibrary';
import {
  FlyCamera,
  GroundPlane,
  MODEL_FILE_ACCEPT,
  SceneObject,
  SceneSky,
  groundPointFromPointer,
  modelFormatFromFileName,
  terrainHeight,
  useGroundDrag,
} from '../lib/scene3d';
import type { Camera3D } from '../lib/realtime';
import { PlacePickerDialog } from './PlacePickerDialog';
import { MapPickerDialog } from './MapPickerDialog';
import type { PlaceObject, SkyPreset, TerrainConfig, Token, TokenSprite } from '../types';

// Mesa 3D de verdade (Fase 3): mesmas abas/mecânicas da mesa 2D (dados,
// fichas, tokens, música — tudo isso continua em Room.tsx, fora daqui) — só o
// mapa muda de grade 2D pra cenário 3D. O mestre tem câmera livre (OrbitControls)
// e edita chão/objetos/tokens; a câmera dele é transmitida pros jogadores
// (evento `camera3d:update`), que só assistem — sem OrbitControls, sem
// arrastar nada, exatamente como pedido: "os players só iam poder assistir o
// mestre mexendo na mesa". Componentes de chão/objeto vêm de lib/scene3d.tsx
// (compartilhados com o editor de place, Prototype3D.tsx).

const SEND_EVERY_MS = 60;

function CameraBroadcaster({
  controlsRef,
  cameraMode,
  setCamera3d,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  // no modo voo não existe `target` de verdade (sem pivô) — sintetiza um
  // ponto à frente da câmera só pra dar pro jogador algo coerente de olhar
  // (`CameraFollower`, embaixo, só usa isso via `camera.lookAt`).
  cameraMode: 'orbit' | 'fly';
  setCamera3d: (position: [number, number, number], target: [number, number, number]) => void;
}) {
  const { camera } = useThree();
  const lastSent = useRef(0);
  const lastPos = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  useFrame(() => {
    const now = performance.now();
    if (now - lastSent.current < SEND_EVERY_MS) return;
    if (camera.position.distanceTo(lastPos.current) < 0.01) return;
    let t: THREE.Vector3;
    if (cameraMode === 'orbit') {
      const controls = controlsRef.current;
      if (!controls) return;
      t = controls.target;
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      t = camera.position.clone().addScaledVector(dir, 5);
    }
    lastSent.current = now;
    lastPos.current.copy(camera.position);
    setCamera3d([camera.position.x, camera.position.y, camera.position.z], [t.x, t.y, t.z]);
  });
  return null;
}

// Só pra quem assiste: sem OrbitControls, a câmera é 100% ditada pelo que
// chega em `camera3d` — interpola suavemente pra não "pular" a cada tique
// (a rede manda a posição a cada ~60ms, não a cada frame).
function CameraFollower({ camera3d }: { camera3d: Camera3D | null }) {
  const { camera } = useThree();
  const curTarget = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!camera3d) return;
    camera.position.lerp(
      new THREE.Vector3(camera3d.position[0], camera3d.position[1], camera3d.position[2]),
      0.18,
    );
    curTarget.current.lerp(
      new THREE.Vector3(camera3d.target[0], camera3d.target[1], camera3d.target[2]),
      0.18,
    );
    camera.lookAt(curTarget.current);
  });
  return null;
}

// Achado numa varredura de performance: `camera3d` era lido direto dentro do
// `Battle3D()` principal — pra quem assiste (jogador), a rede atualiza esse
// valor ~16x/segundo (ver SEND_EVERY_MS em CameraBroadcaster), e CADA
// atualização re-executava o componente INTEIRO (toolbar, HUD, listas de
// token/objeto), não só a câmera. Isolando a assinatura do Zustand aqui
// dentro, só esse componente-folha (que não renderiza nada de verdade, só
// alimenta o `useFrame` de CameraFollower) re-executa a cada tique.
function CameraFollowerSync() {
  const camera3d = useTableStore((s) => s.camera3d);
  return <CameraFollower camera3d={camera3d} />;
}

function TokenHtmlLabel({ token, y }: { token: Token; y: number }) {
  const hp = token.hp;
  return (
    <Html position={[0, y, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
      <div className="tk3d-label">
        {token.label}
        {hp && hp.max > 0 && (
          <span className="tk3d-hp">
            <span
              style={{
                width: `${Math.max(0, Math.min(100, (hp.current / hp.max) * 100))}%`,
                background: hp.current / hp.max < 0.3 ? 'var(--blood)' : 'var(--green)',
              }}
            />
          </span>
        )}
      </div>
    </Html>
  );
}

type TokenProps = {
  token: Token;
  selected: boolean;
  editable: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onDragEnd: (id: string, x: number, z: number) => void;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  terrain?: TerrainConfig | null;
};

// Token com imagem — mesmo truque de billboard (só gira no eixo Y) usado nos
// objetos de cenário: fica sempre de frente pra câmera sem tombar.
function TokenImage3D({ token, selected, editable, onSelect, onMove, onDragEnd, controlsRef, terrain }: TokenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const texture = useLoader(THREE.TextureLoader, token.image as string);
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const size = token.size || 1;
  const height = 1.5 * size;
  const width = height * aspect;
  const elevation = token.elevation ?? 0;
  useFrame(() => {
    if (!meshRef.current) return;
    const dx = camera.position.x - token.x;
    const dz = camera.position.z - token.y;
    meshRef.current.rotation.y = Math.atan2(dx, dz);
  });
  const onPointerDown = useGroundDrag(token.id, !editable, onSelect, onMove, controlsRef, onDragEnd, {
    ref: meshRef,
    computeY: (x, z) => height / 2 + elevation + terrainHeight(x, z, terrain),
  });
  return (
    <mesh
      ref={meshRef}
      position={[token.x, height / 2 + elevation + terrainHeight(token.x, token.y, terrain), token.y]}
      onPointerDown={onPointerDown}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} alphaTest={0.3} />
      <TokenHtmlLabel token={token} y={height / 2 + 0.35} />
      {selected && (
        <mesh position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.4, width * 0.5, 24]} />
          <meshBasicMaterial color="#2fae66" />
        </mesh>
      )}
    </mesh>
  );
}

// Token sem imagem — uma "peça" cilíndrica na cor do token, mesma ideia de
// miniatura de mesa.
function TokenPlain3D({ token, selected, editable, onSelect, onMove, onDragEnd, controlsRef, terrain }: TokenProps) {
  const size = token.size || 1;
  const height = 1.3 * size;
  const radius = 0.4 * size;
  const elevation = token.elevation ?? 0;
  const groupRef = useRef<THREE.Group>(null);
  const onPointerDown = useGroundDrag(token.id, !editable, onSelect, onMove, controlsRef, onDragEnd, {
    ref: groupRef,
    computeY: (x, z) => elevation + terrainHeight(x, z, terrain),
  });
  return (
    <group ref={groupRef} position={[token.x, elevation + terrainHeight(token.x, token.y, terrain), token.y]}>
      <mesh position={[0, height / 2, 0]} onPointerDown={onPointerDown}>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial color={token.color} />
      </mesh>
      <TokenHtmlLabel token={token} y={height + 0.35} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[radius * 1.3, radius * 1.6, 24]} />
          <meshBasicMaterial color="#2fae66" />
        </mesh>
      )}
    </group>
  );
}

// `memo` (mesmo motivo de `SceneObject` em lib/scene3d.tsx — ver comentário
// lá) — token só re-renderiza quando as próprias props mudam de verdade,
// não a cada pointermove de QUALQUER arraste na cena.
const Token3D = memo(function Token3D(props: TokenProps) {
  return props.token.image ? <TokenImage3D {...props} /> : <TokenPlain3D {...props} />;
});

export function Battle3D() {
  const { me } = useIdentity();
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const characters = useTableStore((s) => s.characters);
  const users = useTableStore((s) => s.users);
  const upsertToken = useTableStore((s) => s.upsertToken);
  const moveToken = useTableStore((s) => s.moveToken);
  const deleteToken = useTableStore((s) => s.deleteToken);
  const updatePlace3d = useTableStore((s) => s.updatePlace3d);
  const moveObject3dLive = useTableStore((s) => s.moveObject3dLive);
  const setCamera3d = useTableStore((s) => s.setCamera3d);
  const addScene3d = useTableStore((s) => s.addScene3d);
  const addScene = useTableStore((s) => s.addScene);
  const updateMap = useTableStore((s) => s.updateMap);
  const renameScene = useTableStore((s) => s.renameScene);
  const deleteScene = useTableStore((s) => s.deleteScene);
  const switchScene = useTableStore((s) => s.switchScene);

  const isGM = me.isGM;
  const scene = activeScene({ scenes, activeSceneId });
  const ground = scene.ground;
  const objects = scene.objects3d;
  const tokens = scene.tokens;

  const [selKind, setSelKind] = useState<'token' | 'object' | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camRef = useRef<THREE.Camera | null>(null);
  const domRef = useRef<HTMLElement | null>(null);

  // Câmera "voo livre" estilo modo criativo do Minecraft (pedido do
  // usuário) — tecla 1 alterna com a câmera de órbita padrão. Só o mestre
  // tem controle de câmera nessa mesa (jogador é view-only, `CameraFollower`
  // mais abaixo), então isso só existe no branch do mestre.
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fly'>('orbit');
  // ponto que o OrbitControls usa de pivô ao REMONTAR (voo→órbita) — sem
  // isso ele voltaria pra (0,0,0) e o próximo arraste giraria estranho.
  const pendingOrbitTarget = useRef(new THREE.Vector3(0, 0, 0));
  const toggleCameraMode = () => {
    setCameraMode((m) => {
      if (m === 'fly' && camRef.current) {
        const dir = new THREE.Vector3();
        camRef.current.getWorldDirection(dir);
        pendingOrbitTarget.current.copy(camRef.current.position).addScaledVector(dir, 5);
      }
      return m === 'orbit' ? 'fly' : 'orbit';
    });
  };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Digit1') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      toggleCameraMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lastObjSent = useRef(0);
  const lastTokenSent = useRef(0);
  const objectInputRef = useRef<HTMLInputElement>(null);
  const patchInputRef = useRef<HTMLInputElement>(null);
  const groundInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const tokenImgInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);

  const selectedObj = selKind === 'object' ? objects.find((o) => o.id === selId) ?? null : null;
  const selectedToken = selKind === 'token' ? (selId ? tokens[selId] : null) : null;

  // troca de cenário: o que estava selecionado pode nem existir no novo cenário
  useEffect(() => {
    setSelKind(null);
    setSelId(null);
  }, [activeSceneId]);

  const randPos = () => ({ x: +(Math.random() * 4 - 2).toFixed(2), z: +(Math.random() * 4 - 2).toFixed(2) });

  /* -------- edição de cenário (só mestre) -------- */
  const addStanding = async (file: File) => {
    const url = await fileToStandingDataURL(file, 512);
    if (!url) return;
    const obj: PlaceObject = { id: uid(), kind: 'standing', imageUrl: url, ...randPos(), height: 2, elevation: 0, anchored: false };
    updatePlace3d({ objects3d: [...objects, obj] });
    setSelKind('object');
    setSelId(obj.id);
  };
  const addPatch = async (file: File) => {
    const url = await fileToDownscaledDataURL(file, 512);
    if (!url) return;
    const obj: PlaceObject = {
      id: uid(),
      kind: 'patch',
      imageUrl: url,
      ...randPos(),
      width: 3,
      depth: 3,
      rotationY: 0,
      anchored: false,
    };
    updatePlace3d({ objects3d: [...objects, obj] });
    setSelKind('object');
    setSelId(obj.id);
  };
  const addModel = async (file: File) => {
    const url = await fileToDataURL(file);
    if (!url) return;
    const obj: PlaceObject = {
      id: uid(),
      kind: 'model',
      modelUrl: url,
      format: modelFormatFromFileName(file.name),
      ...randPos(),
      scale: 1,
      rotationY: 0,
      anchored: false,
    };
    updatePlace3d({ objects3d: [...objects, obj] });
    setSelKind('object');
    setSelId(obj.id);
  };
  const importGroundImage = async (file: File) => {
    const url = await fileToDownscaledDataURL(file, 1024);
    if (!url) return;
    updatePlace3d({ ground: { imageUrl: url, mode: ground?.mode ?? 'tile', repeat: ground?.repeat ?? 6 } });
  };
  const setGroundMode = (mode: 'stretch' | 'tile') => {
    if (ground) updatePlace3d({ ground: { ...ground, mode } });
  };
  const setGroundRepeat = (repeat: number) => {
    if (ground) updatePlace3d({ ground: { ...ground, repeat: Math.max(1, repeat) } });
  };
  const removeGround = () => updatePlace3d({ ground: null });
  // pedido do usuário: place grande o suficiente pra caber uma cidade/mapa
  // grande — antes o chão era sempre 40x40 fixo.
  const setGroundSize = (size: number) => updatePlace3d({ groundSize: Math.max(10, size) });
  const toggleSky = (on: boolean) => updatePlace3d({ sky: on, skyPreset: on ? (scene.skyPreset ?? 'dia') : scene.skyPreset });
  const setSkyPreset = (preset: SkyPreset) => updatePlace3d({ sky: true, skyPreset: preset });
  // pedido do usuário: relevo (colinas) no chão 3D — liga com valores
  // razoáveis de início (seed sorteada uma vez), desliga voltando o chão liso.
  const toggleTerrain = (on: boolean) =>
    updatePlace3d({ terrain: on ? { amplitude: 2, scale: 12, seed: Math.floor(Math.random() * 1e9) } : null });
  const setTerrainAmplitude = (amplitude: number) => {
    if (scene.terrain) updatePlace3d({ terrain: { ...scene.terrain, amplitude } });
  };
  const setTerrainScale = (scale: number) => {
    if (scene.terrain) updatePlace3d({ terrain: { ...scene.terrain, scale: Math.max(1, scale) } });
  };

  const updateObjPatch = (patch: Record<string, unknown>) => {
    if (!selectedObj) return;
    updatePlace3d({ objects3d: objects.map((o) => (o.id === selectedObj.id ? ({ ...o, ...patch } as PlaceObject) : o)) });
  };
  const toggleAnchor = (id: string) => {
    updatePlace3d({ objects3d: objects.map((o) => (o.id === id ? { ...o, anchored: !o.anchored } : o)) });
  };
  const removeObject = (id: string) => {
    updatePlace3d({ objects3d: objects.filter((o) => o.id !== id) });
    setSelKind(null);
    setSelId(null);
  };

  // `useCallback` (pedido do usuário: "mini lags ao mover tokens no 3D") —
  // sem isso, esses handlers eram uma função NOVA a cada render de
  // Battle3D, o que por si só já quebrava o `memo` de `SceneObject`/
  // `Token3D` (props "diferentes" a cada comparação, mesmo com o mesmo
  // comportamento) — a otimização dos componentes memoizados só funciona
  // de verdade se os callbacks que eles recebem também forem estáveis.
  //
  // A posição VISUAL do item sendo arrastado já é aplicada direto no objeto
  // three.js (ver `live`/`computeY` em `useGroundDrag`, lib/scene3d.tsx) —
  // esses handlers só cuidam do COMMIT throttlado pra store/rede, sem
  // `setState` nenhum na maioria das chamadas (só o commit em si causa
  // re-render, a cada `SEND_EVERY_MS`, não a cada pointermove). Isso é o que
  // resolve de vez o "ainda trava ao mover token" — antes, mesmo com os
  // objetos memoizados, o PRÓPRIO `Battle3D` (toolbar grande e tudo) ainda
  // re-renderizava a cada pixel de mouse movido.
  const moveObjectLive = useCallback(
    (id: string, x: number, z: number) => {
      const now = performance.now();
      if (now - lastObjSent.current > SEND_EVERY_MS) {
        lastObjSent.current = now;
        // Leve (sem persist/DB) — ver comentário em moveObject3dLive,
        // useTableStore.ts. O commit de verdade é no onDragEnd, abaixo.
        moveObject3dLive(id, x, z);
      }
    },
    [moveObject3dLive],
  );
  const onObjectDragEnd = useCallback(
    (id: string, x: number, z: number) => {
      updatePlace3d({ objects3d: objects.map((o) => (o.id === id ? { ...o, x, z } : o)) });
    },
    [objects, updatePlace3d],
  );

  /* -------- tokens -------- */
  const addBlankToken = () => {
    const t: Token = { id: uid(), label: 'Token', color: randomColor(), x: 0, y: 0, size: 1, ownerId: me.id };
    upsertToken(t);
    setSelKind('token');
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
      x: 0,
      y: 0,
      size: 1,
      ownerId: me.id,
      characterId: c.id,
      hp: { current: c.pv.current, max: c.pv.max },
    };
    upsertToken(t);
    setSelKind('token');
    setSelId(t.id);
  };
  const patchToken = (p: Partial<Token>) => {
    if (!selectedToken) return;
    upsertToken({ ...selectedToken, ...p });
  };
  const onPickTokenImage = async (file: File | undefined) => {
    if (!file || !selectedToken) return;
    const url = await fileToStandingDataURL(file, 320);
    if (url) patchToken({ image: url });
  };

  // Variantes de imagem do token (mesmo pedido/motivo de BattleMap.tsx — ver
  // comentário grande lá: `image` continua sendo a atual, `sprites` é a
  // lista de opções, trocar só atualiza `image`/`activeSpriteId`).
  const addSprite = async (file: File | undefined) => {
    if (!file || !selectedToken) return;
    const url = await fileToStandingDataURL(file, 320);
    if (!url) return;
    const name = await askText('Nome dessa variante (ex.: "Com espada"):');
    if (name === null) return;
    let sprites = selectedToken.sprites ?? [];
    if (sprites.length === 0 && selectedToken.image) {
      sprites = [{ id: uid(), name: 'Padrão', image: selectedToken.image }];
    }
    const sprite: TokenSprite = { id: uid(), name: name.trim() || 'Sem nome', image: url };
    sprites = [...sprites, sprite];
    patchToken({ sprites, image: sprite.image, activeSpriteId: sprite.id });
  };
  const selectSprite = (sprite: TokenSprite) => patchToken({ image: sprite.image, activeSpriteId: sprite.id });
  const renameSprite = async (sprite: TokenSprite) => {
    if (!selectedToken) return;
    const name = await askText('Nome da variante:', sprite.name);
    if (!name?.trim() || name === sprite.name) return;
    const sprites = (selectedToken.sprites ?? []).map((s) => (s.id === sprite.id ? { ...s, name: name.trim() } : s));
    patchToken({ sprites });
  };
  const removeSprite = (sprite: TokenSprite) => {
    if (!selectedToken) return;
    const sprites = (selectedToken.sprites ?? []).filter((s) => s.id !== sprite.id);
    const patch: Partial<Token> = { sprites };
    if (selectedToken.activeSpriteId === sprite.id) {
      patch.image = sprites[0]?.image;
      patch.activeSpriteId = sprites[0]?.id;
    }
    patchToken(patch);
  };
  const cycleSprite = () => {
    if (!selectedToken?.sprites?.length) return;
    const sprites = selectedToken.sprites;
    const curIdx = sprites.findIndex((s) => s.id === selectedToken.activeSpriteId);
    const next = sprites[(curIdx + 1) % sprites.length];
    patchToken({ image: next.image, activeSpriteId: next.id });
  };
  // atalho de teclado: V alterna pra próxima variante do token selecionado
  // (objeto ou token — mesma tecla, mas aqui só reage quando tem TOKEN
  // selecionado, já que só token tem sprites).
  useEffect(() => {
    if (!selectedToken) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      cycleSprite();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken]);

  const moveTokenLive = useCallback(
    (id: string, x: number, z: number) => {
      const now = performance.now();
      if (now - lastTokenSent.current > SEND_EVERY_MS) {
        lastTokenSent.current = now;
        moveToken(id, x, z);
      }
    },
    [moveToken],
  );
  const onTokenDragEnd = useCallback(
    (id: string, x: number, z: number) => {
      const t = tokens[id];
      if (t) upsertToken({ ...t, x: Math.round(x * 20) / 20, y: Math.round(z * 20) / 20 });
    },
    [tokens, upsertToken],
  );

  // arrastar um token da biblioteca do mestre (aba Tokens) e soltar aqui —
  // mesma ideia do onStageDrop da mesa 2D, só que o ponto de soltura vira uma
  // posição no plano do chão em vez de uma célula de grade.
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isGM) return;
    const raw = e.dataTransfer.getData(TOKEN_DRAG_MIME);
    if (!raw || !camRef.current || !domRef.current) return;
    let payload: TokenDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const p = groundPointFromPointer(e.clientX, e.clientY, camRef.current, domRef.current);
    if (!p) return;
    void urlToDownscaledDataURL(tokenAssetUrl(payload.id), 320).then((image) => {
      const t: Token = {
        id: uid(),
        label: payload.name,
        color: randomColor(),
        image: image || undefined,
        x: +p.x.toFixed(2),
        y: +p.z.toFixed(2),
        size: 1,
        ownerId: me.id,
      };
      upsertToken(t);
      setSelKind('token');
      setSelId(t.id);
    });
  };

  const resetCamera = () => {
    // no modo voo o FlyCamera reescreve a rotação da câmera todo frame a
    // partir do próprio yaw/pitch interno — mexer na câmera por fora não
    // "pega" (ele sobrescreve de volta no frame seguinte). Mais simples e
    // previsível: sai do voo primeiro (o pivô já reseta pra origem junto).
    if (cameraMode === 'fly') {
      pendingOrbitTarget.current.set(0, 0, 0);
      setCameraMode('orbit');
      return;
    }
    const controls = controlsRef.current;
    if (!controls) return;
    controls.object.position.set(6, 5, 6);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  // handlers de seleção estáveis — antes eram um `(id) => {...}` NOVO por
  // ITEM a cada render dentro de `renderObjects`/`renderTokens`, o que
  // sozinho já quebrava o `memo` de todo mundo (ver comentário grande lá
  // em cima, perto de `moveObjectLive`).
  const selectObject = useCallback((id: string) => {
    setSelKind('object');
    setSelId(id);
  }, []);
  const selectToken = useCallback((id: string) => {
    setSelKind('token');
    setSelId(id);
  }, []);

  const renderObjects = () =>
    objects.map((o) => (
      <SceneObject
        key={o.id}
        obj={o}
        selected={selKind === 'object' && selId === o.id}
        onSelect={selectObject}
        onMove={moveObjectLive}
        controlsRef={controlsRef}
        onDragEnd={onObjectDragEnd}
        terrain={scene.terrain}
      />
    ));

  const renderTokens = (editable: boolean) =>
    Object.values(tokens).map((t) => (
      <Token3D
        key={t.id}
        token={t}
        selected={selKind === 'token' && selId === t.id}
        editable={editable}
        onSelect={selectToken}
        onMove={moveTokenLive}
        onDragEnd={onTokenDragEnd}
        controlsRef={controlsRef}
        terrain={scene.terrain}
      />
    ));

  if (!isGM) {
    // jogador: só assiste — sem OrbitControls, câmera 100% ditada pelo que o
    // mestre transmite; nenhuma interação com a cena (per pedido: só mexem em
    // ficha/dados, a mesa em si é só o mestre quem controla).
    return (
      <>
        <div className="map-toolbar">
          <span className="live-badge" title="Você está vendo a mesa 3D do mestre ao vivo">
            <span className="live-dot" /> AO VIVO · {scene.name}
          </span>
        </div>
        <div className="battle3d-canvas">
          <Canvas camera={{ position: [6, 5, 6], fov: 50 }}>
            <SceneSky sky={scene.sky} preset={scene.skyPreset} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 3]} intensity={1} />
            <Suspense fallback={null}>
              <GroundPlane ground={ground} size={scene.groundSize ?? 40} terrain={scene.terrain} />
              {renderObjects()}
              {renderTokens(false)}
            </Suspense>
            <CameraFollowerSync />
          </Canvas>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="map-toolbar">
        <select
          className="small"
          style={{ width: 120, padding: '4px 6px' }}
          value={activeSceneId}
          onChange={(e) => switchScene(e.target.value)}
        >
          {scenes.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
        <button className="small" title="Novo cenário" onClick={() => setShowPlacePicker(true)}>
          ＋ cenário
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
        <span className="toolbar-sep" />
        <button className="small" title="Volta a câmera pro enquadramento padrão" onClick={resetCamera}>
          📷 Câmera
        </button>
        <button
          className={'small' + (cameraMode === 'fly' ? ' primary' : '')}
          title="Alterna entre câmera de órbita e voo livre (WASD + Space/Shift + mouse travado, estilo modo criativo) — atalho: tecla 1"
          onClick={toggleCameraMode}
        >
          {cameraMode === 'fly' ? '🕊️ Voo (1)' : '🎥 Órbita (1)'}
        </button>
        <span className="toolbar-sep" />
        <button className="small" onClick={addBlankToken}>
          ＋ Token
        </button>
        {Object.keys(characters).length > 0 && (
          <select
            className="small"
            style={{ width: 130, padding: '4px 6px' }}
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
        <span className="toolbar-sep" />
        <details style={{ position: 'relative' }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '4px 6px' }}>🏔️ Cenário</summary>
          <div className="map-cfg" style={{ width: 230 }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Chão
            </div>
            {!ground && (
              <p className="faint" style={{ fontSize: 11 }}>
                Sem chão ainda.
              </p>
            )}
            {ground && (
              <>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    className={'small' + (ground.mode === 'stretch' ? ' primary' : '')}
                    onClick={() => setGroundMode('stretch')}
                  >
                    Esticar
                  </button>
                  <button
                    className={'small' + (ground.mode === 'tile' ? ' primary' : '')}
                    onClick={() => setGroundMode('tile')}
                  >
                    Repetir
                  </button>
                </div>
                {ground.mode === 'tile' && (
                  <div className="field">
                    <label>Vezes que repete</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={ground.repeat}
                      onChange={(e) => setGroundRepeat(Number(e.target.value))}
                    />
                  </div>
                )}
              </>
            )}
            <div className="field" style={{ marginTop: 8 }}>
              <label>Tamanho do chão (m)</label>
              <input
                type="number"
                min={10}
                step={10}
                value={scene.groundSize ?? 40}
                onChange={(e) => setGroundSize(Number(e.target.value))}
              />
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Céu</label>
              <select
                value={scene.sky ? (scene.skyPreset ?? 'dia') : ''}
                onChange={(e) => (e.target.value ? setSkyPreset(e.target.value as SkyPreset) : toggleSky(false))}
              >
                <option value="">Sem céu (fundo preto)</option>
                <option value="dia">☀️ Dia</option>
                <option value="entardecer">🌇 Entardecer</option>
                <option value="noite">🌙 Noite</option>
                <option value="nublado">☁️ Nublado</option>
              </select>
            </div>
            <label className="row" style={{ marginTop: 8, gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!scene.terrain} onChange={(e) => toggleTerrain(e.target.checked)} />
              🏔️ Relevo (colinas no chão)
            </label>
            {scene.terrain && (
              <>
                <div className="field" style={{ marginTop: 6 }}>
                  <label>Altura do relevo (m)</label>
                  <input
                    type="number"
                    min={0.2}
                    step={0.2}
                    value={scene.terrain.amplitude}
                    onChange={(e) => setTerrainAmplitude(Number(e.target.value))}
                  />
                </div>
                <div className="field" style={{ marginTop: 6 }}>
                  <label>Suavidade das colinas (m)</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={scene.terrain.scale}
                    onChange={(e) => setTerrainScale(Number(e.target.value))}
                  />
                </div>
              </>
            )}
            <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
              <button className="small" onClick={() => groundInputRef.current?.click()}>
                🛣️ Chão
              </button>
              <button className="small" onClick={() => objectInputRef.current?.click()}>
                🌳 Objeto
              </button>
              <button className="small" onClick={() => patchInputRef.current?.click()}>
                🟫 Decalque
              </button>
              <button
                className="small"
                title="Aceita .glb (recomendado), .fbx ou .stl (sem cor)"
                onClick={() => modelInputRef.current?.click()}
              >
                🧊 Modelo
              </button>
            </div>
            {ground && (
              <button className="small ghost" style={{ marginTop: 6 }} onClick={removeGround}>
                Remover chão
              </button>
            )}
          </div>
        </details>
        <input
          ref={objectInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addStanding(f);
            e.target.value = '';
          }}
        />
        <input
          ref={patchInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addPatch(f);
            e.target.value = '';
          }}
        />
        <input
          ref={groundInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importGroundImage(f);
            e.target.value = '';
          }}
        />
        <input
          ref={modelInputRef}
          type="file"
          accept={MODEL_FILE_ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addModel(f);
            e.target.value = '';
          }}
        />
        <input
          ref={tokenImgInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void onPickTokenImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {selectedToken && (
        <div className="token-editor">
          <div className="row">
            <input value={selectedToken.label} onChange={(e) => patchToken({ label: e.target.value })} />
            <input
              type="color"
              value={selectedToken.color}
              style={{ flex: 'none', width: 38, padding: 2 }}
              onChange={(e) => patchToken({ color: e.target.value })}
            />
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Tamanho</label>
              <select value={selectedToken.size} onChange={(e) => patchToken({ size: Number(e.target.value) })}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>PV atual</label>
              <input
                type="number"
                value={selectedToken.hp?.current ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: { current: Number(e.target.value), max: selectedToken.hp?.max ?? Number(e.target.value) },
                  })
                }
              />
            </div>
            <div>
              <label>PV máx</label>
              <input
                type="number"
                value={selectedToken.hp?.max ?? 0}
                onChange={(e) =>
                  patchToken({
                    hp: { current: selectedToken.hp?.current ?? Number(e.target.value), max: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 6 }}>
            <label>Elevação (m)</label>
            <input
              type="number"
              step={0.05}
              value={selectedToken.elevation ?? 0}
              onChange={(e) => patchToken({ elevation: Number(e.target.value) })}
            />
            <p className="faint" style={{ fontSize: 11, margin: '4px 0 0' }}>
              Ajusta pra cima (+) ou baixo (−) — corrige token flutuando por causa de margem
              transparente na imagem.
            </p>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <div>
              <label>Dono / quem controla</label>
              <select value={selectedToken.ownerId} onChange={(e) => patchToken({ ownerId: e.target.value })}>
                <option value="">— ninguém (livre) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.isGM ? ' (Mestre)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <button className="small" onClick={() => tokenImgInputRef.current?.click()}>
              🖼 Importar imagem
            </button>
            {selectedToken.image && (
              <button className="small ghost" onClick={() => patchToken({ image: undefined })}>
                tirar imagem
              </button>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Variantes de imagem</label>
            {selectedToken.sprites && selectedToken.sprites.length > 0 && (
              <p className="faint" style={{ fontSize: 11, margin: '0 0 4px' }}>
                Tecla <b>V</b> alterna rápido pra próxima.
              </p>
            )}
            <div className="token-sprite-list">
              {(selectedToken.sprites ?? []).map((s) => (
                <div
                  key={s.id}
                  className={'token-sprite-chip' + (selectedToken.activeSpriteId === s.id ? ' on' : '')}
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
            <button
              className="small"
              onClick={() => {
                setSelKind(null);
                setSelId(null);
              }}
            >
              Fechar
            </button>
            <button
              className="small ghost"
              onClick={() => {
                deleteToken(selectedToken.id);
                setSelKind(null);
                setSelId(null);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      )}

      {selectedObj && (
        <div className="token-editor" style={{ borderTopColor: 'var(--green)' }}>
          <div className="cine-editor-title">Objeto selecionado</div>
          {selectedObj.kind === 'standing' && (
            <>
              <div className="field">
                <label>Altura (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedObj.height}
                  onChange={(e) => updateObjPatch({ height: Math.max(0.4, Number(e.target.value)) })}
                />
              </div>
              <div className="field">
                <label>Elevação (m)</label>
                <input
                  type="number"
                  step={0.05}
                  value={selectedObj.elevation ?? 0}
                  onChange={(e) => updateObjPatch({ elevation: Number(e.target.value) })}
                />
                <p className="faint" style={{ fontSize: 11, margin: '4px 0 0' }}>
                  Ajusta pra cima (+) ou baixo (−) — corrige imagem com margem transparente
                  embaixo do desenho.
                </p>
              </div>
            </>
          )}
          {selectedObj.kind === 'patch' && (
            <>
              <div className="field">
                <label>Largura (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedObj.width}
                  onChange={(e) => updateObjPatch({ width: Math.max(0.2, Number(e.target.value)) })}
                />
              </div>
              <div className="field">
                <label>Profundidade (m)</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedObj.depth}
                  onChange={(e) => updateObjPatch({ depth: Math.max(0.2, Number(e.target.value)) })}
                />
              </div>
              <div className="field">
                <label>Rotação (°)</label>
                <input
                  type="number"
                  step={5}
                  value={selectedObj.rotationY}
                  onChange={(e) => updateObjPatch({ rotationY: Number(e.target.value) })}
                />
              </div>
            </>
          )}
          {selectedObj.kind === 'model' && (
            <>
              <div className="field">
                <label>Escala</label>
                <input
                  type="number"
                  step={0.1}
                  value={selectedObj.scale}
                  onChange={(e) => updateObjPatch({ scale: Math.max(0.05, Number(e.target.value)) })}
                />
              </div>
              <div className="field">
                <label>Rotação (°)</label>
                <input
                  type="number"
                  step={5}
                  value={selectedObj.rotationY}
                  onChange={(e) => updateObjPatch({ rotationY: Number(e.target.value) })}
                />
              </div>
            </>
          )}
          <button className="small" onClick={() => toggleAnchor(selectedObj.id)}>
            {selectedObj.anchored ? '⚓ Ancorado — clique pra soltar' : '↔ Livre — clique pra ancorar'}
          </button>
          <button className="small ghost" onClick={() => removeObject(selectedObj.id)}>
            Remover
          </button>
        </div>
      )}

      <div className="battle3d-canvas" onDragOver={(e) => e.preventDefault()} onDrop={onCanvasDrop}>
        <Canvas
          camera={{ position: [6, 5, 6], fov: 50 }}
          onPointerMissed={() => {
            setSelKind(null);
            setSelId(null);
          }}
          onCreated={({ camera, gl }) => {
            camRef.current = camera;
            domRef.current = gl.domElement;
          }}
        >
          <SceneSky sky={scene.sky} preset={scene.skyPreset} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 3]} intensity={1} />
          {/* divisões travadas num teto (não escala 1:1 com o tamanho) — senão
              uma place gigante (pedido do usuário: "cidade ou mapa grande")
              gera uma grade com dezenas de milhares de linhas, pesada demais
              mesmo em GPU de verdade e catastrófica em renderização por
              software (o teste headless deste projeto usa swiftshader). Some
              com relevo ligado — senão fica flutuando/afundada de forma
              incoerente com o chão ondulado. */}
          {!scene.terrain && (
            <gridHelper args={[scene.groundSize ?? 40, Math.min(scene.groundSize ?? 40, 60), '#3a3a42', '#1c1c20']} />
          )}
          <Suspense fallback={null}>
            <GroundPlane ground={ground} size={scene.groundSize ?? 40} terrain={scene.terrain} />
            {renderObjects()}
            {renderTokens(true)}
          </Suspense>
          {cameraMode === 'orbit' ? (
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.12}
              minDistance={1.5}
              maxDistance={40}
              maxPolarAngle={Math.PI / 2 - 0.02}
              target={pendingOrbitTarget.current}
            />
          ) : (
            domRef.current && (
              <FlyCamera
                domElement={domRef.current}
                onExit={(target) => {
                  pendingOrbitTarget.current.copy(target);
                  setCameraMode('orbit');
                }}
              />
            )
          )}
          <CameraBroadcaster controlsRef={controlsRef} cameraMode={cameraMode} setCamera3d={setCamera3d} />
        </Canvas>
        {objects.length === 0 && !ground && Object.keys(tokens).length === 0 && (
          <p className="cine-scene-hint">
            Cenário em branco — abra "🏔️ Cenário" pra importar chão/objetos, ou "＋ Token" pra
            colocar uma peça na mesa.
          </p>
        )}
      </div>

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
          onAdd2d={() => {
            setShowPlacePicker(false);
            setShowMapPicker(true);
          }}
        />
      )}

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
        />
      )}
    </>
  );
}
