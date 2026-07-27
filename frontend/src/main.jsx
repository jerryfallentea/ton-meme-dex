import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0a0b0f');
  tg.setBackgroundColor('#0a0b0f');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
