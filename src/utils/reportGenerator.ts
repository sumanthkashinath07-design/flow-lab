import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AerofoilControls, AerofoilMetrics, AerofoilTapReading, ExperimentId, FluidProperties, ReynoldsControls, ReynoldsReading, RubricScores, SharedEnvironment } from '../types';
import { AEROFOIL_CHORD_M, reynoldsFlow } from '../lib/physics';
import { renderPlotImage } from './plotExport';

export interface ReportInput {
  experiment: ExperimentId;
  studentName: string;
  registration: string;
  environment: SharedEnvironment;
  fluid: FluidProperties;
  reynoldsControls: ReynoldsControls;
  reynoldsElapsed: number;
  reynoldsVolumeMl: number;
  reynoldsRows: ReynoldsReading[];
  aerofoilControls: AerofoilControls;
  aerofoilMetrics: AerofoilMetrics;
  aerofoilRows: AerofoilTapReading[];
  rubric: RubricScores;
}

const palette = {
  ink: [18, 34, 45] as [number, number, number],
  cyan: [28, 157, 176] as [number, number, number],
  lightCyan: [228, 244, 246] as [number, number, number],
  muted: [91, 109, 118] as [number, number, number],
  line: [216, 226, 230] as [number, number, number],
  pale: [244, 248, 249] as [number, number, number],
};
const fontName = 'DejaVu';
const margin = 15;
let fontPromise: Promise<{ regular: string; bold: string }> | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

async function loadFont(file: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
  if (!response.ok) throw new Error(`Could not load report font ${file} (${response.status}).`);
  return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
}

async function embedFonts(doc: jsPDF) {
  fontPromise ??= Promise.all([loadFont('DejaVuSans.ttf'), loadFont('DejaVuSans-Bold.ttf')])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error) => { fontPromise = null; throw error; });
  const fonts = await fontPromise;
  doc.addFileToVFS('DejaVuSans.ttf', fonts.regular);
  doc.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
  doc.addFont('DejaVuSans.ttf', fontName, 'normal');
  doc.addFont('DejaVuSans-Bold.ttf', fontName, 'bold');
}

async function captureRig(): Promise<string | null> {
  const element = document.getElementById('rig-capture');
  if (!element) return null;
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      scale: 2, useCORS: true, backgroundColor: '#101922', logging: false,
      windowWidth: Math.max(element.scrollWidth, 1100),
    });
    return canvas.toDataURL('image/png', 1);
  } catch (error) {
    console.warn('Report apparatus snapshot was skipped.', error);
    return null;
  }
}

async function captureCharts() {
  const graphs = [...document.querySelectorAll<HTMLElement>('#chart-capture .js-plotly-plot')];
  const figures: { image: string | null; title: string; subtitle: string }[] = [];
  for (const graph of graphs) {
    const panel = graph.closest('.plot-panel');
    const title = panel?.querySelector('h3')?.textContent?.trim() || `Experimental plot ${figures.length + 1}`;
    const subtitle = panel?.querySelector('.plot-heading small')?.textContent?.trim() || '';
    try {
      figures.push({ image: await renderPlotImage(graph, 'png', { width: 1600, height: 760, scale: 2 }), title, subtitle });
    } catch (error) {
      console.warn('A report chart snapshot was skipped.', error);
      figures.push({ image: null, title, subtitle });
    }
  }
  return figures;
}

function addSection(doc: jsPDF, title: string, y: number) {
  doc.setFont(fontName, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...palette.cyan);
  doc.text(title.toLocaleUpperCase('en-GB'), margin, y);
  doc.setDrawColor(...palette.line);
  doc.setLineWidth(0.35);
  doc.line(margin, y + 2.2, 195, y + 2.2);
}

function addImage(doc: jsPDF, image: string, x: number, y: number, maxW: number, maxH: number) {
  const props = doc.getImageProperties(image);
  const scale = Math.min(maxW / props.width, maxH / props.height);
  const width = props.width * scale;
  const height = props.height * scale;
  doc.addImage(image, 'PNG', x + (maxW - width) / 2, y, width, height, undefined, 'FAST');
  return height;
}

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y, { lineHeightFactor: 1.28 });
  return y + lines.length * lineHeight;
}

