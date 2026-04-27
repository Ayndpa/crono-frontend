import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, webDarkTheme, type Theme } from '@fluentui/react-components';
import App from './RSS/App';
import { LoginPage } from './Auth/LoginPage';
import type { AuthUser } from './api/auth';
import './index.css';

const RootApp: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('prefersDark') === 'true'; } catch { return false; }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try { localStorage.setItem('prefersDark', String(isDark)); } catch {}
  }, [isDark]);

  const handleLogin = (u: AuthUser) => setUser(u);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const theme: Theme = isDark ? webDarkTheme : webLightTheme;

  return (
    <FluentProvider theme={theme}>
      {user ? (
        <App
          isDark={isDark}
          toggleTheme={() => setIsDark(prev => !prev)}
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </FluentProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<RootApp />);
