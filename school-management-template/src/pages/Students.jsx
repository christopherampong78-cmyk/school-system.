import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../auth';
import { isAdminRole } from '../lib/roles';
import { useData } from '../data';
import { patchDoc } from '../lib/db';
import { createStudent, deleteStudents, initials, resizePhoto } from '../lib/students';
import ImportStudents from '../components/ImportStudents';
import { FormModal } from '../components/Crud';

function AddModal({ onClose, onDone }) {
  const { classNames } = useData();
  const [mode, setMode] = useState('one');
  const [f, setF] = useState({ name: '', className: classNames[0], gender: 'Male', guardianName: '', guardianPhone: '', photo: '' });
  const [bulk, setBulk] = useState('');
  const [bulkClass, setBulkClass] = useState(classNames[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function saveOne(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const id = await createStudent({ ...f, name: f.name.trim() });
      await onDone();
      setMsg(`Added ${f.name.trim()} (${id}).`);
      setF({ ...f, name: '', guardianName: '', guardianPhone: '', photo: '' });
    } catch (er) { setMsg(er.message); }
    setBusy(false);
  }

  async function saveBulk(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [name, cls, g] = l.split(',').map(s => s.trim());
      return { name, className: classNames.includes(cls) ? cls : bulkClass, gender: /^f/i.test(g || '') ? 'Female' : /^m/i.test(g || '') ? 'Male' : '' };
    });
    let ok = 0;
    try {
      for (const r of rows) { await createStudent({ ...r, guardianName: '', guardianPhone: '', photo: '' }); ok++; setMsg(`Added ${ok} of ${rows.length}…`); }
      setMsg(`Added ${ok} students. Open ID Cards & QR to print their cards.`); setBulk('');
    } catch (er) { setMsg(`Stopped after ${ok} of ${rows.length}: ${er.message}`); }
    await onDone(); setBusy(false);
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal card" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>Add students</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="tabs two">
          <button className={mode === 'one' ? 'on' : ''} onClick={() => setMode('one')}>One student</button>
          <button className={mode === 'many' ? 'on' : ''} onClick={() => setMode('many')}>Several at once</button>
        </div>
        {mode === 'one' ? (
          <form onSubmit={saveOne}>
            <label className="field">Full name<input value={f.name} onChange={set('name')} required /></label>
            <div className="row">
              <label className="field">Class<select value={f.className} onChange={set('className')}>{classNames.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="field">Gender<select value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option></select></label>
            </div>
            <div className="row">
              <label className="field">Guardian name<input value={f.guardianName} onChange={set('guardianName')} /></label>
              <label className="field">Guardian phone<input value={f.guardianPhone} onChange={set('guardianPhone')} inputMode="tel" /></label>
            </div>
            <label className="field">Photo (optional)
              <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) { try { setF({ ...f, photo: await resizePhoto(file) }); } catch (er) { setMsg(er.message); } } }} />
            </label>
            {f.photo && <img className="thumb" src={f.photo} alt="" />}
            {msg && <p className="hint">{msg}</p>}
            <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Add student'}</button>
          </form>
        ) : (
          <form onSubmit={saveBulk}>
            <label className="field">Default class<select value={bulkClass} onChange={e => setBulkClass(e.target.value)}>{classNames.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="field">One student per line: Name, Class, Gender
              <textarea rows={7} value={bulk} onChange={e => setBulk(e.target.value)} placeholder={'Ama Mensah, Basic 3, F\nKofi Boateng, Basic 3, M\nYaa Asantewaa'} required />
            </label>
            <p className="hint">Class and gender are optional. A missing or unknown class uses the default above.</p>
            {msg && <p className="hint">{msg}</p>}
            <button className="btn primary block" disabled={busy}>{busy ? 'Adding…' : 'Add all'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Students() {
  const { profile } = useAuth();
  const { students: list, classNames, reload } = useData();
  const isAdmin = isAdminRole(profile?.role);
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [picked, setPicked] = useState(new Set());
  const [delMsg, setDelMsg] = useState('');

  const shown = useMemo(() => list.filter(s =>
    (!cls || s.className === cls) && ((s.name || '') + s.studentId).toLowerCase().includes(q.toLowerCase())), [list, q, cls]);

  const fields = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'className', label: 'Class', type: 'select', options: classNames, required: true },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
    { key: 'guardianName', label: 'Guardian name' },
    { key: 'guardianPhone', label: 'Guardian phone', type: 'tel' },
    { key: 'photo', label: 'Photo', type: 'photo' },
    { key: 'status', label: 'Status', type: 'select', noBlank: true, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
  ];

  const togglePick = (id) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPicked = shown.length > 0 && shown.every(s => picked.has(s.studentId));

  async function removeSelected() {
    const ids = [...picked];
    const typed = window.prompt(`This permanently deletes ${ids.length} student(s) together with their bills, payments, marks and attendance. This cannot be undone.\n\nType DELETE to confirm.`);
    if (typed !== 'DELETE') return;
    setDelMsg('Deleting…');
    try {
      await deleteStudents(ids, setDelMsg);
      await reload('students');
      setPicked(new Set());
      setDelMsg(`Deleted ${ids.length} student${ids.length === 1 ? '' : 's'} and their records.`);
    } catch (er) { setDelMsg(`Stopped: ${er.message}`); }
  }

  async function toggle(s) {
    await patchDoc('students', s.studentId, { status: s.status === 'inactive' ? 'active' : 'inactive' });
    reload('students');
  }

  return (
    <>
      <div className="page-head">
        <div><h2>Students</h2><p className="muted">{list.length} students</p></div>
        {isAdmin && (
          <div className="head-actions">
            <button className="btn" onClick={() => setImporting(true)}><Upload size={16} /> Upload list</button>
            <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Add students</button>
          </div>
        )}
      </div>
      {delMsg && <p className="notice">{delMsg}</p>}
      <div className="card">
        <div className="filters">
          <span className="input-icon"><Search size={16} /><input placeholder="Search by name or ID" value={q} onChange={e => setQ(e.target.value)} /></span>
          <select value={cls} onChange={e => setCls(e.target.value)}><option value="">All classes</option>{classNames.map(c => <option key={c}>{c}</option>)}</select>
          {isAdmin && <Link className="btn" to="/id-cards">Print ID cards</Link>}
          {isAdmin && picked.size > 0 && <button className="btn danger" onClick={removeSelected}><Trash2 size={16} /> Delete {picked.size} selected</button>}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{isAdmin && <th><input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(shown.map(s => s.studentId)))} /></th>}<th>Student</th><th>ID</th><th>Class</th><th>Guardian</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map(s => (
                <tr key={s.studentId} className={isAdmin ? 'click' : ''} onClick={() => isAdmin && setEditing(s)}>
                  {isAdmin && <td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${s.name}`} checked={picked.has(s.studentId)} onChange={() => togglePick(s.studentId)} /></td>}
                  <td><span className="who">{s.photo ? <img src={s.photo} alt="" /> : <span className="avatar sm">{initials(s.name)}</span>}{s.name}</span></td>
                  <td>{s.studentId}</td><td>{s.className}</td>
                  <td>{s.guardianName || '—'}{s.guardianPhone ? <small className="muted"> · {s.guardianPhone}</small> : null}</td>
                  <td onClick={e => e.stopPropagation()}>{isAdmin
                    ? <button className={`badge ${s.status === 'inactive' ? 'off' : 'on'}`} onClick={() => toggle(s)}>{s.status === 'inactive' ? 'Inactive' : 'Active'}</button>
                    : <span className={`badge ${s.status === 'inactive' ? 'off' : 'on'}`}>{s.status === 'inactive' ? 'Inactive' : 'Active'}</span>}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="muted empty">No students match. {isAdmin ? 'Use Add students to enrol your first class.' : ''}</td></tr>}
            </tbody>
          </table>
        </div>
        {isAdmin && list.length > 0 && <p className="hint">Tap a student to edit their details. Tap the status to switch Active or Inactive.</p>}
      </div>
      {importing && <ImportStudents onClose={() => setImporting(false)} />}
      {adding && <AddModal onClose={() => setAdding(false)} onDone={() => reload('students')} />}
      {editing && (
        <FormModal title="Edit student" fields={fields} initial={editing} isNew={false}
          hint={`ID ${editing.studentId} stays the same.`}
          onSave={async (v) => { await patchDoc('students', editing.studentId, Object.fromEntries(fields.map(f => [f.key, v[f.key]]))); await reload('students'); }}
          onClose={() => setEditing(null)} />
      )}
    </>
  );
}
