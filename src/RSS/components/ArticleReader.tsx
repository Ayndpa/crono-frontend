import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  makeStyles,
  shorthands,
  Spinner,
  Text,
  Button,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Tooltip,
} from '@fluentui/react-components';
import {
  Sparkle24Regular,
  Settings24Regular,
  Open24Regular,
  ArrowUp24Regular,
  Dismiss24Regular,
  Maximize24Regular,
  ArrowMinimize24Regular,
  ArrowClockwise24Regular,
} from '@fluentui/react-icons';
import type { ArticleResponse } from '../model/article';
import { apiFetch } from '../../api/client';
import DOMPurify from 'dompurify';

interface ArticleReaderProps {
  isDark: boolean;
  selectedArticle: ArticleResponse | null;
  onToggleStar: (id: number) => void;
  showAiPanel: boolean;
  setShowAiPanel: (show: boolean) => void;
  onSelectionChange: (selection: {
    text: string;
    context: string;
    rect: { top: number; left: number; width: number; height: number; bottom: number };
    pointer: { x: number; y: number };
  } | null) => void;
  onClose: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
  modalPosition: { top: number; left: number };
  setModalPosition: (pos: { top: number; left: number }) => void;
  modalSize: { width: number; height: number };
  setModalSize: (size: { width: number; height: number }) => void;
}

interface ReaderSettings {
  theme: 'light' | 'sepia' | 'gray' | 'dark';
  fontFamily: 'sans' | 'serif';
  fontSize: number;
  lineHeight: 'compact' | 'normal' | 'loose';
  width: 'narrow' | 'medium' | 'wide';
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontFamily: 'sans',
  fontSize: 18,
  lineHeight: 'normal',
  width: 'medium',
};

const MODAL_MARGIN = 16;
const MODAL_MIN_WIDTH = 600;
const MODAL_MIN_HEIGHT = 400;

const getThemeVariables = (theme: 'light' | 'sepia' | 'gray' | 'dark') => {
  switch (theme) {
    case 'sepia':
      return {
        '--reader-bg': '#f8f1e5',
        '--reader-text': '#433422',
        '--reader-meta': '#7e6e5d',
        '--reader-border': '#e6dcc5',
        '--reader-blockquote-bg': '#f0e8d9',
        '--reader-blockquote-border': '#dcd0b9',
        '--reader-code-bg': '#eedebc',
        '--reader-code-text': '#5a4933',
        '--reader-scroll-thumb': '#e0d5c1',
        '--reader-scroll-thumb-hover': '#cfc2a9',
      };
    case 'gray':
      return {
        '--reader-bg': '#f5f6f8',
        '--reader-text': '#2c3e50',
        '--reader-meta': '#7f8c8d',
        '--reader-border': '#dcdde1',
        '--reader-blockquote-bg': '#eaecf0',
        '--reader-blockquote-border': '#bdc3c7',
        '--reader-code-bg': '#e2e5e9',
        '--reader-code-text': '#1b2631',
        '--reader-scroll-thumb': '#cbd1d6',
        '--reader-scroll-thumb-hover': '#b2bac0',
      };
    case 'dark':
      return {
        '--reader-bg': '#181818',
        '--reader-text': '#e0e0e0',
        '--reader-meta': '#8a8a8a',
        '--reader-border': '#2d2d2d',
        '--reader-blockquote-bg': '#242424',
        '--reader-blockquote-border': '#444444',
        '--reader-code-bg': '#282828',
        '--reader-code-text': '#f0f0f0',
        '--reader-scroll-thumb': '#444444',
        '--reader-scroll-thumb-hover': '#555555',
      };
    case 'light':
    default:
      return {
        '--reader-bg': '#ffffff',
        '--reader-text': '#1a1a1a',
        '--reader-meta': '#595959',
        '--reader-border': '#e0e0e0',
        '--reader-blockquote-bg': '#f5f5f5',
        '--reader-blockquote-border': '#cccccc',
        '--reader-code-bg': '#f6f8fa',
        '--reader-code-text': '#24292e',
        '--reader-scroll-thumb': '#cccccc',
        '--reader-scroll-thumb-hover': '#b3b3b3',
      };
  }
};

