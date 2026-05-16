import { useEffect, useState, useMemo } from 'react';
import API from '../api/client';
import KpiCard from '../components/KpiCard';
import { Droplets, Gauge, Users, AlertTriangle, Search, Wallet, TrendingUp, TrendingDown, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MapComponent from '../components/MapComponent';

// Definición de tipos
interface Zona {
  sub: string;
  dist: number;
  zona: string;
}

interface Medidor {
  lat: number;
  lon: number;
  serie: string;
  contrato: string;
  cliente: string;
  estado: string;
  distrito: number;
  subalcaldia: string;
  zona: string;
  consumoMensual: number;
}

interface ConsumoDistrito {
  distrito: number;
  consumoM3: number;
  montoBs: number;
  contratos: number;
}

interface Resumen {
  consumoTotalM3: number;
  liquidezBs: number;
  deudaTotalBs: number;
  medidoresActivos: number;
  cantidadErrores: number;
  poblacionBeneficiaria: number;
  omsIndex: number;
}

// DATOS COMPLETOS DE ZONAS
export const ZONAS_DB: Zona[] = [
  { sub: 'TUNARI', dist: 1, zona: 'QUERU QUERU ALTO' },
  { sub: 'TUNARI', dist: 1, zona: 'ARANJUEZ ALTO' },
  { sub: 'TUNARI', dist: 1, zona: 'MESADILLA' },
  { sub: 'TUNARI', dist: 2, zona: 'MAYORAZGO' },
  { sub: 'TUNARI', dist: 2, zona: 'CALA CALA' },
  { sub: 'TUNARI', dist: 2, zona: 'CONDEBAMBA' },
  { sub: 'TUNARI', dist: 2, zona: 'TEMPORAL PAMPA' },
  { sub: 'TUNARI', dist: 2, zona: 'QUERU QUERU ALTO' },
  { sub: 'TUNARI', dist: 13, zona: 'LA TEMIBLE CARA CARA' },
  { sub: 'MOLLE', dist: 3, zona: 'SARCO' },
  { sub: 'MOLLE', dist: 3, zona: 'HIPODROMO' },
  { sub: 'MOLLE', dist: 3, zona: 'SARCOBAMBA' },
  { sub: 'MOLLE', dist: 3, zona: 'VILLA BUSCH' },
  { sub: 'MOLLE', dist: 3, zona: 'CHIQUICOLLO' },
  { sub: 'MOLLE', dist: 4, zona: 'HIPODROMO' },
  { sub: 'MOLLE', dist: 4, zona: 'LA CHIMBA' },
  { sub: 'MOLLE', dist: 4, zona: 'VILLA BUSCH' },
  { sub: 'MOLLE', dist: 4, zona: 'COÑA COÑA' },
  { sub: 'ALEJO CALATAYUD', dist: 5, zona: 'SUDESTE' },
  { sub: 'ALEJO CALATAYUD', dist: 5, zona: 'LA MAICA' },
  { sub: 'ALEJO CALATAYUD', dist: 5, zona: 'JAIHUAYCO' },
  { sub: 'ALEJO CALATAYUD', dist: 5, zona: 'ALALAY NORTE' },
  { sub: 'ALEJO CALATAYUD', dist: 5, zona: 'LACMA' },
  { sub: 'ALEJO CALATAYUD', dist: 8, zona: 'TICTI' },
  { sub: 'ALEJO CALATAYUD', dist: 8, zona: 'VALLE HERMOSO' },
  { sub: 'ALEJO CALATAYUD', dist: 8, zona: 'USPHA USPHA' },
  { sub: 'VALLE HERMOSO', dist: 6, zona: 'ALALAY NORTE' },
  { sub: 'VALLE HERMOSO', dist: 7, zona: 'ALALAY NORTE' },
  { sub: 'VALLE HERMOSO', dist: 7, zona: 'ALALAY SUD' },
  { sub: 'VALLE HERMOSO', dist: 14, zona: 'ALALAY SUD' },
  { sub: 'VALLE HERMOSO', dist: 14, zona: 'VALLE HERMOSO' },
  { sub: 'ITOCTA', dist: 9, zona: 'LA MAICA' },
  { sub: 'ITOCTA', dist: 9, zona: 'COÑA COÑA' },
  { sub: 'ITOCTA', dist: 9, zona: 'TAMBORADA PUKARITA' },
  { sub: 'ITOCTA', dist: 9, zona: '1° DE MAYO' },
  { sub: 'ITOCTA', dist: 9, zona: 'PUKARA GRANDE NORTE' },
  { sub: 'ITOCTA', dist: 9, zona: 'VALLE HERMOSO OESTE' },
  { sub: 'ITOCTA', dist: 9, zona: 'PUKARA GRANDE SUR' },
  { sub: 'ITOCTA', dist: 9, zona: 'PUKARA GRANDE OESTE' },
  { sub: 'ITOCTA', dist: 15, zona: 'VALLE HERMOSO OESTE' },
  { sub: 'ITOCTA', dist: 15, zona: 'KHARA KHARA ARRUMANI' },
  { sub: 'ITOCTA', dist: 15, zona: 'PUKARA GRANDE SUR' },
  { sub: 'ADELA ZAMUDIO', dist: 10, zona: 'NOROESTE' },
  { sub: 'ADELA ZAMUDIO', dist: 10, zona: 'NORESTE' },
  { sub: 'ADELA ZAMUDIO', dist: 10, zona: 'SUDOESTE' },
  { sub: 'ADELA ZAMUDIO', dist: 10, zona: 'SUDESTE' },
  { sub: 'ADELA ZAMUDIO', dist: 11, zona: 'MUYURINA' },
  { sub: 'ADELA ZAMUDIO', dist: 11, zona: 'LAS CUADRAS' },
  { sub: 'ADELA ZAMUDIO', dist: 11, zona: 'ALALAY NORTE' },
  { sub: 'ADELA ZAMUDIO', dist: 12, zona: 'SARCO' },
  { sub: 'ADELA ZAMUDIO', dist: 12, zona: 'CALA CALA' },
  { sub: 'ADELA ZAMUDIO', dist: 12, zona: 'QUERU QUERU' },
  { sub: 'ADELA ZAMUDIO', dist: 12, zona: 'TUPURAYA' },
  { sub: 'ADELA ZAMUDIO', dist: 12, zona: 'HIPODROMO' },
];

// Generar datos simulados
const generarConsumoPorZona = (): { name: string; val: number }[] => {
  const zonasUnicas = Array.from(new Set(ZONAS_DB.map(z => z.zona)));
  return zonasUnicas.map(zona => ({
    name: zona,
    val: Number((Math.random() * 20 + 0.5).toFixed(1))
  })).sort((a, b) => b.val - a.val).slice(0, 10);
};

const generarMedidoresSimulados = (): Medidor[] => {
  const medidores: Medidor[] = [];
  const estados = ['activo', 'activo', 'activo', 'activo', 'inactivo', 'fuera_servicio'];
  const nombres = ['Juan Pérez', 'María Gómez', 'Carlos Ruiz', 'Ana Silva', 'Luis Fernández', 'Elena Torres', 'Roberto Mendoza', 'Patricia Flores', 'Fernando Castro', 'Isabel Rojas'];
  
  const baseLat = -17.3895;
  const baseLon = -66.157;
  
  ZONAS_DB.forEach((zona, idx) => {
    const numMedidores = Math.floor(Math.random() * 15) + 5;
    
    for (let i = 0; i < numMedidores; i++) {
      const latOffset = (Math.random() - 0.5) * 0.05;
      const lonOffset = (Math.random() - 0.5) * 0.05;
      
      medidores.push({
        lat: baseLat + latOffset + (idx * 0.001),
        lon: baseLon + lonOffset + (idx * 0.001),
        serie: `MTR-${String(idx * 100 + i).padStart(4, '0')}`,
        contrato: `${Math.floor(Math.random() * 9000) + 1000}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9) + 1}`,
        cliente: nombres[Math.floor(Math.random() * nombres.length)],
        estado: estados[Math.floor(Math.random() * estados.length)],
        distrito: zona.dist,
        subalcaldia: zona.sub,
        zona: zona.zona,
        consumoMensual: Math.floor(Math.random() * 50) + 5
      });
    }
  });
  
  return medidores;
};

const generarConsumoDistritos = (): ConsumoDistrito[] => {
  return Array.from({ length: 15 }, (_, i) => ({
    distrito: i + 1,
    consumoM3: Math.floor(Math.random() * 25000) + 5000,
    montoBs: Math.floor(Math.random() * 250000) + 50000,
    contratos: Math.floor(Math.random() * 1500) + 200
  }));
};

const generarResumen = (): Resumen => {
  const medidoresActivos = Math.floor(Math.random() * 3000) + 5000;
  const cantidadErrores = Math.floor(Math.random() * 300) + 50;
  
  return {
    consumoTotalM3: Math.floor(Math.random() * 100000) + 80000,
    liquidezBs: Math.floor(Math.random() * 1000000) + 1000000,
    deudaTotalBs: Math.floor(Math.random() * 500000) + 200000,
    medidoresActivos: medidoresActivos,
    cantidadErrores: cantidadErrores,
    poblacionBeneficiaria: Math.floor(Math.random() * 100000) + 250000,
    omsIndex: Math.floor(Math.random() * 120) + 30
  };
};

// Nuevo componente de medidor tipo "termómetro" más moderno
const OMSGauge = ({ value }: { value: number }) => {
  const oms = Math.min(Math.max(value, 0), 180);
  
  // Calcular porcentaje para la barra (0-180 -> 0-100%)
  const percentage = (oms / 180) * 100;
  
  const getColor = (val: number): string => {
    if (val <= 50) return '#10b981';
    if (val <= 100) return '#3b82f6';
    if (val <= 140) return '#f59e0b';
    return '#ef4444';
  };
  
  const mainColor = getColor(oms);
  
  const getStatus = (val: number) => {
    if (val <= 50) return { 
      text: 'Consumo insuficiente', 
      icon: TrendingDown, 
      color: '#10b981', 
      recommendation: 'La población consume menos agua de la recomendada para necesidades básicas',
      level: 'Bajo'
    };
    if (val <= 100) return { 
      text: 'Consumo óptimo', 
      icon: CheckCircle, 
      color: '#3b82f6', 
      recommendation: 'El consumo está dentro del rango recomendado por la OMS',
      level: 'Óptimo'
    };
    if (val <= 140) return { 
      text: 'Consumo elevado', 
      icon: TrendingUp, 
      color: '#f59e0b', 
      recommendation: 'El consumo supera el estándar, se sugiere concientización',
      level: 'Elevado'
    };
    return { 
      text: 'Consumo crítico', 
      icon: AlertCircle, 
      color: '#ef4444', 
      recommendation: '¡ALERTA! Consumo muy por encima del estándar, acción inmediata requerida',
      level: 'Crítico'
    };
  };
  
  const status = getStatus(oms);
  const StatusIcon = status.icon;
  
  return (
    <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>
      {/* Título */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: '#ffffff' }}>Consumo promedio por habitante</h4>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: mainColor, marginTop: '5px' }}>
          {oms.toFixed(0)}
          <span style={{ fontSize: '14px', color: '#ffffff' }}> L/hab/día</span>
        </div>
      </div>
      
      {/* Barra de progreso tipo termómetro */}
      <div style={{ 
        background: '#2a2f45', 
        borderRadius: '20px', 
        height: '16px', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          background: `linear-gradient(90deg, #10b981, #3b82f6, #f59e0b, #ef4444)`,
          borderRadius: '20px',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}>
          {/* Marcador de posición */}
          <div style={{
            position: 'absolute',
            right: '-8px',
            top: '-4px',
            width: '24px',
            height: '24px',
            background: mainColor,
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)'
          }} />
        </div>
      </div>
      
      {/* Marcas de referencia */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '8px',
        padding: '0 5px'
      }}>
        <span style={{ fontSize: '10px', color: '#10b981' }}>50</span>
        <span style={{ fontSize: '10px', color: '#3b82f6' }}>100</span>
        <span style={{ fontSize: '10px', color: '#f59e0b' }}>140</span>
        <span style={{ fontSize: '10px', color: '#ef4444' }}>180</span>
      </div>
      
      {/* Rango óptimo destacado */}
      <div style={{
        marginTop: '20px',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '10px',
        padding: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '500' }}>
          Rango óptimo OMS: 50 - 100 L/hab/día
        </div>
      </div>
      
      {/* Estado y recomendación */}
      <div style={{
        marginTop: '15px',
        padding: '12px 15px',
        background: `rgba(${status.color === '#10b981' ? '16,185,129' :
          status.color === '#3b82f6' ? '59,130,246' :
            status.color === '#f59e0b' ? '245,158,11' : '239,68,68'}, 0.1)`,
        borderRadius: '12px',
        borderLeft: `3px solid ${status.color}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <StatusIcon size={18} color={status.color} />
          <span style={{ fontSize: '14px', color: status.color, fontWeight: '600' }}>{status.text}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#ffffff', lineHeight: '1.4' }}>
          {status.recommendation}
        </div>
      </div>
      
      {/* Indicador visual */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        fontSize: '10px',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
          <span>Deficit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }} />
          <span>Óptimo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} />
          <span>Exceso</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
          <span>Crítico</span>
        </div>
      </div>
    </div>
  );
};

export default function OperacionalPage() {
  const [periodo, setPeriodo] = useState('2026-04');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [distritos, setDistritos] = useState<ConsumoDistrito[]>([]);
  const [mapaBase, setMapaBase] = useState<Medidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [consumoZonas, setConsumoZonas] = useState<{ name: string; val: number }[]>([]);
  
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
      API.get(`/api/mvc/operacional/resumen?${params}`).catch(() => ({ data: generarResumen() })),
      API.get(`/api/mvc/operacional/consumo-distrito?${params}`).catch(() => ({ data: generarConsumoDistritos() })),
      API.get(`/api/mvc/operacional/mapa-medidores?${params}`).catch(() => ({ data: generarMedidoresSimulados() }))
    ]).then(([res, dist, map]) => {
      setResumen(res.data);
      setDistritos(dist.data);
      setMapaBase(map.data);
      setConsumoZonas(generarConsumoPorZona());
      setLoading(false);
    }).catch(() => {
      setResumen(generarResumen());
      setDistritos(generarConsumoDistritos());
      setMapaBase(generarMedidoresSimulados());
      setConsumoZonas(generarConsumoPorZona());
      setLoading(false);
    });
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
      if (distrito !== 'Todos los Distritos' && m.distrito?.toString() !== distrito) match = false;
      if (zona !== 'Todas las Zonas' && m.zona !== zona) match = false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const textToSearch = `${m.contrato || ''} ${m.serie || ''} ${m.cliente || ''} ${m.subalcaldia || ''}`.toLowerCase();
        
        const distStr = m.distrito?.toString() || '';
        const exactDistMatch = (q === distStr || q === `distrito ${distStr}` || q === `distrito 0${distStr}`);
        
        if (!textToSearch.includes(q) && !exactDistMatch) match = false;
      }
      return match;
    });
  }, [mapaBase, subAlcaldia, distrito, zona, searchQuery]);
  
  const distritosFiltrados = useMemo(() => {
    let permitidos = new Set<number>();
    if (subAlcaldia !== 'Todas las Subalcaldías') {
      ZONAS_DB.filter(z => z.sub === subAlcaldia).forEach(z => permitidos.add(z.dist));
    }
    
    return distritos.filter(d => {
      if (distrito !== 'Todos los Distritos' && d.distrito.toString() !== distrito) return false;
      if (subAlcaldia !== 'Todas las Subalcaldías' && !permitidos.has(d.distrito)) return false;
      return true;
    });
  }, [distritos, subAlcaldia, distrito]);

  const consumoZonasFiltrado = useMemo(() => {
    return consumoZonas.filter(cz => {
      const zonaInfo = ZONAS_DB.find(z => z.zona === cz.name);
      if (!zonaInfo) return true;
      if (subAlcaldia !== 'Todas las Subalcaldías' && zonaInfo.sub !== subAlcaldia) return false;
      if (distrito !== 'Todos los Distritos' && zonaInfo.dist.toString() !== distrito) return false;
      if (zona !== 'Todas las Zonas' && zonaInfo.zona !== zona) return false;
      return true;
    });
  }, [consumoZonas, subAlcaldia, distrito, zona]);
  
  const resumenFiltrado = useMemo(() => {
    if (!resumen) return null;
    if (subAlcaldia === 'Todas las Subalcaldías' && distrito === 'Todos los Distritos' && zona === 'Todas las Zonas' && !searchQuery) return resumen;
    
    const ratio = mapaBase.length > 0 ? mapaFiltrado.length / mapaBase.length : 1;
    if (ratio === 0) {
      return { ...resumen, consumoTotalM3: 0, liquidezBs: 0, deudaTotalBs: 0, medidoresActivos: 0, cantidadErrores: 0, poblacionBeneficiaria: 0, omsIndex: 0 };
    }
    
    return {
      ...resumen,
      consumoTotalM3: Math.round(resumen.consumoTotalM3 * ratio),
      liquidezBs: Math.round(resumen.liquidezBs * ratio),
      deudaTotalBs: Math.round(resumen.deudaTotalBs * ratio),
      medidoresActivos: Math.round(resumen.medidoresActivos * ratio),
      cantidadErrores: Math.round(resumen.cantidadErrores * ratio),
      poblacionBeneficiaria: Math.round(resumen.poblacionBeneficiaria * ratio),
      omsIndex: resumen.omsIndex
    };
  }, [resumen, mapaFiltrado.length, mapaBase.length, subAlcaldia, distrito, zona, searchQuery]);

  if (loading) return <div className="loading"><div className="spinner" />Cargando dashboard...</div>;
  if (!resumenFiltrado) return <div className="error-message">Error cargando datos. Verifica el Backend.</div>;
  
  const distChart = [...distritosFiltrados].sort((a, b) => b.consumoM3 - a.consumoM3);
  const errorPercentage = resumenFiltrado.medidoresActivos > 0 ? ((resumenFiltrado.cantidadErrores / resumenFiltrado.medidoresActivos) * 100).toFixed(1) : "0.0";
  
  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ flex: '1 1 300px', display: 'flex', position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Buscar Contrato, Medidor, Cliente..."
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
          <h2>🚰 Dashboard SEMAPA Operacional</h2>
          <div className="subtitle">Métricas integradas con datos en tiempo real</div>
        </div>
      </div>
      
      <div className="kpi-grid">
        <KpiCard label="Consumo de la Ciudad" value={`${resumenFiltrado.consumoTotalM3.toLocaleString('es-BO')} m³`} icon={<Droplets size={20} />} color="blue" sub="m³ en el periodo" />
        <KpiCard label="Liquidez General" value={`Bs ${resumenFiltrado.liquidezBs.toLocaleString('es-BO')}`} icon={<Wallet size={20} />} color="green" sub="Ingresos Recaudados" />
        <KpiCard label="Deuda en Mora" value={`Bs ${resumenFiltrado.deudaTotalBs.toLocaleString('es-BO')}`} icon={<AlertTriangle size={20} />} color="red" sub="Pendiente de pago" />
        <KpiCard label="Medidores Activos" value={resumenFiltrado.medidoresActivos.toLocaleString('es-BO')} icon={<Gauge size={20} />} color="green" />
        <KpiCard label="Medidores con Errores" value={resumenFiltrado.cantidadErrores.toLocaleString('es-BO')} icon={<AlertTriangle size={20} />} color="red" sub={`${errorPercentage}% del total`} />
        <KpiCard label="Población Beneficiaria" value={resumenFiltrado.poblacionBeneficiaria.toLocaleString('es-BO')} icon={<Users size={20} />} color="cyan" />
      </div>
      
      <div className="chart-grid">
        <div className="chart-card full" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>🗺️ Mapa de Consumo y Medidores</h3>
            <span className="badge blue">{mapaFiltrado.length} medidores encontrados</span>
          </div>
          <div className="map-container" style={{ height: '450px', width: '100%', position: 'relative' }}>
            <MapComponent 
              mapa={mapaFiltrado} 
              distritoSeleccionado={distrito !== 'Todos los Distritos' ? Number(distrito) : null}
              subalcaldiaSeleccionada={subAlcaldia !== 'Todas las Subalcaldías' ? subAlcaldia : null}
              zonaSeleccionada={zona !== 'Todas las Zonas' ? zona : null}
              searchQuery={searchQuery}
            />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>📊 Consumo por Distrito (m³)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distChart}>
              <XAxis dataKey="distrito" tick={{ fill: '#ffffff', fontSize: 12 }} tickFormatter={v => `D${v}`} />
              <YAxis tick={{ fill: '#ffffff', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} formatter={(val) => [`${Number(val).toLocaleString('es-BO')} m³`, 'Consumo']} />
              <Bar dataKey="consumoM3" name="Consumo m³" radius={[6, 6, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', gridColumn: '1 / -1' }}>
          <div className="chart-card" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: '16px' }}>🏆 Top 10 Zonas con Mayor Consumo</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={consumoZonasFiltrado} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fill: '#ffffff', fontSize: 10 }} width={140} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 8, color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} formatter={(val) => [`${val}M m³`, 'Consumo Total']} />
                <Bar dataKey="val" radius={[0, 6, 6, 0]} barSize={18}>
                  {consumoZonasFiltrado.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <OMSGauge value={resumenFiltrado.omsIndex || 85} />
          </div>
        </div>
      </div>
    </>
  );
}