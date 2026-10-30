import type { AerofoilTapReading, ReynoldsReading } from '../types';
import type { SweepPoint } from '../types/research';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportReynoldsCsv(rows: ReynoldsReading[]) {
  download(`reynolds-observations-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Trial #', 'Tank Vol (mL)', 'Time (s)', 'Discharge Q (cm³/s)', 'Velocity v (m/s)', 'Temp (°C)', 'Reynolds No. (Re)', 'Observed Regime', 'Valve Opening (%)', 'Timestamp'],
    ...rows.map((r) => [r.trial, r.tankVolumeMl, r.timeSec, r.dischargeCm3s, r.velocityMs, r.temperatureC, r.reynolds, r.regime, r.valveOpeningPct ?? '', r.timestamp]),
  ]);
}

export function exportAerofoilCsv(rows: AerofoilTapReading[]) {
  download(`aerofoil-pressure-taps-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Tap #', 'Surface (Upper/Lower)', 'x/c', 'Manometer Height h (mm)', 'ΔP (Pa)', 'Cp (Experimental)', 'Cp (Theoretical)', 'Run #', 'Angle α (°)', 'Airspeed U∞ (m/s)', 'Timestamp'],
    ...rows.map((r) => [r.tap, r.surface, r.x, r.heightMm, r.deltaPPa, r.cpExperimental, r.cpTheoretical, r.runNo ?? '', r.alphaDeg ?? '', r.airspeedMs ?? '', r.timestamp]),
  ]);
}

export function exportSweepCsv(experiment: 'reynolds' | 'aerofoil', parameterLabel: string, points: SweepPoint[]) {
  const filename = `${experiment}-${parameterLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sweep-${new Date().toISOString().slice(0, 10)}.csv`;
  const rows = experiment === 'reynolds'
    ? [['Valve opening (%)', 'Discharge Q (cm³/s)', 'Reynolds number (Re)', 'Flow regime'], ...points.map((p) => [p.x, p.secondary, p.y, p.status])]
    : [['Angle of attack α (°)', 'Lift coefficient CL', 'Pressure drag coefficient CDp', 'Flow condition'], ...points.map((p) => [p.x, p.y, p.secondary, p.status])];
  download(filename, rows);
}
