import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../data';
import { listDocs } from '../lib/db';
import { ACAD } from '../lib/roles';
import { maxes, partsOf, totalOf } from '../lib/scores';
import Crud from '../components/Crud';
import Seg from '../components/Seg';
import PrintModal from '../components/PrintModal';

export function useGradeFor() {
  const { grades } = useData();
  return (pct) => {
    if (pct === null || pct === undefined) return null;
    const r = Math.round(pct);
    return grades.find(g => r >= Number(g.min) && r <= Number(g.max)) || null;
  };
}

const num = (v) => (typeof v === 'number' ? v : '—');

function ReportCard({ row, exam, total, onClose }) {
  const { school } = useData();
  const gradeFor = useGradeFor();
  const mx = maxes(exam);
  const overall = gradeFor(row.pct);
  return (
    <PrintModal title="Report card" onClose={onClose}>
      <div className="report">
        <div className="report-head">
          <img src={school.logo} alt="" />
          <div><h2>{school.name}</h2><p>{school.address}{school.phone ? ` · Tel ${school.phone}` : ''}</p><b>Terminal report · {exam.name} {exam.term ? `· ${exam.term}` : ''}</b></div>
        </div>
        <div className="report-info">
          <span><b>Name:</b> {row.s.name}</span><span><b>ID:</b> {row.s.studentId}</span>
          <span><b>Class:</b> {row.s.className}</span><span><b>Position:</b> {row.pos} of {total}</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>Subject</th>{mx.ca > 0 && <th>CA (/{mx.ca})</th>}<th>Exam (/{mx.exam})</th><th>Total (/{mx.total})</th><th>%</th><th>Grade</th><th>Remark</th></tr>
          </thead>
          <tbody>
            {row.cells.map(c => {
              const p = c.total === undefined ? null : (c.total / mx.total) * 100;
              const g = gradeFor(p);
              return (
                <tr key={c.subject}>
                  <td>{c.subject}</td>{mx.ca > 0 && <td>{num(c.ca)}</td>}<td>{num(c.exam)}</td><td><b>{c.total ?? '—'}</b></td>
                  <td>{p === null ? '—' : Math.round(p)}</td><td>{g ? g.grade : '—'}</td><td>{g ? g.remark : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p><b>Total:</b> {row.total} · <b>Average:</b> {row.pct === null ? '—' : `${Math.round(row.pct)}%`} · <b>Overall grade:</b> {overall ? `${overall.grade} (${overall.remark})` : '—'}</p>
        <label className="field">Class teacher's remark<textarea rows={2} placeholder="Type a remark before printing" /></label>
        <div className="sign"><span>Class teacher</span><span>Head teacher</span></div>
      </div>
    </PrintModal>
  );
}

function Results() {
  const { students } = useData();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [marks, setMarks] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => { listDocs('exams').then(e => { setExams(e); if (e[0]) setExamId(e[0].id); }); }, []);
  const exam = exams.find(e => e.id === examId);

  useEffect(() => {
    if (!examId) return;
    setMarks(null);
    getDocs(query(collection(db, 'marks'), where('examId', '==', examId))).then(s => setMarks(s.docs.map(d => d.data()))).catch(() => setMarks([]));
  }, [examId]);

  const data = useMemo(() => {
    if (!exam || !marks) return null;
    const mx = maxes(exam);
    const subjects = marks.map(m => m.subject).sort();
    const rows = students.filter(s => s.className === exam.className && s.status !== 'inactive').map(s => {
      const cells = subjects.map(sub => {
        const v = marks.find(m => m.subject === sub)?.scores?.[s.studentId];
        const p = partsOf(v);
        return { subject: sub, ca: p.ca, exam: p.exam, total: totalOf(v) };
      });
      const entered = cells.filter(c => typeof c.total === 'number');
      const total = entered.reduce((t, c) => t + c.total, 0);
      return { s, cells, total, pct: entered.length ? (total / (entered.length * mx.total)) * 100 : null };
    }).sort((a, b) => b.total - a.total);
    rows.forEach((r, i) => { r.pos = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].pos : i + 1; });
    return { subjects, rows, mx };
  }, [exam, marks, students]);

  const gradeFor = useGradeFor();
  const per = data ? (data.mx.ca > 0 ? 3 : 2) : 3;

  return (
    <div className="card">
      <div className="filters">
        <select value={examId} onChange={e => setExamId(e.target.value)}>
          {exams.map(e => <option key={e.id} value={e.id}>{e.name} · {e.className}</option>)}
        </select>
      </div>
      {!exams.length && <p className="muted empty">Add an exam first, then enter marks.</p>}
      {data && (
        <div className="table-wrap">
          <table className="table grouped">
            <thead>
              <tr><th rowSpan={2}>Pos</th><th rowSpan={2}>Student</th>
                {data.subjects.map(s => <th key={s} colSpan={per} className="group">{s}</th>)}
                <th rowSpan={2}>Total</th><th rowSpan={2}>Avg %</th><th rowSpan={2}>Grade</th><th rowSpan={2} /></tr>
              <tr>{data.subjects.map(s => (
                <FragmentCols key={s} ca={data.mx.ca} exam={data.mx.exam} total={data.mx.total} />
              ))}</tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.s.studentId}>
                  <td>{r.pos}</td><td>{r.s.name}</td>
                  {r.cells.map(c => (
                    <FragmentCells key={c.subject} c={c} showCa={data.mx.ca > 0} />
                  ))}
                  <td><b>{r.total}</b></td><td>{r.pct === null ? '—' : Math.round(r.pct)}</td><td>{gradeFor(r.pct)?.grade ?? '—'}</td>
                  <td><button className="btn" onClick={() => setReport(r)}>Report</button></td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={data.subjects.length * per + 6} className="muted empty">No active students in {exam.className}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && data.subjects.length === 0 && <p className="hint">No marks entered for this exam yet. Use Mark Entry.</p>}
      {report && <ReportCard row={report} exam={exam} total={data.rows.length} onClose={() => setReport(null)} />}
    </div>
  );
}

function FragmentCols({ ca, exam, total }) {
  return (
    <>
      {ca > 0 && <th className="sub">CA /{ca}</th>}
      <th className="sub">Exam /{exam}</th>
      <th className="sub">Total /{total}</th>
    </>
  );
}
function FragmentCells({ c, showCa }) {
  return (
    <>
      {showCa && <td>{num(c.ca)}</td>}
      <td>{num(c.exam)}</td>
      <td><b>{c.total ?? '—'}</b></td>
    </>
  );
}

export default function Exams() {
  const { classNames, terms } = useData();
  const [tab, setTab] = useState('exams');
  const fields = [
    { key: 'name', label: 'Exam name', required: true, placeholder: 'End of term exam' },
    { key: 'term', label: 'Term', type: 'select', options: [...new Set(terms.map(t => t.name))] },
    { key: 'className', label: 'Class', type: 'select', options: classNames, required: true },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'caMax', label: 'CA (continuous assessment) marks, out of', type: 'number', default: 40, required: true },
    { key: 'examMax', label: 'Exam marks, out of', type: 'number', default: 60, required: true },
  ];
  const transform = (d) => ({ ...d, maxScore: (Number(d.caMax) || 0) + (Number(d.examMax) || 0) });
  return (
    <>
      <div className="page-head"><div><h2>Examinations</h2><p className="muted">Set up exams (CA + Exam), then view results and print report cards.</p></div></div>
      <Seg tabs={[['exams', 'Exams'], ['results', 'Results']]} value={tab} onChange={setTab} />
      {tab === 'exams'
        ? <Crud title="Exams" col="exams" compact fields={fields} transform={transform} editRoles={ACAD} singular="exam" addLabel="Add"
          hint="Default split is CA 40 and Exam 60, so each subject totals 100. Change it per exam if needed."
          sort={(a, b) => (b.date || '').localeCompare(a.date || '')} emptyText="No exams yet. Add one to start entering marks." />
        : <Results />}
    </>
  );
}
