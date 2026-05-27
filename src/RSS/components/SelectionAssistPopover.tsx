import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  makeStyles,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  BookOpen24Regular,
  Dismiss24Regular,
  Pause24Regular,
  Play24Regular,
  Target24Regular,
  TextBulletListSquare24Regular,
  Translate24Regular,
} from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { apiFetch } from '../../api/client';
import { consumeBase64JsonSse } from '../../api/stream';
import { ThinkingBlock } from '../../components/ThinkingBlock';
import { useSpeech } from './useSpeech';

type SelectionAction = 'explain' | 'summary' | 'translate';

interface SelectionAssistPopoverProps {
  text: string;
  context: string;
  articleTitle: string;
  anchorPoint: { x: number; y: number };
  onLocate: () => void;
  onClose: () => void;
}

const useStyles = makeStyles({
  popover: {
    position: 'fixed',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--colorNeutralBackground1)',
    border: '1px solid var(--colorNeutralStroke1)',
    borderRadius: '8px',
    boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid var(--colorNeutralStroke2)',
    cursor: 'move',
    flexShrink: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '8px',
    padding: '10px 12px',
    flexShrink: 0,
  },
  primaryAction: {
    minWidth: '72px',
  },
  moreButton: {
    marginLeft: 'auto',
  },
  result: {
    overflowY: 'auto',
    fontSize: '13px',
    lineHeight: '1.7',
    color: 'var(--colorNeutralForeground1)',
    padding: '0 12px 12px',
    flex: 1,
    minHeight: 0,
    userSelect: 'text',
    '& p': {
      marginTop: 0,
      marginBottom: '8px',
    },
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '16px',
    height: '16px',
    cursor: 'nwse-resize',
    background: 'linear-gradient(135deg, transparent 50%, var(--colorNeutralStroke1) 50%)',
  },
  placeholder: {
    padding: '0 12px 12px',
    color: 'var(--colorNeutralForeground4)',
    fontSize: '12px',
  },
});

function buttonTextForSpeech(status: ReturnType<typeof useSpeech>['status']) {
  if (status === 'playing') return '暂停';
  if (status === 'paused') return '继续';
  return '朗读';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function streamSelectionAssist(params: {
  action: SelectionAction;
  text: string;
  context: string;
  articleTitle: string;
  onEvent: (event: { type: 'reasoning' | 'content'; text: string }) => void;
}) {
  const response = await apiFetch('/llm/selection/stream', {
    method: 'POST',
    body: JSON.stringify({
      action: params.action,
      text: params.text,
      article_context: params.context,
      article_title: params.articleTitle,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`请求失败：${response.status}`);
  }

  await consumeBase64JsonSse(response, params.onEvent);
}

export const SelectionAssistPopover: React.FC<SelectionAssistPopoverProps> = ({
  text,
  context,
  articleTitle,
  anchorPoint,
  onLocate,
  onClose,
}) => {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const { status, speak, pause, resume } = useSpeech();
  const [activeAction, setActiveAction] = useState<SelectionAction | null>(null);
  const [result, setResult] = useState('');
  const [thinking, setThinking] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialBounds = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(420, window.innerWidth - 24);
    const height = Math.min(190, window.innerHeight - 24);
    const gap = 12;

    return {
      width,
      height,
      left: clamp(anchorPoint.x + gap, 12, viewportWidth - width - 12),
      top: clamp(anchorPoint.y + gap, 12, viewportHeight - height - 12),
    };
  }, [anchorPoint]);

  const [position, setPosition] = useState({ top: initialBounds.top, left: initialBounds.left });
  const [size, setSize] = useState({ width: initialBounds.width, height: initialBounds.height });
  const hasResultArea = loading || result || error || thinking;

  useEffect(() => {
    setPosition({ top: initialBounds.top, left: initialBounds.left });
    setSize({ width: initialBounds.width, height: initialBounds.height });
  }, [initialBounds]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const runAction = async (action: SelectionAction) => {
    setActiveAction(action);
    setResult('');
    setThinking('');
    setError(null);
    setLoading(true);
    setSize(prev => ({ ...prev, height: Math.max(prev.height, 300) }));
    try {
      await streamSelectionAssist({
        action,
        text,
        context,
        articleTitle,
        onEvent: event => {
          if (event.type === 'reasoning') {
            setThinking(prev => prev + event.text);
            return;
          }

          setResult(prev => prev + event.text);
        },
      });
    } catch (err) {
      setError((err as Error).message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = position.top;
    const startLeft = position.left;

    const handleMove = (moveEvent: MouseEvent) => {
      setPosition({
        top: Math.min(Math.max(startTop + moveEvent.clientY - startY, 8), window.innerHeight - 48),
        left: Math.min(Math.max(startLeft + moveEvent.clientX - startX, 8), window.innerWidth - 48),
      });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMove = (moveEvent: MouseEvent) => {
      setSize({
        width: Math.min(Math.max(startWidth + moveEvent.clientX - startX, 380), window.innerWidth - position.left - 8),
        height: Math.min(Math.max(startHeight + moveEvent.clientY - startY, 180), window.innerHeight - position.top - 8),
      });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleSpeakToggle = () => {
    if (status === 'playing') {
      pause();
    } else if (status === 'paused') {
      resume();
    } else {
      speak(text);
    }
  };

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{ top: position.top, left: position.left, width: size.width, height: size.height }}
    >
      <div className={styles.header} onMouseDown={handleDragStart}>
        <div className={styles.headerActions} onMouseDown={event => event.stopPropagation()}>
          <Button appearance="subtle" icon={<Target24Regular />} onClick={onLocate} />
          <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />
        </div>
      </div>

      <div className={styles.actions}>
        <Button size="small" icon={<BookOpen24Regular />} onClick={() => runAction('explain')}>
          解释
        </Button>
        <Button
          className={styles.primaryAction}
          size="small"
          icon={<TextBulletListSquare24Regular />}
          onClick={() => runAction('summary')}
        >
          总结
        </Button>
        <Button
          className={styles.primaryAction}
          size="small"
          icon={<Translate24Regular />}
          onClick={() => runAction('translate')}
        >
          翻译
        </Button>
        <Button
          className={styles.primaryAction}
          size="small"
          icon={status === 'playing' ? <Pause24Regular /> : <Play24Regular />}
          onClick={handleSpeakToggle}
        >
          {buttonTextForSpeech(status)}
        </Button>
      </div>

      {hasResultArea ? (
        <div className={styles.result}>
          {thinking && <ThinkingBlock content={thinking} label="模型思考" />}
          {loading && !result ? (
            <Spinner size="tiny" label="正在处理..." />
          ) : error ? (
            <Text style={{ color: 'var(--colorStatusDangerForeground1)' }}>{error}</Text>
          ) : (
            <>
              {activeAction && <Text size={200}>{activeAction === 'explain' ? '解释' : activeAction === 'summary' ? '总结' : '翻译'}</Text>}
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{result}</ReactMarkdown>
            </>
          )}
        </div>
      ) : (
        <Text className={styles.placeholder}>选择操作后，结果会显示在这里。</Text>
      )}
      <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />
    </div>
  );
};
