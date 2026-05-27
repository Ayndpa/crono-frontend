import React, { useEffect, useState } from 'react';
import { Card, tokens, makeStyles, shorthands } from '@fluentui/react-components';
import { FeedRegular, CheckmarkCircleRegular, DismissCircleRegular, ClockRegular } from '@fluentui/react-icons';
import { apiFetch } from '../../api/client';

const useStyles = makeStyles({
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  card: {
    padding: '16px 20px',
    borderRadius: '12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      ...shorthands.borderColor(tokens.colorBrandStroke1),
    },
  },
  cardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  iconBlue: {
    backgroundColor: 'rgba(0, 120, 212, 0.08)',
    color: '#0078d4',
  },
  iconGreen: {
    backgroundColor: 'rgba(16, 124, 65, 0.08)',
    color: '#107c41',
  },
  iconRed: {
    backgroundColor: 'rgba(168, 0, 0, 0.08)',
    color: '#a80000',
  },
  iconOrange: {
    backgroundColor: 'rgba(216, 59, 1, 0.08)',
    color: '#d83b01',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightMedium,
  },
  cardValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.2',
  },
  welcomeSection: {
    marginTop: '32px',
    padding: '24px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground2} 0%, ${tokens.colorNeutralBackground2} 100%)`,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
  },
  welcomeTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '8px',
    color: tokens.colorBrandForeground1,
  },
  welcomeText: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.6',
  }
});

export const StatsGrid: React.FC = () => {
  const styles = useStyles();
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [todayUpdateCount, setTodayUpdateCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiFetch('/rss/feed');
        if (!response.ok) throw new Error('Failed to fetch feeds');
        const feeds = await response.json();
        const activeFeeds = feeds.filter((feed: any) => feed.is_active).length;
        setStats({
          total: feeds.length,
          active: activeFeeds,
          inactive: feeds.length - activeFeeds,
        });
      } catch (error) {
        console.error('Failed to fetch feed stats:', error);
      }
    };

    const fetchTodayUpdateCount = async () => {
      try {
        const response = await apiFetch('/rss/article/state/today-update-count');
        if (!response.ok) throw new Error('Failed to fetch today update count');
        setTodayUpdateCount(await response.json());
      } catch (error) {
        console.error('Failed to fetch today update count:', error);
      }
    };

    fetchStats();
    fetchTodayUpdateCount();
  }, []);

  return (
    <div>
      <div className={styles.statsGrid}>
        <Card className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.iconBlue}`}>
              <FeedRegular fontSize={24} />
            </div>
            <div className={styles.textContainer}>
              <span className={styles.cardLabel}>总订阅数</span>
              <span className={styles.cardValue}>{stats.total}</span>
            </div>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.iconGreen}`}>
              <CheckmarkCircleRegular fontSize={24} />
            </div>
            <div className={styles.textContainer}>
              <span className={styles.cardLabel}>活跃订阅</span>
              <span className={styles.cardValue}>{stats.active}</span>
            </div>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.iconRed}`}>
              <DismissCircleRegular fontSize={24} />
            </div>
            <div className={styles.textContainer}>
              <span className={styles.cardLabel}>失效订阅</span>
              <span className={styles.cardValue}>{stats.inactive}</span>
            </div>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.iconOrange}`}>
              <ClockRegular fontSize={24} />
            </div>
            <div className={styles.textContainer}>
              <span className={styles.cardLabel}>今日更新</span>
              <span className={styles.cardValue}>{todayUpdateCount}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.welcomeSection}>
        <h3 className={styles.welcomeTitle}>欢迎使用 Cronos 阅读器设置面板</h3>
        <p className={styles.welcomeText}>
          在这里您可以管理所有的 RSS 订阅源，配置定时任务以自动获取最新文章，
          以及设置您的 AI 语言模型配置以便智能分析、提取摘要和开启智能聊天助理。
          使用左侧导航可在不同配置页面间快速切换。
        </p>
      </div>
    </div>
  );
};
