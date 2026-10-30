# Implementation outcomes

## [x] 1. Shared CO 4 lab workspace and environment controls
- Present exactly two experiment tabs: `[CO 4] Expt 7: Reynolds' Experiment (Flow Regimes)` and `[CO 4] Expt 11: Aerofoil Static Pressure Distribution`.
- Use a React 18+ TypeScript/Vite app with Tailwind CSS, Radix UI/Shadcn-style accessible controls, Lucide icons, and a responsive split viewport: left approximately 60% for hardware/simulation/gauges/probes and right approximately 40% for controls/telemetry/charts/observations. Adapt it for tablet and mobile.
- Provide shared fluid selection for Water, Air, SAE Oil, or Custom; a 10–60 °C temperature slider that updates density and kinematic viscosity; displayed fluid properties; ambient pressure and gravity (g=9.81 m/s² default); and Reset Simulation. Custom fluid permits user-supplied properties. Preserve compatible earlier named-fluid references: Water rho=1000 kg/m³, mu=1.002e-3 Pa·s; Air rho=1.225 kg/m³, mu=1.81e-5 Pa·s; SAE 30 Oil rho=890 kg/m³, mu=0.29 Pa·s. For Water the revised correlations govern simulation: rho(T)≈1000−0.0178·|T−4|² kg/m³ and mu(T)=1.787e−3·exp(−0.02661·T) Pa·s, T in Celsius, over 10–60 °C; display their approximate nature and do not silently substitute the earlier nominal Water values. For Air and SAE Oil retain the stated 20 °C references and identify any temperature adjustment as an approximation.
- Include student name, registration/roll number, experiment timestamp, and a top-right “Generate Lab Report (PDF)” action. Use local browser persistence; no login/server/database is needed.
- Implement two layered HTML5 2D canvases per rig for apparatus and flow/overlays, a requestAnimationFrame animation loop decoupled from React render cycles, high-DPI responsive canvas sizing, object pooling, and near-60 FPS visual motion. Respect reduced motion and allow simulation control.
- Use interactive Plotly charts with hover/cursors, relevant traces, a dual Y-axis Reynolds valve-response plot, inverted Cp aerodynamic scale, and SVG/PNG export. Use fully functional controls/actions; do not leave placeholders or no-op buttons.

## [x] 2. Experiment 7 apparatus, controls, equations, flow regimes, and telemetry
- Render an Osborne Reynolds test rig cross-section with a constant-head water supply tank and overflow weir, bell-mouth entry nozzle, 1.0 m horizontal transparent borosilicate pipe with selectable inner diameter, dye reservoir and needle valve injecting a fine centerline streak, downstream flow control valve, discharge spout, volumetric collection tank with sight glass, and digital stopwatch.
- Provide discharge control valve opening 0–100% at 0.5% increments to control mean fluid velocity; inner diameter D=10, 16, or 25 mm; dye rate 0–5 mL/min; dye colors Royal Blue, Crimson Red, Fluorescent Green, or Midnight Black; and Start Run, Stop Run, and Empty Tank controls. The collection tank and stopwatch provide measured volumetric discharge Q=Volume/Time.
- Calculate Q=V/t; A=πD²/4; v=Q/A; nu=mu/rho; Re=rho·v·D/mu=v·D/nu; lower critical velocity vc1=2000·mu/(rho·D); upper critical velocity vc2=4000·mu/(rho·D). Use consistent units and show the equations/units.
- Classify Laminar Flow when Re<2000; Transitional Flow when 2000≤Re≤4000; Fully Turbulent Flow when Re>4000. Show real-time Re with green/yellow/red status badge and readouts for vc1 and vc2.
- In laminar flow, render the dye as a sharp, stable centerline filament with negligible lateral diffusion and overlay the parabolic Poiseuille profile u(r)=2·vavg·(1−r²/R²). In transition, keep the inlet filament straight then show increasing sinusoidal instability and intermittent turbulent slugs/vortex bursts. In turbulent flow, show chaotic mixing/eddies and the flatter 1/7-power profile u(r)≈vmax·(1−r/R)^(1/7). Identify the particle and intermittency rendering as pedagogic visualization, not full CFD.
- Provide live telemetry for Re, regime, discharge, velocity, fluid temperature, D, nu, vc1 and vc2; update relevant apparatus and particle behavior as controls change.

