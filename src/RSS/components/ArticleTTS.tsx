import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Label,
  Select,
  Slider,
  Spinner,
  Text,
  Textarea,
  makeStyles,
} from '@fluentui/react-components';
import {
  Play24Regular,
  Pause24Regular,
  Stop24Regular,
  ArrowClockwise24Regular,
  Speaker224Regular,
} from '@fluentui/react-icons';
import { useSpeech } from './useSpeech';
import { apiFetch } from '../../api/client';
import { consumeBase64JsonSse } from '../../api/stream';
import { ThinkingBlock } from '../../components/ThinkingBlock';
import type { ArticleResponse } from '../model/article';

interface ArticleTTSProps {
  article: ArticleResponse | null;
  /** 浏览器模式：无 article 时直接传 url */
  url?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  controls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  styleInput: {
    minHeight: '72px',
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  voiceSelect: {
    flex: 1,
    minWidth: '220px',
  },
  voiceRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusText: {
    color: 'var(--colorNeutralForeground3)',
    fontStyle: 'italic',
  },
  scriptBox: {
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'var(--colorNeutralBackground2)',
    border: '1px solid var(--colorNeutralStroke2)',
    fontSize: '14px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflowY: 'auto',
    color: 'var(--colorNeutralForeground1)',
  },
});

export const ArticleTTS: React.FC<ArticleTTSProps> = ({ article, url }) => {
  const styles = useStyles();
  const { status, voices, options, setOptions, speak, preview, pause, resume, stop } = useSpeech();

  const [script, setScript] = useState('');
  const [thinking, setThinking] = useState('');
  const [style, setStyle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 统一取目标 url
  const targetUrl = article?.link ? String(article.link) : (url || '');

  // 切换文章/url 时重置
  useEffect(() => {
    stop();
    setScript('');
    setGenError(null);
    setGenerating(false);
    abortRef.current?.abort();
  }, [article?.id, url]);

  const generateScript = async () => {
    if (!targetUrl) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setGenerating(true);
    setGenError(null);
    setScript('');
    setThinking('');
    stop();

    try {
      const res = await apiFetch('/llm/podcast/stream', {
        method: 'POST',
        body: JSON.stringify({
          url: targetUrl,
          article_id: article?.id ?? null,
          style: style.trim() || null,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);

      if (!res.body) throw new Error('无法读取响应流');

      let accumulated = '';
      let accumulatedThinking = '';
      await consumeBase64JsonSse(res, event => {
        if (event.type === 'reasoning') {
          accumulatedThinking += event.text;
          setThinking(accumulatedThinking);
          return;
        }

        accumulated += event.text;
        setScript(accumulated);
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') setGenError(e.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!script) return;
    if (status === 'paused') resume();
    else speak(script);
  };

  const zhVoices = voices.filter(v => v.lang.startsWith('zh'));
  const otherVoices = voices.filter(v => !v.lang.startsWith('zh'));

  const statusLabel: Record<typeof status, string> = {
    idle: '',
    playing: '朗读中...',
    paused: '已暂停',
  };

  return (
    <div className={styles.root}>
      <div className={styles.sliderRow}>
        <Label>播客稿风格</Label>
        <Textarea
          className={styles.styleInput}
          value={style}
          onChange={(_, d) => setStyle(d.value)}
          placeholder="例如：像科技播客主持人，语气轻松一点，多用类比；或保持严肃新闻播报风格。"
          disabled={generating}
        />
      </div>

      {/* 生成播客稿 */}
      <div className={styles.controls}>
        <Button
          appearance="primary"
          icon={generating ? <Spinner size="tiny" /> : <ArrowClockwise24Regular />}
          onClick={generateScript}
          disabled={generating || !targetUrl}
        >
          {script ? '重新生成' : '生成播客稿'}
        </Button>
        {genError && <Text style={{ color: 'var(--colorPaletteRedForeground1)' }}>{genError}</Text>}
      </div>

      {/* 播客稿预览 */}
      {(script || generating) && (
        <div className={styles.scriptBox}>
          {script || <Spinner size="tiny" label="正在生成..." />}
        </div>
      )}

      {thinking && <ThinkingBlock content={thinking} label="AI 思考" />}

      {/* 语音选择 */}
      <div className={styles.sliderRow}>
        <Label>语音</Label>
        <div className={styles.voiceRow}>
          <Select
            className={styles.voiceSelect}
            value={options.voiceURI}
            onChange={(_, d) => setOptions(prev => ({ ...prev, voiceURI: d.value }))}
          >
            {zhVoices.length > 0 && (
              <optgroup label="中文语音">
                {zhVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </optgroup>
            )}
            {otherVoices.length > 0 && (
              <optgroup label="其他语音">
                {otherVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </optgroup>
            )}
          </Select>
          <Button
            appearance="secondary"
            icon={<Speaker224Regular />}
            onClick={() => preview()}
            disabled={voices.length === 0}
          >
            试听
          </Button>
        </div>
      </div>

      {/* 播放控制 */}
      <div className={styles.controls}>
        <Button
          appearance="subtle"
          icon={status === 'playing' ? <Pause24Regular /> : <Play24Regular />}
          onClick={status === 'playing' ? pause : handlePlay}
          disabled={!script || generating}
        >
          {status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '朗读'}
        </Button>
        <Button
          appearance="subtle"
          icon={<Stop24Regular />}
          onClick={stop}
          disabled={status === 'idle'}
        >
          停止
        </Button>
        {statusLabel[status] && (
          <Text className={styles.statusText}>{statusLabel[status]}</Text>
        )}
      </div>

      {/* 语速 */}
      <div className={styles.sliderRow}>
        <div className={styles.sliderLabel}>
          <Label>语速</Label>
          <Text size={200}>{options.rate.toFixed(1)}x</Text>
        </div>
        <Slider min={0.5} max={2} step={0.1} value={options.rate}
          onChange={(_, d) => setOptions(prev => ({ ...prev, rate: d.value }))} />
      </div>

      {/* 音调 */}
      <div className={styles.sliderRow}>
        <div className={styles.sliderLabel}>
          <Label>音调</Label>
          <Text size={200}>{options.pitch.toFixed(1)}</Text>
        </div>
        <Slider min={0} max={2} step={0.1} value={options.pitch}
          onChange={(_, d) => setOptions(prev => ({ ...prev, pitch: d.value }))} />
      </div>

      {/* 音量 */}
      <div className={styles.sliderRow}>
        <div className={styles.sliderLabel}>
          <Label>音量</Label>
          <Text size={200}>{Math.round(options.volume * 100)}%</Text>
        </div>
        <Slider min={0} max={1} step={0.05} value={options.volume}
          onChange={(_, d) => setOptions(prev => ({ ...prev, volume: d.value }))} />
      </div>
    </div>
  );
};
