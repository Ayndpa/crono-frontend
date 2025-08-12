import * as React from 'react';
import {
  Button,
  Select,
  Switch,
  makeStyles,
  Toolbar,
  Display,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import { BoxFilled, GridFilled, ListFilled } from '@fluentui/react-icons';
import { ArticleCard } from './ArticleCard';
import { ArticleListItem } from './ArticleListItem';
import type { ArticleResponse } from '../../model/article';

const useStyles = makeStyles({
  root: {
    padding: '16px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    maxHeight: '95vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: '16px',
    color: '#cccccc',
  },
  emptyTitle: {
    marginBottom: '8px',
  },
  emptyDescription: {
    marginBottom: '24px',
    color: '#666666',
  },
});

interface ArticleListProps {
  articles: ArticleResponse[];
  selectedArticleId: number | null;
  onArticleSelect: (id: number) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  selectedArticleId,
  onArticleSelect,
}) => {
  const styles = useStyles();
  const [selectedCategory] = React.useState('all');
  const [sortOrder, setSortOrder] = React.useState('newest');
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('card');

  const filteredArticles = React.useMemo(() => {
    return articles
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime();
        } else {
          return new Date(a.pub_date).getTime() - new Date(b.pub_date).getTime();
        }
      });
  }, [articles, selectedCategory, sortOrder, onlyUnread]);

  if (filteredArticles.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BoxFilled fontSize="64px" className={styles.emptyIcon} />
        <Display className={styles.emptyTitle}>没有找到文章</Display>
        <Text className={styles.emptyDescription}>
          当前分类下没有文章，请尝试其他分类或添加新的订阅源。
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Toolbar className={styles.controls}>
          <Select
            size="small"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">最新优先</option>
            <option value="oldest">最旧优先</option>
          </Select>
          <Switch
            label="仅显示未读"
            checked={onlyUnread}
            onChange={(_e, data) => setOnlyUnread(data.checked)}
          />
          <Toolbar>
            <Tooltip content="卡片视图" relationship="label">
              <Button
                appearance={viewMode === 'card' ? 'primary' : 'secondary'}
                icon={<GridFilled />}
                onClick={() => setViewMode('card')}
              />
            </Tooltip>
            <Tooltip content="列表视图" relationship="label">
              <Button
                appearance={viewMode === 'list' ? 'primary' : 'secondary'}
                icon={<ListFilled />}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
          </Toolbar>
        </Toolbar>
      </div>
      {viewMode === 'card' ? (
        <div className={styles.cardGrid}>
          {filteredArticles.map((article: ArticleResponse) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticleId?.toString() === article.id?.toString()}
              onClick={() => article.id !== undefined && onArticleSelect(Number(article.id))}
            />
          ))}
        </div>
      ) : (
        <div>
          {filteredArticles.map((article: ArticleResponse) => (
            <ArticleListItem
              key={article.id}
              article={article}
              isSelected={selectedArticleId === Number(article.id)}
              onClick={() => article.id !== undefined && onArticleSelect(Number(article.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
};