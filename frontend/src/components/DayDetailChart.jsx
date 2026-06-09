import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCategories } from '../context/CategoriesContext';

function formatMoney(v) {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

export default function DayDetailChart({ data }) {
  const { labels } = useCategories();
  if (!data?.products?.length) {
    return <p className="text-stone/60 text-center py-8">Нет продаж за этот день</p>;
  }

  const chartData = data.products.slice(0, 10).map((p) => ({
    name: p.name.length > 20 ? `${p.name.slice(0, 18)}…` : p.name,
    revenue: p.revenue,
    fullName: p.name,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E0D4" />
          <XAxis dataKey="name" tick={{ fill: '#7F8C8D', fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
          <YAxis tick={{ fill: '#7F8C8D', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ borderRadius: 16, border: '1px solid #E6E0D4', background: '#F9F5F0' }}
            formatter={(value) => [formatMoney(value), 'Выручка']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
          />
          <Bar dataKey="revenue" fill="#5C6B5C" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left">
              <th className="py-2 pr-4">Товар</th>
              <th className="py-2 pr-4">Категория</th>
              <th className="py-2 pr-4 text-right">Кол-во</th>
              <th className="py-2 text-right">Выручка</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.name} className="border-b border-sand/50">
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4 text-stone/70">{labels[p.category] || p.category}</td>
                <td className="py-2 pr-4 text-right">{p.quantity}</td>
                <td className="py-2 text-right font-medium">{formatMoney(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
