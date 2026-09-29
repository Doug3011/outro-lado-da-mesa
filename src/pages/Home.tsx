import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIdentity } from '../hooks/useIdentity';
import { hasSupabase } from '../lib/supabase';
import { newRoomCode } from '../lib/ids';
import { hasLan, LAN_INFO, LanControl, type LanTable } from '../lib/lan';
import { loadMyCharacters } from '../lib/characterLibrary';
import { getLinkedCharacterId, setLinkedCharacterId } from '../lib/roomLinks';
import { recordMatch } from '../lib/matchHistory';
import type { Character } from '../domain/character';
import { ProfileEditor } from '../components/ProfileEditor';
import { CharacterLibrary } from '../components/CharacterLibrary';
import { MatchHistoryPanel } from '../components/MatchHistoryPanel';
import { DailyChallengePanel } from '../components/DailyChallengePanel';
import { MusicLibraryManager } from '../components/MusicLibraryManager';
import { TokenLibraryManager } from '../components/TokenLibraryManager';
import { MapLibraryManager } from '../components/MapLibraryManager';
import { PlaceLibraryManager } from '../components/PlaceLibraryManager';
import { PlacePickerDialog } from '../components/PlacePickerDialog';
import type { Place } from '../lib/placeLibrary';
import { SigilFlicker } from '../components/SigilFlicker';
import { ALL_MENU_TRACKS } from '../data/menuTracks';
import { isTrackUnlocked } from '../lib/menuTracks';
import { useMenuMusicStore } from '../state/menuMusic';

type Role = 'gm' | 'player';
type View = 'hub' | 'profile' | 'library' | 'connect' | 'history' | 'daily' | 'gm-area' | 'extras';
type GmAreaTab = 'music' | 'tokens' | 'maps' | 'places';
type ExtrasTab = 'minigames';

