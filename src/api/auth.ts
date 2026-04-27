const BASE = import.meta.env.VITE_BACKEND_URL as string;

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthResult {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

async function post(path: string, body: object): Promise<AuthResult> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? '请求失败');
  return data as AuthResult;
}

export const authApi = {
  register: (username: string, password: string) =>
    post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    post('/auth/login', { username, password }),
};
