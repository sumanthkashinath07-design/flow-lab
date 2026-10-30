import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  accent?: 'cyan' | 'green' | 'amber' | 'red' | 'blue' | 'neutral';
  foot?: string;
  icon?: ReactNode;
}

export default function MetricCard({ label, value, unit, accent = 'neutral', foot, icon }: MetricCardProps) {
  return <div className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span>{icon && <i>{icon}</i>}</div><div className="metric-value">{value}{unit && <small>{unit}</small>}</div>{foot && <div className="metric-foot">{foot}</div>}</div>;
}