const PALETTE = ['#e01e2b', '#7b2cbf', '#2fae66', '#e8b21e', '#3f7fd6', '#ff8fab', '#d4a373'];

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
  // ref garante que ele sempre lê o nome mais recente digitado, não um valor preso.
  const tableNameRef = useRef(tableName);
  tableNameRef.current = tableName;
  // Guarda a place escolhida (ou `null` = cenário 3D em branco) entre o
  // clique em "Hospedar mesa (3D)" e o `onHosting` disparar de fato — undefined
  // = hospedando uma mesa 2D normal, sem tocar em nada 3D.
  const pending3dRef = useRef<{ place: Place | null } | undefined>(undefined);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  useEffect(() => {
    if (!hasLan || role === null) return;
    const ctl = new LanControl();
    lanRef.current = ctl;
    ctl.connect({
      onHosting: (v) => {
        setHosting(v);
        if (v && LAN_INFO) {
          const addr = `${LAN_INFO.localIp}:${LAN_INFO.port}`;
          recordMatch(addr, 'gm', tableNameRef.current.trim() || 'Mesa');
          const pending = pending3dRef.current;
          pending3dRef.current = undefined;
          navigate(`/sala/${addr}`, pending ? { state: { place3d: pending.place } } : undefined);
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
  };

  const hostLan = () => {
    if (!me.name.trim()) return setError('Escolha um nome.');
    lanRef.current?.hostStart(tableName.trim() || 'Mesa');
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
        <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

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
        <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

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
              className={`chip ${gmAreaTab === 'tokens' ? 'on' : ''}`}
              onClick={() => setGmAreaTab('tokens')}
            >
              🧩 Tokens
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
    return (
      <div className="menu-hero">
        <video
          className="menu-hero-video"
          src="/mesa-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
        />
        <div className="menu-hero-scrim" />
        <SigilFlicker />
        <div className="menu-hero-brand">
          <Sigil />
          <span>O Outro Lado da Mesa</span>
        </div>

        <nav className="menu-nav">
          <button className="menu-nav-item" onClick={() => setView('profile')}>
            Meu Perfil
          </button>
          <button className="menu-nav-item" onClick={goToLibrary}>
            Minhas Fichas{myChars.length > 0 ? ` (${myChars.length})` : ''}
          </button>
          <button className="menu-nav-item featured" onClick={() => setView('connect')}>
            Entrar numa Mesa
          </button>
          <button className="menu-nav-item" onClick={() => setView('history')}>
            Histórico de Mesas
          </button>
          <button className="menu-nav-item" onClick={() => setView('extras')}>
            Extras
          </button>
          {hasLan && (
            <button className="menu-nav-item" onClick={() => setView('gm-area')}>
              Área do Mestre
            </button>
          )}
        </nav>

        <p className="menu-hero-hint">
          {hasLan
            ? '● Modo rede local: sem internet nem contas — todos precisam estar na mesma rede (Radmin VPN, por exemplo).'
            : hasSupabase
              ? '● Modo online: o mestre compartilha o link e todos jogam juntos.'
              : '● Modo local: sincroniza só entre abas deste navegador. Configure o Supabase (README) para jogar pela internet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="daily-page connect-page">
      <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <Sigil />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="daily-content">
        <button className="daily-back" onClick={() => setView('hub')}>
          ← Voltar
        </button>

        <h1 className="daily-title">Entrar numa Mesa</h1>
        <div className="daily-title-rule" />

        <p className="daily-rule-box">
          Tabletop virtual de <b>Ordem Paranormal</b>
          {hasLan
            ? ' — hospede a mesa na sua rede (Radmin/LAN) e todos entram sem servidor nenhum.'
            : ' — o mestre transmite a mesa, os jogadores entram pelo código.'}
        </p>

        {role === null && (
          <>
            <p className="role-kicker">O outro lado te espera</p>
            <div className="role-title">Como você vai entrar?</div>
            <div className="role-cards">
              <button className="role-card role-card-gm" onClick={() => pickRole('gm')}>
                <div className="role-card-art">
                  <GmIcon />
                </div>
                <div className="role-card-body">
                  <span className="role-eyebrow">Mestre</span>
                  <strong>Hospedar mesa</strong>
                  <p>
                    {hasLan
                      ? 'Hospedo a mesa nesta máquina e controlo o mapa.'
                      : 'Crio a mesa, controlo o mapa e transmito pros jogadores.'}
                  </p>
                  <span className="role-cta">
                    Iniciar como mestre <span className="role-cta-arrow">→</span>
                  </span>
                </div>
              </button>
              <button className="role-card role-card-player" onClick={() => pickRole('player')}>
                <div className="role-card-art">
                  <PlayerIcon />
                </div>
                <div className="role-card-body">
                  <span className="role-eyebrow">Jogador</span>
                  <strong>Entrar na mesa</strong>
                  <p>
                    {hasLan
                      ? 'Vejo as mesas encontradas na rede e entro com um clique.'
                      : 'Entro na mesa do mestre com o código do convite.'}
                  </p>
                  <span className="role-cta">
                    {hasLan ? 'Procurar mesas' : 'Entrar com código'} <span className="role-cta-arrow">→</span>
                  </span>
                </div>
              </button>
            </div>
          </>
        )}

        {role !== null && (
          <>
            <button className="link-back" onClick={() => setRole(null)}>
              ← trocar
            </button>

            <div className="field">
              <label>Seu nome{role === 'gm' ? ' (mestre)' : ''}</label>
              <div className="row">
                <input
                  autoFocus
                  value={me.name}
                  placeholder={role === 'gm' ? 'Ex.: Mestre Kléber' : 'Ex.: Turma do Kléber'}
                  onChange={(e) => {
                    update({ name: e.target.value });
                    setError('');
                  }}
                />
                <button
                  className="swatch"
                  style={{ background: me.color }}
                  title="Trocar cor"
                  onClick={() =>
                    update({ color: PALETTE[Math.floor(Math.random() * PALETTE.length)] })
                  }
                />
              </div>
            </div>

            {role === 'player' && (
              <div className="field">
                <label>Ficha que você vai usar nesta mesa</label>
                {myChars.length === 0 ? (
                  <p className="faint" style={{ fontSize: 12 }}>
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
                    value={chosenCharId ?? ''}
                    onChange={(e) => setChosenCharId(e.target.value || null)}
                  >
                    <option value="">— nenhuma (só observar) —</option>
                    {myChars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {hasLan ? (
              role === 'gm' ? (
                <>
                  <div className="field">
                    <label>Nome da mesa</label>
                    <input
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="Mesa de sexta"
                    />
                  </div>
                  <button
                    className="primary"
                    style={{ width: '100%' }}
                    disabled={hosting}
                    onClick={hostLan}
                  >
                    {hosting ? 'Hospedando…' : 'Hospedar mesa (2D)'}
                  </button>
                  <button
                    className="ghost"
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={hosting}
                    onClick={() => {
                      if (!me.name.trim()) return setError('Escolha um nome.');
                      setShowPlacePicker(true);
                    }}
                  >
                    🧊 Hospedar mesa (3D)
                  </button>
                  <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                    Sua mesa vai aparecer sozinha pros jogadores que estiverem na mesma rede
                    (Radmin VPN ou Wi-Fi). Endereço: <b>{LAN_INFO?.localIp}:{LAN_INFO?.port}</b>
                  </p>
                </>
              ) : (
                <>
                  <div className="section-title">Mesas encontradas na rede</div>
                  {tables.length === 0 && (
                    <p className="empty">
                      Procurando… confira se você e o mestre estão conectados na mesma rede do
                      Radmin VPN.
                    </p>
                  )}
                  <div className="chip-row" style={{ flexDirection: 'column', gap: 8 }}>
                    {tables.map((t) => (
                      <button
                        key={t.host + ':' + t.port}
                        className="lan-table-card"
                        onClick={() => joinLan(`${t.host}:${t.port}`, t.name)}
                      >
                        <span className="live-dot" />
                        <span style={{ flex: 1, textAlign: 'left' }}>
                          <strong>{t.name}</strong>
                          <br />
                          <small className="faint">
                            {t.host}:{t.port} · {t.players} conectado(s)
                          </small>
                        </span>
                        <span>Entrar ▸</span>
                      </button>
                    ))}
                  </div>
                  <div className="home-divider" />
                  <div className="field">
                    <label>…ou digite o endereço manualmente</label>
                    <div className="row">
                      <input
                        value={manualAddr}
                        placeholder="25.10.20.30:47300"
                        onChange={(e) => setManualAddr(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && joinLan(manualAddr)}
                      />
                      <button style={{ flex: 'none' }} onClick={() => joinLan(manualAddr)}>
                        Entrar
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : role === 'gm' ? (
              <>
                <button
                  className="primary"
                  style={{ width: '100%' }}
                  onClick={() => enter(newRoomCode())}
                >
                  Criar mesa
                </button>
                <div className="home-divider" />
                <div className="field">
                  <label>…ou reabrir uma mesa existente</label>
                  <div className="row">
                    <input
                      value={code}
                      placeholder="CÓDIGO"
                      maxLength={6}
                      style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                      onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    />
                    <button disabled={code.length < 4} style={{ flex: 'none' }} onClick={() => enter(code)}>
                      Abrir
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="field">
                <label>Código da mesa</label>
                <div className="row">
                  <input
                    value={code}
                    placeholder="ABC123"
                    maxLength={6}
                    style={{ textTransform: 'uppercase', letterSpacing: 3 }}
                    onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && enter(code)}
                  />
                  <button
                    className="primary"
                    disabled={code.length < 4}
                    style={{ flex: 'none' }}
                    onClick={() => enter(code)}
                  >
                    Entrar
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="muted" style={{ color: 'var(--blood-bright)', marginTop: 8 }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>

      <div className="daily-sigil-small">
        <Sigil />
        <span className="daily-sigil-line" />
      </div>

      {showPlacePicker && (
        <PlacePickerDialog
          onClose={() => setShowPlacePicker(false)}
          onBlank={() => {
            pending3dRef.current = { place: null };
            setShowPlacePicker(false);
            hostLan();
          }}
          onPick={(place) => {
            pending3dRef.current = { place };
            setShowPlacePicker(false);
            hostLan();
          }}
        />
      )}
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
