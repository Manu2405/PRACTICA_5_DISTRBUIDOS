import { useEffect, useState, useMemo } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { Building2, Droplets, ArrowUpRight, CloudRain, Thermometer, Wind, AlertTriangle, Search } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, ComposedChart } from 'recharts';
import distritosData from '../distritos/distritos_oficiales.json';
import { ZONAS_DB } from './OperacionalPage';
import { UpdateMapCenter } from '../components/MapComponent';
import comunasData from '../comunas/comunas.json';

import 'leaflet/dist/leaflet.css';

// Fix iconos leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ResizeMap() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200); }, [map]);
  return null;
}

const CHART_COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6366f1','#14b8a6','#a855f7','#f43f5e','#0ea5e9','#10b981'];

export default function AlcaldiaPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [kpis, setKpis] = useState<any>(null);
  const [mapaBase, setMapaBase] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [subAlcaldia, setSubAlcaldia] = useState('Todas las Subalcaldías');
  const [distrito, setDistrito] = useState('Todos los Distritos');
  const [zona, setZona] = useState('Todas las Zonas');

  useEffect(() => {
    setLoading(true);
    
    // Preparar parámetros para la futura implementación del backend
    const params = new URLSearchParams({
      periodo,
      ...(searchQuery && { q: searchQuery }),
      ...(subAlcaldia !== 'Todas las Subalcaldías' && { subalcaldia: subAlcaldia }),
      ...(distrito !== 'Todos los Distritos' && { distrito }),
      ...(zona !== 'Todas las Zonas' && { zona }),
    }).toString();

    Promise.all([
      API.get(`/api/mvc/alcaldia/kpis?${params}`),
      API.get(`/api/mvc/alcaldia/mapa-distritos?${params}`),
    ]).then(([k, m]) => {
      setKpis(k.data);
      setMapaBase(m.data.data || []);
    }).catch(err => {
      console.warn('Usando datos simulados (Backend no disponible):', err.message);
      setKpis({
        consumo_total_m3: 125000,
        deuda_alcaldia_bs: 250430,
        indice_hidrico_total: 98,
        top_distrito: 'Distrito 1',
        top_consumo_m3: 18500,
        ranking: [
          { nombre: 'Distrito 1', consumo_m3: 18500 },
          { nombre: 'Distrito 2', consumo_m3: 22400 },
          { nombre: 'Distrito 3', consumo_m3: 16800 },
        ],
        datosMedioAmbiente: [
          { mes: 'Ene', consumo: 25.2, temperatura: 24, contaminacion: 0.8 },
          { mes: 'Feb', consumo: 24.5, temperatura: 23, contaminacion: 0.75 },
          { mes: 'Mar', consumo: 28.1, temperatura: 25, contaminacion: 0.85 },
          { mes: 'Abr', consumo: 30.2, temperatura: 26, contaminacion: 0.9 },
          { mes: 'May', consumo: 32.5, temperatura: 28, contaminacion: 0.95 },
          { mes: 'Jun', consumo: 35.1, temperatura: 30, contaminacion: 1.1 },
          { mes: 'Jul', consumo: 34.0, temperatura: 29, contaminacion: 1.05 },
          { mes: 'Ago', consumo: 36.5, temperatura: 31, contaminacion: 1.2 },
        ]
      });
      setMapaBase([
        { lat: -17.3895, lon: -66.1568, consumo_m3: 18500, nombre: 'Distrito 1', subalcaldia: 'TUNARI', poblacion: 50000 },
        { lat: -17.3965, lon: -66.1550, consumo_m3: 22400, nombre: 'Distrito 2', subalcaldia: 'TUNARI', poblacion: 60000 },
        { lat: -17.3850, lon: -66.1480, consumo_m3: 16800, nombre: 'Distrito 3', subalcaldia: 'MOLLE', poblacion: 45000 },
      ]);
    }).finally(() => setLoading(false));
    // Se elimina la dependencia de los filtros (searchQuery, subAlcaldia, distrito, zona)
    // para que el filtrado se realice 100% en tiempo real en memoria por el frontend (useMemo),
    // sin mostrar la pantalla de carga.
  }, [periodo]);

  const subAlcaldiasOptions = useMemo(() => {
    const subs = Array.from(new Set(ZONAS_DB.map(z => z.sub)));
    return ['Todas las Subalcaldías', ...subs];
  }, []);
  
  const distritosOptions = useMemo(() => {
    if (subAlcaldia === 'Todas las Subalcaldías') {
      return ['Todos los Distritos', ...Array.from(new Set(ZONAS_DB.map(z => z.dist))).sort((a, b) => a - b)];
    }
    return ['Todos los Distritos', ...Array.from(new Set(ZONAS_DB.filter(z => z.sub === subAlcaldia).map(z => z.dist))).sort((a, b) => a - b)];
  }, [subAlcaldia]);
  
  const zonasOptions = useMemo(() => {
    let filtered = ZONAS_DB;
    if (subAlcaldia !== 'Todas las Subalcaldías') filtered = filtered.filter(z => z.sub === subAlcaldia);
    if (distrito !== 'Todos los Distritos') filtered = filtered.filter(z => z.dist.toString() === distrito);
    return ['Todas las Zonas', ...Array.from(new Set(filtered.map(z => z.zona)))];
  }, [subAlcaldia, distrito]);

  const mapaFiltrado = useMemo(() => {
    return mapaBase.filter(m => {
      let match = true;
      if (subAlcaldia !== 'Todas las Subalcaldías' && m.subalcaldia !== subAlcaldia) match = false;
      if (distrito !== 'Todos los Distritos' && m.nombre !== `Distrito ${distrito}` && m.nombre !== `Distrito 0${distrito}`) match = false;
      
      if (zona !== 'Todas las Zonas') {
         const zonaInfo = ZONAS_DB.find(z => z.zona === zona);
         if (zonaInfo && m.nombre !== `Distrito ${zonaInfo.dist}` && m.nombre !== `Distrito 0${zonaInfo.dist}`) {
            match = false;
         }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const subMatch = m.subalcaldia.toLowerCase() === q || m.subalcaldia.toLowerCase().includes(q);
        
        let distMatch = false;
        const distStr = m.nombre.replace(/\D/g, ''); // Extract numbers from "Distrito 1" -> "1"
        if (q === distStr || q === `distrito ${distStr}` || q === `distrito 0${distStr}`) {
           distMatch = true;
        }
        
        if (!distMatch && !subMatch) match = false;
      }
      return match;
    });
  }, [mapaBase, subAlcaldia, distrito, zona, searchQuery]);

  const kpisFiltrados = useMemo(() => {
    if (!kpis) return null;
    if (subAlcaldia === 'Todas las Subalcaldías' && distrito === 'Todos los Distritos' && zona === 'Todas las Zonas' && !searchQuery) return kpis;
    
    const ratio = mapaBase.length > 0 ? mapaFiltrado.length / mapaBase.length : 1;
    if (ratio === 0) return { ...kpis, consumo_total_m3: 0, deuda_alcaldia_bs: 0 };
    
    return {
      ...kpis,
      consumo_total_m3: Math.round(kpis.consumo_total_m3 * ratio),
      deuda_alcaldia_bs: Math.round(kpis.deuda_alcaldia_bs * ratio),
    };
  }, [kpis, mapaFiltrado.length, mapaBase.length, subAlcaldia, distrito, zona, searchQuery]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando datos municipales...</div>;
  if (!kpisFiltrados) return <div className="error-message">No se pudieron cargar los datos de la alcaldía. Verifica el Backend.</div>;

  const barData = mapaFiltrado.map(m => ({ nombre: m.nombre, consumo_m3: m.consumo_m3 })).sort((a, b) => b.consumo_m3 - a.consumo_m3);
  const envData = kpis.datosMedioAmbiente || [];

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ flex: '1 1 300px', display: 'flex', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Buscar Distrito o Subalcaldía..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white', borderRadius: '8px' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7194' }} />
        </div>
        
        <select value={subAlcaldia} onChange={e => { setSubAlcaldia(e.target.value); setDistrito('Todos los Distritos'); setZona('Todas las Zonas'); }} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}>
          {subAlcaldiasOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <select value={distrito} onChange={e => { setDistrito(e.target.value); setZona('Todas las Zonas'); }} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}>
          {distritosOptions.map(d => <option key={d} value={d}>{d === 'Todos los Distritos' ? d : `Distrito ${d}`}</option>)}
        </select>
        
        <select value={zona} onChange={e => {
          const z = e.target.value;
          setZona(z);
          if (z !== 'Todas las Zonas') {
             const info = ZONAS_DB.find(x => x.zona === z);
             if (info) {
               setSubAlcaldia(info.sub);
               setDistrito(info.dist.toString());
             }
          }
        }} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }}>
          {zonasOptions.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white' }} />
        </div>
      </div>

      <div className="page-header" style={{ marginTop: 0 }}>
        <div>
          <h2>Panel de Alcaldía e Impacto Ambiental</h2>
          <div className="subtitle">Métricas Municipales Integradas con Backend MVC</div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Consumo Total Municipio" value={`${kpisFiltrados.consumo_total_m3.toLocaleString('es-BO')} m³`} icon={<Droplets size={20} />} color="blue" sub="Distribuido en distritos" />
        <KpiCard label="Deuda Alcaldía -> SEMAPA" value={`Bs ${kpisFiltrados.deuda_alcaldia_bs.toLocaleString('es-BO')}`} icon={<AlertTriangle size={20} />} color="red" sub="Monto Pendiente de Pago" />
        <KpiCard label="Presión Hídrica" value={kpisFiltrados.indice_hidrico_total} icon={<ArrowUpRight size={20} />} color="amber" sub="Índice de Estrés" />
        <KpiCard label="Distrito Mayor Consumo" value={kpisFiltrados.top_distrito} icon={<Building2 size={20} />} color="purple" sub={`${kpisFiltrados.top_consumo_m3.toLocaleString('es-BO')} m³ consumidos`} />
      </div>

      <div className="chart-grid">
        <div className="chart-card full" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Mapa de Presión Hídrica por Distrito</h3>
          </div>
          <div className="map-container" style={{ height: '450px', width: '100%', position: 'relative' }}>
            <MapContainer center={[-17.3895, -66.1568]} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
              <ResizeMap />
              <UpdateMapCenter 
                center={[-17.3895, -66.1568]} 
                distritoSeleccionado={distrito !== 'Todos los Distritos' ? Number(distrito) : null}
                subalcaldiaSeleccionada={subAlcaldia !== 'Todas las Subalcaldías' ? subAlcaldia : null}
                zonaSeleccionada={zona !== 'Todas las Zonas' ? zona : null}
                searchQuery={searchQuery}
              />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              
              <GeoJSON 
                data={distritosData as any} 
                style={(feature: any) => {
                  const numDistrito = feature.properties.distrito;
                  const dataDistrito = mapaFiltrado.find((d: any) => d.nombre === `Distrito ${numDistrito}` || d.nombre === `Distrito 0${numDistrito}`);
                  
                  let fillOpacity = 0.05;
                  let color = '#3b82f6';
                  let isSelected = false;

                  if (searchQuery) {
                    const q = searchQuery.toLowerCase().trim();
                    const distStr = numDistrito.toString();
                    if (q === distStr || q === `distrito ${distStr}` || q === `distrito 0${distStr}`) {
                      isSelected = true;
                    } else {
                      const matchingComunas = (comunasData as any).features?.filter((c: any) => c.properties.comuna.toLowerCase() === q);
                      if (matchingComunas && matchingComunas.some((c: any) => c.properties.distritos.includes(numDistrito))) {
                        isSelected = true;
                      }
                    }
                  } else if (distrito !== 'Todos los Distritos') {
                    if (numDistrito === Number(distrito)) isSelected = true;
                  } else if (subAlcaldia !== 'Todas las Subalcaldías') {
                    const comuna = (comunasData as any).features?.find((c: any) => c.properties.comuna.toLowerCase() === subAlcaldia.toLowerCase());
                    if (comuna && comuna.properties.distritos.includes(numDistrito)) isSelected = true;
                  }
                  
                  if (isSelected) {
                    color = '#f59e0b';
                    fillOpacity = 0.3;
                  } else if (dataDistrito && subAlcaldia === 'Todas las Subalcaldías' && distrito === 'Todos los Distritos' && zona === 'Todas las Zonas' && !searchQuery) {
                    const maxConsumo = Math.max(...mapaFiltrado.map((m: any) => m.consumo_m3 || 0), 1);
                    const intensity = dataDistrito.consumo_m3 / maxConsumo;
                    fillOpacity = Math.max(0.2, intensity * 0.8);
                    color = intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#10b981';
                  } else if (subAlcaldia !== 'Todas las Subalcaldías' || distrito !== 'Todos los Distritos' || zona !== 'Todas las Zonas' || searchQuery !== '') {
                    fillOpacity = 0.05; // dim out non-selected districts
                    color = '#3b82f6';
                  } else {
                    fillOpacity = 0.1; // default opacity
                  }
                  
                  return {
                    color: color,
                    weight: isSelected ? 3 : 2,
                    fillColor: color,
                    fillOpacity: fillOpacity,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const numDistrito = feature.properties.distrito;
                  const dataDistrito = mapaBase.find((d: any) => d.nombre === `Distrito ${numDistrito}` || d.nombre === `Distrito 0${numDistrito}`);
                  if (dataDistrito) {
                    layer.bindPopup(`
                      <div style="color: #333; font-size: 13px;">
                        <strong>${dataDistrito.nombre}</strong><br />
                        Sub-Alcaldía: ${dataDistrito.subalcaldia}<br />
                        Consumo M3: ${dataDistrito.consumo_m3.toLocaleString()}<br />
                        Población: ${dataDistrito.poblacion.toLocaleString()}
                      </div>
                    `);
                  } else {
                    layer.bindPopup(`<strong>Distrito ${numDistrito}</strong><br />Sin datos de consumo`);
                  }
                }}
              />

              {mapaFiltrado.map((d, i) => (
                <CircleMarker key={i} center={[d.lat, d.lon]} radius={Math.max(10, Math.min(40, d.consumo_m3 / 1000))} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6, weight: 1 }}>
                  <Popup>
                    <div style={{ color: '#333', fontSize: 13 }}>
                      <strong>{d.nombre}</strong><br />
                      Sub-Alcaldía: {d.subalcaldia}<br />
                      Consumo M3: {d.consumo_m3.toLocaleString()}<br />
                      Población: {d.poblacion.toLocaleString()}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Distritos por Consumo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <XAxis dataKey="nombre" tick={{ fill: '#ffffff', fontSize: 12 }} />
              <YAxis tick={{ fill: '#ffffff', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
              <Bar dataKey="consumo_m3" name="Consumo m³" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CloudRain size={18} /> Consumo vs Contaminación</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={envData}>
              <XAxis dataKey="mes" tick={{ fill: '#ffffff', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#ffffff', fontSize: 11 }} orientation="left" />
              <YAxis yAxisId="right" tick={{ fill: '#ffffff', fontSize: 11 }} orientation="right" />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="consumo" name="Consumo (m³)" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.6} />
              <Line yAxisId="right" type="monotone" dataKey="contaminacion" name="Contaminación Hídrica (Idx)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Thermometer size={18} /> Temperatura Promedio</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={envData}>
              <XAxis dataKey="mes" tick={{ fill: '#ffffff', fontSize: 12 }} />
              <YAxis tick={{ fill: '#ffffff', fontSize: 11 }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
              <Legend />
              <Line type="monotone" dataKey="temperatura" name="Temperatura Prom (°C)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
