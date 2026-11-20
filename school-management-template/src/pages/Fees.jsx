import { useEffect, useMemo, useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { Receipt, Search } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { useData } from '../data';
import { listDocs, money, newId, putDoc, sum, today } from '../lib/db';
import Crud, { FormModal } from '../components/Crud';
import { FIN } from '../lib/roles';
import Seg from '../components/Seg';
import PrintModal from '../components/PrintModal';

const METHODS = ['Cash', 'Mobile Money', 'Bank', 'Cheque'];

function useStudentFields() {
  const { students } = useData();
  const options = students.map(s => ({ value: s.studentId, label: `${s.name} · ${s.className}` }));
  const attach = (data) => {
    const s = students.find(x => x.studentId === data.studentId);
    return { ...data, studentName: s?.name || data.studentName || '', className: s?.className || data.className || '' };
  };
  return { options, attach };
}

function paymentFields(options) {
  return [
    { key: 'studentId', label: 'Student', type: 'select', options, required: true, list: false },
    { key: 'studentName', label: 'Student', form: false },
    { key: 'className', label: 'Class', form: false },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'method', label: 'Paid by', type: 'select', options: METHODS, noBlank: true, default: 'Cash' },
    { key: 'date', label: 'Date', type: 'date', default: () => today(), required: true },
    { key: 'reference', label: 'Reference (MoMo ID, cheque no.)', list: false },
    { key: 'note', label: 'Note', list: false },
  ];
}
// Fields shown in the form (student name/class are filled in automatically)
const formOnly = (fs) => fs.filter(f => !['studentName', 'className'].includes(f.key));

function Balances() {
  const { students, classNames, school } = useData();
  const { options, attach } = useStudentFields();
  const [fees, setFees] = useState(null);
  const [pay, setPay] = useState(null);
  const [cls, setCls] = useState('');
  const [q, setQ] = useState('');
  const [owing, setOwing] = useState(false);
  const [payFor, setPayFor] = useState(null);

  const load = () => Promise.all([listDocs('fees'), listDocs('payments')]).then(([f, p]) => { setFees(f); setPay(p); });
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!fees || !pay) return [];
    return students
      .filter(s => s.status !== 'inactive' && (!cls || s.className === cls) && (s.name || '').toLowerCase().includes(q.toLowerCase()))
      .map(s => {
        const billed = sum(fees.filter(f => f.studentId === s.studentId), 'amount');
        const paid = sum(pay.filter(p => p.studentId === s.studentId), 'amount');
        return { s, billed, paid, bal: billed - paid };
      })
      .filter(r => !owing || r.bal > 0);
  }, [students, fees, pay, cls, q, owing]);

  const cur = school.currency;
  return (
    <div className="card">
      <div className="filters">
        <span className="input-icon"><Search size={16} /><input placeholder="Search student" value={q} onChange={e => setQ(e.target.value)} /></span>
        <select value={cls} onChange={e => setCls(e.target.value)}><option value="">All classes</option>{classNames.map(c => <option key={c}>{c}</option>)}</select>
        <label className="check"><input type="checkbox" checked={owing} onChange={e => setOwing(e.target.checked)} /> Owing only</label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Student</th><th>Class</th><th>Billed</th><th>Paid</th><th>Balance</th><th /></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.s.studentId}>
                <td>{r.s.name}</td><td>{r.s.className}</td><td>{money(r.billed, cur)}</td><td>{money(r.paid, cur)}</td>
                <td style={{ color: r.bal > 0 ? 'var(--danger)' : 'var(--ok)', fontWeight: 700 }}>{money(r.bal, cur)}</td>
                <td><button className="btn" onClick={() => setPayFor(r.s.studentId)}>Record payment</button></td>
              </tr>
            ))}
            {fees && rows.length === 0 && <tr><td colSpan={6} className="muted empty">No students match.</td></tr>}
            {fees && rows.length > 0 && (
              <tr className="total-row"><td colSpan={2}>Total</td><td>{money(sum(rows, 'billed'), cur)}</td><td>{money(sum(rows, 'paid'), cur)}</td><td>{money(sum(rows, 'bal'), cur)}</td><td /></tr>
            )}
          </tbody>
        </table>
      </div>
      {payFor && (
        <FormModal title="Record payment" fields={formOnly(paymentFields(options))} initial={{ studentId: payFor }}
          onSave={async (v) => { await putDoc('payments', newId(), attach(v)); await load(); }} onClose={() => setPayFor(null)} />
      )}
    </div>
  );
}

