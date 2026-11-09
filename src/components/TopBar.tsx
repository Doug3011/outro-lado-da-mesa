import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { hasLan } from '../lib/lan';
import { BackChevronIcon, BrandEyeIcon, CopyAddressIcon, GmBadgeIcon } from './icons';

// REDESIGN Passo 4 (Mesa do mestre): barra superior nova, visual de vidro
// vermelho (Mesa-Mestre.dc.html) — `.topbar`/`.brand`/`.tag`/`.room-code`/
// `.presence`/`.avatar`/`.conn-dot` (CSS antigo) só eram usados aqui, por
// isso trocam direto pras novas `.rd-mm-topbar-*` (ver index.css) em vez de
// ganhar uma variante condicional; `.tag`/`.tag-gm` continuam intactas
// porque OUTRAS telas (BattleMap.tsx etc.) ainda usam essas classes.
export function TopBar({ code }: { code: string }) {
  const users = useTableStore((s) => s.users);
  const connected = useTableStore((s) => s.connected);
  const mode = useTableStore((s) => s.mode);
  const { me } = useIdentity();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const backToMenu = () => navigate('/');

  const copyInvite = async () => {
    const text = hasLan ? code : `${window.location.origin}/?sala=${code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignora */
    }
  };

  return (
    <div className="rd-mm-topbar">
      <Link to="/" className="rd-mm-topbar-brand" style={{ color: 'var(--rd-sangue)' }}>
        <BrandEyeIcon /> O Outro Lado da Mesa
      </Link>
      <button className="rd-mm-topbar-chip" title="Sair da mesa e voltar pro menu inicial" onClick={backToMenu}>
        <BackChevronIcon /> Menu inicial
      </button>

      <span className={'rd-mm-topbar-role' + (me.isGM ? '' : ' player')}>
        {me.isGM && <GmBadgeIcon />} {me.isGM ? 'Mestre' : 'Jogador'}
      </span>
      {!hasLan && <span className="room-code">{code}</span>}

      <span style={{ flex: 1 }} />

      {me.isGM && (
        <button className="rd-mm-topbar-chip" onClick={copyInvite}>
          <CopyAddressIcon />
          <span style={{ fontFamily: 'var(--rd-font-mono)' }}>
            {copied ? 'Copiado!' : hasLan ? 'Copiar endereço' : 'Convidar jogadores'}
          </span>
        </button>
      )}
      {mode === 'lan' && (
        <span className="rd-mm-topbar-net">
          <span className="rd-mm-topbar-net-dot" />
          REDE LOCAL
        </span>
      )}
      {mode !== 'lan' && <span className="tag">{mode === 'supabase' ? 'online' : 'local'}</span>}

      <div className="rd-mm-topbar-presence">
        <span
          className={`rd-mm-topbar-conndot ${connected ? '' : 'off'}`}
          title={connected ? 'Conectado' : 'Reconectando...'}
        />
        {users.map((u) => (
          <span
            key={u.id}
            className="rd-mm-topbar-avatar"
            style={{ background: u.color }}
            title={`${u.name}${u.isGM ? ' (Mestre)' : ''}`}
          >
            {u.isGM ? <GmBadgeIcon /> : u.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
