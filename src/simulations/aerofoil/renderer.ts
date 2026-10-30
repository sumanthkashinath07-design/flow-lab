import type { AerofoilControls, AerofoilMetrics, PressurePoint, SurfacePoint } from '../../types';
import type { ScenePoint } from '../shared/viewport';
import { drawLabel, roundedRect } from '../shared/canvas';

export type FlowContourMode = 'off' | 'pressure' | 'velocity';
export interface AeroParticle { x: number; y: number; phase: number; speed: number; size: number }
export interface TapScreenPoint { tap: number; x: number; y: number }
export interface AerofoilLayout {
  tunnel: { x: number; y: number; width: number; height: number };
  centerX: number; centerY: number; chord: number;
  bankX: number; bankY: number; bankW: number; tubeW: number; gap: number; tubeH: number; baseline: number;
}
export interface AerofoilInspectReading { xC: number; yC: number; velocityMs: number; pressurePa: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getAerofoilLayout(w: number, h: number): AerofoilLayout {
  const tunnel = { x: w * 0.055, y: h * 0.095, width: w * 0.89, height: h * 0.455 };
  const centerX = w * 0.51; const centerY = tunnel.y + tunnel.height * 0.48;
  const chord = Math.min(w * 0.35, h * 0.27);
  const bankX = w * 0.105; const bankY = h * 0.685; const bankW = w * 0.79;
  const tubeW = Math.min(10, bankW / 25); const gap = (bankW - tubeW * 17) / 16;
  const tubeH = Math.min(68, h * 0.15); const baseline = bankY + tubeH - 5;
  return { tunnel, centerX, centerY, chord, bankX, bankY, bankW, tubeW, gap, tubeH, baseline };
}

function grid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0f1b25'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(154,180,196,.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function pressureAt(points: PressurePoint[], x: number) {
  if (!points.length) return 0;
  if (x <= points[0].x) return points[0].cp;
  if (x >= points[points.length - 1].x) return points[points.length - 1].cp;
  let lo = 0; let hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].x <= x) lo = mid; else hi = mid; }
  const a = points[lo]; const b = points[hi]; const fraction = (x - a.x) / Math.max(1e-9, b.x - a.x);
  return a.cp + (b.cp - a.cp) * fraction;
}

function surfaceY(points: SurfacePoint[], x: number) {
  if (!points.length) return 0;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  let lo = 0; let hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].x <= x) lo = mid; else hi = mid; }
  const a = points[lo]; const b = points[hi]; const fraction = (x - a.x) / Math.max(1e-9, b.x - a.x);
  return a.y + (b.y - a.y) * fraction;
}

function tapScreen(metrics: AerofoilMetrics, controls: AerofoilControls, tapNumber: number, xValue: number, side: 'upper' | 'lower', layout: AerofoilLayout): TapScreenPoint {
  const curve = side === 'upper' ? metrics.upper : metrics.lower;
  const at = curve.find((point) => point.x >= xValue) ?? curve[curve.length - 1];
  const foilY = side === 'upper' ? at?.upperY ?? 0 : at?.lowerY ?? 0;
  const angle = -controls.alphaDeg * Math.PI / 180;
  const localX = (xValue - .5) * layout.chord; const localY = -foilY * layout.chord;
  return { tap: tapNumber, x: layout.centerX + localX * Math.cos(angle) - localY * Math.sin(angle), y: layout.centerY + localX * Math.sin(angle) + localY * Math.cos(angle) };
}

