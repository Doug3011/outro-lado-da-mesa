import { useTableStore } from '../store/useTableStore';
import { PROFILE_FIELDS } from '../domain/profile';

// Só o mestre vê essa aba: o "perfil" que cada jogador preencheu (personalidade,
// tipo de personagem que gosta, limites de conteúdo...) — enviado uma vez quando
// o jogador entra na mesa com uma ficha vinculada.
export function PlayerProfilesPanel() {
  const profiles = useTableStore((s) => s.playerProfiles);
  const list = Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name));

  if (list.length === 0) {
    return (
      <p className="empty">
        Nenhum perfil recebido ainda — aparece aqui quando um jogador que preencheu o
        perfil (menu principal → Meu Perfil) entra na mesa.
      </p>
    );
  }

  return (
    <div>
      {list.map((p) => (
        <div className="list-item" key={p.ownerId}>
          <div className="li-head" style={{ gap: 10 }}>
            {p.profile.photo && (
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  flex: 'none',
                  background: `center/cover no-repeat url(${p.profile.photo})`,
                }}
              />
            )}
            <strong>{p.name}</strong>
            {(p.profile.age || p.profile.birthday) && (
              <span className="faint" style={{ fontSize: 11 }}>
                {[p.profile.age && `${p.profile.age} anos`, p.profile.birthday]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </div>
          {PROFILE_FIELDS.map((f) => {
            const value = p.profile[f.key]?.trim();
            if (!value) return null;
            return (
              <div key={f.key} style={{ marginTop: 8 }}>
                <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{value}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