## [x] 3. Experiment 7 observation logging and plots
- Display observation columns: `Trial #` | `Tank Vol (mL)` | `Time (s)` | `Discharge Q (cm³/s)` | `Velocity v (m/s)` | `Temp (°C)` | `Reynolds No. (Re)` | `Observed Regime`.
- Provide a functional “Log Data Point” action, automatic-calculation toggle and manual student-entry mode.
- Provide dynamic Discharge vs. Valve Opening plotting a linear-to-exponential valve response and Reynolds Number vs. flow velocity with linear relation categorized into colored laminar, transitional and turbulent background bands.

## [x] 4. Experiment 11 wind-tunnel apparatus, geometry, controls, and tap inspection
- Render a subsonic closed-circuit wind-tunnel test section with acrylic chamber, aerofoil on an automated precision pitch pivot, sixteen numbered static pressure orifices, sixteen linked vertical glass manometer tubes plus one reference static-head tube P∞, and an upstream Pitot-static tube for U∞.
- Use eight upper and eight lower taps at normalized chord positions x/c=[0.025, 0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 0.90] on each surface. Each tap is hoverable/clickable and highlights its corresponding manometer column and point on the Cp curve.
- Provide NACA 0012 (symmetric), 2412 (mild camber), or 4412 (high camber/high lift) geometry with a fixed educational reference chord c=0.150 m (state it is fixed); angle of attack alpha from −6.0° to +22.0° at 0.5° increments with real-time foil rotation; wind-tunnel airspeed U∞ from 5.0 to 45.0 m/s at 1.0 m/s increments; manometer angles 15°, 30°, 45°, or 90°; and manometer fluid Water (rho_m=1000 kg/m³) or Colored Alcohol (rho_m=789 kg/m³).
- Render animated flow particles across the tunnel with velocity-magnitude coloring; pressure visualization with blue for stagnation/high pressure and crimson/red for intense suction; and subtly oscillating manometer menisci at pressure-dependent heads, pausing motion when stopped or reduced motion is preferred.

## [x] 5. Experiment 11 pressure solver, stall response, coefficients, observations, and charts
- Generate the selected NACA geometry and use a documented thin-airfoil/vortex-sheet or panel-method approximation to calculate surface velocity V(x/c,alpha). Calculate Cp(x/c)=1−(V/U∞)²=(P−P∞)/(0.5·rho_air·U∞²); pressure delta; and manometer displacement Δh_i=(P_i−P∞)/(rho_m·g·sin(theta))=Cp_i·(0.5·rho_air·U∞²)/(rho_m·g·sin(theta)). The shared fluid selector determines the density used; identify Air as the conventional atmospheric wind-tunnel reference without silently overriding shared selection. Clearly identify panel/stall/particle behavior as an educational approximation.
- Model critical stall alpha≈14.5° for NACA 0012 and ≈16.0° for NACA 4412. Before stall, show smooth contour-following streamlines and a strong upper-surface leading-edge suction peak. After stall, show trailing-edge separation and unsteady turbulent wake, with collapsed/attenuated upper suction peak and degraded pressure zone. Label any NACA 2412 stall assumption.
- Calculate and display integrated lift coefficient CL from the upper/lower Cp distributions and pressure-drag coefficient CDp using numerical integration over discretized surface segments; show the positive magnitude of the chord-normalized pressure integral and note that viscous skin-friction drag is not modeled. Show q∞=0.5·rho_air·U∞². Preserve full numerical values if a drawn manometer tube reaches its visual limit.
- Display the aerofoil observation columns: `Tap #` | `Surface (Upper/Lower)` | `x/c` | `Manometer Height h (mm)` | `ΔP (Pa)` | `Cp (Experimental)` | `Cp (Theoretical)`. “Capture Current Run” records all 16 taps for the active alpha and U∞; include a manual student-entry path while preserving calculated values.
- Plot Cp versus x/c with standard inverted aerodynamic y-axis convention (negative Cp plotted upward), upper red and lower blue traces, and shaded area between curves representing lift. Plot CL versus alpha across −6° to +22°, including 2π/rad pre-stall lift slope and post-stall drop-off.

