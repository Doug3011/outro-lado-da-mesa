import { useEffect, useMemo, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import {
  ATTRIBUTES,
  SKILLS,
  SKILL_BY_KEY,
  TRAINING_LEVELS,
  type AttrKey,
  type Training,
} from '../data/ordem';

const QUICK = [4, 6, 8, 10, 12, 20, 100];

export function DiceRoller() {
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);
  const characters = useTableStore((s) => s.characters);
  const activeId = useTableStore((s) => s.activeCharacterId);
  const activeChar = activeId ? characters[activeId] : null;

  const [skillKey, setSkillKey] = useState<string>('percepcao');
  const [manualAttr, setManualAttr] = useState<AttrKey>('PRE');
  const [attrValue, setAttrValue] = useState(1);
  const [training, setTraining] = useState<Training>(0);
  const [bonus, setBonus] = useState(0);
  const [dt, setDt] = useState<string>('');

  const skillDef = skillKey === 'ATRIBUTO' ? null : SKILL_BY_KEY[skillKey];
  const attrKey: AttrKey = skillDef ? skillDef.attr : manualAttr;

  // Puxa valores da ficha ativa quando ela ou a pericia mudam.
  useEffect(() => {
    if (!activeChar) return;
    setAttrValue(activeChar.attributes[attrKey] ?? 1);
    if (skillDef) {
      setTraining(activeChar.skills[skillDef.key]?.training ?? 0);
      setBonus(activeChar.skills[skillDef.key]?.bonus ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, skillKey, attrKey]);

  const label = useMemo(() => {
    const who = activeChar ? `${activeChar.name} · ` : '';
    if (skillDef) return `${who}${skillDef.name} (${skillDef.attr})`;
    const a = ATTRIBUTES.find((x) => x.key === attrKey)!;
    return `${who}Teste de ${a.name}`;
  }, [skillDef, attrKey, activeChar]);

  const [freeExpr, setFreeExpr] = useState('1d20');

  const doOrdem = () => {
    rollOrdem({
      label,
      attributeValue: attrValue,
      bonus: Number(training) + Number(bonus),
      dt: dt.trim() === '' ? null : Number(dt),
    });
  };

  return (
    <div>
      <div className="section-title">Teste de perícia</div>

      {Object.keys(characters).length > 0 && (
        <div className="field">
          <label>Ficha usada</label>
          <select
            value={activeId ?? ''}
            onChange={(e) => useTableStore.getState().setActiveCharacter(e.target.value || null)}
          >
            <option value="">— valores manuais —</option>
            {Object.values(characters).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Perícia</label>
        <select value={skillKey} onChange={(e) => setSkillKey(e.target.value)}>
          <option value="ATRIBUTO">Atributo puro</option>
          {SKILLS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name} ({s.attr})
            </option>
          ))}
        </select>
      </div>

      <div className="row">
        {!skillDef && (
          <div className="field">
            <label>Atributo</label>
            <select value={manualAttr} onChange={(e) => setManualAttr(e.target.value as AttrKey)}>
              {ATTRIBUTES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Valor de {attrKey} (nº de d20)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={attrValue}
            onChange={(e) => setAttrValue(Math.max(0, Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Treino</label>
          <select
            value={training}
            onChange={(e) => setTraining(Number(e.target.value) as Training)}
            disabled={skillKey === 'ATRIBUTO'}
          >
            {TRAINING_LEVELS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} (+{t.value})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Bônus extra</label>
          <input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>DT (opcional)</label>
          <input
            type="number"
            placeholder="15"
            value={dt}
            onChange={(e) => setDt(e.target.value)}
          />
        </div>
      </div>

      <p className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
        {attrValue <= 0
          ? 'Atributo 0 → rola 2d20 e fica com o MENOR.'
          : `Rola ${attrValue}d20, pega o maior e soma +${Number(training) + Number(bonus)}.`}
      </p>

      <button className="primary" style={{ width: '100%' }} onClick={doOrdem}>
        Rolar teste
      </button>

      <div className="section-title">Rolagem livre</div>
      <div className="quick-dice">
        {QUICK.map((d) => (
          <button key={d} onClick={() => rollFree(`d${d}`, `1d${d}`)}>
            d{d}
          </button>
        ))}
        <button onClick={() => rollFree('Iniciativa rápida', '1d20')}>1d20</button>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Expressão (ex.: 2d6+3, 4d20kh1, 1d100)</label>
        <div className="row">
          <input
            value={freeExpr}
            onChange={(e) => setFreeExpr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rollFree(freeExpr, freeExpr)}
          />
          <button style={{ flex: 'none' }} onClick={() => rollFree(freeExpr, freeExpr)}>
            Rolar
          </button>
        </div>
      </div>

      <div className="section-title">Últimas rolagens</div>
      <MiniLog />
    </div>
  );
}

function MiniLog() {
  const rollLog = useTableStore((s) => s.rollLog);
  if (rollLog.length === 0) return <p className="empty">Nenhuma rolagem ainda.</p>;
  return (
    <div className="log-list">
      {rollLog.slice(0, 4).map((e) => (
        <div key={e.id} className="log-entry" style={{ borderLeftColor: e.authorColor }}>
          <div className="log-head">
            <span className="log-author" style={{ color: e.authorColor }}>
              {e.authorName}
            </span>
            <span className="log-label">{e.label}</span>
          </div>
          <div
            className={
              'log-total ' +
              (e.result.kind === 'ordem-test' && e.result.critical
                ? 'crit'
                : e.result.kind === 'ordem-test' && e.result.success === true
                  ? 'success'
                  : e.result.kind === 'ordem-test' && e.result.success === false
                    ? 'fail'
                    : '')
            }
          >
            {e.result.total}
          </div>
        </div>
      ))}
    </div>
  );
}
