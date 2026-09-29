import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useIdentity } from '../hooks/useIdentity';
import { activeScene, useTableStore } from '../store/useTableStore';
import { loadMyCharacters } from '../lib/characterLibrary';
import { placeToScene, type Place } from '../lib/placeLibrary';
import { makeScene } from '../types';
import { getLinkedCharacterId } from '../lib/roomLinks';
import { loadProfile } from '../lib/profile';
import { hasFilledProfile } from '../domain/profile';
import { TopBar } from '../components/TopBar';
import { DiceRoller } from '../components/DiceRoller';
import { RollLog } from '../components/RollLog';
import { NotificationLog } from '../components/NotificationLog';
import { NotificationToasts } from '../components/NotificationToasts';
import { DiceRollFX } from '../components/DiceRollFX';
import { CharacterPanel } from '../components/CharacterPanel';
import { GmCharacterTabs } from '../components/GmCharacterTabs';
import { PlayerProfilesPanel } from '../components/PlayerProfilesPanel';
import { MusicPanel } from '../components/MusicPanel';
import { MusicPlayer } from '../components/MusicPlayer';
import { TokenPanel } from '../components/TokenPanel';
import { BattleMap } from '../components/BattleMap';
import { Battle3D } from '../components/Battle3D';
import { SceneTransition } from '../components/SceneTransition';
import { hasLan } from '../lib/lan';

type Tab = 'dados' | 'ficha' | 'perfis' | 'tokens' | 'log' | 'notificacoes' | 'musicas';

// Ícones provisórios (emoji) — trocar por símbolos rituais próprios da Ordem
// quando entrar a passada de identidade visual.
const BASE_TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dados', label: 'Dados', icon: '🎲' },
  { key: 'ficha', label: 'Ficha', icon: '📜' },
  { key: 'log', label: 'Histórico', icon: '📖' },
  { key: 'notificacoes', label: 'Notificações', icon: '🔔' },
];

// Cada aba com sua própria cor de destaque, em vez de todas ficarem na mesma
// cor quando ativas — dados e música na cor do elemento Energia (roxo, o
// mesmo elemento que já rege a sorte no Desafio Diário), ficha e
// notificações em vermelho, perfis em dourado. Histórico não tem cor fixa —
// cada rolagem lá dentro já é colorida pelo elemento da ficha de quem rolou
// (ver RollLog.tsx / useTableStore.ts), então o ícone fica neutro/informativo.
const TAB_COLOR: Partial<Record<Tab, string>> = {
  dados: 'var(--purple)',
  musicas: 'var(--purple)',
  ficha: 'var(--blood)',
  notificacoes: 'var(--blood)',
  perfis: 'var(--gold)',
  tokens: 'var(--green)',
  log: 'var(--blue)',
};

