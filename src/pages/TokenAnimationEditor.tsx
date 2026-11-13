import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { uid } from '../lib/ids';
import { fetchTokenLibrary, saveTokenAnimationRig, tokenAssetUrl } from '../lib/tokenLibrary';
import {
  applyRigToUniforms,
  computeRadii,
  createWarpUniforms,
  updateWarpTime,
  WARP_FRAGMENT_SHADER,
  WARP_SEGMENTS,
  WARP_VERTEX_SHADER,
} from '../lib/tokenWarp';
import type { AnimationPoint } from '../types';

// Editor de animação "puppet warp" de token (pedido do usuário) — página
// isolada, FORA de qualquer mesa/sessão, mesmo padrão de Prototype3D.tsx
// (editor de cenário 3D standalone). Marca pontos fixos (âncoras) e
// móveis (balançam) direto na imagem do token; a pré-visualização usa o
// MESMO módulo (tokenWarp.ts) que a mesa de verdade vai usar depois, pra
// o resultado bater exatamente.

type AddMode = 'fixed' | 'moving';

const POINT_COLOR = {
  fixed: '#4fc3f7',
  movingIdle: '#ff8a50',
  selected: '#ffeb3b',
};

function WarpMesh({
  textureUrl,
  points,
  aspect,
  selectedId,
  onAddPoint,
  onMovePoint,
  onSelectPoint,
}: {
  textureUrl: string;
  points: AnimationPoint[];
  aspect: number;
  selectedId: string | null;
  onAddPoint: (u: number, v: number) => void;
  onMovePoint: (id: string, u: number, v: number) => void;
  onSelectPoint: (id: string) => void;
}) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  const uniforms = useMemo(() => createWarpUniforms(texture), [texture]);
  useEffect(() => {
    applyRigToUniforms(uniforms, { points });
  }, [uniforms, points]);
  useFrame((state) => updateWarpTime(uniforms, state.clock.elapsedTime));

  const draggingId = useRef<string | null>(null);

  const onPlaneClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (draggingId.current) return; // clique logo após soltar um arraste — ignora
    if (!e.uv) return;
    onAddPoint(e.uv.x, e.uv.y);
  };
  const onPlanePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId.current || !e.uv) return;
    e.stopPropagation();
    onMovePoint(draggingId.current, e.uv.x, e.uv.y);
  };
  const endDrag = () => {
    draggingId.current = null;
  };

  return (
    // Grupo esticado pelo aspect ratio da imagem — cada marcador de ponto
    // recebe a escala inversa (1/aspect, 1) pra continuar redondo na tela,
    // não oval junto com a imagem.
    <group scale={[aspect, 1, 1]}>
      <mesh
        onClick={onPlaneClick}
        onPointerMove={onPlanePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <planeGeometry args={[1, 1, WARP_SEGMENTS, WARP_SEGMENTS]} />
        <shaderMaterial
          transparent
          uniforms={uniforms}
          vertexShader={WARP_VERTEX_SHADER}
          fragmentShader={WARP_FRAGMENT_SHADER}
        />
      </mesh>
      {points.map((p) => (
        <mesh
          key={p.id}
          position={[p.u - 0.5, p.v - 0.5, 0.01]}
          scale={[1 / aspect, 1, 1]}
          onPointerDown={(e) => {
            e.stopPropagation();
            draggingId.current = p.id;
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            endDrag();
            onSelectPoint(p.id);
          }}
        >
          <circleGeometry args={[0.018, 20]} />
          <meshBasicMaterial
            color={
              selectedId === p.id ? POINT_COLOR.selected : p.type === 'fixed' ? POINT_COLOR.fixed : POINT_COLOR.movingIdle
            }
          />
        </mesh>
      ))}
    </group>
  );
}

function emptyMovingDefaults(): Pick<AnimationPoint, 'intensity' | 'speed' | 'direction'> {
  return { intensity: 0.08, speed: 1.5, direction: 90 };
}

