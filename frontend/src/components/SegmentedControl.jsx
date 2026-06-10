export default function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-full bg-sand/70 p-1 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            value === opt.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-stone/80 hover:text-stone'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
