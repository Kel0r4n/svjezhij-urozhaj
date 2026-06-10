import { useEffect, useRef, useState } from 'react';
import {
  toISODate,
  parseISODate,
  getWeekRange,
  formatRangeLabel,
} from '../utils/dates';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isBetween(iso, from, to) {
  if (!from || !to) return false;
  return iso >= from && iso <= to;
}

export default function DateRangePicker({ open, onClose, value, onChange, anchorRef, singleDay = false }) {
  const panelRef = useRef(null);
  const [viewDate, setViewDate] = useState(() => parseISODate(value.from));
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);
  const [pickingEnd, setPickingEnd] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftFrom(value.from);
      setDraftTo(value.to);
      setPickingEnd(false);
      setViewDate(parseISODate(value.from));
    }
  }, [open, value.from, value.to]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        anchorRef?.current?.contains(e.target)
      ) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = daysInMonth(year, month);
  const cells = [];

  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(toISODate(new Date(year, month, d)));
  }

  const handleDayClick = (iso) => {
    if (singleDay) {
      onChange({ from: iso, to: iso });
      onClose();
      return;
    }
    if (!pickingEnd || !draftFrom) {
      setDraftFrom(iso);
      setDraftTo(iso);
      setPickingEnd(true);
      return;
    }
    let from = draftFrom;
    let to = iso;
    if (to < from) [from, to] = [to, from];
    setDraftFrom(from);
    setDraftTo(to);
    setPickingEnd(false);
  };

  const apply = () => {
    onChange({ from: draftFrom, to: draftTo });
    onClose();
  };

  const setThisWeek = () => {
    const w = getWeekRange(new Date());
    setDraftFrom(w.from);
    setDraftTo(w.to);
    setPickingEnd(false);
    setViewDate(parseISODate(w.from));
  };

  const rect = anchorRef?.current?.getBoundingClientRect();
  const style = rect
    ? { top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 340) }
    : {};

  return (
    <div
      ref={panelRef}
      className="fixed z-[60] w-[min(320px,calc(100vw-2rem))] animate-slide-up"
      style={style}
    >
      <div className="rounded-[24px] border border-sand/80 bg-[#FDF8F3] p-4 shadow-xl shadow-stone/10">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sand/60 text-stone transition hover:bg-warm"
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-stone">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sand/60 text-stone transition hover:bg-warm"
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone/70">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e-${i}`} />;
            const inRange = isBetween(iso, draftFrom, draftTo);
            const isStart = iso === draftFrom;
            const isEnd = iso === draftTo;
            const isSingle = draftFrom === draftTo && isStart;
            const today = iso === toISODate(new Date());

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(iso)}
                className={[
                  'relative h-9 text-sm transition',
                  inRange && !isSingle ? 'bg-accent/20' : '',
                  isStart || isEnd ? 'z-10 bg-accent text-white font-medium shadow-sm' : 'text-stone hover:bg-sand/50',
                  isStart && !isSingle ? 'rounded-l-full' : '',
                  isEnd && !isSingle ? 'rounded-r-full' : '',
                  isSingle ? 'rounded-full' : '',
                  !isStart && !isEnd && inRange ? 'rounded-none' : '',
                  !inRange ? 'rounded-full' : '',
                  today && !isStart && !isEnd ? 'ring-1 ring-accent/40' : '',
                ].join(' ')}
              >
                {parseISODate(iso).getDate()}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-xs text-stone/80">
          {singleDay
            ? 'Выберите день'
            : pickingEnd && draftFrom
              ? 'Выберите конечную дату'
              : formatRangeLabel(draftFrom, draftTo)}
        </p>

        {!singleDay && (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={setThisWeek} className="btn-secondary flex-1 !py-2 text-sm">
              Эта неделя
            </button>
            <button type="button" onClick={apply} className="btn-primary flex-1 !py-2 text-sm">
              Применить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
