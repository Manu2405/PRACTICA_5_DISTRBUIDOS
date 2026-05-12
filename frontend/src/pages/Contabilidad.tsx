import { useConsultaContabilidad } from '@/api/contabilidad'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Contabilidad() {
  const q9 = useConsultaContabilidad(9)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contabilidad</h1>
        <p className="text-sm text-muted">Consultas 9–15.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta 9</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {q9.isLoading ? <div className="text-muted">Cargando…</div> : null}
          {q9.isError ? <div className="text-rose-400">{(q9.error as Error).message}</div> : null}
          {q9.data ? <pre className="overflow-auto text-xs text-muted">{JSON.stringify(q9.data, null, 2)}</pre> : null}
        </CardContent>
      </Card>
    </div>
  )
}
