# Interactive Fluid Mechanics Virtual Lab — Revised Implementation Plan

## Scope and source of truth

This revision supersedes the earlier 12-experiment assumption. Build a production-grade browser application for exactly two experiments, both carrying **CO 4**: **Experiment 7 — Determination of Flow Regime Using Reynolds' Experiment** and **Experiment 11 — Determination of Static Pressure Distribution Around an Aerofoil**. Deliver interactive hardware and physics simulations, live telemetry, dynamic plots, editable/logged observations, and academic PDF lab reports.

Preserve the global environment options from the earlier request where they remain compatible: Water, Air, SAE 30 Oil, and Custom fluid; student name and registration number; temperature; ambient pressure and gravity settings; and reset. The revised specification's temperature range of 10–60 °C is authoritative. For water, the newer explicit temperature correlations control the simulation across that range and take precedence over the earlier nominal constants wherever the values differ; the UI/report may identify those earlier values as nominal references but must not silently use them in place of the correlations. For Air and SAE 30 Oil, retain their earlier 20 °C reference values and show any temperature adjustment as a documented approximation; Custom accepts user-entered properties. The Reynolds setup identifies water as its instructional reference but follows the selected fluid's properties. Label the aerodynamic panel/vortex-sheet and stall treatments as engineering approximations, not full Navier–Stokes CFD.

## Architecture and implementation approach

- **Framework and styles:** React 18 + TypeScript + Vite; Tailwind CSS, Lucide icons, and Radix primitives for accessible controls/dialogs/tabs/sliders. Build a responsive, single-page application. Use a pinned pnpm toolchain, a checked-in lifecycle-script policy and lockfile.
- **Canvas rendering:** Two layered HTML canvases per rig: apparatus and fluid/interaction overlays. Keep requestAnimationFrame isolated from React render state, device-pixel-ratio-aware sizing, pooled particles, reduced-motion support and deterministic controls. A shared viewport transform provides pan, zoom, reset and Inspect Mode while mapping CSS pointer coordinates back to the untransformed scene; keep its toolbar and HUD fixed in screen space. Keep physics calculations separate from draw/update loops.
- **Charting:** Plotly.js via its React wrapper for interactive hover/cursors, multiple traces, dual-axis-ready layout, inverted Cp axis and export to SVG/PNG. One Reynolds chart compares measured discharge with valve opening; another shows Re versus mean velocity with colored transition bands. The aerofoil charts show Cp versus x/c (upper and lower surfaces with lift-area shading) and CL versus angle of attack including stall.
- **Reports:** jsPDF plus html2canvas for a downloadable academic record sheet. Include rig and chart snapshots, metadata, conditions, full observations, formulas/sample calculations, marks rubric and faculty signature line. CSV export is available for both experiments.
- **State:** Store active experiment, student identity, shared fluid settings, controls, run observations and rubric marks in browser localStorage. Reset Simulation clears simulation and logged data (confirmation required); learner identity/preferences may be retained unless Reset All is selected. No account, external service, backend or database.

## Shared application frame

- Header with the two CO 4 experiment tabs: `[CO 4] Expt 7: Reynolds' Experiment (Flow Regimes)` and `[CO 4] Expt 11: Aerofoil Static Pressure Distribution`.
- Shared environment bar with fluid selector (Water, Air, SAE Oil, Custom), 10–60 °C temperature, fluid properties, ambient pressure, gravity and Reset Simulation. For Water calculate rho(T)≈1000−0.0178·|T−4|² kg/m³ and mu(T)=1.787e−3·exp(−0.02661·T) Pa·s, with T in Celsius, across the selected range and label the correlation as approximate. The earlier Water values (rho=1000 kg/m³, mu=1.002e−3 Pa·s) are nominal reference values only. For Air and SAE 30 Oil retain the earlier 20 °C reference properties (Air: rho=1.225 kg/m³, mu=1.81e−5 Pa·s; SAE 30 Oil: rho=890 kg/m³, mu=0.29 Pa·s) with any temperature adjustment identified as an approximation.
- Session identity includes student name, registration/roll number and date/time in the report.
- Main viewport split: left ~60% live rig, visual probes and gauges; right ~40% controls, telemetry, dynamic analytics and observations. Stack responsively on tablet/mobile with a selector that preserves access to both rigs.

## Experiment 7 — Reynolds' experiment

### Apparatus and controls

Draw the Osborne Reynolds rig: constant-head tank with overflow weir; bell-mouth; 1.0 m transparent horizontal pipe with selected D=10, 16 or 25 mm; dye reservoir and centerline needle valve; downstream discharge control valve; spout; collection tank sight glass and digital stopwatch.

