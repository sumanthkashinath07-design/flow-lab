import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowUpRight, CircleHelp, Info, MoveRight, Wind } from 'lucide-react';
import ExperimentTabs from './components/ExperimentTabs';
import EnvironmentBar from './components/EnvironmentBar';
import SessionHeader from './components/SessionHeader';
import MetricCard from './components/MetricCard';
import FormulaPanel from './components/FormulaPanel';
import RigStageHeader from './components/RigStageHeader';
import ReynoldsRig from './simulations/reynolds/ReynoldsRig';
import AerofoilRig from './simulations/aerofoil/AerofoilRig';
import ReynoldsControlsPanel from './components/controls/ReynoldsControlsPanel';
import AerofoilControlsPanel from './components/controls/AerofoilControlsPanel';
import ReynoldsCharts from './components/charts/ReynoldsCharts';
import AerofoilCharts from './components/charts/AerofoilCharts';
import ReynoldsObservationTable from './components/ReynoldsObservationTable';
import AerofoilObservationTable from './components/AerofoilObservationTable';
import RubricPanel from './components/report/RubricPanel';
import ResearchSuite from './components/research/ResearchSuite';
import { experiments } from './data/experiments';
import { getFluidProperties } from './lib/fluidProperties';
import { AEROFOIL_CHORD_M, calculateAerofoil, reynoldsFlow, reynoldsFromMeasurement } from './lib/physics';
import { exportAerofoilCsv, exportReynoldsCsv } from './utils/csv';
import { readSession, writeSession } from './utils/storage';
import type { AerofoilControls, AerofoilTapReading, ExperimentId, ReynoldsControls, ReynoldsReading, RubricScores, SharedEnvironment } from './types';
import type { RunSnapshot } from './types/research';

interface SavedSession {
  active: ExperimentId;
  studentName: string;
  registration: string;
  environment: SharedEnvironment;
  reynolds: ReynoldsControls;
  aerofoil: AerofoilControls;
  reynoldsRows: ReynoldsReading[];
  aerofoilRows: AerofoilTapReading[];
  selectedTap: number | null;
  autoCalculate: boolean;
  reynoldsManual: boolean;
  aerofoilManual: boolean;
  rubric: RubricScores;
  theme: 'dark' | 'light';
}

const initialSession: SavedSession = {
  active: 'aerofoil',
  studentName: '',
  registration: '',
  environment: { fluid: 'water', temperatureC: 20, customRho: 1000, customMu: 0.001, ambientPressurePa: 101325, gravity: 9.81 },
  reynolds: { valveOpening: 16, diameterMm: 10, dyeRateMlMin: 1.5, dyeColor: 'Royal Blue' },
  aerofoil: { foilCode: '0012', alphaDeg: 6, airspeedMs: 15, manometerAngleDeg: 30, manometerFluid: 'Water' },
  reynoldsRows: [],
  aerofoilRows: [],
  selectedTap: 1,
  autoCalculate: true,
  reynoldsManual: false,
  aerofoilManual: false,
  rubric: { setup: 0, procedure: 0, analysis: 0, presentation: 0 },
  theme: 'dark',
};

