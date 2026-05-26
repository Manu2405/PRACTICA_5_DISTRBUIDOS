import { NavLink } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import administracionIcon from '../icons/administracion.png';
import alcaldiaIcon from '../icons/COCHA.svg';
import consultasIcon from '../icons/consultas.png';
import contabilidadIcon from '../icons/contabilidad.png';
import facturacionIcon from '../icons/facturacion.png';
import semapa1Icon from '../icons/semapa1.png';

const links = [
  { to: '/operacional', label: 'Dashboard SEMAPA', icon: <img src={semapa1Icon} alt="Dashboard" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
  { to: '/alcaldia', label: 'Alcaldía', icon: <img src={alcaldiaIcon} alt="Alcaldía" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
  { to: '/contabilidad', label: 'Contabilidad', icon: <img src={contabilidadIcon} alt="Contabilidad" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
  { to: '/administracion', label: 'Administración', icon: <img src={administracionIcon} alt="Administración" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
  { to: '/factura', label: 'Facturación', icon: <img src={facturacionIcon} alt="Facturación" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
  { to: '/consultas', label: 'Consultas (25)', icon: <img src={consultasIcon} alt="Consultas" style={{ width: 20, height: 20, objectFit: 'contain' }} /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Droplets size={28} color="#3b82f6" />
        <div>
          <h1>SEMAPA</h1>
          <span>Sistema de Gestión de Agua</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => isActive ? 'active' : ''}>
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        Cochabamba — Bolivia<br />v1.0 · Práctica 5
      </div>
    </aside>
  );
}
