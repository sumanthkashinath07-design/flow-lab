import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Waves } from 'lucide-react';
import type { FlowRegime, ReynoldsControls } from '../../types';
import { fitCanvas } from '../shared/canvas';
import CanvasViewportToolbar from '../shared/CanvasViewportToolbar';
import { clampViewport, INITIAL_VIEWPORT, scenePointFromClient, viewportTransform, type CanvasViewport } from '../shared/viewport';
import { drawReynoldsBase, drawReynoldsFlow, getReynoldsLayout, inspectReynoldsPoint, type ReynoldsInspectReading, type ReynoldsParticle } from './renderer';

interface Props {
  controls: ReynoldsControls;
  regime: FlowRegime;
  running: boolean;
  elapsedSec: number;
  tankVolumeMl: number;
  velocityMs: number;
  reynolds: number;
  densityKgM3: number;
  ambientPressurePa: number;
  onValveChange: (opening: number) => void;
}
interface InspectHUD { left: number; top: number; reading: ReynoldsInspectReading }
type DragState =
  | { kind: 'pan'; pointerId: number; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
  | { kind: 'valve'; pointerId: number; lastAngle: number; opening: number }
  | null;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function angleDelta(next: number, previous: number) { let value = next - previous; while (value > Math.PI) value -= Math.PI * 2; while (value < -Math.PI) value += Math.PI * 2; return value; }

export default function ReynoldsRig({ controls, regime, running, elapsedSec, tankVolumeMl, velocityMs, reynolds, densityKgM3, ambientPressurePa, onValveChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const flowRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState>(null);
  const [view, setView] = useState<CanvasViewport>(INITIAL_VIEWPORT);
  const viewRef = useRef<CanvasViewport>(INITIAL_VIEWPORT);
  const [inspectMode, setInspectMode] = useState(false);
  const [showVelocityProfile, setShowVelocityProfile] = useState(true);
  const [hud, setHud] = useState<InspectHUD | null>(null);
  const latest = useRef({ controls, regime, running, velocityMs, reynolds, densityKgM3, ambientPressurePa, tankVolumeMl, showVelocityProfile });
  latest.current = { controls, regime, running, velocityMs, reynolds, densityKgM3, ambientPressurePa, tankVolumeMl, showVelocityProfile };

  function applyView(next: CanvasViewport) {
    const host = hostRef.current;
    const bounded = clampViewport(next, host?.clientWidth ?? 800, host?.clientHeight ?? 450);
    viewRef.current = bounded;
    setView(bounded);
  }

  useEffect(() => {
    const host = hostRef.current; const baseCanvas = baseRef.current; const flowCanvas = flowRef.current;
    if (!host || !baseCanvas || !flowCanvas) return;
    let base = fitCanvas(baseCanvas); let flow = fitCanvas(flowCanvas); let raf = 0; let phase = 0; let last = 0; let previousBaseKey = '';
    const particles: ReynoldsParticle[] = Array.from({ length: 180 }, (_, i) => ({ x: (i * .61803398875) % 1, y: ((i * .754877666) % 1) * 1.6 - .8, phase: i * 2.399, size: .8 + (i % 3) * .45, speed: .4 + (i % 7) * .09 }));
    const paintBase = () => {
      if (!base) return;
      const s = latest.current; const c = s.controls;
      const key = `${c.diameterMm}|${c.valveOpening}|${s.regime}`;
      if (key === previousBaseKey) return;
      previousBaseKey = key;
      drawReynoldsBase(base.context, base.width, base.height, c.diameterMm, c.valveOpening);
    };
    const resize = () => { base = fitCanvas(baseCanvas); flow = fitCanvas(flowCanvas); previousBaseKey = ''; paintBase(); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const animate = (now: number) => {
      const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
      const s = latest.current;
      if (s.running && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) phase += dt;
      paintBase();
      if (flow) drawReynoldsFlow(flow.context, flow.width, flow.height, s.controls.diameterMm, s.regime, s.controls.dyeColor, particles, phase, s.running, s.controls.dyeRateMlMin, s.velocityMs, s.tankVolumeMl, s.showVelocityProfile);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  const scenePoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current;
    return host ? scenePointFromClient(event.clientX, event.clientY, host, viewRef.current) : { x: 0, y: 0 };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const host = hostRef.current; if (!host) return;
    const point = scenePoint(event); const layout = getReynoldsLayout(host.clientWidth, host.clientHeight, controls.diameterMm);
    const valveDistance = Math.hypot(point.x - layout.valveX, point.y - layout.valveY);
    if (!inspectMode && valveDistance <= 22) {
      const angle = Math.atan2(point.y - layout.valveY, point.x - layout.valveX);
      dragRef.current = { kind: 'valve', pointerId: event.pointerId, lastAngle: angle, opening: controls.valveOpening };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); event.currentTarget.style.cursor = 'grabbing'; return;
    }
    if (inspectMode) return;
    dragRef.current = { kind: 'pan', pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startPanX: viewRef.current.panX, startPanY: viewRef.current.panY };
    event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const host = hostRef.current; if (!host) return;
    const point = scenePoint(event); const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      if (drag.kind === 'valve') {
        const layout = getReynoldsLayout(host.clientWidth, host.clientHeight, controls.diameterMm);
        const currentAngle = Math.atan2(point.y - layout.valveY, point.x - layout.valveX);
        drag.opening = clamp(drag.opening + angleDelta(currentAngle, drag.lastAngle) / (Math.PI * 1.5) * 100, 0, 100);
        drag.lastAngle = currentAngle;
        onValveChange(Math.round(drag.opening * 2) / 2);
      } else {
        applyView({ zoom: viewRef.current.zoom, panX: drag.startPanX + event.clientX - drag.startClientX, panY: drag.startPanY + event.clientY - drag.startClientY });
      }
      return;
    }
    if (!inspectMode) {
      event.currentTarget.style.cursor = 'grab';
      return;
    }
    const reading = inspectReynoldsPoint(point, host.clientWidth, host.clientHeight, controls.diameterMm, regime, velocityMs, reynolds, densityKgM3, ambientPressurePa);
    const rect = host.getBoundingClientRect();
    setHud({ left: clamp(event.clientX - rect.left + 14, 7, rect.width - 192), top: clamp(event.clientY - rect.top + 14, 7, rect.height - 112), reading });
    event.currentTarget.style.cursor = 'crosshair';
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null; event.currentTarget.style.cursor = inspectMode ? 'crosshair' : 'grab';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onPointerLeave = () => { if (!dragRef.current) setHud(null); };
  const toggleInspect = () => { setInspectMode((value) => !value); setHud(null); };
  const zoomIn = () => applyView({ ...viewRef.current, zoom: viewRef.current.zoom * 1.2 });
  const zoomOut = () => applyView({ ...viewRef.current, zoom: viewRef.current.zoom / 1.2 });

  return <div className="rig-canvas-wrap" ref={hostRef}>
    <div className="canvas-scene" style={{ transform: viewportTransform(view) }}>
      <canvas className="rig-canvas rig-canvas-base" ref={baseRef} aria-hidden="true" />
      <canvas className="rig-canvas rig-canvas-flow" ref={flowRef} aria-label={`Interactive Osborne Reynolds test rig. Flow regime: ${regime.toLowerCase()}. Drag the valve wheel to change flow. ${Math.floor(elapsedSec / 60)} minutes ${Math.floor(elapsedSec % 60)} seconds collected.`} role="img" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={onPointerLeave} />
    </div>
    <div className="canvas-overlay-label"><span className="canvas-live-dot" /> LIVE RIG VIEW</div>
    <CanvasViewportToolbar zoom={view.zoom} inspectMode={inspectMode} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={() => applyView(INITIAL_VIEWPORT)} onToggleInspect={toggleInspect}>
      <span className="viewport-extra"><button type="button" className={`canvas-mode-control ${showVelocityProfile ? 'is-active' : ''}`} aria-label="Toggle in-pipe velocity profile" aria-pressed={showVelocityProfile} title="Toggle in-pipe velocity vectors" onClick={() => setShowVelocityProfile((value) => !value)}><Waves size={13} /><span>u(r)</span></button></span>
    </CanvasViewportToolbar>
    {inspectMode && hud && <div className="canvas-inspect-hud" style={{ left: hud.left, top: hud.top }} aria-live="polite"><span>LOCAL FLOW FIELD</span><strong>INSPECT SAMPLE</strong><div><span>x · axial</span><b>{hud.reading.xM.toFixed(3)} m</b></div><div><span>y · radial</span><b>{hud.reading.yMm.toFixed(1)} mm</b></div><div><span>Velocity</span><b>{hud.reading.velocityMs.toFixed(3)} m/s</b></div><div><span>Pressure*</span><b>{hud.reading.pressurePa.toFixed(0)} Pa</b></div></div>}
    <div className="canvas-interaction-hint">DRAG VALVE · PAN SCENE · INSPECT LOCAL FIELD</div>
    <div className="canvas-scale">MODEL · NOT TO SCALE</div>
  </div>;
}
