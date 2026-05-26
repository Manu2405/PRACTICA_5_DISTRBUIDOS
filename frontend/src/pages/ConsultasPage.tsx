import { useState } from 'react';
import API from '../api/client';
import { Search, Database, ChevronDown, ChevronUp } from 'lucide-react';

const CONSULTAS = [
  { id: 1,  titulo: 'Consumo total por distrito en rangos de 8 horas',                      cat: 'Operacional'   },
  { id: 2,  titulo: 'Comparativa de consumo entre las 4 últimas semanas por distrito',       cat: 'Operacional'   },
  { id: 3,  titulo: 'Contratos residenciales con consumo excesivo (> 45 m³/mes)',            cat: 'Contabilidad'  },
  { id: 4,  titulo: 'Medidores activos por distrito y zona',                                 cat: 'Operacional'   },
  { id: 5,  titulo: 'Medidores fuera de servicio por distrito y zona',                       cat: 'Administración'},
  { id: 6,  titulo: 'Modelos de medidor con mayor tasa de fallos',                           cat: 'Administración'},
  { id: 7,  titulo: 'Consumo mensual por categoría de tarifa y distrito',                    cat: 'Contabilidad'  },
  { id: 8,  titulo: 'Modelos con consumo anómalo y zonas afectadas',                         cat: 'Administración'},
  { id: 9,  titulo: 'Lecturas fallidas por tipo de medidor (matriz error × modelo)',         cat: 'Administración'},
  { id: 10, titulo: 'Porcentaje de medidores con más de 10 años de antigüedad',              cat: 'Administración'},
  { id: 11, titulo: 'Consumo total por zona y categoría residencial (R1, R2, R3, R4)',       cat: 'Operacional'   },
  { id: 12, titulo: 'Top 3 clientes con mayor consumo por distrito del mes activo',          cat: 'Operacional'   },
  { id: 13, titulo: 'Zonas que requieren renovación por errores reportados',                 cat: 'Administración'},
  { id: 14, titulo: '[Sorpresa 1] Distribución de contratos por tipo de persona y categoría',cat: 'Contabilidad'  },
  { id: 15, titulo: 'Zonas con mayor cantidad de errores en un distrito (param: distrito)',  cat: 'Administración', needsDist: true },
  { id: 16, titulo: '[Sorpresa 2] Cobertura antenas LoRaWAN — medidores por zona y radiobase', cat: 'Administración'},
  { id: 17, titulo: 'Demanda proyectada 5 años por distrito (factor 2.6%/año)',              cat: 'Operacional'   },
  { id: 18, titulo: '[Sorpresa 4] Contratos sin consumo registrado en el periodo',           cat: 'Contabilidad'  },
  { id: 19, titulo: 'Impacto económico: cambio de tarifa Preferencial (P) a Residencial R4',cat: 'Contabilidad'  },
  { id: 20, titulo: 'Medidores sin consumo — zona, distrito, dirección y serie',             cat: 'Administración'},
  { id: 21, titulo: 'Proyección de ingresos por tipo de tarifa del mes actual',              cat: 'Contabilidad'  },
  { id: 22, titulo: 'Clientes con consumo mínimo residencial (≤ 12 m³) — cargo fijo',       cat: 'Contabilidad'  },
  { id: 23, titulo: 'Ingresos por tarifa con volumen en pies cúbicos (ft³)',                 cat: 'Contabilidad'  },
  { id: 24, titulo: '[Sorpresa] Balance financiero: ingresos esperados por periodo',         cat: 'Contabilidad'  },
  { id: 25, titulo: 'Resumen general del sistema SEMAPA',                                    cat: 'Operacional'   },
];

