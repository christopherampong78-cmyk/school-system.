// In-memory "fake Firebase" used only in demo mode. Data is kept in this browser (localStorage).
import { school } from '../config/school';

const KEY = 'demo-db-v3';
const FIRST = ['Ama', 'Kofi', 'Yaa', 'Kwame', 'Abena', 'Yaw', 'Akosua', 'Kwesi', 'Efua', 'Fiifi', 'Adjoa', 'Kojo', 'Esi', 'Nana', 'Mavis', 'Samuel', 'Gifty', 'Isaac', 'Comfort', 'Daniel', 'Grace', 'Emmanuel', 'Patience', 'Joseph'];
const LAST = ['Mensah', 'Boateng', 'Asante', 'Owusu', 'Appiah', 'Osei', 'Adjei', 'Agyeman', 'Darko', 'Ampofo', 'Tetteh', 'Quaye'];

function seed() {
  const docs = {};
  const creds = {};
  creds['owner@demo.school'] = { uid: 'u-owner', password: 'owner123' };
  docs['users/u-owner'] = { role: 'owner', name: 'Demo Owner' };
  creds['admin@demo.school'] = { uid: 'u-admin', password: 'admin123' };
  docs['users/u-admin'] = { role: 'admin', name: 'Demo School Admin' };
  docs['settings/school'] = { setupDone: true };
  creds['teacher@demo.school'] = { uid: 'u-teacher', password: 'teacher123' };
  docs['users/u-teacher'] = { role: 'teacher', name: 'Demo Teacher' };
  const classes = school.classes.slice(5);
  FIRST.forEach((f, i) => {
    const n = i + 1;
    const id = school.idPrefix + String(n).padStart(4, '0');
    const token = `${id}-DEMO${String(n).padStart(4, '0')}`;
    docs[`students/${id}`] = {
      name: `${f} ${LAST[i % LAST.length]}`, className: classes[i % classes.length],
      gender: i % 2 ? 'Male' : 'Female', guardianName: `Mr/Mrs ${LAST[(i + 3) % LAST.length]}`,
      guardianPhone: `024000${String(1000 + n)}`, photo: '', studentId: id, status: i === 7 ? 'inactive' : 'active',
    };
    docs[`tokens/${id}`] = { token };
    docs[`users/u-${id}`] = { role: 'student', studentId: id, name: docs[`students/${id}`].name };
    creds[`${id.toLowerCase()}@${school.authDomain}`] = { uid: `u-${id}`, password: token };
  });

  // sample staff
  [['Mr. Kwabena Owusu', 'Head Teacher', 'English Language'], ['Mrs. Efua Danso', 'Teacher', 'Mathematics'], ['Mr. Yaw Frimpong', 'Teacher', 'Computing'], ['Ms. Akua Sarpong', 'Accountant', '']]
    .forEach(([name, role, subject], i) => { docs[`staff/s${i + 1}`] = { name, role, subject, phone: `020000${1000 + i}`, email: '', className: '', status: 'Active' }; });
  // sample bills and payments
  FIRST.forEach((f, i) => {
    const id = school.idPrefix + String(i + 1).padStart(4, '0');
    const amount = i % classes.length > 5 ? 1500 : 1200;
    docs[`fees/f${i + 1}`] = { studentId: id, studentName: docs[`students/${id}`].name, className: docs[`students/${id}`].className, term: 'Term 1', description: 'School fees', amount, createdAt: Date.now() };
    const paid = i % 3 === 0 ? amount : i % 3 === 1 ? Math.round(amount / 2) : 0;
    if (paid) docs[`payments/p${i + 1}`] = { studentId: id, studentName: docs[`students/${id}`].name, className: docs[`students/${id}`].className, amount: paid, method: i % 2 ? 'Mobile Money' : 'Cash', date: new Date().toISOString().slice(0, 10), reference: '', note: '' };
  });
  docs['expenses/e1'] = { date: new Date().toISOString().slice(0, 10), category: 'Supplies', description: 'Chalk and markers', amount: 150, paidTo: '' };
  docs['meta/studentCounter'] = { next: FIRST.length + 1 };
  return { docs, creds };
}

let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
if (!db) db = seed();

export const store = db;
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full */ } };
export const resetDemo = () => { localStorage.removeItem(KEY); location.reload(); };
