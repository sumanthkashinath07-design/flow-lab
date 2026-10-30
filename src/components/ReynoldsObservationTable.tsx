import { Download, PencilLine, Table2 } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import type { FlowRegime, ReynoldsReading } from '../types';

interface Props {
  rows: ReynoldsReading[];
  onChange: (rows: ReynoldsReading[]) => void;
  autoCalculate: boolean;
  onAutoCalculate: (value: boolean) => void;
  manualMode: boolean;
  onManualMode: (value: boolean) => void;
  onExport: () => void;
}

function editNumber(rows: ReynoldsReading[], onChange: Props['onChange'], index: number, key: keyof ReynoldsReading, value: string) {
  const next = [...rows];
  next[index] = { ...next[index], [key]: Number(value), manual: true };
  onChange(next);
}

function readCell(row: ReynoldsReading, key: keyof ReynoldsReading, digits = 2) {
  const value = row[key];
  if (typeof value !== 'number') return String(value ?? '—');
  if (['trial', 'tankVolumeMl', 'timeSec', 'temperatureC', 'reynolds'].includes(String(key))) return key === 'reynolds' ? value.toFixed(0) : key === 'timeSec' ? value.toFixed(1) : key === 'temperatureC' ? value.toFixed(1) : value.toFixed(0);
  return value.toFixed(digits);
}

export default function ReynoldsObservationTable({ rows, onChange, autoCalculate, onAutoCalculate, manualMode, onManualMode, onExport }: Props) {
  const regimeClass = (regime: FlowRegime) => regime.toLowerCase();
  const numeric = (row: ReynoldsReading, i: number, key: keyof ReynoldsReading, digits = 2) => manualMode
    ? <input aria-label={`Trial ${i + 1} ${String(key)}`} className="table-input" type="number" step="any" value={typeof row[key] === 'number' ? row[key] : 0} onChange={(e) => editNumber(rows, onChange, i, key, e.target.value)} />
    : readCell(row, key, digits);

  return <section className="panel-card observations-card">
    <div className="table-heading"><div className="plot-heading-title"><span className="plot-icon"><Table2 size={14} /></span><div><span className="section-kicker">MEASUREMENTS</span><h3>Observation record</h3></div><span className="record-count">{rows.length} TRIALS</span></div>
      <button className="table-export" onClick={onExport}><Download size={13} /> CSV</button>
    </div>
    <div className="table-toggles">
      <label className="switch-label"><Switch.Root className="switch-root" checked={autoCalculate} onCheckedChange={onAutoCalculate}><Switch.Thumb className="switch-thumb" /></Switch.Root><span>Auto-calculation</span></label>
      <label className="switch-label"><Switch.Root className="switch-root" checked={manualMode} onCheckedChange={onManualMode}><Switch.Thumb className="switch-thumb" /></Switch.Root><span><PencilLine size={12} /> Manual student entry</span></label>
      {manualMode && <span className="manual-hint">EDIT CELLS INLINE</span>}
    </div>
    <div className="table-scroll"><table className="observation-table"><thead><tr><th>Trial #</th><th>Tank Vol<br/><small>mL</small></th><th>Time<br/><small>s</small></th><th>Discharge Q<br/><small>cm³/s</small></th><th>Velocity v<br/><small>m/s</small></th><th>Temp<br/><small>°C</small></th><th>Reynolds No.<br/><small>Re</small></th><th>Observed regime</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={8} className="empty-table"><span className="empty-mark">—</span><strong>No observations logged</strong><small>Start the run and capture a reading to begin your record.</small></td></tr> : rows.map((row, index) => <tr key={`${row.trial}-${row.timestamp}-${index}`}>
        <td className="trial-number">{index + 1}</td><td>{numeric(row, index, 'tankVolumeMl', 1)}</td><td>{numeric(row, index, 'timeSec', 1)}</td><td>{numeric(row, index, 'dischargeCm3s', 2)}</td><td>{numeric(row, index, 'velocityMs', 3)}</td><td>{numeric(row, index, 'temperatureC', 1)}</td><td>{numeric(row, index, 'reynolds', 0)}</td><td>{manualMode ? <select className="table-select" value={row.regime} onChange={(e) => { const next = [...rows]; next[index] = { ...row, regime: e.target.value as FlowRegime, manual: true }; onChange(next); }}><option value="LAMINAR">Laminar</option><option value="TRANSITIONAL">Transition</option><option value="TURBULENT">Turbulent</option></select> : <span className={`regime-pill regime-${regimeClass(row.regime)}`}>{row.regime}</span>}</td>
      </tr>)}</tbody></table></div>
    <div className="table-footnote">Q is derived from collected volume / elapsed time; calculated values use the selected shared fluid properties.</div>
  </section>;
}
