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

type ValidationIssue = {
  msg?: unknown;
  loc?: unknown;
};

function formatErrorDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return '';

        const issue = item as ValidationIssue;
        return typeof issue.msg === 'string' ? issue.msg : '';
      })
      .filter(Boolean);

    if (messages.length > 0) return messages.join('；');
  }

  return '请求失败';
}

async function post(path: string, body: object): Promise<AuthResult> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(formatErrorDetail(data.detail));
  return data as AuthResult;
}

export const authApi = {
  register: (username: string, password: string) =>
    post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    post('/auth/login', { username, password }),
};
