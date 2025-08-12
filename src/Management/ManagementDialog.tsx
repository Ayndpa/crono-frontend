import React, { useState } from 'react';
import { MainContent } from './components/MainContent/MainContent';
import { StatsGrid } from './components/StatsGrid';
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, makeStyles, tokens, ToolbarButton, Tooltip } from '@fluentui/react-components';
import { ContentSettings24Regular } from '@fluentui/react-icons';

// 定义样式
const useStyles = makeStyles({
  // 根样式，应用于 Toolbar
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
    maxWidth: 'none', // 确保对话框宽度不受限制
  }
});

const ManagementDialog: React.FC = () => {
  const styles = useStyles();
  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip content="管理订阅源" relationship="label">
          <ToolbarButton
            aria-label="管理订阅源"
            icon={<ContentSettings24Regular />}
          />
        </Tooltip>
      </DialogTrigger>
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
          <DialogActions>

          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ManagementDialog;