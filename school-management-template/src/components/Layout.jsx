import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, Users, Briefcase, Contact, Layers, BookOpen, CalendarRange, SlidersHorizontal,
  CalendarCheck, Clock, Award, PenLine, Wallet, Settings, Moon, Sun, LogOut, Menu,
} from 'lucide-react';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useTheme } from '../theme';
import { OWNER, ADMIN, ACAD, FIN, ALL } from '../lib/roles';

const groups = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ALL }] },
  { title: 'Admissions & people', items: [
    { to: '/students', label: 'Students', icon: GraduationCap, roles: ALL },
    { to: '/guardians', label: 'Parents / Guardians', icon: Users, roles: ACAD },
    { to: '/staff', label: 'Staff & Teachers', icon: Briefcase, roles: ADMIN },
    { to: '/id-cards', label: 'ID Cards & QR', icon: Contact, roles: ADMIN },
  ] },
  { title: 'Academics', items: [
    { to: '/classes', label: 'Classes', icon: Layers, roles: ACAD },
    { to: '/subjects', label: 'Subjects', icon: BookOpen, roles: ACAD },
    { to: '/terms', label: 'Years & Terms', icon: CalendarRange, roles: ADMIN },
    { to: '/grading', label: 'Grading System', icon: SlidersHorizontal, roles: ACAD },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ACAD },
    { to: '/timetable', label: 'Timetables', icon: Clock, roles: ACAD },
  ] },
  { title: 'Exams & finance', items: [
    { to: '/exams', label: 'Examinations', icon: Award, roles: ACAD },
    { to: '/marks', label: 'Mark Entry', icon: PenLine, roles: ACAD },
    { to: '/fees', label: 'Fees & Payments', icon: Wallet, roles: FIN },
  ] },
  { title: 'System', items: [{ to: '/settings', label: 'Settings', icon: Settings, roles: OWNER }] },
];

export default function Layout() {
  const { profile, logout } = useAuth();
  const { school } = useData();
  const [theme, toggle] = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar no-print">
        <div className="brand">
          <img src={school.logo} alt="" />
          <div><b>{school.name}</b><span>{school.tagline}</span></div>
        </div>
        <nav onClick={() => setOpen(false)}>
          {groups.map(g => {
            const items = g.items.filter(i => i.roles.includes(profile?.role));
            if (!items.length) return null;
            return (
              <div key={g.title} className="nav-group">
                <p>{g.title}</p>
                {items.map(i => (
                  <NavLink key={i.to} to={i.to} end={i.end} className="nav-item"><i.icon size={18} />{i.label}</NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="side-user">
          <div className="avatar">{(profile?.name || '?')[0]}</div>
          <div><b>{profile?.name}</b><span>{profile?.role}</span></div>
          <button className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      {open && <div className="scrim no-print" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar no-print">
          <button className="icon-btn menu" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <span className="pill">{school.academicYear} · {school.term}</span>
          {__DEMO__ && <span className="pill demo">Demo mode</span>}
          <button className="icon-btn" onClick={toggle} aria-label="Toggle dark mode">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
