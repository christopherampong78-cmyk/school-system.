import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../auth';
import { listDocs, newId, putDoc, removeDoc } from '../lib/db';
import { resizePhoto } from '../lib/students';
import { ADMIN } from '../lib/roles';

const opt = (o) => (typeof o === 'object' ? o : { value: o, label: o });

const initialFor = (fields) => Object.fromEntries(fields.map(f => {
  const d = typeof f.default === 'function' ? f.default() : f.default;
  return [f.key, d ?? (f.type === 'multi' ? [] : f.type === 'checkbox' ? false : '')];
}));

function FieldInput({ f, value, onChange }) {
  const common = { required: f.required, placeholder: f.placeholder };
  const on = (e) => onChange(e.target.value);
  if (f.type === 'textarea')
    return <label className="field">{f.label}<textarea rows={3} {...common} value={value} onChange={on} /></label>;
  if (f.type === 'select')
    return (
      <label className="field">{f.label}
        <select required={f.required} value={value} onChange={on}>
          {!f.noBlank && <option value="">{f.required ? 'Select…' : 'None'}</option>}
          {(f.options || []).map(o => { const x = opt(o); return <option key={x.value} value={x.value}>{x.label}</option>; })}
        </select>
      </label>
    );
  if (f.type === 'checkbox')
    return <label className="check"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> {f.label}</label>;
  if (f.type === 'multi')
    return (
      <div className="field">{f.label}
        <div className="pick-list small">
          {(f.options || []).map(o => {
            const x = opt(o);
            const on2 = (value || []).includes(x.value);
            return (
              <label key={x.value} className="check">
                <input type="checkbox" checked={on2} onChange={() => onChange(on2 ? value.filter(v => v !== x.value) : [...(value || []), x.value])} /> {x.label}
              </label>
            );
          })}
        </div>
      </div>
    );
  if (f.type === 'photo')
    return (
      <div className="field">{f.label}
        <input type="file" accept="image/*" onChange={async e => { const file = e.target.files[0]; if (file) onChange(await resizePhoto(file)); }} />
        {value && <img className="thumb" src={value} alt="" />}
      </div>
    );
  return (
    <label className="field">{f.label}
      <input type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} min={f.min} {...common} value={value ?? ''} onChange={on} />
    </label>
  );
}

export function FormModal({ title, fields, initial, isNew = true, onSave, onDelete, onClose, hint }) {
  const [v, setV] = useState(() => ({ ...initialFor(fields), ...(initial || {}) }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const out = { ...v };
      fields.forEach(f => { if (f.type === 'number' && out[f.key] !== '' && out[f.key] != null) out[f.key] = Number(out[f.key]); });
      await onSave(out);
      onClose();
    } catch (er) { setErr(er.message || 'Could not save. Try again.'); setBusy(false); }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal card" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head"><h3>{title}</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {hint && <p className="hint">{hint}</p>}
        {fields.filter(f => f.form !== false && (isNew || !f.onlyNew)).map(f => (
          <FieldInput key={f.key} f={f} value={v[f.key]} onChange={val => setV(x => ({ ...x, [f.key]: val }))} />
        ))}
        {err && <p className="error">{err}</p>}
        <div className="modal-actions">
          {onDelete && !isNew && <button type="button" className="btn danger" onClick={onDelete}>Delete</button>}
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function display(f, row) {
  const val = row[f.key];
  if (f.fmt) return f.fmt(val, row);
  if (f.type === 'checkbox') return val ? 'Yes' : 'No';
  if (f.type === 'multi') return Array.isArray(val) ? val.length : 0;
  if (f.type === 'photo') return val ? <img className="thumb-sm" src={val} alt="" /> : '—';
  if (f.type === 'select' && f.options) { const m = f.options.map(opt).find(o => o.value === val); return m ? m.label : (val || '—'); }
  return val === undefined || val === '' || val === null ? '—' : String(val);
}

/**
 * Generic list + add/edit/delete page for one collection.
 * fields: [{key,label,type,options,required,list,default,onlyNew,fmt}]
 */
export default function Crud({
  title, subtitle, col, fields, sort, editRoles = ADMIN, addLabel = 'Add', transform, customSave,
  onChanged, toolbar, rowActions, emptyText = 'Nothing here yet.', compact = false, hint, singular = 'record',
}) {
  const { profile } = useAuth();
  const can = editRoles.includes(profile?.role);
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(() => listDocs(col).then(setRows).catch(() => setRows([])), [col]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const list = (rows || []).filter(r => JSON.stringify(Object.values(r)).toLowerCase().includes(q.toLowerCase()));
    return sort ? [...list].sort(sort) : list;
  }, [rows, q, sort]);

  const cols = fields.filter(f => f.list !== false && f.type !== 'password');

  async function save(vals) {
    const existing = edit.row || {};
    const { id: _id, ...rest } = existing;
    let data = { ...rest, ...vals };
    if (transform) data = transform(data, vals);
    const id = edit.row?.id || newId();
    if (customSave) await customSave(data, !edit.row, id); else await putDoc(col, id, data);
    await load();
    if (onChanged) onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete this ${singular}? This cannot be undone.`)) return;
    await removeDoc(col, edit.row.id);
    setEdit(null);
    await load();
    if (onChanged) onChanged();
  }

  return (
    <>
      <div className={compact ? 'sub-head' : 'page-head'}>
        <div>
          {compact ? <h3>{title}</h3> : <h2>{title}</h2>}
          <p className="muted">{subtitle || (rows ? `${rows.length} ${rows.length === 1 ? 'record' : 'records'}` : 'Loading…')}</p>
        </div>
        <div className="head-actions">
          {toolbar}
          {can && <button className="btn primary" onClick={() => setEdit({})}><Plus size={16} /> {addLabel}</button>}
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <span className="input-icon"><Search size={16} /><input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} /></span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{cols.map(f => <th key={f.key}>{f.label}</th>)}{rowActions && <th />}</tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id} className={can ? 'click' : ''} onClick={() => can && setEdit({ row: r })}>
                  {cols.map(f => <td key={f.key}>{display(f, r)}</td>)}
                  {rowActions && <td onClick={e => e.stopPropagation()}>{rowActions(r)}</td>}
                </tr>
              ))}
              {rows && shown.length === 0 && <tr><td colSpan={cols.length + 1} className="muted empty">{emptyText}</td></tr>}
            </tbody>
          </table>
        </div>
        {can && rows && rows.length > 0 && <p className="hint">Tap a row to edit or delete it.</p>}
      </div>
      {edit && (
        <FormModal
          title={edit.row ? `Edit ${singular}` : `${addLabel} ${singular}`}
          fields={fields} initial={edit.row} isNew={!edit.row} hint={hint}
          onSave={save} onDelete={can ? remove : null} onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
