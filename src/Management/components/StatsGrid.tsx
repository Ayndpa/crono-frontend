import React, { useEffect, useState } from 'react';
import { Card, CardHeader, Body1, Title3, tokens, makeStyles } from '@fluentui/react-components';
import { FeedRegular, CheckmarkCircleRegular, DismissCircleRegular, ClockRegular } from '@fluentui/react-icons';
import { apiFetch } from '../../api/client';

const useStyles = makeStyles({
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXXL,
  },
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
    <div className={styles.statsGrid}>
      <Card>
        <CardHeader
          image={<FeedRegular fontSize={24} />}
          header={<Body1><strong>总订阅数</strong></Body1>}
          description={<Title3>{stats.total}</Title3>}
        />
      </Card>
      <Card>
        <CardHeader
          image={<CheckmarkCircleRegular fontSize={24} color={tokens.colorPaletteGreenForeground1} />}
          header={<Body1><strong>活跃订阅</strong></Body1>}
          description={<Title3>{stats.active}</Title3>}
        />
      </Card>
      <Card>
        <CardHeader
          image={<DismissCircleRegular fontSize={24} color={tokens.colorPaletteRedForeground1} />}
          header={<Body1><strong>失效订阅</strong></Body1>}
          description={<Title3>{stats.inactive}</Title3>}
        />
      </Card>
      <Card>
        <CardHeader
          image={<ClockRegular fontSize={24} />}
          header={<Body1><strong>今日更新</strong></Body1>}
          description={<Title3>{todayUpdateCount}</Title3>}
        />
      </Card>
    </div>
  );
};
