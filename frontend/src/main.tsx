import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

// Entry point: render App, enable routing, and provide auth state globally.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* BrowserRouter handles client-side navigation without page reloads */}
    <BrowserRouter>
      {/* AuthProvider exposes login state and helpers to all pages */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
