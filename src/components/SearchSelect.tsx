import { useEffect, useRef, useState } from 'react';

// Combobox com a cara do app, pra substituir `<input list>`/`<datalist>` —
// pedido do usuário: a lista nativa do navegador (ex. escolher Origem no
// wizard) não tem estilo nenhum, fica cortada na tela e não dá pra rolar.
// Usa `position: fixed` com a posição calculada a partir do input (em vez de
// `position: absolute` simples) porque o campo normalmente mora dentro de um
// container com `overflow-y: auto` (`.rd-cw-main`) — um menu absoluto comum
// ficaria cortado ao abrir perto do fim da área rolável.
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{ top?: number; bottom?: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const q = value.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  // Tenta embaixo do campo; se não couber (campo perto do rodapé da
  // janela), vira pra cima dele — mesmo comportamento clássico de
  // combobox, pra nunca cortar a lista na borda da tela.
  const MENU_MAX_H = 260;
  const place = () => {
    const r = inputRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < MENU_MAX_H && r.top > spaceBelow) {
      setMenuStyle({ bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width });
    } else {
      setMenuStyle({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    // BUG achado (usuário: "a lista fica embaixo e some se eu tentar
    // rolar") — `scroll` num elemento com overflow não borbulha no modo
    // normal, mas UM LISTENER NO WINDOW COM `capture: true` ainda recebe
    // ele (fase de captura alcança qualquer descendente). Rolar a PRÓPRIA
    // lista do menu disparava esse listener e fechava o menu na hora,
    // antes do primeiro scroll "pegar". Ignora quando o scroll vem de
    // dentro do próprio menu — só fecha quando é outra coisa rolando por
    // baixo (o que invalidaria a posição calculada em `place()`).
    const onScroll = (e: Event) => {
      const menu = menuRef.current;
      if (menu && e.target instanceof Node && (e.target === menu || menu.contains(e.target))) return;
      close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => setHighlight(0), [value, open]);

  return (
    <div className="rd-search-select" ref={wrapRef}>
      <input
        id={id}
        ref={inputRef}
        className={className}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            if (open && filtered[highlight]) {
              e.preventDefault();
              onChange(filtered[highlight]);
              setOpen(false);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div
          ref={menuRef}
          className="rd-search-select-menu"
          role="listbox"
          style={{
            top: menuStyle.top,
            bottom: menuStyle.bottom,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: MENU_MAX_H,
          }}
        >
          {filtered.map((o, i) => (
            <button
              type="button"
              key={o}
              role="option"
              aria-selected={o === value}
              className={'rd-search-select-opt' + (i === highlight ? ' hl' : '') + (o === value ? ' on' : '')}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
