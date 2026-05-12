import { useEffect, useState } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { DollarSign, TrendingUp, BarChart3, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

export default function ContabilidadPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [tarifas, setTarifas] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/api/contabilidad/ingresos-tarifa?periodo=${periodo}`),
      API.get(`/api/contabilidad/top-consumidores?periodo=${periodo}&limit=15`),
    ]).then(([t, tc]) => {
      setTarifas(t.data || []);
      setTop(tc.data || []);
    }).finally(() => setLoading(false));
  }, [periodo]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando...</div>;

  const totalIngresos = tarifas.reduce((s, t) => s + t.montoBs, 0);
  const totalConsumo = tarifas.reduce((s, t) => s + t.consumoM3, 0);
  const totalContratos = tarifas.reduce((s, t) => s + t.contratos, 0);

  const pieData = tarifas.map(t => ({ name: t.tarifa, value: t.montoBs }));
  const barData = tarifas.sort((a, b) => b.consumoM3 - a.consumoM3);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard Contabilidad</h2>
          <div className="subtitle">Ingresos, tarifas y facturación</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }} />
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Ingresos Totales" value={`Bs ${totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign size={20} />} color="green" sub={`Período ${periodo}`} />
        <KpiCard label="Consumo Total" value={`${totalConsumo.toLocaleString('es-BO')} m³`}
          icon={<TrendingUp size={20} />} color="blue" />
        <KpiCard label="Contratos Facturados" value={totalContratos}
          icon={<Users size={20} />} color="purple" />
        <KpiCard label="Tarifas Activas" value={tarifas.length}
          icon={<BarChart3 size={20} />} color="cyan" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Ingresos por Tarifa (Bs)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={{ stroke: '#6b7194' }}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }}
                formatter={(v: number) => `Bs ${v.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Consumo por Tarifa (m³)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <YAxis dataKey="tarifa" type="category" tick={{ fill: '#9aa0b8', fontSize: 12 }} width={40} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Bar dataKey="consumoM3" name="Consumo m³" radius={[0,6,6,0]}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Top 15 Consumidores — {periodo}</h3>
        <table className="data-table">
          <thead><tr><th>#</th><th>Contrato</th><th>Titular</th><th>Distrito</th><th>Zona</th><th>Tarifa</th><th>Consumo m³</th><th>Monto Bs</th></tr></thead>
          <tbody>
            {top.map((r: any, i: number) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.contrato}</td>
                <td>{r.nombre}</td>
                <td>D{r.distrito}</td>
                <td>{r.zona}</td>
                <td><span className="badge green">{r.tarifa}</span></td>
                <td>{r.consumoM3}</td>
                <td>Bs {r.montoBs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
