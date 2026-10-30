import type { ReactNode } from 'react';
import { Crosshair, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  zoom: number;
  inspectMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleInspect: () => void;
  children?: ReactNode;
}

export default function CanvasViewportToolbar({ zoom, inspectMode, onZoomIn, onZoomOut, onReset, onToggleInspect, children }: Props) {
  return <div className="canvas-viewport-tools" role="toolbar" aria-label="Simulation viewport controls">
    <button type="button" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}><ZoomIn size={14} /></button>
    <button type="button" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}><ZoomOut size={14} /></button>
    <button type="button" title="Reset view" aria-label="Reset view" onClick={onReset}><Maximize2 size={13} /></button>
    <span className="viewport-zoom-readout" aria-live="polite">{Math.round(zoom * 100)}%</span>
    <button type="button" className={inspectMode ? 'is-active' : ''} title="Inspect mode: show local velocity, pressure and coordinates" aria-label="Inspect mode" aria-pressed={inspectMode} onClick={onToggleInspect}><Crosshair size={14} /><span>Inspect</span></button>
    {children}
  </div>;
}