export function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const { me } = useIdentity();
  const connect = useTableStore((s) => s.connect);
  const disconnect = useTableStore((s) => s.disconnect);
  const notifications = useTableStore((s) => s.notifications);
  const roomCode = useTableStore((s) => s.code);
  const scenes = useTableStore((s) => s.scenes);
  const activeSceneId = useTableStore((s) => s.activeSceneId);
  const connected = useTableStore((s) => s.connected);
  const upsertCharacter = useTableStore((s) => s.upsertCharacter);
  const setActiveCharacter = useTableStore((s) => s.setActiveCharacter);
  const sendProfile = useTableStore((s) => s.sendProfile);
  const [tab, setTab] = useState<Tab>('dados');
  const [seenNotifCount, setSeenNotifCount] = useState(0);
  // Abas de ficha do mestre (estilo navegador) — vivem aqui, não dentro do
  // painel lateral, pra continuarem abertas quando o mestre troca de aba no
  // trilho de ícones (o painel lateral remonta a cada troca, `key={tab}` logo
  // abaixo).
  const [gmTabs, setGmTabs] = useState<string[]>([]);
  const [activeGmTab, setActiveGmTab] = useState<string | null>(null);
  const openGmTab = (id: string) => {
    setGmTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveGmTab(id);
  };
  const closeGmTab = (id: string) => {
    setGmTabs((t) => {
      const next = t.filter((x) => x !== id);
      setActiveGmTab((cur) => (cur === id ? next[next.length - 1] ?? null : cur));
      return next;
    });
  };
  const seededCode = useRef<string | null | undefined>(undefined);
  const linkedPushed = useRef<string | null>(null);

  // Perfis e Tokens só existem pra quem é mestre; Músicas e Tokens dependem
  // do servidor local (arquivo servido por HTTP), então só aparecem no modo
  // rede local.
  const tabs: { key: Tab; label: string; icon: string }[] = [
    BASE_TABS[0],
    BASE_TABS[1],
    ...(me.isGM ? [{ key: 'perfis' as Tab, label: 'Perfis', icon: '👤' }] : []),
    ...(me.isGM && hasLan ? [{ key: 'tokens' as Tab, label: 'Tokens', icon: '🧩' }] : []),
    ...(hasLan ? [{ key: 'musicas' as Tab, label: 'Músicas', icon: '🎵' }] : []),
    BASE_TABS[2],
    BASE_TABS[3],
  ];

  const myNotifCount = useMemo(
    () => (me.isGM ? notifications : notifications.filter((n) => n.ownerId === me.id)).length,
    [notifications, me.isGM, me.id],
  );
  const unread = Math.max(0, myNotifCount - seenNotifCount);

  const selectTab = (t: Tab) => {
    setTab(t);
    if (t === 'notificacoes') setSeenNotifCount(myNotifCount);
  };

  useEffect(() => {
    // ao (re)conectar numa sala, o que já veio do cache/sync não conta como "novo" —
    // só o que chegar depois disso vira selo de não-lida no sino do trilho.
    if (seededCode.current !== roomCode) {
      setSeenNotifCount(myNotifCount);
      seededCode.current = roomCode;
    }
  }, [roomCode, myNotifCount]);

  useEffect(() => {
    if (!code || !me.name.trim()) return;
    // Home.tsx manda a place escolhida via state da navegação ao hospedar uma
    // mesa 3D nova (ver "Hospedar mesa (3D)") — só faz sentido na primeira vez
    // que ESSE code é hospedado; se já existe cache da mesa, connect() ignora
    // opts.initialScene sozinho (só usa quando não há nada em cache ainda).
    const state = location.state as { place3d?: Place | null } | null;
    const initialScene = state && 'place3d' in state ? (state.place3d ? placeToScene(state.place3d) : makeScene('Cenário 1', '3d')) : undefined;
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

  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  return (
    <div className="room">
      <TopBar code={code.toUpperCase()} />
      <NotificationToasts />
      <DiceRollFX />
      {hasLan && <MusicPlayer />}
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
        <div className="sidebar">
          <div className="icon-rail">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? 'active' : ''}
                style={{ '--tab-accent': TAB_COLOR[t.key] } as CSSProperties}
                title={t.label}
                onClick={() => selectTab(t.key)}
              >
                <span className="ir-ico">{t.icon}</span>
                {t.key === 'notificacoes' && unread > 0 && (
                  <span className="ir-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </button>
            ))}
          </div>
          <div className="sidebar-panel" style={{ '--tab-accent': TAB_COLOR[tab] } as CSSProperties}>
            <div className="sidebar-panel-head">
              <span>{active.icon}</span> {active.label}
            </div>
            <div className="tab-content" key={tab}>
              {tab === 'dados' && <DiceRoller />}
              {tab === 'ficha' &&
                (me.isGM ? (
                  <GmCharacterTabs
                    openIds={gmTabs}
                    activeId={activeGmTab}
                    onOpen={openGmTab}
                    onClose={closeGmTab}
                    onSelect={setActiveGmTab}
                  />
                ) : (
                  <CharacterPanel />
                ))}
              {tab === 'perfis' && me.isGM && <PlayerProfilesPanel />}
              {tab === 'tokens' && me.isGM && <TokenPanel />}
              {tab === 'musicas' && <MusicPanel />}
              {tab === 'log' && <RollLog />}
              {tab === 'notificacoes' && <NotificationLog />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
