import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Pre-hydrate battery saver class to prevent animation flash on boot
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('POS_BATTERY_SAVER') === 'true') {
    document.documentElement.classList.add('battery-saver');
  }
} catch (_) {}

createRoot(document.getElementById('root')!).render(<App />);