function addInteriorHeader(doc: jsPDF, title: string, pageW: number) {
  doc.setFillColor(...palette.ink);
  doc.rect(0, 0, pageW, 23, 'F');
  doc.setFillColor(...palette.cyan);
  doc.rect(0, 22, pageW, 1, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(247, 250, 250);
  doc.text(title, margin, 14.5);
}

function addFooters(doc: jsPDF, pageW: number, pageH: number) {
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...palette.line);
    doc.setLineWidth(0.25);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...palette.muted);
    doc.text('FLOW / LAB  ·  EDUCATIONAL SIMULATION — NOT PHYSICAL HARDWARE OR FULL CFD', margin, pageH - 8.5);
    doc.text(`${page} / ${count}`, pageW - margin, pageH - 8.5, { align: 'right' });
  }
}

function getReynoldsSample(input: ReportInput) {
  const flow = reynoldsFlow(input.reynoldsControls.valveOpening, input.reynoldsControls.diameterMm, input.fluid);
  const measured = input.reynoldsElapsed > 0 && input.reynoldsVolumeMl > 0;
  const discharge = measured ? input.reynoldsVolumeMl / input.reynoldsElapsed : flow.predictedDischargeCm3s;
  const area = Math.PI * (input.reynoldsControls.diameterMm / 2000) ** 2;
  const velocity = input.reynoldsElapsed > 0 ? discharge * 1e-6 / area : flow.velocityMs;
  const reynolds = input.fluid.rho * velocity * (input.reynoldsControls.diameterMm / 1000) / input.fluid.mu;
  const regime = reynolds < 2000 ? 'Laminar' : reynolds <= 4000 ? 'Transitional' : 'Turbulent';
  return { flow, discharge, area, velocity, reynolds, regime, measured };
}

function addObservationTable(doc: jsPDF, input: ReportInput, y: number) {
  addSection(doc, 'Complete observation record', y);
  if (input.experiment === 'reynolds') {
    const rows = input.reynoldsRows.map((r) => [String(r.trial), r.tankVolumeMl.toFixed(1), r.timeSec.toFixed(1), r.dischargeCm3s.toFixed(2), r.velocityMs.toFixed(3), r.temperatureC.toFixed(1), r.reynolds.toFixed(0), r.regime]);
    autoTable(doc, {
      startY: y + 6,
      head: [['Trial', 'Volume\n(mL)', 'Time\n(s)', 'Q\n(cm³/s)', 'v\n(m/s)', 'T\n(°C)', 'Re', 'Flow regime']],
      body: rows.length ? rows : [['—', 'No observations logged', '', '', '', '', '', '']],
      theme: 'grid',
      styles: { font: fontName, fontSize: 7.2, cellPadding: 2.1, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15, valign: 'middle' },
      headStyles: { fillColor: palette.ink, textColor: [248, 250, 250], fontStyle: 'bold', minCellHeight: 9 },
      alternateRowStyles: { fillColor: palette.pale },
      margin: { left: margin, right: margin, bottom: 18 },
      rowPageBreak: 'avoid', showHead: 'everyPage',
    });
  } else {
    const rows = input.aerofoilRows.map((r) => [String(r.tap), r.surface, r.x.toFixed(3), r.heightMm.toFixed(2), r.deltaPPa.toFixed(2), r.cpExperimental.toFixed(3), r.cpTheoretical.toFixed(3)]);
    autoTable(doc, {
      startY: y + 6,
      head: [['Tap', 'Surface', 'x/c', 'h\n(mm)', 'ΔP\n(Pa)', 'Cp\nmeasured', 'Cp\ntheory']],
      body: rows.length ? rows : [['—', 'No readings logged', '', '', '', '', '']],
      theme: 'grid',
      styles: { font: fontName, fontSize: 7.6, cellPadding: 2.4, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15, valign: 'middle' },
      headStyles: { fillColor: palette.ink, textColor: [248, 250, 250], fontStyle: 'bold', minCellHeight: 9 },
      alternateRowStyles: { fillColor: palette.pale },
      margin: { left: margin, right: margin, bottom: 18 },
      rowPageBreak: 'avoid', showHead: 'everyPage',
    });
  }
}

