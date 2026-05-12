import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ClientePopupProps = {
  nombre: string
  codigo: string
  onEnviarRecibo?: () => void
}

/** Popup cliente + envío de recibo (mock alineado al .pen). */
export function ClientePopup({ nombre, codigo, onEnviarRecibo }: ClientePopupProps) {
  return (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle className="text-base">{nombre}</CardTitle>
        <div className="text-sm text-muted">Medidor {codigo}</div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onEnviarRecibo}>
          Enviar recibo
        </Button>
        <Button type="button" variant="outline" className="flex-1">
          Ver cuenta
        </Button>
      </CardContent>
    </Card>
  )
}
