import type { SweepPoint } from '../../types/research';

interface Props { points: SweepPoint[]; xLabel: string; yLabel: string; regimeBands?: boolean; }
const width = 760; const height = 250; const pad = { top: 18, right: 22, bottom: 45, left: 66 };

function colorFor(status: string) {
  if (status === 'TURBULENT' || status === 'STALL') return 'var(--red)';
  if (status === 'TRANSITIONAL') return 'var(--amber)';
  return 'var(--cyan)';
}

export default function SweepChart({ points, xLabel, yLabel, regimeBands = false }: Props) {
  if (!points.length) return <div className="sweep-chart-empty"><span>∿</span><strong>Your response curve will appear here</strong><small>Set a range and run the sweep to calculate model points.</small></div>;

  const innerW = width - pad.left - pad.right; const innerH = height - pad.top - pad.bottom;
  const rawXMin = Math.min(...points.map((point) => point.x)); const rawXMax = Math.max(...points.map((point) => point.x));
  const rawYMin = Math.min(...points.map((point) => point.y)); const rawYMax = Math.max(...points.map((point) => point.y));
  const xMin = rawXMin === rawXMax ? rawXMin - 1 : rawXMin; const xMax = rawXMin === rawXMax ? rawXMax + 1 : rawXMax;
  const yMin = regimeBands ? 0 : Math.min(0, rawYMin); const yMax = rawYMax === yMin ? yMin + 1 : rawYMax * 1.08;
  const x = (value: number) => pad.left + ((value - xMin) / (xMax - xMin)) * innerW;
  const y = (value: number) => pad.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;
  const polyline = points.map((point) => `${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const transitionTop = y(Math.min(4000, yMax)); const transitionBottom = y(Math.min(2000, yMax));

  return <svg className="sweep-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yLabel} versus ${xLabel}`}>
    {regimeBands && yMax > 2000 && <rect x={pad.left} y={transitionTop} width={innerW} height={Math.max(0, transitionBottom - transitionTop)} fill="rgba(231,178,99,.09)" />}
    {ticks.map((tick, index) => <g key={index}><line className="sweep-gridline" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text className="sweep-tick" x={pad.left - 8} y={y(tick) + 3} textAnchor="end">{tick.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text></g>)}
    <line className="sweep-axis" x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} />
    <line className="sweep-axis" x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + innerH} />
    <polyline className="sweep-response-line" points={polyline} />
    {points.map((point, index) => <circle key={`${point.x}-${index}`} className="sweep-response-point" cx={x(point.x)} cy={y(point.y)} r={index === points.length - 1 ? 4.2 : 3.4} fill={colorFor(point.status)}><title>{`${xLabel}: ${point.x.toFixed(2)} · ${yLabel}: ${point.y.toFixed(3)} · ${point.status}`}</title></circle>)}
    <text className="sweep-axis-label" x={pad.left + innerW / 2} y={height - 9} textAnchor="middle">{xLabel}</text>
    <text className="sweep-axis-label" transform={`translate(16 ${pad.top + innerH / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
  </svg>;
}