export async function generateLabReport(input: ReportInput) {
  const [rigImage, chartImages] = await Promise.all([captureRig(), captureCharts()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  await embedFonts(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const isReynolds = input.experiment === 'reynolds';
  const experimentTitle = isReynolds
    ? "Experiment 7 — Determination of Flow Regime Using Reynolds' Experiment"
    : 'Experiment 11 — Determination of Static Pressure Distribution Around an Aerofoil';
  const now = new Date();
  const observations = isReynolds ? input.reynoldsRows : input.aerofoilRows;
  const timestampValue = observations.at(-1)?.timestamp;
  const timestampDate = timestampValue ? new Date(timestampValue) : null;
  const timestampText = timestampDate && !Number.isNaN(timestampDate.getTime())
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(timestampDate)
    : 'Not recorded';
  const generatedText = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(now);

  // 1 — Cover, participant metadata, apparatus image and repeatable test conditions.
  doc.setFillColor(...palette.ink);
  doc.rect(0, 0, pageW, 51, 'F');
  doc.setFillColor(...palette.cyan);
  doc.rect(0, 49, pageW, 2, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(122, 224, 231);
  doc.text('DEPARTMENT OF MECHANICAL ENGINEERING  ·  CO 4', margin, 11);
  doc.setFontSize(15);
  doc.setTextColor(248, 251, 251);
  doc.text('FLUID MECHANICS VIRTUAL LABORATORY', margin, 22);
  doc.setFontSize(9.3);
  const titleLines = doc.splitTextToSize(experimentTitle, 178) as string[];
  doc.text(titleLines, margin, 33, { lineHeightFactor: 1.24 });

  addSection(doc, 'Student and session record', 61);
  autoTable(doc, {
    startY: 66,
    body: [
      ['Student', input.studentName.trim() || 'Not entered', 'Registration number', input.registration.trim() || 'Not entered'],
      ['Course outcome', 'CO 4', 'Latest measurement', timestampText],
      ['Report generated', generatedText, 'Working fluid', `${input.fluid.label} · ${input.environment.temperatureC.toFixed(1)} °C`],
    ],
    theme: 'grid',
    styles: { font: fontName, fontSize: 8, cellPadding: 2.7, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15, valign: 'middle' },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: palette.pale, cellWidth: 31 }, 1: { cellWidth: 59 }, 2: { fontStyle: 'bold', fillColor: palette.pale, cellWidth: 35 }, 3: { cellWidth: 55 } },
    margin: { left: margin, right: margin },
  });
  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 92) + 8;
  addSection(doc, 'Apparatus schematic · live operating state', y);
  y += 6;
  if (rigImage) y += addImage(doc, rigImage, margin, y, pageW - margin * 2, 78) + 7;
  else {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    y = writeWrapped(doc, 'The live apparatus snapshot was not available in this browser session. Numerical results and observations remain available below.', margin, y + 5, 178, 4.2) + 5;
  }
  addSection(doc, 'Apparatus specifications and test conditions', y);
  y += 7;
  const conditions = isReynolds
    ? [
      ['Working-fluid properties', `${input.fluid.label} · T = ${input.environment.temperatureC.toFixed(1)} °C · ρ = ${input.fluid.rho.toFixed(3)} kg/m³ · μ = ${input.fluid.mu.toExponential(3)} Pa·s · ν = ${input.fluid.nu.toExponential(3)} m²/s`],
      ['Test section and flow control', `Transparent pipe · D = ${input.reynoldsControls.diameterMm.toFixed(1)} mm · valve = ${input.reynoldsControls.valveOpening.toFixed(1)}% · dye feed = ${input.reynoldsControls.dyeRateMlMin.toFixed(1)} mL/min`],
      ['Collection and environment', `Collected volume = ${input.reynoldsVolumeMl.toFixed(2)} mL · elapsed time = ${input.reynoldsElapsed.toFixed(2)} s · ambient pressure = ${input.environment.ambientPressurePa.toFixed(0)} Pa · g = ${input.environment.gravity.toFixed(3)} m/s²`],
      ['Property model', input.fluid.modelNote],
    ]
    : [
      ['Working-fluid properties', `${input.fluid.label} · T = ${input.environment.temperatureC.toFixed(1)} °C · ρ = ${input.fluid.rho.toFixed(3)} kg/m³ · μ = ${input.fluid.mu.toExponential(3)} Pa·s`],
      ['Aerofoil and flow', `NACA ${input.aerofoilControls.foilCode} · chord c = ${AEROFOIL_CHORD_M.toFixed(3)} m (fixed reference) · α = ${input.aerofoilControls.alphaDeg.toFixed(1)}° · U∞ = ${input.aerofoilControls.airspeedMs.toFixed(1)} m/s`],
      ['Pressure measurement', `${input.aerofoilControls.manometerFluid} manometer · inclination θ = ${input.aerofoilControls.manometerAngleDeg.toFixed(1)}° · q∞ = ${input.aerofoilMetrics.dynamicPressurePa.toFixed(2)} Pa · P∞ = ${input.environment.ambientPressurePa.toFixed(0)} Pa · g = ${input.environment.gravity.toFixed(3)} m/s²`],
      ['Property model', input.fluid.modelNote],
    ];
  autoTable(doc, {
    startY: y,
    body: conditions,
    theme: 'grid',
    styles: { font: fontName, fontSize: 7.35, cellPadding: 2.4, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15, overflow: 'linebreak', valign: 'top' },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: palette.pale, cellWidth: 43 }, 1: { cellWidth: 'auto' } },
    margin: { left: margin, right: margin, bottom: 19 },
  });

  // 2 — Equations, explicit sample calculation and the full observations table.
  doc.addPage();
  addInteriorHeader(doc, 'CALCULATIONS & OBSERVATION RECORD', pageW);
  addSection(doc, 'Governing relationships and sample calculation', 33);
  const formulaRows: string[][] = [];
  if (isReynolds) {
    const s = getReynoldsSample(input);
    formulaRows.push(
      ['Volumetric flow', 'Q = V/t; mean velocity v = Q/A; circular-pipe area A = πD²/4.'],
      ['Flow regime', 'Re = ρvD/μ = vD/ν. Indicative criteria: laminar Re < 2,000; transitional 2,000–4,000; turbulent Re > 4,000.'],
      ['Current operating point', `${s.measured ? `Measured V = ${input.reynoldsVolumeMl.toFixed(2)} mL and t = ${input.reynoldsElapsed.toFixed(2)} s give Q = ${s.discharge.toFixed(3)} cm³/s.` : `No timed collection recorded; using model-predicted Q = ${s.discharge.toFixed(3)} cm³/s.`} A = ${s.area.toExponential(4)} m²; v = ${s.velocity.toFixed(4)} m/s; Re = ${s.reynolds.toFixed(0)} (${s.regime}).`],
      ['Critical-velocity estimates', `vᶜ₁ = 2,000μ/(ρD) = ${s.flow.lowerCriticalVelocity.toFixed(4)} m/s; vᶜ₂ = 4,000μ/(ρD) = ${s.flow.upperCriticalVelocity.toFixed(4)} m/s.`],
    );
  } else {
    const tap = input.aerofoilMetrics.taps.find((item) => item.tap === 1) ?? input.aerofoilMetrics.taps[0];
    formulaRows.push(
      ['Dynamic pressure', 'q∞ = ½ρU∞².'],
      ['Pressure coefficient', 'Cp = (P − P∞)/q∞; idealized Bernoulli relation Cp ≈ 1 − (V/U∞)².'],
      ['Manometer head', 'Δh = Cp·q∞/(ρₘg sin θ), with sign retained for each pressure tap.'],
      ['Pressure-integrated lift', `CL = ∫₀¹(Cp,lower − Cp,upper)d(x/c), approximated by trapezoidal integration. Current CL = ${input.aerofoilMetrics.liftCoefficient.toFixed(4)}; pressure-drag magnitude CDp = ${input.aerofoilMetrics.pressureDragCoefficient.toFixed(4)}.`],
      ['Example pressure tap', tap ? `Tap ${tap.tap} · ${tap.surface.toLowerCase()} surface · x/c = ${tap.x.toFixed(3)} · Cp,theory = ${tap.cpTheoretical.toFixed(4)} · ΔP = ${tap.deltaPPa.toFixed(2)} Pa · h = ${tap.heightMm.toFixed(2)} mm.` : 'No tap reading is available for this sample calculation.'],
    );
  }
  autoTable(doc, {
    startY: 38, body: formulaRows, theme: 'grid',
    styles: { font: fontName, fontSize: 8, cellPadding: 3, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15, overflow: 'linebreak', valign: 'top' },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: palette.pale, cellWidth: 44 }, 1: { cellWidth: 'auto' } },
    margin: { left: margin, right: margin },
  });
  const formulaEnd = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
  const modelNote = isReynolds
    ? 'Interpretation: the rig is a deterministic educational approximation; it does not resolve the full Navier–Stokes equations or reproduce physical hardware.'
    : 'Interpretation: aerofoil pressure, separation and stall are simplified educational models, not full CFD. CDp is pressure drag; viscous skin-friction drag is omitted.';
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.3);
  doc.setTextColor(...palette.muted);
  const noteEnd = writeWrapped(doc, modelNote, margin, formulaEnd + 5, pageW - margin * 2, 4) + 3;
  addObservationTable(doc, input, noteEnd);

  // 3 — Print-quality white charts, concise result summary, rubric and signature.
  doc.addPage();
  addInteriorHeader(doc, 'RESULTS, EVALUATION & SIGN-OFF', pageW);
  addSection(doc, 'Experimental plots · current conditions', 33);
  const chartW = pageW - margin * 2;
  let chartY = 40;
  for (let i = 0; i < 2; i += 1) {
    const figure = chartImages[i];
    if (figure) {
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...palette.ink);
      doc.text(`Figure ${i + 1}. ${figure.title}`, margin, chartY + 3.5);
      chartY += 5;
      if (figure.subtitle) {
        doc.setFont(fontName, 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(...palette.muted);
        chartY = writeWrapped(doc, figure.subtitle, margin, chartY + 1, chartW, 3.2) + 1;
      }
      if (figure.image) chartY += addImage(doc, figure.image, margin, chartY, chartW, 58) + 4;
      else chartY += 2;
    }
    else {
      doc.setFillColor(...palette.pale);
      doc.roundedRect(margin, chartY, chartW, 22, 1.5, 1.5, 'F');
      doc.setFont(fontName, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...palette.muted);
      doc.text(`Figure ${i + 1} unavailable; use the dashboard SVG/PNG controls to export it directly.`, margin + 5, chartY + 12);
      chartY += 26;
    }
  }
  addSection(doc, 'Key result and interpretation', chartY + 2);
  let summaryY = chartY + 9;
  const result = isReynolds
    ? (() => { const s = getReynoldsSample(input); return `${s.measured ? 'Measured' : 'Model-predicted'} operating point: Re = ${s.reynolds.toFixed(0)} (${s.regime}); Q = ${s.discharge.toFixed(3)} cm³/s; v = ${s.velocity.toFixed(4)} m/s. ${input.reynoldsRows.length} trial(s) logged.`; })()
    : `Operating point: α = ${input.aerofoilControls.alphaDeg.toFixed(1)}°; U∞ = ${input.aerofoilControls.airspeedMs.toFixed(1)} m/s; CL = ${input.aerofoilMetrics.liftCoefficient.toFixed(4)}; CDp = ${input.aerofoilMetrics.pressureDragCoefficient.toFixed(4)}. ${input.aerofoilRows.length} tap reading(s) logged.`;
  doc.setFillColor(...palette.lightCyan);
  doc.roundedRect(margin, summaryY - 4, chartW, 18, 1.5, 1.5, 'F');
  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...palette.ink);
  writeWrapped(doc, result, margin + 4, summaryY + 2, chartW - 8, 4.4);
  summaryY += 22;
  addSection(doc, 'Student evaluation rubric', summaryY);
  const rubricRows = [
    ['Apparatus and setup', String(input.rubric.setup), '5'],
    ['Procedure and observations', String(input.rubric.procedure), '5'],
    ['Calculations and interpretation', String(input.rubric.analysis), '10'],
    ['Record and presentation', String(input.rubric.presentation), '5'],
  ];
  autoTable(doc, {
    startY: summaryY + 5,
    head: [['Assessment criterion', 'Marks awarded', 'Maximum']], body: rubricRows,
    foot: [['Total', String(Object.values(input.rubric).reduce((sum, score) => sum + score, 0)), '25']],
    theme: 'grid',
    styles: { font: fontName, fontSize: 8, cellPadding: 2.5, textColor: [34, 48, 55], lineColor: palette.line, lineWidth: 0.15 },
    headStyles: { fillColor: palette.ink, textColor: [248, 250, 250], fontStyle: 'bold' },
    footStyles: { fillColor: palette.lightCyan, textColor: palette.ink, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: palette.pale },
    margin: { left: margin, right: margin, bottom: 20 },
  });
  const rubricEnd = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? summaryY + 50;
  const signatureY = Math.min(pageH - 30, Math.max(rubricEnd + 9, 264));
  doc.setDrawColor(...palette.muted);
  doc.line(pageW - 82, signatureY, pageW - margin, signatureY);
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...palette.muted);
  doc.text('Faculty signature', pageW - 82, signatureY + 4.5);

  addFooters(doc, pageW, pageH);
  const safeName = (input.studentName || 'student').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'student';
  doc.save(`flowlab-${isReynolds ? 'reynolds' : 'aerofoil'}-${safeName}-${now.toISOString().slice(0, 10)}.pdf`);
}
