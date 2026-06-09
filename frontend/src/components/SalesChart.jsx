import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { CATEGORY_LABELS } from '../constants/categories';

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatMoney(v) {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

export default function SalesChart({ data, onDayClick, selectedDay }) {
  if (!data?.days?.length) {
    return <p className="text-stone/60 text-center py-12">Нет данных за выбранный период</p>;
  }

  const topCats = data.top_categories || [];
  const catColors = data.category_colors || {};

  const chartData = data.days.map((day) => {
    const row = { date: formatDate(day.date), total: day.total, _raw: day.date };
    topCats.forEach((cat) => {
      row[cat] = day.categories[cat] || 0;
    });
    return row;
  });

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          onClick={(state) => {
            const raw = state?.activePayload?.[0]?.payload?._raw;
            if (raw && onDayClick) onDayClick(raw);
          }}
          style={{ cursor: onDayClick ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E0D4" />
          <XAxis dataKey="date" tick={{ fill: '#7F8C8D', fontSize: 12 }} />
          <YAxis tick={{ fill: '#7F8C8D', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid #E6E0D4', background: '#F9F5F0' }}
            formatter={(value, name) => [formatMoney(value), name === 'total' ? 'Итого за день' : name]}
            labelFormatter={(label) => label}
          />
          <Legend />
          {topCats.map((cat) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              name={data.category_labels[cat] || CATEGORY_LABELS[cat] || cat}
              stackId="categories"
              fill={catColors[cat] || '#D4C9B8'}
              stroke={catColors[cat] || '#D4C9B8'}
              fillOpacity={0.7}
            />
          ))}
          <Line
            type="monotone"
            dataKey="total"
            name="Итого за день"
            stroke="#5C6B5C"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const active = selectedDay === payload._raw;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 7 : 4}
                  fill={active ? '#3d4a3d' : '#5C6B5C'}
                  stroke={active ? '#fff' : 'none'}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 8, fill: '#3d4a3d' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
