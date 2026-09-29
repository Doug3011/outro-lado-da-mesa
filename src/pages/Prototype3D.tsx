import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { uid } from '../lib/ids';
import { fileToDataURL, fileToDownscaledDataURL, fileToStandingDataURL } from '../lib/image';
import { fetchPlace, savePlace, type Place } from '../lib/placeLibrary';
import type { GroundConfig, PlaceObject } from '../types';
import { FlyCamera, GroundPlane, MODEL_FILE_ACCEPT, SceneObject, kindLabel, modelFormatFromFileName } from '../lib/scene3d';
import * as THREE from 'three';

// PROTÓTIPO EXPERIMENTAL — FASE 2A+ da mesa 3D "de verdade": câmera livre +
// cenário ("place") salvo/carregado de verdade na Área do Mestre. Um cenário
// tem um chão-base (esticado ou repetido, escolha do mestre) e uma lista de
// objetos de 3 tipos: em pé (billboard), decalque deitado no chão (pra
// caminhos/manchas por cima do chão-base) e modelo 3D (.glb) de verdade. Os
// componentes de renderização/arraste ficam em lib/scene3d.tsx, compartilhados
// com a mesa 3D de verdade (Battle3D.tsx). Isolado de propósito: rota própria,
// sem sincronizar com sala nenhuma — só o editor de cenário (a mesa 3D em si
// carrega a place escolhida e daí em diante edita sua PRÓPRIA cópia, ver
// placeToScene em lib/placeLibrary.ts).

