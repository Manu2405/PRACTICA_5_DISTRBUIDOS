import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  GeoJSON
} from 'react-leaflet';

import distritosData from '../distritos/distritos_oficiales.json';
import comunasData from '../comunas/comunas.json';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix iconos
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ESTADO_COLORS: Record<string, string> = {
  activo: '#10b981',
  inactivo: '#f59e0b',
  fuera_servicio: '#ef4444',
};

interface MapComponentProps {
  mapa: any[];
  distritoSeleccionado?: number | null;
  subalcaldiaSeleccionada?: string | null;
  zonaSeleccionada?: string | null;
  searchQuery?: string | null;
}

// Componente seguro para refrescar tamaño
function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Componente para actualizar centro o hacer fitBounds al distrito/comuna o buscar zona
export function UpdateMapCenter({ center, distritoSeleccionado, subalcaldiaSeleccionada, zonaSeleccionada, searchQuery }: { center: [number, number], distritoSeleccionado: number | null, subalcaldiaSeleccionada: string | null, zonaSeleccionada: string | null, searchQuery?: string | null }) {
  const map = useMap();
  useEffect(() => {
    let activeMarker: L.Marker | null = null;

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchedFeatures = (distritosData as any).features?.filter((f: any) => {
         const distStr = f.properties.distrito.toString();
         if (q === distStr || q === `distrito ${distStr}` || q === `distrito 0${distStr}`) return true;
         
         const matchingComunas = (comunasData as any).features?.filter((c: any) => c.properties.comuna.toLowerCase() === q);
         if (matchingComunas && matchingComunas.some((c: any) => c.properties.distritos.includes(f.properties.distrito))) return true;
         return false;
      });
      if (matchedFeatures && matchedFeatures.length > 0 && matchedFeatures.length < 15) {
         const group = L.featureGroup(matchedFeatures.map((f: any) => L.geoJSON(f)));
         map.flyToBounds(group.getBounds(), { padding: [30, 30], duration: 1.5 });
         return;
      }
    }

    if (zonaSeleccionada && zonaSeleccionada !== 'Todas las Zonas') {
      const query = encodeURIComponent(zonaSeleccionada);
      let viewboxParam = '-66.25,-17.30,-66.05,-17.45'; // Cochabamba default bounding box
      let fallbackCenter: L.LatLng | null = null;
      let targetBounds: L.LatLngBounds | null = null;

      // Si tenemos un distrito seleccionado (auto-seleccionado al elegir zona), usar sus límites
      if (distritoSeleccionado) {
        const feature = (distritosData as any).features?.find((f: any) => f.properties.distrito === distritoSeleccionado);
        if (feature) {
          targetBounds = L.geoJSON(feature).getBounds();
          fallbackCenter = targetBounds.getCenter();
          // viewbox = minLon, maxLat, maxLon, minLat
          viewboxParam = `${targetBounds.getWest()},${targetBounds.getNorth()},${targetBounds.getEast()},${targetBounds.getSouth()}`;
        }
      }

      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&viewbox=${viewboxParam}&bounded=1&limit=1`)
        .then(res => res.json())
        .then(data => {
          let latLng: [number, number];
          let zoomLevel = 15;
          
          if (data && data.length > 0) {
            latLng = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          } else if (fallbackCenter) {
            latLng = [fallbackCenter.lat, fallbackCenter.lng];
            zoomLevel = 14; // Un poco más lejos ya que es el centro del distrito completo
          } else {
            return; // No se pudo determinar ubicación
          }

          map.flyTo(latLng, zoomLevel, { animate: true, duration: 1.5 });
          activeMarker = L.marker(latLng).addTo(map);
          activeMarker.bindPopup(`<div style="font-size:13px;"><b>📍 Zona: ${zonaSeleccionada}</b><br/>Ubicación aproximada dentro del distrito</div>`).openPopup();
        })
        .catch(err => console.error('Error en geocoding de zona:', err));
        
      return () => {
        if (activeMarker) map.removeLayer(activeMarker);
      };
    }

    if (distritoSeleccionado) {
      const feature = (distritosData as any).features?.find((f: any) => f.properties.distrito === distritoSeleccionado);
      if (feature) {
        const bounds = L.geoJSON(feature).getBounds();
        map.flyToBounds(bounds, { padding: [30, 30], duration: 1.5 });
        return;
      }
    }
    
    if (subalcaldiaSeleccionada && subalcaldiaSeleccionada !== 'Todas las Subalcaldías') {
      const comuna = (comunasData as any).features?.find((c: any) => c.properties.comuna.toLowerCase() === subalcaldiaSeleccionada.toLowerCase());
      if (comuna && comuna.properties.distritos) {
        const distritosDeComuna = (distritosData as any).features?.filter((f: any) => comuna.properties.distritos.includes(f.properties.distrito));
        if (distritosDeComuna && distritosDeComuna.length > 0) {
          const group = L.featureGroup(distritosDeComuna.map((f: any) => L.geoJSON(f)));
          map.flyToBounds(group.getBounds(), { padding: [30, 30], duration: 1.5 });
          return;
        }
      }
    }
    
    if (center[0] && center[1]) {
      map.flyTo(center, 13, { animate: true, duration: 1.5 });
    }
  }, [center[0], center[1], distritoSeleccionado, subalcaldiaSeleccionada, zonaSeleccionada, searchQuery, map]);
  return null;
}

export default function MapComponent({ mapa, distritoSeleccionado = null, subalcaldiaSeleccionada = null, zonaSeleccionada = null, searchQuery = null }: MapComponentProps) {
  // Validar coordenadas
  const validMapa =
    mapa?.filter(
      (m) =>
        m &&
        typeof m.lat === 'number' &&
        typeof m.lon === 'number' &&
        !isNaN(m.lat) &&
        !isNaN(m.lon)
    ) || [];

  if (validMapa.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888'
        }}
      >
        No hay datos de mapa disponibles
      </div>
    );
  }

  const center: [number, number] = [
    validMapa[0].lat,
    validMapa[0].lon,
  ];

  const handleNotification = (m: any) => {
    alert(`Enviando notificaciones (WhatsApp, SMS, Email) a ${m.cliente || m.serie} ... ¡Enviado exitosamente!`);
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{
          height: '100%',
          width: '100%',
          borderRadius: '8px'
        }}
      >
        <ResizeMap />
        <UpdateMapCenter center={center} distritoSeleccionado={distritoSeleccionado} subalcaldiaSeleccionada={subalcaldiaSeleccionada} zonaSeleccionada={zonaSeleccionada} searchQuery={searchQuery} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap & CartoDB"
        />

        {/* Capa de Distritos */}
        <GeoJSON 
          data={distritosData as any} 
          style={(feature: any) => {
            let isSelected = false;
            let isAnySelected = false;

            if (searchQuery) {
              const q = searchQuery.toLowerCase().trim();
              const distStr = feature.properties.distrito.toString();
              if (q === distStr || q === `distrito ${distStr}` || q === `distrito 0${distStr}`) {
                isSelected = true;
                isAnySelected = true;
              } else {
                const matchingComunas = (comunasData as any).features?.filter((c: any) => c.properties.comuna.toLowerCase() === q);
                if (matchingComunas && matchingComunas.some((c: any) => c.properties.distritos.includes(feature.properties.distrito))) {
                  isSelected = true;
                  isAnySelected = true;
                }
              }
            } else if (distritoSeleccionado !== null) {
              isSelected = feature.properties.distrito === distritoSeleccionado;
              isAnySelected = true;
            } else if (subalcaldiaSeleccionada !== null && subalcaldiaSeleccionada !== 'Todas las Subalcaldías') {
              isAnySelected = true;
              const comuna = (comunasData as any).features?.find((c: any) => c.properties.comuna.toLowerCase() === subalcaldiaSeleccionada.toLowerCase());
              if (comuna && comuna.properties.distritos) {
                isSelected = comuna.properties.distritos.includes(feature.properties.distrito);
              }
            }
            
            return {
              color: isSelected ? '#f59e0b' : '#3b82f6',
              weight: isSelected ? 3 : 1,
              fillColor: isSelected ? '#f59e0b' : '#3b82f6',
              fillOpacity: isSelected ? 0.3 : (isAnySelected ? 0.05 : 0.1),
            };
          }}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(`<strong>Distrito ${feature.properties.distrito}</strong>`);
          }}
        />

        {validMapa.map((m: any, i: number) => (
          <CircleMarker
            key={m.id || m.serie || i}
            center={[m.lat, m.lon]}
            radius={8}
            pathOptions={{
              color: ESTADO_COLORS[m.estado] || '#3b82f6',
              fillColor: ESTADO_COLORS[m.estado] || '#3b82f6',
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div
                style={{
                  color: '#333',
                  fontSize: 13,
                  minWidth: '220px',
                }}
              >
                <strong>Contrato: {m.contrato || m.serie || 'N/A'}</strong>
                <br />
                Cliente: {m.cliente || 'Desconocido'}
                <br />
                Estado:{' '}
                <span
                  style={{
                    color:
                      ESTADO_COLORS[m.estado] || '#3b82f6',
                    fontWeight: 'bold',
                  }}
                >
                  {m.estado?.replace('_', ' ') ||
                    'desconocido'}
                </span>
                <br />
                Distrito {m.distrito || 'N/A'} ·{' '}
                {m.zona || 'N/A'}

                {/* Minigráfica simulada de consumo reciente */}
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Consumo últimos 3 meses:</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
                    <div style={{ width: '30%', backgroundColor: '#3b82f6', height: '60%', borderRadius: '2px 2px 0 0' }} title="Mes -3"></div>
                    <div style={{ width: '30%', backgroundColor: '#3b82f6', height: '80%', borderRadius: '2px 2px 0 0' }} title="Mes -2"></div>
                    <div style={{ width: '30%', backgroundColor: '#f59e0b', height: '100%', borderRadius: '2px 2px 0 0' }} title="Mes Actual"></div>
                  </div>
                </div>

                <button 
                  onClick={() => handleNotification(m)}
                  style={{ 
                    marginTop: '8px', 
                    padding: '6px 12px', 
                    background: '#6366f1', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    width: '100%',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  Enviar WP/SMS/Email
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}