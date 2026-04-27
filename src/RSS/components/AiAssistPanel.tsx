import React, { useState, useRef } from 'react';
import {
  Button,
  Text,
  makeStyles,
  shorthands,
  Spinner,
  Tab,
  TabList,
} from '@fluentui/react-components';
import { ArrowMinimize24Regular, BotSparkle24Regular } from '@fluentui/react-icons';
import { ArticleSummary } from './ArticleSummary';
import { ArticleTranslation } from './ArticleTranslation';
import { ArticleTTS } from './ArticleTTS';
import { ArticleQA } from './ArticleQA';
import { useLLMConfigured } from './useLLMConfigured';
import { EditForm } from '../../Management/components/MainContent/LLM/components/EditForm/EditForm';
import { createConfig } from '../../Management/components/MainContent/LLM/api/llmConfig';
import type { ArticleResponse } from '../model/article';

interface AiAssistPanelProps {
  article: ArticleResponse | null;  // RSS 模式：传完整 article
  url?: string;                      // 浏览器模式：只传 url
  onClose: () => void;
}

const useStyles = makeStyles({
  panel: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    backgroundColor: 'var(--colorNeutralBackground1)',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid var(--colorNeutralStroke1)',
    overflow: 'hidden',
  },
  header: {
    ...shorthands.padding('16px'),
    borderBottom: '1px solid var(--colorNeutralStroke2)',
    cursor: 'move',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: {
    ...shorthands.padding('16px'),
    flexGrow: 1,
    overflowY: 'auto',
  },
  notConfigured: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '32px',
    paddingBottom: '32px',
    paddingLeft: '16px',
    paddingRight: '16px',
    textAlign: 'center',
  },
  notConfiguredIcon: {
    fontSize: '36px',
  },
  notConfiguredText: {
    color: 'var(--colorNeutralForeground2)',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '15px',
    height: '15px',
    cursor: 'nwse-resize',
    background: 'linear-gradient(135deg, transparent 50%, var(--colorNeutralStroke1) 50%)',
    borderBottomRightRadius: '12px',
  },
});

export const AiAssistPanel: React.FC<AiAssistPanelProps> = ({ article, url, onClose }) => {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<'summary' | 'translation' | 'tts' | 'qa'>('summary');
  const [position, setPosition] = useState({ top: 60, left: 20 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const dragRef = useRef<HTMLDivElement | null>(null);
  const { configured, loading: configLoading, recheck } = useLLMConfigured();

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = position.top;
    const startLeft = position.left;

    const handleMove = (moveEvent: MouseEvent) => {
      setPosition({
        top: startTop + (moveEvent.clientY - startY),
        left: startLeft + (moveEvent.clientX - startX),
      });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMove = (moveEvent: MouseEvent) => {
      setSize({
        width: Math.max(300, startWidth + (moveEvent.clientX - startX)),
        height: Math.max(200, startHeight + (moveEvent.clientY - startY)),
      });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // 构造统一的 props：RSS 模式传 article，浏览器模式传 url
  const summaryProps = article
    ? { article }
    : { article: null, url: url || '' };

  const translationProps = article
    ? { article }
    : { article: null, url: url || '' };

  return (
    <div
      className={styles.panel}
      style={{
        top: position.top,
        left: position.left,
        width: size.width,
        height: size.height,
        maxHeight: '80vh',
      }}
      ref={dragRef}
    >
      <div className={styles.header} onMouseDown={handleDragStart}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, data) => setActiveTab(data.value as 'summary' | 'translation' | 'tts' | 'qa')}
        >
          <Tab value="summary">AI 摘要</Tab>
          <Tab value="translation">全文翻译</Tab>
          <Tab value="tts">朗读</Tab>
          <Tab value="qa">文章问答</Tab>
        </TabList>
        <Button appearance="subtle" onClick={onClose} icon={<ArrowMinimize24Regular />} />
      </div>

      <div className={styles.content}>
        {configLoading ? (
          <Spinner size="tiny" label="检查 AI 配置..." />
        ) : configured === false ? (
          <div className={styles.notConfigured}>
            <BotSparkle24Regular className={styles.notConfiguredIcon} />
            <Text className={styles.notConfiguredText}>
              尚未配置 AI 模型，请先添加一个模型配置后即可使用摘要、翻译和朗读功能。
            </Text>
            <EditForm
              triggerBtnText="立即配置"
              onSubmit={async (data) => {
                await createConfig(data);
                recheck();
              }}
            />
          </div>
        ) : activeTab === 'summary' ? (
          <ArticleSummary {...summaryProps} />
        ) : activeTab === 'translation' ? (
          <ArticleTranslation {...translationProps} />
        ) : activeTab === 'qa' ? (
          <ArticleQA article={article ?? null} url={url} />
        ) : (
          <ArticleTTS article={article ?? null} url={url} />
        )}
      </div>

      <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />
    </div>
  );
};
