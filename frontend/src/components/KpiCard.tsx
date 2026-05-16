import { type ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
}

export default function KpiCard({ label, value, sub, icon, color = 'blue' }: Props) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString('es-BO') : value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}