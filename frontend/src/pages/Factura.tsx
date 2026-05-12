import { useConsultaFactura, facturaMediaCartaPdfUrl, facturaTicketPdfUrl } from '@/api/factura'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Factura() {
  const q23 = useConsultaFactura(23)
  const numero = 'DEMO-001'
  const params = new URLSearchParams({ cliente: 'María Pérez', periodo: '2026-04', importe: '120.50' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted">Consultas 23–25 y descarga de PDFs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recibo {numero}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={facturaTicketPdfUrl(numero, params)} target="_blank" rel="noreferrer">
              PDF ticket 80 mm
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={facturaMediaCartaPdfUrl(numero, params)} target="_blank" rel="noreferrer">
              PDF media carta
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consulta 23</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {q23.isLoading ? <div className="text-muted">Cargando…</div> : null}
          {q23.isError ? <div className="text-rose-400">{(q23.error as Error).message}</div> : null}
          {q23.data ? <pre className="overflow-auto text-xs text-muted">{JSON.stringify(q23.data, null, 2)}</pre> : null}
        </CardContent>
      </Card>
    </div>
  )
}
