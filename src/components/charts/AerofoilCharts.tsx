import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { AerofoilControls, AerofoilMetrics, FluidProperties } from '../../types';
import { calculateAerofoil } from '../../lib/physics';
import PlotPanel from './PlotPanel';

const axis = { color: '#90a4ad', gridcolor: 'rgba(148,171,181,.14)', zerolinecolor: 'rgba(148,171,181,.24)', linecolor: 'rgba(148,171,181,.2)', tickfont: { size: 11 } };
const baseLayout: Partial<Layout> = { paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'Inter, system-ui, sans-serif', color: '#9eb0b7', size: 11 }, margin: { l: 62, r: 20, t: 15, b: 58 }, legend: { orientation: 'h', y: -0.25, font: { size: 10 } }, autosize: true };

interface Props { controls: AerofoilControls; metrics: AerofoilMetrics; fluid: FluidProperties; gravity: number; selectedTap: number | null; }

export default function AerofoilCharts({ controls, metrics, fluid, gravity, selectedTap }: Props) {
  const cpData = useMemo<Data[]>(() => {
    const selected = selectedTap ? metrics.taps.find((tap) => tap.tap === selectedTap) : undefined;
    const traces: Data[] = [
      { type: 'scatter', mode: 'lines+markers', name: 'Upper surface · suction', x: metrics.upper.map((p) => p.x), y: metrics.upper.map((p) => p.cp), line: { color: '#ed7378', width: 2.5 }, marker: { size: 3 }, hovertemplate: 'Upper · x/c %{x:.3f}<br>Cp %{y:.3f}<extra></extra>' },
      { type: 'scatter', mode: 'lines+markers', name: 'Lower surface · pressure', x: metrics.lower.map((p) => p.x), y: metrics.lower.map((p) => p.cp), line: { color: '#5a9fec', width: 2.2 }, marker: { size: 3 }, fill: 'tonexty', fillcolor: 'rgba(102,145,185,.12)', hovertemplate: 'Lower · x/c %{x:.3f}<br>Cp %{y:.3f}<extra></extra>' },
    ];
    if (selected) traces.push({ type: 'scatter', mode: 'markers', name: `Tap ${String(selected.tap).padStart(2, '0')} · measured`, x: [selected.x], y: [selected.cpExperimental], marker: { color: '#f3d274', size: 11, symbol: 'diamond', line: { color: '#fbf4d7', width: 1 } }, hovertemplate: `Tap ${selected.tap}<br>x/c %{x:.3f}<br>Cp exp. %{y:.3f}<extra></extra>` });
    return traces;
  }, [metrics, selectedTap]);

  const polar = useMemo<Data[]>(() => {
    const angles = Array.from({ length: 57 }, (_, i) => -6 + i * 0.5);
    const coeffs = angles.map((alphaDeg) => calculateAerofoil({ ...controls, alphaDeg }, fluid, gravity).liftCoefficient);
    return [
      { type: 'scatter', mode: 'lines', name: 'Pressure-integrated CL', x: angles, y: coeffs, line: { color: '#55cbd9', width: 2.5, shape: 'spline' }, hovertemplate: 'α %{x:.1f}°<br>CL %{y:.3f}<extra></extra>' },
      { type: 'scatter', mode: 'markers', name: 'Current α', x: [controls.alphaDeg], y: [metrics.liftCoefficient], marker: { color: '#f3d274', size: 9, symbol: 'diamond' }, hovertemplate: 'α %{x:.1f}°<br>CL %{y:.3f}<extra></extra>' },
    ];
  }, [controls, metrics.liftCoefficient, fluid, gravity]);

  const cpMin = Math.min(-1.5, ...metrics.upper.map((p) => p.cp)) - 0.2;
  const cpLayout: Partial<Layout> = {
    ...baseLayout,
    xaxis: { ...axis, title: { text: 'Normalized chord position x/c', font: { size: 11 } }, range: [0, 1] },
    yaxis: { ...axis, title: { text: 'Pressure coefficient Cp', font: { size: 11 } }, range: [1.2, cpMin], zeroline: true },
    shapes: selectedTap ? [{ type: 'line', x0: metrics.taps.find((tap) => tap.tap === selectedTap)?.x ?? 0, x1: metrics.taps.find((tap) => tap.tap === selectedTap)?.x ?? 0, y0: cpMin, y1: 1.2, line: { color: '#f3d274', dash: 'dot', width: 1 } }] : [],
    annotations: [{ x: 0.04, y: cpMin + 0.2, xref: 'x', yref: 'y', text: '−Cp ↑', showarrow: false, font: { size: 10, color: '#8ca2ad' } }],
    height: 310,
  };
  const polarLayout: Partial<Layout> = {
    ...baseLayout,
    xaxis: { ...axis, title: { text: 'Angle of attack α (°)', font: { size: 11 } }, range: [-6, 22] },
    yaxis: { ...axis, title: { text: 'Lift coefficient CL', font: { size: 11 } }, zeroline: true },
    shapes: [{ type: 'line', x0: metrics.stallAngleDeg, x1: metrics.stallAngleDeg, y0: 0, y1: 1, yref: 'paper', line: { color: 'rgba(239,108,113,.72)', dash: 'dot', width: 1 } }],
    annotations: [{ x: metrics.stallAngleDeg, y: 1, yref: 'paper', text: `stall ${metrics.stallAngleDeg}°`, showarrow: false, yshift: 10, font: { size: 10, color: '#e88a8e' } }],
    height: 310,
  };

  return <div className="charts-grid aero-charts">
    <PlotPanel title="Surface pressure distribution" subtitle={`NACA ${controls.foilCode} · q∞ ${(metrics.dynamicPressurePa / 1000).toFixed(2)} kPa · negative Cp upward`} data={cpData} layout={cpLayout} revision={selectedTap ?? 0} />
    <PlotPanel title="Lift polar · CL vs. α" subtitle={`Pressure integration · stall model ${metrics.stallAngleDeg.toFixed(1)}°`} data={polar} layout={polarLayout} revision={Math.round(controls.alphaDeg * 2)} />
  </div>;
}
