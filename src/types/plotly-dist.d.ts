declare module 'plotly.js-basic-dist-min' {
  import type { Config, Data, Layout } from 'plotly.js';

  const Plotly: {
    newPlot: (graphDiv: HTMLElement, data: Data[], layout?: Partial<Layout>, config?: Partial<Config>) => Promise<HTMLElement>;
    purge: (graphDiv: HTMLElement) => void;
    toImage: (graphDiv: HTMLElement, options: { format: 'png' | 'svg'; width?: number; height?: number; scale?: number }) => Promise<string>;
  };
  export default Plotly;
}
