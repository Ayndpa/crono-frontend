import * as React from 'react';
import {
  Button,
  Card,
  Persona,
  Tag,
  makeStyles,
  Caption1,
  Subtitle2Stronger,
  tokens,
} from '@fluentui/react-components';
import { StarFilled, StarRegular, TagRegular, CalendarMonthRegular } from '@fluentui/react-icons';
import type { ArticleResponse } from '../../model/article';

const useStyles = makeStyles({
  listItemCard: {
    marginBottom: '8px',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    // 未读文章的蓝色描边
    '&:not([data-read="true"])': {
      borderLeft: `3px solid ${tokens.colorBrandBackground}`,
      paddingLeft: '13px', // 配合描边调整内边距
    },
  },
  listItemContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '12px 16px',
    position: 'relative',
  },
  listItemDetails: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingRight: '32px',
  },
  listItemTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listItemSummary: {
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    position: 'absolute',
    right: '16px',
    top: 0,
  },
});

type ArticleListItemProps = {
  article: ArticleResponse; // 使用后端返回的数据模型
  isSelected: boolean;
  onClick: () => void;
};

export const ArticleListItem: React.FC<ArticleListItemProps> = ({ article, isSelected, onClick }) => {
  const styles = useStyles();
  return (
    <Card
      className={styles.listItemCard}
      selected={isSelected}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`文章: ${article.title}`}
      data-read={article.is_read} // 更新为后端模型的字段
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className={styles.listItemContent}>
        <div className={styles.listItemDetails}>
          <Subtitle2Stronger className={styles.listItemTitle}>{article.title}</Subtitle2Stronger>
          <Caption1 className={styles.listItemSummary}>{article.ai_summary}</Caption1> {/* 使用 AI 生成的总结 */}
          <div className={styles.listFooter}>
            {article.tags?.map((tag) => (
              <Tag key={tag} appearance="outline" icon={<TagRegular />}>
                {tag}
              </Tag>
            ))}
            <Persona name={article.author || '未知作者'} size="extra-small" avatar={{ color: 'colorful' }} />
            <Caption1>
              <CalendarMonthRegular /> {article.pub_date}
            </Caption1>
          </div>
        </div>
      </div>
    </Card>
  );
};