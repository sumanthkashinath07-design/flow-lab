import type { ExperimentId } from '../types';

export const experiments: Record<ExperimentId, { code: string; syllabusIndex: number; syllabusTotal: number; title: string; subtitle: string; objective: string; apparatus: string }> = {
  reynolds: {
    code: 'EXPERIMENT 07',
    syllabusIndex: 7,
    syllabusTotal: 12,
    title: "Reynolds' Experiment",
    subtitle: 'Determination of flow regime',
    objective: 'Observe the transition from laminar to transitional and fully turbulent flow using a dyed filament in a transparent test pipe.',
    apparatus: 'Osborne Reynolds apparatus · 1.0 m borosilicate test pipe · volumetric collection tank',
  },
  aerofoil: {
    code: 'EXPERIMENT 11',
    syllabusIndex: 11,
    syllabusTotal: 12,
    title: 'Aerofoil Static Pressure Distribution',
    subtitle: 'Surface pressure, lift and stall',
    objective: 'Measure pressure around a NACA aerofoil section and relate the Cp distribution to lift, angle of attack and boundary-layer separation.',
    apparatus: 'Subsonic wind tunnel · 16-tap aerofoil · multi-tube manometer · Pitot-static probe',
  },
};

export const regimes = [
  { label: 'Laminar', range: 'Re < 2,000', color: '#52c989' },
  { label: 'Transition', range: '2,000–4,000', color: '#e7b453' },
  { label: 'Turbulent', range: 'Re > 4,000', color: '#ef6c71' },
] as const;
