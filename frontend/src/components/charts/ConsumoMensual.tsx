import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const demo = [
  { mes: 'Ene', m3: 120 },
  { mes: 'Feb', m3: 132 },
  { mes: 'Mar', m3: 101 },
  { mes: 'Abr', m3: 154 },
]

export function ConsumoMensual() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={demo} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{ background: '#0b1220', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#e8eefc' }}
          />
          <Bar dataKey="m3" fill="#38bdf8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
