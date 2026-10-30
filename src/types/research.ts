import type { AerofoilControls, ExperimentId, ReynoldsControls, SharedEnvironment } from './index';

export interface SnapshotMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
}

export interface RunSnapshot {
  id: string;
  label: string;
  experiment: ExperimentId;
  savedAt: string;
  studentName: string;
  registration: string;
  environment: SharedEnvironment;
  reynoldsControls?: ReynoldsControls;
  aerofoilControls?: AerofoilControls;
  metrics: SnapshotMetric[];
  status: string;
  observationCount: number;
}

export type SnapshotDraft = Omit<RunSnapshot, 'id' | 'label' | 'savedAt'>;

export interface SweepPoint {
  x: number;
  y: number;
  secondary: number;
  status: string;
}

export interface ReynoldsUncertaintySettings {
  volumeMl: number;
  timeSec: number;
  diameterMm: number;
  densityPct: number;
  viscosityPct: number;
}

export interface AerofoilUncertaintySettings {
  headMm: number;
  airspeedMs: number;
  densityPct: number;
  manometerDensityPct: number;
  angleDeg: number;
}
