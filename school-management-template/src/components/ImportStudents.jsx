import { useMemo, useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { Download, X } from 'lucide-react';
import { db } from '../firebase';
import { useData } from '../data';
import { slug } from '../lib/db';
import { createStudent } from '../lib/students';
import { parseRows, readSheet, templateCsv } from '../lib/importStudents';

const key = (name, cls) => `${name.toLowerCase().replace(/\s+/g, ' ')}|${cls.toLowerCase()}`;

export default function ImportStudents({ onClose }) {
  const { classNames, students, reload } = useData();
  const [items, setItems] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [defaultClass, setDefaultClass] = useState(classNames[0] || '');
  const [createMissing, setCreateMissing] = useState(true);
  const [skipDup, setSkipDup] = useState(true);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const unknown = useMemo(() => [...new Set((items || []).filter(i => !i.className && i.rawClass).map(i => i.rawClass))], [items]);

  async function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(''); setItems(null); setResult(null); setFileName(file.name);
    try {
      const out = parseRows(await readSheet(file), classNames);
      if (out.error) setError(out.error);
      setItems(out.items);
    } catch { setError('That file could not be read. Use an Excel (.xlsx) or CSV file.'); }
  }

  async function run() {
    const finalClass = (it) => it.className || (it.rawClass && createMissing ? it.rawClass : defaultClass);
    setProgress({ done: 0, total: items.length });
    const missing = [...new Set(items.filter(it => !it.className && it.rawClass && createMissing).map(it => it.rawClass))];
    if (missing.length) {
      const b = writeBatch(db);
      missing.forEach((name, i) => b.set(doc(db, 'classes', slug(name)), { name, teacher: '', room: '', capacity: 40, order: classNames.length + i }));
      await b.commit();
    }
    const existing = new Set(students.map(s => key(s.name || '', s.className || '')));
    const seen = new Set();
    const todo = [];
    let skipped = 0;
    items.forEach(it => {
      const cn = finalClass(it);
      const k = key(it.name, cn);
      if (skipDup && (existing.has(k) || seen.has(k))) { skipped++; return; }
      seen.add(k);
      todo.push({ ...it, className: cn });
    });
    let ok = 0;
    const failed = [];
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += 3) {
      await Promise.all(todo.slice(i, i + 3).map(async (it) => {
        try {
          await createStudent({ name: it.name, className: it.className, gender: it.gender, guardianName: it.guardianName, guardianPhone: it.guardianPhone, photo: '' });
          ok++;
        } catch (er) { failed.push(`${it.name}: ${er.message}`); }
      }));
      setProgress({ done: Math.min(i + 3, todo.length), total: todo.length });
    }
    await Promise.all([reload('students'), reload('classes')]);
    setProgress(null);
    setResult({ ok, skipped, failed });
  }

  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`;
  const running = !!progress;

  return (
    <div className="modal-back" onClick={running ? undefined : onClose}>
      <div className="modal card wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>Upload students from a file</h3>{!running && <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>}</div>
        <p className="hint">Use an Excel (.xlsx) or CSV file with the headings Name, Class, Gender, Guardian and Phone. Only Name is required. Names split into First name and Surname columns also work.</p>
        <a className="btn" href={href} download="students-template.csv"><Download size={16} /> Download a sample file</a>
        <label className="field">Choose your file<input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={running} /></label>
        {error && <p className="error">{error}</p>}

        {items && items.length > 0 && !result && (
          <>
            <p><b>{items.length}</b> students found in <b>{fileName}</b>.</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Class</th><th>Gender</th><th>Guardian</th></tr></thead>
                <tbody>{items.slice(0, 6).map((i, n) => <tr key={n}><td>{i.name}</td><td>{i.className || i.rawClass || '—'}</td><td>{i.gender || '—'}</td><td>{i.guardianName || '—'}</td></tr>)}</tbody>
              </table>
            </div>
            {items.length > 6 && <p className="hint">Showing the first 6 of {items.length}.</p>}
            {unknown.length > 0 && (
              <label className="check"><input type="checkbox" checked={createMissing} onChange={e => setCreateMissing(e.target.checked)} />
                Create these new classes: {unknown.join(', ')}</label>
            )}
            {(unknown.length === 0 || !createMissing || items.some(i => !i.rawClass)) && (
              <label className="field">Class for rows with no class
                <select value={defaultClass} onChange={e => setDefaultClass(e.target.value)}>{classNames.map(c => <option key={c}>{c}</option>)}</select>
              </label>
            )}
            <label className="check"><input type="checkbox" checked={skipDup} onChange={e => setSkipDup(e.target.checked)} /> Skip students already in the system (same name and class)</label>
            {running
              ? <p className="notice">Adding students… {progress.done} of {progress.total}. Keep this page open.</p>
              : <button className="btn primary block" onClick={run}>Add {items.length} students</button>}
          </>
        )}

        {result && (
          <>
            <p className="notice">Added {result.ok} students{result.skipped ? `, skipped ${result.skipped} already in the system` : ''}.</p>
            {result.failed.length > 0 && <p className="error">{result.failed.length} could not be added: {result.failed.slice(0, 3).join('; ')}{result.failed.length > 3 ? '…' : ''}</p>}
            <p className="hint">Next, open ID Cards & QR to print their cards.</p>
            <button className="btn primary block" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
