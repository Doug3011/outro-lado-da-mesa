import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { FBXLoader, GLTFLoader, STLLoader, type OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GroundConfig, PlaceObject } from '../types';

// Componentes 3D compartilhados entre o editor de "place" (Prototype3D.tsx,
// isolado, sem mesa) e a mesa 3D de verdade (Battle3D.tsx, sincronizada com a
// sala) — extraídos daqui pra não duplicar a lógica de billboard/decalque/
// modelo/chão/arraste em dois lugares.

// Plano no chão (Y=0) usado só pra calcular onde o raio do ponteiro "bate"
// ao arrastar um objeto — não é desenhado, é matemática pura.
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();

export function groundPointFromPointer(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  dom: HTMLElement,
): THREE.Vector3 | null {
  const rect = dom.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  return raycaster.ray.intersectPlane(GROUND_PLANE, hit) ? hit : null;
}

// Câmera "voo livre" estilo modo criativo do Minecraft (pedido do usuário) —
// alternativa ao OrbitControls (que orbita em volta de um alvo fixo): aqui a
// câmera solta no espaço, sem pivô nenhum. WASD move na direção que ela olha
// (W/S inclui a componente vertical do olhar — voar olhando pra cima sobe
// também, igual o Minecraft), Space/Shift sobem/descem no eixo Y do MUNDO
// (não relativo ao olhar, também igual o Minecraft). Mouse trava no centro
// da tela via Pointer Lock — sem cursor nenhum visível, só a câmera girando
// com o `movementX/Y`. É EXCLUSIVA com o OrbitControls (os dois brigariam
// pelo mesmo `camera.position/quaternion` a cada frame) — quem usa isso
// deve renderizar OrbitControls e FlyCamera de forma condicional
// (`cameraMode === 'orbit' ? <OrbitControls/> : <FlyCamera/>`), nunca junto.
const FLY_SPEED = 6; // unidades (metros) por segundo
const FLY_MOUSE_SENSITIVITY = 0.0022;

export function FlyCamera({
  domElement,
  onExit,
}: {
  domElement: HTMLElement;
  // chamado quando o USUÁRIO solta o pointer lock por fora (Esc, alt-tab) —
  // não quando quem chama desmonta o componente de propósito (aí quem
  // desmontou já sabe que saiu). Devolve um ponto à frente da câmera, bom
  // candidato a `target` pro OrbitControls não "pular" o pivô ao voltar.
  onExit: (lookTarget: THREE.Vector3) => void;
}) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const yawPitchRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    // começa exatamente de onde a câmera já estava olhando — sem isso o
    // primeiro frame giraria pra yaw=0/pitch=0 e "pularia" a visão.
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yawPitchRef.current = { yaw: euler.y, pitch: euler.x };

    domElement.requestPointerLock();

    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== domElement) return;
      yawPitchRef.current.yaw -= e.movementX * FLY_MOUSE_SENSITIVITY;
      const limit = Math.PI / 2 - 0.01;
      yawPitchRef.current.pitch = Math.max(
        -limit,
        Math.min(limit, yawPitchRef.current.pitch - e.movementY * FLY_MOUSE_SENSITIVITY),
      );
    };
    const onPointerLockChange = () => {
      if (document.pointerLockElement === domElement) return;
      // usuário saiu (Esc/alt-tab) sem ser via toggle de quem chama
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      onExit(camera.position.clone().addScaledVector(dir, 5));
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      keysRef.current = {};
      if (document.pointerLockElement === domElement) document.exitPointerLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domElement]);

  useFrame((_, delta) => {
    const { yaw, pitch } = yawPitchRef.current;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

    const k = keysRef.current;
    if (!k['KeyW'] && !k['KeyS'] && !k['KeyA'] && !k['KeyD'] && !k['Space'] && !k['ShiftLeft'] && !k['ShiftRight']) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const move = new THREE.Vector3();
    if (k['KeyW']) move.add(forward);
    if (k['KeyS']) move.sub(forward);
    if (k['KeyD']) move.add(right);
    if (k['KeyA']) move.sub(right);
    if (k['Space']) move.y += 1;
    if (k['ShiftLeft'] || k['ShiftRight']) move.y -= 1;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(FLY_SPEED * delta);
      camera.position.add(move);
    }
  });

  return null;
}