## [x] 6. Academic reports, exports, formulas, and evaluation
- Generate a downloadable PDF for either experiment in a standardized academic format containing experiment title, Course Outcome CO 4, date, student name, roll/registration number; current high-resolution Canvas apparatus snapshot; apparatus specifications and test conditions including fluid rho/mu/T, geometry D or chord c, test velocity, gravity and manometer settings as relevant; complete tabulated observation data; governing formulae and step-by-step sample calculation; high-resolution current plot(s); marks rubric; faculty signature line.
- Reynolds report includes velocity, Reynolds number and flow-regime classification calculations. Aerofoil report includes dynamic pressure q∞, Cp calculation for Tap #1 and numerical trapezoidal integration of CL.
- Provide CSV download with headings and units for observations and SVG/PNG export for charts. Reset Simulation clears the current experiment's simulation/logged observations after deliberate confirmation, without leaving stale data in tables or reports.
- Report formulas and simulated approximations accurately; do not describe the educational simulation as physical hardware or exact full-field CFD.

## [x] 7. Experiment-specific guided run protocol
- Add a Run protocol tab with four ordered, experiment-specific procedure steps for Reynolds and aerofoil labs. Use concise instructions tied to the current controls and measurement workflow.
- Each step has an accessible completion control, visible progress count/bar, and completion state persisted separately for each experiment in browser localStorage. Switching experiments restores the corresponding checklist; users may reset only that checklist.
- Identify this as a virtual experiment procedure, not physical safety guidance. Do not clear saved protocols when Reset Simulation clears run controls/observations.

## [x] 8. Physics-backed parameter sweep studio
- Add a Sweep studio tab. For Reynolds, provide validated valve-opening start/end/step inputs within 0–100% and compute discharge, velocity, Reynolds number, and regime using the current selected fluid and pipe diameter through the existing solver. For aerofoil, provide validated angle start/end/step inputs within −6° to +22° (0.5° increments) and compute CL, CDp, and stall state using the current foil, fluid, airspeed, and gravity.
- Reject invalid ranges/zero or negative steps and cap a sweep at 150 points; state the chosen conditions and number of simulated points. Sweep results are calculations from the present model, not captured physical observations.
- Show an accessible response plot and a numeric output table; export the exact generated sweep rows as a units-bearing CSV. Recalculate only when the user runs the sweep or changes its range, not on every animation frame.

## [x] 9. Transparent measurement-uncertainty workspace
- Add an Uncertainty tab with editable one-standard-uncertainty inputs and live assumptions. For Reynolds, propagate volume, time, diameter, density, and viscosity uncertainty into Re using first-order root-sum-square. Prefer the active measured collection; otherwise use the latest logged measurement; if neither exists, explicitly label the 100 mL model-based reference basis as illustrative.
- For aerofoil, propagate manometer-head, airspeed, density, manometer-fluid density, and angle uncertainty into selected-tap experimental Cp and estimate CL uncertainty by tap-based trapezoidal weights. Identify that this is an educational measurement/error-budget estimate, not a physical instrument calibration or exact model uncertainty.
- Show result ± uncertainty, relative percentage, basis, and governing RSS assumptions with units; guard zero/near-zero inputs without division-by-zero or misleading infinite values.

## [x] 10. Portable browser-local run notebook and comparison
- Add a Run notebook tab that saves named snapshots of the active experiment's timestamp, student/session identity, shared fluid/temperature/ambient settings, experiment controls, observation count and key computed results. Keep notebook snapshots distinct from experimental observation rows and Reset Simulation.
- List saved snapshots with load and delete actions; loading restores the saved experiment, conditions, fluid and controls without clearing observations. Compare up to three snapshots for the same experiment in a readable metric table and show deltas relative to the first selected baseline.
- Persist in browser localStorage. Export/import a versioned `flowlab-run-notebook` JSON file; validate schema and record shapes, cap imports at 1 MiB and the library at 100 records, merge without duplicate IDs, and give concise success/error feedback. No remote account/server is required.