export function Prototype3D() {
  const navigate = useNavigate();
  const { placeId: routePlaceId } = useParams<{ placeId?: string }>();
  // se abriu sem id (criar novo), gera um id só uma vez — "Salvar" sempre
  // sabe pra qual id gravar, criar e atualizar usam o mesmo PUT por id.
  const placeIdRef = useRef(routePlaceId ?? uid());
  const placeId = placeIdRef.current;

  const [loading, setLoading] = useState(!!routePlaceId);
  const [name, setName] = useState('Novo cenário');
  const [ground, setGroundState] = useState<GroundConfig | null>(null);
  const [groundSize, setGroundSizeState] = useState(40);
  const [sky, setSky] = useState(false);
  const [objects, setObjects] = useState<PlaceObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [modelSizeWarning, setModelSizeWarning] = useState<string | null>(null);

  const objectInputRef = useRef<HTMLInputElement>(null);
  const patchInputRef = useRef<HTMLInputElement>(null);
  const groundInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camRef = useRef<THREE.Camera | null>(null);
  const domRef = useRef<HTMLElement | null>(null);

  // Câmera "voo livre" estilo modo criativo do Minecraft (mesmo padrão de
  // Battle3D.tsx — ver comentário lá pro raciocínio completo).
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fly'>('orbit');
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

  useEffect(() => {
    if (!routePlaceId) return;
    void fetchPlace(routePlaceId).then((place) => {
      if (place) {
        setName(place.name);
        setGroundState(place.ground);
        setGroundSizeState(place.groundSize ?? 40);
        setSky(!!place.sky);
        setObjects(place.objects);
      }
      setLoading(false);
    });
  }, [routePlaceId]);

  const selected = useMemo(() => objects.find((o) => o.id === selectedId) ?? null, [objects, selectedId]);

  const randPos = () => ({ x: +(Math.random() * 4 - 2).toFixed(2), z: +(Math.random() * 4 - 2).toFixed(2) });

  const addStanding = async (file: File) => {
    const url = await fileToStandingDataURL(file, 512);
    if (!url) return;
    const obj: PlaceObject = { id: uid(), kind: 'standing', imageUrl: url, ...randPos(), height: 2, elevation: 0, anchored: false };
    setObjects((cur) => [...cur, obj]);
    setSelectedId(obj.id);
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
    setObjects((cur) => [...cur, obj]);
    setSelectedId(obj.id);
  };

  const addModel = async (file: File) => {
    // aviso (não bloqueia) — modelo pesado carrega/renderiza devagar e deixa
    // o cenário pesado de salvar, mesmo com o limite do servidor generoso.
    if (file.size > 30 * 1024 * 1024) {
      setModelSizeWarning(`Modelo de ${(file.size / (1024 * 1024)).toFixed(0)}MB — pode demorar pra carregar/salvar.`);
    } else {
      setModelSizeWarning(null);
    }
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
    setObjects((cur) => [...cur, obj]);
    setSelectedId(obj.id);
  };

  const importGroundImage = async (file: File) => {
    const url = await fileToDownscaledDataURL(file, 1024);
    if (!url) return;
    setGroundState((cur) => ({ imageUrl: url, mode: cur?.mode ?? 'tile', repeat: cur?.repeat ?? 6 }));
  };

  const setGroundMode = (mode: GroundConfig['mode']) => {
    setGroundState((cur) => (cur ? { ...cur, mode } : cur));
  };

  const setGroundRepeat = (repeat: number) => {
    setGroundState((cur) => (cur ? { ...cur, repeat: Math.max(1, repeat) } : cur));
  };

  const removeGround = () => setGroundState(null);
  const setGroundSize = (size: number) => setGroundSizeState(Math.max(10, size));

  // `useCallback` (mesmo motivo de Battle3D.tsx — `SceneObject` agora é
  // `memo`, e só segura de verdade se o `onMove` recebido for estável)
  const moveObject = useCallback((id: string, x: number, z: number) => {
    setObjects((cur) => cur.map((o) => (o.id === id ? { ...o, x, z } : o)));
  }, []);

  const toggleAnchor = (id: string) => {
    setObjects((cur) => cur.map((o) => (o.id === id ? { ...o, anchored: !o.anchored } : o)));
  };

  const updateSelected = (patch: Partial<PlaceObject>) => {
    if (!selectedId) return;
    setObjects((cur) => cur.map((o) => (o.id === selectedId ? ({ ...o, ...patch } as PlaceObject) : o)));
  };

  const removeObject = (id: string) => {
    setObjects((cur) => cur.filter((o) => o.id !== id));
    setSelectedId(null);
  };

  const onSave = async () => {
    setSaving('saving');
    const place: Place = { id: placeId, name: name.trim() || 'Cenário sem nome', updatedAt: Date.now(), ground, groundSize, sky, objects };
    // BUG achado (usuário: "salvei o mapa 3d mas ele reseta toda vez que
    // volto"): o resultado de `savePlace` nunca era checado — mostrava
    // "✓ Salvo" mesmo quando a gravação falhava de verdade (ex.: modelo .glb
    // grande estourando o limite de tamanho do corpo da requisição no
    // servidor). Agora só mostra sucesso se realmente salvou.
    const saved = await savePlace(place);
    setSaving(saved ? 'saved' : 'error');
    window.setTimeout(() => setSaving('idle'), saved ? 1600 : 5000);
  };

  if (loading) {
    return (
      <div className="cine-page">
        <div className="cine-topbar">
          <button className="small ghost" onClick={() => navigate('/')}>
            ← Sair
          </button>
          <span className="cine-title">Carregando cenário…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cine-page">
      <div className="cine-topbar">
        <button className="small ghost" onClick={() => navigate('/')}>
          ← Sair do editor
        </button>
        <input
          className="proto3d-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do cenário"
        />
        <div className="row" style={{ flex: 'none', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={'small' + (cameraMode === 'fly' ? ' primary' : '')}
            title="Alterna entre câmera de órbita e voo livre (WASD + Space/Shift + mouse travado, estilo modo criativo) — atalho: tecla 1"
            onClick={toggleCameraMode}
          >
            {cameraMode === 'fly' ? '🕊️ Voo (1)' : '🎥 Órbita (1)'}
          </button>
          <button className="small" onClick={() => objectInputRef.current?.click()}>
            🌳 Importar objeto
          </button>
          <button className="small" onClick={() => patchInputRef.current?.click()}>
            🟫 Importar decalque
          </button>
          <button className="small" onClick={() => groundInputRef.current?.click()}>
            🛣️ {ground ? 'Trocar chão' : 'Importar chão'}
          </button>
          <button
            className="small"
            title="Aceita .glb (recomendado — vem com textura embutida), .fbx (mantém textura se foi exportado com ela embutida) ou .stl (só geometria, sem cor)"
            onClick={() => modelInputRef.current?.click()}
          >
            🧊 Importar modelo 3D
          </button>
          <button
            className="small primary"
            onClick={onSave}
            disabled={saving === 'saving'}
            title={saving === 'error' ? 'A gravação falhou — provavelmente o cenário ficou grande demais (modelo 3D pesado?)' : undefined}
          >
            {saving === 'saved' ? '✓ Salvo' : saving === 'saving' ? 'Salvando…' : saving === 'error' ? '✗ Erro ao salvar' : '💾 Salvar'}
          </button>
        </div>
        {saving === 'error' && (
          <p className="faint" style={{ color: 'var(--blood-bright)', fontSize: 12, marginTop: 4 }}>
            Não deu pra salvar — o cenário provavelmente ficou grande demais (um modelo 3D pesado
            pode passar de 100MB). Tente um modelo menor ou comprimido.
          </p>
        )}
        {modelSizeWarning && saving !== 'error' && (
          <p className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            ⚠️ {modelSizeWarning}
          </p>
        )}
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
      </div>

      <div className="cine-body">
        <div className="proto3d-canvas-wrap">
          <Canvas
            camera={{ position: [6, 5, 6], fov: 50 }}
            onPointerMissed={() => setSelectedId(null)}
            onCreated={({ camera, gl }) => {
              camRef.current = camera;
              domRef.current = gl.domElement;
            }}
          >
            {sky ? <Sky sunPosition={[100, 20, 100]} /> : <color attach="background" args={['#0b0b0d']} />}
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 3]} intensity={1} />
            {/* teto de divisões independente do tamanho — ver mesmo comentário
                em Battle3D.tsx (grade gigante fica pesada/trava em GPU fraca
                ou renderização por software) */}
            <gridHelper args={[groundSize, Math.min(groundSize, 60), '#3a3a42', '#1c1c20']} />
            <Suspense fallback={null}>
              <GroundPlane ground={ground} size={groundSize} />
              {objects.map((o) => (
                <SceneObject
                  key={o.id}
                  obj={o}
                  selected={selectedId === o.id}
                  onSelect={setSelectedId}
                  onMove={moveObject}
                  controlsRef={controlsRef}
                />
              ))}
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
          </Canvas>
          {objects.length === 0 && !ground && (
            <p className="cine-scene-hint">
              Sem nada ainda — "Importar objeto" pra algo em pé (árvore, poste), "Importar chão"
              pra cobrir o piso todo, "Importar decalque" pra sobrepor um caminho/mancha em cima do
              chão, ou "Importar modelo 3D" pra plantar um .glb de verdade. Botão esquerdo do mouse
              gira a câmera, direito desloca, scroll dá zoom.
            </p>
          )}
        </div>

        <div className="cine-hud">
          <div className="cine-hud-title">Chão da cena</div>
          {!ground && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhuma textura de chão ainda.
            </p>
          )}
          {ground && (
            <div className="cine-editor">
              <span className="asset-thumb proto3d-obj-thumb" style={{ backgroundImage: `url(${ground.imageUrl})` }} />
              <div className="row" style={{ gap: 6 }}>
                <button
                  className={'small' + (ground.mode === 'stretch' ? ' primary' : '')}
                  onClick={() => setGroundMode('stretch')}
                >
                  Esticar (sem repetir)
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
              <button className="small ghost" onClick={removeGround}>
                Remover chão
              </button>
            </div>
          )}
          <div className="field" style={{ marginTop: 8 }}>
            <label>Tamanho do chão (m)</label>
            <input type="number" min={10} step={10} value={groundSize} onChange={(e) => setGroundSize(Number(e.target.value))} />
          </div>
          <label className="row" style={{ marginTop: 8, gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={sky} onChange={(e) => setSky(e.target.checked)} />
            ☁️ Mostrar céu (em vez de fundo preto)
          </label>

          <div className="cine-hud-title" style={{ marginTop: 14 }}>
            Objetos na cena
          </div>
          {objects.length === 0 && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhum objeto ainda.
            </p>
          )}
          {objects.map((o) => (
            <div
              key={o.id}
              className={'proto3d-obj-card' + (selectedId === o.id ? ' selected' : '')}
              onClick={() => setSelectedId(o.id)}
            >
              {o.kind === 'model' ? (
                <span className="asset-thumb proto3d-obj-thumb proto3d-model-thumb">🧊</span>
              ) : (
                <span className="asset-thumb proto3d-obj-thumb" style={{ backgroundImage: `url(${o.imageUrl})` }} />
              )}
              <span className="faint" style={{ fontSize: 11 }}>
                {kindLabel[o.kind]} · {o.anchored ? '⚓ ancorado' : '↔ livre'}
              </span>
            </div>
          ))}

          {selected && (
            <div className="cine-editor">
              <div className="cine-editor-title">Objeto selecionado</div>
              {selected.kind === 'standing' && (
                <>
                  <div className="field">
                    <label>Altura (m)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selected.height}
                      onChange={(e) => updateSelected({ height: Math.max(0.4, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="field">
                    <label>Elevação (m)</label>
                    <input
                      type="number"
                      step={0.05}
                      value={selected.elevation ?? 0}
                      onChange={(e) => updateSelected({ elevation: Number(e.target.value) })}
                    />
                    <p className="faint" style={{ fontSize: 11, margin: '4px 0 0' }}>
                      Ajusta pra cima (+) ou baixo (−) — corrige imagem com margem transparente
                      embaixo do desenho, que senão fica flutuando.
                    </p>
                  </div>
                </>
              )}
              {selected.kind === 'patch' && (
                <>
                  <div className="field">
                    <label>Largura (m)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selected.width}
                      onChange={(e) => updateSelected({ width: Math.max(0.2, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="field">
                    <label>Profundidade (m)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selected.depth}
                      onChange={(e) => updateSelected({ depth: Math.max(0.2, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="field">
                    <label>Rotação (°)</label>
                    <input
                      type="number"
                      step={5}
                      value={selected.rotationY}
                      onChange={(e) => updateSelected({ rotationY: Number(e.target.value) })}
                    />
                  </div>
                </>
              )}
              {selected.kind === 'model' && (
                <>
                  <div className="field">
                    <label>Escala</label>
                    <input
                      type="number"
                      step={0.1}
                      value={selected.scale}
                      onChange={(e) => updateSelected({ scale: Math.max(0.05, Number(e.target.value)) })}
                    />
                  </div>
                  <div className="field">
                    <label>Rotação (°)</label>
                    <input
                      type="number"
                      step={5}
                      value={selected.rotationY}
                      onChange={(e) => updateSelected({ rotationY: Number(e.target.value) })}
                    />
                  </div>
                </>
              )}
              <button className="small" onClick={() => toggleAnchor(selected.id)}>
                {selected.anchored ? '⚓ Ancorado — clique pra soltar' : '↔ Livre — clique pra ancorar'}
              </button>
              <button className="small ghost" onClick={() => removeObject(selected.id)}>
                Remover
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