export default function App() {
  const [session, setSession] = useState<SavedSession>(() => readSession(initialSession));
  const [running, setRunning] = useState(false);
  const [aerofoilRunning, setAerofoilRunning] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [tankVolumeMl, setTankVolumeMl] = useState(0);
  const [reportBusy, setReportBusy] = useState(false);

  const patch = (values: Partial<SavedSession>) => setSession((current) => ({ ...current, ...values }));
  const properties = useMemo(() => getFluidProperties(session.environment.fluid, session.environment.temperatureC, session.environment.customRho, session.environment.customMu), [session.environment]);
  const nominalRe = useMemo(() => reynoldsFlow(session.reynolds.valveOpening, session.reynolds.diameterMm, properties), [session.reynolds, properties]);
  const measuredRe = useMemo(() => elapsedSec > 0 ? reynoldsFromMeasurement(tankVolumeMl, elapsedSec, session.reynolds.diameterMm, properties) : null, [elapsedSec, tankVolumeMl, session.reynolds.diameterMm, properties]);
  const liveRe = measuredRe ? { ...nominalRe, velocityMs: measuredRe.velocityMs, reynolds: measuredRe.reynolds, regime: measuredRe.regime, predictedDischargeCm3s: measuredRe.dischargeCm3s } : nominalRe;
  const aeroMetrics = useMemo(() => calculateAerofoil(session.aerofoil, properties, session.environment.gravity), [session.aerofoil, properties, session.environment.gravity]);
  const selectedTap = aeroMetrics.taps.find((tap) => tap.tap === session.selectedTap) ?? aeroMetrics.taps[0];

  useEffect(() => { writeSession(session); }, [session]);
  useEffect(() => { document.documentElement.dataset.theme = session.theme; }, [session.theme]);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); const dt = Math.max(0, (now - last) / 1000); last = now;
      setElapsedSec((value) => value + dt);
      setTankVolumeMl((value) => value + Math.max(0, nominalRe.predictedDischargeCm3s) * dt);
    }, 200);
    return () => window.clearInterval(timer);
  }, [running, nominalRe.predictedDischargeCm3s]);

  function toggleRun() {
    if (running) { setRunning(false); return; }
    setElapsedSec(0); setTankVolumeMl(0); setRunning(true);
  }

  function emptyTank() {
    setRunning(false); setElapsedSec(0); setTankVolumeMl(0);
  }

  function restoreSnapshot(snapshot: RunSnapshot) {
    setRunning(false); setElapsedSec(0); setTankVolumeMl(0);
    if (snapshot.experiment === 'reynolds' && snapshot.reynoldsControls) {
      setAerofoilRunning(false);
      patch({ active: 'reynolds', studentName: snapshot.studentName, registration: snapshot.registration, environment: snapshot.environment, reynolds: snapshot.reynoldsControls });
    } else if (snapshot.experiment === 'aerofoil' && snapshot.aerofoilControls) {
      setAerofoilRunning(true);
      patch({ active: 'aerofoil', studentName: snapshot.studentName, registration: snapshot.registration, environment: snapshot.environment, aerofoil: snapshot.aerofoilControls, selectedTap: 1 });
    }
  }

  function resetSimulation() {
    const title = experiments[session.active].title;
    if (!window.confirm(`Reset ${title}? This clears its controls and logged observations.`)) return;
    if (session.active === 'reynolds') {
      setRunning(false); setElapsedSec(0); setTankVolumeMl(0);
      patch({ reynolds: initialSession.reynolds, reynoldsRows: [], autoCalculate: true, reynoldsManual: false });
    } else {
      setAerofoilRunning(true);
      patch({ aerofoil: initialSession.aerofoil, aerofoilRows: [], selectedTap: 1, aerofoilManual: false });
    }
  }

  function logReynolds() {
    if (elapsedSec <= 0) { window.alert('Start the run and collect fluid before logging a volume/time reading.'); return; }
    const observed = session.autoCalculate
      ? reynoldsFromMeasurement(tankVolumeMl, elapsedSec, session.reynolds.diameterMm, properties)
      : { dischargeCm3s: 0, velocityMs: 0, reynolds: 0, regime: 'LAMINAR' as const };
    const row: ReynoldsReading = {
      trial: session.reynoldsRows.length + 1,
      tankVolumeMl,
      timeSec: elapsedSec,
      dischargeCm3s: observed.dischargeCm3s,
      velocityMs: observed.velocityMs,
      temperatureC: session.environment.temperatureC,
      reynolds: observed.reynolds,
      regime: observed.regime,
      timestamp: new Date().toISOString(),
      valveOpeningPct: session.reynolds.valveOpening,
      manual: !session.autoCalculate,
    };
    patch({ reynoldsRows: [...session.reynoldsRows, row] });
  }

  function captureAerofoil() {
    const runNo = Math.floor(session.aerofoilRows.length / 16) + 1;
    const timestamp = new Date().toISOString();
    const captured = aeroMetrics.taps.map((tap) => ({ ...tap, timestamp, runNo, alphaDeg: session.aerofoil.alphaDeg, airspeedMs: session.aerofoil.airspeedMs }));
    patch({ aerofoilRows: [...session.aerofoilRows, ...captured] });
  }

  async function makeReport() {
    setReportBusy(true);
    try {
      const { generateLabReport } = await import('./utils/reportGenerator');
      await generateLabReport({
        experiment: session.active,
        studentName: session.studentName,
        registration: session.registration,
        environment: session.environment,
        fluid: properties,
        reynoldsControls: session.reynolds,
        reynoldsElapsed: elapsedSec,
        reynoldsVolumeMl: tankVolumeMl,
        reynoldsRows: session.reynoldsRows,
        aerofoilControls: session.aerofoil,
        aerofoilMetrics: aeroMetrics,
        aerofoilRows: session.aerofoilRows,
        rubric: session.rubric,
      });
    } catch (error) {
      console.error('Report generation failed', error);
      window.alert('The report could not be generated. Please try again.');
    } finally {
      setReportBusy(false);
    }
  }

  const fluidLine = `${properties.rho.toFixed(2)} kg/m³ · μ ${properties.mu.toExponential(2)} Pa·s · ν ${properties.nu.toExponential(2)} m²/s`;
  const currentTap = selectedTap;

  return <div className={`app-shell ${session.theme === 'light' ? 'theme-light' : ''}`}>
    <SessionHeader
      name={session.studentName}
      registration={session.registration}
      onName={(studentName) => patch({ studentName })}
      onRegistration={(registration) => patch({ registration })}
      theme={session.theme}
      onTheme={() => patch({ theme: session.theme === 'dark' ? 'light' : 'dark' })}
      onReset={resetSimulation}
      onReport={() => void makeReport()}
      reportBusy={reportBusy}
    />
    <div className="environment-wrap"><EnvironmentBar value={session.environment} onChange={(environment) => patch({ environment })} /></div>

    <main className="page-main">
      <div className="page-intro"><div><span className="breadcrumb">VIRTUAL LABORATORY <span>/</span> HYDRAULICS & AERODYNAMICS</span><h2>Experimental bench <span className="intro-index">02</span></h2></div><div className="intro-side-note"><span className="side-note-dot" /> SIMULATION ENGINE <b>READY</b><span className="intro-separator" /> SI UNITS</div></div>

      <ExperimentTabs active={session.active} onChange={(active) => { if (active !== session.active) setRunning(false); patch({ active }); }}>
        {session.active === 'reynolds' ? <>
          <div className="lab-grid">
            <section className="stage-column">
              <div className="stage-card" id="rig-capture">
                <RigStageHeader experiment="reynolds" regime={liveRe.regime} />
                <ReynoldsRig controls={session.reynolds} regime={liveRe.regime} running={running} elapsedSec={elapsedSec} tankVolumeMl={tankVolumeMl} velocityMs={liveRe.velocityMs} reynolds={liveRe.reynolds} densityKgM3={properties.rho} ambientPressurePa={session.environment.ambientPressurePa} onValveChange={(valveOpening) => patch({ reynolds: { ...session.reynolds, valveOpening } })} />
                <div className="stage-foot"><span><span className="stage-foot-dot" /> FLOW FIELD <b>{running ? 'IN MOTION' : 'HOLDING'}</b></span><span>MODEL · ADVECTED DYE FILAMENT <span className="stage-foot-divider">/</span> NOT TO SCALE</span></div>
              </div>
              <div className="stage-caption"><div className="caption-icon"><Info size={14} /></div><p><b>What to observe</b> Increase valve opening to follow the dye filament from a stable centerline through intermittent wave formation into turbulent mixing.</p><MoveRight size={16} /></div>
              <div className="stage-mini-specs"><span><small>APPARATUS</small><b>Osborne Reynolds bench</b></span><span><small>TEST LENGTH</small><b>1.00 m</b></span><span><small>FLUID STATE</small><b>{properties.label} · {session.environment.temperatureC} °C</b></span><span><small>PROPERTY SET</small><b>{fluidLine}</b></span></div>
            </section>
            <aside className="dock-column">
              <ReynoldsControlsPanel value={session.reynolds} onChange={(reynolds) => patch({ reynolds })} running={running} elapsedSec={elapsedSec} tankVolumeMl={tankVolumeMl} onToggleRun={toggleRun} onEmpty={emptyTank} onLog={logReynolds} />
              <div className="telemetry-heading"><span className="section-kicker">LIVE TELEMETRY</span><span className="acquiring"><i /> {running ? 'ACQUIRING' : 'IDLE'}</span></div>
              <div className="metric-grid">
                <MetricCard label="Reynolds number" value={Math.round(liveRe.reynolds).toLocaleString()} accent={liveRe.regime === 'LAMINAR' ? 'green' : liveRe.regime === 'TRANSITIONAL' ? 'amber' : 'red'} foot={liveRe.regime === 'LAMINAR' ? 'Below lower critical Re 2,000' : liveRe.regime === 'TRANSITIONAL' ? 'Between critical Re 2,000–4,000' : 'Above upper critical Re 4,000'} icon={<Activity size={13} />} />
                <MetricCard label="Mean velocity · v" value={liveRe.velocityMs.toFixed(3)} unit="m/s" accent="cyan" foot={`vᶜ₁ ${liveRe.lowerCriticalVelocity.toFixed(3)} · vᶜ₂ ${liveRe.upperCriticalVelocity.toFixed(3)} m/s`} />
                <MetricCard label="Discharge · Q" value={liveRe.predictedDischargeCm3s.toFixed(2)} unit="cm³/s" accent="blue" foot="Volume ÷ elapsed time" />
                <MetricCard label="Kinematic viscosity · ν" value={properties.nu.toExponential(2)} unit="m²/s" accent="neutral" foot={`ρ ${properties.rho.toFixed(2)} · μ ${properties.mu.toExponential(2)}`} />
              </div>
              <FormulaPanel experiment="reynolds" />
            </aside>
          </div>
          <section className="analytics-section">
            <div className="analytics-header"><div><span className="section-kicker">REAL-TIME ANALYTICS</span><h2>Flow response</h2></div><span className="analytics-note"><Info size={13} /> Curves update with the selected fluid and pipe diameter.</span></div>
            <div id="chart-capture"><ReynoldsCharts fluid={properties} controls={session.reynolds} observations={session.reynoldsRows} currentRe={liveRe.reynolds} currentVelocity={liveRe.velocityMs} /></div>
            <ReynoldsObservationTable rows={session.reynoldsRows} onChange={(reynoldsRows) => patch({ reynoldsRows })} autoCalculate={session.autoCalculate} onAutoCalculate={(autoCalculate) => patch({ autoCalculate })} manualMode={session.reynoldsManual} onManualMode={(reynoldsManual) => patch({ reynoldsManual })} onExport={() => exportReynoldsCsv(session.reynoldsRows)} />
          </section>
        </> : <>
          <div className="lab-grid">
            <section className="stage-column">
              <div className="stage-card" id="rig-capture">
                <RigStageHeader experiment="aerofoil" stalled={aeroMetrics.stalled} />
                <AerofoilRig controls={session.aerofoil} metrics={aeroMetrics} selectedTap={session.selectedTap} onSelectTap={(selectedTap) => patch({ selectedTap })} onAlphaChange={(alphaDeg) => patch({ aerofoil: { ...session.aerofoil, alphaDeg } })} running={aerofoilRunning} densityKgM3={properties.rho} ambientPressurePa={session.environment.ambientPressurePa} />
                <div className="stage-foot"><span><span className="stage-foot-dot" /> TUNNEL FLOW <b>{aerofoilRunning ? 'ACTIVE' : 'PAUSED'}</b></span><span>PRESSURE FIELD · 16 TAPS <span className="stage-foot-divider">/</span> NACA {session.aerofoil.foilCode}</span></div>
              </div>
              <div className="stage-caption"><div className="caption-icon"><Info size={14} /></div><p><b>Tap explorer</b> Select a numbered pressure port on the foil or below to highlight its connected manometer tube and Cp sample.</p><MoveRight size={16} /></div>
              <div className="stage-mini-specs"><span><small>AEROFOIL</small><b>NACA {session.aerofoil.foilCode}</b></span><span><small>REFERENCE CHORD c</small><b>{(AEROFOIL_CHORD_M * 1000).toFixed(0)} mm · fixed</b></span><span><small>ANGLE OF ATTACK</small><b>{session.aerofoil.alphaDeg.toFixed(1)}°</b></span><span><small>TUNNEL SPEED</small><b>{session.aerofoil.airspeedMs.toFixed(1)} m/s</b></span><span><small>WORKING FLUID</small><b>{properties.label} · {session.environment.temperatureC} °C</b></span></div>
            </section>
            <aside className="dock-column">
              <AerofoilControlsPanel value={session.aerofoil} onChange={(aerofoil) => patch({ aerofoil })} selectedTap={session.selectedTap} onSelectTap={(selectedTap) => patch({ selectedTap })} onCapture={captureAerofoil} tapReadings={aeroMetrics.taps} />
              {session.environment.fluid !== 'air' && <div className="assumption-inline"><Info size={13} />The shared fluid sets ρ in q∞. Select Air for conventional atmospheric wind-tunnel conditions.</div>}
              <div className="telemetry-heading"><span className="section-kicker">LIVE PRESSURE TELEMETRY</span><button className="micro-button" onClick={() => setAerofoilRunning((value) => !value)}>{aerofoilRunning ? 'PAUSE FLOW' : 'RESUME FLOW'}</button></div>
              <div className="metric-grid">
                <MetricCard label="Dynamic pressure · q∞" value={(aeroMetrics.dynamicPressurePa / 1000).toFixed(2)} unit="kPa" accent="cyan" foot={`${properties.rho.toFixed(2)} kg/m³ × ½U∞²`} icon={<Wind size={13} />} />
                <MetricCard label="Lift coefficient · CL" value={aeroMetrics.liftCoefficient.toFixed(3)} accent="blue" foot="Pressure integration · trapezoids" />
                <MetricCard label="Pressure drag · CDp" value={aeroMetrics.pressureDragCoefficient.toFixed(4)} accent="neutral" foot="Pressure-force magnitude · no skin friction" />
                <MetricCard label="Flow condition" value={aeroMetrics.stalled ? 'STALL' : 'ATTACHED'} accent={aeroMetrics.stalled ? 'red' : 'green'} foot={`Model stall onset ≈ ${aeroMetrics.stallAngleDeg.toFixed(1)}°`} />
              </div>
              <div className="tap-readout">
                <div className="tap-readout-top"><span className={`tap-readout-number ${currentTap?.surface === 'Upper' ? 'tap-upper' : 'tap-lower'}`}>TAP {String(currentTap?.tap ?? 1).padStart(2, '0')}</span><span className={`surface-label ${currentTap?.surface === 'Upper' ? 'surface-upper' : 'surface-lower'}`}>{currentTap?.surface} SURFACE</span><button className="micro-button" onClick={() => patch({ selectedTap: currentTap?.tap === 16 ? 1 : (currentTap?.tap ?? 1) + 1 })}>NEXT TAP <ArrowUpRight size={12} /></button></div>
                <div className="tap-readout-grid"><div><small>x/c</small><strong>{currentTap?.x.toFixed(3)}</strong></div><div><small>Cp</small><strong>{currentTap?.cpTheoretical.toFixed(3)}</strong></div><div><small>ΔP</small><strong>{currentTap?.deltaPPa.toFixed(1)}<i> Pa</i></strong></div><div><small>h · signed</small><strong>{currentTap?.heightMm.toFixed(1)}<i> mm</i></strong></div></div>
              </div>
              {session.aerofoil.foilCode === '2412' && <div className="assumption-inline"><CircleHelp size={13} /> NACA 2412 stall onset at 15° is an explicit model assumption.</div>}
              <FormulaPanel experiment="aerofoil" />
            </aside>
          </div>
          <section className="analytics-section">
            <div className="analytics-header"><div><span className="section-kicker">REAL-TIME ANALYTICS</span><h2>Surface pressure & lift</h2></div><span className="analytics-note"><Info size={13} /> Negative Cp is plotted upward. Click a tap to trace its pressure.</span></div>
            <div id="chart-capture"><AerofoilCharts controls={session.aerofoil} metrics={aeroMetrics} fluid={properties} gravity={session.environment.gravity} selectedTap={session.selectedTap} /></div>
            <AerofoilObservationTable rows={session.aerofoilRows} onChange={(aerofoilRows) => patch({ aerofoilRows })} manualMode={session.aerofoilManual} onManualMode={(aerofoilManual) => patch({ aerofoilManual })} onExport={() => exportAerofoilCsv(session.aerofoilRows)} onSelectTap={(selectedTap) => patch({ selectedTap })} selectedTap={session.selectedTap} />
          </section>
        </>}

        <ResearchSuite experiment={session.active} environment={session.environment} fluid={properties} gravity={session.environment.gravity} studentName={session.studentName} registration={session.registration} reynoldsControls={session.reynolds} aerofoilControls={session.aerofoil} currentRe={liveRe.reynolds} currentVelocityMs={liveRe.velocityMs} currentDischargeCm3s={liveRe.predictedDischargeCm3s} reynoldsElapsedSec={elapsedSec} reynoldsVolumeMl={tankVolumeMl} reynoldsRows={session.reynoldsRows} aerofoilMetrics={aeroMetrics} aerofoilRows={session.aerofoilRows} selectedTap={session.selectedTap} onRestoreSnapshot={restoreSnapshot} />

        <section className="footer-panels"><RubricPanel value={session.rubric} onChange={(rubric) => patch({ rubric })} /><div className="assumption-card"><div className="assumption-icon"><Info size={15} /></div><div><span className="section-kicker">MODEL NOTES</span><h3>Read the simulation in context</h3><p>Flow visualization, property adjustments and pressure/stall behavior are engineering approximations. They illustrate trends and equations; they are not exact CFD results or physical laboratory measurements.</p><div className="assumption-tags"><span>SI units</span><span>CO 4</span><span>Browser-local session</span></div></div><ArrowDownToLine size={15} /></div></section>
        <footer className="page-footer"><span><span className="brand-dot" /> FLOW/LAB <b>·</b> DEPARTMENT OF MECHANICAL ENGINEERING</span><span>EDUCATIONAL SIMULATION <b>·</b> {session.active === 'reynolds' ? 'EXPERIMENT 07' : 'EXPERIMENT 11'} <b>·</b> {session.studentName || 'STUDENT SESSION'}</span></footer>
      </ExperimentTabs>
    </main>
  </div>;
}
