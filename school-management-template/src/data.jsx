import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { school as base } from './config/school';
import { useAuth } from './auth';
import { listDocs, slug } from './lib/db';
import { isAdminRole } from './lib/roles';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

const scene = (a, b, c) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='1600' height='900' fill='url(#g)'/><circle cx='1300' cy='180' r='260' fill='${c}' opacity='.18'/><circle cx='200' cy='760' r='340' fill='${c}' opacity='.14'/><path d='M0 700 Q400 600 800 700 T1600 680 V900 H0Z' fill='${c}' opacity='.16'/></svg>`)}`;
export const DEFAULT_BG = [scene('#1d5cff', '#6b1e9e', '#fff'), scene('#0f766e', '#1d4ed8', '#fff'), scene('#9333ea', '#db2777', '#fff')];

const SUBJECTS = ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Computing', 'Religious & Moral Education', 'Creative Arts', 'Ghanaian Language', 'French', 'Career Technology'];
const GRADES = [[1, 80, 100, 'Highest'], [2, 70, 79, 'Higher'], [3, 60, 69, 'High'], [4, 55, 59, 'High Average'], [5, 50, 54, 'Average'], [6, 45, 49, 'Low Average'], [7, 40, 44, 'Low'], [8, 35, 39, 'Lower'], [9, 0, 34, 'Lowest']];

async function seedDefaults() {
  const b = writeBatch(db);
  base.classes.forEach((name, i) => b.set(doc(db, 'classes', slug(name)), { name, teacher: '', room: '', capacity: 40, order: i }));
  SUBJECTS.forEach((name, i) => b.set(doc(db, 'subjects', slug(name)), { name, code: name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), order: i }));
  GRADES.forEach(([grade, min, max, remark]) => b.set(doc(db, 'grades', `g${grade}`), { grade, min, max, remark }));
  ['Term 1', 'Term 2', 'Term 3'].forEach((name, i) => b.set(doc(db, 'terms', `t${i + 1}`), { name, year: base.academicYear, start: '', end: '', current: i === 0 }));
  await b.commit();
}

export function DataProvider({ children }) {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState({});
  const [backgrounds, setBackgrounds] = useState([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [lists, setLists] = useState({ classes: [], subjects: [], terms: [], grades: [], students: [] });
  const role = profile?.role;
  const isStaff = ['owner', 'admin', 'teacher', 'accountant'].includes(role);

  const loadSettings = useCallback(async () => {
    try { const s = await getDoc(doc(db, 'settings', 'school')); setSettings(s.exists() ? s.data() : {}); } catch { /* not readable yet */ }
    try { const b = await listDocs('backgrounds'); setBackgrounds(b.sort((x, y) => (x.order || 0) - (y.order || 0))); } catch { /* none */ }
    setSettingsLoaded(true);
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const reload = useCallback(async (name) => {
    const names = name ? [name] : ['classes', 'subjects', 'terms', 'grades', 'students'];
    const out = {};
    await Promise.all(names.map(async (n) => { try { out[n] = await listDocs(n); } catch { out[n] = []; } }));
    setLists(l => ({ ...l, ...out }));
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      if (isAdminRole(role)) {
        const existing = await listDocs('classes').catch(() => []);
        if (!existing.length) await seedDefaults().catch(() => {});
      }
      await reload();
    })();
  }, [isStaff, role, reload, user?.uid]);

  const value = useMemo(() => {
    const classes = [...lists.classes].sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name || '').localeCompare(b.name || ''));
    const currentTerm = lists.terms.find(t => t.current) || null;
    const merged = { ...base, ...settings };
    return {
      settings, settingsLoaded, backgrounds, classes, currentTerm, reload, loadSettings,
      school: { ...merged, academicYear: currentTerm?.year || merged.academicYear, term: currentTerm?.name || merged.term },
      classNames: classes.length ? classes.map(c => c.name) : base.classes,
      subjects: [...lists.subjects].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
      terms: lists.terms,
      grades: [...lists.grades].sort((a, b) => Number(b.min) - Number(a.min)),
      students: [...lists.students].sort((a, b) => (a.studentId || '').localeCompare(b.studentId || '')),
    };
  }, [lists, settings, settingsLoaded, backgrounds, reload, loadSettings]);

  // Apply branding everywhere
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', value.school.primary);
    document.title = `${value.school.name} · School Management`;
    const icon = document.querySelector('link[rel=icon]');
    if (icon) icon.href = value.school.logo;
  }, [value.school.primary, value.school.name, value.school.logo]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
