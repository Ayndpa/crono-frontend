import React, { useState, useRef, useEffect } from 'react';
import {
    Text,
    Textarea,
    Button,
    Spinner,
    makeStyles,
    Avatar,
} from '@fluentui/react-components';
import { Send24Regular } from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ArticleResponse } from '../model/article';
import { apiFetch } from '../../api/client';

interface ArticleQAProps {
    article: ArticleResponse | null;
    url?: string;
}

interface QAMessage {
    role: 'user' | 'assistant';
    content: string;
}

const useStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '8px',
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingBottom: '4px',
    },
    messageRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
    },
    userRow: {
        flexDirection: 'row-reverse',
    },
    bubble: {
        maxWidth: '85%',
        padding: '8px 12px',
        borderRadius: '12px',
        fontSize: '13px',
        lineHeight: '1.6',
    },
    userBubble: {
        backgroundColor: 'var(--colorBrandBackground)',
        color: 'var(--colorNeutralForegroundInverted)',
        borderTopRightRadius: '4px',
    },
    aiBubble: {
        backgroundColor: 'var(--colorNeutralBackground3)',
        color: 'var(--colorNeutralForeground1)',
        borderTopLeftRadius: '4px',
    },
    inputRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    textarea: {
        flex: 1,
        minHeight: '60px',
        maxHeight: '120px',
        resize: 'vertical',
    },
    emptyHint: {
        color: 'var(--colorNeutralForeground4)',
        fontStyle: 'italic',
        fontSize: '13px',
        textAlign: 'center',
        paddingTop: '16px',
    },
    thinkingRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
});

export const ArticleQA: React.FC<ArticleQAProps> = ({ article, url }) => {
    const styles = useStyles();
    const [messages, setMessages] = useState<QAMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const targetUrl = article?.link ? String(article.link) : url;

    const handleSend = async () => {
        if (!input.trim() || isLoading || !targetUrl) return;

        const question = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setIsLoading(true);

        try {
            const response = await apiFetch('/llm/article_qa/stream', {
                method: 'POST',
                body: JSON.stringify({
                    url: targetUrl,
                    article_id: article?.id ?? null,
                    question,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'API 请求失败');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('无法读取响应流');

            const decoder = new TextDecoder('utf-8');
            let content = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                content += decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { role: 'assistant', content };
                    return next;
                });
            }
        } catch (err) {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: `出错了：${(err as Error).message}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!targetUrl) return null;

    return (
        <div className={styles.container}>
            <div className={styles.messages}>
                {messages.length === 0 && (
                    <Text className={styles.emptyHint}>
                        针对这篇文章提问，AI 将基于文章内容回答。
                    </Text>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : ''}`}
                    >
                        <Avatar
                            size={24}
                            name={msg.role === 'user' ? '您' : 'AI'}
                            color={msg.role === 'user' ? 'steel' : 'brand'}
                        />
                        <div
                            className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}
                        >
                            {msg.role === 'user' ? (
                                <Text>{msg.content}</Text>
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className={styles.thinkingRow}>
                        <Avatar size={24} name="AI" color="brand" />
                        <Spinner size="tiny" label="思考中..." />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputRow}>
                <Textarea
                    className={styles.textarea}
                    value={input}
                    onChange={(_, d) => setInput(d.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
                    disabled={isLoading}
                />
                <Button
                    appearance="primary"
                    icon={<Send24Regular />}
                    disabled={!input.trim() || isLoading}
                    onClick={handleSend}
                />
            </div>
        </div>
    );
};
