// src/App.tsx
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ArticleReader } from './components/ArticleReader';
import { ArticleList } from './components/ArticleList/ArticleList';
import Split from 'react-split';
import './App.css';
import { useRSSData } from './useApp'; // 引入自定义 Hook

// 从 @fluentui/react-components 导入 Fluent UI v9 的组件
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogTrigger,
  Button,
  makeStyles,
} from '@fluentui/react-components';

interface AppProps {
  isDark: boolean;
  toggleTheme: () => void;
}

// 定义样式
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
});

function App({ isDark, toggleTheme }: AppProps) {
  const {
    articles,
    selectedArticle,
    isReaderOpen,
    feeds,
    handleArticleSelect,
    setIsReaderOpen,
    fetchArticlesByFeed,
    refetchArticlesFromBackend,
  } = useRSSData(); // 使用自定义 Hook

  const styles = useStyles();

  return (
    <div className="app-container">
      <Header isDark={isDark} toggleTheme={toggleTheme} />
      <Split className="split" sizes={[20, 80]} minSize={200}>
        <Sidebar
          feeds={feeds}
          onFeedSelect={fetchArticlesByFeed} // 使用 Hook 提供的函数
          onShowAll={refetchArticlesFromBackend} // 使用 Hook 提供的函数
        />
        <ArticleList
          articles={articles}
          selectedArticleId={selectedArticle?.id || null}
          onArticleSelect={handleArticleSelect}
        />
      </Split>

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
            />
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default App;