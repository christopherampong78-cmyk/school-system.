import { useEffect, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useData, DEFAULT_BG } from '../data';
import { newId, putDoc, removeDoc } from '../lib/db';
import { resizeImage } from '../lib/images';

export default function Settings() {
  const { settings, school, backgrounds, loadSettings } = useData();
  const [f, setF] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setF({
      name: school.name, tagline: school.tagline, motto: school.motto || '', address: school.address, phone: school.phone,
      email: school.email || '', website: school.website || '', currency: school.currency, academicYear: settings.academicYear || school.academicYear,
      term: settings.term || school.term, primary: school.primary, bgInterval: school.bgInterval || 6,
    });
  }, [school, settings]);

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));
  const saveAll = async (extra = {}) => {
    await putDoc('settings', 'school', { ...settings, ...f, bgInterval: Number(f.bgInterval) || 6, ...extra });
    await loadSettings();
  };

  async function saveInfo(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await saveAll(); setMsg('Saved. The new details are live everywhere.'); } catch (er) { setMsg(er.message); }
    setBusy(false);
  }

  async function onLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMsg('');
    try { await saveAll({ logo: await resizeImage(file, { max: 320, type: 'image/png' }) }); setMsg('Logo updated.'); } catch (er) { setMsg(er.message); }
  }

  async function onBackgrounds(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    setBusy(true); setMsg('');
    try {
      for (const file of files) {
        const src = await resizeImage(file, { max: 1400, quality: 0.7 });
        await putDoc('backgrounds', newId(), { src, order: Date.now() });
      }
      await loadSettings();
      setMsg(`Added ${files.length} picture${files.length === 1 ? '' : 's'} to the login page.`);
    } catch (er) { setMsg(er.message); }
    setBusy(false);
    e.target.value = '';
  }

  async function delBg(id) {
    if (!window.confirm('Remove this picture from the login page?')) return;
    await removeDoc('backgrounds', id);
    await loadSettings();
  }

  return (
    <>
      <div className="page-head"><div><h2>Settings</h2><p className="muted">Only the owner account can change these. Edit the school's details, logo and login pictures at any time.</p></div></div>
      {msg && <p className="notice">{msg}</p>}

      <div className="card">
        <h3>Logo</h3>
        <div className="logo-edit">
          <img src={school.logo} alt="School logo" />
          <div>
            <label className="btn"><ImagePlus size={16} /> Choose new logo<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
            {settings.logo && <button className="btn" onClick={async () => { await saveAll({ logo: '' }); setMsg('Logo reset to the default.'); }}>Use default logo</button>}
            <p className="hint">A square picture with a transparent or white background works best.</p>
          </div>
        </div>
      </div>

      <form className="card" onSubmit={saveInfo} style={{ marginTop: 16 }}>
        <h3>School information</h3>
        <label className="field">School name<input value={f.name || ''} onChange={set('name')} required /></label>
        <div className="row">
          <label className="field">Tagline<input value={f.tagline || ''} onChange={set('tagline')} /></label>
          <label className="field">Motto (shown on the login page)<input value={f.motto || ''} onChange={set('motto')} /></label>
        </div>
        <label className="field">Address<input value={f.address || ''} onChange={set('address')} /></label>
        <div className="row">
          <label className="field">Phone<input type="tel" value={f.phone || ''} onChange={set('phone')} /></label>
          <label className="field">Email<input type="email" value={f.email || ''} onChange={set('email')} /></label>
        </div>
        <div className="row">
          <label className="field">Website<input value={f.website || ''} onChange={set('website')} /></label>
          <label className="field">Currency symbol<input value={f.currency || ''} onChange={set('currency')} /></label>
        </div>
        <div className="row">
          <label className="field">Academic year (used until a current term is set)<input value={f.academicYear || ''} onChange={set('academicYear')} /></label>
          <label className="field">Term (used until a current term is set)<input value={f.term || ''} onChange={set('term')} /></label>
        </div>
        <label className="field">Main colour<input type="color" className="color" value={f.primary || '#1d5cff'} onChange={set('primary')} /></label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Save school information'}</button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Login page pictures</h3>
        <p className="hint">These pictures fade one after another behind the login box. With none added, the built-in scenes are used.</p>
        <div className="bg-grid">
          {(backgrounds.length ? backgrounds : DEFAULT_BG.map((src, i) => ({ id: `d${i}`, src, builtin: true }))).map(b => (
            <div key={b.id} className="bg-thumb" style={{ backgroundImage: `url("${b.src}")` }}>
              {!b.builtin && <button className="icon-btn" onClick={() => delBg(b.id)} aria-label="Remove picture"><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label className="btn"><ImagePlus size={16} /> Add pictures<input type="file" accept="image/*" multiple hidden onChange={onBackgrounds} /></label>
          <label className="field inline">Seconds per picture
            <input type="number" min="3" max="60" value={f.bgInterval || 6} onChange={set('bgInterval')} onBlur={() => saveAll().then(() => setMsg('Saved.'))} />
          </label>
        </div>
      </div>

      {__DEMO__ && (
        <div className="card demo-note" style={{ marginTop: 16 }}>
          <b>Demo data</b>
          <p>Everything you add here is stored only in this browser.</p>
          <button className="btn danger" onClick={async () => { if (window.confirm('Erase all demo data and start again?')) (await import('../demo/store')).resetDemo(); }}>Reset demo data</button>
        </div>
      )}
    </>
  );
}
