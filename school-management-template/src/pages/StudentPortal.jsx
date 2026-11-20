import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { LogOut, Moon, Sun, Printer } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useTheme } from '../theme';
import { money, sum } from '../lib/db';
import { CardBack, CardFront } from '../components/IdCard';

export default function StudentPortal() {
  const { profile, logout } = useAuth();
  const { school } = useData();
  const [theme, toggle] = useTheme();
  const [s, setS] = useState(null);
  const [token, setToken] = useState('');
  const [fees, setFees] = useState(null);

  useEffect(() => {
    const id = profile.studentId;
    getDoc(doc(db, 'students', id)).then(x => setS(x.data()));
    getDoc(doc(db, 'tokens', id)).then(x => setToken(x.data()?.token || ''));
    Promise.all([
      getDocs(query(collection(db, 'fees'), where('studentId', '==', id))),
      getDocs(query(collection(db, 'payments'), where('studentId', '==', id))),
    ]).then(([f, p]) => {
      const billed = sum(f.docs.map(d => d.data()), 'amount');
      const paid = sum(p.docs.map(d => d.data()), 'amount');
      setFees({ billed, paid, balance: billed - paid });
    }).catch(() => setFees(null));
  }, [profile]);

  return (
    <div className="portal">
      <header className="topbar no-print">
        <b>{school.name}</b>
        <span style={{ flex: 1 }} />
        <button className="icon-btn" onClick={toggle} aria-label="Toggle dark mode">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
      </header>
      <main className="content narrow">
        {!s ? <p className="muted">Loading your details…</p> : (
          <>
            <h2>Hello, {s.name.split(' ')[0]}</h2>
            <p className="muted">{s.className} · {school.academicYear} · {school.term}</p>
            {fees && (
              <div className="card no-print" style={{ marginTop: 16 }}>
                <h3>My fees</h3>
                <p>Billed: <b>{money(fees.billed, school.currency)}</b> · Paid: <b>{money(fees.paid, school.currency)}</b></p>
                <p>Balance: <b style={{ color: fees.balance > 0 ? 'var(--danger)' : 'var(--ok)' }}>{money(fees.balance, school.currency)}</b></p>
              </div>
            )}
            <div className="card-pair print-area"><CardFront s={s} /><CardBack s={s} token={token} /></div>
            <button className="btn no-print" onClick={() => window.print()}><Printer size={16} /> Print my ID card</button>
            <p className="hint no-print">Keep your token private. Anyone with it can sign in as you.</p>
          </>
        )}
      </main>
    </div>
  );
}
