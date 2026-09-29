import { ATTRIBUTES, CLASS_BY_KEY, SKILLS, TRAINING_LABEL, type AttrKey } from '../data/ordem';
import { deriveStats, skillBonus, type Character } from '../domain/character';

// Ficha "em papel": versão só-leitura, organizada como a ficha de agente oficial
// (roda de atributos, tabela de perícias, caixas de PV/PE/SAN) — pra ver a ficha
// pronta de um jeito mais organizado, sem os controles de edição.

const WHEEL_POS: Record<AttrKey, { x: number; y: number }> = {
  AGI: { x: 50, y: 12 },
  INT: { x: 86, y: 38 },
  VIG: { x: 72, y: 81 },
  PRE: { x: 28, y: 81 },
  FOR: { x: 14, y: 38 },
};

export function CharacterSheetPaper({ character: c }: { character: Character }) {
  const derived = deriveStats(c);
  const pvMax = c.autoCalc ? derived.pvMax : c.pv.max;
  const peMax = c.autoCalc ? derived.peMax : c.pe.max;
  const sanMax = c.autoCalc ? derived.sanMax : c.sanity.max;
  const defense = c.autoCalc ? derived.defense : c.defense;
  const resistAbilities = c.abilities.filter((a) => /resist/i.test(a.name));

  return (
    <div className="paper-sheet">
      <div className="paper-tab">FICHA DE AGENTE</div>

      <div className="paper-body">
        <div className="paper-head">
          <div className="paper-id-row">
            <div className="paper-id-box">
              <span className="paper-id-label">Personagem</span>
              <span className="paper-id-value">{c.name || '—'}</span>
            </div>
            <div className="paper-id-box">
              <span className="paper-id-label">Jogador</span>
              <span className="paper-id-value">{c.player || '—'}</span>
            </div>
          </div>
          <div className="paper-logo">
            <span className="paper-logo-small">ORDEM</span>
            <span className="paper-logo-big">PARANORMAL</span>
            <span className="paper-logo-small">RPG</span>
          </div>
        </div>

        <div className="paper-columns">
          <div className="paper-col-left">
            <div className="attr-wheel">
              <div className="attr-wheel-center">ATRIBUTOS</div>
              {ATTRIBUTES.map((a) => (
                <div
                  key={a.key}
                  className="attr-wheel-node"
                  style={{ left: `${WHEEL_POS[a.key].x}%`, top: `${WHEEL_POS[a.key].y}%` }}
                >
                  <span className="attr-wheel-short">{a.short}</span>
                  <span className="attr-wheel-value">{c.attributes[a.key]}</span>
                </div>
              ))}
            </div>

            <div className="paper-field-row">
              <div className="paper-field">
                <span className="paper-bar">Origem</span>
                <span className="paper-fill">{c.origem || '—'}</span>
              </div>
            </div>
            <div className="paper-field-row">
              <div className="paper-field">
                <span className="paper-bar">Classe</span>
                <span className="paper-fill">
                  {CLASS_BY_KEY[c.classe]?.name ?? c.classe}
                  {c.trilha ? ` · ${c.trilha}` : ''}
                </span>
              </div>
            </div>

            <div className="paper-field-row">
              <div className="paper-field small">
                <span className="paper-bar">NEX</span>
                <span className="paper-fill center">{c.nex}%</span>
              </div>
              <div className="paper-field small">
                <span className="paper-bar">Desl.</span>
                <span className="paper-fill center">{c.displacement}m</span>
              </div>
            </div>

            <div className="paper-stat-row">
              <div className="paper-stat-box">
                <span className="paper-bar">PV — Pontos de Vida</span>
                <span className="paper-stat-value">
                  {c.pv.current} / {pvMax}
                  {c.pv.temp ? ` (+${c.pv.temp})` : ''}
                </span>
              </div>
              <div className="paper-stat-box">
                <span className="paper-bar">{c.pdMode ? 'PD — Determinação' : 'PE — Esforço'}</span>
                <span className="paper-stat-value">
                  {c.pe.current} / {peMax}
                </span>
              </div>
            </div>

            <div className="paper-stat-row">
              <div className="paper-shield">
                <span className="paper-shield-value">{defense}</span>
                <span className="paper-shield-label">Defesa</span>
                <span className="paper-shield-formula">10 + AGI + equip + outros</span>
              </div>
              {!c.pdMode && (
                <div className="paper-stat-box">
                  <span className="paper-bar">SAN — Sanidade</span>
                  <span className="paper-stat-value">
                    {c.sanity.current} / {sanMax}
                  </span>
                </div>
              )}
            </div>

            <div className="paper-line">
              <strong>Proteção</strong> {c.protection || 0}
            </div>
            <div className="paper-line">
              <strong>Resistências</strong>{' '}
              {resistAbilities.length ? resistAbilities.map((a) => a.name).join(', ') : '—'}
            </div>

            <div className="paper-bar" style={{ marginTop: 10 }}>
              Ataques
            </div>
            <div className="paper-table-scroll">
              <table className="paper-table">
                <thead>
                  <tr>
                    <th>Ataque</th>
                    <th>Teste</th>
                    <th>Dano</th>
                    <th>Crítico / Alcance / Especial</th>
                  </tr>
                </thead>
                <tbody>
                  {c.attacks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="paper-empty">
                        —
                      </td>
                    </tr>
                  )}
                  {c.attacks.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name || '—'}</td>
                      <td>{a.test || '—'}</td>
                      <td>{a.damage || '—'}</td>
                      <td>{[a.crit, a.range].filter(Boolean).join(' / ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="paper-col-right">
            <div className="paper-bar">Perícias</div>
            <div className="paper-table-scroll">
              <table className="paper-table paper-skills">
                <thead>
                  <tr>
                    <th>Perícia</th>
                    <th>Dados</th>
                    <th>Bônus</th>
                    <th>Treino</th>
                    <th>Outros</th>
                  </tr>
                </thead>
                <tbody>
                  {SKILLS.map((s) => {
                    const st = c.skills[s.key] ?? { training: 0, bonus: 0 };
                    const total = skillBonus(c, s.key);
                    return (
                      <tr key={s.key}>
                        <td>
                          {s.name}
                          {s.onlyTrained ? '*' : ''}
                          {s.loadPenalty ? '+' : ''}
                        </td>
                        <td className="paper-center">{c.attributes[s.attr]}d20</td>
                        <td className="paper-center">{total >= 0 ? `+${total}` : total}</td>
                        <td className="paper-center">{TRAINING_LABEL[st.training].slice(0, 4)}</td>
                        <td className="paper-center">
                          {st.bonus ? (st.bonus > 0 ? `+${st.bonus}` : st.bonus) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="paper-legend">+ Penalidade de carga. * Somente treinada.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
