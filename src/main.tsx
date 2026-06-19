import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.tsx';

function dismissPwaSplash() {
  const splash = document.getElementById('pwa-splash');
  if (!splash) return;
  splash.classList.add('pwa-splash--out');
  window.setTimeout(() => splash.remove(), 340);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(dismissPwaSplash);
