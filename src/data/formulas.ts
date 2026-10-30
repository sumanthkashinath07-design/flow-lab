export const reynoldsEquations = [
  { symbol: 'Q', formula: 'V / t', note: 'Measured volumetric discharge from collected volume and time.' },
  { symbol: 'v', formula: 'Q / A', note: 'Mean velocity; A = πD² / 4.' },
  { symbol: 'Re', formula: 'ρvD / μ = vD / ν', note: 'Dimensionless flow-regime indicator.' },
  { symbol: 'vᶜ₁', formula: '2,000 μ / (ρD)', note: 'Lower critical velocity at Re = 2,000.' },
  { symbol: 'vᶜ₂', formula: '4,000 μ / (ρD)', note: 'Upper critical velocity at Re = 4,000.' },
  { symbol: 'u(r)', formula: '2 vavg (1 − r²/R²)', note: 'Laminar Poiseuille profile.' },
  { symbol: 'u(r)', formula: 'umax (1 − r/R)^(1/7)', note: 'Approximate turbulent one-seventh-power profile.' },
];

export const aerofoilEquations = [
  { symbol: 'q∞', formula: '½ ρU∞²', note: 'Free-stream dynamic pressure.' },
  { symbol: 'Cp', formula: '1 − (V/U∞)² = (P − P∞) / q∞', note: 'Pressure coefficient from the vortex-sheet velocity approximation.' },
  { symbol: 'Δh', formula: 'Cp q∞ / (ρₘ g sin θ)', note: 'Signed manometer deflection relative to the reference head.' },
  { symbol: 'CL', formula: '∫₀¹ (Cp,lower − Cp,upper) d(x/c)', note: 'Pressure-derived lift coefficient, trapezoid-integrated.' },
  { symbol: 'CDp', formula: '|Σ (Cp,u · dyu/dx − Cp,l · dyl/dx) Δ(x/c)|', note: 'Positive pressure-force magnitude from discrete chord-normalized panels; skin-friction drag is not modeled.' },
];
