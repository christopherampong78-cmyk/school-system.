import { useData } from '../data';
import { listDocs, patchDoc, putDoc } from '../lib/db';
import { ADMIN } from '../lib/roles';
import Crud from '../components/Crud';

export function Classes() {
  const { reload } = useData();
  const fields = [
    { key: 'name', label: 'Class name', required: true },
    { key: 'teacher', label: 'Class teacher' },
    { key: 'room', label: 'Room' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'order', label: 'Order', type: 'number', list: false, placeholder: 'Lower numbers show first' },
  ];
  return (
    <Crud title="Classes" col="classes" fields={fields} editRoles={ADMIN} singular="class" onChanged={() => reload('classes')}
      sort={(a, b) => (a.order ?? 999) - (b.order ?? 999)}
      hint="Renaming a class does not move students already in it. Edit those students to match."
      emptyText="No classes yet." />
  );
}

export function Subjects() {
  const { reload } = useData();
  const fields = [
    { key: 'name', label: 'Subject name', required: true },
    { key: 'code', label: 'Short code' },
    { key: 'order', label: 'Order', type: 'number', list: false },
  ];
  return (
    <Crud title="Subjects" col="subjects" fields={fields} editRoles={ADMIN} singular="subject" onChanged={() => reload('subjects')}
      sort={(a, b) => (a.order ?? 999) - (b.order ?? 999)} emptyText="No subjects yet." />
  );
}

export function Terms() {
  const { reload } = useData();
  const fields = [
    { key: 'name', label: 'Term name', required: true, placeholder: 'Term 1' },
    { key: 'year', label: 'Academic year', required: true, placeholder: '2025/2026' },
    { key: 'start', label: 'Starts', type: 'date' },
    { key: 'end', label: 'Ends', type: 'date' },
    { key: 'current', label: 'This is the current term', type: 'checkbox' },
  ];
  async function customSave(data, isNew, id) {
    if (data.current) {
      const all = await listDocs('terms');
      await Promise.all(all.filter(t => t.id !== id && t.current).map(t => patchDoc('terms', t.id, { current: false })));
    }
    await putDoc('terms', id, data);
  }
  return (
    <Crud title="Years & Terms" col="terms" fields={fields} editRoles={ADMIN} singular="term" customSave={customSave}
      onChanged={() => reload('terms')} sort={(a, b) => (b.year || '').localeCompare(a.year || '') || (a.name || '').localeCompare(b.name || '')}
      hint="The current term shows in the top bar and on ID cards."
      emptyText="No terms yet." />
  );
}

export function Grading() {
  const { reload } = useData();
  const fields = [
    { key: 'grade', label: 'Grade', required: true, placeholder: '1' },
    { key: 'min', label: 'From (%)', type: 'number', required: true },
    { key: 'max', label: 'To (%)', type: 'number', required: true },
    { key: 'remark', label: 'Remark' },
  ];
  return (
    <Crud title="Grading System" col="grades" fields={fields} editRoles={ADMIN} singular="grade" onChanged={() => reload('grades')}
      sort={(a, b) => Number(b.min) - Number(a.min)}
      hint="Marks are converted to a percentage and matched to these ranges."
      emptyText="No grades yet." />
  );
}
