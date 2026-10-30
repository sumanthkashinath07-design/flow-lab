import { useRef } from 'react';
import { Image, Waves } from 'lucide-react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout } from 'plotly.js';
import { exportPlot } from '../../utils/plotExport';

const Plot = createPlotlyComponent(Plotly);

interface Props { title: string; subtitle: string; data: Data[]; layout: Partial<Layout>; revision?: number; className?: string; }

export default function PlotPanel({ title, subtitle, data, layout, revision = 0, className = '' }: Props) {
  const graphRef = useRef<HTMLElement | null>(null);
  return <section className={`panel-card plot-panel ${className}`}>
    <div className="plot-heading"><div className="plot-heading-title"><span className="plot-icon"><Waves size={14} /></span><div><h3>{title}</h3><small>{subtitle}</small></div></div>
      <div className="plot-actions"><button title="Export vector SVG" aria-label={`Export ${title} as SVG`} onClick={() => void exportPlot(graphRef.current, 'svg')}><span>SVG</span></button><button title="Export PNG" aria-label={`Export ${title} as PNG`} onClick={() => void exportPlot(graphRef.current, 'png')}><Image size={13} /><span>PNG</span></button></div>
    </div>
    <div className="plot-body"><Plot data={data} layout={layout} revision={revision} useResizeHandler className="plotly-chart" config={{ responsive: true, displaylogo: false, displayModeBar: 'hover', scrollZoom: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }} onInitialized={(_, element) => { graphRef.current = element; }} onUpdate={(_, element) => { graphRef.current = element; }} /></div>
  </section>;
}
