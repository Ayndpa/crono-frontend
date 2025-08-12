import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, webDarkTheme, type Theme } from '@fluentui/react-components';
import App from './RSS/App';
import './index.css';

const RootApp: React.FC = () => {
  // 用 boolean 控制 light/dark；也可以直接保存 Theme 对象
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('prefersDark') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('prefersDark', String(isDark));
    } catch {}
  }, [isDark]);

  const theme: Theme = isDark ? webDarkTheme : webLightTheme;

  return (
    <FluentProvider theme={theme}>
      {/* 把切换函数传给 App（或在任何地方用 context/state 管理） */}
      <App isDark={isDark} toggleTheme={() => setIsDark(prev => !prev)} />
    </FluentProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<RootApp />);
