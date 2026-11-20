import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { User, KeyRound, ScanLine, Lock, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth } from '../auth';
import { useData, DEFAULT_BG } from '../data';
import { useTheme } from '../theme';
import Scanner from '../components/Scanner';

function Slideshow({ images, seconds }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return undefined;
    const t = setInterval(() => setI(x => (x + 1) % images.length), Math.max(3, seconds) * 1000);
    return () => clearInterval(t);
  }, [images, seconds]);
  return (
    <div className="bg-slides" aria-hidden="true">
      {images.map((src, n) => <div key={n} className={n === i % images.length ? 'on' : ''} style={{ backgroundImage: `url("${src}")` }} />)}
      <div className="bg-overlay" />
    </div>
  );
}

export default function Login() {
  const { user, profile, loginPassword, loginToken } = useAuth();
  const { school, backgrounds, settings, settingsLoaded } = useData();
  const [theme, toggle] = useTheme();
  const [tab, setTab] = useState('id');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [token, setToken] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && profile) return <Navigate to={profile.role === 'student' ? '/me' : '/'} replace />;

  async function run(fn) {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); setTab(t => (t === 'scan' ? 'token' : t)); }
    setBusy(false);
  }

  const images = backgrounds.length ? backgrounds.map(b => b.src) : DEFAULT_BG;
  const tabs = [['id', 'ID / Account', User], ['token', 'Student Token', KeyRound], ['scan', 'Scan QR', ScanLine]];

  return (
    <div className="login-page has-bg">
      <Slideshow images={images} seconds={Number(school.bgInterval) || 6} />
      <button className="icon-btn login-theme" onClick={toggle} aria-label="Toggle dark mode">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="login-wrap">
        <div className="card login-card">
          <div className="login-head">
            <img className="login-logo" src={school.logo} alt="" />
            <h1>{school.name}</h1>
            <p className="muted">{school.motto || school.tagline}</p>
          </div>
          <div className="tabs">
            {tabs.map(([k, label, Icon]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setErr(''); }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {tab === 'id' && (
            <form onSubmit={(e) => { e.preventDefault(); run(() => loginPassword(id, pw, remember)); }}>
              <label className="field">Email or student ID
                <input value={id} onChange={e => setId(e.target.value)} autoComplete="username" required />
              </label>
              <label className="field">Password
                <span className="input-icon">
                  <Lock size={16} />
                  <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password" required />
                  <button type="button" className="icon-btn" onClick={() => setShow(s => !s)} aria-label="Show password">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
              {err && <p className="error">{err}</p>}
              <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </form>
          )}

          {tab === 'token' && (
            <form onSubmit={(e) => { e.preventDefault(); run(() => loginToken(token, remember)); }}>
              <label className="field">Student token
                <input value={token} onChange={e => setToken(e.target.value.toUpperCase())}
                  placeholder={`${school.idPrefix}0001-K7P3QX2M`} autoCapitalize="characters" required />
              </label>
              <p className="hint">The token is printed on your ID card, under the QR code.</p>
              {err && <p className="error">{err}</p>}
              <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in with token'}</button>
            </form>
          )}

          {tab === 'scan' && (
            busy ? <p className="hint">Signing in…</p> : <Scanner onResult={(text) => run(() => loginToken(text, false))} />
          )}
        </div>

        {!__DEMO__ && settingsLoaded && !settings.setupDone && (
          <div className="card demo-note">
            <b>New school?</b>
            <p>This copy has not been set up yet.</p>
            <Link className="btn primary" to="/setup">Set up this school</Link>
          </div>
        )}
        {__DEMO__ && (
          <div className="card demo-note">
            <b>Demo mode</b>
            <p>Fake data, saved only in this browser. Try these:</p>
            <p>Owner: <code>owner@demo.school</code> / <code>owner123</code></p>
            <p>School admin: <code>admin@demo.school</code> / <code>admin123</code></p>
            <p>Teacher: <code>teacher@demo.school</code> / <code>teacher123</code></p>
            <p>Student token: <code>RWA0001-DEMO0001</code></p>
          </div>
        )}
        <p className="footer on-bg">© {new Date().getFullYear()} {school.name}</p>
        <p className="footer on-bg"><a href={school.poweredBy.link} target="_blank" rel="noreferrer">Powered by {school.poweredBy.name}</a></p>
      </div>
    </div>
  );
}
