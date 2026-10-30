import { Activity, Wind } from 'lucide-react';
import type { ExperimentId, FlowRegime } from '../types';
import { experiments } from '../data/experiments';

interface Props { experiment: ExperimentId; regime?: FlowRegime; stalled?: boolean; }

export default function RigStageHeader({ experiment, regime, stalled }: Props) {
  const details = experiments[experiment];
  const icon = experiment === 'reynolds' ? <Activity size={14} /> : <Wind size={14} />;
  const status = regime ? regime === 'LAMINAR' ? 'LAMINAR FLOW' : regime === 'TRANSITIONAL' ? 'TRANSITIONAL FLOW' : 'FULLY TURBULENT' : stalled ? 'BOUNDARY LAYER SEPARATED' : 'ATTACHED FLOW';
  const statusClass = regime ? `regime-${regime.toLowerCase()}` : stalled ? 'status-stall' : 'status-attached';
  return <div className="rig-stage-header"><div><span className="section-kicker">{details.code} · COURSE OUTCOME 04</span><h2>{details.title}</h2><p>{details.objective}</p></div><div className={`stage-status ${statusClass}`}>{icon}<span>{status}</span></div></div>;
}
