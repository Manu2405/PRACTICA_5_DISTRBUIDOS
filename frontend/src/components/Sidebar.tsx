import { NavLink } from 'react-router-dom';
import { BarChart3, DollarSign, Settings, FileText, Droplets, Database, Building2 } from 'lucide-react';

const links = [
  { to: '/operacional', label: 'Dashboard SEMAPA', icon: <BarChart3 size={18} /> },
  { to: '/alcaldia', label: 'Alcaldía', icon: <Building2 size={18} /> },
  { to: '/contabilidad', label: 'Contabilidad', icon: <DollarSign size={18} /> },
  { to: '/administracion', label: 'Administración', icon: <Settings size={18} /> },
  { to: '/factura', label: 'Facturación', icon: <FileText size={18} /> },
  { to: '/consultas', label: 'Consultas (25)', icon: <Database size={18} /> },
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
