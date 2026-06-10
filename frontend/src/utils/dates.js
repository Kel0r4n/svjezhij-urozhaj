/** ISO date YYYY-MM-DD */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Понедельник–воскресенье недели, в которую попадает date */
export function getWeekRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: toISODate(mon), to: toISODate(sun) };
}

export function getCurrentWeekRange() {
  return getWeekRange(new Date());
}

export function shiftWeek(isoDate, weeks) {
  const d = parseISODate(isoDate);
  d.setDate(d.getDate() + weeks * 7);
  return getWeekRange(d);
}

export function formatRangeLabel(from, to) {
  const f = parseISODate(from);
  const t = parseISODate(to);
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
  const sameYear = f.getFullYear() === t.getFullYear();
  const optsDay = { day: 'numeric' };
  const optsMonth = { day: 'numeric', month: 'short' };
  const optsFull = { day: 'numeric', month: 'short', year: 'numeric' };

  if (from === to) {
    return f.toLocaleDateString('ru-RU', optsFull);
  }
  if (sameMonth) {
    return `${f.getDate()}–${t.toLocaleDateString('ru-RU', optsFull)}`;
  }
  if (sameYear) {
    return `${f.toLocaleDateString('ru-RU', optsMonth)} – ${t.toLocaleDateString('ru-RU', optsFull)}`;
  }
  return `${f.toLocaleDateString('ru-RU', optsFull)} – ${t.toLocaleDateString('ru-RU', optsFull)}`;
}
