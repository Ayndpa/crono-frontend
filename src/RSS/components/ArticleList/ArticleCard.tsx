import * as React from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  Persona,
  Text,
  makeStyles,
  tokens,
  Caption1,
  Subtitle2Stronger,
} from '@fluentui/react-components';
import { CalendarMonthRegular } from '@fluentui/react-icons';
import type { ArticleResponse } from '../../model/article';

const useStyles = makeStyles({
  verticalCard: {
    position: 'relative',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    },
    '&:not([data-read="true"])': {
      borderLeft: `3px solid ${tokens.colorBrandBackground}`,
      paddingLeft: '13px',
    },
  },
  cardHeader: {
    gap: '4px',
    padding: '12px 16px',
    position: 'relative',
  },
  cardTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardSummary: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 16px',
    flexWrap: 'wrap',
  },
  metaContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionContainer: {
  },
});

type ArticleCardProps = {
  article: ArticleResponse;
  isSelected: boolean;
  onClick: () => void;
};

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, isSelected, onClick }) => {
  const styles = useStyles();

  return (
    <Card
      className={styles.verticalCard}
      selected={isSelected}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`文章: ${article.title}`}
      data-read={article.is_read ? 'true' : 'false'} // 恢复 data-read 属性
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <CardHeader
        className={styles.cardHeader}
        header={<Subtitle2Stronger className={styles.cardTitle}>{article.title}</Subtitle2Stronger>}
        description={
          article.ai_summary ? (
            <Text className={styles.cardSummary}>{article.ai_summary}</Text>
          ) : undefined
        }
      />
      <CardFooter className={styles.cardFooter}>
        <div className={styles.metaContainer}>
          <Persona name={article.author || '未知作者'} size="extra-small" avatar={{ color: 'colorful' }} />
          <Caption1>
            <CalendarMonthRegular /> {new Date(article.pub_date).toLocaleDateString()}
          </Caption1>
        </div>
      </CardFooter>
    </Card>
  );
};