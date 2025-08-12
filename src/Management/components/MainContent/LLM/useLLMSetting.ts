import { useState, useEffect } from 'react';
import { type LLMConfig, getConfigs, createConfig, updateConfig, deleteConfig } from './api/llmConfig';
import axios from 'axios';


/**
 * 自定义 Hook，用于管理 LLM 配置的CRUD操作和状态。
 */
export const useManagement = () => {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);

  /**
   * 从 API 加载配置数据。
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getConfigs();
      setConfigs(res.data);
    } catch (err) {
      setError('数据加载失败。请检查后端服务是否运行或网络连接。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * 处理新配置的创建。
   */
  const handleCreate = async (data: Omit<LLMConfig, 'id'>) => {
    try {
      await createConfig(data);
      await loadData();
    } catch (err) {
      setError('创建配置失败。');
      throw err;
    }
  };

  /**
   * 处理现有配置的更新。
   */
  const handleUpdate = async (id: string, data: Omit<LLMConfig, 'id'>) => {
    try {
      await updateConfig(id, data);
      await loadData();
    } catch (err) {
      setError('更新配置失败。');
      throw err;
    }
  };

  /**
   * 显示删除确认对话框。
   */
  const confirmDelete = (id: string) => {
    setConfigToDelete(id);
    setShowDeleteConfirm(true);
  };

  /**
   * 执行配置删除操作。
   */
  const handleDelete = async () => {
    if (configToDelete) {
      try {
        await deleteConfig(configToDelete);
        await loadData();
        setShowDeleteConfirm(false);
        setConfigToDelete(null);
      } catch (err) {
        setError('删除配置失败。');
      }
    }
  };

  /**
   * 关闭删除确认对话框。
   */
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setConfigToDelete(null);
  };

  useEffect(() => {
    // Fetch the current llm_config_id from the backend
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/config/llm_config_id`)
      .then((response) => {
        setCurrentConfigId(response.data.value); // 保存当前配置 ID
      })
      .catch((err) => {
        console.error('Failed to fetch llm_config_id:', err);
      });
  }, []);

  const setLLMConfigId = async (id: string) => {
    try {
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/config/llm_config_id`, { key: 'llm_config_id', value: id });
      setCurrentConfigId(id); // 更新当前配置 ID
    } catch (err) {
      console.error('Failed to update llm_config_id:', err);
      throw err;
    }
  };

  return {
    configs,
    loading,
    error,
    showDeleteConfirm,
    confirmDelete,
    handleDelete,
    cancelDelete,
    handleCreate,
    handleUpdate,
    currentConfigId,
    setLLMConfigId,
  };
};