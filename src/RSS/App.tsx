// src/App.tsx
import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleReader } from './components/ArticleReader';
import { ArticleList } from './components/ArticleList/ArticleList';
import { BrowserTabs } from './components/Browser/BrowserTabs';
import Split from 'react-split';
import './App.css';
import { useRSSData } from './useApp';

import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogTrigger,
  Button,
  makeStyles,
  Tab,
  TabList,
} from '@fluentui/react-components';
import { Rss24Regular, Globe24Regular, Chat24Regular } from '@fluentui/react-icons';
import ChatApp from '../LLM/Chat';

import type { AuthUser } from '../api/auth';

interface AppProps {
  isDark: boolean;
  toggleTheme: () => void;
  user: AuthUser;
  onLogout: () => void;
}

const useStyles = makeStyles({
  dialogSurface: {
    height: '88vh',
    width: '92vw',
    maxWidth: 'none',
  },
  dialogBody: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
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

  return (
    <div className="app-container">
      <Header isDark={isDark} toggleTheme={toggleTheme} user={user} onLogout={onLogout} />

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
          <Split className="split" sizes={[20, 80]} minSize={200}>
            <Sidebar
              feeds={feeds}
              onFeedSelect={fetchArticlesByFeed}
              onShowAll={refetchArticlesFromBackend}
            />
            <ArticleList
              articles={articles}
              selectedArticleId={selectedArticle?.id || null}
              onArticleSelect={handleArticleSelect}
            />
          </Split>
        </div>

        {/* 浏览器视图 */}
        <div className={styles.viewContent} style={{ display: activeView === 'browser' ? 'flex' : 'none' }}>
          <BrowserTabs />
        </div>

        {/* 聊天视图 */}
        <div className={styles.viewContent} style={{ display: activeView === 'chat' ? 'flex' : 'none' }}>
          <ChatApp />
        </div>
      </div>

      <Dialog
        open={isReaderOpen}
        onOpenChange={(_, data) => setIsReaderOpen(data.open)}
      >
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody className={styles.dialogBody}>
            <DialogTitle>
              {selectedArticle?.title || '文章阅读器'}
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary" style={{ float: 'right' }}>关闭</Button>
              </DialogTrigger>
            </DialogTitle>
            <ArticleReader
              selectedArticle={selectedArticle}
              onToggleStar={() => { }}
              allArticles={articles}
            />
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default App;