import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../data';
import { listDocs, putDoc, slug } from '../lib/db';
import { maxes, partsOf } from '../lib/scores';

export default function MarkEntry() {
  const { students, subjects } = useData();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [subject, setSubject] = useState('');
  const [scores, setScores] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => { listDocs('exams').then(e => { setExams(e); if (e[0]) setExamId(e[0].id); }); }, []);
  useEffect(() => { if (!subject && subjects.length) setSubject(subjects[0].name); }, [subjects, subject]);

  const exam = exams.find(e => e.id === examId);
  const mx = maxes(exam);
  const list = useMemo(() => (exam ? students.filter(s => s.className === exam.className && s.status !== 'inactive') : []), [exam, students]);

  useEffect(() => {
    setMsg('');
    if (!exam || !subject) return;
    getDoc(doc(db, 'marks', `${exam.id}_${slug(subject)}`))
      .then(s => {
        const raw = s.exists() ? s.data().scores || {} : {};
        setScores(Object.fromEntries(Object.entries(raw).map(([id, v]) => {
          const p = partsOf(v);
          return [id, { ca: p.ca === undefined ? '' : String(p.ca), exam: p.exam === undefined ? '' : String(p.exam) }];
        })));
      })
      .catch(() => setScores({}));
  }, [exam, subject]);

  const setField = (id, k, v) => setScores(m => ({ ...m, [id]: { ca: '', exam: '', ...m[id], [k]: v } }));
  const totalNow = (id) => {
    const a = [scores[id]?.ca, scores[id]?.exam].filter(x => x !== undefined && x !== '').map(Number);
    return a.length ? a.reduce((t, x) => t + x, 0) : '';
  };

  async function save() {
    const out = {};
    for (const s of list) {
      const e = scores[s.studentId] || {};
      const entry = {};
      for (const [k, max, label] of [['ca', mx.ca, 'CA'], ['exam', mx.exam, 'Exam']]) {
        if (k === 'ca' && mx.ca === 0) continue;
        if (e[k] === undefined || e[k] === '') continue;
        const n = Number(e[k]);
        if (Number.isNaN(n) || n < 0 || n > max) { setMsg(`${s.name}: ${label} must be from 0 to ${max}.`); return; }
        entry[k] = n;
      }
      if (Object.keys(entry).length) out[s.studentId] = entry;
    }
    await putDoc('marks', `${exam.id}_${slug(subject)}`, { examId: exam.id, subject, scores: out });
    setMsg(`Saved marks for ${Object.keys(out).length} students in ${subject}.`);
  }

  return (
    <>
      <div className="page-head"><div><h2>Mark Entry</h2><p className="muted">Enter CA and Exam marks for one subject at a time.</p></div></div>
      <div className="card">
        <div className="filters">
          <select value={examId} onChange={e => setExamId(e.target.value)}>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name} · {e.className}</option>)}
          </select>
          <select value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
        {!exams.length && <p className="muted empty">No exams yet. Add one on the Examinations page first.</p>}
        {exam && <p className="hint">{mx.ca > 0 ? `CA is out of ${mx.ca}, ` : ''}Exam is out of {mx.exam}, total {mx.total}. Leave a box empty if the student was absent.</p>}
        {exam && list.length > 0 && (
          <div className="mark-head">
            <span>Student</span>{mx.ca > 0 && <span>CA /{mx.ca}</span>}<span>Exam /{mx.exam}</span><span>Total</span>
          </div>
        )}
        {list.map(s => (
          <div key={s.studentId} className="mark-row">
            <span className="mark-name">{s.name}<small className="muted"> {s.studentId}</small></span>
            {mx.ca > 0 && (
              <input className="score" type="number" inputMode="decimal" min="0" max={mx.ca} aria-label={`CA for ${s.name}`}
                value={scores[s.studentId]?.ca ?? ''} onChange={e => setField(s.studentId, 'ca', e.target.value)} />
            )}
            <input className="score" type="number" inputMode="decimal" min="0" max={mx.exam} aria-label={`Exam for ${s.name}`}
              value={scores[s.studentId]?.exam ?? ''} onChange={e => setField(s.studentId, 'exam', e.target.value)} />
            <b className="mark-total">{totalNow(s.studentId)}</b>
          </div>
        ))}
        {msg && <p className="hint">{msg}</p>}
        {exam && list.length > 0 && <button className="btn primary block" onClick={save}>Save marks</button>}
      </div>
    </>
  );
}
