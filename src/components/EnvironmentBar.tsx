import { Beaker, ChevronDown, Gauge, Thermometer } from 'lucide-react';
import type { SharedEnvironment } from '../types';
import { getFluidProperties } from '../lib/fluidProperties';

interface EnvironmentBarProps {
  value: SharedEnvironment;
  onChange: (value: SharedEnvironment) => void;
}

const update = (value: SharedEnvironment, patch: Partial<SharedEnvironment>, onChange: EnvironmentBarProps['onChange']) => onChange({ ...value, ...patch });

export default function EnvironmentBar({ value, onChange }: EnvironmentBarProps) {
  const properties = getFluidProperties(value.fluid, value.temperatureC, value.customRho, value.customMu);
  return (
    <section className="environment-bar" aria-label="Shared fluid environment">
      <div className="environment-heading"><span className="live-dot" /><span>TEST ENVIRONMENT</span><span className="environment-heading-line" /></div>
      <div className="environment-controls">
        <label className="env-field fluid-field">
          <span><Beaker size={13} /> Working fluid</span>
          <div className="select-wrap"><select value={value.fluid} onChange={(event) => update(value, { fluid: event.target.value as SharedEnvironment['fluid'] }, onChange)}>
            <option value="water">Water</option><option value="air">Air</option><option value="oil">SAE 30 Oil</option><option value="custom">Custom fluid</option>
          </select><ChevronDown size={13} /></div>
        </label>
        <div className="temperature-field"><div className="temperature-top"><span><Thermometer size={13} /> Temperature</span><strong>{value.temperatureC}°C</strong></div>
          <input aria-label="Fluid temperature" type="range" min="10" max="60" step="1" value={value.temperatureC} onChange={(event) => update(value, { temperatureC: Number(event.target.value) }, onChange)} />
          <div className="temperature-limits"><span>10°</span><span>60°</span></div>
        </div>
        {value.fluid === 'custom' ? <>
          <label className="env-field compact-field"><span>Density ρ</span><div className="number-wrap"><input type="number" min="0.01" step="0.1" value={value.customRho} onChange={(e) => update(value, { customRho: Number(e.target.value) }, onChange)} /><small>kg/m³</small></div></label>
          <label className="env-field compact-field"><span>Viscosity μ</span><div className="number-wrap"><input type="number" min="0.00000001" step="0.000001" value={value.customMu} onChange={(e) => update(value, { customMu: Number(e.target.value) }, onChange)} /><small>Pa·s</small></div></label>
        </> : <div className="property-pills"><span>ρ <b>{properties.rho.toLocaleString('en-US', { maximumFractionDigits: 3 })}</b></span><span>μ <b>{properties.mu.toExponential(3)}</b></span><span>ν <b>{properties.nu.toExponential(3)}</b></span></div>}
        <label className="env-field compact-field"><span><Gauge size={13} /> Ambient pressure</span><div className="number-wrap"><input type="number" min="1000" step="100" value={value.ambientPressurePa} onChange={(e) => update(value, { ambientPressurePa: Number(e.target.value) }, onChange)} /><small>Pa</small></div></label>
        <label className="env-field gravity-field"><span>Gravity g</span><div className="number-wrap"><input type="number" min="0.1" max="30" step="0.01" value={value.gravity} onChange={(e) => update(value, { gravity: Number(e.target.value) }, onChange)} /><small>m/s²</small></div></label>
      </div>
      <div className="fluid-model-note">{properties.modelNote}</div>
    </section>
  );
}
