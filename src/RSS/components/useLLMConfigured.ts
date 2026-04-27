import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/client';

export function useLLMConfigured() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(() => {
    setLoading(true);
    apiFetch('/config/llm_config_id')
      .then(res => res.json())
      .then(data => setConfigured(!!data?.value))
      .catch(() => setConfigured(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { check(); }, []);

  return { configured, loading, recheck: check };
}
