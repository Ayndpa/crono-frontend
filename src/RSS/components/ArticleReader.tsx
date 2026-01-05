import React, { useState, useRef } from 'react';
import {
  Button,
  Divider,
  makeStyles,
  Persona,
  shorthands,
  Text,
} from '@fluentui/react-components';
import { ArrowExit24Regular, ArrowMinimize24Regular, ClosedCaption24Regular, Sparkle24Regular } from '@fluentui/react-icons';
import { ArticleSummary } from './ArticleSummary';
import type { ArticleResponse } from '../model/article';

interface ArticleReaderProps {
  selectedArticle: ArticleResponse | null;
  onToggleStar: (id: number) => void;
}

const useStyles = makeStyles({
  root: {
    overflowY: 'auto',
    height: '100%',
    position: 'relative', // 添加相对定位作为悬浮窗容器
    display: 'flex',
    flexDirection: 'column',
  },
  persona: {
    ...shorthands.margin('0', '0', '12px', '0'),
  },
  buttonContainer: {
    ...shorthands.margin('0', '0', '12px', '0'),
  },
  image: {
    maxWidth: '100%',
    ...shorthands.margin('0', '0', '12px', '0'),
  },
  content: {
    whiteSpace: 'pre-wrap',
  },
  tagContainer: {
    ...shorthands.margin('12px', '0'),
  },
  tag: {
    ...shorthands.margin('0', '8px', '0', '0'),
  },
  placeholderContainer: {
    textAlign: 'center',
    ...shorthands.margin('100px', '0', '0', '0'),
  },
  placeholderIcon: {
    fontSize: '48px',
    color: 'var(--color-neutral-foreground-disabled)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  // 悬浮窗样式
  summaryDialog: {
    position: 'absolute',
    top: '60px', // 根据实际布局调整位置
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100, // 确保在最上层
    backgroundColor: 'var(--colorNeutralBackground1)',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid var(--colorNeutralStroke1)',
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '15px',
    height: '15px',
    cursor: 'nwse-resize',
    background: 'linear-gradient(135deg, transparent 50%, var(--colorNeutralStroke1) 50%)',
    borderBottomRightRadius: '12px',
  },
  resizeHandleLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '10px',
    height: '100%',
    cursor: 'ew-resize',
  },
  resizeHandleRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '10px',
    height: '100%',
    cursor: 'ew-resize',
  },
  resizeHandleBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '10px',
    cursor: 'ns-resize',
  },
});

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  selectedArticle,
}) => {
  const styles = useStyles();
  const [showSummary, setShowSummary] = useState(false);
  const [dragPosition, setDragPosition] = useState({ top: 60, left: 20 });
  const [dialogSize, setDialogSize] = useState({ width: 400, height: 500 });
  const dragRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = dragPosition.top;
    const startLeft = dragPosition.left;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setDragPosition({
        top: startTop + deltaY,
        left: startLeft + deltaX,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dialogSize.width;
    const startHeight = dialogSize.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setDialogSize({
        width: Math.max(300, startWidth + deltaX),
        height: Math.max(200, startHeight + deltaY),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  React.useEffect(() => {
    setShowSummary(false);
  }, [selectedArticle]);

  return (
    <div className={styles.root}>
      {selectedArticle ? (
        <>
          <Persona
            className={styles.persona}
            name={selectedArticle.author || '未知作者'}
            size="medium"
            secondaryText={new Date(selectedArticle.pub_date).toLocaleDateString()}
            avatar={{ color: 'colorful' }}
          />
          <div className={styles.buttonContainer}>
            <Button
              appearance="subtle"
              onClick={() => setShowSummary(!showSummary)}
              icon={<Sparkle24Regular />}
              style={{ marginLeft: '8px' }}
            >
              AI 总结
            </Button>
          </div>

          <Divider />

          {/* 悬浮窗实现 */}
          {showSummary && (
            <div
              className={styles.summaryDialog}
              style={{
                top: dragPosition.top,
                left: dragPosition.left,
                width: dialogSize.width,
                height: dialogSize.height,
                maxHeight: '80vh',
              }}
              ref={dragRef}
            >
              <div
                style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--colorNeutralStroke2)',
                  cursor: 'move',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                onMouseDown={handleMouseDown}
              >
                <Text weight="bold">AI 摘要</Text>
                <Button
                  appearance="subtle"
                  onClick={() => setShowSummary(false)}
                  icon={<ArrowMinimize24Regular />}
                />
              </div>
              <div style={{ padding: '16px', flexGrow: 1, overflowY: 'auto' }}>
                <ArticleSummary article={selectedArticle} />
              </div>
              {/* Resize handle */}
              <div
                className={styles.resizeHandle}
                onMouseDown={handleResizeMouseDown}
              />
            </div>
          )}

          <iframe
            src={selectedArticle.link}
            title={selectedArticle.title}
            className={styles.iframe}
            sandbox=""
          />
        </>
      ) : (
        <div className={styles.placeholderContainer}>
          <i className={`fas fa-file-alt ${styles.placeholderIcon}`} />
          <Text size={500} block>
            选择一篇文章阅读
          </Text>
          <Text>从左侧列表中选择一篇文章开始阅读。</Text>
        </div>
      )}
    </div>
  );
};