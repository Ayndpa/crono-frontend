import React, { useState } from 'react';
import { StatsGrid } from './components/StatsGrid';
import FeedsSetting from './components/MainContent/RssFeed/FeedSetting';
import LLMSetting from './components/MainContent/LLM/LLMSetting';
import {
  Button,
  Dialog,
  DialogBody,
  DialogSurface,
  DialogTrigger,
  makeStyles,
  tokens,
  ToolbarButton,
  Tooltip,
  TabList,
  Tab,
} from '@fluentui/react-components';
import {
  Settings24Regular,
  Board24Regular,
  FeedRegular,
  Bot24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';

// 定义样式
const useStyles = makeStyles({
  dialogSurface: {
    height: '85vh',
    width: '90vw',
    maxWidth: '1200px',
    maxHeight: '800px',
    display: 'flex',
    flexDirection: 'column',
    padding: '0px !important', // 覆盖默认内边距以实现侧边栏贴边
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  dialogBody: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    overflow: 'hidden',
    padding: '0px !important',
  },
  sidebar: {
    width: '220px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '24px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0,
  },
  tabList: {
    alignItems: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tab: {
    justifyContent: 'flex-start',
    padding: '10px 14px',
    fontSize: tokens.fontSizeBase300,
    borderRadius: tokens.borderRadiusMedium,
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  mainContent: {
    flexGrow: 1,
    padding: '32px 40px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tabHeader: {
    marginBottom: '24px',
  },
  tabContentTitle: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '6px',
    color: tokens.colorNeutralForeground1,
  },
  tabContentDesc: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
});

interface ManagementDialogProps {
  /** 受控模式：外部控制打开状态 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ManagementDialog: React.FC<ManagementDialogProps> = ({ open, onOpenChange }) => {
  const styles = useStyles();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'feeds' | 'llm'>('overview');

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
          <Tooltip content="设置" relationship="label">
            <ToolbarButton
              aria-label="设置"
              icon={<Settings24Regular />}
            />
          </Tooltip>
        </DialogTrigger>
      )}
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody className={styles.dialogBody}>
          {/* 顶栏 */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Settings24Regular />
              <span>设置</span>
            </div>
            <DialogTrigger>
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                aria-label="关闭设置"
              />
            </DialogTrigger>
          </div>

          {/* 内容区 */}
          <div className={styles.dialogContent}>
            {/* 左侧边栏 */}
            <div className={styles.sidebar}>
              <TabList
                selectedValue={activeTab}
                onTabSelect={(_, data) => setActiveTab(data.value as any)}
                vertical
                className={styles.tabList}
              >
                <Tab className={styles.tab} icon={<Board24Regular />} value="overview">
                  数据概览
                </Tab>
                <Tab className={styles.tab} icon={<FeedRegular />} value="feeds">
                  订阅源管理
                </Tab>
                <Tab className={styles.tab} icon={<Bot24Regular />} value="llm">
                  AI 智能设置
                </Tab>
              </TabList>
            </div>

            {/* 右侧主面板 */}
            <div className={styles.mainContent}>
              {activeTab === 'overview' && (
                <>
                  <div className={styles.tabHeader}>
                    <h2 className={styles.tabContentTitle}>数据概览</h2>
                    <p className={styles.tabContentDesc}>
                      查看当前阅读器的整体运行状态，包括订阅源统计和今日更新文章。
                    </p>
                  </div>
                  <StatsGrid />
                </>
              )}

              {activeTab === 'feeds' && (
                <>
                  <div className={styles.tabHeader}>
                    <h2 className={styles.tabContentTitle}>订阅源管理</h2>
                    <p className={styles.tabContentDesc}>
                      添加、修改或删除您的 RSS 订阅源，并可手动触发单个或全部订阅源刷新。
                    </p>
                  </div>
                  <FeedsSetting />
                </>
              )}


              {activeTab === 'llm' && (
                <>
                  <div className={styles.tabHeader}>
                    <h2 className={styles.tabContentTitle}>AI 智能设置</h2>
                    <p className={styles.tabContentDesc}>
                      配置 AI 语言模型，用于文章自动分类、摘要提炼以及智能问答等服务。
                    </p>
                  </div>
                  <LLMSetting />
                </>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ManagementDialog;
