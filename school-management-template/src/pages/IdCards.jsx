import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Printer } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { isAdminRole } from '../lib/roles';
import { useData } from '../data';
import { CardBack, CardFront } from '../components/IdCard';

export default function IdCards() {
  const { profile } = useAuth();
  const { students: all, classNames } = useData();
  const [tokens, setTokens] = useState({});
  const [cls, setCls] = useState('');
  const [picked, setPicked] = useState(new Set());

  useEffect(() => {
    if (isAdminRole(profile?.role)) getDocs(collection(db, 'tokens')).then(s => setTokens(Object.fromEntries(s.docs.map(d => [d.id, d.data().token]))));
  }, [profile]);

  const students = useMemo(() => all.filter(x => x.status !== 'inactive'), [all]);
  const shown = useMemo(() => students.filter(s => !cls || s.className === cls), [students, cls]);
  const chosen = shown.filter(s => picked.has(s.studentId));
  const toggle = (id) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = shown.length > 0 && chosen.length === shown.length;

  return (
    <>
      <div className="page-head no-print">
        <div><h2>ID Cards & QR</h2><p className="muted">Each card carries a QR code and token the student can use to sign in.</p></div>
        <button className="btn primary" disabled={!chosen.length} onClick={() => window.print()}><Printer size={16} /> Print {chosen.length || ''} card{chosen.length === 1 ? '' : 's'}</button>
      </div>
      <div className="card no-print">
        <div className="filters">
          <select value={cls} onChange={e => { setCls(e.target.value); setPicked(new Set()); }}>
            <option value="">All classes</option>{classNames.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(shown.map(s => s.studentId)))} /> Select all ({shown.length})</label>
        </div>
        <div className="pick-list">
          {shown.map(s => <label key={s.studentId} className="check"><input type="checkbox" checked={picked.has(s.studentId)} onChange={() => toggle(s.studentId)} /> {s.name} <small className="muted">{s.studentId} · {s.className}</small></label>)}
          {shown.length === 0 && <p className="muted">No active students in this class yet.</p>}
        </div>
      </div>
      <div className="print-area">
        {chosen.map(s => (
          <div key={s.studentId} className="card-pair">
            <CardFront s={s} />
            <CardBack s={s} token={tokens[s.studentId]} />
            {tokens[s.studentId] && <p className="token-line">{tokens[s.studentId]}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
