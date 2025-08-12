// ArticleSummary.tsx
import React, { useState, useEffect } from 'react';
import {
    Spinner,
    Text,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    makeStyles, // 引入 makeStyles
    shorthands, // 引入 shorthands
} from '@fluentui/react-components';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { ArticleResponse } from '../model/article';

interface ArticleSummaryProps {
    article: ArticleResponse | null; // 使用 ArticleResponse 替代 Article
}

// 1. 使用 makeStyles 定义样式
const useStyles = makeStyles({
    root: {
        ...shorthands.margin('16px', '0'),
        ...shorthands.padding('16px'),
        ...shorthands.border('1px', 'solid'),
        boxShadow: 'var(--shadow-8)',
        width: '100%',
        boxSizing: 'border-box',
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap('8px'),
        ...shorthands.padding('16px', '0'),
    },
    divider: {
        ...shorthands.margin('12px', '0'),
    },
    markdownContainer: {
        whiteSpace: 'pre-wrap',
    },
    // Markdown 组件样式
    markdownText: {
        marginBottom: '8px',
        lineHeight: '1.5',
    },
    markdownHeading: {
        marginTop: '16px',
        marginBottom: '8px',
    },
    markdownH2: {
        marginTop: '14px',
        marginBottom: '7px',
    },
    markdownH3: {
        marginTop: '12px',
        marginBottom: '6px',
    },
    markdownList: {
        listStyleType: 'disc',
        ...shorthands.padding('0', '0', '0', '20px'),
    },
    markdownListItem: {
        ...shorthands.margin('0', '0', '0', '20px'),
        marginBottom: '4px',
        lineHeight: '1.5',
    },
    markdownLink: {
        textDecorationLine: 'underline',
    },
    markdownCodeBlock: {
        ...shorthands.padding('8px'),
        ...shorthands.borderRadius('4px'),
        overflowX: 'auto',
        fontSize: '0.9em',
    },
    markdownInlineCode: {
        ...shorthands.padding('2px', '4px'),
        ...shorthands.borderRadius('3px'),
        fontSize: '0.9em',
    },
    markdownBlockquote: {
        borderLeftStyle: 'solid',
        borderLeftWidth: '4px',
        ...shorthands.padding('0', '0', '0', '12px'),
        ...shorthands.margin('0', '0', '12px', '0'),
    },
    initialText: {
    },
});

export const ArticleSummary: React.FC<ArticleSummaryProps> = ({ article }) => {
    // 2. 调用 useStyles hook 获取 styles
    const styles = useStyles();

    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async (url: string) => {
        if (!url) return;

        setIsLoading(true);
        setError(null);
        setSummary('');

        try {
            const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/llm/ai_summary/stream`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ article_id: article?.id, url: url }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `API Request Failed with status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('无法读取响应流');
            }

            const decoder = new TextDecoder('utf-8');
            let accumulatedContent = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                accumulatedContent += decoder.decode(value, { stream: true });
                setSummary(accumulatedContent);
            }
        } catch (err) {
            console.error('Failed to fetch summary:', err);
            setError((err as Error).message || '发生未知错误，无法生成摘要。');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (article?.link) {
            fetchSummary(article.link);
        }
    }, [article]);

    if (!article) {
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
            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        <MessageBarTitle>摘要失败</MessageBarTitle>
                        {error}
                    </MessageBarBody>
                </MessageBar>
            )}
            {summary && (
                <div className={styles.markdownContainer}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                            p: ({ node, ...props }) => <Text as="p" className={styles.markdownText} {...props} />,
                            h1: ({ node, ...props }) => <Text as="h1" size={700} weight="bold" className={styles.markdownHeading} {...props} />,
                            h2: ({ node, ...props }) => <Text as="h2" size={600} weight="bold" className={styles.markdownH2} {...props} />,
                            h3: ({ node, ...props }) => <Text as="h3" size={500} weight="bold" className={styles.markdownH3} {...props} />,
                            li: ({ node, ...props }) => <li className={styles.markdownListItem} {...props} />,
                            ul: ({ node, ...props }) => <ul className={styles.markdownList} {...props} />,
                            ol: ({ node, ...props }) => <ol className={styles.markdownList} {...props} />,
                            strong: ({ node, ...props }) => <Text as="strong" weight="bold" {...props} />,
                            em: ({ node, ...props }) => <Text as="em" italic {...props} />,
                            a: ({ node, ...props }) => <a className={styles.markdownLink} {...props} />,
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
            {!summary && !isLoading && !error && (
                <Text className={styles.initialText}>AI助手将为您生成文章摘要。</Text>
            )}
        </div>
    );
};