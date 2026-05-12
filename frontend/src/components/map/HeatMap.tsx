import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/** Heatmap por distrito — conectar datos de consultas 1, 2 u 8 cuando existan. */
export function HeatMap() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-border">
      <MapContainer center={[-16.5, -68.15]} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  )
}
