import React, { useEffect, useRef, useState } from 'react';
import { makeStyles, Spinner, Text, tokens } from '@fluentui/react-components';
import ReactMarkdown from 'react-markdown';
import { streamEntityExplain, type Entity } from '../api/entityApi';
import type { ArticleResponse } from '../model/article';

interface EntityExplainPopoverProps {
  entity: Entity;
  anchorRect: DOMRect;
  article: ArticleResponse;
  articleContext: string;
  historyTitles: string[];
  onClose: () => void;
}

const useStyles = makeStyles({
  popover: {
    position: 'fixed',
    zIndex: 9999,
    backgroundColor: 'var(--colorNeutralBackground1)',
    border: '1px solid var(--colorNeutralStroke1)',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
    padding: '14px 16px',
    maxWidth: '320px',
    minWidth: '220px',
    fontSize: '14px',
    lineHeight: '1.7',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  entityText: {
    fontWeight: '600',
    color: 'var(--colorBrandForeground1)',
  },
  typeBadge: {
    fontSize: '11px',
    padding: '1px 7px',
    borderRadius: '10px',
    backgroundColor: 'var(--colorNeutralBackground3)',
    color: 'var(--colorNeutralForeground2)',
  },
  content: {
    color: 'var(--colorNeutralForeground1)',
    '& p': { margin: '0' },
    '& strong': { color: 'var(--colorBrandForeground1)' },
  },
});

const TYPE_LABEL: Record<string, string> = {
  tech: '技术',
  person: '人物',
  org: '机构',
  concept: '概念',
};

export const EntityExplainPopover: React.FC<EntityExplainPopoverProps> = ({
  entity,
  anchorRect,
  article,
  articleContext,
  historyTitles,
  onClose,
}) => {
  const styles = useStyles();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // 计算弹出位置（优先在词语下方，靠近点击位置）
  const top = anchorRect.bottom + window.scrollY + 6;
  const left = Math.min(anchorRect.left + window.scrollX, window.innerWidth - 340);

  useEffect(() => {
    streamEntityExplain({
      entity: entity.text,
      entityType: entity.type,
      articleTitle: article.title,
      articleContext,
      historyTitles,
      onChunk: (chunk) => {
        setLoading(false);
        setText(prev => prev + chunk);
      },
      onDone: () => setLoading(false),
      onError: () => {
        setLoading(false);
        setText('解释加载失败，请重试。');
      },
    });
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{ top, left }}
    >
      <div className={styles.header}>
        <span className={styles.entityText}>{entity.text}</span>
        <span className={styles.typeBadge}>{TYPE_LABEL[entity.type] ?? entity.type}</span>
      </div>
      {loading ? (
        <Spinner size="tiny" label="正在生成解释..." />
      ) : (
        <div className={styles.content}>
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};
