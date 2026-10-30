import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, GitCompareArrows, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { RunSnapshot, SnapshotDraft } from '../../types/research';
import { createRunId, MAX_NOTEBOOK_BYTES, MAX_NOTEBOOK_RUNS, mergeNotebookRuns, parseNotebookImport, readNotebook, serializeNotebook, writeNotebook } from '../../utils/researchStorage';

interface Props { draft: SnapshotDraft; onRestore: (snapshot: RunSnapshot) => void; }
function formatMetric(metric: { value: number; unit: string }) { return `${metric.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${metric.unit ? ` ${metric.unit}` : ''}`; }
function dateLabel(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }

export default function NotebookPanel({ draft, onRestore }: Props) {
  const [runs, setRuns] = useState<RunSnapshot[]>(readNotebook);
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!writeNotebook(runs)) setFeedback('Browser storage is full; export the notebook before adding more runs.');
  }, [runs]);

  const availableForCompare = runs.filter((run) => run.experiment === draft.experiment);
  const comparison = availableForCompare.filter((run) => selected.includes(run.id)).slice(0, 3);
  const metricKeys = comparison[0]?.metrics.map((metric) => metric.key) ?? [];
  const defaultLabel = `${draft.experiment === 'reynolds' ? 'Reynolds' : 'Aerofoil'} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  function saveRun() {
    if (runs.length >= MAX_NOTEBOOK_RUNS) {
      setFeedback(`Notebook limit reached (${MAX_NOTEBOOK_RUNS} runs). Export and remove older records before saving.`); return;
    }
    const record: RunSnapshot = { ...draft, id: createRunId(), label: label.trim().slice(0, 100) || defaultLabel, savedAt: new Date().toISOString() };
    setRuns((current) => [record, ...current]); setLabel(''); setFeedback('Run snapshot saved locally.');
  }

  function toggleCompare(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) { setFeedback('Compare up to three runs at a time.'); return current; }
      setFeedback(''); return [...current, id];
    });
  }

  function removeRun(id: string) {
    setRuns((current) => current.filter((run) => run.id !== id));
    setSelected((current) => current.filter((item) => item !== id));
    setFeedback('Saved run removed from this browser.');
  }

  function exportNotebook() {
    const blob = new Blob([serializeNotebook(runs)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `flowlab-run-notebook-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback(`${runs.length} saved ${runs.length === 1 ? 'run' : 'runs'} exported.`);
  }

  async function importNotebook(file?: File) {
    if (!file) return;
    if (file.size > MAX_NOTEBOOK_BYTES) { setFeedback('Notebook files must be 1 MiB or smaller.'); return; }
    try {
      const imported = parseNotebookImport(await file.text());
      const merged = mergeNotebookRuns(runs, imported);
      setRuns(merged); setFeedback(`${imported.length} validated ${imported.length === 1 ? 'run' : 'runs'} imported; duplicate IDs merged.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'The notebook could not be imported.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  return <div className="research-panel notebook-panel">
    <div className="research-panel-intro"><div><span className="research-eyebrow">BROWSER-LOCAL RECORDS · {runs.length}/{MAX_NOTEBOOK_RUNS}</span><h3>Run notebook</h3><p>Save a portable snapshot of conditions and results. Notebook records stay separate from observation rows and Reset Simulation.</p></div><span className="research-context-chip">PRIVATE TO THIS BROWSER</span></div>
    <div className="notebook-save-row"><label className="research-number-field notebook-label-field"><span>SNAPSHOT NAME</span><input type="text" maxLength={100} placeholder={defaultLabel} value={label} onChange={(event) => setLabel(event.target.value)} /></label><button type="button" className="button button-primary" onClick={saveRun} disabled={runs.length >= MAX_NOTEBOOK_RUNS}><Save size={14} /> Save current run</button><button type="button" className="button button-quiet" onClick={exportNotebook}><ArrowDownToLine size={14} /> Export JSON</button><button type="button" className="button button-quiet" onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={14} /> Import JSON</button><input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Choose a FlowLab notebook JSON file" onChange={(event) => void importNotebook(event.target.files?.[0])} /></div>
    {feedback && <p className="research-feedback" role="status">{feedback}</p>}
    {comparison.length > 0 && <section className="compare-card" aria-label="Saved run comparison"><div className="compare-heading"><div><span className="research-eyebrow"><GitCompareArrows size={12} /> BASELINE COMPARISON</span><h4>{comparison.length} {comparison.length === 1 ? 'run' : 'runs'} · {draft.experiment === 'reynolds' ? 'Reynolds' : 'Aerofoil'}</h4></div><button type="button" className="research-quiet-action" onClick={() => setSelected([])}><RotateCcw size={13} /> Clear</button></div><div className="research-table-wrap"><table className="comparison-table"><thead><tr><th>Metric</th>{comparison.map((run, index) => <th key={run.id}>{index === 0 ? 'Baseline' : `Run ${index + 1}`}<small>{run.label}</small></th>)}</tr></thead><tbody>{metricKeys.map((key) => { const base = comparison[0].metrics.find((metric) => metric.key === key); if (!base) return null; return <tr key={key}><th>{base.label}{base.unit && <small>{base.unit}</small>}</th>{comparison.map((run, index) => { const metric = run.metrics.find((item) => item.key === key); const delta = metric && index > 0 && Math.abs(base.value) > 1e-12 ? ((metric.value - base.value) / Math.abs(base.value)) * 100 : null; return <td key={run.id}>{metric ? formatMetric(metric) : '—'}{index > 0 && <small className={delta === null ? '' : delta >= 0 ? 'delta-positive' : 'delta-negative'}>{delta === null ? 'Δ n/a' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}% vs baseline`}</small>}</td>; })}</tr>; })}</tbody></table></div></section>}
    <div className="notebook-list-heading"><h4>Saved runs <span>{runs.length}</span></h4><small>Select up to three from the active experiment to compare.</small></div>
    {runs.length === 0 ? <div className="notebook-empty"><span>◎</span><strong>No saved runs yet</strong><small>Name and save a run to create a portable condition snapshot.</small></div> : <div className="notebook-list">{runs.map((run) => {
      const isCurrentExperiment = run.experiment === draft.experiment;
      const selectedRun = selected.includes(run.id);
      return <article className="notebook-run" key={run.id}>
        <button type="button" className={`notebook-compare ${selectedRun ? 'is-selected' : ''}`} aria-pressed={selectedRun} aria-label={`${selectedRun ? 'Remove from' : 'Add to'} comparison: ${run.label}`} disabled={!isCurrentExperiment || (!selectedRun && selected.length >= 3)} onClick={() => toggleCompare(run.id)}>{selectedRun ? <Check size={13} /> : <GitCompareArrows size={13} />}</button>
        <div className="notebook-run-main"><div className="notebook-run-title"><h5>{run.label}</h5><span className={`research-state-pill ${run.experiment}`}>{run.experiment === 'reynolds' ? 'EXPT 07' : 'EXPT 11'}</span></div><p>{dateLabel(run.savedAt)} · {run.status} · {run.observationCount} observation {run.observationCount === 1 ? 'record' : 'records'}</p><div className="notebook-metrics">{run.metrics.slice(0, 4).map((metric) => <span key={metric.key}><small>{metric.label}</small><b>{formatMetric(metric)}</b></span>)}</div></div>
        <div className="notebook-run-actions"><button type="button" className="research-quiet-action" onClick={() => onRestore(run)}><RotateCcw size={13} /> Load</button><button type="button" className="research-icon-action" aria-label={`Delete saved run ${run.label}`} title="Delete saved run" onClick={() => removeRun(run.id)}><Trash2 size={14} /></button></div>
      </article>;
    })}</div>}
  </div>;
}
