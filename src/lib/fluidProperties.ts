import type { FluidKind, FluidProperties } from '../types';

export function getFluidProperties(
  kind: FluidKind,
  temperatureC: number,
  customRho = 1000,
  customMu = 0.001,
): FluidProperties {
  const t = Math.min(60, Math.max(10, temperatureC));
  let rho: number;
  let mu: number;
  let label: string;
  let modelNote: string;

  switch (kind) {
    case 'water':
      rho = 1000 - 0.0178 * Math.abs(t - 4) ** 2;
      mu = 1.787e-3 * Math.exp(-0.02661 * t);
      label = 'Water';
      modelNote = 'Approximate water correlations from Expt. 7 specification';
      break;
    case 'air': {
      const tk = t + 273.15;
      const tRef = 293.15;
      rho = 1.225 * tRef / tk;
      const sutherland = 110.4;
      mu = 1.81e-5 * (tk / tRef) ** 1.5 * (tRef + sutherland) / (tk + sutherland);
      label = 'Air';
      modelNote = 'Ideal-gas density at constant pressure; Sutherland viscosity approximation';
      break;
    }
    case 'oil':
      rho = 890 * (1 - 0.0007 * (t - 20));
      mu = 0.29 * Math.exp(-0.035 * (t - 20));
      label = 'SAE 30 Oil';
      modelNote = 'Approximate temperature adjustment from 20 °C reference values';
      break;
    default:
      rho = Math.max(0.01, customRho);
      mu = Math.max(1e-8, customMu);
      label = 'Custom fluid';
      modelNote = 'User-entered rho and mu; properties held constant with temperature';
  }

  return { kind, label, temperatureC: t, rho, mu, nu: mu / rho, modelNote };
}
