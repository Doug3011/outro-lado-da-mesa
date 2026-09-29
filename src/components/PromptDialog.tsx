import { useEffect, useRef } from 'react';
import { usePromptDialog } from '../state/promptDialog';

// Modal global que substitui window.prompt() (não funciona no Electron — ver
// state/promptDialog.ts). Fica montado uma vez em App.tsx e só aparece quando
// algum componente chama askText(...).
export function PromptDialog() {
  const open = usePromptDialog((s) => s.open);
  const message = usePromptDialog((s) => s.message);
  const value = usePromptDialog((s) => s.value);
  const setValue = usePromptDialog((s) => s.setValue);
  const confirm = usePromptDialog((s) => s.confirm);
  const cancel = usePromptDialog((s) => s.cancel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="prompt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <form
        className="prompt-box"
        onSubmit={(e) => {
          e.preventDefault();
          confirm();
        }}
      >
        <p className="prompt-message">{message}</p>
        <input
          ref={inputRef}
          className="prompt-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
        />
        <div className="prompt-actions">
          <button type="button" className="small ghost" onClick={cancel}>
            Cancelar
          </button>
          <button type="submit" className="small primary">
            OK
          </button>
        </div>
      </form>
    </div>
  );
}
