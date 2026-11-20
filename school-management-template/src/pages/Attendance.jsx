import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { useData } from '../data';
import { putDoc, slug, today } from '../lib/db';
import Seg from '../components/Seg';

const OPTS = [['P', 'Present'], ['A', 'Absent'], ['L', 'Late']];

function Mark({ cls }) {
  const { profile } = useAuth();
  const { students } = useData();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const [msg, setMsg] = useState('');
  const list = useMemo(() => students.filter(s => s.className === cls && s.status !== 'inactive'), [students, cls]);
  const val = (id) => marks[id] || 'P';

  useEffect(() => {
    setMsg('');
    if (!cls) return;
    getDoc(doc(db, 'attendance', `${slug(cls)}_${date}`))
      .then(s => setMarks(s.exists() ? s.data().records || {} : {}))
      .catch(() => setMarks({}));
  }, [cls, date]);

  async function save() {
    const records = Object.fromEntries(list.map(s => [s.studentId, val(s.studentId)]));
    await putDoc('attendance', `${slug(cls)}_${date}`, { className: cls, date, records, savedBy: profile.name });
    setMsg(`Saved ${list.length} students for ${date}.`);
  }

  const count = (k) => list.filter(s => val(s.studentId) === k).length;

  return (
    <div className="card">
      <div className="filters">
        <label className="field inline">Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <button className="btn" onClick={() => setMarks(Object.fromEntries(list.map(s => [s.studentId, 'P'])))}>Mark all present</button>
      </div>
      <p className="hint">Present {count('P')} · Absent {count('A')} · Late {count('L')}</p>
      {list.map(s => (
        <div key={s.studentId} className="att-row">
          <span>{s.name}<small className="muted"> {s.studentId}</small></span>
          <div className="att-btns">
            {OPTS.map(([k, label]) => (
              <button key={k} className={`${k} ${val(s.studentId) === k ? 'on' : ''}`} onClick={() => setMarks(m => ({ ...m, [s.studentId]: k }))} aria-label={label} title={label}>{k}</button>
            ))}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="muted empty">No active students in this class.</p>}
      {msg && <p className="hint">{msg}</p>}
      {list.length > 0 && <button className="btn primary block" onClick={save}>Save attendance</button>}
    </div>
  );
}

function Report({ cls }) {
  const { students } = useData();
  const [from, setFrom] = useState(today().slice(0, 8) + '01');
  const [to, setTo] = useState(today());
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    setDocs(null);
    if (!cls) return;
    getDocs(query(collection(db, 'attendance'), where('className', '==', cls))).then(s => setDocs(s.docs.map(d => d.data()))).catch(() => setDocs([]));
  }, [cls]);

  const rows = useMemo(() => {
    const inRange = (docs || []).filter(d => d.date >= from && d.date <= to);
    return students.filter(s => s.className === cls && s.status !== 'inactive').map(s => {
      let p = 0, a = 0, l = 0;
      inRange.forEach(d => { const r = d.records?.[s.studentId]; if (r === 'P') p++; else if (r === 'A') a++; else if (r === 'L') l++; });
      const t = p + a + l;
      return { s, p, a, l, pct: t ? Math.round(((p + l) / t) * 100) : null };
    });
  }, [docs, students, cls, from, to]);

  return (
    <div className="card">
      <div className="filters">
        <label className="field inline">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="field inline">To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.s.studentId}><td>{r.s.name}</td><td>{r.p}</td><td>{r.a}</td><td>{r.l}</td><td>{r.pct === null ? '—' : `${r.pct}%`}</td></tr>)}
            {docs && rows.length === 0 && <tr><td colSpan={5} className="muted empty">No students in this class.</td></tr>}
          </tbody>
        </table>
      </div>
      {docs && docs.length === 0 && <p className="hint">No attendance has been saved for this class yet.</p>}
    </div>
  );
}

export default function Attendance() {
  const { classNames } = useData();
  const [tab, setTab] = useState('mark');
  const [cls, setCls] = useState('');
  useEffect(() => { if (!cls && classNames.length) setCls(classNames[0]); }, [classNames, cls]);

  return (
    <>
      <div className="page-head">
        <div><h2>Attendance</h2><p className="muted">Take the daily roll-call and review attendance.</p></div>
        <select value={cls} onChange={e => setCls(e.target.value)}>{classNames.map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <Seg tabs={[['mark', 'Roll-call'], ['report', 'Report']]} value={tab} onChange={setTab} />
      {tab === 'mark' ? <Mark cls={cls} /> : <Report cls={cls} />}
    </>
  );
}
