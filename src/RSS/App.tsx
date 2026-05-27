// src/App.tsx
import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleReader } from './components/ArticleReader';
import { ArticleList } from './components/ArticleList/ArticleList';
import { ReaderPage } from './components/Reader/ReaderPage';
import Split from 'react-split';
import './App.css';
import { useRSSData } from './useApp';

import {
  makeStyles,
  shorthands,
  Tab,
  TabList,
} from '@fluentui/react-components';
import { Rss24Regular, Globe24Regular, Chat24Regular } from '@fluentui/react-icons';
import ChatApp from '../LLM/Chat';

import type { AuthUser } from '../api/auth';
import type { ArticleResponse } from './model/article';

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
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSurface: {
    backgroundColor: 'var(--colorNeutralBackground1)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.24)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    ...shorthands.borderRadius('12px'),
  },
});

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedId, setSelectedFeedId] = useState<string>('all');

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

  const [modalPosition, setModalPosition] = useState<{ top: number; left: number }>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-modal-position');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { top: 100, left: 100 };
  });

  const [modalSize, setModalSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('crono-reader-modal-size');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { width: 900, height: 650 };
  });

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

  // Handler to open custom URLs in the reader dialog
  const handleOpenUrl = (url: string) => {
    setCustomArticle({
      id: -Math.floor(Math.random() * 1000000) - 1, // Unique negative ID to trigger fetch
      feed_id: -1,
      title: url,
      link: url,
      guid: url,
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

  useEffect(() => {
    setShowAiPanel(false);
  }, [selectedArticle?.id, customArticle?.id]);

  const activeArticle = customArticle || selectedArticle;

  return (
    <div className="app-container">
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={onLogout}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
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
          <Split className="split" sizes={[22, 78]} minSize={220} gutterSize={8} snapOffset={0}>
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
                searchQuery={searchQuery}
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

      {/* Floating Draggable and Resizable Article Modal */}
      {isReaderOpen && activeArticle && (
        <div className={styles.modalBackdrop} onClick={() => setIsReaderOpen(false)}>
          <div
            className={styles.modalSurface}
            style={
              isFullscreen
                ? {
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
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
              selectedArticle={activeArticle}
              onToggleStar={() => { }}
              showAiPanel={showAiPanel}
              setShowAiPanel={setShowAiPanel}
              onClose={() => setIsReaderOpen(false)}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              modalPosition={modalPosition}
              setModalPosition={setModalPosition}
              modalSize={modalSize}
              setModalSize={setModalSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;