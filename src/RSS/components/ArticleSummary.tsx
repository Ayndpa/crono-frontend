// ArticleSummary.tsx
import React, { useState, useEffect } from 'react';
import {
    Button,
    Spinner,
    Text,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    makeStyles, // 引入 makeStyles
    shorthands, // 引入 shorthands
} from '@fluentui/react-components';
import { DocumentSparkle24Regular } from '@fluentui/react-icons';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ArticleResponse } from '../model/article';
import { apiFetch } from '../../api/client';
import { consumeBase64JsonSse } from '../../api/stream';
import { ThinkingBlock } from '../../components/ThinkingBlock';

interface ArticleSummaryProps {
    article: ArticleResponse | null;
    /** 浏览器模式：无 article 时直接传 url */
    url?: string;
}

// 1. 使用 makeStyles 定义样式
const useStyles = makeStyles({
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
        ...shorthands.padding('16px', '0'),
    },
    markdownContainer: {
        // 移除 whiteSpace: 'pre-wrap'，交给 ReactMarkdown 处理
    },
    // Markdown 组件样式
    markdownText: {
        marginBottom: '12px',
        lineHeight: '1.6',
        color: 'var(--colorNeutralForeground1)',
    },
    markdownHeading: {
        marginTop: '20px',
        marginBottom: '10px',
        color: 'var(--colorNeutralForeground1)',
    },
    markdownList: {
        ...shorthands.padding('0', '0', '0', '24px'),
        marginBottom: '12px',
    },
    markdownListItem: {
        marginBottom: '6px',
        lineHeight: '1.6',
        '& p': {
            marginBottom: '4px',
        }
    },
    markdownLink: {
        color: 'var(--colorBrandForegroundLink)',
        textDecorationLine: 'underline',
        '&:hover': {
            color: 'var(--colorBrandForegroundLinkHover)',
        }
    },
    markdownCodeBlock: {
        ...shorthands.padding('12px'),
        ...shorthands.borderRadius('6px'),
        backgroundColor: 'var(--colorNeutralBackground3)',
        border: '1px solid var(--colorNeutralStroke2)',
        overflowX: 'auto',
        fontSize: '13px',
        fontFamily: 'monospace',
        ...shorthands.margin('12px', '0'),
    },
    markdownInlineCode: {
        ...shorthands.padding('2px', '6px'),
        ...shorthands.borderRadius('4px'),
        backgroundColor: 'var(--colorNeutralBackground3)',
        color: 'var(--colorNeutralForeground2)',
        fontSize: '0.9em',
        fontFamily: 'monospace',
    },
    markdownBlockquote: {
        borderLeftStyle: 'solid',
        borderLeftWidth: '4px',
        borderLeftColor: 'var(--colorNeutralStroke1)',
        ...shorthands.padding('8px', '0', '8px', '16px'),
        ...shorthands.margin('12px', '0'),
        backgroundColor: 'var(--colorNeutralBackground2)',
        color: 'var(--colorNeutralForeground2)',
        fontStyle: 'italic',
    },
    initialText: {
        color: 'var(--colorNeutralForeground4)',
        fontStyle: 'italic',
    },
    startArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        ...shorthands.gap('12px'),
    },
});