const CAT_COLORS: Record<string, string> = {
  'Operacional': '#3b82f6',
  'Contabilidad': '#10b981',
  'Administración': '#f59e0b',
};

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '✅' : '❌';
  if (typeof v === 'number') return v.toLocaleString('es-BO');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function DataTable({ items }: { items: Record<string, unknown>[] }) {
  if (!items.length) return <div style={{ color: 'var(--text-muted)' }}>Sin datos</div>;
  const keys = Object.keys(items[0]);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {items.slice(0, 60).map((row, i) => (
            <tr key={i}>
              {keys.map(k => <td key={k}>{renderValue(row[k])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 60 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
          Mostrando 60 de {items.length} resultados
        </div>
      )}
    </div>
  );
}

export default function ConsultasPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [distrito, setDistrito] = useState('MOLLE');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState<number | null>(null);

  const ejecutar = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setLoading(id);
    try {
      const params = new URLSearchParams({ periodo, distrito });
      const r = await API.get(`/api/consultas/${id}?${params}`);
      setResults(prev => ({ ...prev, [id]: r.data }));
    } catch {
      setResults(prev => ({ ...prev, [id]: { error: true } }));
    } finally {
      setLoading(null);
    }
  };

  const renderData = (data: any) => {
    if (!data || data.error) return <div style={{ color: 'var(--accent-red)' }}>Error al consultar</div>;
    const items: Record<string, unknown>[] = Array.isArray(data.data) ? data.data : [data.data];
    if (!items.length || !items[0]) return <div style={{ color: 'var(--text-muted)' }}>Sin datos para este período</div>;
    return (
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          {data.total} resultado(s) · período: <strong>{data.periodo || periodo}</strong>
        </div>
        <DataTable items={items} />
      </div>
    );
  };

  const catCounts = CONSULTAS.reduce((acc, q) => {
    acc[q.cat] = (acc[q.cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>25 Consultas Estratégicas</h2>
          <div className="subtitle">Banco de consultas CQL sobre datos SEMAPA</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Badges de categoría */}
          {Object.entries(catCounts).map(([cat, n]) => (
            <span key={cat} style={{ background: CAT_COLORS[cat] + '22', color: CAT_COLORS[cat],
              border: `1px solid ${CAT_COLORS[cat]}44`, borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
              {cat} ({n})
            </span>
          ))}
        </div>
      </div>

      {/* Filtros globales */}
      <div className="chart-card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '7px 12px', borderRadius: '8px', fontSize: '0.9rem' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distrito (Q15):</span>
          <input type="text" value={distrito} onChange={e => setDistrito(e.target.value.toUpperCase())}
            placeholder="ej. MOLLE"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '7px 12px', borderRadius: '8px', fontSize: '0.9rem', width: 130 }} />
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <Search size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Haz clic en cada consulta para ejecutarla
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CONSULTAS.map(q => (
          <div key={q.id} className="chart-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
            <div onClick={() => ejecutar(q.id)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Número de consulta */}
              <div style={{
                background: CAT_COLORS[q.cat], color: '#fff',
                width: 32, height: 32, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.82rem', fontWeight: 700, flexShrink: 0,
              }}>
                {q.id}
              </div>

              {/* Título y categoría */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {q.titulo}
                </div>
                <div style={{ fontSize: '0.73rem', color: CAT_COLORS[q.cat], marginTop: 2 }}>
                  {q.cat}
                  {(q as any).needsDist && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· usa filtro distrito</span>}
                </div>
              </div>

              {/* Estado */}
              {loading === q.id
                ? <div className="spinner" style={{ width: 20, height: 20, flexShrink: 0 }} />
                : expanded === q.id
                  ? <ChevronUp size={18} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                  : <ChevronDown size={18} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
            </div>

            {/* Resultado expandido */}
            {expanded === q.id && results[q.id] && (
              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
                {renderData(results[q.id])}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda bases de datos */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <Database size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Tablas principales: <code>consumo_mensual_por_contrato</code> · <code>medidores_por_serie</code> · <code>lecturas_por_medidor_mes</code> · <code>errores_por_modelo_mes</code> · <code>errores_por_distrito_zona</code> · <code>contratos_por_numero</code> · <code>catalogo_tarifas</code>
      </div>
    </>
  );
}
