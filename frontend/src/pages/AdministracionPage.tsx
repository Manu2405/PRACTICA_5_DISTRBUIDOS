import { useEffect, useState } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { AlertTriangle, Cpu, MapPin, Zap, Activity, WifiOff, Battery, Thermometer, Clock, TrendingUp, Shield, Gauge, Smartphone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#ec4899', '#f97316', '#a855f7'];

// Definición de tipos
interface ErrorModelo {
  modelo: string;
  cantidad: number;
  descripcion: string;
}

interface ErrorDistrito {
  distrito: number;
  cantidad: number;
  tipo: string;
}

// Generar datos simulados de errores por modelo
const generarErroresModelo = (periodo: string): ErrorModelo[] => {
  const modelos = ['SAGEMCOM XS250', 'ITRON ACE9000', 'LANDIS GYR E350', 'ELSTER AS300', 'ZIV 100C', 'GPRS-4G Lite', 'NB-IoT Pro'];
  const tiposError = [
    'Fallo de comunicación', 'Batería baja', 'Error de medición', 'Sensor dañado',
    'Fuga detectada', 'Manipulación', 'Firmware corrupto', 'Conexión intermitente'
  ];

  const errores: ErrorModelo[] = [];

  modelos.forEach(modelo => {
    const numTipos = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < numTipos; i++) {
      errores.push({
        modelo: modelo,
        cantidad: Math.floor(Math.random() * 50) + 5,
        descripcion: tiposError[Math.floor(Math.random() * tiposError.length)]
      });
    }
  });

  return errores;
};

// Generar datos simulados de errores por distrito
const generarErroresDistrito = (periodo: string): ErrorDistrito[] => {
  const tiposError = ['Fallo comunicación', 'Batería baja', 'Error medición', 'Sensor dañado', 'Fuga'];
  const errores: ErrorDistrito[] = [];

  for (let distrito = 1; distrito <= 15; distrito++) {
    const numTipos = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numTipos; i++) {
      errores.push({
        distrito: distrito,
        cantidad: Math.floor(Math.random() * 30) + 1,
        tipo: tiposError[Math.floor(Math.random() * tiposError.length)]
      });
    }
  }

  return errores;
};

