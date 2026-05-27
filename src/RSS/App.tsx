// src/App.tsx
import { useState, useEffect, useMemo, type KeyboardEvent, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleReader } from './components/ArticleReader';
import { ArticleList } from './components/ArticleList/ArticleList';
import { ArticleListItem } from './components/ArticleList/ArticleListItem';
import { ReaderPage } from './components/Reader/ReaderPage';
import { AiAssistPanel } from './components/AiAssistPanel';
import { SelectionAssistPopover } from './components/SelectionAssistPopover';
import Split from 'react-split';
import './App.css';
import { useRSSData } from './useApp';

import {
  Button,
  Input,
  Text,
  makeStyles,
  shorthands,
  Tab,
  TabList,
} from '@fluentui/react-components';
import { Dismiss24Regular, Rss24Regular, Globe24Regular, Chat24Regular, Search24Regular } from '@fluentui/react-icons';
import ChatApp from '../LLM/Chat';

import type { AuthUser } from '../api/auth';
import type { ArticleResponse } from './model/article';

const SIDEBAR_SPLIT_STORAGE_KEY = 'crono-rss-sidebar-split-sizes';
const DEFAULT_SPLIT_SIZES: [number, number] = [22, 78];

function readSavedSidebarSplitSizes(): [number, number] {
  try {
    const saved = localStorage.getItem(SIDEBAR_SPLIT_STORAGE_KEY);
    if (!saved) return DEFAULT_SPLIT_SIZES;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length < 2) return DEFAULT_SPLIT_SIZES;

    const sidebarWidth = Number(parsed[0]);
    const articleWidth = Number(parsed[1]);
    if (!Number.isFinite(sidebarWidth) || !Number.isFinite(articleWidth)) {
      return DEFAULT_SPLIT_SIZES;
    }

    return [sidebarWidth, articleWidth];
  } catch {
    return DEFAULT_SPLIT_SIZES;
  }
}

interface AppProps {
  isDark: boolean;
  toggleTheme: () => void;
  user: AuthUser;
  onLogout: () => void;
}

const useStyles = makeStyles({
  mainArea: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  viewTabBar: {
    padding: '0 16px',
    borderBottom: '1px solid #eee',
    flexShrink: 0,
  },
  viewContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  splitPane: {
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  sidebarPane: {
    flex: '0 0 auto',
  },
  articlePane: {
    flex: '1 1 0',
  },
  searchBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    backdropFilter: 'blur(4px)',
    zIndex: 1002,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '72px 16px 24px',
    boxSizing: 'border-box',
  },
  searchSurface: {
    width: 'min(920px, 100%)',
    maxHeight: 'calc(100vh - 96px)',
    backgroundColor: 'var(--colorNeutralBackground1)',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.32)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...shorthands.borderRadius('16px'),
  },
  searchHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 20px 14px',
    borderBottom: '1px solid var(--colorNeutralStroke2)',
  },
  searchBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px 20px 20px',
    overflow: 'hidden',
  },
  searchResults: {
    overflowY: 'auto',
    paddingRight: '4px',
  },
  searchHint: {
    color: 'var(--colorNeutralForeground3)',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSurface: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.24)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    boxSizing: 'border-box',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 32px)',
    ...shorthands.borderRadius('12px'),
  },
});

const MODAL_MARGIN = 16;
const MODAL_MIN_WIDTH = 600;
const MODAL_MIN_HEIGHT = 400;
const DEFAULT_MODAL_POSITION = { top: 100, left: 100 };
const DEFAULT_MODAL_SIZE = { width: 900, height: 650 };

type ModalPosition = { top: number; left: number };
type ModalSize = { width: number; height: number };
type SelectionState = {
  text: string;
  context: string;
  rect: { top: number; left: number; width: number; height: number; bottom: number };
  pointer: { x: number; y: number };
} | null;

