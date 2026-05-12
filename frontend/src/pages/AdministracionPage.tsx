import { useEffect, useState } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { AlertTriangle, Cpu, MapPin, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const COLORS = ['#ef4444','#f59e0b','#8b5cf6','#3b82f6','#06b6d4','#10b981','#ec4899'];

export default function AdministracionPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [errModelo, setErrModelo] = useState<any[]>([]);
  const [errDist, setErrDist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/api/administracion/errores-modelo?periodo=${periodo}`),
      API.get(`/api/administracion/errores-distrito?periodo=${periodo}`),
    ]).then(([em, ed]) => {
      setErrModelo(em.data || []);
      setErrDist(ed.data || []);
    }).finally(() => setLoading(false));
  }, [periodo]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando...</div>;

  const totalErrores = errModelo.reduce((s, e) => s + e.cantidad, 0);

  // Agrupar errores por modelo
  const byModelo: Record<string, number> = {};
  errModelo.forEach(e => { byModelo[e.modelo] = (byModelo[e.modelo] || 0) + e.cantidad; });
  const modeloChart = Object.entries(byModelo).map(([m, c]) => ({ modelo: m, errores: c }))
    .sort((a, b) => b.errores - a.errores);

  // Agrupar por tipo de error
  const byError: Record<string, number> = {};
  errModelo.forEach(e => { byError[e.descripcion] = (byError[e.descripcion] || 0) + e.cantidad; });
  const errorChart = Object.entries(byError).map(([d, c]) => ({ tipo: d, cantidad: c }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Top distritos con errores
  const byDistErr: Record<string, number> = {};
  errDist.forEach(e => { byDistErr[`D${e.distrito}`] = (byDistErr[`D${e.distrito}`] || 0) + e.cantidad; });
  const distErrChart = Object.entries(byDistErr).map(([d, c]) => ({ distrito: d, errores: c }))
    .sort((a, b) => b.errores - a.errores);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard Administración</h2>
          <div className="subtitle">Errores IoT, modelos y mantenimiento</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }} />
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Errores" value={totalErrores} icon={<AlertTriangle size={20} />} color="red" sub={`Período ${periodo}`} />
        <KpiCard label="Modelos Afectados" value={modeloChart.length} icon={<Cpu size={20} />} color="amber" />
        <KpiCard label="Distritos con Errores" value={distErrChart.length} icon={<MapPin size={20} />} color="purple" />
        <KpiCard label="Tipos de Error" value={errorChart.length} icon={<Zap size={20} />} color="cyan" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Errores por Modelo de Medidor</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeloChart}>
              <XAxis dataKey="modelo" tick={{ fill: '#9aa0b8', fontSize: 10 }} angle={-15} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Bar dataKey="errores" name="Errores" radius={[6,6,0,0]}>
                {modeloChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Errores por Distrito</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distErrChart}>
              <XAxis dataKey="distrito" tick={{ fill: '#9aa0b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Bar dataKey="errores" name="Errores" radius={[6,6,0,0]} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Detalle de Errores por Tipo</h3>
        <table className="data-table">
          <thead><tr><th>Tipo de Error</th><th>Cantidad</th><th>% del Total</th></tr></thead>
          <tbody>
            {errorChart.map((e, i) => (
              <tr key={i}>
                <td>{e.tipo}</td>
                <td>{e.cantidad}</td>
                <td>{totalErrores > 0 ? (e.cantidad / totalErrores * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