function Bills() {
  const { students, classNames, terms, school } = useData();
  const { options, attach } = useStudentFields();
  const [bulk, setBulk] = useState(false);
  const [bump, setBump] = useState(0);

  const fields = [
    { key: 'studentId', label: 'Student', type: 'select', options, required: true, list: false },
    { key: 'studentName', label: 'Student', form: false },
    { key: 'className', label: 'Class', form: false },
    { key: 'term', label: 'Term', type: 'select', options: [...new Set(terms.map(t => t.name))] },
    { key: 'description', label: 'What is it for?', required: true, default: 'School fees' },
    { key: 'amount', label: `Amount (${school.currency})`, type: 'number', required: true },
  ];
  const bulkFields = [
    { key: 'className', label: 'Bill which class?', type: 'select', options: classNames, blank: true },
    { key: 'term', label: 'Term', type: 'select', options: [...new Set(terms.map(t => t.name))] },
    { key: 'description', label: 'What is it for?', required: true, default: 'School fees' },
    { key: 'amount', label: `Amount per student (${school.currency})`, type: 'number', required: true },
  ];

  async function billClass(v) {
    const targets = students.filter(s => s.status !== 'inactive' && (!v.className || s.className === v.className));
    if (!targets.length) throw new Error('There are no active students to bill in that class.');
    for (let i = 0; i < targets.length; i += 400) {
      const b = writeBatch(db);
      targets.slice(i, i + 400).forEach(s => b.set(doc(db, 'fees', newId()), {
        studentId: s.studentId, studentName: s.name, className: s.className, term: v.term || '',
        description: v.description, amount: v.amount, createdAt: Date.now(),
      }));
      await b.commit();
    }
    setBump(x => x + 1);
  }

  return (
    <>
      <Crud key={bump} title="Bills" compact col="fees" fields={fields} editRoles={FIN} singular="bill" addLabel="Add"
        transform={attach} sort={(a, b) => (b.createdAt || 0) - (a.createdAt || 0)}
        toolbar={<button className="btn" onClick={() => setBulk(true)}>Bill a whole class</button>}
        emptyText="No bills yet. Use Bill a whole class to charge school fees." />
      {bulk && <FormModal title="Bill a whole class" fields={bulkFields} onSave={billClass} onClose={() => setBulk(false)}
        hint="Leave the class on None to bill every active student." />}
    </>
  );
}

function Payments() {
  const { school } = useData();
  const { options, attach } = useStudentFields();
  const { profile } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const fields = paymentFields(options).map(f => (f.key === 'amount' ? { ...f, fmt: (v) => money(v, school.currency) } : f));
  return (
    <>
      <Crud title="Payments" compact col="payments" fields={fields}
        editRoles={FIN} singular="payment" addLabel="Record" transform={attach}
        sort={(a, b) => (b.date || '').localeCompare(a.date || '')}
        rowActions={(r) => <button className="btn" onClick={() => setReceipt(r)}><Receipt size={14} /> Receipt</button>}
        emptyText="No payments yet." />
      {receipt && (
        <PrintModal title="Receipt" onClose={() => setReceipt(null)}>
          <div className="report">
            <div className="report-head">
              <img src={school.logo} alt="" />
              <div><h2>{school.name}</h2><p>{school.address}{school.phone ? ` · Tel ${school.phone}` : ''}</p><b>Payment receipt</b></div>
            </div>
            <div className="report-info">
              <span><b>Receipt no:</b> {receipt.id.slice(-8).toUpperCase()}</span><span><b>Date:</b> {receipt.date}</span>
              <span><b>Student:</b> {receipt.studentName}</span><span><b>Class:</b> {receipt.className}</span>
              <span><b>Paid by:</b> {receipt.method}</span><span><b>Reference:</b> {receipt.reference || '—'}</span>
            </div>
            <h2 style={{ margin: '14px 0' }}>Amount received: {money(receipt.amount, school.currency)}</h2>
            {receipt.note && <p>{receipt.note}</p>}
            <div className="sign"><span>Received by {profile?.name}</span><span>Parent / guardian</span></div>
          </div>
        </PrintModal>
      )}
    </>
  );
}

function Expenses() {
  const { school } = useData();
  const fields = [
    { key: 'date', label: 'Date', type: 'date', required: true, default: () => today() },
    { key: 'category', label: 'Category', type: 'select', options: ['Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Transport', 'Other'], required: true },
    { key: 'description', label: 'Description', required: true },
    { key: 'amount', label: `Amount (${school.currency})`, type: 'number', required: true, fmt: (v) => money(v, school.currency) },
    { key: 'paidTo', label: 'Paid to', list: false },
  ];
  return (
    <Crud title="Expenses" compact col="expenses" fields={fields} editRoles={FIN} singular="expense" addLabel="Add"
      sort={(a, b) => (b.date || '').localeCompare(a.date || '')} emptyText="No expenses yet." />
  );
}

export default function Fees() {
  const [tab, setTab] = useState('balances');
  return (
    <>
      <div className="page-head"><div><h2>Fees & Payments</h2><p className="muted">Bill students, record payments, print receipts and track expenses.</p></div></div>
      <Seg tabs={[['balances', 'Balances'], ['bills', 'Bills'], ['payments', 'Payments'], ['expenses', 'Expenses']]} value={tab} onChange={setTab} />
      {tab === 'balances' && <Balances />}
      {tab === 'bills' && <Bills />}
      {tab === 'payments' && <Payments />}
      {tab === 'expenses' && <Expenses />}
    </>
  );
}