const getViewportBounds = () => {
  if (typeof window === 'undefined') {
    return {
      width: DEFAULT_MODAL_SIZE.width + MODAL_MARGIN * 2,
      height: DEFAULT_MODAL_SIZE.height + MODAL_MARGIN * 2,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const clampModalSize = (size: ModalSize, viewport = getViewportBounds()): ModalSize => {
  const availableWidth = Math.max(0, viewport.width - MODAL_MARGIN * 2);
  const availableHeight = Math.max(0, viewport.height - MODAL_MARGIN * 2);

  const width = availableWidth < MODAL_MIN_WIDTH
    ? availableWidth
    : Math.min(Math.max(size.width, MODAL_MIN_WIDTH), availableWidth);

  const height = availableHeight < MODAL_MIN_HEIGHT
    ? availableHeight
    : Math.min(Math.max(size.height, MODAL_MIN_HEIGHT), availableHeight);

  return { width, height };
};

const clampModalPosition = (position: ModalPosition, size: ModalSize, viewport = getViewportBounds()): ModalPosition => {
  const maxLeft = Math.max(MODAL_MARGIN, viewport.width - MODAL_MARGIN - size.width);
  const maxTop = Math.max(MODAL_MARGIN, viewport.height - MODAL_MARGIN - size.height);

  return {
    left: Math.min(Math.max(position.left, MODAL_MARGIN), maxLeft),
    top: Math.min(Math.max(position.top, MODAL_MARGIN), maxTop),
  };
};

function App({ isDark, toggleTheme, user, onLogout }: AppProps) {
  const {
    articles,
    selectedArticle,
    isReaderOpen,
    feeds,
    handleArticleSelect,
    setIsReaderOpen,
    fetchArticlesByFeed,
    refetchArticlesFromBackend,
  } = useRSSData();

  const styles = useStyles();
  const [activeView, setActiveView] = useState<'rss' | 'browser' | 'chat'>('rss');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectionState, setSelectionState] = useState<SelectionState>(null);
  const [showArticleSearch, setShowArticleSearch] = useState(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');
  const [sidebarSplitSizes, setSidebarSplitSizes] = useState<[number, number]>(() => readSavedSidebarSplitSizes());

  // Custom article for URLs opened via helper reader
  const [customArticle, setCustomArticle] = useState<ArticleResponse | null>(null);

  // Floating, draggable, resizable window states (persisted in localStorage)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-modal-fullscreen');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [modalPosition, setModalPosition] = useState<ModalPosition>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-modal-position');
      if (saved) return clampModalPosition(JSON.parse(saved) as ModalPosition, clampModalSize(DEFAULT_MODAL_SIZE));
    } catch {}
    return DEFAULT_MODAL_POSITION;
  });

  const [modalSize, setModalSize] = useState<ModalSize>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-modal-size');
      if (saved) return clampModalSize(JSON.parse(saved) as ModalSize);
    } catch {}
    return clampModalSize(DEFAULT_MODAL_SIZE);
  });

  const updateModalPosition = useCallback((nextPosition: ModalPosition) => {
    if (isFullscreen) return;

    const viewport = getViewportBounds();
    const clampedPosition = clampModalPosition(nextPosition, modalSize, viewport);
    setModalPosition(prev => (
      prev.top === clampedPosition.top && prev.left === clampedPosition.left ? prev : clampedPosition
    ));
  }, [isFullscreen, modalSize]);

  const updateModalSize = useCallback((nextSize: ModalSize) => {
    if (isFullscreen) return;

    const viewport = getViewportBounds();
    const clampedSize = clampModalSize(nextSize, viewport);
    const clampedPosition = clampModalPosition(modalPosition, clampedSize, viewport);

    setModalSize(prev => (
      prev.width === clampedSize.width && prev.height === clampedSize.height ? prev : clampedSize
    ));
    setModalPosition(prev => (
      prev.top === clampedPosition.top && prev.left === clampedPosition.left ? prev : clampedPosition
    ));
  }, [isFullscreen, modalPosition]);

  const syncModalToViewport = useCallback(() => {
    if (isFullscreen) return;

    const viewport = getViewportBounds();
    const clampedSize = clampModalSize(modalSize, viewport);
    const clampedPosition = clampModalPosition(modalPosition, clampedSize, viewport);

    setModalSize(prev => (
      prev.width === clampedSize.width && prev.height === clampedSize.height ? prev : clampedSize
    ));
    setModalPosition(prev => (
      prev.top === clampedPosition.top && prev.left === clampedPosition.left ? prev : clampedPosition
    ));
  }, [isFullscreen, modalPosition, modalSize]);

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem('crono-reader-modal-fullscreen', JSON.stringify(isFullscreen));
  }, [isFullscreen]);

  useEffect(() => {
    localStorage.setItem('crono-reader-modal-position', JSON.stringify(modalPosition));
  }, [modalPosition]);

  useEffect(() => {
    localStorage.setItem('crono-reader-modal-size', JSON.stringify(modalSize));
  }, [modalSize]);

  useEffect(() => {
    syncModalToViewport();

    window.addEventListener('resize', syncModalToViewport);
    return () => window.removeEventListener('resize', syncModalToViewport);
  }, [syncModalToViewport]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_SPLIT_STORAGE_KEY, JSON.stringify(sidebarSplitSizes));
  }, [sidebarSplitSizes]);

  // Center modal window upon open (only if no custom position/size settings are saved)
  useEffect(() => {
    if (isReaderOpen && !isFullscreen) {
      const hasSavedPosition = localStorage.getItem('crono-reader-modal-position');
      const hasSavedSize = localStorage.getItem('crono-reader-modal-size');
      
      if (!hasSavedPosition || !hasSavedSize) {
        const width = Math.min(1000, window.innerWidth * 0.8);
        const height = Math.min(750, window.innerHeight * 0.85);
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        if (!hasSavedSize) setModalSize({ width, height });
        if (!hasSavedPosition) setModalPosition({ top: top > 40 ? top : 40, left });
      }
    }
  }, [isReaderOpen]);

  const normalizeOpenUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const isProbablyUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return true;
    return /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(trimmed);
  };

  // Handler to open custom URLs in the reader dialog
  const handleOpenUrl = (url: string) => {
    const normalizedUrl = normalizeOpenUrl(url);
    if (!normalizedUrl) return;

    setCustomArticle({
      id: -Math.floor(Math.random() * 1000000) - 1, // Unique negative ID to trigger fetch
      feed_id: -1,
      title: normalizedUrl,
      link: normalizedUrl,
      guid: normalizedUrl,
      pub_date: new Date().toISOString(),
      author: '网页抓取',
      is_read: true,
      updated_at: new Date().toISOString(),
    });
    setIsReaderOpen(true);
  };

  // Wrap RSS list select handler to clear custom article
  const handleArticleSelectWithClear = (id: number) => {
    setCustomArticle(null);
    handleArticleSelect(id);
  };

  const handleOpenArticleSearch = () => {
    setShowArticleSearch(true);
  };

  const handleCloseArticleSearch = () => {
    setShowArticleSearch(false);
  };

  const handleArticleSearchSubmit = () => {
    const trimmedQuery = articleSearchQuery.trim();
    if (!trimmedQuery) return;

    if (isProbablyUrl(trimmedQuery)) {
      handleCloseArticleSearch();
      handleOpenUrl(trimmedQuery);
    }
  };

  const handleSearchArticleSelect = (id: number) => {
    handleCloseArticleSearch();
    handleArticleSelectWithClear(id);
  };

  const articleSearchResults = useMemo(() => {
    const normalizedQuery = articleSearchQuery.trim().toLowerCase();
    const sortedArticles = [...articles].sort(
      (a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime()
    );

    if (!normalizedQuery) {
      return sortedArticles.slice(0, 20);
    }

    return sortedArticles.filter((article) => {
      const searchableText = [
        article.title,
        article.ai_summary,
        article.author,
        article.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [articles, articleSearchQuery]);

  useEffect(() => {
    setShowAiPanel(false);
  }, [selectedArticle?.id, customArticle?.id]);

  const activeArticle = customArticle || selectedArticle;

  const handleCloseAiPanel = useCallback(() => {
    setShowAiPanel(false);
    setSelectionState(null);
  }, []);

  const handleLocateSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const element = range.startContainer.parentElement;
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="app-container">
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={onLogout}
        onOpenArticleSearch={handleOpenArticleSearch}
      />

      <div className={styles.mainArea}>
        {/* 视图切换标签 */}
        <div className={styles.viewTabBar}>
          <TabList
            selectedValue={activeView}
            onTabSelect={(_, d) => setActiveView(d.value as 'rss' | 'browser' | 'chat')}
            size="small"
          >
            <Tab value="rss" icon={<Rss24Regular />}>RSS 阅读</Tab>
            <Tab value="browser" icon={<Globe24Regular />}>辅助阅读器</Tab>
            <Tab value="chat" icon={<Chat24Regular />}>聊天</Tab>
          </TabList>
        </div>

        {/* RSS 阅读视图 */}
        <div className={styles.viewContent} style={{ display: activeView === 'rss' ? 'flex' : 'none' }}>
          <Split
            className="split"
            sizes={sidebarSplitSizes}
            minSize={220}
            gutterSize={8}
            snapOffset={0}
            onDragEnd={(sizes) => {
              setSidebarSplitSizes([sizes[0], sizes[1]]);
            }}
          >
            <div className={`${styles.splitPane} ${styles.sidebarPane}`}>
              <Sidebar
                feeds={feeds}
                selectedKey={selectedFeedId}
                onFeedSelect={(feedId) => {
                  fetchArticlesByFeed(feedId);
                  setSelectedFeedId(feedId);
                }}
                onShowAll={() => {
                  refetchArticlesFromBackend();
                  setSelectedFeedId('all');
                }}
              />
            </div>
            <div className={`${styles.splitPane} ${styles.articlePane}`}>
              <ArticleList
                articles={articles}
                selectedArticleId={customArticle ? null : (selectedArticle?.id || null)}
                onArticleSelect={handleArticleSelectWithClear}
              />
            </div>
          </Split>
        </div>

        {/* 浏览器视图 */}
        <div className={styles.viewContent} style={{ display: activeView === 'browser' ? 'flex' : 'none' }}>
          <ReaderPage onOpenUrl={handleOpenUrl} />
        </div>

        {/* 聊天视图 */}
        <div className={styles.viewContent} style={{ display: activeView === 'chat' ? 'flex' : 'none' }}>
          <ChatApp />
        </div>
      </div>

      {showArticleSearch && (
        <div className={styles.searchBackdrop} onClick={handleCloseArticleSearch}>
          <div className={styles.searchSurface} onClick={(e) => e.stopPropagation()}>
            <div className={styles.searchHeader}>
              <div>
                <Text size={500} weight="semibold">搜索文章</Text>
                <div className={styles.searchHint}>
                  在这里查找文章，点击结果后会直接打开阅读窗口。
                </div>
              </div>
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={handleCloseArticleSearch} />
            </div>

            <div className={styles.searchBody}>
              <Input
                placeholder="搜索文章，或直接粘贴链接后回车"
                value={articleSearchQuery}
                onChange={(_, data) => setArticleSearchQuery(data.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleArticleSearchSubmit();
                  }
                }}
                contentBefore={<Search24Regular />}
                autoFocus
              />

              {isProbablyUrl(articleSearchQuery) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    border: '1px solid var(--colorNeutralStroke2)',
                    borderRadius: '12px',
                    background: 'var(--colorNeutralBackground2)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Text weight="semibold">检测到链接</Text>
                    <div className={styles.searchHint} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      回车后将直接在阅读窗口打开该链接。
                    </div>
                  </div>
                  <Button appearance="primary" onClick={handleArticleSearchSubmit}>
                    打开链接阅读
                  </Button>
                </div>
              )}

              <div className={styles.searchResults}>
                {articleSearchResults.length > 0 ? (
                  articleSearchResults.map((article) => (
                    <ArticleListItem
                      key={article.id}
                      article={article}
                      isSelected={selectedArticle?.id === Number(article.id)}
                      onClick={() => article.id !== undefined && handleSearchArticleSelect(Number(article.id))}
                    />
                  ))
                ) : (
                  <div style={{ padding: '28px 8px', textAlign: 'center' }}>
                    <Text size={500} weight="semibold">没有找到匹配文章</Text>
                    <div className={styles.searchHint} style={{ marginTop: '8px' }}>
                      请尝试更换关键词，或直接关闭后浏览列表。
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Draggable and Resizable Article Modal */}
      {isReaderOpen && activeArticle && (
        <div className={styles.modalBackdrop} onClick={() => setIsReaderOpen(false)}>
          <div
            className={styles.modalSurface}
            data-reader-modal-surface="true"
            style={
              isFullscreen
                ? {
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      borderRadius: 0,
                      zIndex: 1001,
                    }
                : {
                      top: `${modalPosition.top}px`,
                      left: `${modalPosition.left}px`,
                      width: `${modalSize.width}px`,
                      height: `${modalSize.height}px`,
                    }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <ArticleReader
              isDark={isDark}
              selectedArticle={activeArticle}
              onToggleStar={() => {}}
              showAiPanel={showAiPanel}
              setShowAiPanel={setShowAiPanel}
              onSelectionChange={setSelectionState}
              onClose={() => setIsReaderOpen(false)}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              modalPosition={modalPosition}
              setModalPosition={updateModalPosition}
              modalSize={modalSize}
              setModalSize={updateModalSize}
            />
          </div>
        </div>
      )}

      {isReaderOpen && activeArticle && showAiPanel && (
        <AiAssistPanel
          article={activeArticle}
          isDark={isDark}
          onClose={handleCloseAiPanel}
        />
      )}

      {isReaderOpen && activeArticle && selectionState && (
        <SelectionAssistPopover
          text={selectionState.text}
          context={selectionState.context}
          articleTitle={activeArticle.title}
          anchorPoint={selectionState.pointer}
          onLocate={handleLocateSelection}
          onClose={() => setSelectionState(null)}
        />
      )}
    </div>
  );
}

export default App;
