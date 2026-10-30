import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { AEROFOIL_CHORD_M } from '../../lib/physics';
import type { AerofoilControls, AerofoilMetrics } from '../../types';
import { fitCanvas } from '../shared/canvas';
import CanvasViewportToolbar from '../shared/CanvasViewportToolbar';
import { clampViewport, INITIAL_VIEWPORT, scenePointFromClient, viewportTransform, type CanvasViewport, type ScenePoint } from '../shared/viewport';
import { drawAerofoilBase, drawAerofoilFlow, getAerofoilLayout, inspectAerofoilPoint, type AeroParticle, type FlowContourMode, type TapScreenPoint } from './renderer';

interface Props {
  controls: AerofoilControls;
  metrics: AerofoilMetrics;
  selectedTap: number | null;
  onSelectTap: (tap: number) => void;
  onAlphaChange: (alphaDeg: number) => void;
  running: boolean;
  densityKgM3: number;
  ambientPressurePa: number;
}
interface InspectHUD { left: number; top: number; reading: ReturnType<typeof inspectAerofoilPoint> }
type DragState =
  | { kind: 'pan'; pointerId: number; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
  | { kind: 'pitch'; pointerId: number; startSceneY: number; startAlpha: number }
  | { kind: 'tap'; pointerId: number }
  | null;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function surfaceAt(points: Array<{ x: number; y: number }>, x: number) {
  if (!points.length) return 0;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  let lo = 0; let hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].x <= x) lo = mid; else hi = mid; }
  const a = points[lo]; const b = points[hi]; const f = (x - a.x) / Math.max(1e-9, b.x - a.x);
  return a.y + (b.y - a.y) * f;
}

function hitsAerofoil(point: ScenePoint, width: number, height: number, controls: AerofoilControls, metrics: AerofoilMetrics) {
  const layout = getAerofoilLayout(width, height); const angle = -controls.alphaDeg * Math.PI / 180;
  const dx = point.x - layout.centerX; const dy = point.y - layout.centerY;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle); const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const xC = localX / layout.chord + .5; if (xC < 0 || xC > 1) return false;
  const foilY = -localY / layout.chord;
  return foilY <= surfaceAt(metrics.foilUpper, xC) && foilY >= surfaceAt(metrics.foilLower, xC);
}

