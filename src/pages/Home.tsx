import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIdentity } from '../hooks/useIdentity';
import { hasSupabase } from '../lib/supabase';
import { newRoomCode } from '../lib/ids';
import { hasLan, LAN_INFO, LanControl, type LanTable } from '../lib/lan';
import { loadMyCharacters } from '../lib/characterLibrary';
import { getLinkedCharacterId, setLinkedCharacterId } from '../lib/roomLinks';
import { recordMatch } from '../lib/matchHistory';
import { loadSavedTables, recordSavedTable, deleteSavedTable, type SavedTable } from '../lib/savedTables';
import type { Character } from '../domain/character';
import { CLASS_BY_KEY } from '../data/ordem';
import { ProfileEditor } from '../components/ProfileEditor';
import { CharacterLibrary } from '../components/CharacterLibrary';
import { MatchHistoryPanel } from '../components/MatchHistoryPanel';
import { DailyChallengePanel } from '../components/DailyChallengePanel';
import { MusicLibraryManager } from '../components/MusicLibraryManager';
import { AmbientLibraryManager } from '../components/AmbientLibraryManager';
import { TokenLibraryManager } from '../components/TokenLibraryManager';
import { SceneryLibraryManager } from '../components/SceneryLibraryManager';
import { MapLibraryManager } from '../components/MapLibraryManager';
import { PlaceLibraryManager } from '../components/PlaceLibraryManager';
import { Map2DLibraryManager } from '../components/Map2DLibraryManager';
import type { Map2D } from '../lib/map2dLibrary';
// SigilFlicker (sigilos aleatórios piscando sobre o vídeo de fundo antigo)
// não é usado nesta tela desde o redesign do Passo 2 — o componente continua
// em ../components/SigilFlicker.tsx pra uso futuro em outra tela, se fizer
// sentido.
import { ALL_MENU_TRACKS } from '../data/menuTracks';
import { isTrackUnlocked } from '../lib/menuTracks';
import { useMenuMusicStore } from '../state/menuMusic';

type Role = 'gm' | 'player';
type View = 'hub' | 'profile' | 'library' | 'connect' | 'history' | 'daily' | 'gm-area' | 'extras';
type GmAreaTab = 'music' | 'ambient' | 'tokens' | 'scenery' | 'maps' | 'places';
type ExtrasTab = 'minigames';

const PALETTE = ['#e01e2b', '#7b2cbf', '#2fae66', '#e8b21e', '#3f7fd6', '#ff8fab', '#d4a373'];
// 5 cores pra tela "Entrar numa mesa" (redesign Passo 3, pedido explícito de
// "cor, 5 opções") — reaproveita as 5 primeiras da paleta acima em vez de
// criar uma paleta nova só pra essa tela.
const ROLE_COLORS = PALETTE.slice(0, 5);

