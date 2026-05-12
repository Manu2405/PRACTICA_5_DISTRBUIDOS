import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type KpiCardProps = {
  title: string
  value: string
  deltaPct?: number
}

export function KpiCard({ title, value, deltaPct }: KpiCardProps) {
  const tone =
    deltaPct == null ? 'text-muted' : deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {deltaPct != null ? <div className={`mt-1 text-xs ${tone}`}>{deltaPct >= 0 ? '+' : ''}{deltaPct}% vs mes anterior</div> : null}
      </CardContent>
    </Card>
  )
}
