import { formatRuPhoneInput } from '../utils/phone';

const PREFIX_LEN = 3; // "+7 "

export default function PhoneInput({ value, onChange, className = 'input-field', ...props }) {
  const handleChange = (e) => {
    onChange(formatRuPhoneInput(e.target.value));
  };

  const handleKeyDown = (e) => {
    const start = e.target.selectionStart ?? 0;
    const end = e.target.selectionEnd ?? 0;
    if ((e.key === 'Backspace' && start <= PREFIX_LEN && end <= PREFIX_LEN)
      || (e.key === 'Delete' && start < PREFIX_LEN)) {
      e.preventDefault();
    }
  };

  const handleFocus = (e) => {
    if (!e.target.value || e.target.value === '+7') {
      onChange('+7 ');
    }
  };

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={className}
      placeholder="+7 (900) 123 4567"
      {...props}
    />
  );
}
