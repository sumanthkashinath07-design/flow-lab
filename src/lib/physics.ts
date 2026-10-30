import type {
  AerofoilControls,
  AerofoilMetrics,
  AerofoilTapReading,
  FlowRegime,
  FoilCode,
  FluidProperties,
  PressurePoint,
  SurfacePoint,
} from '../types';

export const TAP_X = [0.025, 0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9] as const;
export const AEROFOIL_CHORD_M = 0.15; // Fixed educational reference chord; Cp and CL use normalized x/c.

export function valveToVelocity(openingPercent: number): number {
  const opening = Math.min(100, Math.max(0, openingPercent)) / 100;
  return 2.2 * opening ** 1.55;
}

export function reynoldsFlow(openingPercent: number, diameterMm: number, fluid: FluidProperties) {
  const diameterM = diameterMm / 1000;
  const velocityMs = valveToVelocity(openingPercent);
  const areaM2 = Math.PI * (diameterM / 2) ** 2;
  const dischargeM3s = velocityMs * areaM2;
  const reynolds = fluid.rho * velocityMs * diameterM / fluid.mu;
  const regime: FlowRegime = reynolds < 2000 ? 'LAMINAR' : reynolds <= 4000 ? 'TRANSITIONAL' : 'TURBULENT';
  return {
    diameterM,
    areaM2,
    predictedDischargeM3s: dischargeM3s,
    predictedDischargeCm3s: dischargeM3s * 1e6,
    velocityMs,
    reynolds,
    regime,
    lowerCriticalVelocity: 2000 * fluid.mu / (fluid.rho * diameterM),
    upperCriticalVelocity: 4000 * fluid.mu / (fluid.rho * diameterM),
  };
}

export function reynoldsFromMeasurement(volumeMl: number, timeSec: number, diameterMm: number, fluid: FluidProperties) {
  const qM3s = timeSec > 0 ? (volumeMl / 1e6) / timeSec : 0;
  const areaM2 = Math.PI * (diameterMm / 2000) ** 2;
  const velocityMs = areaM2 > 0 ? qM3s / areaM2 : 0;
  const reynolds = fluid.rho * velocityMs * (diameterMm / 1000) / fluid.mu;
  const regime: FlowRegime = reynolds < 2000 ? 'LAMINAR' : reynolds <= 4000 ? 'TRANSITIONAL' : 'TURBULENT';
  return { dischargeM3s: qM3s, dischargeCm3s: qM3s * 1e6, velocityMs, reynolds, regime };
}

function nacaParameters(code: FoilCode) {
  const m = Number(code[0]) / 100;
  const p = Number(code[1]) / 10;
  const thickness = Number(code.slice(2)) / 100;
  return { m, p, thickness };
}

