import React, { useState } from 'react';
import { MainContent } from './components/MainContent/MainContent';
import { StatsGrid } from './components/StatsGrid';
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, makeStyles, tokens, ToolbarButton, Tooltip } from '@fluentui/react-components';
import { ContentSettings24Regular } from '@fluentui/react-icons';

// 定义样式
const useStyles = makeStyles({
  root: {
    height: '100%',
  },
  container: {
    margin: '0 auto',
    padding: tokens.spacingVerticalXXL,
  },
  dialogSurface: {
    height: '88vh',
    width: '92vw',
    maxWidth: 'none',
  }
});

interface ManagementDialogProps {
  /** 受控模式：外部控制打开状态 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ManagementDialog: React.FC<ManagementDialogProps> = ({ open, onOpenChange }) => {
  const styles = useStyles();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const handleOpenChange = (_: unknown, data: { open: boolean }) => {
    if (isControlled) onOpenChange?.(data.open);
    else setInternalOpen(data.open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {isControlled ? <></> : (
        <DialogTrigger>
          <Tooltip content="管理订阅源" relationship="label">
            <ToolbarButton
              aria-label="管理订阅源"
              icon={<ContentSettings24Regular />}
            />
          </Tooltip>
        </DialogTrigger>
      )}
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <DialogTitle>
            管理订阅源
            <DialogTrigger>
              <Button appearance="primary" style={{ float: 'right' }}>
                关闭
              </Button>
            </DialogTrigger>
          </DialogTitle>
          <DialogContent>
            <div className={styles.root}>
              <div className={styles.container}>
                <StatsGrid />
                <MainContent />
              </div>
            </div>
          </DialogContent>
          <DialogActions />
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ManagementDialog;
