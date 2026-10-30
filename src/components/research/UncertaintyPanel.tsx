import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import type { AerofoilControls, AerofoilTapReading, ExperimentId, FluidProperties, ReynoldsControls, ReynoldsReading } from '../../types';
import type { AerofoilUncertaintySettings, ReynoldsUncertaintySettings } from '../../types/research';
import { reynoldsFromMeasurement } from '../../lib/physics';
import { calculateAerofoilUncertainty, calculateReynoldsUncertainty, DEFAULT_AEROFOIL_UNCERTAINTY, DEFAULT_REYNOLDS_UNCERTAINTY } from '../../utils/uncertainty';

interface Props {
  experiment: ExperimentId;
  fluid: FluidProperties;
  gravity: number;
  reynoldsControls: ReynoldsControls;
  aerofoilControls: AerofoilControls;
  currentRe: number;
  currentDischargeCm3s: number;
  measuredVolumeMl: number;
  measuredTimeSec: number;
  reynoldsRows: ReynoldsReading[];
  aerofoilTaps: AerofoilTapReading[];
  selectedTap: number | null;
}
interface CalibrationState { reynolds: ReynoldsUncertaintySettings; aerofoil: AerofoilUncertaintySettings; }
const STORAGE_KEY = 'flowlab-uncertainty-settings-v1';
const defaultState: CalibrationState = { reynolds: DEFAULT_REYNOLDS_UNCERTAINTY, aerofoil: DEFAULT_AEROFOIL_UNCERTAINTY };

function storedNumber(source: Record<string, unknown>, key: string, fallback: number, maximum: number) {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum ? value : fallback;
}

function readSettings(): CalibrationState {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null) return defaultState;
    const data = saved as Record<string, unknown>;
    const reynolds = typeof data.reynolds === 'object' && data.reynolds !== null ? data.reynolds as Record<string, unknown> : {};
    const aerofoil = typeof data.aerofoil === 'object' && data.aerofoil !== null ? data.aerofoil as Record<string, unknown> : {};
    return {
      reynolds: {
        volumeMl: storedNumber(reynolds, 'volumeMl', DEFAULT_REYNOLDS_UNCERTAINTY.volumeMl, 1000),
        timeSec: storedNumber(reynolds, 'timeSec', DEFAULT_REYNOLDS_UNCERTAINTY.timeSec, 60),
        diameterMm: storedNumber(reynolds, 'diameterMm', DEFAULT_REYNOLDS_UNCERTAINTY.diameterMm, 100),
        densityPct: storedNumber(reynolds, 'densityPct', DEFAULT_REYNOLDS_UNCERTAINTY.densityPct, 100),
        viscosityPct: storedNumber(reynolds, 'viscosityPct', DEFAULT_REYNOLDS_UNCERTAINTY.viscosityPct, 100),
      },
      aerofoil: {
        headMm: storedNumber(aerofoil, 'headMm', DEFAULT_AEROFOIL_UNCERTAINTY.headMm, 500),
        airspeedMs: storedNumber(aerofoil, 'airspeedMs', DEFAULT_AEROFOIL_UNCERTAINTY.airspeedMs, 50),
        densityPct: storedNumber(aerofoil, 'densityPct', DEFAULT_AEROFOIL_UNCERTAINTY.densityPct, 100),
        manometerDensityPct: storedNumber(aerofoil, 'manometerDensityPct', DEFAULT_AEROFOIL_UNCERTAINTY.manometerDensityPct, 100),
        angleDeg: storedNumber(aerofoil, 'angleDeg', DEFAULT_AEROFOIL_UNCERTAINTY.angleDeg, 30),
      },
    };
  } catch { return defaultState; }
}

function NumberField({ label, value, unit, step, min = 0, onChange }: { label: string; value: number; unit: string; step: number; min?: number; onChange: (value: number) => void }) {
  return <label className="research-number-field"><span>{label}</span><div><input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))} /><em>{unit}</em></div></label>;
}

