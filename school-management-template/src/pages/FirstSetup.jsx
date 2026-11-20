import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../auth';
import { useData } from '../data';
import { putDoc } from '../lib/db';

// Runs once per school copy: creates the owner account (the only account that can edit Settings).
export default function FirstSetup() {
  const { settings, settingsLoaded, loadSettings, school } = useData();
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ school: '', name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));

  if (settingsLoaded && settings.setupDone) return <Navigate to="/login" replace />;

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (f.password.length < 6) return setErr('Use a password of 6 or more characters.');
    if (f.password !== f.confirm) return setErr('The two passwords do not match.');
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, f.email.trim().toLowerCase(), f.password);
      await putDoc('users', cred.user.uid, { role: 'owner', name: f.name.trim() });
      await putDoc('settings', 'school', { name: f.school.trim() || school.name, setupDone: true });
      await loadSettings();
      await refresh();
      nav('/', { replace: true });
    } catch (er) {
      setErr(er.code === 'auth/email-already-in-use' ? 'That email already has an account. Use a different email.' : (er.message || 'Setup failed. Try again.'));
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-wrap">
        <form className="card login-card" onSubmit={submit}>
          <div className="login-head">
            <img className="login-logo" src={school.logo} alt="" />
            <h1>Set up this school</h1>
            <p className="muted">Create the owner account. You can change everything later in Settings.</p>
          </div>
          <label className="field">School name<input value={f.school} onChange={set('school')} placeholder={school.name} required /></label>
          <label className="field">Your name<input value={f.name} onChange={set('name')} required /></label>
          <label className="field">Email<input type="email" value={f.email} onChange={set('email')} autoComplete="username" required /></label>
          <label className="field">Password<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required /></label>
          <label className="field">Confirm password<input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" required /></label>
          {err && <p className="error">{err}</p>}
          <button className="btn primary block" disabled={busy}>{busy ? 'Setting up…' : 'Create owner account'}</button>
        </form>
      </div>
    </div>
  );
}
