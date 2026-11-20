import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { OWNER, ADMIN, ACAD, FIN, ALL } from './lib/roles';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import IdCards from './pages/IdCards';
import StudentPortal from './pages/StudentPortal';
import Guardians from './pages/Guardians';
import Staff from './pages/Staff';
import { Classes, Subjects, Terms, Grading } from './pages/Setup';
import Attendance from './pages/Attendance';
import Timetable from './pages/Timetable';
import Exams from './pages/Exams';
import MarkEntry from './pages/MarkEntry';
import Fees from './pages/Fees';
import Settings from './pages/Settings';
import FirstSetup from './pages/FirstSetup';

function Guard({ roles, children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <div className="center-screen">This account has no role yet. Ask the administrator to set it up.</div>;
  if (!roles.includes(profile.role)) return <Navigate to={profile.role === 'student' ? '/me' : '/'} replace />;
  return children;
}

const P = ({ roles, el }) => <Guard roles={roles}>{el}</Guard>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<FirstSetup />} />
      <Route path="/me" element={<Guard roles={['student']}><StudentPortal /></Guard>} />
      <Route element={<Guard roles={ALL}><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="guardians" element={<P roles={ACAD} el={<Guardians />} />} />
        <Route path="staff" element={<P roles={ADMIN} el={<Staff />} />} />
        <Route path="id-cards" element={<P roles={ADMIN} el={<IdCards />} />} />
        <Route path="classes" element={<P roles={ACAD} el={<Classes />} />} />
        <Route path="subjects" element={<P roles={ACAD} el={<Subjects />} />} />
        <Route path="terms" element={<P roles={ADMIN} el={<Terms />} />} />
        <Route path="grading" element={<P roles={ACAD} el={<Grading />} />} />
        <Route path="attendance" element={<P roles={ACAD} el={<Attendance />} />} />
        <Route path="timetable" element={<P roles={ACAD} el={<Timetable />} />} />
        <Route path="exams" element={<P roles={ACAD} el={<Exams />} />} />
        <Route path="marks" element={<P roles={ACAD} el={<MarkEntry />} />} />
        <Route path="fees" element={<P roles={FIN} el={<Fees />} />} />
        <Route path="settings" element={<P roles={OWNER} el={<Settings />} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