export default function UncertaintyPanel(props: Props) {
  const [settings, setSettings] = useState<CalibrationState>(readSettings);
  const isReynolds = props.experiment === 'reynolds';
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* The live estimate does not depend on persistence. */ } }, [settings]);

  const reynoldsBasis = useMemo(() => {
    if (props.measuredVolumeMl > 0 && props.measuredTimeSec > 0) {
      const measured = reynoldsFromMeasurement(props.measuredVolumeMl, props.measuredTimeSec, props.reynoldsControls.diameterMm, props.fluid);
      return { basis: 'Active collection', volumeMl: props.measuredVolumeMl, timeSec: props.measuredTimeSec, reynolds: measured.reynolds };
    }
    const latest = [...props.reynoldsRows].reverse().find((row) => row.tankVolumeMl > 0 && row.timeSec > 0);
    if (latest) return { basis: `Latest logged trial #${latest.trial}`, volumeMl: latest.tankVolumeMl, timeSec: latest.timeSec, reynolds: latest.reynolds };
    const volumeMl = 100;
    const timeSec = props.currentDischargeCm3s > 0 ? volumeMl / props.currentDischargeCm3s : 1;
    return { basis: 'Illustrative 100 mL basis at modeled discharge', volumeMl, timeSec, reynolds: props.currentRe };
  }, [props.measuredVolumeMl, props.measuredTimeSec, props.reynoldsControls.diameterMm, props.fluid, props.reynoldsRows, props.currentDischargeCm3s, props.currentRe]);

  const reResult = useMemo(() => calculateReynoldsUncertainty({
    reynolds: reynoldsBasis.reynolds,
    volumeMl: reynoldsBasis.volumeMl,
    timeSec: reynoldsBasis.timeSec,
    diameterMm: props.reynoldsControls.diameterMm,
    density: props.fluid.rho,
    viscosity: props.fluid.mu,
  }, settings.reynolds), [reynoldsBasis, props.reynoldsControls.diameterMm, props.fluid, settings.reynolds]);

  const aeroResult = useMemo(() => calculateAerofoilUncertainty(props.aerofoilTaps, props.selectedTap, props.aerofoilControls, props.fluid, props.gravity, settings.aerofoil),
    [props.aerofoilTaps, props.selectedTap, props.aerofoilControls, props.fluid, props.gravity, settings.aerofoil]);

  function updateRe(key: keyof ReynoldsUncertaintySettings, value: number) {
    setSettings((current) => ({ ...current, reynolds: { ...current.reynolds, [key]: value } }));
  }
  function updateAero(key: keyof AerofoilUncertaintySettings, value: number) {
    setSettings((current) => ({ ...current, aerofoil: { ...current.aerofoil, [key]: value } }));
  }

  return <div className="research-panel uncertainty-panel">
    <div className="research-panel-intro"><div><span className="research-eyebrow">MEASUREMENT QUALITY</span><h3>Uncertainty explorer</h3><p>Propagate editable one-standard-uncertainty assumptions with a first-order root-sum-square estimate.</p></div><span className="research-context-chip">EDUCATIONAL ESTIMATE</span></div>
    {isReynolds ? <>
      <div className="uncertainty-fields">
        <NumberField label="Volume σV" value={settings.reynolds.volumeMl} unit="mL" step={0.1} onChange={(value) => updateRe('volumeMl', value)} />
        <NumberField label="Time σt" value={settings.reynolds.timeSec} unit="s" step={0.01} onChange={(value) => updateRe('timeSec', value)} />
        <NumberField label="Diameter σD" value={settings.reynolds.diameterMm} unit="mm" step={0.01} onChange={(value) => updateRe('diameterMm', value)} />
        <NumberField label="Density σρ" value={settings.reynolds.densityPct} unit="%" step={0.1} onChange={(value) => updateRe('densityPct', value)} />
        <NumberField label="Viscosity σμ" value={settings.reynolds.viscosityPct} unit="%" step={0.1} onChange={(value) => updateRe('viscosityPct', value)} />
      </div>
      <div className="uncertainty-result-grid">
        <div className="uncertainty-result-primary"><span>REYNOLDS NUMBER</span><strong>{reynoldsBasis.reynolds.toFixed(0)} <i>± {reResult?.standardUncertainty.toFixed(0) ?? '—'}</i></strong><small>{reResult?.relativePercent.toFixed(2) ?? '—'}% combined standard uncertainty</small></div>
        <div className="uncertainty-result-secondary"><span>ESTIMATE BASIS</span><strong>{reynoldsBasis.basis}</strong><small>Re = 4ρV / (πDtμ); independent terms combined by RSS.</small></div>
      </div>
      {reynoldsBasis.basis.startsWith('Illustrative') && <p className="research-feedback is-warning" role="note">No collection or logged trial is available; the 100 mL basis is illustrative, not a measured result.</p>}
    </> : <>
      <div className="uncertainty-fields">
        <NumberField label="Tap head σh" value={settings.aerofoil.headMm} unit="mm" step={0.01} onChange={(value) => updateAero('headMm', value)} />
        <NumberField label="Tunnel speed σU∞" value={settings.aerofoil.airspeedMs} unit="m/s" step={0.01} onChange={(value) => updateAero('airspeedMs', value)} />
        <NumberField label="Air density σρ" value={settings.aerofoil.densityPct} unit="%" step={0.1} onChange={(value) => updateAero('densityPct', value)} />
        <NumberField label="Manometer density σρm" value={settings.aerofoil.manometerDensityPct} unit="%" step={0.1} onChange={(value) => updateAero('manometerDensityPct', value)} />
        <NumberField label="Manometer angle σθ" value={settings.aerofoil.angleDeg} unit="°" step={0.1} onChange={(value) => updateAero('angleDeg', value)} />
      </div>
      <div className="uncertainty-result-grid">
        <div className="uncertainty-result-primary"><span>SELECTED TAP {String(aeroResult.selectedTap).padStart(2, '0')} · Cp EXP.</span><strong>{aeroResult.selectedCp.toFixed(3)} <i>± {aeroResult.selectedCpUncertainty.toFixed(3)}</i></strong><small>One-standard-uncertainty estimate</small></div>
        <div className="uncertainty-result-secondary"><span>TAP-INTEGRATED LIFT</span><strong>σCL ≈ {aeroResult.liftUncertainty.toFixed(4)}</strong><small>Tap-spacing weighted trapezoidal RSS; q∞ uses the selected fluid density.</small></div>
      </div>
    </>}
    <p className="research-disclaimer"><Info size={13} />Assumptions are editable and persist on this device. RSS treats input uncertainties as independent standard uncertainties; it is not an instrument calibration certificate or exact model uncertainty.</p>
  </div>;
}
