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
    gap: '16px',
  },
  card: {
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '12px',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '150px',
  },
  tableHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tableHeaderCell: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    padding: '12px 8px',
  },
  tableRow: {
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableCell: {
    padding: '12px 8px',
  },
  tableActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    minWidth: 'unset',
  },
  defaultBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: tokens.colorBrandBackground2,
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
        <div className={styles.actionBar}>
          <EditForm onSubmit={handleCreate} triggerBtnText="添加新配置" triggerBtnAppearance="primary" />
        </div>
        
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
            <TableHeader className={styles.tableHeader}>
              <TableRow>
                <TableHeaderCell className={styles.tableHeaderCell}>模型名称</TableHeaderCell>
                <TableHeaderCell className={styles.tableHeaderCell}>Base URL</TableHeaderCell>
                <TableHeaderCell className={styles.tableHeaderCell}>API Key</TableHeaderCell>
                <TableHeaderCell className={styles.tableHeaderCell} style={{ minWidth: '180px' }}>操作</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((cfg) => (
                <TableRow key={cfg.id} className={styles.tableRow}>
                  <TableCell className={styles.tableCell}>{cfg.model}</TableCell>
                  <TableCell className={styles.tableCell}>{cfg.base_url}</TableCell>
                  <TableCell className={styles.tableCell}>
                    {cfg.api_key ? '********' : '未设置'}
                  </TableCell>
                  <TableCell className={styles.tableCell} style={{ minWidth: '180px' }}>
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
                          <CheckmarkCircleFilled style={{ color: tokens.colorBrandForeground1, fontSize: '14px' }} />
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