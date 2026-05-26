import { useState, useEffect } from 'react';
import axios from 'axios';
import { Delete, Search, Mail, Printer, CheckCircle, ArrowLeft, RotateCcw, Droplets } from 'lucide-react';

const API = axios.create({ baseURL: `http://${window.location.hostname}:8080`, timeout: 20000 });

interface PeriodoItem {
  periodo: string;
  consumo_m3: number;
  monto_bs: number;
  estado: string;
}

interface ClienteData {
  contrato: string;
  nombre: string;
  identificador: string;
  tipo_persona: string;
  direccion: string;
  distrito: string;
  zona: string;
  tarifa: string;
  consumo_m3: number;
  monto_bs: number;
  periodo: string;
  historial: PeriodoItem[];
}

type Paso = 'bienvenida' | 'buscar' | 'datos' | 'pago' | 'email' | 'exito';

/* ─── Teclado numérico ─── */
function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (k === '⌫') { onChange(value.slice(0, -1)); return; }
    if (k === 'C')  { onChange(''); return; }
    // max 8 dígitos (2 distrito + 6 número), dash se inserta automático
    const digits = value.replace('-', '');
    if (digits.length >= 8) return;
    const next = digits + k;
    onChange(next.length > 2 ? next.slice(0, 2) + '-' + next.slice(2) : next);
  };

  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['C','0','⌫']];

  return (
    <div className="numpad">
      {rows.map((row, r) => (
        <div key={r} className="numpad-row">
          {row.map(k => (
            <button key={k} className={`numpad-key ${k === 'C' ? 'key-clear' : k === '⌫' ? 'key-back' : ''}`}
              onClick={() => press(k)}>
              {k === '⌫' ? <Delete size={28} /> : k}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Teclado QWERTY ─── */
const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m','⌫'],
  ['@','.','-','_',' ','0','1','2','3','4','5','6','7','8','9'],
];
const SHORTCUTS = ['@gmail.com','@hotmail.com','@yahoo.com','@outlook.com'];

function Qwerty({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [caps, setCaps] = useState(false);

  const press = (k: string) => {
    if (k === '⌫') { onChange(value.slice(0, -1)); return; }
    const char = caps && k.length === 1 && k.match(/[a-z]/) ? k.toUpperCase() : k;
    onChange(value + char);
  };

  return (
    <div className="qwerty">
      <div className="shortcuts">
        {SHORTCUTS.map(s => (
          <button key={s} className="shortcut-btn" onClick={() => {
            const at = value.indexOf('@');
            onChange((at >= 0 ? value.slice(0, at) : value) + s);
          }}>{s}</button>
        ))}
      </div>
      {ROWS.map((row, r) => (
        <div key={r} className="qwerty-row">
          {r === 2 && (
            <button className={`qwerty-key key-caps ${caps ? 'active' : ''}`} onClick={() => setCaps(!caps)}>
              ⇧
            </button>
          )}
          {row.map(k => (
            <button key={k} className={`qwerty-key ${k === '⌫' ? 'key-back' : k === ' ' ? 'key-space' : ''}`}
              onClick={() => press(k)}>
              {k === '⌫' ? <Delete size={18} /> : k === ' ' ? 'espacio' : caps && k.match(/^[a-z]$/) ? k.toUpperCase() : k}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Indicador de pasos ─── */
function Steps({ paso }: { paso: Paso }) {
  const steps = [
    { key: 'buscar', label: 'Buscar' },
    { key: 'datos',  label: 'Datos'  },
    { key: 'pago',   label: 'Pago'   },
  ];
  const order: Record<string, number> = { bienvenida:0, buscar:1, datos:2, pago:3, email:3, exito:4 };
  const current = order[paso] || 0;

  return (
    <div className="steps">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={s.key} className={`step ${active ? 'step-active' : done ? 'step-done' : ''}`}>
            <div className="step-circle">{done ? '✓' : idx}</div>
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── App principal ─── */
export default function App() {
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [input, setInput] = useState('');
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exitoMsg, setExitoMsg] = useState('');
  const [countdown, setCountdown] = useState(8);

  // Countdown al éxito → reiniciar
  useEffect(() => {
    if (paso !== 'exito') return;
    setCountdown(8);
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); reiniciar(); }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [paso]);

  const reiniciar = () => {
    setInput(''); setCliente(null); setEmail('');
    setError(''); setLoading(false); setExitoMsg('');
    setPaso('bienvenida');
  };

  const buscar = async () => {
    if (!input || input.replace('-','').length < 8) {
      setError('Ingresa el número completo (8 dígitos)'); return;
    }
    setError(''); setLoading(true);
    try {
      const contrato = `CONT-${input}`;
      const r = await API.get(`/api/visor/buscar?q=${encodeURIComponent(contrato)}&periodo=${periodo}`);
      setCliente(r.data);
      setPaso('datos');
    } catch {
      setError('Contrato no encontrado. Verifica el número.');
    } finally { setLoading(false); }
  };

  const enviarEmail = async () => {
    if (!cliente || !email.includes('@')) {
      setError('Ingresa un email válido'); return;
    }
    setError(''); setLoading(true);
    try {
      await API.post('/api/factura/generar', { numeroContrato: cliente.contrato, periodo: cliente.periodo });
      await API.post('/api/notificacion/simular', {
        formato: 'email', numeroContrato: cliente.contrato,
        periodo: cliente.periodo, destinatarioEmail: email,
      });
      setExitoMsg(`Comprobante enviado a ${email}`);
      setPaso('exito');
    } catch { setError('Error al enviar. Intenta de nuevo.'); }
    finally { setLoading(false); }
  };

  const imprimirRollo = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const r = await API.post('/api/factura/generar', { numeroContrato: cliente.contrato, periodo: cliente.periodo });
      window.open(`http://localhost:8080${r.data.pdfRollo}`, '_blank');
      setExitoMsg('PDF abierto — selecciona tu impresora térmica de 55mm');
      setPaso('exito');
    } catch { setError('Error al generar la factura.'); }
    finally { setLoading(false); }
  };

  const iniciales = (n: string) => n.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  /* ══════════════════════ PANTALLAS ══════════════════════ */

  /* Bienvenida */
  if (paso === 'bienvenida') return (
    <div className="totem-screen welcome-screen">
      <div className="welcome-content">
        <div className="welcome-icon"><Droplets size={64} color="#fff" /></div>
        <h1>SEMAPA</h1>
        <p>Sistema de Gestión de Agua Potable<br />Cochabamba — Bolivia</p>
        <button className="totem-btn btn-start" onClick={() => setPaso('buscar')}>
          Consultar mi cuenta
        </button>
        <div className="welcome-hint">Toca el botón para comenzar</div>
      </div>
      <div className="periodo-row">
        <label>Período:</label>
        <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
          className="periodo-select" />
      </div>
    </div>
  );

  /* Buscar */
  if (paso === 'buscar') return (
    <div className="totem-screen">
      <div className="totem-header">
        <Droplets size={28} color="#fff" />
        <span>SEMAPA — Visor de Pagos</span>
      </div>
      <Steps paso={paso} />

      <div className="totem-body">
        <div className="input-label">Ingresa tu número de contrato</div>
        <div className="contract-display">
          <span className="prefix">CONT-</span>
          <span className="typed">{input || <span className="cursor">_</span>}</span>
        </div>
        <div className="input-hint">Ejemplo: CONT-<strong>05-347821</strong> → ingresa <strong>05347821</strong></div>

        {error && <div className="totem-error">{error}</div>}

        <NumPad value={input} onChange={v => { setInput(v); setError(''); }} />

        <button className="totem-btn btn-buscar" onClick={buscar}
          disabled={loading || input.replace('-','').length < 8}>
          {loading ? <div className="spinner-white" /> : <Search size={24} />}
          {loading ? 'Buscando...' : 'Buscar mi cuenta'}
        </button>

        <button className="totem-link" onClick={reiniciar}>
          <ArrowLeft size={16} /> Volver al inicio
        </button>
      </div>
    </div>
  );

  /* Datos */
  if (paso === 'datos' && cliente) {
    const totalPendiente = cliente.historial.filter(h => h.estado === 'pendiente').reduce((s, h) => s + h.monto_bs, 0);
    return (
      <div className="totem-screen">
        <div className="totem-header">
          <Droplets size={28} color="#fff" />
          <span>SEMAPA — Visor de Pagos</span>
        </div>
        <Steps paso={paso} />

        <div className="totem-body">
          <div className="cliente-card">
            <div className="cliente-avatar">{iniciales(cliente.nombre)}</div>
            <div className="cliente-info">
              <div className="cliente-nombre">{cliente.nombre}</div>
              <div className="cliente-sub">{cliente.contrato} · {cliente.identificador}</div>
              <div className="cliente-tags">
                <span className="ctag">{cliente.tarifa}</span>
                <span className="ctag">Distrito {cliente.distrito}</span>
                <span className="ctag">{cliente.zona}</span>
              </div>
            </div>
          </div>

          {cliente.historial.length > 0 && (
            <div className="historial-tabla">
              <div className="historial-titulo">Historial de consumos</div>
              <table className="htable">
                <thead>
                  <tr><th>Período</th><th>Consumo (m³)</th><th>Monto (Bs)</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {cliente.historial.map(h => (
                    <tr key={h.periodo} className={h.estado === 'pendiente' ? 'hrow-pendiente' : ''}>
                      <td>{h.periodo}</td>
                      <td>{h.consumo_m3.toFixed(2)}</td>
                      <td><strong>Bs {h.monto_bs.toFixed(2)}</strong></td>
                      <td><span className={`badge-estado ${h.estado}`}>{h.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="total-pendiente">
                Total pendiente: <strong>Bs {totalPendiente.toFixed(2)}</strong>
              </div>
            </div>
          )}

          <button className="totem-btn btn-buscar" onClick={() => setPaso('pago')}>
            Ver opciones de pago →
          </button>
          <button className="totem-link" onClick={() => { setPaso('buscar'); setInput(''); }}>
            <ArrowLeft size={16} /> Buscar otro contrato
          </button>
        </div>
      </div>
    );
  }

  /* Opciones de pago */
  if (paso === 'pago') return (
    <div className="totem-screen">
      <div className="totem-header">
        <Droplets size={28} color="#fff" />
        <span>SEMAPA — Visor de Pagos</span>
      </div>
      <Steps paso={paso} />

      <div className="totem-body">
        <div className="pago-title">¿Cómo deseas recibir tu comprobante?</div>

        <div className="pago-options">
          <button className="pago-card" onClick={() => setPaso('email')}>
            <Mail size={48} />
            <div className="pago-card-title">Correo electrónico</div>
            <div className="pago-card-sub">Recibe el comprobante en tu Gmail, Hotmail u otro correo</div>
          </button>
          <button className="pago-card pago-card-green" onClick={imprimirRollo} disabled={loading}>
            <Printer size={48} />
            <div className="pago-card-title">Imprimir comprobante</div>
            <div className="pago-card-sub">Impresión en rollo térmico de 55mm en ventanilla</div>
          </button>
        </div>

        {error && <div className="totem-error">{error}</div>}

        <button className="totem-link" onClick={() => setPaso('datos')}>
          <ArrowLeft size={16} /> Volver a mis datos
        </button>
      </div>
    </div>
  );

  /* Ingresar email */
  if (paso === 'email') return (
    <div className="totem-screen">
      <div className="totem-header">
        <Droplets size={28} color="#fff" />
        <span>SEMAPA — Visor de Pagos</span>
      </div>
      <Steps paso={paso} />

      <div className="totem-body">
        <div className="input-label">Ingresa tu correo electrónico</div>
        <div className={`email-display ${!email.includes('@') && email.length > 0 ? 'invalid' : ''}`}>
          {email || <span className="cursor-placeholder">correo@ejemplo.com</span>}
        </div>

        {error && <div className="totem-error">{error}</div>}

        <Qwerty value={email} onChange={v => { setEmail(v); setError(''); }} />

        <button className="totem-btn btn-buscar" onClick={enviarEmail}
          disabled={loading || !email.includes('@')}>
          {loading ? <div className="spinner-white" /> : <Mail size={24} />}
          {loading ? 'Enviando...' : 'Enviar comprobante'}
        </button>

        <button className="totem-link" onClick={() => { setPaso('pago'); setError(''); }}>
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
    </div>
  );

  /* Éxito */
  if (paso === 'exito') return (
    <div className="totem-screen exito-screen">
      <div className="exito-content">
        <CheckCircle size={80} color="#22c55e" />
        <h2>¡Listo!</h2>
        <p>{exitoMsg}</p>
        <div className="countdown-bar">
          <div className="countdown-fill" style={{ width: `${(countdown / 8) * 100}%` }} />
        </div>
        <div className="countdown-text">Volviendo al inicio en {countdown}s...</div>
        <button className="totem-btn btn-reiniciar" onClick={reiniciar}>
          <RotateCcw size={20} /> Nueva consulta ahora
        </button>
      </div>
    </div>
  );

  return null;
}
