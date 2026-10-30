export type ExperimentId = 'reynolds' | 'aerofoil';
export type FluidKind = 'water' | 'air' | 'oil' | 'custom';
export type FlowRegime = 'LAMINAR' | 'TRANSITIONAL' | 'TURBULENT';
export type DyeColor = 'Royal Blue' | 'Crimson Red' | 'Fluorescent Green' | 'Midnight Black';
// Airfoil code as a free string (any 4‑digit NACA code)
export type FoilCode = string;
export type Surface = 'Upper' | 'Lower';

export interface FluidProperties {
  kind: FluidKind;
  label: string;
  temperatureC: number;
  rho: number;
  mu: number;
  nu: number;
  modelNote: string;
}

export interface SharedEnvironment {
  fluid: FluidKind;
  temperatureC: number;
  customRho: number;
  customMu: number;
  ambientPressurePa: number;
  gravity: number;
}

export interface ReynoldsControls {
  valveOpening: number;
  diameterMm: 10 | 16 | 25;
  dyeRateMlMin: number;
  dyeColor: DyeColor;
}

export interface ReynoldsReading {
  trial: number;
  tankVolumeMl: number;
  timeSec: number;
  dischargeCm3s: number;
  velocityMs: number;
  temperatureC: number;
  reynolds: number;
  regime: FlowRegime;
  timestamp: string;
  valveOpeningPct?: number;
  manual?: boolean;
}

export interface AerofoilControls {
  foilCode: FoilCode;
  alphaDeg: number;
  airspeedMs: number;
  manometerAngleDeg: 15 | 30 | 45 | 90;
  manometerFluid: 'Water' | 'Colored Alcohol';
}

export interface SurfacePoint { x: number; y: number }

export interface PressurePoint {
  x: number;
  cp: number;
  velocityRatio: number;
  upperY: number;
  lowerY: number;
}

export interface AerofoilTapReading {
  tap: number;
  surface: Surface;
  x: number;
  heightMm: number;
  deltaPPa: number;
  cpExperimental: number;
  cpTheoretical: number;
  timestamp: string;
  runNo?: number;
  alphaDeg?: number;
  airspeedMs?: number;
  manual?: boolean;
}

export interface AerofoilMetrics {
  dynamicPressurePa: number;
  liftCoefficient: number;
  pressureDragCoefficient: number;
  stallAngleDeg: number;
  stalled: boolean;
  upper: PressurePoint[];
  lower: PressurePoint[];
  taps: AerofoilTapReading[];
  foilUpper: SurfacePoint[];
  foilLower: SurfacePoint[];
}

export type RubricKey = 'setup' | 'procedure' | 'analysis' | 'presentation';
export type RubricScores = Record<RubricKey, number>;
