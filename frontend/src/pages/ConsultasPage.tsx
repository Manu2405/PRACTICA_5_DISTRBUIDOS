import { useState } from 'react';
import API from '../api/client';
import { Search, Database, ChevronDown, ChevronUp } from 'lucide-react';

const CONSULTAS = [
  { id: 1, titulo: 'Consumo promedio por distrito en rango de 8 horas', cat: 'Operacional' },
  { id: 2, titulo: 'Comparativa consumo últimas 4 semanas', cat: 'Operacional' },
  { id: 3, titulo: 'Contratos con consumo excesivo (>45 m³)', cat: 'Contabilidad' },
  { id: 4, titulo: 'Medidores activos por distrito y zona', cat: 'Operacional' },
  { id: 5, titulo: 'Medidores fuera de servicio por distrito y zona', cat: 'Administración' },
  { id: 6, titulo: 'Modelos con mayor tasa de fallos', cat: 'Administración' },
  { id: 7, titulo: 'Consumo promedio mensual por tarifa y distrito', cat: 'Contabilidad' },
  { id: 8, titulo: 'Zonas con consumo anómalo', cat: 'Administración' },
  { id: 9, titulo: 'Lecturas fallidas por tipo de medidor', cat: 'Administración' },
  { id: 10, titulo: 'Porcentaje de medidores con más de 4 años', cat: 'Administración' },
  { id: 11, titulo: 'Consumo per cápita por zona residencial', cat: 'Operacional' },
  { id: 12, titulo: 'Top 3 consumidores por distrito', cat: 'Operacional' },
  { id: 13, titulo: 'Zonas que requieren renovación por errores', cat: 'Administración' },
  { id: 14, titulo: 'Distribución de contratos por tipo de persona', cat: 'Contabilidad' },
  { id: 15, titulo: 'Zonas con mayor errores en distrito X', cat: 'Administración' },
  { id: 16, titulo: 'Contratos sin consumo en el periodo', cat: 'Contabilidad' },
  { id: 17, titulo: 'Cobertura de antenas/gateways', cat: 'Administración' },
  { id: 18, titulo: 'Demanda proyectada a 5 años', cat: 'Operacional' },
  { id: 19, titulo: 'Consumo por estado de facturación', cat: 'Contabilidad' },
  { id: 20, titulo: 'Impacto cambio tarifa P → R4', cat: 'Contabilidad' },
  { id: 21, titulo: 'Medidores que no reportaron consumo', cat: 'Administración' },
  { id: 22, titulo: 'Proyección ingresos por tarifa', cat: 'Contabilidad' },
  { id: 23, titulo: 'Clientes con consumo mínimo residencial', cat: 'Contabilidad' },
  { id: 24, titulo: 'Ingresos por tarifa en pies cúbicos', cat: 'Contabilidad' },
  { id: 25, titulo: 'Resumen general del sistema', cat: 'Operacional' },
];

const CAT_COLORS: Record<string, string> = { 'Operacional': '#3b82f6', 'Contabilidad': '#10b981', 'Administración': '#f59e0b' };

export default function ConsultasPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<number | null>(null);

  const ejecutar = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id); setLoading(id);
    try {
      const r = await API.get(`/api/consultas/${id}?periodo=${periodo}&distrito=4`);
      setResults(prev => ({ ...prev, [id]: r.data }));
    } catch { setResults(prev => ({ ...prev, [id]: { error: true } })); }
    finally { setLoading(null); }
  };

  const renderData = (data: any) => {
    if (!data || data.error) return <div style={{ color: 'var(--accent-red)' }}>Error al consultar</div>;
    const items = Array.isArray(data.data) ? data.data : [data.data];
    if (!items.length || !items[0]) return <div style={{ color: 'var(--text-muted)' }}>Sin datos</div>;
    // Si es anidado (proyección)
    if (items.length === 1 && items[0].proyeccion) {
      const p = items[0];
      return (
        <div>
          <div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Promedio mensual: <strong>{p.promedioMensualActual} m³</strong> | Tasa: {p.tasaCrecimiento}
          </div>
          <table className="data-table">
            <thead><tr>{Object.keys(p.proyeccion[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>{p.proyeccion.map((row: any, i: number) => (
              <tr key={i}>{Object.values(row).map((v: any, j: number) => <td key={j}>{typeof v === 'number' ? v.toLocaleString('es-BO') : String(v)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      );
    }
    const keys = Object.keys(items[0]);
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{data.total} resultado(s)</div>
        <table className="data-table">
          <thead><tr>{keys.map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>{items.slice(0, 50).map((row: any, i: number) => (
            <tr key={i}>{keys.map(k => <td key={k}>{typeof row[k] === 'number' ? row[k].toLocaleString('es-BO') : typeof row[k] === 'boolean' ? (row[k] ? '✅' : '❌') : String(row[k] ?? '-')}</td>)}</tr>
          ))}</tbody>
        </table>
        {items.length > 50 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>Mostrando 50 de {items.length}</div>}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>25 Consultas Estratégicas</h2>
          <div className="subtitle">Banco de consultas CQL sobre datos SEMAPA</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CONSULTAS.map(q => (
          <div key={q.id} className="chart-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
            <div onClick={() => ejecutar(q.id)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: CAT_COLORS[q.cat], color: '#fff', width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
                {q.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{q.titulo}</div>
                <div style={{ fontSize: '0.75rem', color: CAT_COLORS[q.cat], marginTop: 2 }}>{q.cat}</div>
              </div>
              {loading === q.id ? <div className="spinner" style={{ width: 20, height: 20 }} />
                : expanded === q.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            {expanded === q.id && results[q.id] && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                {renderData(results[q.id])}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
