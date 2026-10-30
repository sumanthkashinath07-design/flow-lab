import type { AerofoilControls, AerofoilTapReading, FluidProperties } from '../types';
import type { AerofoilUncertaintySettings, ReynoldsUncertaintySettings } from '../types/research';

export const DEFAULT_REYNOLDS_UNCERTAINTY: ReynoldsUncertaintySettings = {
  volumeMl: 1,
  timeSec: 0.1,
  diameterMm: 0.1,
  densityPct: 0.5,
  viscosityPct: 1,
};

export const DEFAULT_AEROFOIL_UNCERTAINTY: AerofoilUncertaintySettings = {
  headMm: 0.1,
  airspeedMs: 0.1,
  densityPct: 0.5,
  manometerDensityPct: 0.5,
  angleDeg: 0.5,
};

export interface ReynoldsUncertaintyBasis {
  reynolds: number;
  volumeMl: number;
  timeSec: number;
  diameterMm: number;
  density: number;
  viscosity: number;
}

export interface PropagatedValue {
  standardUncertainty: number;
  relativePercent: number;
}

export function calculateReynoldsUncertainty(
  basis: ReynoldsUncertaintyBasis,
  settings: ReynoldsUncertaintySettings,
): PropagatedValue | null {
  if (!(basis.volumeMl > 0 && basis.timeSec > 0 && basis.diameterMm > 0 && basis.density > 0 && basis.viscosity > 0)) return null;
  const relative = Math.hypot(
    settings.volumeMl / basis.volumeMl,
    settings.timeSec / basis.timeSec,
    settings.diameterMm / basis.diameterMm,
    settings.densityPct / 100,
    settings.viscosityPct / 100,
  );
  return { standardUncertainty: Math.abs(basis.reynolds) * relative, relativePercent: relative * 100 };
}

export interface AerofoilUncertaintyResult {
  selectedTap: number;
  selectedCp: number;
  selectedCpUncertainty: number;
  liftUncertainty: number;
}

export function calculateAerofoilUncertainty(
  taps: AerofoilTapReading[],
  selectedTap: number | null,
  controls: AerofoilControls,
  fluid: FluidProperties,
  gravity: number,
  settings: AerofoilUncertaintySettings,
): AerofoilUncertaintyResult {
  const qInf = 0.5 * fluid.rho * controls.airspeedMs ** 2;
  const theta = controls.manometerAngleDeg * Math.PI / 180;
  const manometerDensity = controls.manometerFluid === 'Water' ? 1000 : 789;
  const uTheta = settings.angleDeg * Math.PI / 180;
  const commonRelative = Math.hypot(
    settings.densityPct / 100,
    settings.manometerDensityPct / 100,
    2 * settings.airspeedMs / Math.max(controls.airspeedMs, 1e-9),
    uTheta / Math.max(Math.tan(theta), 1e-9),
  );

  const sigmaForTap = (tap: AerofoilTapReading) => {
    if (!(qInf > 0 && gravity > 0)) return 0;
    const headGain = manometerDensity * gravity * Math.sin(theta) / qInf;
    const headTerm = Math.abs(headGain) * settings.headMm / 1000;
    const modeledTerm = Math.abs(tap.cpExperimental) * commonRelative;
    return Math.hypot(headTerm, modeledTerm);
  };

  const selected = taps.find((tap) => tap.tap === selectedTap) ?? taps[0];
  const upper = taps.filter((tap) => tap.surface === 'Upper').sort((a, b) => a.x - b.x);
  const lower = taps.filter((tap) => tap.surface === 'Lower').sort((a, b) => a.x - b.x);
  let liftVariance = 0;
  if (upper.length === lower.length && upper.length >= 2) {
    for (let i = 0; i < upper.length; i += 1) {
      const left = i === 0 ? 0 : (upper[i].x - upper[i - 1].x) / 2;
      const right = i === upper.length - 1 ? 0 : (upper[i + 1].x - upper[i].x) / 2;
      const weight = left + right;
      liftVariance += weight ** 2 * (sigmaForTap(upper[i]) ** 2 + sigmaForTap(lower[i]) ** 2);
    }
  }
  return {
    selectedTap: selected?.tap ?? 1,
    selectedCp: selected?.cpExperimental ?? 0,
    selectedCpUncertainty: selected ? sigmaForTap(selected) : 0,
    liftUncertainty: Math.sqrt(liftVariance),
  };
}
