import React from 'react';
import { Text, tokens } from '@fluentui/react-components';
import { ChevronDown24Regular } from '@fluentui/react-icons';

interface ThinkingBlockProps {
  content: string;
  label?: string;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, label = '模型思考' }) => {
  if (!content.trim()) return null;

  return (
    <details
      style={{
        marginBottom: '12px',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: '12px',
        backgroundColor: tokens.colorNeutralBackground2,
        overflow: 'hidden',
      }}
    >
      <summary
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          listStyle: 'none',
          cursor: 'pointer',
          padding: '10px 12px',
          color: tokens.colorNeutralForeground1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <ChevronDown24Regular />
          <Text weight="semibold" size={200} truncate>
            {label}
          </Text>
        </span>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }}>
          点击展开/收起
        </Text>
      </summary>
      <div
        style={{
          borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
          padding: '10px 12px',
          backgroundColor: tokens.colorNeutralBackground1,
          color: tokens.colorNeutralForeground2,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
        }}
      >
        <Text as="p" size={200}>
          {content}
        </Text>
      </div>
    </details>
  );
};