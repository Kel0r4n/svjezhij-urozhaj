export default function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || '#E6E0D4'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-soft cursor-pointer border border-sand bg-transparent"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="input-field flex-1 !py-2 font-mono text-sm"
          placeholder="#E6E0D4"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  );
}
