import { useData } from '../data';
import Crud from '../components/Crud';
import { ADMIN } from '../lib/roles';

export default function Guardians() {
  const { students } = useData();
  const fields = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email', list: false },
    { key: 'occupation', label: 'Occupation', list: false },
    { key: 'address', label: 'Address', type: 'textarea', list: false },
    { key: 'children', label: 'Children', type: 'multi', options: students.map(s => ({ value: s.studentId, label: `${s.name} · ${s.className}` })), fmt: (v) => (Array.isArray(v) ? v.length : 0) },
  ];
  return (
    <Crud title="Parents / Guardians" col="guardians" fields={fields} editRoles={ADMIN} addLabel="Add" singular="guardian"
      sort={(a, b) => (a.name || '').localeCompare(b.name || '')} emptyText="No guardians yet. Add the first one." />
  );
}