// Lógica de arrastar compartilhada por todo objeto que fica deitado/plantado
// no chão: desliga o OrbitControls enquanto arrasta (stopPropagation do
// evento sintético do r3f não alcança o listener nativo do OrbitControls —
// são dois sistemas de evento diferentes), reposiciona via raycast no plano
// do chão, religa ao soltar. `onDragEnd` é opcional — quem só precisa de
// commit local a cada movimento (editor de place) não usa; quem precisa
// throttlar o envio pela rede e fazer o commit final exato (mesa 3D de
// verdade) usa pra saber quando o arraste realmente terminou.
export function useGroundDrag(
  id: string,
  anchored: boolean,
  onSelect: (id: string) => void,
  onMove: (id: string, x: number, z: number) => void,
  controlsRef: RefObject<OrbitControlsImpl | null>,
  onDragEnd?: (id: string) => void,
) {
  const { camera, gl } = useThree();
  return (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(id);
    if (anchored) return;
    if (controlsRef.current) controlsRef.current.enabled = false;
    const onMoveNative = (ev: PointerEvent) => {
      const p = groundPointFromPointer(ev.clientX, ev.clientY, camera, gl.domElement);
      if (p) onMove(id, p.x, p.z);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMoveNative);
      window.removeEventListener('pointerup', onUp);
      if (controlsRef.current) controlsRef.current.enabled = true;
      onDragEnd?.(id);
    };
    window.addEventListener('pointermove', onMoveNative);
    window.addEventListener('pointerup', onUp);
  };
}

export type ObjProps<K extends PlaceObject['kind']> = {
  obj: Extract<PlaceObject, { kind: K }>;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onDragEnd?: (id: string) => void;
};

export function StandingObject({ obj, selected, onSelect, onMove, controlsRef, onDragEnd }: ObjProps<'standing'>) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const texture = useLoader(THREE.TextureLoader, obj.imageUrl);
  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
  const width = obj.height * aspect;

  // gira só no eixo Y — o objeto sempre encara a câmera de frente, mas
  // continua "de pé", sem tombar (diferente de um Sprite puro do three.js).
  useFrame(() => {
    if (!meshRef.current) return;
    const dx = camera.position.x - obj.x;
    const dz = camera.position.z - obj.z;
    meshRef.current.rotation.y = Math.atan2(dx, dz);
  });

  const onPointerDown = useGroundDrag(obj.id, obj.anchored, onSelect, onMove, controlsRef, onDragEnd);
  const elevation = obj.elevation ?? 0;

  return (
    <mesh ref={meshRef} position={[obj.x, obj.height / 2 + elevation, obj.z]} onPointerDown={onPointerDown}>
      <planeGeometry args={[width, obj.height]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} alphaTest={0.4} />
      {selected && (
        <mesh position={[0, -obj.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[width * 0.35, width * 0.45, 24]} />
          <meshBasicMaterial color={obj.anchored ? '#e8b21e' : '#2fae66'} />
        </mesh>
      )}
    </mesh>
  );
}

// "Decalque" deitado no chão — pra sobrepor um caminho de terra, uma mancha
// de grama diferente etc. em cima do chão-base, sem precisar de pintura de
// verdade: importa a imagem, posiciona/gira/redimensiona um retângulo com
// ela. Vários decalques encadeados aproximam um caminho comprido.
export function GroundPatch({ obj, selected, onSelect, onMove, controlsRef, onDragEnd }: ObjProps<'patch'>) {
  const texture = useLoader(THREE.TextureLoader, obj.imageUrl);
  const onPointerDown = useGroundDrag(obj.id, obj.anchored, onSelect, onMove, controlsRef, onDragEnd);
  const ringRadius = Math.max(obj.width, obj.depth) * 0.46;

  return (
    <group position={[obj.x, 0.012, obj.z]} rotation={[0, (obj.rotationY * Math.PI) / 180, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onPointerDown}>
        <planeGeometry args={[obj.width, obj.depth]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.05} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[ringRadius * 0.92, ringRadius, 24]} />
          <meshBasicMaterial color={obj.anchored ? '#e8b21e' : '#2fae66'} />
        </mesh>
      )}
    </group>
  );
}

// Modelo 3D de verdade, embutido como data URL — os 3 loaders aceitam uma
// data URL normalmente, tratando como qualquer outra URL de origem. Cada
// formato devolve um objeto three.js diferente (GLTFLoader dá {scene,...},
// FBXLoader dá o Group direto, STLLoader dá só a geometria crua — sem
// cor/textura, formato não guarda isso) — por isso 3 componentes por
// formato (dispatch por `obj.format`, nunca muda depois de criado) em vez de
// um `if` dentro do mesmo componente: `useLoader` é hook, não pode ser
// condicional na mesma instância.
function ModelMesh({
  obj,
  object3d,
  selected,
  onSelect,
  onMove,
  controlsRef,
  onDragEnd,
}: ObjProps<'model'> & { object3d: THREE.Object3D }) {
  const onPointerDown = useGroundDrag(obj.id, obj.anchored, onSelect, onMove, controlsRef, onDragEnd);
  return (
    <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotationY * Math.PI) / 180, 0]}>
      <primitive object={object3d} scale={obj.scale} onPointerDown={onPointerDown} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.65, 24]} />
          <meshBasicMaterial color={obj.anchored ? '#e8b21e' : '#2fae66'} />
        </mesh>
      )}
    </group>
  );
}

