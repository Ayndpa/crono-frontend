  import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  Persona,
  shorthands,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { AiAssistPanel } from './AiAssistPanel';
import { SelectionAssistPopover } from './SelectionAssistPopover';
import type { ArticleResponse } from '../model/article';
import { apiFetch } from '../../api/client';
import DOMPurify from 'dompurify';

interface ArticleReaderProps {
  selectedArticle: ArticleResponse | null;
  onToggleStar: (id: number) => void;
  showAiPanel: boolean;
  setShowAiPanel: (show: boolean) => void;
}

const useStyles = makeStyles({
  root: {
    height: '100%',
    position: 'relative', // 添加相对定位作为悬浮窗容器
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
    overflowY: 'auto',
  },
  persona: {
    ...shorthands.margin('0', '0', '12px', '0'),
  },
  separator: {
    flexShrink: 0,
    width: '100%',
    height: '1px',
    minHeight: '1px',
    maxHeight: '1px',
    backgroundColor: 'var(--colorNeutralStroke2)',
  },
  image: {
    maxWidth: '100%',
    ...shorthands.margin('0', '0', '12px', '0'),
  },
  content: {
    whiteSpace: 'pre-wrap',
  },
  tagContainer: {
    ...shorthands.margin('12px', '0'),
  },
  tag: {
    ...shorthands.margin('0', '8px', '0', '0'),
  },
  placeholderContainer: {
    textAlign: 'center',
    ...shorthands.margin('100px', '0', '0', '0'),
  },
  placeholderIcon: {
    fontSize: '48px',
    color: 'var(--color-neutral-foreground-disabled)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  articleHtml: {
    padding: '0 4px',
    lineHeight: '1.8',
    fontSize: '16px',
    overflowWrap: 'break-word',
    '& img': { maxWidth: '100%', height: 'auto', borderRadius: '4px' },
    '& a': { color: 'var(--colorBrandForeground1)' },
    '& h1, & h2, & h3, & h4': { lineHeight: '1.4', marginTop: '1.5em' },
    '& p': { marginBottom: '1em' },
    '& pre': { overflowX: 'auto', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--colorNeutralBackground2)' },
    '& blockquote': { borderLeft: '3px solid var(--colorNeutralStroke1)', margin: '0', paddingLeft: '16px', color: 'var(--colorNeutralForeground2)' },
  },
  // 悬浮窗样式已移至 AiAssistPanel
});

const ArticleContent = React.memo(({ 
  html, 
  className, 
  onMouseUp 
}: { 
  html: string; 
  className: string; 
  onMouseUp: () => void 
}) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      onMouseUp={onMouseUp}
    />
  );
});

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  selectedArticle,
  showAiPanel,
  setShowAiPanel,
}) => {
  const styles = useStyles();

  // 文章内容抓取状态
  const [articleHtml, setArticleHtml] = useState<string | null>(null);
  const [useFallbackIframe, setUseFallbackIframe] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const [selectionState, setSelectionState] = useState<{
    text: string;
    context: string;
    rect: { top: number; left: number; width: number; height: number; bottom: number };
  } | null>(null);

  const handleSelection = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionState(null);
        return;
      }
      
      const text = selection.toString().trim();
      if (!text) {
        setSelectionState(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const contextElement = range.commonAncestorContainer.parentElement;
      const context = contextElement ? contextElement.textContent || text : text;

      setSelectionState({
        text,
        context: context.substring(0, 1000),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
        }
      });
    }, 10);
  }, []);

  // 切换文章时重置并重新抓取
  useEffect(() => {
    setShowAiPanel(false);
    setArticleHtml(null);
    setUseFallbackIframe(false);

    if (!selectedArticle?.link) return;

    setLoadingContent(true);
    apiFetch('/rss/article/content', {
      method: 'POST',
      body: JSON.stringify({ url: String(selectedArticle.link) }),
    })
      .then(res => res.json())
      .then((data: { html: string; title: string; captcha: boolean; from_cache: boolean }) => {
        if (data.captcha || !data.html) {
          setUseFallbackIframe(true);
        } else {
          setArticleHtml(DOMPurify.sanitize(data.html));
        }
      })
      .catch(() => setUseFallbackIframe(true))
      .finally(() => setLoadingContent(false));
  }, [selectedArticle?.id]);



  return (
    <div className={styles.root}>
      {selectedArticle ? (
        <>
          <div className={styles.scrollContainer}>
            <Persona
              className={styles.persona}
              name={selectedArticle.author || '未知作者'}
              size="medium"
              secondaryText={new Date(selectedArticle.pub_date).toLocaleDateString()}
              avatar={{ color: 'colorful' }}
            />
            <div className={styles.separator} style={{ marginBottom: '12px' }} />

            {/* 文章内容区域：加载中 / 渲染 HTML / 降级 iframe */}
            {loadingContent ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Spinner label="正在加载文章内容..." />
              </div>
            ) : useFallbackIframe ? (
              <iframe
                src={String(selectedArticle.link)}
                title={selectedArticle.title}
                className={styles.iframe}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <ArticleContent
                className={styles.articleHtml}
                html={articleHtml ?? ''}
                onMouseUp={handleSelection}
              />
            )}
          </div>

          {showAiPanel && (
            <AiAssistPanel
              article={selectedArticle}
              onClose={() => setShowAiPanel(false)}
            />
          )}

          {selectionState && selectedArticle && (
            <SelectionAssistPopover
              text={selectionState.text}
              context={selectionState.context}
              articleTitle={selectedArticle.title}
              anchorRect={selectionState.rect}
              onLocate={() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const element = range.startContainer.parentElement;
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              onClose={() => setSelectionState(null)}
            />
          )}
        </>
      ) : (
        <div className={styles.placeholderContainer}>
          <i className={`fas fa-file-alt ${styles.placeholderIcon}`} />
          <Text size={500} block>
            选择一篇文章阅读
          </Text>
          <Text>从左侧列表中选择一篇文章开始阅读。</Text>
        </div>
      )}
    </div>
  );
};