export function nacaSurface(code: FoilCode, xValue: number) {
  const x = Math.min(0.999, Math.max(0.001, xValue));
  const { m, p, thickness: t } = nacaParameters(code);
  const yt = 5 * t * (
    0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1015 * x ** 4
  );
  let yc = 0;
  let slope = 0;
  if (m > 0 && p > 0) {
    if (x < p) {
      yc = (m / p ** 2) * (2 * p * x - x ** 2);
      slope = (2 * m / p ** 2) * (p - x);
    } else {
      yc = (m / (1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x ** 2);
      slope = (2 * m / (1 - p) ** 2) * (p - x);
    }
  }
  const theta = Math.atan(slope);
  return {
    upper: { x: x - yt * Math.sin(theta), y: yc + yt * Math.cos(theta) },
    lower: { x: x + yt * Math.sin(theta), y: yc - yt * Math.cos(theta) },
    camber: yc,
    thickness: t,
  };
}

export function nacaOutline(code: FoilCode, count = 64): { upper: SurfacePoint[]; lower: SurfacePoint[] } {
  const upper: SurfacePoint[] = [];
  const lower: SurfacePoint[] = [];
  for (let i = 0; i <= count; i += 1) {
    const theta = (Math.PI * i) / count;
    const x = (1 - Math.cos(theta)) / 2;
    const section = nacaSurface(code, Math.min(0.999, Math.max(0.001, x)));
    upper.push(section.upper);
    lower.push(section.lower);
  }
  return { upper, lower };
}

function zeroLiftAngle(code: FoilCode) {
  if (code === '2412') return -2;
  if (code === '4412') return -4;
  return 0;
}

function stallAngle(code: FoilCode) {
  if (code === '0012') return 14.5;
  if (code === '4412') return 16;
  return 15; // Explicit educational assumption for NACA 2412; not supplied by the syllabus.
}

function cpAt(code: FoilCode, x: number, alphaDeg: number, side: 'upper' | 'lower') {
  const { thickness } = nacaParameters(code);
  const xSafe = Math.min(0.995, Math.max(0.005, x));
  const alphaEffDeg = alphaDeg - zeroLiftAngle(code);
  const stall = stallAngle(code);
  const excess = Math.max(0, alphaDeg - stall);
  const circulationAttenuation = excess > 0 ? Math.max(0.38, 1 - 0.09 * excess) : 1;
  const alphaRad = (alphaEffDeg * Math.PI / 180) * circulationAttenuation;
  const leadingEdgeScale = Math.sqrt((1 - xSafe) / xSafe);
  const thicknessVelocity = 0.025 * (thickness / 0.12) * leadingEdgeScale;
  const circulationVelocity = alphaRad * leadingEdgeScale;
  const velocityRatio = Math.max(0.05, 1 + thicknessVelocity + (side === 'upper' ? circulationVelocity : -circulationVelocity));
  return { cp: 1 - velocityRatio ** 2, velocityRatio };
}

function trapezoid(xs: number[], ys: number[]) {
  let sum = 0;
  for (let i = 1; i < xs.length; i += 1) sum += (xs[i] - xs[i - 1]) * (ys[i] + ys[i - 1]) / 2;
  return sum;
}

function pressureCoefficient(points: PressurePoint[], x: number) {
  const index = points.findIndex((p) => p.x >= x);
  if (index <= 0) return points[0]?.cp ?? 0;
  const a = points[index - 1];
  const b = points[index];
  const f = (x - a.x) / Math.max(1e-9, b.x - a.x);
  return a.cp + f * (b.cp - a.cp);
}

export function calculateAerofoil(
  controls: AerofoilControls,
  fluid: FluidProperties,
  gravity: number,
): AerofoilMetrics {
  const stall = stallAngle(controls.foilCode);
  const xs = Array.from({ length: 193 }, (_, i) => 0.005 + 0.99 * (1 - Math.cos((Math.PI * i) / 192)) / 2);
  const { upper: outlineUpper, lower: outlineLower } = nacaOutline(controls.foilCode, 96);
  const upper: PressurePoint[] = xs.map((x) => {
    const { cp, velocityRatio } = cpAt(controls.foilCode, x, controls.alphaDeg, 'upper');
    return { x, cp, velocityRatio, upperY: nacaSurface(controls.foilCode, x).upper.y, lowerY: nacaSurface(controls.foilCode, x).lower.y };
  });
  const lower: PressurePoint[] = xs.map((x) => {
    const { cp, velocityRatio } = cpAt(controls.foilCode, x, controls.alphaDeg, 'lower');
    return { x, cp, velocityRatio, upperY: nacaSurface(controls.foilCode, x).upper.y, lowerY: nacaSurface(controls.foilCode, x).lower.y };
  });

  const qInf = 0.5 * fluid.rho * controls.airspeedMs ** 2;
  const liftIntegrand = xs.map((_, i) => lower[i].cp - upper[i].cp);
  const liftCoefficient = trapezoid(xs, liftIntegrand);
  let signedPressureIntegral = 0;
  for (let i = 1; i < xs.length; i += 1) {
    const dx = xs[i] - xs[i - 1];
    const upperSlope = (upper[i].upperY - upper[i - 1].upperY) / dx;
    const lowerSlope = (lower[i].lowerY - lower[i - 1].lowerY) / dx;
    const upperMean = (upper[i].cp + upper[i - 1].cp) / 2;
    const lowerMean = (lower[i].cp + lower[i - 1].cp) / 2;
    signedPressureIntegral += (upperMean * upperSlope - lowerMean * lowerSlope) * dx;
  }
  // Report a positive chord-normalized pressure-force magnitude; viscous skin-friction drag is not modeled.
  const pressureDragCoefficient = Math.abs(signedPressureIntegral);

  const manometerDensity = controls.manometerFluid === 'Water' ? 1000 : 789;
  const sine = Math.max(0.05, Math.sin(controls.manometerAngleDeg * Math.PI / 180));
  const taps: AerofoilTapReading[] = [];
  TAP_X.forEach((x, index) => {
    for (const side of ['Upper', 'Lower'] as const) {
      const curve = side === 'Upper' ? upper : lower;
      const cp = pressureCoefficient(curve, x);
      const deltaPTheory = cp * qInf;
      const theoreticalHeadMm = deltaPTheory / (manometerDensity * gravity * sine) * 1000;
      const measuredHeadMm = Math.round(theoreticalHeadMm * 10) / 10;
      const measuredDeltaP = (measuredHeadMm / 1000) * manometerDensity * gravity * sine;
      const cpExperimental = qInf > 0 ? measuredDeltaP / qInf : 0;
      taps.push({
        tap: side === 'Upper' ? index + 1 : index + 9,
        surface: side,
        x,
        heightMm: measuredHeadMm,
        deltaPPa: measuredDeltaP,
        cpExperimental,
        cpTheoretical: cp,
        timestamp: new Date().toISOString(),
      });
    }
  });
  taps.sort((a, b) => a.tap - b.tap);

  return {
    dynamicPressurePa: qInf,
    liftCoefficient,
    pressureDragCoefficient,
    stallAngleDeg: stall,
    stalled: controls.alphaDeg >= stall,
    upper,
    lower,
    taps,
    foilUpper: outlineUpper,
    foilLower: outlineLower,
  };
}

export function closestTap(taps: AerofoilTapReading[], tap: number) {
  return taps.find((item) => item.tap === tap) ?? taps[0];
}
