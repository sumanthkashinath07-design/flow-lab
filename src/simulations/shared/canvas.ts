export interface CanvasLayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export function fitCanvas(canvas: HTMLCanvasElement): CanvasLayer | null {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return null;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2.25, window.devicePixelRatio || 1);
  const width = Math.max(1, canvas.clientWidth || rect.width);
  const height = Math.max(1, canvas.clientHeight || rect.height);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, context, width, height, dpr };
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = '#96a4b1', size = 9) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}
