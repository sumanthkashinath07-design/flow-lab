import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { FluidProperties, ReynoldsControls, ReynoldsReading } from '../../types';
import { reynoldsFlow } from '../../lib/physics';
import PlotPanel from './PlotPanel';

const axis = { color: '#90a4ad', gridcolor: 'rgba(148,171,181,.14)', zerolinecolor: 'rgba(148,171,181,.24)', linecolor: 'rgba(148,171,181,.2)', tickfont: { size: 11 } };
const baseLayout: Partial<Layout> = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'Inter, system-ui, sans-serif', color: '#9eb0b7', size: 11 }, margin: { l: 62, r: 20, t: 15, b: 56 }, legend: { orientation: 'h', y: -0.26, font: { size: 10 } }, hovermode: 'x unified', autosize: true };

interface Props { fluid: FluidProperties; controls: ReynoldsControls; observations: ReynoldsReading[]; currentRe: number; currentVelocity: number; }

export default function ReynoldsCharts({ fluid, controls, observations, currentRe, currentVelocity }: Props) {
  const valveData = useMemo<Data[]>(() => {
    const x = Array.from({ length: 21 }, (_, i) => i * 5);
    const response = x.map((opening) => reynoldsFlow(opening, controls.diameterMm, fluid));
    return [
      { type: 'scatter', mode: 'lines', name: 'Discharge · Q', x, y: response.map((point) => point.predictedDischargeCm3s), line: { color: '#4ed0e0', width: 2.5, shape: 'spline' }, hovertemplate: 'Valve %{x:.1f}%<br>Q %{y:.2f} cm³/s<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Logged trials', x: observations.filter((r) => r.valveOpeningPct !== undefined).map((r) => r.valveOpeningPct!), y: observations.filter((r) => r.valveOpeningPct !== undefined).map((r) => r.dischargeCm3s), marker: { color: '#f0b65d', size: 8, line: { color: '#f8e4b8', width: 1 } }, hovertemplate: 'Trial valve %{x:.1f}%<br>Q %{y:.2f} cm³/s<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: 'Reynolds number · right axis', x, y: response.map((point) => point.reynolds), yaxis: 'y2', line: { color: '#bd91ee', width: 1.8, dash: 'dot' }, hovertemplate: 'Valve %{x:.1f}%<br>Re %{y:.0f}<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Logged Re', x: observations.filter((r) => r.valveOpeningPct !== undefined).map((r) => r.valveOpeningPct!), y: observations.filter((r) => r.valveOpeningPct !== undefined).map((r) => r.reynolds), yaxis: 'y2', marker: { color: '#f0b65d', size: 6, symbol: 'circle-open' }, hovertemplate: 'Trial valve %{x:.1f}%<br>Re %{y:.0f}<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Current Re', x: [controls.valveOpening], y: [currentRe], yaxis: 'y2', marker: { color: '#fbf4d7', size: 9, symbol: 'diamond' }, hovertemplate: 'Current valve %{x:.1f}%<br>Re %{y:.0f}<extra></extra>' },
    ];
  }, [fluid, controls, observations, currentRe]);

  const regimeData = useMemo<Data[]>(() => {
    const maxV = 2.25;
    const x = Array.from({ length: 46 }, (_, i) => (maxV * i) / 45);
    const y = x.map((v) => fluid.rho * v * (controls.diameterMm / 1000) / fluid.mu);
    return [
      { type: 'scatter', mode: 'lines', name: 'Re = ρvD / μ', x, y, line: { color: '#4ed0e0', width: 2.5 }, hovertemplate: 'v %{x:.3f} m/s<br>Re %{y:.0f}<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Current operating point', x: [currentVelocity], y: [currentRe], marker: { color: '#e9f6f7', size: 9, symbol: 'diamond', line: { color: '#49c7d7', width: 1.5 } }, hovertemplate: 'v %{x:.3f} m/s<br>Re %{y:.0f}<extra></extra>' },
    ];
  }, [fluid, controls.diameterMm, currentRe, currentVelocity]);
  const vc1 = 2000 * fluid.mu / (fluid.rho * (controls.diameterMm / 1000));
  const vc2 = 4000 * fluid.mu / (fluid.rho * (controls.diameterMm / 1000));
  const shapes = [
    { type: 'rect' as const, xref: 'x' as const, yref: 'paper' as const, x0: 0, x1: Math.min(vc1, 2.25), y0: 0, y1: 1, fillcolor: 'rgba(82,201,137,.08)', line: { width: 0 }, layer: 'below' as const },
    { type: 'rect' as const, xref: 'x' as const, yref: 'paper' as const, x0: Math.min(vc1, 2.25), x1: Math.min(vc2, 2.25), y0: 0, y1: 1, fillcolor: 'rgba(231,180,83,.10)', line: { width: 0 }, layer: 'below' as const },
    { type: 'rect' as const, xref: 'x' as const, yref: 'paper' as const, x0: Math.min(vc2, 2.25), x1: 2.25, y0: 0, y1: 1, fillcolor: 'rgba(239,108,113,.08)', line: { width: 0 }, layer: 'below' as const },
  ];

  return <div className="charts-grid">
    <PlotPanel title="Discharge & Reynolds response" subtitle="Valve opening · Q on left axis · Reynolds number on right axis" data={valveData} layout={{ ...baseLayout, margin: { l: 62, r: 70, t: 15, b: 56 }, xaxis: { ...axis, title: { text: 'Valve opening (%)', font: { size: 11 } }, range: [0, 100] }, yaxis: { ...axis, title: { text: 'Q (cm³/s)', font: { size: 11 } }, rangemode: 'tozero' }, yaxis2: { ...axis, title: { text: 'Reynolds number (Re)', font: { size: 11 } }, overlaying: 'y', side: 'right', rangemode: 'tozero' }, height: 310 }} revision={observations.length + controls.valveOpening + Math.round(currentRe)} />
    <PlotPanel title="Reynolds number vs. velocity" subtitle={`Threshold bands · D ${controls.diameterMm} mm · vᶜ₁ ${vc1.toFixed(3)} m/s · vᶜ₂ ${vc2.toFixed(3)} m/s`} data={regimeData} layout={{ ...baseLayout, shapes, xaxis: { ...axis, title: { text: 'Mean velocity v (m/s)', font: { size: 11 } }, range: [0, 2.25] }, yaxis: { ...axis, title: { text: 'Reynolds number (Re)', font: { size: 11 } }, rangemode: 'tozero' }, height: 310 }} revision={Math.round(currentRe)} />
  </div>;
}
