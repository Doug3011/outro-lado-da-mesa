import { useCallback, useState } from 'react';
import { randomColor, uid } from '../lib/ids';
import type { PresenceUser } from '../types';

const KEY = 'ordem:me';

function load(): PresenceUser {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as PresenceUser;
  } catch {
    /* ignora */
  }
  const id = uid();
  return { id, name: '', color: randomColor(id), isGM: false };
}

export function useIdentity() {
  const [me, setMe] = useState<PresenceUser>(load);

  const update = useCallback((patch: Partial<PresenceUser>) => {
    setMe((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  }, []);

  return { me, update };
}