const estimateReadingStats = (html: string | null) => {
  if (!html) return { wordCount: 0, readingTime: 0 };
  const cleanText = html.replace(/<[^>]*>/g, ' ');
  const cnChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const enWords = (cleanText.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length;
  const wordCount = cnChars + enWords;
  const time = Math.max(1, Math.ceil(cnChars / 350 + enWords / 200));
  return { wordCount, readingTime: time };
};

const useStyles = makeStyles({
  root: {
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--reader-bg, #ffffff)',
    color: 'var(--reader-text, #1a1a1a)',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--reader-bg, #ffffff)',
    borderBottom: '1px solid var(--reader-border, #e0e0e0)',
    position: 'relative',
    zIndex: 10,
    flexShrink: 0,
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    ...shorthands.padding('12px', '24px'),
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    ...shorthands.gap('2px'),
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    ...shorthands.gap('8px'),
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: '-1px',
    left: 0,
    width: '100%',
    height: '3px',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--colorBrandForeground1)',
    transition: 'width',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease',
  },
  scrollContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    position: 'relative',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--reader-scroll-thumb, #ccc) transparent',
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'var(--reader-scroll-thumb, #ccc)',
      ...shorthands.borderRadius('4px'),
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: 'var(--reader-scroll-thumb-hover, #b3b3b3)',
    },
  },
  articleContainer: {
    maxWidth: 'var(--reader-max-width, 800px)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.margin('0', 'auto'),
    ...shorthands.padding('40px', '24px', '80px', '24px'),
  },
  articleHeader: {
    ...shorthands.margin('0', '0', '24px', '0'),
  },
  articleTitle: {
    fontSize: '2.2em',
    fontWeight: '700',
    lineHeight: '1.3',
    color: 'var(--reader-text)',
    fontFamily: 'var(--reader-font-family)',
    ...shorthands.margin('0', '0', '16px', '0'),
  },
  metaContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    color: 'var(--reader-meta, #595959)',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...shorthands.gap('16px'),
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
  },
  metaDivider: {
    width: '1px',
    height: '12px',
    backgroundColor: 'var(--reader-border, #e0e0e0)',
  },
  originalLink: {
    color: 'var(--colorBrandForeground1)',
    textDecorationLine: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: '500',
    ...shorthands.gap('4px'),
    '&:hover': {
      textDecorationLine: 'underline',
    },
  },
  separator: {
    flexShrink: 0,
    width: '100%',
    height: '1px',
    backgroundColor: 'var(--reader-border, #e0e0e0)',
    transition: 'background-color 0.3s ease',
    ...shorthands.margin('0', '0', '24px', '0'),
  },
  articleHtml: {
    lineHeight: 'var(--reader-line-height, 1.8)',
    fontSize: 'var(--reader-font-size, 18px)',
    fontFamily: 'var(--reader-font-family, sans-serif)',
    overflowWrap: 'break-word',
    transition: 'font-size 0.2s ease, font-family 0.2s ease, line-height 0.2s ease',
    '& img': { 
      maxWidth: '100%', 
      height: 'auto', 
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      display: 'block',
      margin: '24px auto',
    },
    '& a': { 
      color: 'var(--colorBrandForeground1)',
      textDecorationLine: 'underline',
      textUnderlineOffset: '4px',
      '&:hover': {
        color: 'var(--colorBrandForegroundLinkHover)',
      }
    },
    '& h1, & h2, & h3, & h4': { 
      color: 'var(--reader-text)',
      lineHeight: '1.4', 
      marginTop: '1.8em',
      marginBottom: '0.8em',
      fontWeight: '600',
    },
    '& h1': { fontSize: '1.6em' },
    '& h2': { fontSize: '1.4em', borderBottom: '1px solid var(--reader-border)', paddingBottom: '0.3em' },
    '& h3': { fontSize: '1.2em' },
    '& p': { 
      marginBottom: '1.2em',
      textAlign: 'justify',
    },
    '& pre': { 
      overflowX: 'auto', 
      padding: '16px', 
      borderRadius: '8px', 
      backgroundColor: 'var(--reader-code-bg)',
      color: 'var(--reader-code-text)',
      border: '1px solid var(--reader-border)',
      fontFamily: 'SFMono-Regular, Consolas, Courier, monospace',
      fontSize: '0.9em',
      lineHeight: '1.5',
      margin: '20px 0',
    },
    '& code': {
      fontFamily: 'SFMono-Regular, Consolas, Courier, monospace',
      backgroundColor: 'var(--reader-code-bg)',
      color: 'var(--reader-code-text)',
      padding: '3px 6px',
      borderRadius: '4px',
      fontSize: '0.9em',
    },
    '& pre code': {
      backgroundColor: 'transparent',
      padding: 0,
      borderRadius: 0,
      fontSize: 'inherit',
      color: 'inherit',
    },
    '& blockquote': { 
      borderLeft: '4px solid var(--reader-blockquote-border)', 
      margin: '24px 0', 
      padding: '12px 20px', 
      backgroundColor: 'var(--reader-blockquote-bg)',
      color: 'var(--reader-text)',
      fontStyle: 'italic',
      borderRadius: '0 8px 8px 0',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      margin: '24px 0',
      fontSize: '0.95em',
      lineHeight: '1.5',
    },
    '& th, & td': {
      border: '1px solid var(--reader-border)',
      padding: '10px 14px',
      textAlign: 'left',
    },
    '& th': {
      backgroundColor: 'var(--reader-code-bg)',
      fontWeight: '600',
    },
    '& tr:nth-child(even)': {
      backgroundColor: 'var(--reader-blockquote-bg)',
    },
    '& ul, & ol': {
      paddingLeft: '24px',
      marginBottom: '1.2em',
    },
    '& li': {
      marginBottom: '0.6em',
    }
  },
  iframe: {
    width: '100%',
    height: '100%',
    minHeight: '100%',
    display: 'block',
    border: 'none',
    backgroundColor: '#ffffff',
  },
  placeholderContainer: {
    textAlign: 'center',
    padding: '100px 0',
    color: 'var(--colorNeutralForeground4)',
  },
  placeholderIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: 'var(--colorNeutralForegroundDisabled)',
  },
  settingsPanel: {
    display: 'flex',
    flexDirection: 'column',
    width: '280px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
    backgroundColor: 'var(--colorNeutralBackground1)',
    color: 'var(--colorNeutralForeground1)',
    ...shorthands.gap('16px'),
    ...shorthands.padding('16px'),
    ...shorthands.border('1px', 'solid', 'var(--colorNeutralStroke1)'),
  },
  settingsSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  settingsLabel: {
    color: 'var(--colorNeutralForeground2)',
  },
  buttonGroup: {
    display: 'flex',
    width: '100%',
    ...shorthands.gap('4px'),
  },
  themeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    ...shorthands.padding('4px', '0'),
  },
  themeCircle: {
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.15s ease, border-color 0.15s ease',
    ...shorthands.borderRadius('50%'),
    ...shorthands.border('2px', 'solid', 'transparent'),
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },
  themeCircleActive: {
    transform: 'scale(1.05)',
    ...shorthands.border('2px', 'solid', 'var(--colorBrandStroke1)'),
  },
  theme_light: {
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#dcdde1'),
  },
  theme_sepia: {
    backgroundColor: '#f8f1e5',
    ...shorthands.border('1px', 'solid', '#e0d5c1'),
  },
  theme_gray: {
    backgroundColor: '#f0f2f5',
    ...shorthands.border('1px', 'solid', '#cbd1d6'),
  },
  theme_dark: {
    backgroundColor: '#1a1a1a',
    ...shorthands.border('1px', 'solid', '#444444'),
  },
  backToTop: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    zIndex: 99,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '16px',
    height: '16px',
    cursor: 'nwse-resize',
    background: 'linear-gradient(135deg, transparent 50%, var(--reader-border, #e0e0e0) 50%)',
    zIndex: 102,
  }
});