export function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { me, update } = useIdentity();

  const codeFromLink = (params.get('sala') ?? '').toUpperCase();
  // Link de convite pula direto pra tela de conectar.
  const [view, setView] = useState<View>(codeFromLink ? 'connect' : 'hub');
  // Se veio de um link de convite, já cai na aba de jogador.
  const [role, setRole] = useState<Role | null>(codeFromLink ? 'player' : me.isGM ? 'gm' : null);
  const [code, setCode] = useState(codeFromLink);
  const [error, setError] = useState('');
  const [gmAreaTab, setGmAreaTab] = useState<GmAreaTab>('music');
  const [extrasTab, setExtrasTab] = useState<ExtrasTab>('minigames');
  // Item em destaque no menu principal (redesign Passo 2) — hover/foco troca
  // qual item fica grande, com descrição e dica "ENTER"; o clique continua
  // navegando direto, não depende desse estado. Começa em 2 = "Entrar numa
  // Mesa", o item já destacado (classe .featured) no menu antigo.
  const [activeIdx, setActiveIdx] = useState(2);

  // Trilha sonora ambiente do menu — quem realmente toca é o MenuMusicController
  // (montado globalmente em App.tsx, sobrevive à troca de rota); aqui só lê e
  // manda mudanças pro estado compartilhado.
  const menuTrack = useMenuMusicStore((s) => s.track);
  const menuPlaying = useMenuMusicStore((s) => s.playing);
  const setMenuPlaying = useMenuMusicStore((s) => s.setPlaying);
  const changeMenuTrack = useMenuMusicStore((s) => s.changeTrack);

  // ---- ficha que o jogador leva pra mesa ----
  const [myChars, setMyChars] = useState<Character[]>(loadMyCharacters);
  const [chosenCharId, setChosenCharId] = useState<string | null>(
    codeFromLink ? getLinkedCharacterId(codeFromLink) : null,
  );

  // ---- modo rede local (executável) ----
  const [tableName, setTableName] = useState(`Mesa de ${me.name || 'Fulano'}`);
  const [hosting, setHosting] = useState(false);
  const [tables, setTables] = useState<LanTable[]>([]);
  const [manualAddr, setManualAddr] = useState('');
  const lanRef = useRef<LanControl | null>(null);
  // o callback onHosting é criado só quando o efeito roda (dep [role]) — usar um
  // ref garante que ele sempre lê o nome/cor mais recentes, não um valor preso.
  const tableNameRef = useRef(tableName);
  tableNameRef.current = tableName;
  const meRef = useRef(me);
  meRef.current = me;
  // Guarda o mapa escolhido (sempre `null` = em branco agora — redesign Passo 3
  // removeu a escolha de cenário 3D nesta tela, 2D/3D passou a se escolher só
  // DENTRO da mesa) entre o clique em "Hospedar mesa" e o `onHosting` disparar.
  const pending2dRef = useRef<{ map2d: Map2D | null } | undefined>(undefined);

  // ---- mesas salvas (redesign Passo 3: feature nova) ----
  // Toda mesa hospedada com sucesso entra aqui (ver savedTables.ts) pra
  // reaparecer em "Jogar numa mesa já criada" da próxima vez.
  const [savedTables, setSavedTables] = useState<SavedTable[]>(loadSavedTables);
  const [masterTab, setMasterTab] = useState<'saved' | 'new'>(
    savedTables.length > 0 ? 'saved' : 'new',
  );

  useEffect(() => {
    if (!hasLan || role === null) return;
    const ctl = new LanControl();
    lanRef.current = ctl;
    ctl.connect({
      onHosting: (v) => {
        setHosting(v);
        if (v && LAN_INFO) {
          const addr = `${LAN_INFO.localIp}:${LAN_INFO.port}`;
          const name = tableNameRef.current.trim() || 'Mesa';
          recordMatch(addr, 'gm', name);
          setSavedTables(
            recordSavedTable({
              name,
              masterName: meRef.current.name,
              masterColor: meRef.current.color,
            }),
          );
          const pending2d = pending2dRef.current;
          pending2dRef.current = undefined;
          navigate(`/sala/${addr}`, pending2d ? { state: { map2d: pending2d.map2d } } : undefined);
        }
      },
      onTables: (t) => setTables(t),
    });
    if (role === 'player') ctl.discoverStart();
    return () => {
      ctl.discoverStop();
      ctl.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const enter = (roomCode: string) => {
    if (!me.name.trim()) return setError('Escolha um nome.');
    if (role === 'player' && roomCode.trim().length < 4)
      return setError('Digite o código da mesa que o mestre te passou.');
    if (role === 'player') setLinkedCharacterId(roomCode, chosenCharId);
    recordMatch(roomCode, role === 'gm' ? 'gm' : 'player');
    navigate(`/sala/${roomCode.toUpperCase()}`);
  };

  const pickRole = (r: Role) => {
    setRole(r);
    setError('');
    update({ isGM: r === 'gm' });
    if (r === 'gm') {
      const list = loadSavedTables();
      setSavedTables(list);
      setMasterTab(list.length > 0 ? 'saved' : 'new');
    }
  };

  const hostLan = () => {
    if (!me.name.trim()) return setError('Escolha um nome.');
    lanRef.current?.hostStart(tableName.trim() || 'Mesa');
  };

  // Re-hospeda uma mesa salva com os mesmos dados (nome/cor do mestre, nome
  // da mesa) sem passar pela validação/estado de hostLan — a mesa salva já
  // tem tudo preenchido, então vai direto pro LanControl.
  const hostSavedTable = (t: SavedTable) => {
    if (hosting) return;
    update({ name: t.masterName, color: t.masterColor });
    setTableName(t.name);
    pending2dRef.current = { map2d: null };
    lanRef.current?.hostStart(t.name);
  };

  const removeSavedTable = (id: string) => {
    setSavedTables(deleteSavedTable(id));
  };

  const joinLan = (addr: string, name?: string) => {
    if (!me.name.trim()) return setError('Escolha um nome.');
    if (!addr.includes(':')) return setError('Endereço inválido — use host:porta.');
    setLinkedCharacterId(addr, chosenCharId);
    recordMatch(addr, 'player', name);
    navigate(`/sala/${addr}`);
  };

  const goToLibrary = () => {
    setMyChars(loadMyCharacters()); // pega o que já existir antes de abrir
    setView('library');
  };

  if (view === 'profile') {
    return <ProfileEditor onBack={() => setView('hub')} />;
  }

  if (view === 'library') {
    return (
      <CharacterLibrary
        ownerId={me.id}
        defaultPlayer={me.name}
        onBack={() => {
          setMyChars(loadMyCharacters());
          setView('hub');
        }}
      />
    );
  }

  if (view === 'history') {
    return (
      <div className="home">
        <MatchHistoryPanel onBack={() => setView('hub')} />
      </div>
    );
  }

  if (view === 'daily') {
    return <DailyChallengePanel onBack={() => setView('extras')} />;
  }

  if (view === 'extras') {
    return (
      <div className="daily-page gm-area-page">
        <img className="daily-sigil-corner" src="/sigils/sigil-ornate.png" alt="" aria-hidden />

        <div className="daily-topbar">
          <Sigil />
          <span>O Outro Lado da Mesa</span>
        </div>

        <div className="daily-content gm-area-content">
          <button className="daily-back" onClick={() => setView('hub')}>
            ← Voltar
          </button>

          <h1 className="daily-title">Extras</h1>
          <div className="daily-title-rule" />

          <div className="chip-row gm-area-tabs">
            <span
              className={`chip ${extrasTab === 'minigames' ? 'on' : ''}`}
              onClick={() => setExtrasTab('minigames')}
            >
              🎲 Mini-jogos
            </span>
          </div>

          {extrasTab === 'minigames' && (
            <>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Joguinhos à parte, sem relação com a mesa em si.
              </p>
              <div className="asset-grid">
                <button className="asset-card minigame-card" onClick={() => setView('daily')}>
                  <div className="asset-thumb minigame-thumb">🎲</div>
                  <span className="asset-name">Desafio Diário</span>
                  <span className="faint" style={{ fontSize: 11 }}>
                    Teste sua sorte de 3 em 3h e desbloqueie músicas do menu.
                  </span>
                </button>
                <button className="asset-card minigame-card" onClick={() => navigate('/teste-minigame')}>
                  <div className="asset-thumb minigame-thumb">🧟</div>
                  <span className="asset-name">Combate (protótipo)</span>
                  <span className="faint" style={{ fontSize: 11 }}>
                    Deckbuilder por turnos em construção — crie um personagem e enfrente o Zumbi
                    de Sangue Emergente.
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="daily-sigil-small">
          <Sigil />
          <span className="daily-sigil-line" />
        </div>
      </div>
    );
  }

  if (view === 'gm-area') {
    return (
      <div className="daily-page gm-area-page">
        <img className="daily-sigil-corner" src="/sigils/sigil-circle.png" alt="" aria-hidden />

        <div className="daily-topbar">
          <Sigil />
          <span>O Outro Lado da Mesa</span>
        </div>

        <div className="daily-content gm-area-content">
          <button className="daily-back" onClick={() => setView('hub')}>
            ← Voltar
          </button>

          <h1 className="daily-title">Área do Mestre</h1>
          <div className="daily-title-rule" />

          <p className="daily-rule-box">
            Prepare tudo com calma antes da mesa — músicas, tokens e mapas ficam salvos aqui,
            prontos pra usar em qualquer mesa que <b>você criar como mestre</b>.
          </p>

          <div className="chip-row gm-area-tabs">
            <span
              className={`chip ${gmAreaTab === 'music' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('music')}
            >
              🎵 Músicas
            </span>
            <span
              className={`chip ${gmAreaTab === 'ambient' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('ambient')}
            >
              🔊 Sons Ambiente
            </span>
            <span
              className={`chip ${gmAreaTab === 'tokens' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('tokens')}
            >
              🧩 Tokens
            </span>
            <span
              className={`chip ${gmAreaTab === 'scenery' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('scenery')}
            >
              🧱 Cenário 2D
            </span>
            <span
              className={`chip ${gmAreaTab === 'maps' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('maps')}
            >
              🗺 Mapas
            </span>
            <span
              className={`chip ${gmAreaTab === 'places' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('places')}
            >
              🧊 Cenários 3D
            </span>
          </div>

          {gmAreaTab === 'music' && (
            <>
              <div className="row" style={{ alignItems: 'center', marginBottom: 4 }}>
                <div className="section-title" style={{ margin: 0, flex: 1 }}>
                  Música do menu
                </div>
                <button className="small" onClick={() => setMenuPlaying(!menuPlaying)}>
                  {menuPlaying ? '⏸ Pausar' : '▶ Tocar'}
                </button>
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Escolha qual faixa toca em loop nas telas do menu. Ganhe o Desafio Diário pra
                desbloquear as outras.
              </p>
              <div className="menu-track-list">
                {ALL_MENU_TRACKS.map((t) => {
                  const unlocked = isTrackUnlocked(t.id);
                  const active = menuTrack.id === t.id;
                  return (
                    <button
                      key={t.id}
                      className={'menu-track-row' + (active ? ' active' : '') + (unlocked ? '' : ' locked')}
                      disabled={!unlocked}
                      onClick={() => (unlocked ? changeMenuTrack(t) : undefined)}
                      title={unlocked ? undefined : 'Ganhe o Desafio Diário pra desbloquear'}
                    >
                      <span className="menu-track-name">{unlocked ? t.name : '🔒 ???'}</span>
                      {active && (
                        <span className="menu-track-playing">
                          {menuPlaying ? 'tocando agora' : 'pausada'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="section-title">Biblioteca compartilhada</div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Importe músicas do seu computador e organize em pastas — dá pra ouvir uma prévia por
                aqui; pra tocar pra mesa toda, use a aba Músicas dentro da mesa.
              </p>
              <MusicLibraryManager mode="preview" />
            </>
          )}

          {gmAreaTab === 'ambient' && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>
                Sons ambiente
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Importe efeitos do seu computador (porta abrindo, trovão, passos...) e organize em
                pastas — área separada da música. Pra disparar pra mesa toda durante a sessão, use a
                aba "Sons" dentro da mesa.
              </p>
              <AmbientLibraryManager mode="preview" />
            </>
          )}

          {gmAreaTab === 'tokens' && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>
                Tokens
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Importe imagens do seu computador — uma a uma ou uma pasta inteira de uma vez — e
                organize em pastas. Ficam prontas pra colocar em qualquer mesa que você criar como
                mestre.
              </p>
              <TokenLibraryManager />
            </>
          )}

          {gmAreaTab === 'scenery' && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>
                Mapas montados
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Monte o mapa aqui (plante paredes, móveis, texturas de chão) e salve — fica pronto
                pra escolher como ponto de partida ao hospedar uma mesa 2D. Dentro da mesa o
                cenário fica travado (só os tokens se mexem), pra manter o jogo limpo.
              </p>
              <Map2DLibraryManager />

              <div className="section-title" style={{ marginTop: 22 }}>
                Peças soltas
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Estoque de peças pra usar nos mapas acima — móveis, paredes, texturas de chão.
                Importe uma pasta inteira organizada em subpastas e cada subpasta vira uma
                categoria aqui.
              </p>
              <SceneryLibraryManager />
            </>
          )}

          {gmAreaTab === 'maps' && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>
                Mapas
              </div>
              <MapLibraryManager />
            </>
          )}

          {gmAreaTab === 'places' && (
            <>
              <div className="section-title" style={{ marginTop: 0 }}>
                Cenários 3D
              </div>
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                Monte um cenário na câmera livre (objetos em pé, textura de chão) e salve — fica
                pronto pra usar como ponto de partida em qualquer mesa 3D. Ainda experimental.
                <br />
                Precisa de modelos 3D pra importar?{' '}
                <a href="https://poly.pizza" target="_blank" rel="noopener noreferrer">
                  Poly Pizza
                </a>{' '}
                tem um catálogo grande de modelos gratuitos em .glb, prontos pra importar aqui.
              </p>
              <PlaceLibraryManager />
            </>
          )}
        </div>

        <div className="daily-sigil-small">
          <Sigil />
          <span className="daily-sigil-line" />
        </div>
      </div>
    );
  }

  if (view === 'hub') {
    type MenuItem = { key: string; label: string; desc: string; icon: ReactNode; onClick: () => void };
    const menuItems: MenuItem[] = [
      {
        key: 'profile',
        label: 'Meu Perfil',
        desc: 'Nome, cor e preferências do agente',
        icon: <ProfileIcon />,
        onClick: () => setView('profile'),
      },
      {
        key: 'library',
        label: `Minhas Fichas${myChars.length > 0 ? ` (${myChars.length})` : ''}`,
        desc:
          myChars.length > 0
            ? `${myChars.length} ficha${myChars.length > 1 ? 's' : ''} salva${myChars.length > 1 ? 's' : ''} · criar, editar e duplicar`
            : 'Nenhuma ficha salva ainda · criar a primeira',
        icon: <FichasIcon />,
        onClick: goToLibrary,
      },
      {
        key: 'connect',
        label: 'Entrar numa Mesa',
        desc: hasLan
          ? 'Hospede ou encontre mesas na sua rede local'
          : 'Conecte-se à mesa do mestre pelo código',
        icon: <EnterIcon />,
        onClick: () => setView('connect'),
      },
      {
        key: 'history',
        label: 'Histórico de Mesas',
        desc: 'Sessões anteriores e como você entrou nelas',
        icon: <HistoryIcon />,
        onClick: () => setView('history'),
      },
      {
        key: 'extras',
        label: 'Extras',
        desc: 'Desafio diário, mini-jogos e utilidades',
        icon: <ExtrasIcon />,
        onClick: () => setView('extras'),
      },
    ];
    if (hasLan) {
      menuItems.push({
        key: 'gm-area',
        label: 'Área do Mestre',
        desc: 'Prepare músicas, tokens e mapas para suas mesas',
        icon: <GmAreaIcon />,
        onClick: () => setView('gm-area'),
      });
    }

    const netMode = hasLan
      ? {
          dot: '#3ddc84',
          title: 'MODO REDE LOCAL',
          sub: 'Sem internet nem contas · todos na mesma rede (ex.: Radmin VPN)',
        }
      : hasSupabase
        ? {
            dot: '#00e5ff',
            title: 'MODO ONLINE',
            sub: 'O mestre compartilha o link e todos jogam juntos',
          }
        : {
            dot: '#6a6b73',
            title: 'MODO LOCAL (SÓ NESTE NAVEGADOR)',
            sub: 'Configure o Supabase (README) para jogar pela internet',
          };

    const playerLabel = me.name.trim() || 'Agente';
    const avatarInitial = playerLabel.charAt(0).toUpperCase();

    return (
      <div className="rd-menu">
        <div className="rd-menu-bg" aria-hidden="true">
          <div className="rd-menu-fog rd-menu-fog-a" />
          <div className="rd-menu-fog rd-menu-fog-b" />
          <svg className="rd-menu-grain" aria-hidden="true" focusable="false">
            <filter id="rd-menu-noise">
              <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.2" />
            </filter>
            <rect width="100%" height="100%" filter="url(#rd-menu-noise)" />
          </svg>
          <div className="rd-scanlines" />
          <div className="rd-vignette" />
        </div>

        <header className="rd-menu-top">
          <div className="rd-menu-top-brand">
            <Sigil />
            <span>O Outro Lado da Mesa</span>
          </div>
          <div className="rd-menu-top-actions">
            <button className="rd-menu-player" onClick={() => setView('profile')}>
              <span
                className="rd-menu-player-avatar"
                style={{ background: `color-mix(in srgb, ${me.color} 26%, #09070a)`, color: me.color }}
              >
                {avatarInitial}
              </span>
              <span className="rd-menu-player-info">
                <span className="rd-menu-player-name">{playerLabel}</span>
                <span className="rd-menu-player-meta">
                  AGENTE · {myChars.length} FICHA{myChars.length === 1 ? '' : 'S'}
                </span>
              </span>
            </button>
            <button className="rd-menu-settings" aria-label="Configurações" onClick={() => setView('profile')}>
              <GearIcon />
            </button>
          </div>
        </header>

        <div className="rd-menu-body">
          <nav className="rd-menu-nav" aria-label="Menu principal">
            <span className="rd-menu-nav-label">// Selecione um arquivo</span>
            {menuItems.map((it, i) => {
              const active = activeIdx === i;
              return (
                <div key={it.key}>
                  <button
                    className={`rd-menu-item${active ? ' active' : ''}`}
                    onClick={it.onClick}
                    onMouseEnter={() => setActiveIdx(i)}
                    onFocus={() => setActiveIdx(i)}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span className="rd-menu-item-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="rd-menu-item-icon">{it.icon}</span>
                    <span className="rd-menu-item-bar" />
                    <span>{it.label}</span>
                  </button>
                  {active && (
                    <div className="rd-menu-item-desc">
                      <span className="rd-menu-item-desc-text">{it.desc}</span>
                      <span className="rd-menu-item-enter">ENTER</span>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="rd-menu-sigil" aria-hidden="true">
            <div className="rd-menu-sigil-stage">
              <svg className="rd-menu-ring rd-menu-ring-outer" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="96" fill="none" stroke="var(--rd-sangue-line)" strokeWidth="0.5" strokeDasharray="1 3" />
                <circle cx="100" cy="100" r="90" fill="none" stroke="var(--rd-sangue-deep)" strokeWidth="0.4" />
                <path d="M100 2v6M100 192v6M2 100h6M192 100h6" stroke="var(--rd-sangue)" strokeWidth="0.8" />
                <text
                  x="100"
                  y="15"
                  textAnchor="middle"
                  fill="var(--rd-sangue)"
                  fontFamily="var(--rd-font-mono)"
                  fontSize="4"
                  letterSpacing="1.5"
                >
                  ESTE LADO · O OUTRO LADO
                </text>
              </svg>
              <svg className="rd-menu-ring rd-menu-ring-inner" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="98" fill="none" stroke="var(--rd-sangue-deep)" strokeWidth="0.6" strokeDasharray="14 6 2 6" />
              </svg>
              <img className="rd-menu-sigil-img" src="/sigils/sigilo-original.svg" alt="" />
            </div>
            <span className="rd-menu-signal">● SINAL DETECTADO</span>
          </div>
        </div>

        <footer className="rd-menu-footer">
          <span className="rd-menu-footer-note">Mesa de fã para jogar com os amigos · sem fins comerciais</span>
          <div className="rd-menu-net-card" style={{ '--rd-net-dot': netMode.dot } as CSSProperties}>
            <span className="rd-menu-net-dot" />
            <div className="rd-menu-net-text">
              <span className="rd-menu-net-title">{netMode.title}</span>
              <span className="rd-menu-net-sub">{netMode.sub}</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  const crumb =
    role === null
      ? '// ESCOLHA COMO ENTRAR'
      : role === 'gm'
        ? masterTab === 'saved'
          ? '// MESTRE · SUAS MESAS'
          : '// MESTRE · NOVA MESA'
        : hasLan
          ? '// JOGADOR · PROCURAR MESAS'
          : '// JOGADOR · CÓDIGO DA MESA';

  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR');

  return (
    <div className="rd-connect">
      <div className="rd-connect-bg" aria-hidden="true">
        <div className="rd-menu-fog rd-menu-fog-a" />
        <div className="rd-menu-fog rd-menu-fog-b" />
        <div className="rd-scanlines" />
        <div className="rd-vignette" />
      </div>

      <div className="rd-connect-top">
        <Sigil />
        <span
          style={{
            fontFamily: 'var(--rd-font-disp)',
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          O Outro Lado da Mesa
        </span>
      </div>

      <div className="rd-connect-main">
        <div className="rd-connect-head">
          <button
            className="rd-connect-back"
            onClick={() => (role === null ? setView('hub') : setRole(null))}
          >
            <BackArrowIcon />
            {role === null ? 'VOLTAR' : 'TROCAR PAPEL'}
          </button>
          <div className="rd-connect-head-row">
            <h1 className="rd-connect-title">
              ENTRAR NUMA <span>MESA</span>
            </h1>
            <span className="rd-connect-crumb">{crumb}</span>
          </div>
          <p className="rd-connect-sub">
            Tabletop virtual de <b>Ordem Paranormal</b>.{' '}
            {hasLan
              ? 'A mesa roda no computador do mestre, na sua rede (Radmin ou LAN), e todo mundo entra sem servidor nenhum.'
              : 'O mestre transmite a mesa pela internet e os jogadores entram só com o código.'}
          </p>
        </div>

        {role === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p className="rd-connect-kicker">O outro lado te espera</p>
              <div className="rd-connect-label">Como você vai entrar?</div>
            </div>
            <div className="rd-role-grid">
              <button className="rd-role-card rd-role-card-gm" onClick={() => pickRole('gm')}>
                <span className="rd-role-icon-chip">
                  <GmIcon />
                </span>
                <div className="rd-role-body">
                  <span className="rd-role-eyebrow">Mestre</span>
                  <strong>Conduzir a mesa</strong>
                  <p>
                    {hasLan
                      ? 'Abra uma mesa que você já preparou ou crie uma nova. Ela roda nesta máquina e você controla o mapa.'
                      : 'Crie a mesa, controle o mapa e transmita pros jogadores pelo código.'}
                  </p>
                </div>
                <span className="rd-role-cta">
                  Entrar como mestre <ArrowIcon />
                </span>
              </button>
              <button className="rd-role-card rd-role-card-player" onClick={() => pickRole('player')}>
                <span className="rd-role-icon-chip">
                  <PlayerIcon />
                </span>
                <div className="rd-role-body">
                  <span className="rd-role-eyebrow">Jogador</span>
                  <strong>Entrar na mesa</strong>
                  <p>
                    {hasLan
                      ? 'Veja as mesas abertas na rede e entre com um clique, levando uma das suas fichas.'
                      : 'Entre na mesa do mestre com o código do convite, levando uma das suas fichas.'}
                  </p>
                </div>
                <span className="rd-role-cta">
                  {hasLan ? 'Procurar mesas' : 'Entrar com código'} <ArrowIcon />
                </span>
              </button>
            </div>
          </div>
        )}

        {role === 'gm' && hasLan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 860 }}>
            <div className="rd-opt-tabs" role="tablist" aria-label="Opções do mestre">
              <button
                role="tab"
                aria-selected={masterTab === 'saved'}
                className={`rd-opt-tab${masterTab === 'saved' ? ' active' : ''}`}
                onClick={() => setMasterTab('saved')}
              >
                <span className="rd-opt-tab-icon">
                  <SavedTableIcon />
                </span>
                <span className="rd-opt-tab-text">
                  <span className="rd-opt-tab-title">Jogar numa mesa já criada</span>
                  <span className="rd-opt-tab-desc">
                    Continue de onde parou — nome e cor do mestre já preenchidos.
                  </span>
                </span>
              </button>
              <button
                role="tab"
                aria-selected={masterTab === 'new'}
                className={`rd-opt-tab${masterTab === 'new' ? ' active' : ''}`}
                onClick={() => setMasterTab('new')}
              >
                <span className="rd-opt-tab-icon">
                  <NewTableIcon />
                </span>
                <span className="rd-opt-tab-text">
                  <span className="rd-opt-tab-title">Criar nova mesa</span>
                  <span className="rd-opt-tab-desc">Comece uma campanha do zero.</span>
                </span>
              </button>
            </div>

            {masterTab === 'saved' && (
              <div className="rd-connect-panel">
                <div className="rd-connect-panel-head">
                  <span className="rd-connect-panel-title">Suas mesas · {savedTables.length}</span>
                  <span className="rd-connect-panel-note">salvas neste computador</span>
                </div>
                {savedTables.length === 0 ? (
                  <p className="rd-connect-empty">
                    Nenhuma mesa salva ainda — hospede uma em "Criar nova mesa" e ela aparece aqui
                    pra abrir de novo depois, com seu nome e cor já preenchidos.
                  </p>
                ) : (
                  <div className="rd-table-list">
                    {savedTables.map((t) => {
                      const isOpening = hosting && tableName === t.name;
                      return (
                        <div
                          key={t.id}
                          className="rd-table-row"
                          style={{ '--rd-row-color': t.masterColor } as CSSProperties}
                        >
                          <span className="rd-table-row-thumb">
                            <MesaIcon />
                          </span>
                          <span className="rd-table-row-info">
                            <span className="rd-table-row-name">{t.name}</span>
                            <span className="rd-table-row-meta">
                              Mestre {t.masterName} · {t.timesHosted} sessão
                              {t.timesHosted === 1 ? '' : 'ões'} · última vez {fmtDate(t.lastHostedAt)}
                            </span>
                          </span>
                          <button
                            className="rd-table-row-play"
                            disabled={hosting}
                            onClick={() => hostSavedTable(t)}
                          >
                            {isOpening ? 'ABRINDO…' : 'JOGAR'}
                          </button>
                          <button
                            className="rd-table-row-del"
                            aria-label={`Excluir "${t.name}" da lista`}
                            disabled={hosting}
                            onClick={() => removeSavedTable(t.id)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {masterTab === 'new' && (
              <div className="rd-connect-panel">
                <div className="rd-form-grid">
                  <label className="rd-field">
                    <span className="rd-field-label">Seu nome (mestre)</span>
                    <input
                      autoFocus
                      className="rd-input"
                      value={me.name}
                      placeholder="Ex.: Mestre Kléber"
                      onChange={(e) => {
                        update({ name: e.target.value });
                        setError('');
                      }}
                    />
                  </label>
                  <div className="rd-field">
                    <span className="rd-field-label">Cor</span>
                    <div className="rd-color-row">
                      {ROLE_COLORS.map((c) => (
                        <button
                          key={c}
                          aria-label={`Usar a cor ${c}`}
                          aria-pressed={me.color === c}
                          className={`rd-color-swatch${me.color === c ? ' selected' : ''}`}
                          style={{ background: c, boxShadow: me.color === c ? `0 0 14px ${c}` : 'none' }}
                          onClick={() => update({ color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <label className="rd-field">
                  <span className="rd-field-label">Nome da mesa</span>
                  <input
                    className="rd-input"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Mesa de sexta"
                  />
                </label>
                <button
                  className="rd-connect-host-btn"
                  disabled={hosting}
                  onClick={() => {
                    if (!me.name.trim()) return setError('Escolha um nome.');
                    // Antes essa decisão incluía escolher cenário 3D antes de
                    // entrar — pedido do usuário no redesign: removido, 2D/3D
                    // se escolhe DENTRO da mesa (janela flutuante "Mestre"/
                    // "Mapas", ver BattleMap.tsx), não mais aqui. Sempre entra
                    // com um mapa 2D em branco.
                    pending2dRef.current = { map2d: null };
                    hostLan();
                  }}
                >
                  <HostIcon />
                  {hosting ? 'MESA NO AR · ESPERANDO JOGADORES' : 'HOSPEDAR MESA'}
                </button>
                <div className="rd-connect-info">
                  <span className="rd-connect-info-dot" />
                  <p>
                    A mesa aparece sozinha pra quem estiver na mesma rede (Radmin VPN ou Wi-Fi). O
                    modo 2D ou 3D você escolhe lá dentro. Endereço:{' '}
                    <b>
                      {LAN_INFO?.localIp}:{LAN_INFO?.port}
                    </b>
                  </p>
                </div>
                {error && <p className="rd-connect-error">{error}</p>}
              </div>
            )}
          </div>
        )}

        {role === 'gm' && !hasLan && (
          <div className="rd-connect-panel" style={{ maxWidth: 860 }}>
            <div className="rd-form-grid">
              <label className="rd-field">
                <span className="rd-field-label">Seu nome (mestre)</span>
                <input
                  autoFocus
                  className="rd-input"
                  value={me.name}
                  placeholder="Ex.: Mestre Kléber"
                  onChange={(e) => {
                    update({ name: e.target.value });
                    setError('');
                  }}
                />
              </label>
              <div className="rd-field">
                <span className="rd-field-label">Cor</span>
                <div className="rd-color-row">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c}
                      aria-label={`Usar a cor ${c}`}
                      aria-pressed={me.color === c}
                      className={`rd-color-swatch${me.color === c ? ' selected' : ''}`}
                      style={{ background: c, boxShadow: me.color === c ? `0 0 14px ${c}` : 'none' }}
                      onClick={() => update({ color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button className="rd-connect-host-btn" onClick={() => enter(newRoomCode())}>
              <HostIcon />
              Criar mesa
            </button>
            <div className="rd-divider" />
            <label className="rd-field">
              <span className="rd-field-label">…ou reabrir uma mesa existente</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="rd-input rd-input-mono"
                  value={code}
                  placeholder="CÓDIGO"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                />
                <button className="rd-btn-ghost" disabled={code.length < 4} onClick={() => enter(code)}>
                  Abrir
                </button>
              </div>
            </label>
            {error && <p className="rd-connect-error">{error}</p>}
          </div>
        )}

        {role === 'player' && (
          <div className={hasLan ? 'rd-player-grid' : undefined} style={!hasLan ? { maxWidth: 480 } : undefined}>
            <div className={hasLan ? 'rd-player-col' : undefined}>
              <div className="rd-connect-panel">
                <div className="rd-form-grid">
                  <label className="rd-field">
                    <span className="rd-field-label">Seu nome</span>
                    <input
                      autoFocus
                      className="rd-input"
                      value={me.name}
                      placeholder="Ex.: Turma do Kléber"
                      onChange={(e) => {
                        update({ name: e.target.value });
                        setError('');
                      }}
                    />
                  </label>
                  <div className="rd-field">
                    <span className="rd-field-label">Cor</span>
                    <div className="rd-color-row">
                      {ROLE_COLORS.map((c) => (
                        <button
                          key={c}
                          aria-label={`Usar a cor ${c}`}
                          aria-pressed={me.color === c}
                          className={`rd-color-swatch${me.color === c ? ' selected' : ''}`}
                          style={{ background: c, boxShadow: me.color === c ? `0 0 14px ${c}` : 'none' }}
                          onClick={() => update({ color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <label className="rd-field">
                  <span className="rd-field-label">Ficha que você vai usar</span>
                  {myChars.length === 0 ? (
                    <p className="rd-field-no-chars">
                      Você ainda não tem nenhuma ficha —{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToLibrary();
                        }}
                      >
                        criar uma agora
                      </a>
                      . Também dá pra entrar sem ficha, só pra observar/rolar dados soltos.
                    </p>
                  ) : (
                    <select
                      className="rd-input"
                      value={chosenCharId ?? ''}
                      onChange={(e) => setChosenCharId(e.target.value || null)}
                    >
                      <option value="">Nenhuma (só observar)</option>
                      {myChars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {CLASS_BY_KEY[c.classe].name} · NEX {c.nex}%
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                {hasLan ? (
                  <>
                    <div className="rd-divider" />
                    <label className="rd-field">
                      <span className="rd-field-label">Ou digite o endereço</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="rd-input rd-input-mono"
                          value={manualAddr}
                          placeholder="25.10.20.30:47300"
                          onChange={(e) => setManualAddr(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && joinLan(manualAddr)}
                        />
                        <button className="rd-btn-ghost" onClick={() => joinLan(manualAddr)}>
                          Entrar
                        </button>
                      </div>
                    </label>
                  </>
                ) : (
                  <label className="rd-field">
                    <span className="rd-field-label">Código da mesa</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="rd-input rd-input-mono"
                        value={code}
                        placeholder="ABC123"
                        maxLength={6}
                        style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && enter(code)}
                      />
                      <button className="rd-btn-primary" disabled={code.length < 4} onClick={() => enter(code)}>
                        Entrar
                      </button>
                    </div>
                  </label>
                )}

                {error && <p className="rd-connect-error">{error}</p>}
              </div>
            </div>

            {hasLan && (
              <div className="rd-player-col">
                <div className="rd-connect-panel">
                  <div className="rd-connect-panel-head">
                    <span className="rd-connect-panel-title">Mesas na rede</span>
                  </div>
                  <div className="rd-radar-row">
                    <div className="rd-radar" aria-hidden="true">
                      <span className="rd-radar-ring rd-radar-ring-a" />
                      <span className="rd-radar-ring rd-radar-ring-b" />
                      <span className="rd-radar-sweep" />
                      <span className="rd-radar-ping" />
                      {tables.length > 0 && (
                        <>
                          <span className="rd-radar-blip" style={{ left: 78, top: 34 }} />
                          <span className="rd-radar-blip" style={{ left: 30, top: 74, animationDelay: '0.4s' }} />
                        </>
                      )}
                    </div>
                    {tables.length === 0 ? (
                      <div className="rd-radar-status">
                        <span className="rd-radar-status-title">Procurando…</span>
                        <span className="rd-radar-status-sub">
                          Confira se você e o mestre estão na mesma rede do Radmin VPN.
                        </span>
                      </div>
                    ) : (
                      <span className="rd-radar-found">
                        {tables.length} mesa{tables.length === 1 ? '' : 's'} encontrada
                        {tables.length === 1 ? '' : 's'}.
                      </span>
                    )}
                  </div>
                  {tables.length > 0 && (
                    <div className="rd-table-list">
                      {tables.map((t) => (
                        <div key={t.host + ':' + t.port} className="rd-table-row">
                          <span className="rd-table-row-thumb" style={{ '--rd-row-color': '#3ddc84' } as CSSProperties}>
                            <MesaIcon />
                          </span>
                          <span className="rd-table-row-info">
                            <span className="rd-table-row-name">{t.name}</span>
                            <span className="rd-table-row-meta">
                              {t.host}:{t.port} · {t.players} conectado(s)
                            </span>
                          </span>
                          <button className="rd-table-row-play" onClick={() => joinLan(`${t.host}:${t.port}`, t.name)}>
                            Entrar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Sigil() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 3l11 6.5v8.5c0 6.6-4.4 11-11 13-6.6-2-11-6.4-11-13V9.5z"
        fill="none"
        stroke="#e01e2b"
        strokeWidth="2"
      />
      <circle cx="16" cy="16" r="3.4" fill="#e01e2b" />
      <path d="M16 6v20M6 16h20" stroke="#e01e2b" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function GmIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 4l16 6v10c0 10.5-6.9 17.6-16 24-9.1-6.4-16-13.5-16-24V10z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M24 15v18M15 24h18" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
      <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PlayerIcon() {
  return (
    <svg width="56" height="52" viewBox="0 0 56 48" fill="none" aria-hidden>
      <circle cx="18" cy="16" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 40c0-8 5.4-13 12-13s12 5 12 13" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="38" cy="13" r="4.6" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      <path
        d="M29 40c1-6.5 4.7-10.3 9-10.3s8 3.8 9 10.3"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.75"
      />
    </svg>
  );
}

/* ---------- ícones em traço de "Entrar numa mesa" (redesign Passo 3) ----------
   GmIcon/PlayerIcon acima são reaproveitados dos cartões de papel; os
   daqui são novos pra essa tela (abas do mestre, mesas salvas/encontradas,
   excluir, hospedar). Nenhum emoji na tela. */

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SavedTableIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5h6l2 2h8v12H4z" />
      <path d="M10 12l3 2-3 2z" />
    </svg>
  );
}

function NewTableIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

// Ícone genérico pra uma mesa (salva ou encontrada na rede) — não dá pra
// saber o tipo real (2D/3D, campanha/one-shot) sem abrir a mesa, então é
// sempre o mesmo desenho (uma mesa vista de perfil), só a cor muda.
function MesaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="4" rx="1.2" />
      <path d="M7 9v10M17 9v10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

function HostIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a14 14 0 0 1 20 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------- ícones em traço do menu principal (redesign Passo 2) ----------
   Substituem os emojis dos itens de navegação e dos botões do topo. */

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5 20c0-4.4 3.1-6.8 7-6.8s7 2.4 7 6.8" />
    </svg>
  );
}

function FichasIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M7.5 9h4M7.5 12.5h9M7.5 16h6" />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3h6v18h-6" />
      <path d="M12 12H3m4-4-4 4 4 4" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7a8 8 0 1 1-1.3 6" />
      <path d="M2 4v4h4" />
      <path d="M12 8v5l3.3 2" />
    </svg>
  );
}

function ExtrasIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.6" cy="8.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="8.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="15.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="15.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GmAreaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 17 2.2 8l4.8 4L12 5l5 7 4.8-4-1.3 9z" />
      <path d="M3.5 17h17" />
    </svg>
  );
}
