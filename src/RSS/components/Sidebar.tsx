import React from 'react';
import {
  Nav,
  NavItem,
  NavSectionHeader,
  Badge,
  tokens,
  makeStyles,
} from '@fluentui/react-components';
import { Feed20Regular, Folder20Regular } from '@fluentui/react-icons';
import type { Feed } from '../model/feed';

const useStyles = makeStyles({
  sidebar: {
    padding: '24px 12px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflowY: 'auto',
    height: '100%',
    // 渐变背景，适配 Fluent UI 的轻量与暗色主题
    background: 'linear-gradient(180deg, var(--colorNeutralBackground2) 0%, var(--colorNeutralBackground3) 100%)',
    borderRight: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  navItem: {
    borderRadius: '8px',
    position: 'relative',
    transitionProperty: 'all',
    transitionDuration: '0.2s',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    marginTop: '4px',
    marginBottom: '4px',
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
      // 鼠标悬停时微滑移动效
      transform: 'translateX(4px)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
    },
    
    '&[aria-current="page"]': {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground2,
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    },
  },
  navItemContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
  },
  navItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexGrow: 1,
  },
  badge: {
    flexShrink: 0,
    marginLeft: '8px',
  },
  navSectionHeader: {
    marginTop: '24px',
    marginBottom: '10px',
    paddingLeft: '8px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1.2px',
    color: tokens.colorNeutralForeground4,
    opacity: 0.8,
  },
});

interface SidebarProps {
  feeds: Feed[];
  selectedKey: string;
  onFeedSelect: (feedId: string) => void;
  onShowAll: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  feeds,
  selectedKey,
  onFeedSelect,
  onShowAll,
}) => {
  const styles = useStyles();

  // 计算未读数
  const totalUnread = feeds.reduce((sum, f) => sum + (f.unread_count || 0), 0);

  const getFeedUnreadCount = (feedId?: number) => {
    if (feedId === undefined) return 0;
    const feed = feeds.find((f) => f.id === feedId);
    return feed?.unread_count || 0;
  };

  return (
    <div className={styles.sidebar}>
      <Nav
        selectedValue={selectedKey}
        onNavItemSelect={(_, data) => {
          if (data.value === 'all') {
            onShowAll();
          } else {
            onFeedSelect(data.value);
          }
        }}
        style={{ width: '100%', minWidth: 0 }}
      >
        <NavItem
          key="all"
          as="a"
          href="#"
          icon={<Folder20Regular />}
          className={styles.navItem}
          value="all"
        >
          <div className={styles.navItemContent}>
            <span className={styles.navItemText}>全部</span>
            {totalUnread > 0 && (
              <Badge
                size="small"
                appearance="filled"
                color="brand"
                className={styles.badge}
              >
                {totalUnread}
              </Badge>
            )}
          </div>
        </NavItem>

        <NavSectionHeader className={styles.navSectionHeader}>
          订阅源
        </NavSectionHeader>
        {feeds.map((feed) => {
          const unreadCount = getFeedUnreadCount(feed.id);
          return (
            <NavItem
              key={feed.id}
              href="#"
              icon={<Feed20Regular />}
              value={feed.id !== undefined ? String(feed.id) : ''}
              className={styles.navItem}
            >
              <div className={styles.navItemContent}>
                <span className={styles.navItemText}>{feed.name}</span>
                {unreadCount > 0 && (
                  <Badge
                    size="small"
                    appearance="tint"
                    color="brand"
                    className={styles.badge}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </NavItem>
          );
        })}
      </Nav>
    </div>
  );
};