function drawContours(ctx: CanvasRenderingContext2D, controls: AerofoilControls, metrics: AerofoilMetrics, layout: AerofoilLayout, mode: FlowContourMode) {
  if (mode === 'off') return;
  const pixels = document.createElement('canvas'); pixels.width = 144; pixels.height = 72;
  const imageCtx = pixels.getContext('2d'); if (!imageCtx) return;
  const image = imageCtx.createImageData(pixels.width, pixels.height);
  const angle = -controls.alphaDeg * Math.PI / 180; const cos = Math.cos(angle); const sin = Math.sin(angle);
  for (let py = 0; py < pixels.height; py += 1) {
    const y = layout.tunnel.y + py / (pixels.height - 1) * layout.tunnel.height;
    for (let px = 0; px < pixels.width; px += 1) {
      const x = layout.tunnel.x + px / (pixels.width - 1) * layout.tunnel.width;
      const dx = x - layout.centerX; const dy = y - layout.centerY;
      const localX = dx * cos + dy * sin; const localY = -dx * sin + dy * cos;
      const xC = localX / layout.chord + .5; const foilY = -localY / layout.chord;
      let cp = 0; let distance = 2;
      if (xC >= 0 && xC <= 1) {
        const isUpper = foilY >= 0;
        const ySurface = isUpper ? surfaceY(metrics.foilUpper, xC) : surfaceY(metrics.foilLower, xC);
        distance = Math.abs(foilY - ySurface);
        const upperY = surfaceY(metrics.foilUpper, xC); const lowerY = surfaceY(metrics.foilLower, xC);
        if (foilY <= upperY && foilY >= lowerY) distance = 0;
        cp = pressureAt(isUpper ? metrics.upper : metrics.lower, xC) * Math.exp(-Math.max(0, distance - .012) * 5.5);
      } else {
        const nose = Math.exp(-Math.pow((xC - .015) / .075, 2) - Math.pow(foilY / .14, 2));
        cp = .82 * nose * Math.exp(-Math.abs(xC) * .25);
      }
      const index = (py * pixels.width + px) * 4;
      if (distance < .018) { image.data[index + 3] = 0; continue; }
      if (mode === 'pressure') {
        // High-pressure stagnation: warm; low-pressure suction: blue/violet.
        const amount = clamp(Math.abs(cp) * .33, 0, .58);
        if (cp >= 0) { image.data[index] = 244; image.data[index + 1] = 99 + Math.min(70, cp * 45); image.data[index + 2] = 51; }
        else { image.data[index] = 82; image.data[index + 1] = 77; image.data[index + 2] = 211; }
        image.data[index + 3] = Math.round(amount * 255);
      } else {
        const speedRatio = Math.sqrt(Math.max(.04, 1 - cp)); const amount = clamp(Math.abs(speedRatio - 1) * .42, 0, .52);
        if (speedRatio >= 1) { image.data[index] = 239; image.data[index + 1] = 192; image.data[index + 2] = 92; }
        else { image.data[index] = 55; image.data[index + 1] = 178; image.data[index + 2] = 204; }
        image.data[index + 3] = Math.round(amount * 255);
      }
    }
  }
  imageCtx.putImageData(image, 0, 0);
  ctx.save(); roundedRect(ctx, layout.tunnel.x + 2, layout.tunnel.y + 2, layout.tunnel.width - 4, layout.tunnel.height - 4, 8); ctx.clip();
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .92; ctx.drawImage(pixels, layout.tunnel.x, layout.tunnel.y, layout.tunnel.width, layout.tunnel.height); ctx.restore(); ctx.globalAlpha = 1;
  const label = mode === 'pressure' ? 'PRESSURE CONTOURS · WARM HIGH P / BLUE-VIOLET SUCTION' : 'VELOCITY CONTOURS · MODELLED SPEED FIELD';
  drawLabel(ctx, label, layout.tunnel.x + 12, layout.tunnel.y + layout.tunnel.height - 11, '#d6e3e5', 6.4);
  const lx = layout.tunnel.x + layout.tunnel.width - 116; const ly = layout.tunnel.y + layout.tunnel.height - 16;
  const warm = ctx.createLinearGradient(lx, ly, lx + 46, ly); warm.addColorStop(0, '#ef5f37'); warm.addColorStop(1, '#edac49');
  ctx.fillStyle = mode === 'pressure' ? warm : 'rgba(241,191,98,.8)'; ctx.fillRect(lx, ly, 25, 4);
  ctx.fillStyle = mode === 'pressure' ? '#6c67d8' : 'rgba(59,178,205,.8)'; ctx.fillRect(lx + 30, ly, 25, 4);
}

