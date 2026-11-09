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
import { DiceShapeIcon } from './icons';

const QUICK = [4, 6, 8, 10, 12, 20, 100];

// Botão/janela flutuante "Dados" — abas "Teste de perícia"/"Rolagem livre"
// (REDESIGN Passo 4, igual à referência Mesa-Mestre.dc.html: `diceTab`/
// `isTest`/`isFree`). O histórico ("Últimas rolagens") saiu daqui e virou o
// botão flutuante "Histórico" (RollLog.tsx, mesmo componente, log
// completo), separado de propósito — pedido do usuário.
export function DiceRoller() {
  const rollOrdem = useTableStore((s) => s.rollOrdem);
  const rollFree = useTableStore((s) => s.rollFree);
  const characters = useTableStore((s) => s.characters);
  const activeId = useTableStore((s) => s.activeCharacterId);
  const activeChar = activeId ? characters[activeId] : null;

  const [tab, setTab] = useState<'test' | 'free'>('test');
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
      <div className="rd-mm-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'test'}
          className={'rd-mm-tab' + (tab === 'test' ? ' active' : '')}
          onClick={() => setTab('test')}
        >
          Teste de perícia
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'free'}
          className={'rd-mm-tab' + (tab === 'free' ? ' active' : '')}
          onClick={() => setTab('free')}
        >
          Rolagem livre
        </button>
      </div>

      {tab === 'test' && (
        <>
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

      <p className="rd-mm-formula">
        {attrValue <= 0
          ? 'Atributo 0 → rola 2d20 e fica com o MENOR.'
          : `Rola ${attrValue}d20, pega o maior e soma +${Number(training) + Number(bonus)}.`}
      </p>

      <button className="rd-btn-primary" style={{ width: '100%' }} onClick={doOrdem}>
        Rolar teste
      </button>
        </>
      )}

      {tab === 'free' && (
        <>
      <div className="rd-dice-grid">
        {QUICK.map((d) => (
          <button key={d} className="rd-dice-btn" onClick={() => rollFree(`d${d}`, `1d${d}`)}>
            <DiceShapeIcon sides={d} />
            <span className="rd-dice-btn-label">d{d}</span>
          </button>
        ))}
        <button className="rd-dice-btn" onClick={() => rollFree('Iniciativa rápida', '1d20')}>
          <DiceShapeIcon sides={20} />
          <span className="rd-dice-btn-label">1d20</span>
        </button>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>Expressão (ex.: 2d6+3, 4d20kh1, 1d100)</label>
        <div className="row">
          <input
            value={freeExpr}
            onChange={(e) => setFreeExpr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rollFree(freeExpr, freeExpr)}
          />
          <button className="primary" style={{ flex: 'none' }} onClick={() => rollFree(freeExpr, freeExpr)}>
            Rolar
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
