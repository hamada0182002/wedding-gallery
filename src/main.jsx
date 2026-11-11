import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);

['gesturestart','gesturechange','gestureend'].forEach((e) => document.addEventListener(e, (ev) => ev.preventDefault()));
document.addEventListener('touchmove', (ev) => { if (ev.touches.length > 1) ev.preventDefault(); }, { passive: false });