Controls: valve opening 0–100% in 0.5% increments; pipe diameter; dye flow 0–5 mL/min; color choice (Royal Blue, Crimson Red, Fluorescent Green, Midnight Black); Start Run, Stop Run and Empty Tank. Temperature and fluid properties follow the shared environmental settings.

### Calculations and flow behavior

Calculate Q=V/t, area A=πD²/4, mean velocity v=Q/A, kinematic viscosity nu=mu/rho and Re=rho·v·D/mu=v·D/nu. Calculate critical velocities v_c1=2000·mu/(rho·D) and v_c2=4000·mu/(rho·D). Use the valve model to update Q smoothly with opening and keep logged measured Q derived from tank volume/time.

Classify Re<2000 as laminar; 2000≤Re≤4000 as transitional; Re>4000 as turbulent. Render a razor-sharp moving laminar centerline tracer; in transition retain a straight inlet core before growing downstream waves and intermittent vortex puffs; in turbulence advect a dispersed, fading particle field. Scale tracer speed with computed mean velocity. Provide an in-pipe vector-arrow profile layer, toggleable between the parabolic Poiseuille shape and the blended/flat 1/7-power turbulent profile. Animate supply head waves, overflow/drain, spout stream/splash and collection level from actual elapsed time/volume. Use glass and brushed-metal gradients. Clearly identify dispersion and profiles as pedagogic visualizations; use deterministic variation and pooled particles.

Live telemetry: Re with green/yellow/red regime badge, Q, velocity, temperature, diameter, nu, v_c1 and v_c2. Observation columns exactly: Trial #, Tank Vol (mL), Time (s), Discharge Q (cm³/s), Velocity v (m/s), Temp (°C), Reynolds No. (Re), Observed Regime. Support Log Data Point, automatic calculation, and manual student-entry mode. Plot discharge versus valve opening and Reynolds number versus velocity, with colored laminar/transition/turbulent bands.

## Experiment 11 — Aerofoil static-pressure distribution

### Apparatus and controls

Draw a subsonic closed-circuit wind-tunnel cross-section with transparent test section, an automated pitch-pivot aerofoil, colored flow tracers/pressure map, upstream Pitot-static probe and 16 connected surface pressure taps feeding a 16-tube plus reference tube manometer bank. Plot upper/lower surface tap positions at x/c=[0.025, 0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 0.90] on each side and make each tap hover/click-selectable.

Controls: NACA 0012, 2412 and 4412 geometry; fixed educational reference chord c=0.150 m (Cp and CL remain normalized by c); alpha −6° to +22° in 0.5° increments; tunnel velocity 5–45 m/s in 1 m/s increments; manometer incline 15°, 30°, 45° or 90°; manometer fluid Water or Colored Alcohol (rho_m=789 kg/m³). Global fluid and temperature settings affect tunnel density according to the selected properties; identify Air as the conventional atmospheric wind-tunnel reference without overriding the user's shared fluid choice.

### Pressure solver, separation and outputs

Generate a four-digit NACA section and use a discrete thin-airfoil/vortex-sheet/panel approximation for surface velocity V(x/c, alpha). Compute Cp=1−(V/U_inf)²=(P−P_inf)/(0.5·rho·U_inf²), dynamic pressure q_inf=0.5·rho·U_inf², pressure delta and signed manometer displacement Δh=Cp·q_inf/(rho_m·g·sin(theta)). Use manometer levels relative to a clear baseline; saturate only the drawn tube and preserve full numerical values.

Use approximate stall angles 14.5° for NACA 0012 and 16.0° for NACA 4412; state an explicit documented assumption for NACA 2412 rather than implying it came from the source. Before stall, show upper-surface leading-edge suction and attached streamlines. After stall, attenuate the suction peak, create a separated wake, and add unsteady tracer motion. Drag the foil vertically to change alpha in 0.5° increments, with a live on-canvas protractor. Add a multi-line smoke rake and selectable Pressure/Velocity contour modes; Pressure mode uses warm stagnation/high-pressure hues and blue-violet suction hues, plus a dynamic separation marker x_sep/c. Place the multi-tube manometer below the test chamber, connected by subtle dotted tap lines. Taps, connector paths, manometer levels and Cp points remain linked. Use glass/metal materials and pressure-responsive curved menisci.

## Interactive viewport overhaul

