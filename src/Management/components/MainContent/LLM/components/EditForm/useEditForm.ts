import { useState, useEffect } from 'react';
import type { LLMConfig } from '../../api/llmConfig';

export function useEditForm(initialData?: Omit<LLMConfig, 'id'> & { id?: string }, onSubmit?: (data: Omit<LLMConfig, 'id'>) => Promise<void>) {
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState(initialData?.model || '');
  const [baseUrl, setBaseUrl] = useState(initialData?.base_url || '');
  const [apiKey, setApiKey] = useState(initialData?.api_key || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ model?: string; baseUrl?: string; apiKey?: string }>({});

  useEffect(() => {
    if (isOpen) {
      setModel(initialData?.model || '');
      setBaseUrl(initialData?.base_url || '');
      setApiKey(initialData?.api_key || '');
      setErrors({});
    }
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!model.trim()) {
      newErrors.model = '请输入模型名称';
    }
    
    if (!baseUrl.trim()) {
      newErrors.baseUrl = '请输入 Base URL';
    } else if (!baseUrl.match(/^https?:\/\/.+/)) {
      newErrors.baseUrl = '请输入有效的 URL';
    }
    
    if (!apiKey.trim()) {
      newErrors.apiKey = '请输入 API Key';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ model, base_url: baseUrl, api_key: apiKey });
      }
      setIsOpen(false);
      if (!initialData) {
        setModel('');
        setBaseUrl('');
        setApiKey('');
      }
    } catch (error) {
      console.error('表单提交失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    model,
    setModel,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    isSubmitting,
    errors,
    handleSubmit,
  };
}
