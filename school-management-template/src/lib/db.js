import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const slug = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function listDocs(name) {
  const s = await getDocs(collection(db, name));
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}
export const putDoc = (col, id, data) => setDoc(doc(db, col, id), data);
export const patchDoc = (col, id, data) => updateDoc(doc(db, col, id), data);
export const removeDoc = (col, id) => deleteDoc(doc(db, col, id));

export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const money = (n, cur = 'GH₵') =>
  `${cur}${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const sum = (arr, key) => arr.reduce((t, x) => t + Number(x[key] || 0), 0);
