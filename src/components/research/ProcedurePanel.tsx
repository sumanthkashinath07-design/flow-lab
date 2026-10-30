import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { ExperimentId } from '../../types';

interface Props { experiment: ExperimentId; }
interface Step { id: string; title: string; detail: string; }

const steps: Record<ExperimentId, Step[]> = {
  reynolds: [
    { id: 'fluid', title: 'Confirm the fluid and pipe', detail: 'Choose the working fluid, temperature, and inner diameter; note the displayed property model.' },
    { id: 'injector', title: 'Establish a fine dye trace', detail: 'Select a tracer color and use a low injection rate before opening the discharge valve.' },
    { id: 'observe', title: 'Move through the regimes', detail: 'Increase valve opening gradually and observe the centerline filament, transition waves, then mixing.' },
    { id: 'record', title: 'Collect and interpret', detail: 'Run the stopwatch, collect a volume, log the point, and compare Re with the 2,000 and 4,000 thresholds.' },
  ],
  aerofoil: [
    { id: 'section', title: 'Set the section and tunnel', detail: 'Choose a NACA profile, tunnel speed, fluid, and manometer configuration.' },
    { id: 'incidence', title: 'Set the incidence', detail: 'Move α through the pre-stall range and allow the modeled pressure field to settle.' },
    { id: 'inspect', title: 'Trace a pressure tap', detail: 'Select a numbered surface tap and compare its manometer head with the Cp curve.' },
    { id: 'capture', title: 'Capture and compare', detail: 'Capture the 16-tap run, then inspect lift, pressure drag, and the modeled stall response.' },
  ],
};

const STORAGE_KEY = 'flowlab-protocol-v1';
function loadProgress(): Record<string, string[]> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, ids]) => [key, Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []]));
  } catch { return {}; }
}

export default function ProcedurePanel({ experiment }: Props) {
  const [progress, setProgress] = useState<Record<string, string[]>>(loadProgress);
  const currentSteps = useMemo(() => steps[experiment], [experiment]);
  const completed = progress[experiment] ?? [];
  const percent = Math.round((completed.length / currentSteps.length) * 100);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* Protocol progress remains usable if storage is full. */ }
  }, [progress]);

  function toggle(id: string) {
    setProgress((current) => {
      const done = current[experiment] ?? [];
      return { ...current, [experiment]: done.includes(id) ? done.filter((item) => item !== id) : [...done, id] };
    });
  }

  function reset() {
    setProgress((current) => ({ ...current, [experiment]: [] }));
  }

  return <div className="research-panel procedure-panel">
    <div className="research-panel-intro"><div><span className="research-eyebrow">FIELD GUIDE · {experiment === 'reynolds' ? 'EXPERIMENT 07' : 'EXPERIMENT 11'}</span><h3>Run protocol</h3><p>Work through the measurement sequence; progress is kept separately for each experiment on this device.</p></div><button type="button" className="research-quiet-action" onClick={reset}><RotateCcw size={14} /> Reset steps</button></div>
    <div className="protocol-progress" aria-label={`${completed.length} of ${currentSteps.length} procedure steps complete`}><div><span>PROGRESS</span><strong>{completed.length} <i>/ {currentSteps.length}</i></strong></div><div className="protocol-progress-track"><span style={{ width: `${percent}%` }} /></div></div>
    <ol className="protocol-list">
      {currentSteps.map((step, index) => {
        const checked = completed.includes(step.id);
        return <li key={step.id} className={checked ? 'protocol-step is-complete' : 'protocol-step'}>
          <button type="button" role="checkbox" aria-checked={checked} aria-label={`${checked ? 'Mark incomplete' : 'Complete'}: ${step.title}`} className="protocol-check" onClick={() => toggle(step.id)}>{checked ? <Check size={14} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</button>
          <div><h4>{step.title}</h4><p>{step.detail}</p></div>
          <span className="protocol-step-status">{checked ? 'DONE' : 'NEXT'}</span>
        </li>;
      })}
    </ol>
    <p className="research-disclaimer">Virtual-lab procedure only; this checklist is not physical equipment safety guidance.</p>
  </div>;
}
