import { useMemo } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Activity, BookOpenCheck, Database, ScanLine } from 'lucide-react';
import type { AerofoilMetrics, AerofoilTapReading, AerofoilControls, ExperimentId, FluidProperties, ReynoldsControls, ReynoldsReading, SharedEnvironment } from '../../types';
import type { RunSnapshot, SnapshotDraft } from '../../types/research';
import ProcedurePanel from './ProcedurePanel';
import SweepPanel from './SweepPanel';
import UncertaintyPanel from './UncertaintyPanel';
import NotebookPanel from './NotebookPanel';

interface Props {
  experiment: ExperimentId;
  environment: SharedEnvironment;
  fluid: FluidProperties;
  gravity: number;
  studentName: string;
  registration: string;
  reynoldsControls: ReynoldsControls;
  aerofoilControls: AerofoilControls;
  currentRe: number;
  currentVelocityMs: number;
  currentDischargeCm3s: number;
  reynoldsElapsedSec: number;
  reynoldsVolumeMl: number;
  reynoldsRows: ReynoldsReading[];
  aerofoilMetrics: AerofoilMetrics;
  aerofoilRows: AerofoilTapReading[];
  selectedTap: number | null;
  onRestoreSnapshot: (snapshot: RunSnapshot) => void;
}

export default function ResearchSuite(props: Props) {
  const draft = useMemo<SnapshotDraft>(() => {
    const shared = {
      experiment: props.experiment,
      studentName: props.studentName,
      registration: props.registration,
      environment: { ...props.environment },
    };
    if (props.experiment === 'reynolds') return {
      ...shared,
      reynoldsControls: { ...props.reynoldsControls },
      metrics: [
        { key: 're', label: 'Reynolds number', value: props.currentRe, unit: 'Re' },
        { key: 'velocity', label: 'Mean velocity', value: props.currentVelocityMs, unit: 'm/s' },
        { key: 'discharge', label: 'Discharge', value: props.currentDischargeCm3s, unit: 'cm³/s' },
        { key: 'diameter', label: 'Pipe diameter', value: props.reynoldsControls.diameterMm, unit: 'mm' },
      ],
      status: props.currentRe < 2000 ? 'LAMINAR' : props.currentRe <= 4000 ? 'TRANSITIONAL' : 'TURBULENT',
      observationCount: props.reynoldsRows.length,
    };
    return {
      ...shared,
      aerofoilControls: { ...props.aerofoilControls },
      metrics: [
        { key: 'alpha', label: 'Angle of attack', value: props.aerofoilControls.alphaDeg, unit: '°' },
        { key: 'cl', label: 'Lift coefficient', value: props.aerofoilMetrics.liftCoefficient, unit: 'CL' },
        { key: 'cdp', label: 'Pressure drag', value: props.aerofoilMetrics.pressureDragCoefficient, unit: 'CDp' },
        { key: 'qinf', label: 'Dynamic pressure', value: props.aerofoilMetrics.dynamicPressurePa, unit: 'Pa' },
        { key: 'airspeed', label: 'Tunnel speed', value: props.aerofoilControls.airspeedMs, unit: 'm/s' },
      ],
      status: props.aerofoilMetrics.stalled ? 'STALL' : 'ATTACHED',
      observationCount: Math.floor(props.aerofoilRows.length / 16),
    };
  }, [props.experiment, props.studentName, props.registration, props.environment, props.reynoldsControls, props.aerofoilControls, props.currentRe, props.currentVelocityMs, props.currentDischargeCm3s, props.reynoldsRows.length, props.aerofoilMetrics, props.aerofoilRows.length]);

  return <section className="research-suite" id="research-suite">
    <div className="research-suite-heading"><div><span className="section-kicker">REPEATABLE WORKFLOWS</span><h2>Research workspace</h2><p>Turn a live bench session into a guided, comparable and portable study.</p></div><span className="research-suite-mark"><ScanLine size={17} /> SESSION TOOLS</span></div>
    <Tabs.Root className="research-tabs-root" defaultValue="protocol">
      <Tabs.List className="research-tab-list" aria-label="Research workspace tools">
        <Tabs.Trigger className="research-tab-trigger" value="protocol"><BookOpenCheck size={16} /><span>Protocol</span><small>Guided run</small></Tabs.Trigger>
        <Tabs.Trigger className="research-tab-trigger" value="sweep"><Activity size={16} /><span>Sweep studio</span><small>Model response</small></Tabs.Trigger>
        <Tabs.Trigger className="research-tab-trigger" value="uncertainty"><ScanLine size={16} /><span>Uncertainty</span><small>Error budget</small></Tabs.Trigger>
        <Tabs.Trigger className="research-tab-trigger" value="notebook"><Database size={16} /><span>Run notebook</span><small>Save & compare</small></Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content className="research-tab-content" value="protocol" forceMount><ProcedurePanel experiment={props.experiment} /></Tabs.Content>
      <Tabs.Content className="research-tab-content" value="sweep" forceMount><SweepPanel experiment={props.experiment} fluid={props.fluid} gravity={props.gravity} reynoldsControls={props.reynoldsControls} aerofoilControls={props.aerofoilControls} /></Tabs.Content>
      <Tabs.Content className="research-tab-content" value="uncertainty" forceMount><UncertaintyPanel experiment={props.experiment} fluid={props.fluid} gravity={props.gravity} reynoldsControls={props.reynoldsControls} aerofoilControls={props.aerofoilControls} currentRe={props.currentRe} currentDischargeCm3s={props.currentDischargeCm3s} measuredVolumeMl={props.reynoldsVolumeMl} measuredTimeSec={props.reynoldsElapsedSec} reynoldsRows={props.reynoldsRows} aerofoilTaps={props.aerofoilMetrics.taps} selectedTap={props.selectedTap} /></Tabs.Content>
      <Tabs.Content className="research-tab-content" value="notebook" forceMount><NotebookPanel draft={draft} onRestore={props.onRestoreSnapshot} /></Tabs.Content>
    </Tabs.Root>
  </section>;
}