## [x] 11. Premium visual finish and responsive readability
- Retain the scientific-instrument identity, dark/light themes and semantic flow/pressure colors while improving spacing, contrast, typography, selected/hover/focus states, research-tool segmentation and icon/text alignment. Use a durable system font stack and readable UI body text generally 12–14 px with labels at least 10–11 px; keep engineering figures tabular and avoid cosmetic trends that impair long-term clarity.
- Keep the two-experiment rig prominent, and ensure new tools, SVG plots, forms, comparisons, tables, and notebook actions reflow without horizontal page overflow at tablet and mobile sizes. Respect prefers-reduced-motion and keyboard navigation; do not add a server, database, remote font or new dependency for this polish.

**Verification evidence:** strict TypeScript and production builds pass; desktop/mobile previews render; browser checks verified both sweeps, finite Reynolds/aerofoil uncertainty outputs, notebook import/dedup/compare/restore, and protocol progress/reset.


## [x] 12. Shared interactive canvas viewport and inspect mode
- Add a floating toolbar on both experiment canvases with `Zoom In (+)`, `Zoom Out (-)`, `Reset View`, and an `Inspect Mode` toggle. Support drag-panning the scene while keeping the toolbar and HUD fixed in screen space. Both Canvas layers must share one transform; reset restores the fit-to-viewport view.
- In Inspect Mode, hovering any scene point displays a non-blocking HUD with local fluid velocity, pressure, and scene coordinates `x, y`, each with units. Map pointer coordinates correctly through pan, zoom, CSS sizing and device-pixel ratio; hide the HUD when the pointer leaves.
- Keep controls accessible by keyboard and touch, provide accessible names/pressed state, and prevent unintended direct manipulation while inspecting.

## [x] 13. Experiment 07 Reynolds bench direct control and physical flow effects
- Allow clicking and dragging the discharge valve wheel in the apparatus to rotate it and change the same valve-opening value used by the slider and flow solver, bounded to 0–100%.
- Replace the single static tracer with speed-scaled, pooled procedural dye advection. For Re<2000, show a crisp centerline filament with zero lateral dispersion. For 2000≤Re≤4000, keep the upstream filament straight and add downstream-growing sinusoidal/Tollmien–Schlichting-style waves with intermittent turbulent vortex puffs. For Re>4000, show chaotic swirling mixing across the pipe, with dye particles fading downstream. Identify these as educational visuals, not CFD.
- Animate the constant-head supply tank's subtle surface waves, bottom drain and overflow-weir spill; when Start Run is active, animate a discharge-spout stream, splashes and collection-tank liquid rising in sync with the existing stopwatch, Q and collected-volume state.
- Replace the detached velocity-profile inset with an optional in-pipe velocity-vector overlay. Show a tall Poiseuille parabola in laminar flow and a flatter 1/7-power profile in turbulent flow. Keep transition blended and label the profile layer.
- Upgrade glass tubes to acrylic/borosilicate-style gradients and reflections; draw brushed-metal/aluminum flanges, nozzles, valve wheel and support frame. Add curved liquid menisci with restrained oscillation/settling.

## [x] 14. Experiment 11 aerofoil spatial pitch, smoke rake, contours and separated manometer layout
- Let users click the aerofoil and drag vertically to adjust the same angle-of-attack value as the slider in real time, bounded to −6°…+22° and snapped to 0.5° increments. Draw a live on-canvas angular protractor arc and degree readout following the drag pointer.
- Replace sparse floating dots with 12–16 continuous smoke-rake streamlines entering from the left. Show attached, smoothly curving and compressing streamlines over the suction crest before stall. At alpha≥14.5° (or the documented section-specific stall angle), detach the upper streamlines and animate a recirculating turbulent wake with alternating Kármán-like vortices. Show a dynamic marker for the modeled separation point `x_sep/c` when stalled.
- Add a `Show Flow Contours` control with `OFF`, `Pressure` and `Velocity` modes. Draw a smooth semi-transparent contour field around the aerofoil. In Pressure mode, use deep red/orange for leading-edge stagnation/high pressure and deep blue/violet for low-pressure suction over the crest, with a legible legend.
- Keep the upper area dedicated to the wind-tunnel test chamber. Place all 16 tap tubes plus reference `P∞` below it. Connect each foil tap to its matching tube with subtle dotted pneumatic lines; hovering/selecting tap #n highlights the foil marker, connection line, tube and corresponding Cp curve point together.
- Use acrylic/glass reflections and brushed-metal apparatus detail; animate curved pressure-responsive menisci with subtle settling while respecting pause/reduced motion.

