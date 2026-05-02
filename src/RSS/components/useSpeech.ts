import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechStatus = 'idle' | 'playing' | 'paused';

export interface SpeechOptions {
  rate: number;
  pitch: number;
  volume: number;
  voiceURI: string;
}

export const DEFAULT_OPTIONS: SpeechOptions = {
  rate: 1,
  pitch: 1,
  volume: 1,
  voiceURI: '',
};

const STORAGE_KEY = 'crono:speech-options';
const PREVIEW_TEXT = '您好，这是一段语音试听。当前语速、音调和音量设置已经生效。';

function loadStoredOptions(): SpeechOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [options, setOptions] = useState<SpeechOptions>(loadStoredOptions);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {}
  }, [options]);

  // 加载可用语音列表
  useEffect(() => {
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setVoices(list);
        // 优先选中文神经语音
        const preferred = list.find(v =>
          v.name.includes('Xiaoxiao') || v.name.includes('Yunxi') || v.lang.startsWith('zh')
        );
        if (preferred && !options.voiceURI) {
          setOptions(prev => ({ ...prev, voiceURI: preferred.voiceURI }));
        }
      }
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [options.voiceURI]);

  const createUtterance = useCallback((text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = options.rate;
    utter.pitch = options.pitch;
    utter.volume = options.volume;
    if (options.voiceURI) {
      const voice = voices.find(v => v.voiceURI === options.voiceURI);
      if (voice) utter.voice = voice;
    }
    utter.onstart = () => setStatus('playing');
    utter.onpause = () => setStatus('paused');
    utter.onresume = () => setStatus('playing');
    utter.onend = () => setStatus('idle');
    utter.onerror = () => setStatus('idle');
    utteranceRef.current = utter;
    return utter;
  }, [options, voices]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(createUtterance(text));
  }, [createUtterance]);

  const preview = useCallback((text = PREVIEW_TEXT) => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(createUtterance(text));
  }, [createUtterance]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus('playing');
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setStatus('idle');
  }, []);

  // 组件卸载时停止
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return { status, voices, options, setOptions, speak, preview, pause, resume, stop };
}
