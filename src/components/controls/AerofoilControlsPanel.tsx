import { Gauge, Info, Ruler, Waves } from 'lucide-react';
import type { FoilCode } from '../../types';
import { experiments } from '../../data/experiments';
import RangeControl from './RangeControl';
import { AIRFOILS } from '../../data/airfoils';

interface Props {
  value: AerofoilControls;
  onChange: (next: AerofoilControls) => void;
  selectedTap: number | null;
  onSelectTap: (tap: number) => void;
  onCapture: () => void;
  tapReadings: AerofoilTapReading[];
}

export default function AerofoilControlsPanel({ value, onChange, selectedTap, onSelectTap, onCapture, tapReadings }: Props) {
  const set = (patch: Partial<AerofoilControls>) => onChange({ ...value, ...patch });
  const manometerVisualClipped = tapReadings.some((tap) => Math.abs(tap.heightMm) > 48);
  return (
    <section className="panel-card controls-card">
      <div className="panel-heading"><div><span className="section-kicker">TUNNEL CONTROLS</span><h2>Test conditions</h2></div><span className="panel-index">{String(experiments.aerofoil.syllabusIndex).padStart(2, '0')} / {experiments.aerofoil.syllabusTotal}</span></div>
      <div className="control-grid two-col">
        <label className="field-label"><span><Waves size={13} /> Aerofoil section</span><select value={value.foilCode} onChange={(e) => set({ foilCode: e.target.value as FoilCode })}>{AIRFOILS.map(({code, name}) => (<option key={code} value={code}>{name}</option>))}</select></label>
        <div className="foil-spec"><span>CHORD PROFILE</span><strong>{value.foilCode.slice(0, 2)}<small>.{value.foilCode.slice(2)}</small></strong></div>
      </div>
      <div className="control-block"><RangeControl label="Angle of attack α" value={value.alphaDeg} min={-6} max={22} step={0.5} unit="°" digits={1} onChange={(alphaDeg) => set({ alphaDeg })} hint="Precision pitch pivot · 0.5° increments" /></div>
      <div className="control-block"><RangeControl label="Wind-tunnel airspeed U∞" value={value.airspeedMs} min={5} max={45} step={1} unit="m/s" onChange={(airspeedMs) => set({ airspeedMs })} /></div>
      <div className="control-grid two-col">
        <label className="field-label"><span><Ruler size={13} /> Manometer angle θ</span><select value={value.manometerAngleDeg} onChange={(e) => set({ manometerAngleDeg: Number(e.target.value) as AerofoilControls['manometerAngleDeg'] })}><option value={15}>15° · Inclined</option><option value={30}>30° · Inclined</option><option value={45}>45° · Inclined</option><option value={90}>90° · Vertical</option></select></label>
        <label className="field-label"><span><Gauge size={13} /> Manometer fluid</span><select value={value.manometerFluid} onChange={(e) => set({ manometerFluid: e.target.value as AerofoilControls['manometerFluid'] })}><option>Water</option><option>Colored Alcohol</option></select></label>
      </div>
      {manometerVisualClipped && <div className="assumption-inline"><Info size={13} />Drawn tubes clip at ±48 mm. Tap readouts, observations, and reports retain the full signed head.</div>}
      <div className="tap-inspector">
        <div className="tap-heading"><div><span className="section-kicker">PRESSURE TAPS</span><small>SELECT A TAP TO TRACE Cp</small></div><span className="tap-count">16</span></div>
        <div className="tap-grid" role="group" aria-label="Select aerofoil pressure tap">
          {tapReadings.map((tap) => <button key={tap.tap} className={`tap-chip ${tap.surface === 'Upper' ? 'tap-upper' : 'tap-lower'} ${selectedTap === tap.tap ? 'selected' : ''}`} title={`${tap.surface} surface · x/c ${tap.x}`} onClick={() => onSelectTap(tap.tap)} aria-pressed={selectedTap === tap.tap}>{String(tap.tap).padStart(2, '0')}</button>)}
        </div>
        <button className="button button-log" onClick={onCapture}><Gauge size={15} /> Capture current run</button>
      </div>
    </section>
  );
}
