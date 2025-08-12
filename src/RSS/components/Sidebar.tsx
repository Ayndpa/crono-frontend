import React from 'react';
import {
  Badge,
  Nav,
  NavItem,
  NavSectionHeader,
  NavDivider,
} from '@fluentui/react-components';
import { Feed20Regular, Folder20Regular } from '@fluentui/react-icons';
import { makeStyles } from '@fluentui/react-components';
import type { Feed } from '../model/feed';

const useStyles = makeStyles({
  sidebar: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
  },
  navDivider: {
    marginTop: '16px',
  },
});

interface SidebarProps {
  feeds: Feed[];
  onFeedSelect: (feedId: string) => void;
  onShowAll: () => void; // 新增
}

export const Sidebar: React.FC<SidebarProps> = ({ feeds, onFeedSelect, onShowAll }) => {
  const styles = useStyles();

  return (
    <div className={styles.sidebar}>
      <Nav defaultSelectedValue="all">
        <NavItem
          key="all"
          as="a"
          href="#"
          icon={<Folder20Regular />}
          className={styles.navItem}
          value="all"
          onClick={onShowAll}
        >
          全部
        </NavItem>

        <NavSectionHeader>
          订阅源
        </NavSectionHeader>
        {feeds.map((feed) => (
          <NavItem
            key={feed.id}
            href="#"
            icon={<Feed20Regular />}
            value={feed.id !== undefined ? String(feed.id) : ''}
            className={styles.navItem}
            onClick={() => onFeedSelect(String(feed.id))}
          >
            {feed.name}
          </NavItem>
        ))}
      </Nav>
    </div>
  );
};