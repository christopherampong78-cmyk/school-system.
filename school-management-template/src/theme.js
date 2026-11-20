import { useEffect, useState } from 'react';
import { school } from './config/school';

export function initTheme() {
  document.documentElement.style.setProperty('--primary', school.primary);
  document.documentElement.dataset.theme = localStorage.getItem('theme') || 'light';
  document.title = `${school.name} · School Management`;
}

export function useTheme() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}
