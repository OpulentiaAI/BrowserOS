import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

console.log('Sidebar script loaded');

try {
  const rootElement = document.getElementById('root');
  console.log('Root element:', rootElement);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);
  console.log('React root created');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered');
} catch (error) {
  console.error('Failed to mount React app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h2>Error loading sidebar</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>
  `;
}
