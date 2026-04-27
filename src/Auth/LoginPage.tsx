import { useState } from 'react';
import {
  Button,
  Field,
  Input,
  Tab,
  TabList,
  Card,
  CardHeader,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { authApi, type AuthUser } from '../api/auth';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  card: {
    width: '360px',
    padding: '32px',
  },
  title: {
    textAlign: 'left',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

interface LoginPageProps {
  onLogin: (user: AuthUser, token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const styles = useStyles();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setLoading(true);
    try {
      const result = tab === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, password);
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('user', JSON.stringify(result.user));
      onLogin(result.user, result.access_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <CardHeader
          header={
            <div className={styles.title}>
              <Text size={600} weight="semibold">Cronos</Text>
              <br />
              <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
                智能 RSS 阅读系统
              </Text>
            </div>
          }
        />

        <TabList
          selectedValue={tab}
          onTabSelect={(_, d) => { setTab(d.value as 'login' | 'register'); setError(''); }}
        >
          <Tab value="login">登录</Tab>
          <Tab value="register">注册</Tab>
        </TabList>

        <div className={styles.form}>
          <Field label="用户名">
            <Input
              value={username}
              onChange={(_, d) => setUsername(d.value)}
              placeholder="请输入用户名"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </Field>
          <Field label="密码">
            <Input
              type="password"
              value={password}
              onChange={(_, d) => setPassword(d.value)}
              placeholder={tab === 'register' ? '至少 6 位' : '请输入密码'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </Field>

          {error && <Text className={styles.error}>{error}</Text>}

          <Button
            appearance="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '请稍候...' : tab === 'login' ? '登录' : '注册'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
