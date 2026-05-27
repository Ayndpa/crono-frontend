import React, { useState, useCallback } from 'react';
import {
  makeStyles,
  Button,
  Input,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Dismiss16Regular,
  ArrowRight20Regular,
  Globe24Regular,
  Sparkle24Regular,
  Warning24Regular,
} from '@fluentui/react-icons';
import { apiFetch } from '../../../api/client';
import DOMPurify from 'dompurify';
import { AiAssistPanel } from '../AiAssistPanel';

// ─── 类型 ────────────────────────────────────────────────────────────────────

interface BrowserTab {
  id: string;
  url: string;           // 当前已加载的 URL
  inputUrl: string;      // 地址栏输入值
  title: string;         // 文章标题
  html: string | null;
  loading: boolean;
  error: string | null;  // 'captcha' | 其他错误信息 | null
}

// ─── 样式 ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    overflowX: 'auto',
    flexShrink: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    maxWidth: '180px',
    minWidth: '100px',
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: '0',
    userSelect: 'none',
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  tabActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderBottom: '0',
    color: tokens.colorNeutralForeground1,
  },
  tabLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexGrow: 1,
    fontSize: '12px',
  },
  tabLabelActive: {
    fontWeight: 600,
  },
  tabClose: {
    flexShrink: 0,
    minWidth: 'unset',
    height: '16px',
    width: '16px',
    padding: '0',
  },
  addTabBtn: {
    flexShrink: 0,
    marginLeft: '4px',
  },
  addressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexShrink: 0,
  },
  addressInput: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  scrollContent: {
    height: '100%',
    overflowY: 'auto',
    padding: '16px 24px',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
  articleHtml: {
    lineHeight: '1.75',
    fontSize: '15px',
    overflowWrap: 'break-word',
    '& img': { maxWidth: '100%', height: 'auto' },
    '& a': { color: tokens.colorBrandForeground1 },
    '& pre': { overflowX: 'auto' },
  },
});

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function newTab(url = '', html: string | null = null): BrowserTab {
  return {
    id: crypto.randomUUID(),
    url,
    inputUrl: url,
    title: '',
    html,
    loading: false,
    error: null,
  };
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export const BrowserTabs: React.FC = () => {
  const styles = useStyles();

  const [tabs, setTabs] = useState<BrowserTab[]>([newTab()]);
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const activeTab = tabs.find(t => t.id === activeId) ?? tabs[0];

  // 更新单个 tab 的部分字段
  const updateTab = useCallback((id: string, patch: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  // 切换标签页
  const switchTab = (id: string) => {
    setActiveId(id);
    setShowAiPanel(false);
  };

  // 新建标签页
  const addTab = () => {
    const tab = newTab();
    setTabs(prev => [...prev, tab]);
    setActiveId(tab.id);
    setShowAiPanel(false);
  };

  // 关闭标签页
  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) {
        const fresh = newTab();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        setActiveId(next[next.length - 1].id);
        setShowAiPanel(false);
      }
      return next;
    });
  };

  // 导航到 URL
  const navigate = async (tabId: string, rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;

    updateTab(tabId, { url, inputUrl: url, loading: true, error: null, html: null });

    try {
      const res = await apiFetch('/rss/article/content', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      const data: { html: string; title: string; captcha: boolean; from_cache: boolean } = await res.json();

      if (data.captcha || !data.html) {
        updateTab(tabId, { loading: false, error: 'captcha' });
      } else {
        updateTab(tabId, {
          loading: false,
          html: DOMPurify.sanitize(data.html),
          title: data.title || url,
        });
      }
    } catch {
      updateTab(tabId, { loading: false, error: '加载失败，请检查网络或 URL 是否正确。' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigate(activeTab.id, activeTab.inputUrl);
  };

  return (
    <div className={styles.root}>
      {/* 标签栏 */}
      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeId ? styles.tabActive : ''}`}
            onClick={() => switchTab(tab.id)}
            onMouseDown={e => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id, e as unknown as React.MouseEvent);
              }
            }}
            style={tab.id === activeId ? { boxShadow: `inset 0 -2px 0 ${tokens.colorBrandStroke1}` } : undefined}
          >
            <Globe24Regular style={{ fontSize: '14px', flexShrink: 0 }} />
            <span className={`${styles.tabLabel} ${tab.id === activeId ? styles.tabLabelActive : ''}`}>
              {tab.title || (tab.url ? new URL(tab.url).hostname : '新标签页')}
            </span>
            <Button
              className={styles.tabClose}
              appearance="subtle"
              icon={<Dismiss16Regular />}
              onClick={e => closeTab(tab.id, e)}
            />
          </div>
        ))}
        <Button
          className={styles.addTabBtn}
          appearance="subtle"
          icon={<Add24Regular />}
          onClick={addTab}
        />
      </div>

      {/* 地址栏 */}
      <div className={styles.addressBar}>
        <Input
          className={styles.addressInput}
          value={activeTab.inputUrl}
          placeholder="输入网址，按 Enter 访问..."
          onChange={(_, d) => updateTab(activeTab.id, { inputUrl: d.value })}
          onKeyDown={handleKeyDown}
          contentBefore={<Globe24Regular />}
        />
        <Button
          appearance="primary"
          icon={<ArrowRight20Regular />}
          onClick={() => navigate(activeTab.id, activeTab.inputUrl)}
          disabled={activeTab.loading}
        >
          前往
        </Button>
        {activeTab.html && (
          <Button
            appearance="subtle"
            icon={<Sparkle24Regular />}
            onClick={() => setShowAiPanel(v => !v)}
          >
            AI 助手
          </Button>
        )}
      </div>

      {/* 内容区 */}
      <div className={styles.content}>
        {showAiPanel && activeTab.html && (
          <AiAssistPanel
            article={null}
            url={activeTab.url}
            onClose={() => setShowAiPanel(false)}
          />
        )}

        <div className={styles.scrollContent}>
          {activeTab.loading && (
            <div className={styles.centerBox}>
              <Spinner size="large" label="正在抓取页面..." />
            </div>
          )}

          {!activeTab.loading && activeTab.error === 'captcha' && (
            <div className={styles.centerBox}>
              <Warning24Regular style={{ fontSize: '48px' }} />
              <Text size={500} weight="semibold">该页面触发了验证码</Text>
              <Text>此网站启用了反爬虫保护，无法直接抓取内容。</Text>
              <Button
                appearance="primary"
                onClick={() => window.open(activeTab.url, '_blank')}
              >
                在浏览器中打开
              </Button>
            </div>
          )}

          {!activeTab.loading && activeTab.error && activeTab.error !== 'captcha' && (
            <div className={styles.centerBox}>
              <Warning24Regular style={{ fontSize: '48px' }} />
              <Text size={500} weight="semibold">加载失败</Text>
              <Text>{activeTab.error}</Text>
            </div>
          )}

          {!activeTab.loading && !activeTab.error && activeTab.html && (
            <div
              className={styles.articleHtml}
              dangerouslySetInnerHTML={{ __html: activeTab.html }}
            />
          )}

          {!activeTab.loading && !activeTab.error && !activeTab.html && (
            <div className={styles.centerBox}>
              <Globe24Regular style={{ fontSize: '48px' }} />
              <Text size={500}>在地址栏输入网址开始浏览</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};