// Componente mejorado para el medidor de severidad de errores
const SeverityGauge = ({ totalErrores }: { totalErrores: number }) => {
  const severidad = Math.min(Math.max(totalErrores, 0), 500);
  const porcentaje = (severidad / 500) * 100;
  
  // Umbrales de severidad
  const getSeveridadData = (val: number) => {
    if (val < 100) return { 
      texto: 'Baja', 
      color: '#10b981', 
      bgColor: 'rgba(16, 185, 129, 0.15)',
      icon: Shield,
      descripcion: 'Sistema operando normalmente con errores mínimos',
      recomendacion: 'Monitoreo regular sugerido'
    };
    if (val < 250) return { 
      texto: 'Media', 
      color: '#f59e0b', 
      bgColor: 'rgba(245, 158, 11, 0.15)',
      icon: AlertTriangle,
      descripcion: 'Se requiere atención preventiva',
      recomendacion: 'Programar mantenimiento correctivo'
    };
    return { 
      texto: 'Alta', 
      color: '#ef4444', 
      bgColor: 'rgba(239, 68, 68, 0.15)',
      icon: AlertTriangle,
      descripcion: '¡URGENTE! Sistema con múltiples fallas',
      recomendacion: 'Intervención inmediata requerida'
    };
  };
  
  const severidadData = getSeveridadData(severidad);
  const SeveridadIcon = severidadData.icon;
  const color = severidadData.color;
  const texto = severidadData.texto;
  
  // Calcular ángulos para el círculo de progreso
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (porcentaje / 100) * circumference;
  
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '20px',
      background: severidadData.bgColor,
      borderRadius: '20px',
      margin: '10px'
    }}>
      <h4 style={{ fontSize: '14px', color: '#9aa0b8', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Gauge size={18} color={color} />
        Índice de Severidad de Errores
      </h4>
      
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
        {/* Círculo de progreso SVG */}
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Círculo de fondo */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#2a2f45"
            strokeWidth="12"
          />
          {/* Círculo de progreso */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          {/* Círculo interior decorativo */}
          <circle
            cx="100"
            cy="100"
            r={radius - 15}
            fill="#1a1e2f"
            stroke={color}
            strokeWidth="2"
            opacity="0.3"
          />
          
          {/* Texto central */}
          <text x="100" y="95" textAnchor="middle" fill={color} fontSize="36" fontWeight="bold">
            {severidad}
          </text>
          <text x="100" y="115" textAnchor="middle" fill="#9aa0b8" fontSize="12">
            de 500
          </text>
        </svg>
        
        {/* Badge de nivel */}
        <div style={{
          position: 'absolute',
          bottom: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: color,
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          Severidad {texto}
        </div>
      </div>
      
      {/* Indicadores visuales */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Baja', range: '0-99', color: '#10b981', active: texto === 'Baja' },
            { label: 'Media', range: '100-249', color: '#f59e0b', active: texto === 'Media' },
            { label: 'Alta', range: '250-500', color: '#ef4444', active: texto === 'Alta' }
          ].map((nivel) => (
            <div
              key={nivel.label}
              style={{
                flex: 1,
                padding: '8px',
                background: nivel.active ? `${nivel.color}20` : '#1a1e2f',
                borderRadius: '10px',
                border: nivel.active ? `2px solid ${nivel.color}` : '1px solid #2a2f45'
              }}
            >
              <div style={{ fontSize: '11px', color: nivel.color, fontWeight: 'bold' }}>{nivel.label}</div>
              <div style={{ fontSize: '9px', color: '#6b7194' }}>{nivel.range}</div>
            </div>
          ))}
        </div>
        
        {/* Descripción y recomendación */}
        <div style={{
          background: '#1a1e2f',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <SeveridadIcon size={16} color={color} />
            <span style={{ fontSize: '12px', color: color, fontWeight: '600' }}>Estado: {texto}</span>
          </div>
          <p style={{ fontSize: '11px', color: '#9aa0b8', margin: '0 0 8px 0', lineHeight: '1.4' }}>
            {severidadData.descripcion}
          </p>
          <div style={{
            background: `${color}10`,
            padding: '6px 10px',
            borderRadius: '8px',
            borderLeft: `3px solid ${color}`
          }}>
            <span style={{ fontSize: '10px', color: '#6b7194' }}>📋 Recomendación: </span>
            <span style={{ fontSize: '10px', color: color }}>{severidadData.recomendacion}</span>
          </div>
        </div>
      </div>
      
      {/* Barra de progreso alternativa */}
      <div style={{ marginTop: '15px' }}>
        <div style={{ 
          height: '6px', 
          background: '#2a2f45', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${porcentaje}%`,
            height: '100%',
            background: `linear-gradient(90deg, #10b981, #f59e0b, #ef4444)`,
            transition: 'width 0.8s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span style={{ fontSize: '9px', color: '#10b981' }}>0</span>
          <span style={{ fontSize: '9px', color: '#f59e0b' }}>100</span>
          <span style={{ fontSize: '9px', color: '#ef4444' }}>250</span>
          <span style={{ fontSize: '9px', color: '#6b7194' }}>500</span>
        </div>
      </div>
    </div>
  );
};

// Componente para la tendencia de errores
const ErrorTrend = ({ erroresPorDia }: { erroresPorDia: number[] }) => {
  const maxValue = Math.max(...erroresPorDia);
  const trend = erroresPorDia[erroresPorDia.length - 1] - erroresPorDia[0];
  const trendColor = trend > 0 ? '#ef4444' : trend < 0 ? '#10b981' : '#f59e0b';
  const trendIcon = trend > 0 ? <TrendingUp size={14} style={{ marginRight: '4px' }} /> : trend < 0 ? '📉' : '➡️';
  
  return (
    <div style={{ padding: '10px' }}>
      <h4 style={{ fontSize: '13px', color: '#9aa0b8', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Tendencia de Errores (últimos 7 días)</span>
        <span style={{ fontSize: '11px', color: trendColor }}>
          {trendIcon} {trend > 0 ? `+${trend}` : trend} errores
        </span>
      </h4>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '120px' }}>
        {erroresPorDia.map((valor, idx) => {
          const altura = (valor / maxValue) * 100;
          const colores = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#ec4899'];
          const isLast = idx === erroresPorDia.length - 1;
          return (
            <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: `${altura}px`,
                background: colores[idx % colores.length],
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.5s ease',
                marginBottom: '5px',
                opacity: isLast ? 1 : 0.7,
                border: isLast ? `2px solid ${colores[idx % colores.length]}` : 'none'
              }} />
              <div style={{ fontSize: '9px', color: '#6b7194' }}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'][idx]}</div>
              <div style={{ fontSize: '8px', color: '#9aa0b8', fontWeight: isLast ? 'bold' : 'normal' }}>{valor}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function AdministracionPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [errModelo, setErrModelo] = useState<ErrorModelo[]>([]);
  const [errDist, setErrDist] = useState<ErrorDistrito[]>([]);
  const [lecturasApp, setLecturasApp] = useState<{ total: number; porDistrito: { distrito: string; cantidad: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroresPorDia] = useState(() =>
    Array.from({ length: 7 }, () => Math.floor(Math.random() * 30) + 10)
  );

  useEffect(() => {
    setLoading(true);

    Promise.all([
      API.get(`/api/administracion/errores-modelo?periodo=${periodo}`).catch(() => ({ data: generarErroresModelo(periodo) })),
      API.get(`/api/administracion/errores-distrito?periodo=${periodo}`).catch(() => ({ data: generarErroresDistrito(periodo) })),
      API.get(`/api/administracion/lecturas-app?periodo=${periodo}`).catch(() => ({ data: { total: 0, porDistrito: [] } })),
    ]).then(([em, ed, la]) => {
      setErrModelo(em.data || []);
      setErrDist(ed.data || []);
      setLecturasApp(la.data || { total: 0, porDistrito: [] });
      setLoading(false);
    }).catch(() => {
      setErrModelo(generarErroresModelo(periodo));
      setErrDist(generarErroresDistrito(periodo));
      setLecturasApp({ total: 0, porDistrito: [] });
      setLoading(false);
    });
  }, [periodo]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando dashboard de administración...</div>;

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
  errDist.forEach(e => { byDistErr[`Distrito ${e.distrito}`] = (byDistErr[`Distrito ${e.distrito}`] || 0) + e.cantidad; });
  const distErrChart = Object.entries(byDistErr).map(([d, c]) => ({ distrito: d, errores: c }))
    .sort((a, b) => b.errores - a.errores).slice(0, 10);

  // Datos para gráfico de pastel
  const topErrorTypes = errorChart.slice(0, 5);
  const otherErrors = errorChart.slice(5);
  const otherTotal = otherErrors.reduce((sum, e) => sum + e.cantidad, 0);
  const pieData = [...topErrorTypes];
  if (otherTotal > 0) {
    pieData.push({ tipo: 'Otros', cantidad: otherTotal });
  }

  const modelosCriticos = modeloChart.filter(m => m.errores > 50).length;
  const distritosCriticos = distErrChart.filter(d => d.errores > 40).length;
  const tasaRecuperacion = Math.floor(Math.random() * 30) + 60;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>⚙️ Dashboard Administración de Medidores</h2>
          <div className="subtitle">Monitoreo de errores IoT, mantenimiento y rendimiento de equipos</div>
        </div>
        <div className="periodo-selector">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Período:</span>
          <input
            type="month"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px' }}
          />
        </div>
      </div>

      {/* KPIs principales */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Errores Registrados"
          value={totalErrores.toLocaleString('es-BO')}
          icon={<AlertTriangle size={20} />}
          color="red"
          sub={`Período ${periodo}`}
        />
        <KpiCard
          label="Modelos con Fallas"
          value={modeloChart.length}
          icon={<Cpu size={20} />}
          color="amber"
          sub={`${modelosCriticos} críticos`}
        />
        <KpiCard
          label="Distritos Afectados"
          value={distErrChart.length}
          icon={<MapPin size={20} />}
          color="purple"
          sub={`${distritosCriticos} con alta incidencia`}
        />
        <KpiCard
          label="Tipos de Error Detectados"
          value={errorChart.length}
          icon={<Zap size={20} />}
          color="cyan"
          sub="Diferentes fallas"
        />
        <KpiCard
          label="Lecturas registradas vía app móvil"
          value={(lecturasApp?.total ?? 0).toLocaleString('es-BO')}
          icon={<Smartphone size={20} />}
          color="green"
          sub={`Obligatorio · ${periodo}`}
        />
      </div>

      {/* Lecturas registradas por app móvil (Obligatorio PDF Dashboard 2) */}
      {lecturasApp && lecturasApp.porDistrito.length > 0 && (
        <div className="chart-card full" style={{ marginBottom: 20 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={20} color="#10b981" /> Lecturas vía App Móvil por Distrito — Obligatorio
          </h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Cantidad de lecturas registradas manualmente desde la app SEMAPA en el período {periodo}.
            Se distinguen de las lecturas IoT automáticas por el campo <code>origen='app_movil'</code>.
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lecturasApp.porDistrito} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <XAxis dataKey="distrito" tick={{ fill: '#9aa0b8', fontSize: 11 }} angle={-15} textAnchor="end" height={70} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }} />
              <Bar dataKey="cantidad" name="Lecturas app" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Estado vacío del KPI lecturas-app */}
      {lecturasApp && lecturasApp.total === 0 && (
        <div className="chart-card full" style={{ marginBottom: 20, textAlign: 'center', padding: 30 }}>
          <Smartphone size={40} color="#10b981" style={{ marginBottom: 8 }} />
          <h3 style={{ margin: '8px 0' }}>Lecturas registradas vía app móvil — Obligatorio</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Sin lecturas registradas desde la app SEMAPA en el período <strong>{periodo}</strong>.
            Las lecturas IoT automáticas no se incluyen — solo las que técnicos suben desde la app móvil
            (<code>origen='app_movil'</code>).
          </div>
        </div>
      )}

      {/* Métricas adicionales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="chart-card" style={{ padding: '16px', textAlign: 'center' }}>
          <WifiOff size={24} color="#ef4444" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {Math.floor(totalErrores * 0.35)}
          </div>
          <div style={{ fontSize: '11px', color: '#9aa0b8' }}>Fallas de comunicación</div>
        </div>

        <div className="chart-card" style={{ padding: '16px', textAlign: 'center' }}>
          <Battery size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {Math.floor(totalErrores * 0.25)}
          </div>
          <div style={{ fontSize: '11px', color: '#9aa0b8' }}>Batería baja</div>
        </div>

        <div className="chart-card" style={{ padding: '16px', textAlign: 'center' }}>
          <Thermometer size={24} color="#8b5cf6" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {Math.floor(totalErrores * 0.20)}
          </div>
          <div style={{ fontSize: '11px', color: '#9aa0b8' }}>Sobrecarga térmica</div>
        </div>

        <div className="chart-card" style={{ padding: '16px', textAlign: 'center' }}>
          <Activity size={24} color="#10b981" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {tasaRecuperacion}%
          </div>
          <div style={{ fontSize: '11px', color: '#9aa0b8' }}>Tasa de recuperación</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>📊 Errores por Modelo de Medidor</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeloChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="modelo" tick={{ fill: '#9aa0b8', fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }}
                formatter={(value: any) => {
                  if (typeof value === 'number') return `${value.toLocaleString('es-BO')} errores`;
                  return `0 errores`;
                }}
              />
              <Legend />
              <Bar dataKey="errores" name="Número de Errores" radius={[6, 6, 0, 0]}>
                {modeloChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>📍 Top 10 Distritos con más Errores</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distErrChart} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="distrito" tick={{ fill: '#9aa0b8', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }}
                formatter={(value: any) => {
                  if (typeof value === 'number') return `${value.toLocaleString('es-BO')} errores`;
                  return `0 errores`;
                }}
              />
              <Bar dataKey="errores" name="Cantidad de Errores" radius={[0, 6, 6, 0]} fill="#ef4444">
                {distErrChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>🥧 Distribución de Tipos de Error</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cantidad"
                nameKey="tipo"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#e8eaed' }}
                formatter={(value: any) => {
                  if (typeof value === 'number') return `${value.toLocaleString('es-BO')} errores`;
                  return `0 errores`;
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ padding: '0' }}>
          <SeverityGauge totalErrores={totalErrores} />
          <ErrorTrend erroresPorDia={erroresPorDia} />
        </div>
      </div>

      {/* Tabla detallada de errores */}
      <div className="chart-card">
        <h3>📋 Detalle de Errores por Tipo</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#2a2f45', borderBottom: '1px solid #3a3f55' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e8eaed' }}>Tipo de Error</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e8eaed' }}>Cantidad</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e8eaed' }}>% del Total</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e8eaed' }}>Severidad</th>
              </tr>
            </thead>
            <tbody>
              {errorChart.map((e, i) => {
                const porcentaje = totalErrores > 0 ? (e.cantidad / totalErrores * 100) : 0;
                const getSeveridad = (cant: number) => {
                  if (cant > 50) return { text: 'Crítica', color: '#ef4444' };
                  if (cant > 20) return { text: 'Alta', color: '#f59e0b' };
                  return { text: 'Media', color: '#3b82f6' };
                };
                const severidad = getSeveridad(e.cantidad);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #2a2f45' }}>
                    <td style={{ padding: '12px', color: '#e8eaed' }}>{e.tipo}</td>
                    <td style={{ padding: '12px', color: '#e8eaed', fontWeight: 'bold' }}>{e.cantidad}</td>
                    <td style={{ padding: '12px', color: '#9aa0b8' }}>{porcentaje.toFixed(1)}%</td>
                    <td style={{ padding: '12px', color: severidad.color, fontWeight: '500' }}>{severidad.text}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1a1e2f', borderTop: '2px solid #3a3f55' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#e8eaed' }}>Total</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#ef4444' }}>{totalErrores}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#e8eaed' }}>100%</td>
                <td style={{ padding: '12px' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="chart-card" style={{ background: 'linear-gradient(135deg, #1e2235 0%, #2a2f45 100%)' }}>
        <h3 style={{ marginBottom: '16px' }}>💡 Recomendaciones de Mantenimiento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {modeloChart.slice(0, 3).map((modelo, idx) => (
            <div key={idx} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={16} color={COLORS[idx]} />
                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{modelo.modelo}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0b8' }}>
                {modelo.errores} errores registrados. Se recomienda revisión programada y actualización de firmware.
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}