- Give both rigs floating Zoom In, Zoom Out, Reset View and Inspect Mode controls; allow background drag-pan. Inspect Mode displays local velocity, pressure and x/y coordinates with units in a non-interactive HUD. Keep toolbar/HUD outside the transformed canvas layers and support pointer/touch plus keyboard-operable controls.
- The Reynolds wheel is an on-canvas rotary control that updates the same 0–100% valve state as the slider. Dye/tank/profile behavior is calculated from the existing flow solver, stopwatch and collection state.
- The aerofoil is pitch-draggable on the canvas. Inspect and tap selection remain available; its pressure-tap wiring and manometer bank are drawn outside the test chamber, not through it.
- Add no graphics/runtime dependency or backend. Use Canvas 2D gradients, paths and pooled tracers; isolate all animation to the existing RAF loops so sidebar controls and calculations do not run at frame rate.

Calculate pressure-derived CL using cosine-spaced pressure samples and trapezoidal integration, and report CDp as the positive magnitude of the discretized chord-normalized surface-pressure integral; viscous skin-friction drag is not modeled. The CL vs alpha sweep uses a 2π/rad pre-stall lift slope with post-stall drop consistent with stated separation behavior. Show equations, tap pressures, q_inf, CL and CDp, and caveat panel-method/stall approximations.

Observation columns: Tap #, Surface (Upper/Lower), x/c, Manometer Height h (mm), ΔP (Pa), Cp (Experimental), Cp (Theoretical). Capture Current Run records all 16 tap readings at the selected alpha and speed. Provide an editable/manual entry path while preserving calculated baseline data. Cp vs x/c uses standard inverted aerodynamic y convention (negative Cp upwards), upper red / lower blue curves and lift-area fill. CL vs alpha shows the linear region and post-stall decline.

## Lab reports and evaluation

Provide a top-right **Generate Lab Report (PDF)** action for either experiment. Each PDF contains institution/experiment/course-outcome/date/student/roll metadata; high-resolution current rig image; apparatus geometry, selected fluid, rho/mu/temperature, gravity and test conditions; the complete observation table; governing equations and a sample calculation; high-resolution plot(s); evaluation rubric/marks and a faculty signature line. For Reynolds include velocity, Re and regime calculations. For aerofoil include q_inf, Tap #1 Cp and numerical trapezoidal CL integration. CSV exports retain units and headings. No export action may be a no-op.

## Research workspace additions

- Add a four-mode research suite—Run protocol, Sweep studio, Uncertainty, and Run notebook—beneath the current experiment analytics. Keep the primary rig and existing observations first; present each added workflow as an accessible tabbed panel rather than expanding the main controls dock indefinitely.
- The Run protocol provides four experiment-specific steps with local check-off progress, persists independently per experiment, and remains an instructional checklist—not physical-safety guidance.
- The Sweep studio computes fresh outputs from the existing physics modules, never mock values: Reynolds valve opening sweeps use the selected fluid/diameter; aerofoil angle sweeps use the selected foil, fluid, tunnel speed and gravity. Bound sweep sizes, draw a legible inline SVG response chart, provide a numeric table, and export sweep CSV.
- The uncertainty workspace exposes editable one-standard-uncertainty instrument assumptions. Propagate Reynolds V/t/D/rho/mu tolerances by first-order root-sum-square and aerofoil tap head/U/rho/manometer angle tolerances into selected-tap Cp and a tap-based CL estimate. When no actual Reynolds measurement exists, label the 100 mL design basis as illustrative; explain that estimates are educational, not calibration certificates.
- The browser-local Run notebook stores named condition/result snapshots separately from observation data and Reset Simulation. Permit validated JSON import/export, comparison of up to three same-experiment snapshots with relative deltas to the first baseline, and loading saved controls/environment without erasing recorded observations. Version the format and limit it to 100 snapshots and 1 MiB imports.
- No server, database, account, remote font, or additional dependency is needed; source conditions from the current React state, physics helpers, and browser localStorage.

## Visual design

