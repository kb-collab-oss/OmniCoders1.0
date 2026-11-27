import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/app.css';

async function start() {
  // API simulée : uniquement en développement (import.meta.env.DEV est faux dans le build de production)
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true') {
    const { setupMock } = await import('./mock/setupMock');
    setupMock();
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
}

start();
