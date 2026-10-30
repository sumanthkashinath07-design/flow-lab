import type { DyeColor, FlowRegime } from '../../types';
import type { ScenePoint } from '../shared/viewport';
import { drawLabel, roundedRect } from '../shared/canvas';

export interface ReynoldsParticle { x: number; y: number; phase: number; size: number; speed: number }
export interface ReynoldsLayout {
  tankX: number; tankY: number; tankW: number; tankH: number;
  pipeStart: number; pipeEnd: number; pipeY: number; pipeHeight: number;
  valveX: number; valveY: number; catchX: number; catchY: number; catchW: number; catchH: number;
  spoutX: number; spoutY: number;
}
export interface ReynoldsInspectReading { xM: number; yMm: number; velocityMs: number; pressurePa: number }

const dyeColors: Record<DyeColor, string> = {
  'Royal Blue': '#5798ff',
  'Crimson Red': '#ff536b',
  'Fluorescent Green': '#a7ef52',
  'Midnight Black': '#dce8eb',
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getReynoldsLayout(w: number, h: number, diameterMm: number): ReynoldsLayout {
  const tankX = w * 0.055; const tankY = h * 0.29; const tankW = w * 0.145; const tankH = h * 0.31;
  const pipeStart = w * 0.22; const pipeEnd = w * 0.78; const pipeY = h * 0.545;
  const pipeHeight = Math.max(22, h * (0.06 + diameterMm * 0.0004));
  const valveX = pipeEnd - 9; const valveY = pipeY - 22;
  const catchX = w * 0.835; const catchY = h * 0.72; const catchW = w * 0.12; const catchH = h * 0.2;
  return { tankX, tankY, tankW, tankH, pipeStart, pipeEnd, pipeY, pipeHeight, valveX, valveY, catchX, catchY, catchW, catchH, spoutX: pipeEnd + 27, spoutY: pipeY + h * 0.18 };
}

function grid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0f1b25'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(154,180,196,.055)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function metalGradient(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, '#344a56'); gradient.addColorStop(0.18, '#c4d0d3'); gradient.addColorStop(0.38, '#657b85');
  gradient.addColorStop(0.62, '#e2e9e8'); gradient.addColorStop(0.82, '#687e88'); gradient.addColorStop(1, '#364b56');
  return gradient;
}

