import { BookOpen, ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { aerofoilEquations, reynoldsEquations } from '../data/formulas';
import type { ExperimentId } from '../types';

export default function FormulaPanel({ experiment }: { experiment: ExperimentId }) {
  const [open, setOpen] = useState(false);
  const items = experiment === 'reynolds' ? reynoldsEquations : aerofoilEquations;
  return <section className={`panel-card formula-card ${open ? 'is-open' : ''}`}>
    <button className="formula-toggle" onClick={() => setOpen((state) => !state)} aria-expanded={open}><span className="formula-toggle-icon"><BookOpen size={15} /></span><span><strong>Governing relations</strong><small>Equations & model assumptions</small></span><ChevronDown className="formula-chevron" size={16} /></button>
    {open && <div className="formula-content"><div className="equation-list">{items.map((item) => <div className="equation-row" key={item.symbol}><b>{item.symbol}</b><code>{item.formula}</code><span>{item.note}</span></div>)}</div><div className="assumption-note"><Info size={14} /><span>Educational engineering approximation: particle dispersion, vortex-sheet pressure and stall response are not full-field Navier–Stokes CFD or physical hardware measurements.</span></div></div>}
  </section>;
}
