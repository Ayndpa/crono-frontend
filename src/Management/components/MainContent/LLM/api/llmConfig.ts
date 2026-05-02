import { apiFetch } from '../../../../../api/client';

export interface LLMConfig {
  id: string;
  base_url: string;
  model: string;
  api_key: string;
}

export type LLMConfigInput = Omit<LLMConfig, 'id'>;

const API_BASE = '/llm/llm_config';

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail ?? '请求失败');
  }
  return data as T;
}

export const getConfigs = () =>
  requestJson<LLMConfig[]>(API_BASE);

export const createConfig = (config: LLMConfigInput) =>
  requestJson<LLMConfig>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(config),
  });

export const updateConfig = (id: string, config: LLMConfigInput) =>
  requestJson<LLMConfig>(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });

export const deleteConfig = (id: string) =>
  apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' }).then(async (response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? '请求失败');
    }
  });
