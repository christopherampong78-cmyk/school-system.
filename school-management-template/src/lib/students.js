import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db, secondaryAuth } from '../firebase';
import { toEmail } from '../auth';
import { school } from '../config/school';
import { listDocs, putDoc } from './db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreads

function secret(n = 8) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return [...a].map(x => ALPHABET[x % ALPHABET.length]).join('');
}

async function nextId() {
  const ref = doc(db, 'meta', 'studentCounter');
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const n = snap.exists() ? snap.data().next : 1;
    tx.set(ref, { next: n + 1 });
    return school.idPrefix + String(n).padStart(4, '0');
  });
}

// Creates the student record, a private login token, and the Firebase login itself.
export async function createStudent(data) {
  const studentId = await nextId();
  const token = `${studentId}-${secret()}`;
  const cred = await createUserWithEmailAndPassword(secondaryAuth, toEmail(studentId), token);
  await signOut(secondaryAuth);
  const batch = writeBatch(db);
  batch.set(doc(db, 'students', studentId), { ...data, studentId, status: 'active', createdAt: serverTimestamp() });
  batch.set(doc(db, 'tokens', studentId), { token });
  batch.set(doc(db, 'users', cred.user.uid), { role: 'student', studentId, name: data.name });
  await batch.commit();
  return studentId;
}

// Shrinks a photo to a small JPEG so it can live in the student record.
export function resizePhoto(file, size = 240) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('That photo could not be read. Try a JPG or PNG.'));
    img.src = URL.createObjectURL(file);
  });
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

// Permanently removes students and everything tied to them.
// (Their sign-in account is left behind but can no longer be used, because their profile is gone.)
export async function deleteStudents(ids, onStep = () => {}) {
  const set = new Set(ids);
  const refs = [];
  ids.forEach(id => { refs.push(doc(db, 'students', id), doc(db, 'tokens', id)); });
  for (const col of ['users', 'fees', 'payments']) {
    onStep(`Finding ${col === 'users' ? 'logins' : col}…`);
    const snaps = await Promise.all(ids.map(id => getDocs(query(collection(db, col), where('studentId', '==', id)))));
    snaps.forEach(s => s.docs.forEach(d => refs.push(doc(db, col, d.id))));
  }
  for (let i = 0; i < refs.length; i += 400) {
    onStep(`Deleting records… ${Math.min(i + 400, refs.length)} of ${refs.length}`);
    const b = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => b.delete(r));
    await b.commit();
  }
  for (const [col, key] of [['marks', 'scores'], ['attendance', 'records']]) {
    onStep(`Cleaning ${col}…`);
    const docs = await listDocs(col);
    for (const d of docs) {
      const m = d[key] || {};
      if (!ids.some(id => id in m)) continue;
      const { id: docId, ...rest } = d;
      await putDoc(col, docId, { ...rest, [key]: Object.fromEntries(Object.entries(m).filter(([k]) => !set.has(k))) });
    }
  }
}
