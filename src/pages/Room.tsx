import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useIdentity } from '../hooks/useIdentity';
import { activeScene, useTableStore } from '../store/useTableStore';
import { loadMyCharacters } from '../lib/characterLibrary';
import { placeToScene, type Place } from '../lib/placeLibrary';
import { map2dToScene, type Map2D } from '../lib/map2dLibrary';
import { makeScene } from '../types';
import { getLinkedCharacterId } from '../lib/roomLinks';
import { loadProfile } from '../lib/profile';
import { hasFilledProfile } from '../domain/profile';
import { TopBar } from '../components/TopBar';
import { NotificationToasts } from '../components/NotificationToasts';
import { DiceRollFX } from '../components/DiceRollFX';
import { MusicPlayer } from '../components/MusicPlayer';
import { AmbientPlayer } from '../components/AmbientPlayer';
import { BattleMap } from '../components/BattleMap';
import { Battle3D } from '../components/Battle3D';
import { SceneTransition } from '../components/SceneTransition';
import { hasLan } from '../lib/lan';

export function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const { me } = useIdentity();
  const connect = useTableStore((s) => s.connect);
  const disconnect = useTableStore((s) => s.disconnect);
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const connected = useTableStore((s) => s.connected);
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);
  const setActiveCharacter = useTableStore((s) => s.setActiveCharacter);
  const sendProfile = useTableStore((s) => s.sendProfile);
  const linkedPushed = useRef<string | null>(null);

  useEffect(() => {
    if (!code || !me.name.trim()) return;
    // Home.tsx manda a place/mapa escolhido via state da navegação ao
    // hospedar uma mesa nova (ver "Hospedar mesa (3D)"/"Hospedar mesa (2D)")
    // — só faz sentido na primeira vez que ESSE code é hospedado; se já
    // existe cache da mesa, connect() ignora opts.initialScene sozinho (só
    // usa quando não há nada em cache ainda).
    const state = location.state as { place3d?: Place | null; map2d?: Map2D | null } | null;
    const initialScene =
      state && 'place3d' in state
        ? state.place3d
          ? placeToScene(state.place3d)
          : makeScene('Cenário 1', '3d')
        : state && 'map2d' in state
          ? state.map2d
            ? map2dToScene(state.map2d)
            : makeScene('Cenário 1', '2d')
          : undefined;
    connect(code.toUpperCase(), me, initialScene ? { initialScene } : undefined);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const scene = activeScene({ scenes, activeSceneId });

  // Transição entre mesa 2D/3D (pedido do usuário: trocar de cenário hoje é
  // um corte seco) — detecta troca de CENÁRIO (não só de kind, pra também
  // suavizar troca entre dois cenários 3D com assets diferentes) e cobre a
  // tela até `SceneTransition` confirmar que o carregamento de verdade
  // terminou. Não dispara na primeira montagem (entrar na sala), só em
  // trocas subsequentes.
  //
  // BUG achado (usuário: "carregamento travou 2 minutos ao abrir mesa 2D"):
  // `connect()` (useTableStore.ts) seta `scenes`/`activeSceneId` de forma
  // SÍNCRONA na hora de conectar, mas depois troca de novo ASSINCRONAMENTE
  // quando `loadRoom()` (Supabase) e/ou `sync:state` (outros peers) chegam
  // com o estado persistido/real da sala — isso muda `scene.id` pouco
  // depois do primeiro render, SEM o mestre ter trocado de cenário manual
  // nenhuma vez. Antes disso disparava a transição igual a uma troca de
  // verdade — e como podia acontecer de novo (outro `sync:state` chegando),
  // a tela reiniciava antes de terminar, parecendo travada pra sempre.
  // Fix: só passa a "armar" a detecção depois de uma folga curta (a sala
  // real nunca troca de cenário sozinha DEPOIS de assentar a conexão
  // inicial) — antes disso só atualiza a referência, sem mostrar nada.
  const [transitioning, setTransitioning] = useState(false);
  const lastSceneIdRef = useRef<string | null>(null);
  const armedRef = useRef(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      armedRef.current = true;
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (lastSceneIdRef.current === null) {
      lastSceneIdRef.current = scene.id;
      return;
    }
    if (lastSceneIdRef.current !== scene.id) {
      lastSceneIdRef.current = scene.id;
      if (armedRef.current) setTransitioning(true);
    }
  }, [scene.id]);
  const handleTransitionReady = useCallback(() => setTransitioning(false), []);

  // Assim que a conexão de fato abre, empurra a ficha vinculada a esta mesa (se
  // houver) e o perfil do jogador — uma vez só por code, pra não reenviar toda
  // vez que `connected` piscar (reconexão).
  useEffect(() => {
    if (!connected || !code || me.isGM) return;
    if (linkedPushed.current === code) return;
    linkedPushed.current = code;
    const linkedId = getLinkedCharacterId(code);
    if (linkedId) {
      const char = loadMyCharacters().find((c) => c.id === linkedId);
      if (char) {
        upsertCharacter(char);
        setActiveCharacter(char.id);
      }
    }
    const profile = loadProfile();
    if (hasFilledProfile(profile)) sendProfile(me.name, me.id, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, code, me.isGM]);

  if (!code) return <Navigate to="/" replace />;
  if (!me.name.trim()) return <Navigate to={`/?sala=${code}`} replace />;

  return (
    <div className="room">
      <TopBar code={code.toUpperCase()} />
      <NotificationToasts />
      <DiceRollFX />
      {hasLan && <MusicPlayer />}
      {hasLan && <AmbientPlayer />}
      <div className="room-body">
        <div className="map-area">
          {scene.kind === '3d' ? <Battle3D /> : <BattleMap />}
          {transitioning && (
            <SceneTransition
              key={scene.id}
              kind={scene.kind}
              mapImageUrl={scene.kind === '2d' ? scene.map.background : undefined}
              onReady={handleTransitionReady}
            />
          )}
        </div>
      </div>
    </div>
  );
}
