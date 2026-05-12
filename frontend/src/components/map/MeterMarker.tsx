import { CircleMarker, Popup } from 'react-leaflet'

export type MeterMarkerProps = {
  position: [number, number]
  codigo: string
  distrito?: string
}

export function MeterMarker({ position, codigo, distrito }: MeterMarkerProps) {
  return (
    <CircleMarker center={position} radius={8} pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.7 }}>
      <Popup>
        <div className="text-sm">
          <div className="font-medium">{codigo}</div>
          {distrito ? <div className="text-muted">{distrito}</div> : null}
        </div>
      </Popup>
    </CircleMarker>
  )
}
