import { useEffect, useRef, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useIdentity } from '../hooks/useIdentity';
import type { NotifyEntry } from '../types';

const TTL_MS = 9000;

// Toasts flutuantes: aparecem só pro dono do personagem (+ sempre pro mestre) quando
// alguém sobe de NEX, mostrando o que ganhou/pode escolher agora. O histórico completo
// fica na aba "Notificações" (NotificationLog).
export function NotificationToasts() {
  const notifications = useTableStore((s) => s.notifications);
  const code = useTableStore((s) => s.code);
  const { me } = useIdentity();
  const [visible, setVisible] = useState<NotifyEntry[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const seededCode = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Ao (re)conectar numa sala, o cache/sync traz o histórico de uma vez — marca tudo
    // como "já visto" sem tocar toast, pra só notificar de verdade daqui pra frente.
    if (seededCode.current !== code) {
      seen.current = new Set(notifications.map((n) => n.id));
      seededCode.current = code;
      return;
    }
    const mine = notifications.filter(
      (n) => !seen.current.has(n.id) && (n.ownerId === me.id || me.isGM),
    );
    if (mine.length === 0) return;
    for (const n of mine) seen.current.add(n.id);
    setVisible((v) => [...mine, ...v]);
    for (const n of mine) {
      window.setTimeout(() => {
        setVisible((v) => v.filter((x) => x.id !== n.id));
      }, TTL_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, code]);

  if (visible.length === 0) return null;

  return (
    <div className="toast-stack">
      {visible.map((n) => (
        <div className="toast-card" key={n.id}>
          <div className="toast-head">
            <span>
              ✨ {n.charName} subiu pra NEX {n.toNex}%
            </span>
            <button className="small ghost" onClick={() => setVisible((v) => v.filter((x) => x.id !== n.id))}>
              ✕
            </button>
          </div>
          <ul className="toast-lines">
            {n.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
