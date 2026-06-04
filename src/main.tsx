import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from './context/AuthContext.tsx';
import AuthShell from './components/AuthShell.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthShell />
    </AuthProvider>
  </StrictMode>,
);