export function drawAerofoilBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  controls: AerofoilControls,
  metrics: AerofoilMetrics,
  selectedTap: number | null,
  contourMode: FlowContourMode,
): TapScreenPoint[] {
  grid(ctx, w, h);
  const layout = getAerofoilLayout(w, h); const { tunnel, centerX, centerY, chord, bankX, bankY, bankW, tubeW, gap, tubeH, baseline } = layout;
  drawLabel(ctx, 'CLOSED-CIRCUIT SUBSONIC WIND TUNNEL', 18, 22, '#b6c9d3', 9);

  // High-clarity acrylic chamber with softly reflective edges.
  ctx.save(); roundedRect(ctx, tunnel.x, tunnel.y, tunnel.width, tunnel.height, 10);
  const chamber = ctx.createLinearGradient(0, tunnel.y, 0, tunnel.y + tunnel.height); chamber.addColorStop(0, 'rgba(149,202,218,.10)'); chamber.addColorStop(.5, 'rgba(41,91,114,.12)'); chamber.addColorStop(1, 'rgba(151,205,219,.08)');
  ctx.fillStyle = chamber; ctx.fill(); ctx.strokeStyle = '#7894a0'; ctx.lineWidth = 1.35; ctx.stroke();
  ctx.strokeStyle = 'rgba(214,240,244,.17)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tunnel.x + 9, tunnel.y + 7); ctx.lineTo(tunnel.x + tunnel.width - 9, tunnel.y + 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(126,189,205,.18)'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(tunnel.x + 12, centerY); ctx.lineTo(tunnel.x + tunnel.width - 12, centerY); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  drawLabel(ctx, 'TEST CHAMBER', tunnel.x + 11, tunnel.y + tunnel.height + 13, '#8199a5', 6.7);
  drawContours(ctx, controls, metrics, layout, contourMode);

  // Upstream Pitot-static instrument.
  const pitotY = centerY - chord * .19;
  ctx.save(); ctx.strokeStyle = '#b8c7ca'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tunnel.x + 16, pitotY); ctx.lineTo(centerX - chord * .57, pitotY); ctx.stroke();
  ctx.beginPath(); ctx.arc(tunnel.x + 16, pitotY, 3.6, 0, Math.PI * 2); ctx.strokeStyle = '#b8c7ca'; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tunnel.x + 10, pitotY - 4); ctx.lineTo(tunnel.x + 10, pitotY + 4); ctx.stroke(); ctx.restore();
  drawLabel(ctx, 'PITOT · U∞', tunnel.x + 6, pitotY - 9, '#9eb2bc', 6.3);

  // Make the manometer into a physically distinct instrument bank below the chamber.
  ctx.save(); roundedRect(ctx, bankX - 8, bankY - 5, bankW + 16, tubeH + 46, 7);
  const bankMetal = ctx.createLinearGradient(0, bankY - 5, 0, bankY + tubeH + 40); bankMetal.addColorStop(0, '#253740'); bankMetal.addColorStop(.17, '#506872'); bankMetal.addColorStop(.23, '#1c2b33'); bankMetal.addColorStop(.86, '#17252d'); bankMetal.addColorStop(1, '#4a616b');
  ctx.fillStyle = bankMetal; ctx.fill(); ctx.strokeStyle = 'rgba(188,210,215,.34)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  drawLabel(ctx, `MULTI-TUBE MANOMETER · θ ${controls.manometerAngleDeg}° · ${controls.manometerFluid.toUpperCase()}`, bankX, bankY - 14, '#a9bdc5', 6.8);
  ctx.save(); ctx.strokeStyle = 'rgba(203,220,224,.42)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bankX - 3, baseline); ctx.lineTo(bankX + bankW + 3, baseline); ctx.stroke(); ctx.restore();

  const xLocations = [.025, .05, .1, .2, .35, .5, .7, .9];
  const taps: TapScreenPoint[] = [];
  for (const side of ['upper', 'lower'] as const) {
    xLocations.forEach((x, index) => taps.push(tapScreen(metrics, controls, side === 'upper' ? index + 1 : index + 9, x, side, layout)));
  }

  // Dotted, pressure-coded pneumatic lines sit behind the foil and end at the matching tubes.
  ctx.save(); ctx.setLineDash([2, 4]);
  for (let i = 0; i < 16; i += 1) {
    const tap = taps[i]; const tubeX = bankX + i * (tubeW + gap) + tubeW / 2;
    ctx.beginPath(); ctx.moveTo(tap.x, tap.y); ctx.lineTo(tubeX, bankY + 1);
    ctx.strokeStyle = selectedTap === tap.tap ? 'rgba(246,212,123,.92)' : i < 8 ? 'rgba(237,131,137,.34)' : 'rgba(105,177,235,.34)';
    ctx.lineWidth = selectedTap === tap.tap ? 1.55 : .8; ctx.stroke();
  }
  const referenceX = bankX + 16 * (tubeW + gap) + tubeW / 2;
  ctx.beginPath(); ctx.moveTo(tunnel.x + tunnel.width * .87, tunnel.y + 10); ctx.lineTo(referenceX, bankY + 1); ctx.strokeStyle = 'rgba(218,232,235,.38)'; ctx.lineWidth = .8; ctx.stroke();
  ctx.restore();

  // Aerofoil profile with a brushed alloy body, leading-edge highlight and pitch pivot.
  const angle = -controls.alphaDeg * Math.PI / 180;
  ctx.save(); ctx.translate(centerX, centerY); ctx.rotate(angle); ctx.beginPath();
  metrics.foilUpper.forEach((p, i) => { const x = (p.x - .5) * chord; const y = -p.y * chord; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  for (let i = metrics.foilLower.length - 1; i >= 0; i -= 1) { const p = metrics.foilLower[i]; ctx.lineTo((p.x - .5) * chord, -p.y * chord); }
  ctx.closePath();
  const metal = ctx.createLinearGradient(-chord * .22, -chord * .12, chord * .28, chord * .12); metal.addColorStop(0, '#7f969e'); metal.addColorStop(.22, '#edf2ef'); metal.addColorStop(.46, '#aabcc0'); metal.addColorStop(.7, '#f8f8f1'); metal.addColorStop(1, '#81989f');
  ctx.fillStyle = metal; ctx.shadowColor = 'rgba(61,206,225,.22)'; ctx.shadowBlur = 11; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#dce8e8'; ctx.lineWidth = 1.15; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-chord * .43, -chord * .017); ctx.quadraticCurveTo(-chord * .08, -chord * .055, chord * .40, -chord * .008); ctx.strokeStyle = 'rgba(255,255,245,.72)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#4bd2e4'; ctx.fill(); ctx.strokeStyle = '#edfafa'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // Separation and model labels; the marker itself animates on the flow layer.
  drawLabel(ctx, `NACA ${controls.foilCode} · α ${controls.alphaDeg.toFixed(1)}° · c 150 mm`, centerX - chord * .43, tunnel.y + tunnel.height - 11, '#d0e4e9', 7.2);
  if (metrics.stalled) drawLabel(ctx, `STALL · xₛₑₚ/c ${Math.max(.36, .74 - Math.max(0, controls.alphaDeg - metrics.stallAngleDeg) * .028).toFixed(2)}`, centerX + chord * .51, centerY + 11, '#f09b83', 6.5);

  // Numbered pressure ports remain linked to all three views: foil marker, tube and Cp curve.
  ctx.save(); ctx.font = '700 6.5px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textAlign = 'center';
  for (let i = 0; i < taps.length; i += 1) {
    const point = taps[i]; const upper = i < 8; const selected = selectedTap === point.tap;
    ctx.beginPath(); ctx.arc(point.x, point.y, selected ? 5.2 : 3.2, 0, Math.PI * 2); ctx.fillStyle = selected ? '#f4d27a' : upper ? '#ee8889' : '#70b6f1'; ctx.fill();
    ctx.strokeStyle = '#14252e'; ctx.lineWidth = .8; ctx.stroke();
    if (selected) { ctx.beginPath(); ctx.arc(point.x, point.y, 8, 0, Math.PI * 2); ctx.strokeStyle = '#f9f0d6'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = '#e7eff0'; ctx.fillText(String(point.tap).padStart(2, '0'), point.x, point.y + (upper ? -7 : 11));
  }
  ctx.textAlign = 'left'; ctx.restore();

  // Curved manometer menisci use the calculated pressure heads; full values remain in telemetry.
  for (let i = 0; i < 17; i += 1) {
    const x = bankX + i * (tubeW + gap); const tap = metrics.taps[i]; const isReference = i === 16;
    const visualMm = tap ? clamp(tap.heightMm, -48, 48) : 0; const level = clamp(baseline - visualMm * .55, bankY + 7, baseline - 2);
    const selected = selectedTap === i + 1;
    ctx.save(); roundedRect(ctx, x, bankY, tubeW, tubeH, tubeW / 2);
    const glass = ctx.createLinearGradient(x, 0, x + tubeW, 0); glass.addColorStop(0, 'rgba(192,226,234,.08)'); glass.addColorStop(.26, 'rgba(234,248,250,.18)'); glass.addColorStop(.58, 'rgba(80,133,151,.08)'); glass.addColorStop(1, 'rgba(221,240,242,.15)');
    ctx.fillStyle = glass; ctx.fill(); ctx.strokeStyle = selected ? '#f3d274' : isReference ? '#c1d0d4' : i < 8 ? 'rgba(234,140,145,.87)' : 'rgba(108,177,234,.88)'; ctx.lineWidth = selected ? 1.6 : .9; ctx.stroke();
    const fluid = ctx.createLinearGradient(0, level, 0, baseline); fluid.addColorStop(0, selected ? 'rgba(255,226,142,.88)' : controls.manometerFluid === 'Water' ? 'rgba(75,205,223,.66)' : 'rgba(237,185,86,.70)'); fluid.addColorStop(1, selected ? 'rgba(218,179,86,.82)' : controls.manometerFluid === 'Water' ? 'rgba(39,133,166,.72)' : 'rgba(184,121,46,.75)');
    ctx.beginPath(); ctx.rect(x + 1, level, tubeW - 2, Math.max(0, baseline - level)); ctx.clip(); ctx.fillStyle = fluid; ctx.fillRect(x + 1, level, tubeW - 2, Math.max(0, baseline - level)); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x + 1, level); ctx.quadraticCurveTo(x + tubeW / 2, level + 1.2, x + tubeW - 1, level); ctx.strokeStyle = selected ? '#fff1c6' : 'rgba(218,244,245,.82)'; ctx.lineWidth = 1.15; ctx.stroke();
    ctx.fillStyle = selected ? '#f4d27a' : '#b5c6ca'; ctx.font = '600 6px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(isReference ? '∞' : String(i + 1).padStart(2, '0'), x + tubeW / 2, baseline + 11);
  }
  ctx.textAlign = 'left';
  drawLabel(ctx, 'UPPER 01–08', bankX, bankY + tubeH + 28, '#e39397', 6.1);
  drawLabel(ctx, 'LOWER 09–16', bankX + bankW * .56, bankY + tubeH + 28, '#8dbceb', 6.1);
  drawLabel(ctx, 'P∞ REFERENCE', bankX + bankW - 61, bankY + tubeH + 28, '#c2d1d5', 5.7);
  return taps;
}

function foilInterior(x: number, y: number, controls: AerofoilControls, metrics: AerofoilMetrics, layout: AerofoilLayout) {
  const angle = -controls.alphaDeg * Math.PI / 180; const dx = x - layout.centerX; const dy = y - layout.centerY;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle); const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const xC = localX / layout.chord + .5; const foilY = -localY / layout.chord;
  if (xC < 0 || xC > 1) return { inside: false, xC, foilY };
  const upper = surfaceY(metrics.foilUpper, xC); const lower = surfaceY(metrics.foilLower, xC);
  return { inside: foilY <= upper && foilY >= lower, xC, foilY };
}

