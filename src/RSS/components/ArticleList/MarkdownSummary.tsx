import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownSummaryProps {
  content: string;
  className?: string;
}

export const MarkdownSummary: React.FC<MarkdownSummaryProps> = ({ content, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          strong: ({ node, ...props }) => <strong {...props} />,
          em: ({ node, ...props }) => <em {...props} />,
          a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
          br: () => <br />,
          ul: ({ node, ...props }) => <span {...props} />,
          ol: ({ node, ...props }) => <span {...props} />,
          li: ({ node, children, ...props }) => <span {...props}>• {children}</span>,
          code: ({ node, inline, className: codeClassName, children, ...props }: { node?: any; inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) => {
            return <code className={codeClassName} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};