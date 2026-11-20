import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence, browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { school } from './config/school';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export const toEmail = (input) => {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${school.authDomain}`;
};

// Token format: <studentId>-<secret>, e.g. RWA0001-K7P3QX2M
export function parseToken(raw) {
  const s = (raw || '').trim().toUpperCase();
  const i = s.lastIndexOf('-');
  if (i < 1 || i === s.length - 1) return null;
  return { studentId: s.slice(0, i), token: s };
}

const friendly = (e) => {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return new Error('Wrong ID or password. Check it and try again.');
  if (c.includes('too-many-requests')) return new Error('Too many attempts. Wait a few minutes and try again.');
  if (c.includes('network')) return new Error('No internet connection. Check your network and try again.');
  return e;
};

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true });
  const userRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    userRef.current = user;
    if (!user) return setState({ user: null, profile: null, loading: false });
    setState(s => ({ ...s, loading: true }));
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      setState({ user, profile: snap.exists() ? snap.data() : null, loading: false });
    } catch {
      setState({ user, profile: null, loading: false });
    }
  }), []);

  async function finish(cred) {
    const p = await getDoc(doc(db, 'users', cred.user.uid));
    if (!p.exists()) {
      await signOut(auth);
      throw new Error('This account has no role yet. Ask the administrator to finish setting it up.');
    }
    if (p.data().role === 'student') {
      const s = await getDoc(doc(db, 'students', p.data().studentId));
      if (s.exists() && s.data().status === 'inactive') {
        await signOut(auth);
        throw new Error('This student account is inactive. Contact the school office.');
      }
    }
  }

  async function loginPassword(identifier, password, remember) {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await finish(await signInWithEmailAndPassword(auth, toEmail(identifier), password));
    } catch (e) { throw friendly(e); }
  }

  async function loginToken(raw, remember = false) {
    const t = parseToken(raw);
    if (!t) throw new Error(`That token isn't valid. It looks like ${school.idPrefix}0001-K7P3QX2M.`);
    return loginPassword(t.studentId, t.token, remember);
  }

  const logout = () => signOut(auth);

  // Re-read the signed-in user's role (used right after first-time setup)
  const refresh = async () => {
    const u = userRef.current;
    if (!u) return;
    const snap = await getDoc(doc(db, 'users', u.uid));
    setState(s => ({ ...s, user: u, profile: snap.exists() ? snap.data() : null, loading: false }));
  };

  return <Ctx.Provider value={{ ...state, loginPassword, loginToken, logout, refresh }}>{children}</Ctx.Provider>;
}