const ArticleContent = React.memo(React.forwardRef<HTMLDivElement, {
  html: string;
  className: string;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}>(({
  html,
  className,
  onMouseDown,
  onMouseUp
}, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    />
  );
}));

ArticleContent.displayName = 'ArticleContent';

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  isDark,
  selectedArticle,
  showAiPanel,
  setShowAiPanel,
  onSelectionChange,
  onClose,
  isFullscreen,
  setIsFullscreen,
  modalPosition,
  setModalPosition,
  modalSize,
  setModalSize,
}) => {
  const styles = useStyles();

  // Reader Settings State
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-settings');
      if (saved) {
        return {
          ...DEFAULT_SETTINGS,
          ...JSON.parse(saved),
          theme: isDark ? 'dark' : 'light',
        };
      }
    } catch (e) {
      console.error('Failed to load reader settings', e);
    }
    return {
      ...DEFAULT_SETTINGS,
      theme: isDark ? 'dark' : 'light',
    };
  });

  useEffect(() => {
    localStorage.setItem('crono-reader-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setSettings(prev => {
      const nextTheme = isDark ? 'dark' : 'light';
      return prev.theme === nextTheme ? prev : { ...prev, theme: nextTheme };
    });
  }, [isDark]);

  // Article Content Crawl State
  const [articleHtml, setArticleHtml] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState(selectedArticle?.title || '');
  const [useFallbackIframe, setUseFallbackIframe] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const [stats, setStats] = useState({ wordCount: 0, readingTime: 0 });
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const selectionPendingRef = useRef(false);

  // Drag modal handler (triggered by clicking header)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isFullscreen) return;
    
    // Guard: Prevent dragging if clicking standard buttons or within interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.fui-PopoverTrigger')) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = modalPosition.top;
    const startLeft = modalPosition.left;
    const modalSurface = e.currentTarget.closest<HTMLElement>('[data-reader-modal-surface="true"]');
    let nextTop = startTop;
    let nextLeft = startLeft;
    let frame: number | null = null;

    if (modalSurface) {
      modalSurface.style.willChange = 'top, left';
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const maxTop = Math.max(MODAL_MARGIN, window.innerHeight - MODAL_MARGIN - modalSize.height);
      const maxLeft = Math.max(MODAL_MARGIN, window.innerWidth - MODAL_MARGIN - modalSize.width);
      nextTop = Math.min(Math.max(startTop + (moveEvent.clientY - startY), MODAL_MARGIN), maxTop);
      nextLeft = Math.min(Math.max(startLeft + (moveEvent.clientX - startX), MODAL_MARGIN), maxLeft);

      if (!modalSurface || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        modalSurface.style.top = `${nextTop}px`;
        modalSurface.style.left = `${nextLeft}px`;
        frame = null;
      });
    };

    const handleMouseUp = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (modalSurface) {
        modalSurface.style.top = `${nextTop}px`;
        modalSurface.style.left = `${nextLeft}px`;
        modalSurface.style.willChange = '';
      }
      setModalPosition({ top: nextTop, left: nextLeft });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isFullscreen, modalPosition, modalSize, setModalPosition]);

  // Resize modal handler (triggered by dragging bottom-right grip)
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalSize.width;
    const startHeight = modalSize.height;
    const modalSurface = e.currentTarget.closest<HTMLElement>('[data-reader-modal-surface="true"]');
    let nextWidth = startWidth;
    let nextHeight = startHeight;
    let frame: number | null = null;

    if (modalSurface) {
      modalSurface.style.willChange = 'width, height';
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const maxWidth = Math.max(0, window.innerWidth - MODAL_MARGIN - modalPosition.left);
      const maxHeight = Math.max(0, window.innerHeight - MODAL_MARGIN - modalPosition.top);
      nextWidth = Math.min(Math.max(MODAL_MIN_WIDTH, startWidth + (moveEvent.clientX - startX)), maxWidth);
      nextHeight = Math.min(Math.max(MODAL_MIN_HEIGHT, startHeight + (moveEvent.clientY - startY)), maxHeight);

      if (!modalSurface || frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        modalSurface.style.width = `${nextWidth}px`;
        modalSurface.style.height = `${nextHeight}px`;
        frame = null;
      });
    };

    const handleMouseUp = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      if (modalSurface) {
        modalSurface.style.width = `${nextWidth}px`;
        modalSurface.style.height = `${nextHeight}px`;
        modalSurface.style.willChange = '';
      }
      setModalSize({ width: nextWidth, height: nextHeight });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [modalPosition, modalSize, setModalSize]);

  const handleSelection = useCallback((pointer: { x: number; y: number }) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          onSelectionChange(null);
          return;
        }

        const text = selection.toString().trim();
        if (!text) {
          onSelectionChange(null);
          return;
        }

        const range = selection.getRangeAt(0);
        const articleContent = articleContentRef.current;
        if (!articleContent || !range.intersectsNode(articleContent)) {
          onSelectionChange(null);
          return;
        }

        const rects = Array.from(range.getClientRects())
          .filter(rect => rect.width > 0 && rect.height > 0);
        const boundingRect = range.getBoundingClientRect();
        const rect = boundingRect.width > 0 && boundingRect.height > 0
          ? boundingRect
          : rects[rects.length - 1];

        if (!rect) {
          onSelectionChange(null);
          return;
        }

        const contextElement = range.commonAncestorContainer.parentElement;
        const context = contextElement ? contextElement.textContent || text : text;

        onSelectionChange({
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
        });
      }, 0);
    });
  }, [onSelectionChange]);

  const handleSelectionStart = useCallback(() => {
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

  // Handle Scroll to update progress bar and Back to Top visibility
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollHeight === clientHeight) {
      setReadingProgress(0);
    } else {
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    }

    setShowBackToTop(scrollTop > 400);
  }, []);

  // Update stats when articleHtml changes
  useEffect(() => {
    setStats(estimateReadingStats(articleHtml));
  }, [articleHtml]);

  // Load/Fetch article content function (with bypass_cache option)
  const loadContent = useCallback((bypassCache: boolean = false, llmFallback: boolean = false) => {
    if (!selectedArticle?.link) return;

    setLoadingContent(true);
    apiFetch('/rss/article/content', {
      method: 'POST',
      body: JSON.stringify({
        url: String(selectedArticle.link),
        bypass_cache: bypassCache,
        llm_fallback: llmFallback,
      }),
    })
      .then(res => res.json())
      .then((data: { html: string; title: string; captcha: boolean; from_cache: boolean }) => {
        if (data.captcha || !data.html) {
          setUseFallbackIframe(true);
        } else {
          setArticleHtml(DOMPurify.sanitize(data.html));
          if (data.title) {
            setArticleTitle(data.title);
          }
        }
      })
      .catch(() => setUseFallbackIframe(true))
      .finally(() => setLoadingContent(false));
  }, [selectedArticle?.link]);

  // Reload article content (force refetch from server by bypassing cache)
  const handleReload = useCallback(() => {
    const shouldUseLlmFallback = Boolean(articleHtml && !useFallbackIframe);
    setUseFallbackIframe(false);
    setArticleHtml(null);
    loadContent(true, shouldUseLlmFallback);
  }, [articleHtml, loadContent, useFallbackIframe]);

  // Reset and Refetch when selectedArticle changes
  useEffect(() => {
    setShowAiPanel(false);
    onSelectionChange(null);
    setArticleHtml(null);
    setArticleTitle(selectedArticle?.title || '');
    setUseFallbackIframe(false);
    setReadingProgress(0);
    setShowBackToTop(false);

    loadContent(false);
  }, [onSelectionChange, selectedArticle?.id, selectedArticle?.link, loadContent, setShowAiPanel]);

  if (!selectedArticle) {
    return (
      <div className={styles.root}>
        <div className={styles.placeholderContainer}>
          <i className={`fas fa-file-alt ${styles.placeholderIcon}`} />
          <Text size={500} block>
            选择一篇文章阅读
          </Text>
          <Text>从左侧列表中选择一篇文章开始阅读。</Text>
        </div>
      </div>
    );
  }

  // Dynamic Theme Variables and Styles
  const themeVars = getThemeVariables(settings.theme);
  const readerStyles = {
    ...themeVars,
    '--reader-font-family': settings.fontFamily === 'serif'
      ? 'Georgia, Cambria, "Times New Roman", Times, "Songti SC", "SimSun", serif'
      : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '--reader-font-size': `${settings.fontSize}px`,
    '--reader-line-height': settings.lineHeight === 'compact' ? '1.5' : settings.lineHeight === 'loose' ? '2.1' : '1.8',
    '--reader-max-width': settings.width === 'narrow' ? '640px' : settings.width === 'wide' ? '960px' : '800px',
  } as React.CSSProperties;

  return (
    <div className={styles.root} style={readerStyles}>
      {/* Immersive Themed Header */}
      <header
        className={styles.header}
        onMouseDown={handleDragStart}
        style={{ cursor: isFullscreen ? 'default' : 'move' }}
      >
        <div className={styles.headerLeft}>
          <Text size={300} weight="semibold" style={{ color: 'var(--reader-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
            {articleTitle || selectedArticle.title || '阅读模式'}
          </Text>
          {stats.wordCount > 0 && (
            <Text size={100} style={{ color: 'var(--reader-meta)', whiteSpace: 'nowrap' }}>
              共 {stats.wordCount} 字 · 预计 {stats.readingTime} 分钟阅读
            </Text>
          )}
        </div>

        <div className={styles.headerRight} onMouseDown={(e) => e.stopPropagation()}>
          <Tooltip content="在新标签页打开原文" relationship="label">
            <Button
              appearance="subtle"
              icon={<Open24Regular style={{ color: 'var(--reader-text)' }} />}
              onClick={() => window.open(selectedArticle.link, '_blank')}
            />
          </Tooltip>

          <Tooltip content="重新加载文章" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowClockwise24Regular style={{ color: 'var(--reader-text)' }} />}
              onClick={handleReload}
              disabled={loadingContent}
            />
          </Tooltip>

          <Tooltip content="AI 助手" relationship="label">
            <Button
              appearance={showAiPanel ? 'primary' : 'subtle'}
              icon={<Sparkle24Regular />}
              onClick={() => setShowAiPanel(!showAiPanel)}
              style={showAiPanel ? undefined : { color: 'var(--reader-text)' }}
            >
              AI 助手
            </Button>
          </Tooltip>

          {/* Reading settings popover */}
          <Popover positioning="below-end">
            <PopoverTrigger disableButtonEnhancement>
              <Tooltip content="阅读设置 (Aa)" relationship="label">
                <Button
                  appearance="subtle"
                  icon={<Settings24Regular style={{ color: 'var(--reader-text)' }} />}
                />
              </Tooltip>
            </PopoverTrigger>
            <PopoverSurface className={styles.settingsPanel}>
              {/* Theme Settings */}
              <div className={styles.settingsSection}>
                <Text size={200} weight="semibold" className={styles.settingsLabel}>阅读主题</Text>
                <div className={styles.themeRow}>
                  {(['light', 'sepia', 'gray', 'dark'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setSettings(prev => ({ ...prev, theme: t }))}
                      className={`${styles.themeCircle} ${styles[`theme_${t}`]} ${settings.theme === t ? styles.themeCircleActive : ''}`}
                      title={t === 'light' ? '明亮' : t === 'sepia' ? '护眼暖沙' : t === 'gray' ? '水墨灰色' : '夜间暗黑'}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family Settings */}
              <div className={styles.settingsSection}>
                <Text size={200} weight="semibold" className={styles.settingsLabel}>字体选择</Text>
                <div className={styles.buttonGroup}>
                  <Button
                    appearance={settings.fontFamily === 'sans' ? 'primary' : 'outline'}
                    onClick={() => setSettings(prev => ({ ...prev, fontFamily: 'sans' }))}
                    style={{ flex: 1 }}
                    size="small"
                  >
                    系统默认
                  </Button>
                  <Button
                    appearance={settings.fontFamily === 'serif' ? 'primary' : 'outline'}
                    onClick={() => setSettings(prev => ({ ...prev, fontFamily: 'serif' }))}
                    style={{ flex: 1 }}
                    size="small"
                  >
                    优雅衬线
                  </Button>
                </div>
              </div>

              {/* Font Size Settings */}
              <div className={styles.settingsSection}>
                <Text size={200} weight="semibold" className={styles.settingsLabel}>字号大小 ({settings.fontSize}px)</Text>
                <div className={styles.buttonGroup} style={{ alignItems: 'center' }}>
                  <Button
                    onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 1) }))}
                    disabled={settings.fontSize <= 14}
                    size="small"
                    style={{ minWidth: '40px' }}
                  >
                    A-
                  </Button>
                  <span style={{ flexGrow: 1, textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                    {settings.fontSize}
                  </span>
                  <Button
                    onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.min(28, prev.fontSize + 1) }))}
                    disabled={settings.fontSize >= 28}
                    size="small"
                    style={{ minWidth: '40px' }}
                  >
                    A+
                  </Button>
                </div>
              </div>

              {/* Layout Width Settings */}
              <div className={styles.settingsSection}>
                <Text size={200} weight="semibold" className={styles.settingsLabel}>版面宽度</Text>
                <div className={styles.buttonGroup}>
                  {(['narrow', 'medium', 'wide'] as const).map(w => (
                    <Button
                      key={w}
                      appearance={settings.width === w ? 'primary' : 'outline'}
                      onClick={() => setSettings(prev => ({ ...prev, width: w }))}
                      style={{ flex: 1 }}
                      size="small"
                    >
                      {w === 'narrow' ? '窄' : w === 'medium' ? '中' : '宽'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Line Height Settings */}
              <div className={styles.settingsSection}>
                <Text size={200} weight="semibold" className={styles.settingsLabel}>行间距</Text>
                <div className={styles.buttonGroup}>
                  {(['compact', 'normal', 'loose'] as const).map(lh => (
                    <Button
                      key={lh}
                      appearance={settings.lineHeight === lh ? 'primary' : 'outline'}
                      onClick={() => setSettings(prev => ({ ...prev, lineHeight: lh }))}
                      style={{ flex: 1 }}
                      size="small"
                    >
                      {lh === 'compact' ? '紧' : lh === 'normal' ? '中' : '松'}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverSurface>
          </Popover>

          {/* Fullscreen Toggle Button */}
          <Tooltip content={isFullscreen ? "退出全屏" : "全屏模式"} relationship="label">
            <Button
              appearance="subtle"
              icon={isFullscreen ? <ArrowMinimize24Regular style={{ color: 'var(--reader-text)' }} /> : <Maximize24Regular style={{ color: 'var(--reader-text)' }} />}
              onClick={() => setIsFullscreen(!isFullscreen)}
            />
          </Tooltip>

          <Tooltip content="关闭" relationship="label">
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular style={{ color: 'var(--reader-text)' }} />}
              onClick={onClose}
            />
          </Tooltip>
        </div>

        {/* Top Scroll Progress Indicator */}
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} style={{ width: `${readingProgress}%` }} />
        </div>
      </header>

      {/* Main scroll container */}
      <div
        ref={scrollContainerRef}
        className={styles.scrollContainer}
        onScroll={handleScroll}
        onMouseDown={handleSelectionStart}
      >
        {loadingContent ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
            <Spinner label="正在全力加载文章内容..." />
          </div>
        ) : useFallbackIframe ? (
          <iframe
            src={String(selectedArticle.link)}
            title={selectedArticle.title}
            className={styles.iframe}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className={styles.articleContainer}>
            {/* Article Header (Title & Metadata) */}
            <div className={styles.articleHeader}>
              <h1 className={styles.articleTitle}>{articleTitle}</h1>
              <div className={styles.metaContainer}>
                {selectedArticle.author && selectedArticle.author !== '未知作者' && (
                  <>
                    <div className={styles.metaItem}>
                      <span>作者：{selectedArticle.author}</span>
                    </div>
                    <div className={styles.metaDivider} />
                  </>
                )}
                <div className={styles.metaItem}>
                  <span>时间：{new Date(selectedArticle.pub_date).toLocaleString()}</span>
                </div>
                <div className={styles.metaDivider} />
                <div className={styles.metaItem}>
                  <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.originalLink}
                  >
                    查看原文 <Open24Regular style={{ fontSize: '14px', marginLeft: '2px' }} />
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.separator} />

            <ArticleContent
              ref={articleContentRef}
              className={styles.articleHtml}
              html={articleHtml ?? ''}
            />
          </div>
        )}
      </div>

      {/* Back to top floating button */}
      {showBackToTop && (
        <Tooltip content="回到顶部" relationship="label">
          <Button
            className={styles.backToTop}
            icon={<ArrowUp24Regular />}
            shape="circular"
            appearance="primary"
            onClick={() => {
              scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </Tooltip>
      )}

      {/* Resize corner grip */}
      {!isFullscreen && (
        <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />
      )}

    </div>
  );
};
