import React, { useCallback, useEffect, useState, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Button,
  FluentProvider,
  Text,
  makeStyles,
  shorthands,
  Spinner,
  Tab,
  TabList,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components';
import { ArrowMinimize24Regular, BotSparkle24Regular } from '@fluentui/react-icons';
import { ArticleSummary } from './ArticleSummary';
import { ArticleTranslation } from './ArticleTranslation';
import { ArticleTTS } from './ArticleTTS';
import { ArticleQA } from './ArticleQA';
import { useLLMConfigured } from './useLLMConfigured';
import { EditForm } from '../../Management/components/MainContent/LLM/components/EditForm/EditForm';
import { createConfig } from '../../Management/components/MainContent/LLM/api/llmConfig';
import { SelectionAssistPopover } from './SelectionAssistPopover';
import type { ArticleResponse } from '../model/article';

interface AiAssistPanelProps {
  article: ArticleResponse | null;  // RSS 模式：传完整 article
  url?: string;                      // 浏览器模式：只传 url
  isDark?: boolean;
  onClose: () => void;
  onSummaryGenerated?: () => void;
  onSelectionChange?: (selection: {
    text: string;
    context: string;
    rect: { top: number; left: number; width: number; height: number; bottom: number };
    pointer: { x: number; y: number };
  } | null) => void;
}

const PANEL_MARGIN = 16;
const PANEL_MIN_WIDTH = 300;
const PANEL_MIN_HEIGHT = 200;

const useStyles = makeStyles({
  panel: {
    position: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1006,
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

const AiAssistPanelComponent: React.FC<AiAssistPanelProps> = ({ article, url, isDark = false, onClose, onSummaryGenerated, onSelectionChange }) => {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<'summary' | 'translation' | 'tts' | 'qa'>('summary');
  const [position, setPosition] = useState({ top: 60, left: 20 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const dragRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const selectionPendingRef = useRef(false);
  const selectionPopoverRootRef = useRef<Root | null>(null);
  const selectionPopoverContainerRef = useRef<HTMLDivElement | null>(null);
  const { configured, loading: configLoading, recheck } = useLLMConfigured();

  const closeSelectionPopover = useCallback(() => {
    selectionPopoverRootRef.current?.unmount();
    selectionPopoverRootRef.current = null;
    selectionPopoverContainerRef.current?.remove();
    selectionPopoverContainerRef.current = null;
  }, []);

  useEffect(() => closeSelectionPopover, [closeSelectionPopover]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="tab"]')) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = position.top;
    const startLeft = position.left;
    let nextTop = startTop;
    let nextLeft = startLeft;
    let frame: number | null = null;

    if (dragRef.current) {
      dragRef.current.style.willChange = 'top, left';
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - PANEL_MARGIN - size.height);
      const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - PANEL_MARGIN - size.width);
      nextTop = Math.min(Math.max(startTop + (moveEvent.clientY - startY), PANEL_MARGIN), maxTop);
      nextLeft = Math.min(Math.max(startLeft + (moveEvent.clientX - startX), PANEL_MARGIN), maxLeft);

      if (!dragRef.current || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        if (dragRef.current) {
          dragRef.current.style.top = `${nextTop}px`;
          dragRef.current.style.left = `${nextLeft}px`;
        }
        frame = null;
      });
    };

    const handleUp = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (dragRef.current) {
        dragRef.current.style.top = `${nextTop}px`;
        dragRef.current.style.left = `${nextLeft}px`;
        dragRef.current.style.willChange = '';
      }
      setPosition({ top: nextTop, left: nextLeft });
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
    let nextWidth = startWidth;
    let nextHeight = startHeight;
    let frame: number | null = null;

    if (dragRef.current) {
      dragRef.current.style.willChange = 'width, height';
    }

    const handleMove = (moveEvent: MouseEvent) => {
      const maxWidth = Math.max(0, window.innerWidth - PANEL_MARGIN - position.left);
      const maxHeight = Math.max(0, window.innerHeight - PANEL_MARGIN - position.top);
      nextWidth = Math.min(Math.max(PANEL_MIN_WIDTH, startWidth + (moveEvent.clientX - startX)), maxWidth);
      nextHeight = Math.min(Math.max(PANEL_MIN_HEIGHT, startHeight + (moveEvent.clientY - startY)), maxHeight);

      if (!dragRef.current || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        if (dragRef.current) {
          dragRef.current.style.width = `${nextWidth}px`;
          dragRef.current.style.height = `${nextHeight}px`;
        }
        frame = null;
      });
    };

    const handleUp = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (dragRef.current) {
        dragRef.current.style.width = `${nextWidth}px`;
        dragRef.current.style.height = `${nextHeight}px`;
        dragRef.current.style.willChange = '';
      }
      setSize({ width: nextWidth, height: nextHeight });
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleSelection = useCallback((pointer: { x: number; y: number }) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          onSelectionChange?.(null);
          return;
        }

        const text = selection.toString().trim();
        if (!text) {
          onSelectionChange?.(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const content = contentRef.current;
        if (!content || !range.intersectsNode(content)) {
          onSelectionChange?.(null);
          return;
        }

        const rects = Array.from(range.getClientRects())
          .filter(rect => rect.width > 0 && rect.height > 0);
        const boundingRect = range.getBoundingClientRect();
        const rect = boundingRect.width > 0 && boundingRect.height > 0
          ? boundingRect
          : rects[rects.length - 1];

        if (!rect) {
          onSelectionChange?.(null);
          return;
        }

        const contextElement = range.commonAncestorContainer.parentElement;
        const context = contextElement ? contextElement.textContent || text : text;

        const selectionPayload = {
          text,
          context: context.substring(0, 1000),
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
          },
          pointer,
        };

        if (onSelectionChange) {
          onSelectionChange(selectionPayload);
          return;
        }

        closeSelectionPopover();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        selectionPopoverContainerRef.current = container;
        selectionPopoverRootRef.current = root;
        root.render(
          <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
            <SelectionAssistPopover
              text={selectionPayload.text}
              context={selectionPayload.context}
              articleTitle={article?.title || url || 'AI 助手'}
              anchorPoint={selectionPayload.pointer}
              onLocate={() => {
                const selectedElement = range.startContainer.parentElement;
                selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              onClose={closeSelectionPopover}
            />
          </FluentProvider>
        );
      }, 0);
    });
  }, [article?.title, closeSelectionPopover, isDark, onSelectionChange, url]);

  const handleSelectionStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button,input,textarea,select,[contenteditable="true"],[role="tab"]')) {
      return;
    }

    selectionPendingRef.current = true;
  }, []);

  useEffect(() => {
    const handleDocumentMouseUp = (event: MouseEvent) => {
      if (!selectionPendingRef.current) {
        return;
      }

      selectionPendingRef.current = false;
      handleSelection({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => document.removeEventListener('mouseup', handleDocumentMouseUp);
  }, [handleSelection]);

  // 构造统一的 props：RSS 模式传 article，浏览器模式传 url
  const summaryProps = article
    ? { article, onSummaryGenerated }
    : { article: null, url: url || '', onSummaryGenerated };

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

      <div
        ref={contentRef}
        className={styles.content}
        onMouseDown={handleSelectionStart}
      >
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

export const AiAssistPanel = React.memo(AiAssistPanelComponent);