- **Design Movement:** Precision scientific-instrument console, drawing on laboratory apparatus and technical data plotting.
- **Core Principles:** Measured values first; controls visibly connected to outcomes; rigorous labeling; flowing motion restrained to the simulation.
- **Color Philosophy:** Deep ink/graphite in the instrument stage, warm near-white surfaces for reading, instrument cyan for live flow and actions, regime green/amber/red for Reynolds classification, warm red/orange for aerofoil stagnation/high pressure and blue/violet for suction/low pressure in contour mode; surface identity remains separately labeled in Cp charts.
- **Layout Paradigm:** Asymmetric 60/40 instrument stage and control dock, followed by a clearly segmented research suite for procedures, sweeps, uncertainty and run history rather than a generic centered marketing layout.
- **Signature Elements:** Calibration ticks, a fine streamline/particle motif, and numbered pressure-tap/manometer pairings with CO 4 instrument labels.
- **Interaction Philosophy:** Units and formulas stay near measurements; slider changes are reflected immediately in controls, telemetry, rig and plots; reusable runs, uncertainty assumptions and study progress stay browser-local, portable and keyboard accessible.
- **Animation:** requestAnimationFrame-driven particles independent of React state; subdued meniscus oscillation and flow movement when running; pause/reduced-motion support; no decorative animation in measurement tables.
- **Typography System:** A durable system sans-serif UI paired with tabular monospace numerals and equation labels; body text is comfortably readable (generally 12–14 px), control labels at least 10–11 px, and display sizes reserved for experiment titles and live results.
- **Brand Essence:** “A virtual test bench for pressure and flow regimes that makes the measurement visible.” Personality: precise, analytical, exploratory.
- **Brand Voice:** Crisp and instructive. Examples: “Tune the valve. Follow the dye.” and “Select a tap to trace its pressure back to the surface.”
- **Wordmark & Logo:** Aperture-and-streamline lab mark paired with a compact “FLOW / LAB” label.
- **Signature Brand Color:** Instrument cyan for active flow and selected controls; red/blue remain reserved for the aerofoil pressure convention.

## Project structure

```text
/home/ubuntu/flowlab/
├── plan.md, TODO.md, ASSET_REFERENCES.md
├── .gitignore, app.config.ts
├── package.json, pnpm-lock.yaml, pnpm-workspace.yaml
├── index.html, tsconfig.json, vite.config.ts
├── public/                                   # Favicon mark and route manifest
└── src/
    ├── main.tsx, App.tsx, styles.css         # React mount, shared shell and visual system
    ├── components/
    │   ├── ExperimentTabs.tsx, EnvironmentBar.tsx, SessionHeader.tsx
    │   ├── controls/                         # Experiment controls and range inputs
    │   ├── charts/                           # Plotly charts and export actions
    │   ├── report/                           # Rubric panel
    │   └── research/                         # Procedure, sweep, uncertainty and notebook panels
    ├── data/                                 # Experiment labels and equation content
    ├── lib/                                  # Fluid properties and engineering calculations
    ├── simulations/
    │   ├── shared/                           # Canvas sizing, viewport transform and toolbar
    │   ├── reynolds/                         # Reynolds rig and flow renderers
    │   └── aerofoil/                         # Aerofoil rig, pressure taps, manometer renderers
    ├── types/                                # Shared typed experiment/state models
    ├── utils/
    │   ├── csv.ts, plotExport.ts              # Observation, sweep and chart exports
    │   ├── researchStorage.ts                 # Versioned notebook import/export and browser-local snapshots
    │   ├── uncertainty.ts                     # RSS propagation for measurement estimates
    │   ├── reportGenerator.ts                 # jsPDF/html2canvas report assembly
    │   └── storage.ts                         # Versioned browser-local persistence
```

## Serving and constraints

The managed preview uses the existing port 3000; serve the Vite app on 0.0.0.0:3000. Declare `/` in `public/manus-routes.json` before starting the server. Register TypeScript diagnostics before writing application code. Use the existing managed preview and do not enable server/database features. The rendering stage aims for smooth near-60-FPS visual simulation; calculation and observation updates are decoupled from Canvas frames. Explain relevant approximations in-app and in generated reports so simulated readings are not misrepresented as physical lab measurements.


## Report quality and functional-parity follow-up
- Keep the product browser-local and preserve the existing report inputs and experiment solver. Audit user-visible actions against their state/callback paths; clearly label explanatory and fixed-assumption content, while ensuring every active control updates its model, output or export.
- Replace built-in jsPDF-only text with an embedded Unicode-capable sans-serif font. Use explicit wrapping and measured line heights instead of width options that can distort character spacing. Design a paginated academic report with a clear cover/conditions page, calculations and complete observation table, dedicated print-quality figure pages, and evaluation/sign-off. Repeat clean headers/footers and page numbers, use legible autoTable styles, and inspect rendered output for font and pagination issues.
- Render the active Plotly data into temporary print-style plot clones for the PDF: white background, dark labels/grid, enlarged axis/legend text, appropriate current traces and conditions. Keep chart figures separate from dark dashboard chrome. In the app, give charts more vertical space and larger readable typography while preserving the dual-axis Reynolds response, regime zones, inverted Cp distribution, tap marker and CL stall polar.
- Dependencies remain React/Vite/TypeScript, jsPDF, jsPDF-AutoTable, html2canvas, and the installed Plotly basic build; embed the required static font in project assets. No backend, external data service, database or account is added.