export default function AerofoilRig({ controls, metrics, selectedTap, onSelectTap, onAlphaChange, running, densityKgM3, ambientPressurePa }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const flowRef = useRef<HTMLCanvasElement>(null);
  const tapPointsRef = useRef<TapScreenPoint[]>([]);
  const lastHoveredTapRef = useRef<number | null>(null);
  const dragRef = useRef<DragState>(null);
  const pitchPointRef = useRef<ScenePoint | null>(null);
  const [view, setView] = useState<CanvasViewport>(INITIAL_VIEWPORT);
  const viewRef = useRef<CanvasViewport>(INITIAL_VIEWPORT);
  const [inspectMode, setInspectMode] = useState(false);
  const [contourMode, setContourMode] = useState<FlowContourMode>('off');
  const [hud, setHud] = useState<InspectHUD | null>(null);
  const latest = useRef({ controls, metrics, selectedTap, running, contourMode, densityKgM3, ambientPressurePa });
  latest.current = { controls, metrics, selectedTap, running, contourMode, densityKgM3, ambientPressurePa };

  function applyView(next: CanvasViewport) {
    const host = hostRef.current;
    const bounded = clampViewport(next, host?.clientWidth ?? 800, host?.clientHeight ?? 450);
    viewRef.current = bounded;
    setView(bounded);
  }

  useEffect(() => {
    const host = hostRef.current; const baseCanvas = baseRef.current; const flowCanvas = flowRef.current;
    if (!host || !baseCanvas || !flowCanvas) return;
    let base = fitCanvas(baseCanvas); let flow = fitCanvas(flowCanvas); let raf = 0; let phase = 0; let last = 0; let previousKey = '';
    const particles: AeroParticle[] = Array.from({ length: 100 }, (_, i) => ({ x: (i * 0.61803398875) % 1, y: (i * 0.754877666) % 1, phase: i * 2.399, speed: 0.5 + (i % 8) * 0.11, size: 0.8 + (i % 3) * 0.35 }));
    const paintBase = () => {
      if (!base) return;
      const s = latest.current;
      tapPointsRef.current = drawAerofoilBase(base.context, base.width, base.height, s.controls, s.metrics, s.selectedTap, s.contourMode);
    };
    const resize = () => { base = fitCanvas(baseCanvas); flow = fitCanvas(flowCanvas); previousKey = ''; paintBase(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const animate = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
      const s = latest.current;
      const key = [s.controls.foilCode, s.controls.alphaDeg, s.controls.airspeedMs, s.controls.manometerAngleDeg, s.controls.manometerFluid, s.metrics.taps.map((t) => t.heightMm.toFixed(1)).join(','), s.selectedTap, s.contourMode].join('|');
      if (key !== previousKey) { previousKey = key; paintBase(); }
      if (s.running && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) phase += dt;
      if (flow) drawAerofoilFlow(flow.context, flow.width, flow.height, s.controls, s.metrics, particles, phase, s.running, s.selectedTap, pitchPointRef.current);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  const scenePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current;
    return host ? scenePointFromClient(event.clientX, event.clientY, host, viewRef.current) : { x: 0, y: 0 };
  };
  const nearestTap = (point: ScenePoint) => tapPointsRef.current
    .map((tap) => ({ ...tap, distance: Math.hypot(tap.x - point.x, tap.y - point.y) }))
    .sort((a, b) => a.distance - b.distance)[0];

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const host = hostRef.current; if (!host) return;
    const point = scenePoint(event); const nearest = nearestTap(point);
    if (nearest && nearest.distance <= 4.5) {
      onSelectTap(nearest.tap); lastHoveredTapRef.current = nearest.tap;
      dragRef.current = { kind: 'tap', pointerId: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); return;
    }
    if (!inspectMode && hitsAerofoil(point, host.clientWidth, host.clientHeight, controls, metrics)) {
      dragRef.current = { kind: 'pitch', pointerId: event.pointerId, startSceneY: point.y, startAlpha: controls.alphaDeg };
      pitchPointRef.current = point; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
      event.currentTarget.style.cursor = 'ns-resize'; return;
    }
    if (inspectMode) return;
    dragRef.current = { kind: 'pan', pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startPanX: viewRef.current.panX, startPanY: viewRef.current.panY };
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); event.currentTarget.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current; if (!host) return;
    const point = scenePoint(event); const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      if (drag.kind === 'pan') {
        applyView({ zoom: viewRef.current.zoom, panX: drag.startPanX + event.clientX - drag.startClientX, panY: drag.startPanY + event.clientY - drag.startClientY });
      } else if (drag.kind === 'pitch') {
        pitchPointRef.current = point;
        const alpha = clamp(Math.round((drag.startAlpha - (point.y - drag.startSceneY) * .12) * 2) / 2, -6, 22);
        if (alpha !== controls.alphaDeg) onAlphaChange(alpha);
      }
      return;
    }
    const target = nearestTap(point); const tap = target && target.distance <= 15 ? target.tap : null;
    if (tap !== lastHoveredTapRef.current) { lastHoveredTapRef.current = tap; if (tap !== null) onSelectTap(tap); }
    if (inspectMode) {
      const reading = inspectAerofoilPoint(point, host.clientWidth, host.clientHeight, controls, metrics, densityKgM3, ambientPressurePa);
      const rect = host.getBoundingClientRect();
      setHud({ left: clamp(event.clientX - rect.left + 13, 7, rect.width - 214), top: clamp(event.clientY - rect.top + 13, 7, rect.height - 124), reading });
    } else setHud(null);
    event.currentTarget.style.cursor = tap ? 'crosshair' : inspectMode ? 'crosshair' : hitsAerofoil(point, host.clientWidth, host.clientHeight, controls, metrics) ? 'ns-resize' : 'grab';
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null; pitchPointRef.current = null;
    event.currentTarget.style.cursor = inspectMode ? 'crosshair' : 'grab';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onPointerLeave = () => { if (!dragRef.current) setHud(null); };
  const toggleInspect = () => { setInspectMode((value) => !value); setHud(null); };
  const zoomIn = () => applyView({ ...viewRef.current, zoom: viewRef.current.zoom * 1.2 });
  const zoomOut = () => applyView({ ...viewRef.current, zoom: viewRef.current.zoom / 1.2 });
  const resetView = () => applyView(INITIAL_VIEWPORT);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); onSelectTap(((selectedTap ?? 1) % 16) + 1); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); onSelectTap(((selectedTap ?? 1) + 14) % 16 + 1); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomIn(); }
    if (event.key === '-') { event.preventDefault(); zoomOut(); }
    if (event.key === '0') { event.preventDefault(); resetView(); }
    if (event.key.toLowerCase() === 'i') { event.preventDefault(); toggleInspect(); }
  };

  const reading = hud?.reading;
  return <div className="rig-canvas-wrap aerofoil-canvas-wrap" ref={hostRef}>
    <div className="canvas-scene" style={{ transform: viewportTransform(view) }}>
      <canvas className="rig-canvas rig-canvas-base" ref={baseRef} aria-hidden="true" />
      <canvas className="rig-canvas rig-canvas-flow" ref={flowRef} aria-label={`Interactive wind tunnel. Drag the aerofoil vertically to change angle of attack from minus 6 to plus 22 degrees. Hover or select one of sixteen pressure taps.`} role="img" tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerLeave} onKeyDown={onKeyDown} />
    </div>
    <CanvasViewportToolbar zoom={view.zoom} inspectMode={inspectMode} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} onToggleInspect={toggleInspect}>
      <label className="canvas-mode-select"><span>Contours</span><select aria-label="Show flow contours" value={contourMode} onChange={(event) => setContourMode(event.target.value as FlowContourMode)}><option value="off">Off</option><option value="pressure">Pressure</option><option value="velocity">Velocity</option></select></label>
    </CanvasViewportToolbar>
    {reading && <div className="canvas-inspect-hud" style={{ left: hud?.left, top: hud?.top }} role="status" aria-live="polite">
      <span className="hud-kicker">LOCAL FLOW ESTIMATE · MODEL</span>
      <div className="hud-coordinates"><span>x/c <b>{reading.xC.toFixed(3)}</b></span><span>y/c <b>{reading.yC.toFixed(3)}</b></span><span>x <b>{(reading.xC * AEROFOIL_CHORD_M * 1000).toFixed(1)} mm</b></span><span>y <b>{(reading.yC * AEROFOIL_CHORD_M * 1000).toFixed(1)} mm</b></span></div>
      <div className="hud-metrics"><span>u <b>{reading.velocityMs.toFixed(2)} m/s</b></span><span>p <b>{(reading.pressurePa / 1000).toFixed(2)} kPa</b></span></div>
    </div>}
    <div className="canvas-overlay-label"><span className="canvas-live-dot" /> WIND TUNNEL VIEW</div>
    <div className="canvas-scale">16 CONNECTED TAPS · DRAG FOIL TO SET α</div>
  </div>;
}
