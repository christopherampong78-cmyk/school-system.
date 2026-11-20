import { store, save } from './store';

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const snap = (path) => {
  const data = store.docs[path];
  return { id: path.split('/').pop(), exists: () => data !== undefined, data: () => clone(data) };
};

export const getFirestore = () => ({});
export const serverTimestamp = () => Date.now();
export const doc = (_db, ...parts) => ({ path: parts.join('/') });
export const collection = (_db, name) => ({ col: name });
export const where = (f, op, v) => ({ f, op, v });
export const orderBy = () => ({});
export const limit = () => ({});
export const query = (ref, ...cs) => ({ col: ref.col, filters: cs.filter(c => c && c.f) });

export const getDoc = async (ref) => snap(ref.path);
export const getDocs = async (ref) => ({
  docs: Object.keys(store.docs)
    .filter(p => p.startsWith(ref.col + '/') && p.split('/').length === 2)
    .map(snap)
    .filter(s => (ref.filters || []).every(({ f, op, v }) => (op === '==' ? s.data()?.[f] === v : true))),
});
export const setDoc = async (ref, data) => { store.docs[ref.path] = clone(data); save(); };
export const updateDoc = async (ref, patch) => { store.docs[ref.path] = { ...store.docs[ref.path], ...patch }; save(); };
export const deleteDoc = async (ref) => { delete store.docs[ref.path]; save(); };

export const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, data) => ops.push([ref.path, clone(data)]),
    delete: (ref) => ops.push([ref.path, null]),
    commit: async () => { ops.forEach(([p, d]) => { if (d === null) delete store.docs[p]; else store.docs[p] = d; }); save(); },
  };
};

export const runTransaction = async (_db, fn) => {
  const tx = {
    get: async (ref) => snap(ref.path),
    set: (ref, data) => { store.docs[ref.path] = clone(data); },
  };
  const out = await fn(tx);
  save();
  return out;
};