function GlbModel(props: ObjProps<'model'>) {
  const gltf = useLoader(GLTFLoader, props.obj.modelUrl);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <ModelMesh {...props} object3d={scene} />;
}

function FbxModel(props: ObjProps<'model'>) {
  const fbx = useLoader(FBXLoader, props.obj.modelUrl);
  const group = useMemo(() => fbx.clone(true), [fbx]);
  return <ModelMesh {...props} object3d={group} />;
}

// STL não tem material/cor nenhuma — é só geometria crua, então usa um
// material cinza padrão pra pelo menos ficar visível/sombreado.
function StlModel(props: ObjProps<'model'>) {
  const geometry = useLoader(STLLoader, props.obj.modelUrl);
  const mesh = useMemo(() => {
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#9a9a9a' }));
  }, [geometry]);
  return <ModelMesh {...props} object3d={mesh} />;
}

export function ModelObject(props: ObjProps<'model'>) {
  if (props.obj.format === 'fbx') return <FbxModel {...props} />;
  if (props.obj.format === 'stl') return <StlModel {...props} />;
  return <GlbModel {...props} />;
}

// `memo` (pedido do usuário: "mini lags ao mover tokens no 3D") — sem
// isso, cada objeto/modelo da cena inteira re-renderizava (recalculava
// JSX, reconciliava props) a CADA pointermove durante QUALQUER arraste
// (token ou objeto), mesmo os que não tinham nada a ver com o que estava
// sendo arrastado — achado real: um modelo .glb pesado (cidade/prédio
// grande) na cena virava gargalo visível mesmo arrastando um token
// pequeno do outro lado do mapa. Com `memo`, só re-renderiza quando as
// PRÓPRIAS props mudam de verdade — o resto depende de quem chama passar
// callbacks ESTÁVEIS (`useCallback`), senão o memo não segura nada (ver
// `Battle3D.tsx`: `selectObject`/`selectToken`/`moveObjectLive`/etc.).
export const SceneObject = memo(function SceneObject(props: {
  obj: PlaceObject;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onDragEnd?: (id: string) => void;
}) {
  if (props.obj.kind === 'standing') return <StandingObject {...props} obj={props.obj} />;
  if (props.obj.kind === 'patch') return <GroundPatch {...props} obj={props.obj} />;
  return <ModelObject {...props} obj={props.obj} />;
});

export function TexturedGround({ ground, size = 40 }: { ground: GroundConfig; size?: number }) {
  const texture = useLoader(THREE.TextureLoader, ground.imageUrl);
  useMemo(() => {
    if (ground.mode === 'tile') {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(ground.repeat, ground.repeat);
    } else {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
    }
    texture.needsUpdate = true;
  }, [texture, ground.mode, ground.repeat]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

// `size`: lado do plano em metros (pedido do usuário: place grande o
// suficiente pra caber uma cidade/mapa grande) — antes era fixo em 40x40 em
// TODA place; opcional com default 40 pra não quebrar cenários/places
// salvos antes desse campo existir.
export function GroundPlane({ ground, size = 40 }: { ground: GroundConfig | null; size?: number }) {
  if (ground) return <TexturedGround ground={ground} size={size} />;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#141417" />
    </mesh>
  );
}

// Formatos de modelo 3D aceitos no input file (import de objeto 3D real) —
// usado tanto no atributo `accept` quanto pra decidir qual loader usar a
// partir da extensão do arquivo escolhido.
export const MODEL_FILE_ACCEPT = '.glb,.gltf,.fbx,.stl';

export function modelFormatFromFileName(name: string): 'glb' | 'fbx' | 'stl' {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'fbx') return 'fbx';
  if (ext === 'stl') return 'stl';
  return 'glb'; // .gltf também cai aqui — GLTFLoader lê os dois
}

export const kindLabel: Record<PlaceObject['kind'], string> = {
  standing: '🌳 em pé',
  patch: '🟫 decalque',
  model: '🧊 modelo 3D',
};
