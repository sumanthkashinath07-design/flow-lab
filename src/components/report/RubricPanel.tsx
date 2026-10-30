import { ClipboardCheck } from 'lucide-react';
import type { RubricScores } from '../../types';

const rubric: { key: keyof RubricScores; title: string; max: number }[] = [
  { key: 'setup', title: 'Apparatus & setup', max: 5 },
  { key: 'procedure', title: 'Procedure & observations', max: 5 },
  { key: 'analysis', title: 'Calculations & interpretation', max: 10 },
  { key: 'presentation', title: 'Record & presentation', max: 5 },
];

export default function RubricPanel({ value, onChange }: { value: RubricScores; onChange: (next: RubricScores) => void }) {
  const total = Object.values(value).reduce((sum, mark) => sum + Number(mark || 0), 0);
  return <section className="panel-card rubric-card"><div className="panel-heading"><div><span className="section-kicker">EVALUATION MODE</span><h2><ClipboardCheck size={16} /> Marks rubric</h2></div><span className="rubric-total">{total}<small>/25</small></span></div>
    <div className="rubric-list">{rubric.map((item) => <label className="rubric-row" key={item.key}><span>{item.title}<small>Maximum {item.max} marks</small></span><div><input type="number" min="0" max={item.max} step="1" value={value[item.key]} onChange={(e) => onChange({ ...value, [item.key]: Math.min(item.max, Math.max(0, Number(e.target.value))) })} /><small>/{item.max}</small></div></label>)}</div>
    <div className="faculty-sign">Faculty signature <span /></div>
  </section>;
}
