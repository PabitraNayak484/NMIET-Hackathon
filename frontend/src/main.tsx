// SATHI — React entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

const root = document.getElementById('app');
if (!root) throw new Error('No #app element found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
