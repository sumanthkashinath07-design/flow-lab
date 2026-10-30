import { useEffect, useState } from 'react';
import { FileDown, FlaskConical, Moon, RotateCcw, Sun, UserRound } from 'lucide-react';

interface Props {
  name: string;
  registration: string;
  onName: (value: string) => void;
  onRegistration: (value: string) => void;
  theme: 'dark' | 'light';
  onTheme: () => void;
  onReset: () => void;
  onReport: () => void;
  reportBusy: boolean;
}

function ApertureMark() {
  return <svg viewBox="0 0 42 42" className="brand-mark" aria-hidden="true"><path d="M7 14.5 21 6l14 8.5v13L21 36 7 27.5z" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="21" cy="21" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M1.5 18.5h12M28.5 18.5h12M1.5 23.5h12M28.5 23.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M19.2 21h3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function SessionHeader({ name, registration, onName, onRegistration, theme, onTheme, onReset, onReport, reportBusy }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return <header className="app-header">
    <div className="header-main">
      <div className="brand-lockup"><ApertureMark /><div className="brand-word"><strong>FLOW<span>/</span>LAB</strong><small>MECHANICS · VIRTUAL BENCH</small></div></div>
      <div className="department-title"><span>DEPARTMENT OF MECHANICAL ENGINEERING</span><h1>Fluid Mechanics Virtual Laboratory</h1></div>
      <div className="header-session"><div className="session-clock"><span className="live-dot" /> LIVE SESSION <b>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</b></div><div className="student-fields"><label><UserRound size={12} /><input aria-label="Student name" value={name} onChange={(e) => onName(e.target.value)} placeholder="Student name" /></label><label><FlaskConical size={12} /><input aria-label="Registration number" value={registration} onChange={(e) => onRegistration(e.target.value)} placeholder="Registration no." /></label></div></div>
      <div className="header-actions"><button className="icon-button" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onTheme}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button><button className="button button-quiet header-reset" aria-label="Reset simulation" onClick={onReset}><RotateCcw size={14} /><span>Reset simulation</span></button><button className="button button-report" aria-label="Generate Lab Report (PDF)" onClick={onReport} disabled={reportBusy}>{reportBusy ? <span className="spinner" /> : <FileDown size={15} />}<span>{reportBusy ? 'Building PDF…' : 'Generate Lab Report (PDF)'}</span></button></div>
    </div>
  </header>;
}
