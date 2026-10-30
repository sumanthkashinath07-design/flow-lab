# FlowLab — Review Guide

**Preview:** https://8328-ifq6yy3fglyvfy0llmba8-e8b857fc.sg2.manus.computer/
**Status:** Review preview, not a public production release.
**Product:** Interactive virtual laboratory for Experiment 7 (Reynolds' flow-regime experiment) and Experiment 11 (aerofoil static-pressure distribution).

## Suggested 10-minute walkthrough

### 1. Reynolds bench — flow regimes
1. Start with the Reynolds' Experiment tab. The live apparatus is on the left; controls and computed telemetry are on the right.
2. Drag the rotary valve on the rig or move the valve slider. Both control the same opening. Watch the dye response and live Reynolds number follow the selected diameter and shared fluid properties.
3. Toggle **u(r)** to show or hide the in-pipe velocity vectors. At higher settings, compare the laminar centreline, transition waves and turbulent mixing cues.
4. Click **Start run** briefly. The stopwatch, spout stream and collection level advance together; stop the run and use **Log data point** to add an observation.
5. Open **Inspect** and hover inside the pipe to see the local velocity, pressure and position. Use the viewport zoom/reset controls; drag the background to pan.

### 2. Aerofoil bench — pressure and stall
1. Select **Aerofoil pressure**. Drag the aerofoil vertically to change angle of attack; the slider remains synchronized. The angular protractor/readout follows the adjustment.
2. Set the shared fluid to **Air** for a conventional atmospheric wind-tunnel reference. The simulation always uses the selected shared fluid; it does not override the choice. The default Water setting is intentional from the shared laboratory environment and produces much larger dynamic pressure/manometer heads.
3. Change **Show flow contours** to **Pressure** or **Velocity**. In Pressure mode, compare the stagnation region with upper-surface suction.
4. At the NACA 0012 modeled onset of **14.5°**, observe the flow-condition badge change to stall/separation, the detached upper smoke streamlines, the unsteady wake and its `x_sep/c` marker. Return below stall to compare attached flow.
5. Hover or select a numbered pressure tap. Its connector, manometer tube and Cp sample are linked. **Capture current run** records all 16 taps; the full signed head remains available in the readings/report even when a drawn tube is visually clipped.
6. Use **Inspect** for local coordinates, velocity and pressure in the tunnel.

### 3. Research and reporting tools
- **Protocol:** complete the four experiment-specific steps; progress is kept separately for each experiment in this browser.
- **Sweep studio:** generate bounded, model-backed valve or angle sweeps, inspect the plot/table, and download sweep CSV.
- **Uncertainty:** edit instrument tolerances and inspect the first-order RSS estimate and its stated measurement basis.
- **Run notebook:** save named condition/result snapshots, compare up to three runs, restore a snapshot without erasing observation rows, or export/import the versioned JSON notebook.
- **Exports:** use the top-right **Generate Lab Report (PDF)** for a structured report; use chart SVG/PNG and observation CSV actions where shown.

## Important interpretation notes

- This is a browser-only teaching simulation, not a physical laboratory or full Navier–Stokes/CFD solver. Reynolds mixing, aerofoil pressure distribution, stall and contour visuals are engineering approximations designed to illustrate the governing trends.
- The displayed pressure-drag value is a positive magnitude from a discretized surface-pressure integral; viscous skin-friction drag is not modeled.
- Water properties use the documented approximate temperature correlations. For conventional atmospheric aerofoil conditions, select **Air** in the shared environment bar.
- The notebook, student fields, experiment controls and protocol progress are stored locally in the browser. They are not uploaded to a server. A fresh browser may begin with no saved local runs; prior browser sessions may retain their own settings.

## Reviewer prompts

1. Are the valve and pitch interactions intuitive without the sliders?
2. Do the inspection HUD, pressure legend, manometer links and regime/stall cues make the physics legible?
3. Are the uncertainty assumptions and model limitations sufficiently clear for student use?
4. Which workflow should be prioritized next: deeper rig fidelity, additional export formats, or another experiment?
