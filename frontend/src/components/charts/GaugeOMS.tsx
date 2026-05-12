import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

type GaugeOMSProps = {
  /** 0–100 respecto a umbral OMS */
  value: number
}

export function GaugeOMS({ value }: GaugeOMSProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const data = [
    { name: 'uso', v: clamped },
    { name: 'resto', v: 100 - clamped },
  ]
  return (
    <div className="relative mx-auto h-44 w-full max-w-xs">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="v" startAngle={180} endAngle={0} innerRadius={56} outerRadius={72} paddingAngle={0}>
            <Cell fill="#38bdf8" />
            <Cell fill="#1e293b" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-2">
        <div className="text-2xl font-semibold tabular-nums">{clamped}%</div>
        <div className="text-xs text-muted">vs OMS</div>
      </div>
    </div>
  )
}
