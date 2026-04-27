import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles, Spinner, Text } from '@fluentui/react-components';
import { TagRegular } from '@fluentui/react-icons';
import { fetchEntities, type Entity } from '../api/entityApi';
import { EntityExplainPopover } from './EntityExplainPopover';
import type { ArticleResponse } from '../model/article';

interface EntityHighlighterProps {
  html: string;
  article: ArticleResponse;
  historyTitles: string[];
  className?: string;
}

const ENTITY_ATTR = 'data-entity-text';
const ENTITY_TYPE_ATTR = 'data-entity-type';

// 每种类型的高亮颜色
const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  tech:    { bg: 'rgba(0, 120, 212, 0.10)', border: 'rgba(0, 120, 212, 0.45)' },
  person:  { bg: 'rgba(16, 124, 16, 0.10)', border: 'rgba(16, 124, 16, 0.45)' },
  org:     { bg: 'rgba(135, 100, 184, 0.10)', border: 'rgba(135, 100, 184, 0.45)' },
  concept: { bg: 'rgba(202, 80, 16, 0.10)', border: 'rgba(202, 80, 16, 0.45)' },
};

const useStyles = makeStyles({
  root: {
    position: 'relative',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: 'var(--colorNeutralForeground3)',
  },
});

/**
 * 在 HTML 字符串中，将实体词替换为带高亮标记的 <mark> 标签。
 * 使用正则匹配，避免破坏 HTML 标签内的属性。
 */
function injectHighlights(html: string, entities: Entity[]): string {
  // 按长度降序排列，优先匹配更长的词
  const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);

  let result = html;
  for (const entity of sorted) {
    const escaped = entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 只匹配文本节点中的词（不在 HTML 标签内）
    // 策略：匹配不在 < > 之间的词
    const regex = new RegExp(
      `(?<!<[^>]*)\\b(${escaped})\\b(?![^<]*>)`,
      'g'
    );
    const color = TYPE_COLORS[entity.type] ?? TYPE_COLORS.concept;
    const mark = `<mark
      ${ENTITY_ATTR}="${entity.text.replace(/"/g, '&quot;')}"
      ${ENTITY_TYPE_ATTR}="${entity.type}"
      style="background:${color.bg};border-bottom:1.5px solid ${color.border};border-radius:2px;cursor:pointer;padding:0 1px;"
    >$1</mark>`;
    result = result.replace(regex, mark);
  }
  return result;
}

/**
 * 从 HTML 中提取实体周围的文本上下文（前后各 300 字符）。
 */
function extractContext(html: string, entityText: string): string {
  const plainText = html.replace(/<[^>]+>/g, '');
  const idx = plainText.indexOf(entityText);
  if (idx === -1) return plainText.slice(0, 600);
  const start = Math.max(0, idx - 300);
  const end = Math.min(plainText.length, idx + entityText.length + 300);
  return plainText.slice(start, end);
}

export const EntityHighlighter: React.FC<EntityHighlighterProps> = ({
  html,
  article,
  historyTitles,
  className,
}) => {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  // 弹出框状态
  const [popover, setPopover] = useState<{
    entity: Entity;
    anchorRect: DOMRect;
    context: string;
  } | null>(null);

  // 加载实体
  useEffect(() => {
    if (!enabled || !article?.link) return;
    setEntities([]);
    setError(null);
    setLoading(true);
    fetchEntities(String(article.link), article.id ?? undefined)
      .then(setEntities)
      .catch(() => setError('实体识别失败'))
      .finally(() => setLoading(false));
  }, [enabled, article?.id]);

  // 注入高亮后的 HTML
  const highlightedHtml = useMemo(() => {
    if (!enabled || entities.length === 0) return html;
    return injectHighlights(html, entities);
  }, [html, entities, enabled]);

  // 点击高亮词处理
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const mark = target.closest(`[${ENTITY_ATTR}]`) as HTMLElement | null;
    if (!mark) {
      setPopover(null);
      return;
    }
    const entityText = mark.getAttribute(ENTITY_ATTR) ?? '';
    const entityType = mark.getAttribute(ENTITY_TYPE_ATTR) as Entity['type'] ?? 'concept';
    const rect = mark.getBoundingClientRect();
    const context = extractContext(html, entityText);
    setPopover({ entity: { text: entityText, type: entityType }, anchorRect: rect, context });
  }, [html]);

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <TagRegular style={{ fontSize: '16px' }} />
        {!enabled ? (
          <span
            style={{ cursor: 'pointer', color: 'var(--colorBrandForeground1)' }}
            onClick={() => setEnabled(true)}
          >
            开启语义标注
          </span>
        ) : loading ? (
          <Spinner size="tiny" label="正在识别关键词..." />
        ) : error ? (
          <Text size={200} style={{ color: 'var(--colorStatusDangerForeground1)' }}>{error}</Text>
        ) : (
          <Text size={200}>已标注 {entities.length} 个关键词，点击查看解释</Text>
        )}
      </div>

      {/* 文章内容 */}
      <div
        ref={containerRef}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />

      {/* 解释弹出框 */}
      {popover && (
        <EntityExplainPopover
          entity={popover.entity}
          anchorRect={popover.anchorRect}
          article={article}
          articleContext={popover.context}
          historyTitles={historyTitles}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
};
