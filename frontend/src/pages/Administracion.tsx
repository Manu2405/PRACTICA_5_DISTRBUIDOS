import { useConsultaAdministracion } from '@/api/administracion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Administracion() {
  const q16 = useConsultaAdministracion(16)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
        <p className="text-sm text-muted">Consultas 16–22.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta 16</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {q16.isLoading ? <div className="text-muted">Cargando…</div> : null}
          {q16.isError ? <div className="text-rose-400">{(q16.error as Error).message}</div> : null}
          {q16.data ? <pre className="overflow-auto text-xs text-muted">{JSON.stringify(q16.data, null, 2)}</pre> : null}
        </CardContent>
      </Card>
    </div>
  )
}