export function drawAerofoilFlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  controls: AerofoilControls,
  metrics: AerofoilMetrics,
  particles: AeroParticle[],
  phase: number,
  running: boolean,
  selectedTap: number | null,
  protractorPoint: ScenePoint | null,
) {
  ctx.clearRect(0, 0, w, h);
  const layout = getAerofoilLayout(w, h); const { tunnel, centerX, centerY, chord } = layout;
  const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = running && motionAllowed ? phase : 0;
  const left = tunnel.x + 6; const right = tunnel.x + tunnel.width - 6; const top = tunnel.y + 7;
  const alphaRad = controls.alphaDeg * Math.PI / 180; const suctionSide = controls.alphaDeg >= 0 ? -1 : 1;
  const sepX = Math.max(.36, .74 - Math.max(0, controls.alphaDeg - metrics.stallAngleDeg) * .028);
  const speedScale = clamp(controls.airspeedMs / 15, .25, 3.2);
  ctx.save(); ctx.beginPath(); roundedRect(ctx, tunnel.x + 1, tunnel.y + 1, tunnel.width - 2, tunnel.height - 2, 9); ctx.clip();

  // Fourteen continuous smoke-rake streamlines; deform by speed, incidence and the modeled stall state.
  const streamlineCount = 14;
  for (let i = 0; i < streamlineCount; i += 1) {
    const fraction = i / (streamlineCount - 1); const y0 = top + tunnel.height * (.07 + fraction * .86);
    const screenSide = y0 < centerY ? -1 : 1; const distance = Math.abs(y0 - centerY) / chord;
    const nearFoil = Math.exp(-Math.pow((distance - .12) / .23, 2)); const suctionGain = screenSide === suctionSide ? 1.28 : .78;
    ctx.beginPath(); let penDown = false;
    for (let j = 0; j <= 74; j += 1) {
      const t = j / 74; const x = left + t * (right - left); const rel = (x - centerX) / chord;
      const envelope = Math.exp(-Math.pow((rel + .025) / .58, 2));
      const liftDeflection = screenSide * chord * (.038 + Math.abs(alphaRad) * .42) * nearFoil * envelope * suctionGain;
      const compression = Math.sin(tick * .72 * speedScale + i * .68 + rel * 2.6) * chord * .0035 * nearFoil * envelope;
      let y = y0 + liftDeflection + compression;
      if (metrics.stalled && screenSide === suctionSide && rel > sepX) {
        const distancePastSeparation = rel - sepX;
        y += screenSide * chord * (distancePastSeparation * .26 + Math.sin(tick * 2.6 + i * 1.7 + rel * 4) * .045 * Math.min(2, distancePastSeparation + .3));
      }
      const body = foilInterior(x, y, controls, metrics, layout);
      if (body.inside) { penDown = false; continue; }
      if (!penDown) { ctx.moveTo(x, y); penDown = true; } else ctx.lineTo(x, y);
    }
    const suction = screenSide === suctionSide;
    ctx.strokeStyle = metrics.stalled && suction ? `rgba(237,157,112,${.42 + (i % 4) * .06})` : suction ? 'rgba(115,212,237,.66)' : 'rgba(156,210,220,.47)';
    ctx.lineWidth = suction ? 1.15 : .85; ctx.shadowColor = suction ? 'rgba(91,197,220,.44)' : 'rgba(91,157,180,.18)'; ctx.shadowBlur = suction ? 4 : 1; ctx.stroke(); ctx.shadowBlur = 0;
  }

  // Small smoke flecks add depth without replacing the continuous rake lines.
  const flecks = Math.min(28, particles.length);
  for (let i = 0; i < flecks; i += 1) {
    const p = particles[i]; const progress = (p.x + tick * p.speed * speedScale * .012) % 1; const x = left + progress * (right - left);
    const y0 = top + (p.y * .86 + .07) * tunnel.height; const side = y0 < centerY ? -1 : 1; const rel = (x - centerX) / chord;
    const near = Math.exp(-Math.pow((Math.abs(y0 - centerY) / chord - .12) / .23, 2)); const envelope = Math.exp(-Math.pow((rel + .025) / .58, 2));
    let y = y0 + side * chord * (.038 + Math.abs(alphaRad) * .42) * near * envelope;
    if (metrics.stalled && side === suctionSide && rel > sepX) y += side * chord * (rel - sepX) * .25;
    if (foilInterior(x, y, controls, metrics, layout).inside) continue;
    ctx.beginPath(); ctx.arc(x, y, p.size * .75, 0, Math.PI * 2); ctx.fillStyle = 'rgba(199,238,241,.60)'; ctx.fill();
  }

  // Alternating Kármán-like vortex cells are emitted behind the modeled separation point.
  if (metrics.stalled && motionAllowed) {
    const wakeStart = centerX + chord * (sepX + .37);
    for (let i = 0; i < 7; i += 1) {
      const stream = (tick * speedScale * .035 + i * .145) % 1; const x = wakeStart + stream * chord * 1.08;
      const y = centerY + Math.sin(tick * 1.9 + i * 1.7) * (9 + i * 1.3) + (i % 2 ? 8 : -8);
      const r = 7 + (i % 3) * 2.3; ctx.beginPath(); ctx.ellipse(x, y, r * 1.22, r * .67, .18 * Math.sin(tick + i), .25, Math.PI * 1.82);
      ctx.strokeStyle = `rgba(238,136,117,${.55 - i * .045})`; ctx.lineWidth = 1.15; ctx.stroke();
    }
  }

  // Separation indicator marks the exact modeled upper-side chord station.
  if (metrics.stalled) {
    const surface = surfaceY(metrics.foilUpper, sepX); const localX = (sepX - .5) * chord; const localY = -surface * chord;
    const angle = -alphaRad; const x = centerX + localX * Math.cos(angle) - localY * Math.sin(angle); const y = centerY + localX * Math.sin(angle) + localY * Math.cos(angle);
    const pulse = motionAllowed ? 1 + .18 * Math.sin(tick * 3.2) : 1;
    ctx.beginPath(); ctx.arc(x, y, 5.4 * pulse, 0, Math.PI * 2); ctx.fillStyle = 'rgba(247,127,99,.22)'; ctx.fill(); ctx.strokeStyle = '#ff9b7b'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.setLineDash([3, 3]); ctx.moveTo(x, y - 2); ctx.lineTo(x, tunnel.y + 14); ctx.strokeStyle = 'rgba(252,153,126,.66)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    drawLabel(ctx, `x_sep/c ${sepX.toFixed(2)}`, x + 7, tunnel.y + 17, '#ffb09a', 6.2);
  }

  // Live pitch protractor follows the pointer while the foil is being dragged.
  if (protractorPoint) {
    const angle = -alphaRad; const radius = chord * .30;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, angle, angle < 0); ctx.strokeStyle = '#ffe08d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX + Math.cos(angle) * radius * 1.18, centerY + Math.sin(angle) * radius * 1.18); ctx.strokeStyle = '#ffe08d'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(centerX - radius * .55, centerY); ctx.lineTo(centerX + radius * .55, centerY); ctx.strokeStyle = 'rgba(255,224,141,.52)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(protractorPoint.x, protractorPoint.y, 4, 0, Math.PI * 2); ctx.strokeStyle = '#fff2c7'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fff0bd'; ctx.font = '700 9px ui-monospace, monospace'; ctx.fillText(`α ${controls.alphaDeg.toFixed(1)}°`, centerX + 10, centerY - 12);
  }
  ctx.restore();

  // Pressure-sensitive curved menisci settle with a restrained oscillation in each tube.
  const { bankX, bankY, tubeW, gap, baseline } = layout;
  for (let i = 0; i < 17; i += 1) {
    const x = bankX + i * (tubeW + gap); const tap = metrics.taps[i]; const head = tap ? clamp(tap.heightMm, -48, 48) : 0;
    const base = clamp(baseline - head * .55, bankY + 7, baseline - 2);
    const settling = running && motionAllowed ? Math.sin(tick * .85 + i * .71) * .9 : 0; const level = base + settling;
    const selected = selectedTap === i + 1;
    const color = selected ? 'rgba(255,239,190,.96)' : tap?.surface === 'Upper' ? 'rgba(248,166,158,.90)' : tap ? 'rgba(166,213,248,.90)' : 'rgba(226,241,243,.92)';
    ctx.beginPath(); ctx.moveTo(x + 1, level); ctx.quadraticCurveTo(x + tubeW / 2, level + 1.2, x + tubeW - 1, level); ctx.strokeStyle = color; ctx.lineWidth = selected ? 1.6 : 1.1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + tubeW / 2, level, Math.max(1.2, tubeW * .24), .9, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }
}


