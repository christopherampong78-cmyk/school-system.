import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { secondaryAuth } from '../firebase';
import { useData } from '../data';
import { putDoc } from '../lib/db';
import Crud from '../components/Crud';

export default function Staff() {
  const { classNames, subjects } = useData();
  const fields = [
    { key: 'photo', label: 'Photo', type: 'photo', list: false },
    { key: 'name', label: 'Full name', required: true },
    { key: 'role', label: 'Job title', type: 'select', required: true, options: ['Head Teacher', 'Teacher', 'Accountant', 'Administrator', 'Support Staff'] },
    { key: 'subject', label: 'Main subject', type: 'select', options: subjects.map(s => s.name) },
    { key: 'className', label: 'Class teacher of', type: 'select', options: classNames, list: false },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email', list: false },
    { key: 'status', label: 'Status', type: 'select', noBlank: true, options: ['Active', 'Inactive'], default: 'Active' },
    { key: 'loginRole', label: 'Give a system login as', type: 'select', onlyNew: true, list: false, options: [{ value: 'teacher', label: 'Teacher' }, { value: 'accountant', label: 'Accountant' }, { value: 'admin', label: 'Administrator' }] },
    { key: 'loginPassword', label: 'Password for the login (6+ characters)', type: 'password', onlyNew: true, list: false },
  ];

  async function customSave(data, isNew, id) {
    const { loginRole, loginPassword, ...rest } = data;
    if (isNew && loginRole) {
      if (!rest.email || !loginPassword) throw new Error('To create a login, add an email and a password of 6 or more characters.');
      const cred = await createUserWithEmailAndPassword(secondaryAuth, rest.email.trim().toLowerCase(), loginPassword);
      await signOut(secondaryAuth);
      await putDoc('users', cred.user.uid, { role: loginRole, name: rest.name, staffId: id });
      rest.loginRole = loginRole;
    }
    await putDoc('staff', id, rest);
  }

  return (
    <Crud title="Staff & Teachers" col="staff" fields={fields} customSave={customSave} singular="staff member"
      sort={(a, b) => (a.name || '').localeCompare(b.name || '')}
      hint="Add an email, a login role and a password to let this person sign in to the system."
      emptyText="No staff yet. Add your first teacher." />
  );
}
