import React from 'react';

import { parseFormattedContent } from '../utils/formattingUtils';

export interface ChatMessageContentProps {
  content: string;
  className?: string;
}

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  return (
    <span className={`inline-block break-words ${className}`}>
      {parseFormattedContent(content)}
    </span>
  );
};