export function inspectAerofoilPoint(
  point: ScenePoint,
  w: number,
  h: number,
  controls: AerofoilControls,
  metrics: AerofoilMetrics,
  densityKgM3: number,
  ambientPressurePa: number,
): AerofoilInspectReading {
  const layout = getAerofoilLayout(w, h); const angle = -controls.alphaDeg * Math.PI / 180;
  const dx = point.x - layout.centerX; const dy = point.y - layout.centerY;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle); const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const xC = localX / layout.chord + .5; const yC = -localY / layout.chord;
  const upperSide = yC >= 0; const surface = upperSide ? surfaceY(metrics.foilUpper, clamp(xC, 0, 1)) : surfaceY(metrics.foilLower, clamp(xC, 0, 1));
  const cpCurve = pressureAt(upperSide ? metrics.upper : metrics.lower, clamp(xC, 0, 1));
  const distance = xC < 0 || xC > 1 ? 1 : Math.abs(yC - surface);
  const fieldCp = cpCurve * Math.exp(-Math.max(0, distance - .014) * 5.2);
  const qInf = .5 * densityKgM3 * controls.airspeedMs ** 2;
  return { xC, yC, velocityMs: controls.airspeedMs * Math.sqrt(Math.max(.025, 1 - fieldCp)), pressurePa: ambientPressurePa + fieldCp * qInf };
}
