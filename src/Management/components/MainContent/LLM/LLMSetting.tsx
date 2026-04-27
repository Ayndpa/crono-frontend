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
  Tooltip,
  tokens,
} from '@fluentui/react-components';
import { EditRegular, DeleteRegular, CheckmarkCircleRegular, CheckmarkCircleFilled } from '@fluentui/react-icons';
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
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  iconBtn: {
    minWidth: 'unset',
  },
  defaultBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
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
        <EditForm onSubmit={handleCreate} triggerBtnText="添加新配置" triggerBtnAppearance="primary" />
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
                <TableHeaderCell style={{ minWidth: '160px' }}>操作</TableHeaderCell>
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
                  <TableCell style={{ minWidth: '160px' }}>
                    <div className={styles.tableActions}>
                      <Tooltip content="编辑" relationship="label">
                        <EditForm
                          triggerBtnText={<EditRegular />}
                          initialData={cfg}
                          onSubmit={(data) => handleUpdate(cfg.id, data)}
                        />
                      </Tooltip>
                      <Tooltip content="删除" relationship="label">
                        <Button
                          className={styles.iconBtn}
                          appearance="subtle"
                          icon={<DeleteRegular />}
                          onClick={() => confirmDelete(cfg.id)}
                        />
                      </Tooltip>
                      {currentConfigId === cfg.id.toString() ? (
                        <span className={styles.defaultBadge}>
                          <CheckmarkCircleFilled style={{ color: tokens.colorBrandForeground1 }} />
                          当前配置
                        </span>
                      ) : (
                        <Tooltip content="设置为当前配置" relationship="label">
                          <Button
                            className={styles.iconBtn}
                            appearance="subtle"
                            icon={<CheckmarkCircleRegular />}
                            onClick={() => setLLMConfigId(cfg.id.toString())}
                          />
                        </Tooltip>
                      )}
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