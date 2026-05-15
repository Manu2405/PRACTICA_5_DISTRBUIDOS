import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import 'leaflet/dist/leaflet.css';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { Droplets, TrendingUp, DollarSign, Users } from 'lucide-react';

interface DistritoMapData {
  id_distrito: number;
  nombre: string;
  subalcaldia: string;
  poblacion: number;
  lat: number;
  lon: number;
  consumo_m3: number;
  indice_presion_hidrica: number;
}

interface KpiData {
  periodo: string;
  consumo_total_m3: number;
  indice_hidrico_total: number;
  ingresos_esperados_bs: number;
  poblacion_beneficiaria: number;
  top_distrito: string;
  top_consumo_m3: number;
  ranking: { nombre: string; consumo_m3: number }[];
}

function interpolateColor(value: number, min: number, max: number): string {
  if (max === min) return '#3b82f6';
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  if (t < 0.5) {
    const r = Math.round(34 + t * 2 * (251 - 34));
    const g = Math.round(197 + t * 2 * (191 - 197));
    const b = Math.round(94 + t * 2 * (36 - 94));
    return `rgb(${r},${g},${b})`;
  } else {
    const t2 = (t - 0.5) * 2;
    const r = Math.round(251 + t2 * (239 - 251));
    const g = Math.round(191 + t2 * (68 - 191));
    const b = Math.round(36 + t2 * (68 - 36));
    return `rgb(${r},${g},${b})`;
  }
}

const CHART_COLORS = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#6366f1','#14b8a6','#a855f7','#f43f5e','#0ea5e9','#10b981'];

export default function AlcaldiaPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [distritos, setDistritos] = useState<DistritoMapData[]>([]);
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/api/alcaldia/mapa-distritos?periodo=${periodo}`),
      API.get(`/api/alcaldia/kpis?periodo=${periodo}`),
    ]).then(([mapa, k]) => {
      setDistritos(mapa.data?.data || []);
      setKpis(k.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [periodo]);

  const maxConsumo = Math.max(...distritos.map(d => d.consumo_m3), 1);
  const minConsumo = Math.min(...distritos.map(d => d.consumo_m3), 0);

  const getRadius = (consumo: number) => {
    const normalized = maxConsumo > 0 ? consumo / maxConsumo : 0;
    return 6 + normalized * 30;
  };

  const rankingData = kpis?.ranking || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard Alcaldía</h2>
          <div className="subtitle">Presión hídrica, consumo por distrito y métricas de gestión</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }} />
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Cargando datos...</div>
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Consumo Total"
              value={kpis ? kpis.consumo_total_m3.toLocaleString('es-BO') + ' m³' : '—'}
              icon={<Droplets size={20} />}
              color="blue"
              sub={`Período ${periodo}`}
            />
            <KpiCard
              label="Carga Hídrica Urbana"
              value={kpis ? kpis.indice_hidrico_total.toLocaleString('es-BO') + ' m³' : '—'}
              icon={<TrendingUp size={20} />}
              color="amber"
              sub="80% retorno hídrico estimado"
            />
            <KpiCard
              label="Ingresos Esperados"
              value={kpis ? 'Bs ' + kpis.ingresos_esperados_bs.toLocaleString('es-BO') : '—'}
              icon={<DollarSign size={20} />}
              color="green"
              sub="Facturación proyectada"
            />
            <KpiCard
              label="Población Beneficiaria"
              value={kpis ? kpis.poblacion_beneficiaria.toLocaleString('es-BO') : '—'}
              icon={<Users size={20} />}
              color="purple"
              sub={`Top: ${kpis?.top_distrito || '—'}`}
            />
          </div>

          {/* Mapa de burbujas */}
          <div className="chart-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0 }}>Mapa de Presión Hídrica por Distrito</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Tamaño del círculo = consumo · Color: <span style={{ color: '#22c55e' }}>verde</span> (bajo) → <span style={{ color: '#f59e0b' }}>amarillo</span> → <span style={{ color: '#ef4444' }}>rojo</span> (alto)
              </div>
            </div>
            <div style={{ height: 440 }}>
              <MapContainer
                center={[-17.3935, -66.157]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='© OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {distritos.map(d => (
                  <CircleMarker
                    key={d.id_distrito}
                    center={[d.lat, d.lon]}
                    radius={getRadius(d.consumo_m3)}
                    pathOptions={{
                      color: interpolateColor(d.consumo_m3, minConsumo, maxConsumo),
                      fillColor: interpolateColor(d.consumo_m3, minConsumo, maxConsumo),
                      fillOpacity: 0.7,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <strong style={{ fontSize: '1rem' }}>{d.nombre}</strong><br />
                        <span style={{ color: '#666', fontSize: '0.82rem' }}>Sub-alcaldía: {d.subalcaldia}</span>
                        <hr style={{ margin: '8px 0' }} />
                        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr><td style={{ color: '#666' }}>Consumo</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{d.consumo_m3.toLocaleString('es-BO')} m³</td></tr>
                            <tr><td style={{ color: '#666' }}>Carga Hídrica</td><td style={{ fontWeight: 600, textAlign: 'right', color: '#f59e0b' }}>{d.indice_presion_hidrica.toLocaleString('es-BO')} m³</td></tr>
                            <tr><td style={{ color: '#666' }}>Población</td><td style={{ fontWeight: 600, textAlign: 'right' }}>{d.poblacion.toLocaleString('es-BO')}</td></tr>
                          </tbody>
                        </table>
                        <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                          Carga Hídrica = 80% del consumo (retorno hídrico estimado)
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Ranking de distritos */}
          <div className="chart-grid">
            <div className="chart-card">
              <h3>Ranking — Distritos con Mayor Consumo</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rankingData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#9aa0b8', fontSize: 11 }}
                    tickFormatter={v => v.toLocaleString('es-BO')} />
                  <YAxis type="category" dataKey="nombre" tick={{ fill: '#9aa0b8', fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }}
                    formatter={(v: number) => [v.toLocaleString('es-BO') + ' m³', 'Consumo']}
                  />
                  <Bar dataKey="consumo_m3" name="Consumo m³" radius={[0, 6, 6, 0]}>
                    {rankingData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Índice de Carga Hídrica por Distrito</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Distrito</th>
                      <th>Sub-alcaldía</th>
                      <th>Consumo m³</th>
                      <th>Carga Hídrica m³</th>
                      <th>Población</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...distritos].sort((a, b) => b.consumo_m3 - a.consumo_m3).map((d, i) => (
                      <tr key={d.id_distrito}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{d.nombre}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{d.subalcaldia}</td>
                        <td>{d.consumo_m3.toLocaleString('es-BO')}</td>
                        <td style={{ color: '#f59e0b', fontWeight: 600 }}>{d.indice_presion_hidrica.toLocaleString('es-BO')}</td>
                        <td>{d.poblacion.toLocaleString('es-BO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Carga Hídrica Urbana = consumo × 0.8 · El 80% del agua consumida retorna al sistema como aguas residuales (estándar saneamiento urbano).
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