export function TokenAnimationEditor() {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const [loading, setLoading] = useState(true);
  const [assetName, setAssetName] = useState('');
  const [points, setPoints] = useState<AnimationPoint[]>([]);
  const [addMode, setAddMode] = useState<AddMode>('moving');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!assetId) {
      setLoading(false);
      return;
    }
    void fetchTokenLibrary().then((lib) => {
      const asset = lib.items.find((it) => it.id === assetId);
      setAssetName(asset?.name ?? '');
      setPoints(asset?.animationRig?.points ?? []);
      setLoading(false);
    });
  }, [assetId]);

  // Descobre a proporção da imagem (fora do Canvas — só pra esticar o
  // grupo/câmera certo; a textura em si é carregada de novo dentro do
  // Canvas via useLoader, que já faz cache pela mesma URL).
  useEffect(() => {
    if (!assetId) return;
    const img = new Image();
    img.onload = () => setAspect(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.src = tokenAssetUrl(assetId);
  }, [assetId]);

  const selected = points.find((p) => p.id === selectedId) ?? null;

  const addPoint = (u: number, v: number) => {
    const base: AnimationPoint = { id: uid(), type: addMode, u, v };
    const next = computeRadii([...points, addMode === 'moving' ? { ...base, ...emptyMovingDefaults() } : base]);
    setPoints(next);
    setSelectedId(base.id);
  };
  const movePoint = (id: string, u: number, v: number) => {
    setPoints((cur) => computeRadii(cur.map((p) => (p.id === id ? { ...p, u, v } : p))));
  };
  const updateSelected = (patch: Partial<AnimationPoint>) => {
    if (!selectedId) return;
    setPoints((cur) => cur.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    setPoints((cur) => computeRadii(cur.filter((p) => p.id !== selectedId)));
    setSelectedId(null);
  };

  const onSave = async () => {
    if (!assetId) return;
    setSaving('saving');
    await saveTokenAnimationRig(assetId, points.length ? { points } : null);
    setSaving('saved');
    window.setTimeout(() => navigate(-1), 500);
  };

  if (!assetId) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div className="cine-page" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="faint">Carregando token…</span>
      </div>
    );
  }

  return (
    <div className="cine-page">
      <div className="map-toolbar">
        <span className="faint" style={{ marginRight: 'auto' }}>
          Animação · {assetName || 'token'}
        </span>
        <button className="small ghost" onClick={() => navigate(-1)}>
          Cancelar
        </button>
        <button className="small primary" onClick={onSave} disabled={saving === 'saving'}>
          {saving === 'saved' ? '✓ Salvo' : saving === 'saving' ? 'Salvando…' : 'Salvar animação'}
        </button>
      </div>

      <div className="proto3d-canvas-wrap">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 5], zoom: Math.min(420, 760 / Math.max(aspect, 1)) }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={1.2} />
          <Suspense fallback={null}>
            <WarpMesh
              textureUrl={tokenAssetUrl(assetId)}
              points={points}
              aspect={aspect}
              selectedId={selectedId}
              onAddPoint={addPoint}
              onMovePoint={movePoint}
              onSelectPoint={setSelectedId}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="rd-card" style={{ position: 'absolute', top: 54, right: 12, width: 260, padding: 12 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Pontos
        </div>
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          <button className={'small' + (addMode === 'fixed' ? ' primary' : '')} onClick={() => setAddMode('fixed')}>
            + Ponto fixo
          </button>
          <button className={'small' + (addMode === 'moving' ? ' primary' : '')} onClick={() => setAddMode('moving')}>
            + Ponto móvel
          </button>
        </div>
        <p className="faint" style={{ fontSize: 11 }}>
          Clique na imagem pra adicionar um ponto no modo escolhido acima. Arraste um ponto já
          colocado pra reposicionar; clique nele pra selecionar.
        </p>

        {selected && selected.type === 'moving' && (
          <div className="cine-editor" style={{ marginTop: 10 }}>
            <div className="cine-editor-title">Ponto móvel selecionado</div>
            <div className="field">
              <label>Intensidade</label>
              <input
                type="range"
                min={0}
                max={0.3}
                step={0.01}
                value={selected.intensity ?? 0.08}
                onChange={(e) => updateSelected({ intensity: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Velocidade</label>
              <input
                type="range"
                min={0.2}
                max={5}
                step={0.1}
                value={selected.speed ?? 1.5}
                onChange={(e) => updateSelected({ speed: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Direção (°)</label>
              <input
                type="number"
                step={5}
                value={selected.direction ?? 90}
                onChange={(e) => updateSelected({ direction: Number(e.target.value) })}
              />
            </div>
            <button className="small ghost" onClick={removeSelected}>
              Remover ponto
            </button>
          </div>
        )}
        {selected && selected.type === 'fixed' && (
          <div className="cine-editor" style={{ marginTop: 10 }}>
            <p className="faint" style={{ fontSize: 11, margin: 0 }}>
              Ponto fixo — só serve de âncora (define até onde a deformação dos pontos móveis
              próximos alcança), sem controles próprios.
            </p>
            <button className="small ghost" style={{ marginTop: 6 }} onClick={removeSelected}>
              Remover ponto
            </button>
          </div>
        )}
        {!selected && points.length === 0 && (
          <p className="faint" style={{ fontSize: 11 }}>
            Nenhum ponto ainda. Marque pelo menos um ponto fixo (ex.: a cabeça) e um móvel (ex.: a
            ponta do chapéu).
          </p>
        )}
      </div>
    </div>
  );
}
