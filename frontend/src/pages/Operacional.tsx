import { useConsultaOperacional } from '@/api/operacional'
import { ConsumoMensual } from '@/components/charts/ConsumoMensual'
import { GaugeOMS } from '@/components/charts/GaugeOMS'
import { ZonaTabla } from '@/components/charts/ZonaTabla'
import { HeatMap } from '@/components/map/HeatMap'
import { KpiCard } from '@/components/kpi/KpiCard'
import { ClientePopup } from '@/components/popup/ClientePopup'
import { formatM3 } from '@/lib/format'

export default function Operacional() {
  const q1 = useConsultaOperacional(1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard operacional</h1>
        <p className="text-sm text-muted">Mapa, KPIs y consultas 1–8.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Consumo mensual (demo)" value={formatM3(18420)} deltaPct={2.4} />
        <KpiCard title="Reclamos abiertos" value="128" deltaPct={-4.1} />
        <KpiCard title="Lecturas completadas" value="94 %" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-sm font-medium">Mapa / heatmap</div>
          <HeatMap />
        </div>
        <div className="space-y-3">
          <div className="text-sm font-medium">Cliente</div>
          <ClientePopup nombre="María Pérez" codigo="M-102938" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">Consumo mensual</div>
          <ConsumoMensual />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Gauge OMS</div>
          <GaugeOMS value={68} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Zonas</div>
        <ZonaTabla />
      </div>

      <div className="rounded-lg border border-border p-4 text-sm">
        <div className="font-medium">Consulta 1 (API)</div>
        {q1.isLoading ? <div className="text-muted">Cargando…</div> : null}
        {q1.isError ? <div className="text-rose-400">{(q1.error as Error).message}</div> : null}
        {q1.data ? <pre className="mt-2 overflow-auto text-xs text-muted">{JSON.stringify(q1.data, null, 2)}</pre> : null}
      </div>
    </div>
  )
}
