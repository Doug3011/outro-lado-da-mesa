import { useTableStore } from '../store/useTableStore';
import type { RollLogEntry } from '../types';
import type { ExpressionResult, OrdemTestResult } from '../domain/dice';

export function RollLog() {
  const rollLog = useTableStore((s) => s.rollLog);
  if (rollLog.length === 0)
    return <p className="empty">O histórico de rolagens da mesa aparece aqui.</p>;
  return (
    <div className="log-list">
      {rollLog.map((e) => (
        <Entry key={e.id} e={e} />
      ))}
    </div>
  );
}

function Entry({ e }: { e: RollLogEntry }) {
  const time = new Date(e.at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="log-entry" style={{ borderLeftColor: e.authorColor }}>
      <div className="log-head">
        <span className="log-author" style={{ color: e.authorColor }}>
          {e.authorName}
        </span>
        <span className="faint">{time}</span>
      </div>
      <div className="log-label" style={{ fontSize: 12, marginBottom: 2 }}>
        {e.label}
      </div>
      {e.result.kind === 'ordem-test' ? (
        <OrdemBody r={e.result} />
      ) : (
        <ExprBody r={e.result} />
      )}
    </div>
  );
}

function OrdemBody({ r }: { r: OrdemTestResult }) {
  const cls = r.critical
    ? 'crit'
    : r.success === true
      ? 'success'
      : r.success === false
        ? 'fail'
        : '';
  return (
    <>
      <div className={`log-total ${cls}`}>
        {r.total}
        {r.dt != null && (
          <span style={{ fontSize: 12, fontWeight: 500 }} className="faint">
            {' '}
            vs DT {r.dt} —{' '}
            {r.success ? (
              <strong style={{ color: 'var(--green)' }}>sucesso</strong>
            ) : (
              <strong style={{ color: 'var(--blood-bright)' }}>falha</strong>
            )}
          </span>
        )}
      </div>
      <div className="faint" style={{ fontSize: 11 }}>
        {r.pickedLowest
          ? '2d20 (menor, atributo 0)'
          : `${r.diceCount}d20 (maior)`}{' '}
        {r.chosen} {r.bonus >= 0 ? '+' : '−'} {Math.abs(r.bonus)} = {r.total}
        {r.critical && <strong style={{ color: 'var(--gold)' }}> · CRÍTICO (20)</strong>}
        {r.fumble && <strong style={{ color: 'var(--blood-bright)' }}> · desastre (1)</strong>}
      </div>
      <div className="dice-pills">
        {r.dice.map((d, i) => (
          <span
            key={i}
            className={
              'die ' + (d === r.chosen ? 'kept ' : '') + (d === 20 ? 'max' : '')
            }
          >
            {d}
          </span>
        ))}
      </div>
    </>
  );
}

function ExprBody({ r }: { r: ExpressionResult }) {
  if (!r.valid)
    return (
      <div className="faint" style={{ color: 'var(--blood-bright)' }}>
        {r.error}
      </div>
    );
  return (
    <>
      <div className="log-total">{r.total}</div>
      <div className="faint" style={{ fontSize: 11 }}>
        {r.expression}
      </div>
      <div className="dice-pills">
        {r.terms.map((t, ti) =>
          t.results.map((d, di) => {
            const isKept =
              t.kept.filter((k) => k === d).length >
              t.results.slice(0, di).filter((k) => k === d).length;
            return (
              <span
                key={`${ti}-${di}`}
                className={'die ' + (t.keep && !isKept ? '' : 'kept') + (d === t.sides ? ' max' : '')}
              >
                {d}
              </span>
            );
          }),
        )}
        {r.modifier !== 0 && (
          <span className="die kept">
            {r.modifier > 0 ? '+' : '−'}
            {Math.abs(r.modifier)}
          </span>
        )}
      </div>
    </>
  );
}