export const ArticleSummary: React.FC<ArticleSummaryProps> = ({ article, url }) => {
    // 2. 调用 useStyles hook 获取 styles
    const styles = useStyles();

    const [summary, setSummary] = useState<string>('');
    const [thinking, setThinking] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCheckingCache, setIsCheckingCache] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const targetUrl = article?.link ? String(article.link) : url;

    const fetchSummary = async (targetUrl: string, articleId?: number) => {
        if (!targetUrl) return;

        setIsLoading(true);
        setError(null);
        setSummary('');
        setThinking('');

        try {
            const response = await apiFetch('/llm/ai_summary/stream', {
                method: 'POST',
                body: JSON.stringify({ url: targetUrl, article_id: articleId ?? null }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `API Request Failed with status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('无法读取响应流');
            }

            let accumulatedContent = '';
            let accumulatedThinking = '';

            await consumeBase64JsonSse(response, event => {
                if (event.type === 'reasoning') {
                    accumulatedThinking += event.text;
                    setThinking(accumulatedThinking);
                    return;
                }

                accumulatedContent += event.text;
                setSummary(accumulatedContent);
            });
        } catch (err) {
            console.error('Failed to fetch summary:', err);
            setError((err as Error).message || '发生未知错误，无法生成摘要。');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let ignore = false;

        const checkSummaryCache = async () => {
            setError(null);
            setIsLoading(false);
            setThinking('');

            if (article?.ai_summary) {
                setSummary(article.ai_summary);
                setIsCheckingCache(false);
                return;
            }

            setSummary('');

            if (!article?.id) {
                setIsCheckingCache(false);
                return;
            }

            setIsCheckingCache(true);
            try {
                const response = await apiFetch('/llm/ai_summary/cache', {
                    method: 'POST',
                    body: JSON.stringify({ article_id: article.id }),
                });

                if (!response.ok) {
                    throw new Error(`摘要缓存检查失败：${response.status}`);
                }

                const data = await response.json();
                if (!ignore && data.summary) {
                    setSummary(data.summary);
                }
            } catch (err) {
                if (!ignore) {
                    console.error('Failed to check summary cache:', err);
                }
            } finally {
                if (!ignore) {
                    setIsCheckingCache(false);
                }
            }
        };

        checkSummaryCache();

        return () => {
            ignore = true;
        };
    }, [article?.id, article?.ai_summary, url]);

    const handleStart = () => {
        if (targetUrl) {
            fetchSummary(targetUrl, article?.id);
        }
    };

    if (!targetUrl) {
        return null;
    }

    return (
        <div>
            {isLoading && summary.length === 0 && (
                <div className={styles.loadingContainer}>
                    <Spinner size="tiny" />
                    <Text>正在生成 AI 摘要...</Text>
                </div>
            )}
            {isCheckingCache && !summary && !isLoading && (
                <div className={styles.loadingContainer}>
                    <Spinner size="tiny" />
                    <Text>正在检查已有摘要...</Text>
                </div>
            )}
            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>摘要失败</MessageBarTitle>
                        {error}
                    </MessageBarBody>
                </MessageBar>
            )}
            {thinking && <ThinkingBlock content={thinking} label="AI 思考" />}
            {summary && (
                <div className={styles.markdownContainer}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                            p: ({ node, ...props }) => <Text as="p" className={styles.markdownText} {...props} />,
                            h1: ({ node, ...props }) => <Text as="h1" size={700} weight="bold" className={styles.markdownHeading} {...props} />,
                            h2: ({ node, ...props }) => <Text as="h2" size={600} weight="bold" className={styles.markdownHeading} {...props} />,
                            h3: ({ node, ...props }) => <Text as="h3" size={500} weight="bold" className={styles.markdownHeading} {...props} />,
                            li: ({ node, ...props }) => <li className={styles.markdownListItem} {...props} />,
                            ul: ({ node, ...props }) => <ul className={styles.markdownList} {...props} />,
                            ol: ({ node, ...props }) => <ol className={styles.markdownList} {...props} />,
                            strong: ({ node, ...props }) => <Text as="strong" weight="bold" {...props} />,
                            em: ({ node, ...props }) => <Text as="em" italic {...props} />,
                            a: ({ node, ...props }) => <a className={styles.markdownLink} target="_blank" rel="noopener noreferrer" {...props} />,
                            code: ({ node, inline, className, children, ...props }: { node?: any; inline?: boolean; className?: string; children?: React.ReactNode;[key: string]: any }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <pre className={styles.markdownCodeBlock}>
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                ) : (
                                    <code className={styles.markdownInlineCode} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            blockquote: ({ node, ...props }) => <blockquote className={styles.markdownBlockquote} {...props} />,
                        }}
                    >
                        {summary}
                    </ReactMarkdown>
                </div>
            )}
            {!summary && !isLoading && !isCheckingCache && (
                <div className={styles.startArea}>
                    {!error && (
                        <Text className={styles.initialText}>点击按钮后生成文章摘要。</Text>
                    )}
                    <Button
                        appearance="primary"
                        icon={<DocumentSparkle24Regular />}
                        onClick={handleStart}
                    >
                        {error ? '重新生成摘要' : '开始生成摘要'}
                    </Button>
                </div>
            )}
        </div>
    );
};