export function drawReynoldsBase(ctx: CanvasRenderingContext2D, w: number, h: number, diameterMm: number, opening: number) {
  grid(ctx, w, h);
  const g = getReynoldsLayout(w, h, diameterMm);
  drawLabel(ctx, 'OSBORNE REYNOLDS APPARATUS', 20, 24, '#b6c9d3', 9);
  drawLabel(ctx, 'TEST SECTION · 1.0 m', w * 0.40, g.pipeY - g.pipeHeight * 0.77, '#7e9aa7', 7);

  // Rigid brushed-steel frame and feet.
  ctx.save(); roundedRect(ctx, w * 0.035, h * 0.13, w * 0.93, h * 0.78, 12);
  ctx.strokeStyle = 'rgba(189,207,212,.27)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.07, h * 0.90); ctx.lineTo(w * 0.93, h * 0.90); ctx.strokeStyle = metalGradient(ctx, 0, h * 0.9, 0, h * 0.91); ctx.lineWidth = 5; ctx.stroke();
  for (const x of [w * 0.11, w * 0.49, w * 0.88]) {
    ctx.beginPath(); ctx.moveTo(x, h * 0.83); ctx.lineTo(x, h * 0.90); ctx.strokeStyle = metalGradient(ctx, x, 0, x + 10, 0); ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, h * 0.90, 2, 0, Math.PI * 2); ctx.fillStyle = '#dce5e6'; ctx.fill();
  }
  ctx.restore();

  // Constant-head glass tank with a visible reference waterline.
  ctx.save(); roundedRect(ctx, g.tankX, g.tankY, g.tankW, g.tankH, 8);
  ctx.fillStyle = 'rgba(156,197,210,.09)'; ctx.fill(); ctx.strokeStyle = '#90aab4'; ctx.lineWidth = 1.5; ctx.stroke();
  const surfaceY = g.tankY + g.tankH * 0.43;
  const water = ctx.createLinearGradient(0, surfaceY, 0, g.tankY + g.tankH);
  water.addColorStop(0, 'rgba(59,185,213,.36)'); water.addColorStop(1, 'rgba(29,94,123,.42)');
  ctx.fillStyle = water; ctx.fillRect(g.tankX + 2, surfaceY, g.tankW - 4, g.tankH * 0.56);
  ctx.strokeStyle = 'rgba(163,230,238,.62)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.tankX + 4, surfaceY); ctx.lineTo(g.tankX + g.tankW - 4, surfaceY); ctx.stroke();
  ctx.strokeStyle = 'rgba(224,243,244,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.tankX + 7, g.tankY + 8); ctx.lineTo(g.tankX + 7, g.tankY + g.tankH - 8); ctx.stroke();
  ctx.restore();
  drawLabel(ctx, 'CONSTANT HEAD', g.tankX - 1, g.tankY + g.tankH + 18, '#a9bdc5', 7);
  drawLabel(ctx, 'OVERFLOW WEIR', g.tankX - 3, g.tankY - 9, '#91a6b0', 6.5);

  // Overflow weir and bell-mouth feed in brushed metal.
  ctx.save(); ctx.strokeStyle = metalGradient(ctx, g.tankX + g.tankW * 0.72, 0, g.tankX + g.tankW * 0.85, 0); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(g.tankX + g.tankW * 0.79, g.tankY - 4); ctx.lineTo(g.tankX + g.tankW * 0.79, g.tankY + 6); ctx.lineTo(g.tankX + g.tankW + 14, g.tankY + 6); ctx.lineTo(g.tankX + g.tankW + 14, g.tankY + 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.tankX + g.tankW, g.pipeY); ctx.lineTo(g.pipeStart + 16, g.pipeY); ctx.stroke();
  ctx.restore();

  // Glass pipe, bell-mouth, stainless flanges and fine calibration ticks.
  const pipeTop = g.pipeY - g.pipeHeight / 2; const pipeBottom = g.pipeY + g.pipeHeight / 2;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(g.pipeStart + 15, pipeTop - 5); ctx.quadraticCurveTo(g.pipeStart - 1, g.pipeY, g.pipeStart + 15, pipeBottom + 5);
  ctx.lineTo(g.pipeStart + 31, pipeBottom); ctx.lineTo(g.pipeStart + 31, pipeTop); ctx.closePath();
  const bell = ctx.createLinearGradient(g.pipeStart, pipeTop, g.pipeStart + 32, pipeBottom); bell.addColorStop(0, 'rgba(164,200,212,.16)'); bell.addColorStop(.5, 'rgba(220,236,239,.35)'); bell.addColorStop(1, 'rgba(85,125,143,.26)');
  ctx.fillStyle = bell; ctx.fill(); ctx.strokeStyle = metalGradient(ctx, g.pipeStart, pipeTop, g.pipeStart + 30, pipeBottom); ctx.lineWidth = 1.6; ctx.stroke();
  roundedRect(ctx, g.pipeStart + 25, pipeTop, g.pipeEnd - g.pipeStart - 25, g.pipeHeight, g.pipeHeight / 2);
  const glass = ctx.createLinearGradient(0, pipeTop, 0, pipeBottom);
  glass.addColorStop(0, 'rgba(209,237,242,.20)'); glass.addColorStop(.22, 'rgba(37,122,150,.19)'); glass.addColorStop(.5, 'rgba(63,157,182,.23)'); glass.addColorStop(.83, 'rgba(19,73,98,.30)'); glass.addColorStop(1, 'rgba(202,233,239,.15)');
  ctx.fillStyle = glass; ctx.fill(); ctx.strokeStyle = '#a3bac3'; ctx.lineWidth = 1.25; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.pipeStart + 40, pipeTop + 3); ctx.lineTo(g.pipeEnd - 12, pipeTop + 3); ctx.strokeStyle = 'rgba(231,247,248,.62)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g.pipeStart + 43, pipeBottom - 3); ctx.lineTo(g.pipeEnd - 12, pipeBottom - 3); ctx.strokeStyle = 'rgba(104,194,216,.35)'; ctx.lineWidth = 1; ctx.stroke();
  for (const x of [g.pipeStart + 30, g.pipeEnd - 7]) {
    ctx.fillStyle = metalGradient(ctx, x - 5, 0, x + 5, 0); ctx.fillRect(x - 4, pipeTop - 4, 8, g.pipeHeight + 8);
    ctx.strokeStyle = 'rgba(240,246,245,.72)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 1, pipeTop - 4); ctx.lineTo(x - 1, pipeBottom + 4); ctx.stroke();
    ctx.fillStyle = '#dce7e9'; ctx.beginPath(); ctx.arc(x, pipeTop - 1, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(178,201,211,.58)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) { const x = g.pipeStart + 39 + i * (g.pipeEnd - g.pipeStart - 51) / 8; ctx.beginPath(); ctx.moveTo(x, pipeBottom + 2); ctx.lineTo(x, pipeBottom + (i % 2 === 0 ? 8 : 5)); ctx.stroke(); }
  ctx.restore();
  drawLabel(ctx, `D ${diameterMm} mm`, (g.pipeStart + g.pipeEnd) / 2 - 18, pipeBottom + 19, '#afc1c8', 7);

  // Dye reservoir, stainless needle and small sight window.
  const dyeX = g.pipeStart + 84; const dyeY = h * 0.19; const dyeW = 38; const dyeH = h * 0.13;
  ctx.save(); roundedRect(ctx, dyeX, dyeY, dyeW, dyeH, 5); ctx.fillStyle = 'rgba(161,200,210,.08)'; ctx.fill(); ctx.strokeStyle = '#809aa5'; ctx.lineWidth = 1.2; ctx.stroke();
  const dyeFill = ctx.createLinearGradient(0, dyeY + dyeH * .45, 0, dyeY + dyeH); dyeFill.addColorStop(0, 'rgba(92,156,255,.48)'); dyeFill.addColorStop(1, 'rgba(35,87,151,.60)');
  ctx.fillStyle = dyeFill; ctx.fillRect(dyeX + 3, dyeY + dyeH * .45, dyeW - 6, dyeH * .52);
  ctx.strokeStyle = metalGradient(ctx, dyeX + 19, dyeY + dyeH, dyeX + 20, g.pipeY); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(dyeX + 19, dyeY + dyeH); ctx.lineTo(dyeX + 19, g.pipeY - g.pipeHeight * .5); ctx.stroke();
  ctx.beginPath(); ctx.arc(dyeX + 19, g.pipeY - g.pipeHeight * .5, 2.4, 0, Math.PI * 2); ctx.fillStyle = '#b3c4ca'; ctx.fill();
  ctx.restore(); drawLabel(ctx, 'DYE RESERVOIR', dyeX - 7, dyeY - 8, '#a6b9c1', 6.5);

  // Rotary downstream control wheel, indexed to the same slider value.
  ctx.save(); ctx.strokeStyle = metalGradient(ctx, g.valveX - 14, g.valveY - 14, g.valveX + 14, g.valveY + 14); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(g.valveX, g.pipeY - 12); ctx.lineTo(g.valveX, g.valveY + 11); ctx.stroke();
  ctx.beginPath(); ctx.arc(g.valveX, g.valveY, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(15,27,35,.9)'; ctx.fill(); ctx.stroke();
  for (let spoke = 0; spoke < 6; spoke += 1) { const a = (spoke / 6) * Math.PI * 2 + (opening / 100) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(g.valveX, g.valveY); ctx.lineTo(g.valveX + Math.cos(a) * 10, g.valveY + Math.sin(a) * 10); ctx.strokeStyle = '#b9c7ca'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(g.valveX, g.valveY, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#55d5e7'; ctx.fill();
  ctx.restore();
  drawLabel(ctx, `VALVE ${opening.toFixed(1)}%`, g.valveX - 29, g.valveY - 18, '#74ddec', 6.2);

  // Discharge spout and graduated glass collection cylinder; its liquid is animated on the flow layer.
  ctx.save(); ctx.strokeStyle = metalGradient(ctx, g.pipeEnd, g.pipeY, g.spoutX, g.spoutY); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(g.pipeEnd - 3, g.pipeY); ctx.lineTo(g.pipeEnd + 16, g.pipeY); ctx.lineTo(g.spoutX, g.spoutY); ctx.stroke();
  ctx.beginPath(); ctx.arc(g.spoutX, g.spoutY, 2.3, 0, Math.PI * 2); ctx.fillStyle = '#e3ecec'; ctx.fill();
  roundedRect(ctx, g.catchX, g.catchY, g.catchW, g.catchH, 4); ctx.fillStyle = 'rgba(177,210,217,.08)'; ctx.fill(); ctx.strokeStyle = '#91aab4'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(222,242,244,.32)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(g.catchX + 5, g.catchY + 8); ctx.lineTo(g.catchX + 5, g.catchY + g.catchH - 6); ctx.stroke();
  for (let i = 0; i <= 4; i += 1) { const y = g.catchY + g.catchH * (0.12 + i * .17); ctx.beginPath(); ctx.moveTo(g.catchX + g.catchW - 12, y); ctx.lineTo(g.catchX + g.catchW - 4, y); ctx.strokeStyle = 'rgba(209,227,231,.55)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore(); drawLabel(ctx, 'COLLECTION · mL', g.catchX - 7, g.catchY + g.catchH + 13, '#a6b9c1', 6.5);
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y); ctx.lineTo(x + length - 4, y - 2.5); ctx.moveTo(x + length, y); ctx.lineTo(x + length - 4, y + 2.5); ctx.strokeStyle = color; ctx.lineWidth = 1.1; ctx.stroke();
}

function profileSpeed(regime: FlowRegime, radial: number) {
  const laminar = Math.max(0, 1 - radial * radial);
  const turbulent = Math.pow(Math.max(0, 1 - radial), 1 / 7);
  return regime === 'LAMINAR' ? laminar : regime === 'TURBULENT' ? turbulent : laminar * .5 + turbulent * .5;
}

export function drawReynoldsFlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  diameterMm: number,
  regime: FlowRegime,
  dyeColor: DyeColor,
  particles: ReynoldsParticle[],
  phase: number,
  running: boolean,
  dyeRate: number,
  meanVelocityMs: number,
  tankVolumeMl: number,
  showVelocityProfile: boolean,
) {
  ctx.clearRect(0, 0, w, h);
  const g = getReynoldsLayout(w, h, diameterMm);
  const color = dyeColors[dyeColor]; const pipeRadius = g.pipeHeight / 2 - 2;
  const speedScale = clamp(meanVelocityMs / .25, .16, 4.5);
  const wavePhase = phase * (1.2 + speedScale * .32);

  // Subtle free-surface oscillation in the constant-head tank.
  ctx.save();
  const surfaceY = g.tankY + g.tankH * .43; ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) { const x = g.tankX + 3 + (g.tankW - 6) * i / 24; const y = surfaceY + Math.sin(wavePhase * 2 + i * .38) * (running ? 1.3 : 0.45); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.strokeStyle = 'rgba(172,239,243,.84)'; ctx.lineWidth = 1.1; ctx.stroke();
  if (running) {
    ctx.beginPath(); ctx.moveTo(g.tankX + g.tankW * .79, g.tankY + 5); ctx.bezierCurveTo(g.tankX + g.tankW * .83, g.tankY + 8, g.tankX + g.tankW + 12, g.tankY + 4, g.tankX + g.tankW + 14, g.tankY + 19);
    ctx.strokeStyle = 'rgba(86,208,225,.78)'; ctx.lineWidth = 2.1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.tankX + g.tankW * .4, surfaceY + 3); ctx.lineTo(g.tankX + g.tankW * .4, g.pipeY - 5); ctx.strokeStyle = 'rgba(88,205,222,.32)'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();

  // Advected dye in a clipped transparent pipe; speed follows the calculated mean velocity.
  const start = g.pipeStart + 31; const end = g.pipeEnd - 4; const center = g.pipeY;
  ctx.save(); ctx.beginPath(); ctx.rect(start, center - pipeRadius, end - start, pipeRadius * 2); ctx.clip();
  if (dyeRate > 0.01 && regime === 'LAMINAR') {
    ctx.beginPath(); ctx.moveTo(start, center); ctx.lineTo(end, center); ctx.strokeStyle = color; ctx.lineWidth = 2.15; ctx.shadowColor = color; ctx.shadowBlur = 7; ctx.stroke(); ctx.shadowBlur = 0;
    const count = Math.min(26, particles.length);
    for (let i = 0; i < count; i += 1) { const p = particles[i]; const progress = (p.x + phase * p.speed * speedScale * .06) % 1; const x = start + progress * (end - start); ctx.beginPath(); ctx.arc(x, center, p.size * 1.15, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = .42 + (i % 4) * .12; ctx.fill(); }
  } else if (dyeRate > 0.01 && regime === 'TRANSITIONAL') {
    ctx.beginPath();
    for (let i = 0; i <= 112; i += 1) { const t = i / 112; const x = start + t * (end - start); const growth = Math.max(0, (t - .12) / .88); const wave = Math.sin(t * 9.5 * Math.PI - wavePhase * 1.8) * pipeRadius * growth * .56; if (i === 0) ctx.moveTo(x, center); ctx.lineTo(x, center + wave); }
    ctx.strokeStyle = color; ctx.lineWidth = 2.1; ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < Math.min(32, particles.length); i += 1) { const p = particles[i]; const progress = (p.x + phase * p.speed * speedScale * .045) % 1; const growth = Math.max(0, (progress - .12) / .88); const x = start + progress * (end - start); const y = center + Math.sin(progress * 9.5 * Math.PI - wavePhase * 1.8) * pipeRadius * growth * .56; ctx.beginPath(); ctx.arc(x, y, p.size + .25, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = .52; ctx.fill(); }
    for (let puff = 0; puff < 4; puff += 1) { const progress = (puff * .28 + phase * speedScale * .035) % 1; if (progress < .3 || progress > .86) continue; const x = start + progress * (end - start); const y = center + Math.sin(progress * 9.5 * Math.PI - wavePhase * 1.8) * pipeRadius * .35; const r = pipeRadius * (.18 + .05 * Math.sin(wavePhase + puff)); ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * .7, wavePhase * .4, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,190,103,.8)'; ctx.lineWidth = 1.1; ctx.stroke(); }
  } else if (dyeRate > 0.01) {
    const visible = Math.min(particles.length, Math.max(30, Math.round(46 + dyeRate * 13)));
    for (let i = 0; i < visible; i += 1) { const p = particles[i]; const progress = (p.x + phase * p.speed * speedScale * .055) % 1; const x = start + progress * (end - start); const swirlA = Math.sin(wavePhase * 2.1 + p.phase + progress * 15); const swirlB = Math.cos(wavePhase * 1.55 + p.phase * 1.4 + progress * 22); const y = center + (p.y * .9 + swirlA * .31 + swirlB * .14) * pipeRadius * 1.45; ctx.beginPath(); ctx.arc(x, y, p.size * (1 + Math.abs(swirlA) * .35), 0, Math.PI * 2); ctx.fillStyle = i % 7 === 0 ? '#d7f4f4' : color; ctx.globalAlpha = Math.max(.06, (.7 - progress * .42) * (.5 + (i % 5) * .1)); ctx.fill(); }
    for (let swirl = 0; swirl < 5; swirl += 1) { const progress = (swirl * .19 + phase * speedScale * .018) % 1; const x = start + (.2 + progress * .73) * (end - start); const y = center + Math.sin(wavePhase + swirl * 1.8) * pipeRadius * .28; const radius = pipeRadius * (.25 + .08 * (swirl % 3)); ctx.beginPath(); ctx.ellipse(x, y, radius * 1.3, radius * .63, wavePhase * .32 + swirl, .35, Math.PI * 1.85); ctx.strokeStyle = 'rgba(204,242,242,.42)'; ctx.lineWidth = 1.1; ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.restore();

  if (showVelocityProfile) {
    ctx.save(); ctx.beginPath(); ctx.rect(start, center - pipeRadius + 1, end - start, pipeRadius * 2 - 2); ctx.clip();
    const stations = [start + (end - start) * .28, start + (end - start) * .53, start + (end - start) * .78];
    for (let station = 0; station < stations.length; station += 1) {
      for (let i = -4; i <= 4; i += 1) { const r = Math.abs(i) / 5; const local = profileSpeed(regime, r); const x = stations[station]; const y = center + i * pipeRadius * .17; const length = 3 + local * Math.min(21, pipeRadius * .62); drawArrow(ctx, x, y, length, `rgba(139,235,241,${.38 + local * .55})`); }
    }
    ctx.restore(); drawLabel(ctx, regime === 'TURBULENT' ? 'u(r) · 1/7 POWER' : regime === 'TRANSITIONAL' ? 'u(r) · TRANSITION' : 'u(r) · POISEUILLE', start + 3, center - pipeRadius - 6, '#8fe7ed', 6.1);
  }

  // Collection cylinder: volume comes from the same Q × stopwatch state used by the controls.
  const fill = clamp(tankVolumeMl / 560, 0, .91); const liquidY = g.catchY + g.catchH * (1 - fill);
  if (fill > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(g.catchX + 2, g.catchY + 2, g.catchW - 4, g.catchH - 4); ctx.clip();
    const water = ctx.createLinearGradient(0, liquidY, 0, g.catchY + g.catchH); water.addColorStop(0, 'rgba(117,224,235,.68)'); water.addColorStop(.25, 'rgba(48,168,198,.54)'); water.addColorStop(1, 'rgba(26,93,125,.67)');
    ctx.fillStyle = water; ctx.fillRect(g.catchX + 2, liquidY, g.catchW - 4, g.catchY + g.catchH - liquidY);
    ctx.beginPath(); for (let i = 0; i <= 14; i += 1) { const x = g.catchX + 3 + (g.catchW - 6) * i / 14; const y = liquidY + Math.sin(wavePhase * 2 + i * .72) * (running ? 1.3 : .35); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = 'rgba(211,249,248,.9)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
  }
  if (running && meanVelocityMs > .001) {
    const streamBottom = Math.min(g.catchY + g.catchH - 6, g.spoutY + 35);
    ctx.save(); const stream = ctx.createLinearGradient(g.spoutX - 2, g.spoutY, g.spoutX + 3, streamBottom); stream.addColorStop(0, 'rgba(156,239,245,.96)'); stream.addColorStop(1, 'rgba(41,166,199,.74)');
    ctx.strokeStyle = stream; ctx.lineWidth = clamp(1.4 + meanVelocityMs * 2.1, 1.5, 4.5); ctx.beginPath(); ctx.moveTo(g.spoutX, g.spoutY); ctx.bezierCurveTo(g.spoutX + 2, g.spoutY + 8, g.spoutX - 2, streamBottom - 8, g.spoutX, streamBottom); ctx.stroke();
    for (let i = 0; i < 5; i += 1) { const pulse = (phase * speedScale * .35 + i * .21) % 1; const y = g.spoutY + pulse * (streamBottom - g.spoutY); const x = g.spoutX + Math.sin(phase * 2 + i) * 1.8; ctx.beginPath(); ctx.ellipse(x, y, 1.2, 2.1, .1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(197,247,248,.88)'; ctx.fill(); }
    for (let i = 0; i < 4; i += 1) { const angle = phase * 3 + i * Math.PI / 2; const x = g.spoutX + Math.cos(angle) * (5 + (i % 2) * 3); const y = streamBottom - 2 - Math.abs(Math.sin(angle)) * 6; ctx.beginPath(); ctx.arc(x, y, 1.1 + (i % 2) * .35, 0, Math.PI * 2); ctx.fillStyle = 'rgba(179,240,245,.82)'; ctx.fill(); }
    ctx.restore();
  }
}

export function inspectReynoldsPoint(
  point: ScenePoint,
  w: number,
  h: number,
  diameterMm: number,
  regime: FlowRegime,
  meanVelocityMs: number,
  reynolds: number,
  densityKgM3: number,
  ambientPressurePa: number,
): ReynoldsInspectReading {
  const g = getReynoldsLayout(w, h, diameterMm);
  const xFraction = (point.x - (g.pipeStart + 31)) / Math.max(1, g.pipeEnd - g.pipeStart - 35);
  const yNorm = (point.y - g.pipeY) / Math.max(1, g.pipeHeight / 2 - 2);
  const inside = xFraction >= 0 && xFraction <= 1 && Math.abs(yNorm) <= 1;
  const radial = Math.min(1, Math.abs(yNorm));
  const laminar = 2 * meanVelocityMs * Math.max(0, 1 - radial * radial);
  const turbulent = 1.22 * meanVelocityMs * Math.pow(Math.max(0, 1 - radial), 1 / 7);
  const transitionMix = clamp((reynolds - 2000) / 2000, 0, 1);
  const local = regime === 'LAMINAR' ? laminar : regime === 'TURBULENT' ? turbulent : laminar * (1 - transitionMix) + turbulent * transitionMix;
  const velocityMs = inside ? local : 0;
  const diameterM = diameterMm / 1000; const reSafe = Math.max(1, reynolds);
  const friction = reSafe < 2300 ? 64 / reSafe : .3164 / Math.pow(reSafe, .25);
  const pressureDrop = friction * (1 / Math.max(.001, diameterM)) * .5 * densityKgM3 * meanVelocityMs ** 2;
  const pressurePa = inside ? ambientPressurePa + .5 * densityKgM3 * (meanVelocityMs ** 2 - velocityMs ** 2) + (1 - clamp(xFraction, 0, 1)) * pressureDrop : ambientPressurePa;
  return { xM: xFraction, yMm: yNorm * diameterMm / 2, velocityMs, pressurePa };
}
