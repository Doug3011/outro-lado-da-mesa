import type React from 'react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { uid } from '../lib/ids';
import { fileToDataURL, fileToDownscaledDataURL, fileToStandingDataURL, urlToFile } from '../lib/image';
import { fetchPlace, savePlace, type Place } from '../lib/placeLibrary';
import { modelAssetUrl } from '../lib/modelLibrary';
import type { GroundConfig, ModelAsset, PlaceObject, SkyPreset, TerrainConfig } from '../types';
import {
  FlyCamera,
  GroundPlane,
  SceneObject,
  SceneSky,
  groundPointFromPointer,
  kindLabel,
  modelFormatFromFileName,
} from '../lib/scene3d';
import * as THREE from 'three';
import { FloatingButton } from '../components/FloatingButton';
import { FloatingWindow } from '../components/FloatingWindow';
import { ModelLibraryManager, MODEL_DRAG_MIME, type ModelDragPayload } from '../components/ModelLibraryManager';
import { CameraFloatIcon, LibraryFloatIcon, MestreFloatIcon, SelectionFloatIcon } from '../components/icons';

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
//
// Casca visual (retrofit): botões/janelas flutuantes (FloatingButton/
// FloatingWindow), mesmo padrão já aprovado em BattleMap.tsx/Battle3D.tsx —
// substitui a antiga `cine-topbar`/`cine-hud` fixa. Categorias seguem a
// mesma divisão de Battle3D.tsx: "Mestre" (nome + chão/céu/relevo), "Modelos"
// (biblioteca de imagem/modelo 3D, ver ModelLibraryManager) e "Câmera"
// (alternar órbita/voo); "Objetos" é extra, pra não perder a lista de
// objetos plantados + editor do selecionado que a `cine-hud` antiga tinha.

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
  const [terrain, setTerrainState] = useState<TerrainConfig | null>(null);
  const [sky, setSky] = useState(false);
  const [skyPreset, setSkyPresetState] = useState<SkyPreset>('dia');
  const [objects, setObjects] = useState<PlaceObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [modelSizeWarning, setModelSizeWarning] = useState<string | null>(null);

  // Botões/janelas flutuantes (ver comentário acima) — mesmo padrão de
  // estado booleano por janela já usado em BattleMap.tsx/Battle3D.tsx.
  const [mestreOpen, setMestreOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const floatingLayerRef = useRef<HTMLDivElement>(null);

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
        setTerrainState(place.terrain ?? null);
        setSky(!!place.sky);
        setSkyPresetState(place.skyPreset ?? 'dia');
        setObjects(place.objects);
      }
      setLoading(false);
    });
  }, [routePlaceId]);

  const selected = useMemo(() => objects.find((o) => o.id === selectedId) ?? null, [objects, selectedId]);

  // Abre a janela "Objetos" sozinha ao selecionar algo na cena (clique no
  // objeto ou recém-plantado) — mesmo motivo do efeito análogo em
  // Prototype2D.tsx: sem isso, com a janela fechada a seleção mudaria sem o
  // usuário notar nada na tela (antes o editor ficava sempre visível na HUD
  // fixa).
  useEffect(() => {
    if (selectedId) setObjectsOpen(true);
  }, [selectedId]);

  const randPos = () => ({ x: +(Math.random() * 4 - 2).toFixed(2), z: +(Math.random() * 4 - 2).toFixed(2) });

  // `pos` opcional — omitido (clique na biblioteca) cai numa posição
  // aleatória perto do centro, igual sempre foi; informado (arraste da
  // biblioteca pro cenário, ver onCanvasDrop abaixo) planta exatamente onde
  // o ponteiro soltou, calculado via raycast no plano do chão.
  const addStanding = async (file: File, pos?: { x: number; z: number }) => {
    const url = await fileToStandingDataURL(file, 512);
    if (!url) return;
    const obj: PlaceObject = {
      id: uid(),
      kind: 'standing',
      imageUrl: url,
      ...(pos ?? randPos()),
      height: 2,
      elevation: 0,
      anchored: false,
    };
    setObjects((cur) => [...cur, obj]);
    setSelectedId(obj.id);
  };

  const addPatch = async (file: File, pos?: { x: number; z: number }) => {
    const url = await fileToDownscaledDataURL(file, 512);
    if (!url) return;
    const obj: PlaceObject = {
      id: uid(),
      kind: 'patch',
      imageUrl: url,
      ...(pos ?? randPos()),
      width: 3,
      depth: 3,
      rotationY: 0,
      anchored: false,
    };
    setObjects((cur) => [...cur, obj]);
    setSelectedId(obj.id);
  };

  const addModel = async (file: File, pos?: { x: number; z: number }) => {
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
      ...(pos ?? randPos()),
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

  // Biblioteca de modelos/imagens (TAREFA 1) — um item já importado (imagem
  // ou modelo 3D de verdade) vira um `File` de novo via urlToFile (reaproveita
  // a mesma pipeline de add*/import* acima que um arquivo recém-escolhido no
  // computador sempre usou, sem duplicar lógica de recorte/downscale/embed).
  const assetToFile = (asset: ModelAsset) => urlToFile(modelAssetUrl(asset.id), `${asset.name}.${asset.ext}`);

  // Clique numa miniatura da biblioteca planta no cenário (posição padrão,
  // igual sempre foi pra importação direta) — modelo vira objeto "modelo 3D",
  // imagem vira objeto "em pé" (billboard), o uso mais comum.
  const plantFromLibrary = (asset: ModelAsset) => {
    void assetToFile(asset).then((file) => {
      if (!file) return;
      if (asset.kind === 'model') void addModel(file);
      else void addStanding(file);
    });
  };

  // Ações extras só pra item `kind:'image'` (ver ModelLibraryManager) — a
  // mesma imagem da biblioteca também pode virar decalque ou textura de
  // chão, sem precisar reimportar.
  const plantAsPatchFromLibrary = (asset: ModelAsset) => {
    void assetToFile(asset).then((file) => {
      if (file) void addPatch(file);
    });
  };
  const plantAsGroundFromLibrary = (asset: ModelAsset) => {
    void assetToFile(asset).then((file) => {
      if (file) void importGroundImage(file);
    });
  };

  // Arrastar um item da biblioteca e soltar no cenário — mesma ideia do
  // onCanvasDrop de Battle3D.tsx (arrastar token da biblioteca pro chão),
  // aqui calculando a posição real de soltura via raycast no plano Y=0.
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(MODEL_DRAG_MIME);
    if (!raw || !camRef.current || !domRef.current) return;
    let payload: ModelDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const p = groundPointFromPointer(e.clientX, e.clientY, camRef.current, domRef.current);
    if (!p) return;
    const pos = { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
    void urlToFile(modelAssetUrl(payload.id), `${payload.name}.${payload.ext}`).then((file) => {
      if (!file) return;
      if (payload.kind === 'model') void addModel(file, pos);
      else void addStanding(file, pos);
    });
  };

  const setGroundMode = (mode: GroundConfig['mode']) => {
    setGroundState((cur) => (cur ? { ...cur, mode } : cur));
  };

  const setGroundRepeat = (repeat: number) => {
    setGroundState((cur) => (cur ? { ...cur, repeat: Math.max(1, repeat) } : cur));
  };

  const removeGround = () => setGroundState(null);
  const setGroundSize = (size: number) => setGroundSizeState(Math.max(10, size));
  const toggleTerrain = (on: boolean) =>
    setTerrainState(on ? { amplitude: 2, scale: 12, seed: Math.floor(Math.random() * 1e9) } : null);
  const setTerrainAmplitude = (amplitude: number) => setTerrainState((cur) => (cur ? { ...cur, amplitude } : cur));
  const setTerrainScale = (scale: number) => setTerrainState((cur) => (cur ? { ...cur, scale: Math.max(1, scale) } : cur));
  const setSkyPreset = (preset: SkyPreset) => {
    setSky(true);
    setSkyPresetState(preset);
  };

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
    const place: Place = {
      id: placeId,
      name: name.trim() || 'Cenário sem nome',
      updatedAt: Date.now(),
      ground,
      groundSize,
      terrain,
      sky,
      skyPreset,
      objects,
    };
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
      <div className="cine-page" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="faint">Carregando cenário…</span>
      </div>
    );
  }

  return (
    <div className="cine-page">
      <div className="map-toolbar">
        <button className="small ghost" onClick={() => navigate('/')}>
          ← Sair do editor
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
        <p className="faint" style={{ position: 'absolute', top: 44, left: 10, zIndex: 6, color: 'var(--blood-bright)', fontSize: 12, maxWidth: 320 }}>
          Não deu pra salvar — o cenário provavelmente ficou grande demais (um modelo 3D pesado
          pode passar de 100MB). Tente um modelo menor ou comprimido.
        </p>
      )}
      {modelSizeWarning && saving !== 'error' && (
        <p className="faint" style={{ position: 'absolute', top: 44, left: 10, zIndex: 6, fontSize: 12, maxWidth: 320 }}>
          ⚠️ {modelSizeWarning}
        </p>
      )}

      <div className="proto3d-canvas-wrap" onDragOver={(e) => e.preventDefault()} onDrop={onCanvasDrop}>
        <Canvas
          camera={{ position: [6, 5, 6], fov: 50 }}
          onPointerMissed={() => setSelectedId(null)}
          onCreated={({ camera, gl }) => {
            camRef.current = camera;
            domRef.current = gl.domElement;
          }}
        >
          <SceneSky sky={sky} preset={skyPreset} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 3]} intensity={1} />
          {/* teto de divisões independente do tamanho — ver mesmo comentário
              em Battle3D.tsx (grade gigante fica pesada/trava em GPU fraca
              ou renderização por software). Some com relevo ligado — senão
              fica flutuando/afundada de forma incoerente com o chão ondulado. */}
          {!terrain && <gridHelper args={[groundSize, Math.min(groundSize, 60), '#3a3a42', '#1c1c20']} />}
          <Suspense fallback={null}>
            <GroundPlane ground={ground} size={groundSize} terrain={terrain} />
            {objects.map((o) => (
              <SceneObject
                key={o.id}
                obj={o}
                selected={selectedId === o.id}
                onSelect={setSelectedId}
                onMove={moveObject}
                controlsRef={controlsRef}
                terrain={terrain}
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
            Sem nada ainda — abra "Modelos" pra importar/arrastar um objeto, um modelo 3D de
            verdade, ou usar uma imagem como chão/decalque. Botão esquerdo do mouse gira a câmera,
            direito desloca, scroll dá zoom.
          </p>
        )}
      </div>

      <div className="battle-floating-layer" ref={floatingLayerRef}>
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Mestre"
          icon={<MestreFloatIcon />}
          active={mestreOpen}
          onActivate={() => setMestreOpen((o) => !o)}
          topFrac={0.08}
          rightFrac={0.04}
        />
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Modelos"
          icon={<LibraryFloatIcon />}
          active={modelsOpen}
          onActivate={() => setModelsOpen((o) => !o)}
          topFrac={0.19}
          rightFrac={0.04}
        />
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Objetos"
          icon={<SelectionFloatIcon />}
          active={objectsOpen}
          onActivate={() => setObjectsOpen((o) => !o)}
          topFrac={0.3}
          rightFrac={0.04}
        />
        <FloatingButton
          containerRef={floatingLayerRef}
          label="Câmera"
          icon={<CameraFloatIcon />}
          active={cameraOpen}
          onActivate={() => setCameraOpen((o) => !o)}
          topFrac={0.41}
          rightFrac={0.04}
        />

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Mestre"
          open={mestreOpen}
          onClose={() => setMestreOpen(false)}
          leftFrac={0.5}
          topFrac={0.06}
          defaultWidth={320}
          defaultHeight={540}
        >
          <div className="field">
            <label>Nome do cenário</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cenário" />
          </div>

          <div className="cine-hud-title" style={{ marginTop: 6 }}>
            Chão da cena
          </div>
          {!ground && (
            <p className="faint" style={{ fontSize: 12 }}>
              Nenhuma textura de chão ainda — arraste uma imagem da biblioteca ("Modelos") e use o
              botão 🛣️ dela, ou plante um objeto e troque depois.
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
          <div className="field" style={{ marginTop: 8 }}>
            <label>Céu</label>
            <select
              value={sky ? skyPreset : ''}
              onChange={(e) => (e.target.value ? setSkyPreset(e.target.value as SkyPreset) : setSky(false))}
            >
              <option value="">Sem céu (fundo preto)</option>
              <option value="dia">☀️ Dia</option>
              <option value="entardecer">🌇 Entardecer</option>
              <option value="noite">🌙 Noite</option>
              <option value="nublado">☁️ Nublado</option>
            </select>
          </div>
          <label className="row" style={{ marginTop: 8, gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!terrain} onChange={(e) => toggleTerrain(e.target.checked)} />
            🏔️ Relevo (colinas no chão)
          </label>
          {terrain && (
            <>
              <div className="field" style={{ marginTop: 6 }}>
                <label>Altura do relevo (m)</label>
                <input
                  type="number"
                  min={0.2}
                  step={0.2}
                  value={terrain.amplitude}
                  onChange={(e) => setTerrainAmplitude(Number(e.target.value))}
                />
              </div>
              <div className="field" style={{ marginTop: 6 }}>
                <label>Suavidade das colinas (m)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={terrain.scale}
                  onChange={(e) => setTerrainScale(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </FloatingWindow>

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Modelos"
          open={modelsOpen}
          onClose={() => setModelsOpen(false)}
          leftFrac={0.3}
          topFrac={0.06}
          defaultWidth={420}
          defaultHeight={560}
        >
          <ModelLibraryManager
            onPlant={plantFromLibrary}
            onPlantAsPatch={plantAsPatchFromLibrary}
            onPlantAsGround={plantAsGroundFromLibrary}
          />
        </FloatingWindow>

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Objetos"
          open={objectsOpen}
          onClose={() => setObjectsOpen(false)}
          leftFrac={0.62}
          topFrac={0.06}
          defaultWidth={300}
          defaultHeight={520}
        >
          <div className="cine-hud-title">Objetos na cena</div>
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

          {selected ? (
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
          ) : (
            objects.length > 0 && (
              <p className="faint" style={{ fontSize: 12 }}>
                Clique num objeto da lista (ou na cena) pra editar.
              </p>
            )
          )}
        </FloatingWindow>

        <FloatingWindow
          containerRef={floatingLayerRef}
          title="Câmera"
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          leftFrac={0.34}
          topFrac={0.1}
          defaultWidth={260}
          defaultHeight={160}
        >
          <div className="floating-row">
            <span className="floating-row-label">Modo</span>
            <button
              className={'small' + (cameraMode === 'fly' ? ' primary' : '')}
              title="Alterna entre câmera de órbita e voo livre (WASD + Space/Shift + mouse travado, estilo modo criativo) — atalho: tecla 1"
              onClick={toggleCameraMode}
            >
              {cameraMode === 'fly' ? '🕊️ Voo (1)' : '🎥 Órbita (1)'}
            </button>
          </div>
          <p className="faint" style={{ fontSize: 11, margin: '10px 0 0' }}>
            A tecla <b>1</b> alterna entre órbita e voo livre a qualquer momento, mesmo com essa
            janela fechada.
          </p>
        </FloatingWindow>
      </div>
    </div>
  );
}
