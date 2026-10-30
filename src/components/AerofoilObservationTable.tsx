import { Download, PencilLine, Table2 } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import type { AerofoilTapReading } from '../types';

interface Props {
  rows: AerofoilTapReading[];
  onChange: (rows: AerofoilTapReading[]) => void;
  manualMode: boolean;
  onManualMode: (value: boolean) => void;
  onExport: () => void;
  onSelectTap: (tap: number) => void;
  selectedTap: number | null;
}

export default function AerofoilObservationTable({ rows, onChange, manualMode, onManualMode, onExport, onSelectTap, selectedTap }: Props) {
  const update = (index: number, key: keyof AerofoilTapReading, value: string) => {
    const next = [...rows]; next[index] = { ...next[index], [key]: Number(value), manual: true }; onChange(next);
  };
  const numberCell = (row: AerofoilTapReading, index: number, key: keyof AerofoilTapReading, digits: number) => manualMode
    ? <input aria-label={`Tap ${row.tap} ${String(key)}`} className="table-input" type="number" step="any" value={Number(row[key])} onChange={(e) => update(index, key, e.target.value)} />
    : Number(row[key]).toFixed(digits);
  return <section className="panel-card observations-card aero-observations">
    <div className="table-heading"><div className="plot-heading-title"><span className="plot-icon"><Table2 size={14} /></span><div><span className="section-kicker">16 PRESSURE TAPS</span><h3>Observation record</h3></div><span className="record-count">{rows.length} READINGS</span></div><button className="table-export" onClick={onExport}><Download size={13} /> CSV</button></div>
    <div className="table-toggles"><label className="switch-label"><Switch.Root className="switch-root" checked={manualMode} onCheckedChange={onManualMode}><Switch.Thumb className="switch-thumb" /></Switch.Root><span><PencilLine size={12} /> Manual student entry</span></label>{manualMode && <span className="manual-hint">EDIT CELLS INLINE</span>}<span className="table-instruction">Capture Current Run logs all 16 taps.</span></div>
    <div className="table-scroll"><table className="observation-table aero-table"><thead><tr><th>Tap #</th><th>Surface</th><th>x/c</th><th>Manometer height h<br/><small>mm</small></th><th>ΔP<br/><small>Pa</small></th><th>Cp<br/><small>Experimental</small></th><th>Cp<br/><small>Theoretical</small></th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={7} className="empty-table"><span className="empty-mark">—</span><strong>No tap readings captured</strong><small>Set test conditions and capture a 16-tap run.</small></td></tr> : rows.map((row, index) => <tr key={`${row.runNo ?? 0}-${row.tap}-${index}`} className={selectedTap === row.tap ? 'selected-row' : ''} onClick={() => onSelectTap(row.tap)}>
        <td className="trial-number"><button className={`tap-row-button ${row.surface === 'Upper' ? 'tap-upper' : 'tap-lower'}`} onClick={(e) => { e.stopPropagation(); onSelectTap(row.tap); }}>{String(row.tap).padStart(2, '0')}</button></td><td><span className={`surface-label ${row.surface === 'Upper' ? 'surface-upper' : 'surface-lower'}`}>{row.surface}</span></td><td>{numberCell(row, index, 'x', 3)}</td><td>{numberCell(row, index, 'heightMm', 2)}</td><td>{numberCell(row, index, 'deltaPPa', 2)}</td><td>{numberCell(row, index, 'cpExperimental', 3)}</td><td>{numberCell(row, index, 'cpTheoretical', 3)}</td>
      </tr>)}</tbody></table></div>
    <div className="table-footnote">Manometer h is signed relative to P∞ and read to 0.1 mm; experimental Cp is hydrostatic head / q∞, while theoretical Cp is from the vortex-sheet approximation. Run alpha and U∞ are retained in CSV and report metadata.</div>
  </section>;
}
