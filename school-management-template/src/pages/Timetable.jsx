import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { isAdminRole } from '../lib/roles';
import { useData } from '../data';
import { newId, putDoc, removeDoc } from '../lib/db';
import { FormModal } from '../components/Crud';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function Timetable() {
  const { profile } = useAuth();
  const { classNames, subjects } = useData();
  const can = isAdminRole(profile?.role);
  const [cls, setCls] = useState('');
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);

  useEffect(() => { if (!cls && classNames.length) setCls(classNames[0]); }, [classNames, cls]);

  const load = useCallback(async () => {
    if (!cls) return;
    const s = await getDocs(query(collection(db, 'timetable'), where('className', '==', cls)));
    setRows(s.docs.map(d => ({ id: d.id, ...d.data() })));
  }, [cls]);
  useEffect(() => { load(); }, [load]);

  const fields = [
    { key: 'day', label: 'Day', type: 'select', options: DAYS, required: true, noBlank: true, default: 'Monday' },
    { key: 'start', label: 'Starts', type: 'time', required: true },
    { key: 'end', label: 'Ends', type: 'time', required: true },
    { key: 'subject', label: 'Subject or activity', type: 'select', required: true, options: [...subjects.map(s => s.name), 'Break', 'Assembly', 'Lunch', 'Sports'] },
    { key: 'teacher', label: 'Teacher' },
  ];

  async function save(v) {
    await putDoc('timetable', edit.row?.id || newId(), { ...v, className: cls });
    await load();
  }
  async function remove() {
    if (!window.confirm('Delete this period?')) return;
    await removeDoc('timetable', edit.row.id);
    setEdit(null);
    await load();
  }

  return (
    <>
      <div className="page-head">
        <div><h2>Timetables</h2><p className="muted">Weekly lessons for {cls || 'a class'}.</p></div>
        <div className="head-actions">
          <select value={cls} onChange={e => setCls(e.target.value)}>{classNames.map(c => <option key={c}>{c}</option>)}</select>
          {can && <button className="btn primary" onClick={() => setEdit({})}><Plus size={16} /> Add period</button>}
        </div>
      </div>
      <div className="tt-grid">
        {DAYS.map(d => {
          const items = rows.filter(r => r.day === d).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
          return (
            <div key={d} className="card">
              <h3>{d}</h3>
              {items.length === 0 && <p className="muted">No periods.</p>}
              {items.map(r => (
                <div key={r.id} className={`tt-item ${can ? 'click' : ''}`} onClick={() => can && setEdit({ row: r })}>
                  <b>{r.start}–{r.end}</b>
                  <span>{r.subject}{r.teacher ? <small className="muted"> · {r.teacher}</small> : null}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {can && rows.length > 0 && <p className="hint">Tap a period to edit or delete it.</p>}
      {edit && (
        <FormModal title={edit.row ? 'Edit period' : 'Add period'} fields={fields} initial={edit.row} isNew={!edit.row}
          onSave={save} onDelete={remove} onClose={() => setEdit(null)} />
      )}
    </>
  );
}
