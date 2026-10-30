import type { ExperimentId } from '../types';
import type { RunSnapshot, SnapshotMetric } from '../types/research';

const NOTEBOOK_KEY = 'flowlab-run-notebook-v1';
export const NOTEBOOK_FORMAT = 'flowlab-run-notebook';
export const MAX_NOTEBOOK_RUNS = 100;
export const MAX_NOTEBOOK_BYTES = 1_048_576;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, min = -Infinity, max = Infinity): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isExperiment(value: unknown): value is ExperimentId {
  return value === 'reynolds' || value === 'aerofoil';
}

function isMetric(value: unknown): value is SnapshotMetric {
  return isObject(value) && typeof value.key === 'string' && value.key.length <= 48
    && typeof value.label === 'string' && value.label.length <= 64
    && finite(value.value) && typeof value.unit === 'string' && value.unit.length <= 24;
}

export function isRunSnapshot(value: unknown): value is RunSnapshot {
  if (!isObject(value) || typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 100
    || typeof value.label !== 'string' || value.label.trim().length < 1 || value.label.length > 100
    || !isExperiment(value.experiment) || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))
    || typeof value.studentName !== 'string' || value.studentName.length > 120
    || typeof value.registration !== 'string' || value.registration.length > 80
    || typeof value.status !== 'string' || value.status.length > 32
    || !finite(value.observationCount, 0, 100_000) || !Number.isInteger(value.observationCount)
    || !Array.isArray(value.metrics) || value.metrics.length > 16 || !value.metrics.every(isMetric)
    || !isObject(value.environment)) return false;

  const environment = value.environment;
  const validEnvironment = ['water', 'air', 'oil', 'custom'].includes(String(environment.fluid))
    && finite(environment.temperatureC, 10, 60)
    && finite(environment.customRho, 0.000001)
    && finite(environment.customMu, 0.000000001)
    && finite(environment.ambientPressurePa, 0.000001)
    && finite(environment.gravity, 0.000001);
  if (!validEnvironment) return false;

  if (value.experiment === 'reynolds') {
    const controls = value.reynoldsControls;
    return isObject(controls) && finite(controls.valveOpening, 0, 100)
      && [10, 16, 25].includes(Number(controls.diameterMm))
      && finite(controls.dyeRateMlMin, 0, 5)
      && ['Royal Blue', 'Crimson Red', 'Fluorescent Green', 'Midnight Black'].includes(String(controls.dyeColor));
  }

  const controls = value.aerofoilControls;
  return isObject(controls) && ['0012', '2412', '4412'].includes(String(controls.foilCode))
    && finite(controls.alphaDeg, -6, 22) && finite(controls.airspeedMs, 5, 45)
    && [15, 30, 45, 90].includes(Number(controls.manometerAngleDeg))
    && ['Water', 'Colored Alcohol'].includes(String(controls.manometerFluid));
}

export function createRunId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readNotebook(): RunSnapshot[] {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRunSnapshot).slice(0, MAX_NOTEBOOK_RUNS);
  } catch {
    return [];
  }
}

export function writeNotebook(runs: RunSnapshot[]): boolean {
  try {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(runs.slice(0, MAX_NOTEBOOK_RUNS)));
    return true;
  } catch {
    return false;
  }
}

export function serializeNotebook(runs: RunSnapshot[]): string {
  return JSON.stringify({ format: NOTEBOOK_FORMAT, version: 1, exportedAt: new Date().toISOString(), runs }, null, 2);
}

export function parseNotebookImport(text: string): RunSnapshot[] {
  if (new TextEncoder().encode(text).byteLength > MAX_NOTEBOOK_BYTES) throw new Error('Notebook files must be 1 MiB or smaller.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  if (!isObject(parsed) || parsed.format !== NOTEBOOK_FORMAT || parsed.version !== 1 || !Array.isArray(parsed.runs)) {
    throw new Error('Notebook format/version is not supported.');
  }
  if (parsed.runs.length > MAX_NOTEBOOK_RUNS) throw new Error(`A notebook may contain at most ${MAX_NOTEBOOK_RUNS} saved runs.`);
  if (!parsed.runs.every(isRunSnapshot)) throw new Error('One or more saved runs failed validation; nothing was imported.');
  return parsed.runs as RunSnapshot[];
}

export function mergeNotebookRuns(existing: RunSnapshot[], incoming: RunSnapshot[]): RunSnapshot[] {
  const unique = new Map<string, RunSnapshot>();
  for (const run of [...incoming, ...existing]) if (!unique.has(run.id)) unique.set(run.id, run);
  return [...unique.values()].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).slice(0, MAX_NOTEBOOK_RUNS);
}
