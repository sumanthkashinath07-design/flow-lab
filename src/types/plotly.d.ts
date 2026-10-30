declare module 'react-plotly.js' {
  import type { ComponentType } from 'react';
  import type { Config, Data, Figure, Layout } from 'plotly.js';

  export interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    frames?: Figure['frames'];
    revision?: number;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: Figure, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: Figure, graphDiv: HTMLElement) => void;
    onHover?: (event: unknown) => void;
    onClick?: (event: unknown) => void;
  }

  const Plot: ComponentType<PlotParams>;
  export default Plot;
}
