import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import { hasLan } from '../lib/lan';

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
    <div className="topbar">
      <Link to="/" className="brand" style={{ color: 'var(--text)' }}>
        <span style={{ color: 'var(--blood)' }}>◈</span> O Outro Lado da Mesa
      </Link>
      <button className="small ghost" title="Sair da mesa e voltar pro menu inicial" onClick={backToMenu}>
        ← Menu Inicial
      </button>

      <span className={'tag ' + (me.isGM ? 'tag-gm' : '')}>{me.isGM ? '★ Mestre' : 'Jogador'}</span>
      {!hasLan && <span className="room-code">{code}</span>}
      {me.isGM && (
        <button className="small ghost" onClick={copyInvite}>
          {copied ? 'Copiado!' : hasLan ? 'Copiar endereço' : 'Convidar jogadores'}
        </button>
      )}
      <span className="tag">{mode === 'lan' ? 'rede local' : mode === 'supabase' ? 'online' : 'local'}</span>

      <div className="presence">
        <span className={`conn-dot ${connected ? '' : 'off'}`} title={connected ? 'Conectado' : 'Reconectando...'} />
        {users.map((u) => (
          <span
            key={u.id}
            className="avatar"
            style={{ background: u.color }}
            title={`${u.name}${u.isGM ? ' (Mestre)' : ''}`}
          >
            {u.isGM ? '★' : u.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
