import { useState } from 'react';
import API from '../api/client';
import { FileText, Send, Search } from 'lucide-react';

export default function FacturaPage() {
  const [contrato, setContrato] = useState('');
  const [periodo, setPeriodo] = useState('2026-04');
  const [emailDest, setEmailDest] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [consumos, setConsumos] = useState<any[]>([]);
  const [notif, setNotif] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [error, setError] = useState('');

  const buscar = async () => {
    if (!contrato) return;
    setLoading(true); setError(''); setResultado(null); setNotif(null);
    try {
      const [fac, hist] = await Promise.all([
        API.post('/api/factura/generar', { numeroContrato: contrato, periodo }),
        API.get(`/api/consultas/consumo/${contrato}`),
      ]);
      setResultado(fac.data);
      setConsumos(hist.data || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al buscar');
    } finally { setLoading(false); }
  };

  const simularNotif = async (formato: string) => {
    setSendingNotif(true);
    try {
      const body: any = { formato, numeroContrato: contrato, periodo };
      if (formato === 'email' && emailDest) body.destinatarioEmail = emailDest;
      const r = await API.post('/api/notificacion/simular', body);
      setNotif(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error en notificación');
    } finally { setSendingNotif(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Facturación y Recibos</h2>
          <div className="subtitle">Genera recibos y simula notificaciones</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Form */}
        <div className="chart-card">
          <h3><FileText size={18} style={{ marginRight: 8 }} />Generar Factura</h3>
          <div className="form-group">
            <label>Número de Contrato</label>
            <input placeholder="Ej: CONT-04-719276" value={contrato}
              onChange={e => setContrato(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Período</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={buscar} disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Search size={16} /> {loading ? 'Buscando...' : 'Generar Factura'}
          </button>
          {error && <div style={{ marginTop: 12, color: 'var(--accent-red)', fontSize: '0.85rem' }}>{error}</div>}
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="result-card">
            <h3 style={{ color: 'var(--accent-green)' }}>✅ Factura Generada</h3>
            <div className="result-row"><span className="label">Cliente</span><span className="value">{resultado.cliente}</span></div>
            <div className="result-row"><span className="label">Período</span><span className="value">{resultado.periodo}</span></div>
            <div className="result-row"><span className="label">Consumo</span><span className="value">{resultado.consumoM3} m³</span></div>
            <div className="result-total">Bs {resultado.montoBs?.toFixed(2)}</div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <a href={`http://localhost:8080${resultado.pdfMediaCarta}`} target="_blank" rel="noreferrer"
                className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                📄 Media Carta
              </a>
              <a href={`http://localhost:8080${resultado.pdfRollo}`} target="_blank" rel="noreferrer"
                className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: 'var(--gradient-green)' }}>
                🧾 Rollo Térmico
              </a>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>📧 Email del destinatario (para envío real)</label>
                <input type="email" placeholder="ejemplo@gmail.com" value={emailDest}
                  onChange={e => setEmailDest(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => simularNotif('whatsapp')} disabled={sendingNotif}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Send size={14} /> WhatsApp
              </button>
              <button className="btn btn-secondary" onClick={() => simularNotif('sms')} disabled={sendingNotif}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Send size={14} /> SMS
              </button>
              <button className="btn btn-primary" onClick={() => simularNotif('email')} disabled={sendingNotif || !emailDest}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: !emailDest ? 0.5 : 1 }}>
                <Send size={14} /> {sendingNotif ? 'Enviando...' : '📧 Enviar Email'}
              </button>
            </div>
          </div>
        )}
      </div>

      {notif && (
        <div className="result-card" style={{ marginTop: 20 }}>
          <h3 style={{ color: notif.estado === 'enviado' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
            {notif.estado === 'enviado' ? '✅ Email Enviado' : `📨 Notificación ${notif.formato.toUpperCase()}`}
          </h3>
          {notif.email && !notif.email.error && (
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 8, marginTop: 8, fontSize: '0.85rem', color: 'var(--accent-green)' }}>
              Email enviado exitosamente con PDFs adjuntos
            </div>
          )}
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, marginTop: 12, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {notif.mensaje}
          </div>
        </div>
      )}

      {consumos.length > 0 && (
        <div className="chart-card" style={{ marginTop: 20 }}>
          <h3>Historial de Consumo — {contrato}</h3>
          <table className="data-table">
            <thead><tr><th>Período</th><th>Consumo m³</th><th>Monto Bs</th><th>Estado</th></tr></thead>
            <tbody>
              {consumos.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.periodo}</td>
                  <td>{c.consumoM3} m³</td>
                  <td>Bs {c.montoBs}</td>
                  <td><span className={`badge ${c.estado === 'pendiente' ? 'amber' : 'green'}`}>{c.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
