import { useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import type { NotifyEntry } from '../types';

// Histórico de notificações de "subiu de NEX". Jogador só vê as do próprio
// personagem; o mestre vê de todo mundo.
export function NotificationLog() {
  const notifications = useTableStore((s) => s.notifications);
  const { me } = useIdentity();
  const list = me.isGM ? notifications : notifications.filter((n) => n.ownerId === me.id);

  if (list.length === 0)
    return <p className="empty">Notificações de "subiu de NEX" aparecem aqui.</p>;

  return (
    <div className="log-list">
      {list.map((n) => (
        <Entry key={n.id} n={n} />
      ))}
    </div>
  );
}

function Entry({ n }: { n: NotifyEntry }) {
  const time = new Date(n.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="log-entry" style={{ borderLeftColor: 'var(--gold)' }}>
      <div className="log-head">
        <span className="log-author" style={{ color: 'var(--gold)' }}>
          {n.charName} — NEX {n.fromNex}% → {n.toNex}%
        </span>
        <span className="faint">{time}</span>
      </div>
      <ul className="toast-lines" style={{ marginTop: 4 }}>
        {n.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
