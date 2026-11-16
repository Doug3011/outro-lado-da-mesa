import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SKILL_BY_KEY } from '../data/ordem';
import { ORIGIN_LIST } from '../data/origins';
import { CheckIcon, CloseFloatIcon, OriginPowerIcon } from './icons';

// Tela cheia de escolha de origem — pedido do usuário pra substituir o
// combobox apertado (SearchSelect) tanto no wizard quanto na ficha já
// criada: lista de um lado, detalhe (perícias + poder) do outro, só
// confirma com um botão explícito. Reaproveita o visual já estabelecido
// do card-list de Classe (`.rd-cw-class-*`) — mesmo critério de design já
// usado no resto do app.
interface OriginPickerDialogProps {
  value: string;
  onPick: (name: string) => void;
  onClose: () => void;
}

export function OriginPickerDialog({ value, onPick, onClose }: OriginPickerDialogProps) {
  const [picked, setPicked] = useState<string | null>(
    ORIGIN_LIST.some((o) => o.name === value) ? value : null,
  );
  const activeDef = picked ? ORIGIN_LIST.find((o) => o.name === picked) ?? null : null;

  return createPortal(
    <div className="rd-op">
      <div className="rd-op-top">
        <span className="rd-op-brand">Escolher origem</span>
        <button type="button" className="rd-op-close" aria-label="Fechar sem escolher" onClick={onClose}>
          <CloseFloatIcon />
        </button>
      </div>
      <div className="rd-op-body">
        <div className="rd-op-list" role="listbox" aria-label="Origens">
          {ORIGIN_LIST.map((o) => {
            const on = picked === o.name;
            return (
              <button
                key={o.name}
                type="button"
                role="option"
                aria-selected={on}
                className={'rd-cw-class-card rd-op-item' + (on ? ' on' : '')}
                onClick={() => setPicked(o.name)}
              >
                <span className="rd-cw-class-body">
                  <span className="rd-cw-class-name">{o.name}</span>
                </span>
                {on && (
                  <span className="rd-cw-class-check">
                    <CheckIcon size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="rd-op-detail">
          {activeDef ? (
            <>
              <h3 className="rd-op-detail-name">{activeDef.name}</h3>
              <div className="rd-op-detail-skills">
                {activeDef.skills === 'choice'
                  ? 'Perícias: 2 à escolha (marcadas depois na etapa/aba de Perícias).'
                  : `Já treina: ${activeDef.skills.map((k) => SKILL_BY_KEY[k]?.name ?? k).join(' e ')}.`}
              </div>
              <div className="rd-op-detail-power">
                <OriginPowerIcon />
                <div className="rd-op-detail-power-text">
                  <div className="rd-op-detail-power-name">{activeDef.power}</div>
                  <div className="rd-op-detail-power-note">{activeDef.powerNote}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="rd-op-detail-empty">Escolha uma origem na lista pra ver perícias e poder.</p>
          )}
        </div>
      </div>
      <div className="rd-cw-foot">
        <button type="button" className="rd-cw-cancel" onClick={onClose}>
          Fechar sem escolher
        </button>
        <button
          type="button"
          className="rd-cw-foot-next"
          disabled={!picked}
          onClick={() => picked && onPick(picked)}
        >
          Escolher esta origem
        </button>
      </div>
    </div>,
    document.body,
  );
}
