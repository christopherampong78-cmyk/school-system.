import { store, save } from './store';

const listeners = new Set();
let current = null;
try { current = JSON.parse(sessionStorage.getItem('demo-user')) || JSON.parse(localStorage.getItem('demo-user')); } catch { current = null; }

const notify = () => listeners.forEach(cb => cb(current));
const persist = (remember) => {
  sessionStorage.removeItem('demo-user'); localStorage.removeItem('demo-user');
  if (current) (remember === false ? sessionStorage : localStorage).setItem('demo-user', JSON.stringify(current));
};
let remember = true;

export const getAuth = (app) => ({ app, isMain: !app || app.name === '[DEFAULT]' });
export const browserLocalPersistence = 'local';
export const browserSessionPersistence = 'session';
export const setPersistence = async (_a, mode) => { remember = mode !== 'session'; };

export const onAuthStateChanged = (_auth, cb) => {
  listeners.add(cb);
  setTimeout(() => cb(current), 0);
  return () => listeners.delete(cb);
};

export const signInWithEmailAndPassword = async (_auth, email, password) => {
  const c = store.creds[email];
  if (!c || c.password !== password) throw { code: 'auth/invalid-credential' };
  current = { uid: c.uid, email };
  persist(remember);
  notify();
  return { user: current };
};

export const createUserWithEmailAndPassword = async (_auth, email, password) => {
  if (store.creds[email]) throw { code: 'auth/email-already-in-use', message: 'That ID already exists.' };
  const uid = 'u-' + Math.random().toString(36).slice(2, 10);
  store.creds[email] = { uid, password };
  save();
  return { user: { uid, email } };
};

export const signOut = async (auth) => {
  if (auth && auth.isMain === false) return;
  current = null;
  persist();
  notify();
};
