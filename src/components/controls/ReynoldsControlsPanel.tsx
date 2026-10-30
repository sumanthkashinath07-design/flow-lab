import { Beaker, CircleStop, Droplets, Play, RotateCcw, Timer, Waves } from 'lucide-react';
import type { DyeColor, ReynoldsControls } from '../../types';
import { experiments } from '../../data/experiments';
import RangeControl from './RangeControl';

interface Props {
  value: ReynoldsControls;
  onChange: (next: ReynoldsControls) => void;
  running: boolean;
  elapsedSec: number;
  tankVolumeMl: number;
  onToggleRun: () => void;
  onEmpty: () => void;
  onLog: () => void;
}

function clock(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function ReynoldsControlsPanel({ value, onChange, running, elapsedSec, tankVolumeMl, onToggleRun, onEmpty, onLog }: Props) {
  const set = (patch: Partial<ReynoldsControls>) => onChange({ ...value, ...patch });
  return (
    <section className="panel-card controls-card">
      <div className="panel-heading"><div><span className="section-kicker">HARDWARE CONTROLS</span><h2>Test conditions</h2></div><span className="panel-index">{String(experiments.reynolds.syllabusIndex).padStart(2, '0')} / {experiments.reynolds.syllabusTotal}</span></div>
      <div className="control-block"><RangeControl label="Discharge control valve" value={value.valveOpening} min={0} max={100} step={0.5} unit="%" digits={1} onChange={(valveOpening) => set({ valveOpening })} hint="Opening sets the nominal mean flow velocity" /></div>
      <div className="control-grid two-col">
        <label className="field-label"><span><Waves size={13} /> Pipe inner diameter D</span><select value={value.diameterMm} onChange={(e) => set({ diameterMm: Number(e.target.value) as ReynoldsControls['diameterMm'] })}><option value={10}>10 mm</option><option value={16}>16 mm</option><option value={25}>25 mm</option></select></label>
        <div className="select-decoration"><span>TEST SECTION</span><strong>{(1000).toLocaleString()} <small>mm length</small></strong></div>
      </div>
      <div className="control-block"><RangeControl label="Dye needle valve" value={value.dyeRateMlMin} min={0} max={5} step={0.1} unit="mL/min" digits={1} onChange={(dyeRateMlMin) => set({ dyeRateMlMin })} /></div>
      <div className="control-grid two-col">
        <label className="field-label"><span><Droplets size={13} /> Dye tracer color</span><select value={value.dyeColor} onChange={(e) => set({ dyeColor: e.target.value as DyeColor })}><option>Royal Blue</option><option>Crimson Red</option><option>Fluorescent Green</option><option>Midnight Black</option></select></label>
        <div className="dye-swatch-row"><span className={`dye-swatch dye-${value.dyeColor.toLowerCase().replaceAll(' ', '-')}`} /> <small>INJECTOR READY</small></div>
      </div>
      <div className="tank-card">
        <div className="tank-title"><span><Beaker size={14} /> VOLUMETRIC COLLECTION</span><span className={`run-status ${running ? 'is-running' : ''}`}><i />{running ? 'RUNNING' : 'STANDBY'}</span></div>
        <div className="tank-readouts"><div><small>STOPWATCH</small><strong>{clock(elapsedSec)}</strong></div><div><small>COLLECTED VOLUME</small><strong>{tankVolumeMl.toFixed(1)}<em>mL</em></strong></div></div>
        <div className="tank-window"><div className="tank-waterline" style={{ height: `${Math.min(94, 5 + tankVolumeMl / 6)}%` }} /></div>
        <div className="tank-actions"><button className={`button ${running ? 'button-stop' : 'button-primary'}`} onClick={onToggleRun}>{running ? <><CircleStop size={15} /> Stop run</> : <><Play size={15} fill="currentColor" /> Start run</>}</button><button className="button button-quiet" onClick={onEmpty}><RotateCcw size={14} /> Empty tank</button></div>
        <button className="button button-log" onClick={onLog}><Timer size={15} /> Log data point</button>
      </div>
    </section>
  );
}
