import Plotly from 'plotly.js-basic-dist-min';
import type { Data, Layout } from 'plotly.js';

interface PlotlyGraphElement extends HTMLElement {
  data?: Data[];
  layout?: Partial<Layout>;
}

export interface PlotImageOptions {
  width?: number;
  height?: number;
  scale?: number;
}

const ink = '#263b45';
const muted = '#465d67';
const grid = '#dbe4e8';
const fontFamily = 'DejaVu Sans, Arial, sans-serif';

function printAxis(axis: Layout['xaxis'] | undefined): Layout['xaxis'] | undefined {
  if (!axis) return axis;
  const rawTitle = axis.title;
  const title = typeof rawTitle === 'string' ? { text: rawTitle } : rawTitle ?? {};
  return {
    ...axis,
    color: muted,
    linecolor: '#8b9ba1',
    gridcolor: grid,
    zerolinecolor: '#9eafb5',
    tickcolor: '#8b9ba1',
    tickfont: { ...axis.tickfont, family: fontFamily, size: 22, color: muted },
    title: { ...title, font: { ...title.font, family: fontFamily, size: 25, color: ink } },
  };
}

function printShapes(shapes: Layout['shapes'] | undefined): Layout['shapes'] | undefined {
  if (!shapes) return shapes;
  return shapes.map((shape) => {
    const fill = shape.fillcolor;
    if (typeof fill !== 'string' || !fill.startsWith('rgba(')) return shape;
    const parts = fill.match(/rgba\(([^)]+)\)/)?.[1]?.split(',').map((part) => part.trim());
    if (!parts || parts.length !== 4) return shape;
    parts[3] = String(Math.max(0.16, Number(parts[3]) || 0));
    return { ...shape, fillcolor: `rgba(${parts.join(',')})` };
  });
}

function makePrintLayout(source: Partial<Layout>, width: number, height: number): Partial<Layout> {
  const sourceLegend = typeof source.legend === 'object' && source.legend ? source.legend : {};
  const annotations = source.annotations?.map((annotation) => ({
    ...annotation,
    font: { ...annotation.font, family: fontFamily, size: 20, color: muted },
  }));
  const layout: Partial<Layout> = {
    ...source,
    title: { text: '' },
    width,
    height,
    autosize: false,
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { ...source.font, family: fontFamily, size: 22, color: ink },
    margin: { l: 105, r: source.yaxis2 ? 115 : 52, t: 48, b: 142, pad: 8 },
    legend: {
      ...sourceLegend,
      orientation: 'h',
      y: -0.26,
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
      font: { ...sourceLegend.font, family: fontFamily, size: 20, color: ink },
      bgcolor: 'rgba(255,255,255,0.92)',
      bordercolor: '#d5e0e4',
      borderwidth: 1,
    },
    xaxis: printAxis(source.xaxis),
    yaxis: printAxis(source.yaxis),
    shapes: printShapes(source.shapes),
  };
  if (source.yaxis2) layout.yaxis2 = printAxis(source.yaxis2);
  else delete layout.yaxis2;
  if (annotations) layout.annotations = annotations;
  else delete layout.annotations;
  if (!source.shapes) delete layout.shapes;
  return layout;
}

/** Render a Plotly graph into a temporary print-oriented clone without restyling the live dashboard. */
export async function renderPlotImage(
  graph: HTMLElement,
  format: 'png' | 'svg' = 'png',
  options: PlotImageOptions = {},
): Promise<string> {
  const width = options.width ?? 1400;
  const height = options.height ?? 800;
  const scale = options.scale ?? (format === 'png' ? 2 : 1);
  const source = graph as PlotlyGraphElement;

  if (!source.data?.length || !source.layout) {
    return Plotly.toImage(graph, { format, width, height, scale });
  }

  const printNode = document.createElement('div');
  printNode.setAttribute('aria-hidden', 'true');
  Object.assign(printNode.style, {
    position: 'fixed', left: '-10000px', top: '0', width: `${width}px`, height: `${height}px`,
    opacity: '0', pointerEvents: 'none', overflow: 'hidden', background: '#ffffff',
  });
  document.body.appendChild(printNode);

  try {
    const data = JSON.parse(JSON.stringify(source.data)) as Data[];
    const layout = makePrintLayout(JSON.parse(JSON.stringify(source.layout)) as Partial<Layout>, width, height);
    await Plotly.newPlot(printNode, data, layout, { displayModeBar: false, displaylogo: false, responsive: false, staticPlot: true });
    return await Plotly.toImage(printNode, { format, width, height, scale });
  } finally {
    Plotly.purge(printNode);
    printNode.remove();
  }
}

export async function exportPlot(graph: HTMLElement | null, format: 'png' | 'svg') {
  if (!graph) return;
  try {
    const href = await renderPlotImage(graph, format, { width: 1400, height: 800, scale: format === 'png' ? 2 : 1 });
    const title = graph.closest('.plot-panel')?.querySelector('h3')?.textContent?.trim() ?? 'flowlab-chart';
    const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'flowlab-chart';
    const link = document.createElement('a');
    link.href = href;
    link.download = `${stem}-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.click();
  } catch (error) {
    console.error('Chart export failed', error);
    window.alert('The chart export could not be created. Please try again.');
  }
}
