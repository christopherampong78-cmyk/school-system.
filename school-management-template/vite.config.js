import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const demoFile = (f) => fileURLToPath(new URL(`./src/demo/${f}.js`, import.meta.url));

// Demo mode switches on automatically when no Firebase key is set in .env
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const demo = !env.VITE_FIREBASE_API_KEY;
  return {
    plugins: [react()],
    define: { __DEMO__: JSON.stringify(demo) },
    resolve: demo ? {
      alias: [
        { find: /^firebase\/app$/, replacement: demoFile('app') },
        { find: /^firebase\/auth$/, replacement: demoFile('auth') },
        { find: /^firebase\/firestore$/, replacement: demoFile('firestore') },
      ],
    } : {},
  };
});
