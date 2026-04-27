import axios from 'axios';

export interface LLMConfig {
  id: string;
  base_url: string;
  model: string;
  api_key: string;
}

export type LLMConfigInput = Omit<LLMConfig, 'id'>;

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/llm/llm_config`;

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getConfigs = () =>
  axios.get<LLMConfig[]>(API_BASE, { headers: authHeaders() });

export const createConfig = (config: LLMConfigInput) =>
  axios.post<LLMConfig>(API_BASE, config, { headers: authHeaders() });

export const updateConfig = (id: string, config: LLMConfigInput) =>
  axios.patch<LLMConfig>(`${API_BASE}/${id}`, config, { headers: authHeaders() });

export const deleteConfig = (id: string) =>
  axios.delete<void>(`${API_BASE}/${id}`, { headers: authHeaders() });