## [x] 15. Rendering performance, state isolation and input quality
- Preserve the two-layer high-DPI Canvas 2D rendering and a requestAnimationFrame loop; pool and reuse flow objects rather than allocate particle objects every frame. Scale Reynolds dye advection with computed mean velocity and aerofoil flow with tunnel speed.
- Keep animated frame state in refs/local renderer variables rather than causing React/sidebar re-renders at frame rate. Repaint static apparatus only when relevant controls, tap selection, contour/profile mode, zoom or viewport size changes.
- Ensure pointer-down/move/up capture, click-vs-drag behavior, tap selection, slider synchronization, pan/zoom transforms and inspect coordinates remain coherent at desktop, tablet and mobile sizes. Respect `prefers-reduced-motion` and avoid clipping or obstructing the toolbar/HUD.

**Canvas verification evidence:** 14.5° stall threshold enters separation and pitch restores to 6°; Reynolds valve drag synchronizes 16% → 33% → 16%; stopwatch and collected volume advance together, and the test tank was emptied. Strict TypeScript and Vite production builds pass.


## [ ] 16. Complete visible-control audit and functional parity
- Audit every visible slider, select, number field, tab, toggle, mode button, canvas hit target, export, reset, log, capture, save/load and comparison action. A control must change its bound state and update the appropriate dependent solver, readout, visualization, observation or export; remove disabled-looking-as-active no-ops. Informational labels and model assumptions must not masquerade as controls.
- Keep each control's value synchronized across the form, Canvas, telemetry, sweep, observations and report where applicable. Enforce its documented bounds, provide feedback for invalid prerequisites, and preserve deliberate reset/pause semantics.
- Retest the previously specified fluid/temperature/density/viscosity/gravity/ambient settings, Reynolds valve/diameter/dye/run/empty/log/manual-entry controls, aerofoil section/angle/airspeed/manometer/tap/capture/flow controls, viewport tools, plots, CSV/PNG/SVG, local research notebook, rubric and PDF actions. Clearly disclose factors that are fixed assumptions rather than controllable inputs.
- Progress: the visible experiment counters now read their syllabus positions from experiment metadata; this does not complete the broader control-by-control audit above.

## [x] 17. Legible, paginated scientific PDF report
- Embed a Unicode-capable font so Greek letters, subscripts, superscripts, degree signs and SI units render correctly; remove unintended character stretching and broken-glyph substitutions. Wrap text explicitly to page width; do not use `maxWidth` in a way that spaces letters across a line.
- Apply a coherent academic hierarchy with readable body text, clear metadata and conditions, named figure captions, consistent margins, repeated headers/footers and page numbers. Preserve the current rig snapshot, equations/sample calculations, complete observations, model caveats, evaluation rubric, and faculty sign-off. Avoid shrinking a whole multi-chart dashboard image onto one page.
- Give each chart a print-optimized, high-resolution, white-background figure with legible tick/axis/legend text; include its chart title/caption and current conditions. Maintain table header/row readability when observation data spans pages.
- Generate reports for both experiments and inspect extracted text, page counts, and rendered pages; retain all real user-entered values and units.

## [x] 18. More legible interactive and exported graphs
- Improve current chart legibility with larger chart height, readable axes/ticks/legends, clear titles, consistent grid and units, and non-overlapping regime/stall annotations. Preserve Reynolds dual axes and laminar/transition/turbulent bands; preserve inverted Cp and upper/lower traces, selected-tap marker, lift-area cue and stall line.
- Ensure both the app's SVG/PNG controls and the PDF export contain the current data traces, selected conditions, readable labels and stable layout in either theme; the PDF must not be a screenshot of dark controls or unrelated page chrome.
