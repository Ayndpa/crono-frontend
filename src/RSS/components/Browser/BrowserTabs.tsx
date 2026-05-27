import React, { useState } from 'react';
import {
  makeStyles,
  shorthands,
  Button,
  Input,
  tokens,
} from '@fluentui/react-components';
import { Globe24Regular, ArrowRight24Regular, BookOpen24Regular } from '@fluentui/react-icons';

interface BrowserTabsProps {
  onOpenUrl: (url: string) => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('24px'),
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '620px',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    ...shorthands.borderRadius('16px'),
    ...shorthands.padding('40px', '48px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
    },
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--colorBrandBackground2)',
    color: 'var(--colorBrandForeground2)',
    marginBottom: '24px',
    ...shorthands.borderRadius('50%'),
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, var(--colorBrandForeground1) 0%, #a29bfe 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '32px',
    maxWidth: '480px',
  },
  inputWrapper: {
    display: 'flex',
    width: '100%',
    gap: '8px',
    marginBottom: '24px',
  },
  input: {
    flexGrow: 1,
    height: '44px',
    fontSize: '15px',
  },
  button: {
    height: '44px',
    padding: '0 ' + '24px',
    fontSize: '15px',
    fontWeight: '600',
  },
  examplesContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: '20px',
  },
  examplesTitle: {
    color: tokens.colorNeutralForeground4,
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  exampleList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  exampleTag: {
    fontSize: '12px',
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    transition: 'background-color 0.2s ease, color 0.2s ease',
    ...shorthands.padding('6px', '12px'),
    ...shorthands.borderRadius('20px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke3),
    '&:hover': {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground2,
      ...shorthands.borderColor(tokens.colorBrandStroke2),
    },
  },
});

export const BrowserTabs: React.FC<BrowserTabsProps> = ({ onOpenUrl }) => {
  const styles = useStyles();
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onOpenUrl(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleExampleClick = (url: string) => {
    setUrlInput(url);
    onOpenUrl(url);
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <BookOpen24Regular style={{ fontSize: '32px' }} />
        </div>
        <h1 className={styles.title}>网页即时阅读</h1>
        <p className={styles.description}>
          输入任何网页文章链接，系统将自动解析、净化内容（过滤广告与杂噪），并在可定制的阅读器中打开，带给您极简沉浸的阅读享受。
        </p>

        <div className={styles.inputWrapper}>
          <Input
            className={styles.input}
            placeholder="输入网页 URL 链接 (例如: www.ruanyifeng.com/blog/2024/01/weekly-issue-286.html)..."
            value={urlInput}
            onChange={(_, d) => setUrlInput(d.value)}
            onKeyDown={handleKeyDown}
            contentBefore={<Globe24Regular />}
          />
          <Button
            className={styles.button}
            appearance="primary"
            icon={<ArrowRight24Regular />}
            onClick={handleSubmit}
            disabled={!urlInput.trim()}
          >
            开始阅读
          </Button>
        </div>

        <div className={styles.examplesContainer}>
          <span className={styles.examplesTitle}>推荐试读示例：</span>
          <div className={styles.exampleList}>
            <div
              className={styles.exampleTag}
              onClick={() => handleExampleClick('https://www.ruanyifeng.com/blog/2024/01/weekly-issue-286.html')}
            >
              阮一峰的网络日志
            </div>
            <div
              className={styles.exampleTag}
              onClick={() => handleExampleClick('https://sspai.com/post/88636')}
            >
              少数派科普文章
            </div>
            <div
              className={styles.exampleTag}
              onClick={() => handleExampleClick('https://36kr.com/p/2693895521950468')}
            >
              36氪新闻资讯
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};