export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ScenePoint {
  x: number;
  y: number;
}

export const INITIAL_VIEWPORT: CanvasViewport = { zoom: 1, panX: 0, panY: 0 };
export const MIN_VIEW_ZOOM = 0.75;
export const MAX_VIEW_ZOOM = 2.25;

export function clampViewport(view: CanvasViewport, width: number, height: number): CanvasViewport {
  const zoom = Math.min(MAX_VIEW_ZOOM, Math.max(MIN_VIEW_ZOOM, view.zoom));
  const maxX = Math.max(24, width * Math.abs(zoom - 1) * 0.5 + 42);
  const maxY = Math.max(24, height * Math.abs(zoom - 1) * 0.5 + 42);
  return {
    zoom,
    panX: Math.max(-maxX, Math.min(maxX, view.panX)),
    panY: Math.max(-maxY, Math.min(maxY, view.panY)),
  };
}

/** Convert a pointer from host CSS pixels to the unscaled Canvas scene space. */
export function scenePointFromClient(
  clientX: number,
  clientY: number,
  host: HTMLElement,
  view: CanvasViewport,
): ScenePoint {
  const rect = host.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - rect.width / 2 - view.panX) / view.zoom + rect.width / 2,
    y: (sy - rect.height / 2 - view.panY) / view.zoom + rect.height / 2,
  };
}

export function viewportTransform(view: CanvasViewport) {
  return `translate3d(${view.panX}px, ${view.panY}px, 0) scale(${view.zoom})`;
}
