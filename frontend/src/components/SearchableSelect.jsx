import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  labelKey = 'label',
  valueKey = 'value',
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = options.find((o) => o[valueKey] === value);

  const filtered = options.filter((o) =>
    String(o[labelKey]).toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field w-full text-left flex justify-between items-center"
      >
        <span className={selected ? '' : 'text-stone/50'}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <span className="text-stone/40">▾</span>
      </button>
      {required && !value && (
        <input tabIndex={-1} className="absolute opacity-0 h-0 w-0" required value="" onChange={() => {}} />
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full card p-2 shadow-lg animate-slide-up">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск..."
            className="input-field !py-2 mb-2 text-sm"
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-stone/50">Ничего не найдено</li>
            ) : (
              filtered.map((o) => (
                <li key={o[valueKey]}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o[valueKey]);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-soft text-sm hover:bg-sand transition-colors ${
                      o[valueKey] === value ? 'bg-sand font-medium' : ''
                    }`}
                  >
                    {o[labelKey]}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
