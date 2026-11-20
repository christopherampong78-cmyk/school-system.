import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Briefcase, CalendarCheck, GraduationCap, Wallet } from 'lucide-react';
import { db } from '../firebase';
import { useData } from '../data';
import { listDocs, money, sum, today } from '../lib/db';

export default function Dashboard() {
  const { students, school, classNames } = useData();
  const [x, setX] = useState(null);

  useEffect(() => {
    const safe = async (fn) => { try { return await fn(); } catch { return null; } };
    (async () => {
      const [staff, fees, pay, exp, att] = await Promise.all([
        safe(() => listDocs('staff')),
        safe(() => listDocs('fees')),
        safe(() => listDocs('payments')),
        safe(() => listDocs('expenses')),
        safe(async () => (await getDocs(query(collection(db, 'attendance'), where('date', '==', today())))).docs.map(d => d.data())),
      ]);
      setX({ staff, fees, pay, exp, att });
    })();
  }, []);

  if (!x) return <p className="muted">Loading dashboard…</p>;

  const cur = school.currency;
  const active = students.filter(s => s.status !== 'inactive');
  const boys = active.filter(s => s.gender === 'Male').length;
  const girls = active.filter(s => s.gender === 'Female').length;
  const pct = boys + girls ? Math.round((boys / (boys + girls)) * 100) : 50;
  const money_ok = x.fees && x.pay;
  const invoiced = money_ok ? sum(x.fees, 'amount') : 0;
  const collected = money_ok ? sum(x.pay, 'amount') : 0;
  const outstanding = Math.max(0, invoiced - collected);
  const expenses = x.exp ? sum(x.exp, 'amount') : 0;
  const net = collected - expenses;

  let attLabel = '—', attSub = 'No roll-call yet today';
  if (x.att && x.att.length) {
    const recs = x.att.flatMap(d => Object.values(d.records || {}));
    const here = recs.filter(r => r === 'P' || r === 'L').length;
    attLabel = `${Math.round((here / Math.max(1, recs.length)) * 100)}%`;
    attSub = `${x.att.length} class${x.att.length === 1 ? '' : 'es'} marked today`;
  }

  const stats = [
    ['Total students', students.length, GraduationCap, `Active: ${active.length}`],
    ['Total staff', x.staff ? x.staff.length : '—', Briefcase, x.staff ? `Teachers: ${x.staff.filter(s => /teacher/i.test(s.role || '')).length}` : ''],
    ["Today's attendance", attLabel, CalendarCheck, attSub],
    ['Net cash flow', money_ok ? money(net, cur) : '—', Wallet, money_ok ? `Expenses: ${money(expenses, cur)}` : 'Finance is for admin and accountant'],
  ];
  const byClass = classNames.map(c => [c, active.filter(s => s.className === c).length]).filter(([, n]) => n > 0);
  const maxC = Math.max(1, ...byClass.map(([, n]) => n));
  const bars = [['Invoiced', invoiced, 'var(--primary)'], ['Collected', collected, '#10b981'], ['Outstanding', outstanding, '#f43f5e'], ['Expenses', expenses, '#f59e0b'], ['Net', Math.max(0, net), '#6366f1']];
  const maxB = Math.max(1, ...bars.map(b => b[1]));

  return (
    <>
      <h2>Administrator Dashboard</h2>
      <p className="muted">Overview of school operations, enrollment, daily attendance and cash flow.</p>
      <div className="stats">
        {stats.map(([label, value, Icon, sub]) => (
          <div key={label} className="card stat">
            <div><span>{label}</span><strong>{value}</strong></div>
            <div className="stat-icon"><Icon size={20} /></div>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      {money_ok && (
        <div className="stats three">
          {[['Total invoiced', invoiced, 'var(--primary)', 100], ['Total collections', collected, '#10b981', invoiced ? (collected / invoiced) * 100 : 0], ['Outstanding fees', outstanding, '#f43f5e', invoiced ? (outstanding / invoiced) * 100 : 0]].map(([l, v, c, w]) => (
            <div key={l} className="card stat">
              <span>{l}</span><strong style={{ color: c }}>{money(v, cur)}</strong>
              <div className="meter"><i style={{ width: `${Math.min(100, w)}%`, background: c }} /></div>
            </div>
          ))}
        </div>
      )}
      <div className="two-col">
        <div className="card">
          <h3>Student demographics</h3>
          <div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${pct}%, #ec4899 ${pct}% 100%)` }}><span /></div>
          <p className="legend"><i style={{ background: 'var(--primary)' }} />Boys {boys} <i style={{ background: '#ec4899' }} />Girls {girls}</p>
        </div>
        {money_ok ? (
          <div className="card">
            <h3>Financial overview</h3>
            <div className="vbars">
              {bars.map(([l, v, c]) => (
                <div key={l}><i style={{ height: `${(v / maxB) * 100}%`, background: c }} /><small>{l}</small></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>Students per class</h3>
            {byClass.length === 0 && <p className="muted">No students yet.</p>}
            {byClass.map(([c, n]) => (
              <div key={c} className="bar-row"><span>{c}</span><div><i style={{ width: `${(n / maxC) * 100}%` }} /></div><b>{n}</b></div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
