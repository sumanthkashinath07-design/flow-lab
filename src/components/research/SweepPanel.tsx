import { useEffect, useMemo, useState } from 'react';
import { Download, Play } from 'lucide-react';
import type { AerofoilControls, ExperimentId, FluidProperties, ReynoldsControls } from '../../types';
import type { SweepPoint } from '../../types/research';
import { calculateAerofoil, reynoldsFlow } from '../../lib/physics';
import { exportSweepCsv } from '../../utils/csv';
import SweepChart from './SweepChart';

interface Props {
  experiment: ExperimentId;
  fluid: FluidProperties;
  gravity: number;
  reynoldsControls: ReynoldsControls;
  aerofoilControls: AerofoilControls;
}
interface Range { start: number; end: number; step: number; }

export default function SweepPanel({ experiment, fluid, gravity, reynoldsControls, aerofoilControls }: Props) {
  const [range, setRange] = useState<Range>({ start: 0, end: 100, step: 10 });
  const [points, setPoints] = useState<SweepPoint[]>([]);
  const [computedFor, setComputedFor] = useState('');
  const [message, setMessage] = useState('');
  const isReynolds = experiment === 'reynolds';
  const signature = useMemo(() => isReynolds
    ? `${experiment}|${fluid.kind}|${fluid.rho}|${fluid.mu}|${reynoldsControls.diameterMm}`
    : `${experiment}|${fluid.kind}|${fluid.rho}|${fluid.mu}|${gravity}|${aerofoilControls.foilCode}|${aerofoilControls.airspeedMs}|${aerofoilControls.manometerAngleDeg}|${aerofoilControls.manometerFluid}`,
  [experiment, fluid, gravity, reynoldsControls.diameterMm, aerofoilControls]);
  const stale = points.length > 0 && computedFor !== signature;

  useEffect(() => {
    setRange(isReynolds ? { start: 0, end: 100, step: 10 } : { start: -6, end: 22, step: 1 });
    setPoints([]); setComputedFor(''); setMessage('');
  }, [experiment, isReynolds]);

  function update(key: keyof Range, value: string) {
    setRange((current) => ({ ...current, [key]: value === '' ? Number.NaN : Number(value) }));
  }

  function runSweep() {
    const min = isReynolds ? 0 : -6; const max = isReynolds ? 100 : 22;
    if (![range.start, range.end, range.step].every(Number.isFinite) || range.start < min || range.end > max || range.start > range.end || range.step < 0.5) {
      setMessage(`Enter a valid range from ${min} to ${max} with a step of at least 0.5.`); return;
    }
    const regularCount = Math.floor((range.end - range.start) / range.step + 1e-9) + 1;
    const lastRegular = range.start + (regularCount - 1) * range.step;
    const appendEnd = Math.abs(lastRegular - range.end) > 1e-7;
    const count = regularCount + (appendEnd ? 1 : 0);
    if (count > 150) { setMessage('Limit each sweep to 150 calculated points or fewer. Increase the step size.'); return; }
    const values = Array.from({ length: regularCount }, (_, index) => Number((range.start + index * range.step).toFixed(4)));
    if (appendEnd) values.push(range.end);

    const next = values.map((value): SweepPoint => {
      if (isReynolds) {
        const flow = reynoldsFlow(value, reynoldsControls.diameterMm, fluid);
        return { x: value, y: flow.reynolds, secondary: flow.predictedDischargeCm3s, status: flow.regime };
      }
      const model = calculateAerofoil({ ...aerofoilControls, alphaDeg: value }, fluid, gravity);
      return { x: value, y: model.liftCoefficient, secondary: model.pressureDragCoefficient, status: model.stalled ? 'STALL' : 'ATTACHED' };
    });
    setPoints(next); setComputedFor(signature);
    setMessage(`${next.length} model points calculated.${appendEnd ? ' The requested end point was included.' : ''}`);
  }

  const parameterLabel = isReynolds ? 'Valve opening (%)' : 'Angle of attack α (°)';
  const outputLabel = isReynolds ? 'Reynolds number' : 'Lift coefficient CL';
  const subtitle = isReynolds
    ? `Selected fluid · ${reynoldsControls.diameterMm} mm pipe · ${fluid.label} at ${fluid.temperatureC} °C`
    : `NACA ${aerofoilControls.foilCode} · ${aerofoilControls.airspeedMs.toFixed(1)} m/s · ${fluid.label} at ${fluid.temperatureC} °C`;

  return <div className="research-panel sweep-panel">
    <div className="research-panel-intro"><div><span className="research-eyebrow">MODEL-DRIVEN ANALYSIS</span><h3>Sweep studio</h3><p>Calculate a controlled series from the same engineering model used by the live rig.</p></div><span className="research-context-chip">{subtitle}</span></div>
    <div className="sweep-toolbar">
      <label className="research-number-field"><span>START</span><input aria-label="Sweep start" type="number" min={isReynolds ? 0 : -6} max={isReynolds ? 100 : 22} step={0.5} value={Number.isFinite(range.start) ? range.start : ''} onChange={(event) => update('start', event.target.value)} /></label>
      <label className="research-number-field"><span>END</span><input aria-label="Sweep end" type="number" min={isReynolds ? 0 : -6} max={isReynolds ? 100 : 22} step={0.5} value={Number.isFinite(range.end) ? range.end : ''} onChange={(event) => update('end', event.target.value)} /></label>
      <label className="research-number-field"><span>STEP</span><input aria-label="Sweep step" type="number" min={0.5} step={0.5} value={Number.isFinite(range.step) ? range.step : ''} onChange={(event) => update('step', event.target.value)} /></label>
      <button type="button" className="button button-primary sweep-run-button" onClick={runSweep}><Play size={14} fill="currentColor" /> Calculate sweep</button>
      <button type="button" className="button button-quiet sweep-export-button" onClick={() => exportSweepCsv(experiment, isReynolds ? 'valve-opening' : 'angle-of-attack', points)} disabled={!points.length}><Download size={14} /> Export CSV</button>
    </div>
    <div className="sweep-meta-line"><span>{parameterLabel} · {outputLabel}</span><span>≤150 points · no data is added to observations</span></div>
    {message && <p className={message.startsWith('Enter') || message.startsWith('Limit') ? 'research-feedback is-error' : 'research-feedback'} role="status">{message}</p>}
    {stale && <p className="research-feedback is-warning" role="status">Test conditions changed after this sweep. Recalculate to refresh the curve.</p>}
    <div className="sweep-chart-frame"><SweepChart points={points} xLabel={parameterLabel} yLabel={outputLabel} regimeBands={isReynolds} /></div>
    {points.length > 0 && <div className="research-table-wrap"><table className="research-table"><thead><tr>{isReynolds ? <><th>Valve %</th><th>Q · cm³/s</th><th>Velocity · m/s</th><th>Re</th><th>Regime</th></> : <><th>α · °</th><th>CL</th><th>CDp</th><th>Condition</th></>}</tr></thead><tbody>{points.map((point, index) => <tr key={`${point.x}-${index}`}><td>{point.x.toFixed(isReynolds ? 1 : 1)}</td>{isReynolds ? <><td>{point.secondary.toFixed(3)}</td><td>{reynoldsFlow(point.x, reynoldsControls.diameterMm, fluid).velocityMs.toFixed(4)}</td><td>{point.y.toFixed(0)}</td><td><span className={`research-state-pill ${point.status.toLowerCase()}`}>{point.status}</span></td></> : <><td>{point.y.toFixed(4)}</td><td>{point.secondary.toFixed(4)}</td><td><span className={`research-state-pill ${point.status.toLowerCase()}`}>{point.status}</span></td></>}</tr>)}</tbody></table></div>}
  </div>;
}
