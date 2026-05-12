import { useEffect, useState } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { Droplets, Gauge, Users, AlertTriangle, Activity, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6',
  '#f97316','#6366f1','#84cc16','#e11d48','#0ea5e9','#a855f7','#22c55e'];

const ESTADO_COLORS: Record<string, string> = {
  activo: '#10b981', inactivo: '#f59e0b', fuera_servicio: '#ef4444',
};

export default function OperacionalPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [resumen, setResumen] = useState<any>(null);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [medidoresEst, setMedidoresEst] = useState<any[]>([]);
  const [mapa, setMapa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/api/operacional/resumen?periodo=${periodo}`),
      API.get(`/api/operacional/consumo-distrito?periodo=${periodo}`),
      API.get(`/api/operacional/medidores-estado`),
      API.get(`/api/operacional/mapa-medidores`),
    ]).then(([r, d, m, mp]) => {
      setResumen(r.data);
      setDistritos(d.data || []);
      setMedidoresEst(m.data || []);
      setMapa(mp.data || []);
    }).finally(() => setLoading(false));
  }, [periodo]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando dashboard...</div>;

  const distChart = distritos.sort((a: any, b: any) => b.consumoM3 - a.consumoM3);
  const medChart = medidoresEst.map((d: any) => ({
    name: `D${d.distrito}`, Activo: d.activo, Inactivo: d.inactivo, 'Fuera Serv.': d.fueraServicio,
  })).sort((a: any, b: any) => (b.Activo + b.Inactivo) - (a.Activo + a.Inactivo));

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard Operacional</h2>
          <div className="subtitle">Monitoreo en tiempo real del sistema de agua potable</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }} />
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Consumo Total" value={`${resumen.consumoTotalM3.toLocaleString('es-BO')} m³`}
          icon={<Droplets size={20} />} color="blue" sub={`Período ${periodo}`} />
        <KpiCard label="Medidores Activos" value={resumen.medidoresActivos}
          icon={<Gauge size={20} />} color="green" sub={`de ${resumen.cantidadMedidores} totales`} />
        <KpiCard label="Población Beneficiaria" value={resumen.poblacionBeneficiaria}
          icon={<Users size={20} />} color="cyan" sub="Cochabamba" />
        <KpiCard label="Errores IoT" value={resumen.cantidadErrores}
          icon={<AlertTriangle size={20} />} color="red" sub={`${(resumen.cantidadErrores / resumen.medidoresActivos * 100).toFixed(1)}% de activos`} />
        <KpiCard label="Medidores Inactivos" value={resumen.medidoresInactivos}
          icon={<Activity size={20} />} color="amber" />
        <KpiCard label="Fuera de Servicio" value={resumen.medidoresFueraServicio}
          icon={<Zap size={20} />} color="red" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Consumo por Distrito (m³)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distChart}>
              <XAxis dataKey="distrito" tick={{ fill: '#9aa0b8', fontSize: 12 }} tickFormatter={v => `D${v}`} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Bar dataKey="consumoM3" name="Consumo m³" radius={[6,6,0,0]}>
                {distChart.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Medidores por Estado y Distrito</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={medChart}>
              <XAxis dataKey="name" tick={{ fill: '#9aa0b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Legend />
              <Bar dataKey="Activo" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="Inactivo" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Fuera Serv." stackId="a" fill="#ef4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card full" style={{ marginBottom: 28 }}>
        <h3>Mapa de Medidores — Cochabamba</h3>
        <div className="map-container">
          <MapContainer center={[-17.3935, -66.157]} zoom={13} style={{ height: '100%', width: '100%' }}
            // @ts-ignore
            scrollWheelZoom={true}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CartoDB' />
            {mapa.map((m: any, i: number) => (
              <CircleMarker key={i} center={[m.lat, m.lon]} radius={5}
                pathOptions={{ color: ESTADO_COLORS[m.estado] || '#3b82f6', fillColor: ESTADO_COLORS[m.estado] || '#3b82f6', fillOpacity: 0.7 }}>
                <Popup>
                  <div style={{ color: '#333', fontSize: 13 }}>
                    <strong>{m.serie}</strong><br />
                    Modelo: {m.modelo}<br />
                    Estado: <span style={{ color: ESTADO_COLORS[m.estado] }}>{m.estado}</span><br />
                    Distrito {m.distrito} · {m.zona}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Detalle por Distrito — {periodo}</h3>
        <table className="data-table">
          <thead><tr><th>Distrito</th><th>Consumo m³</th><th>Monto Bs</th><th>Contratos</th></tr></thead>
          <tbody>
            {distChart.map((d: any, i: number) => (
              <tr key={i}>
                <td>Distrito {d.distrito}</td>
                <td>{d.consumoM3.toLocaleString('es-BO')}</td>
                <td>Bs {d.montoBs.toLocaleString('es-BO')}</td>
                <td>{d.contratos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
