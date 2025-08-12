import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Button,
  Spinner,
  MessageBar,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  makeStyles,
  Card,
  Divider,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import axios from 'axios';

import { useManagement } from './useLLMSetting';
import { EditForm } from './components/EditForm/EditForm';

// --- 样式 ---
const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tableActions: {
    display: 'flex',
    gap: '10px',
  },
});

// --- 主要组件 ---
function LLMSetting() {
  const styles = useStyles();
  const {
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
  } = useManagement();

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <EditForm onSubmit={handleCreate} triggerBtnText="添加新配置" />
        <Divider />
        {loading ? (
          <div className={styles.spinnerContainer}>
            <Spinner label="正在加载配置..." />
          </div>
        ) : error ? (
          <MessageBar intent="error">{error}</MessageBar>
        ) : configs.length === 0 ? (
          <MessageBar intent="info">
            暂无模型配置。点击“添加新配置”按钮开始创建。
          </MessageBar>
        ) : (
          <Table aria-label="模型配置表">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>模型名称</TableHeaderCell>
                <TableHeaderCell>Base URL</TableHeaderCell>
                <TableHeaderCell>API Key</TableHeaderCell>
                <TableHeaderCell>操作</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((cfg) => (
                <TableRow key={cfg.id}>
                  <TableCell>{cfg.model}</TableCell>
                  <TableCell>{cfg.base_url}</TableCell>
                  <TableCell>
                    {cfg.api_key ? '********' : '未设置'}
                  </TableCell>
                  <TableCell>
                    <div className={styles.tableActions}>
                      <EditForm
                        triggerBtnText="编辑"
                        initialData={cfg}
                        onSubmit={(data) => handleUpdate(cfg.id, data)}
                      />
                      <Button
                        appearance="secondary"
                        onClick={() => confirmDelete(cfg.id)}
                      >
                        删除
                      </Button>
                      <Button
                        appearance={currentConfigId === cfg.id.toString() ? "outline" : "primary"}
                        onClick={() => currentConfigId !== cfg.id.toString() && setLLMConfigId(cfg.id.toString())}
                        disabled={currentConfigId === cfg.id.toString()}
                      >
                        {currentConfigId === cfg.id.toString() ? "当前配置" : "设置为当前配置"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Dialog open={showDeleteConfirm}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>确认删除</DialogTitle>
              <p>您确定要删除此配置吗？此操作不可撤销。</p>
              <DialogActions>
                <Button appearance="secondary" onClick={cancelDelete}>
                  取消
                </Button>
                <Button appearance="primary" onClick={handleDelete}>
                  确认删除
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </Card>
    </div>
  );
}

export default LLMSetting;