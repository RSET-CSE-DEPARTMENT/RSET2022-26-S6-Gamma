/**
 * Message Formatter Utility
 * 
 * Formats AI responses with markdown-like syntax and keyword highlighting
 */

import React from 'react';

// Financial keywords to highlight with specific colors
const KEYWORDS = {
  risk: ['risk', 'warning', 'caution', 'danger', 'volatile', 'volatility', 'loss'],
  positive: ['return', 'returns', 'profit', 'gain', 'growth', 'dividend', 'appreciation'],
  cost: ['tax', 'fee', 'cost', 'expense', 'charge'],
  metrics: ['cagr', 'roi', 'apr', 'apy', 'p/e', 'eps', 'nav'],
} as const;

/**
 * Format a message with markdown-like syntax and keyword highlighting
 */
export const formatMessage = (content: string): React.ReactNode => {
  const lines = content.split('\n');

  return lines.map((line, lineIdx) => {
    // Handle bullet points
    if (line.trim().match(/^[•\-\*]\s/)) {
      return (
        <div key={lineIdx} className="ml-4 mb-1 relative before:content-['•'] before:absolute before:-left-4 before:text-teal-400 before:font-bold">
          {formatLine(line.replace(/^[•\-\*]\s/, ''))}
        </div>
      );
    }

    // Handle numbered lists
    if (line.trim().match(/^\d+\.\s/)) {
      return (
        <div key={lineIdx} className="mb-1">
          {formatLine(line)}
        </div>
      );
    }

    // Handle bold text (**text**)
    if (line.includes('**')) {
      return (
        <div key={lineIdx} className="mb-1">
          {formatBoldText(line)}
        </div>
      );
    }

    // Regular line
    return (
      <div key={lineIdx} className="mb-1">
        {formatLine(line)}
      </div>
    );
  });
};

/**
 * Format a line with keyword highlighting
 */
const formatLine = (text: string): React.ReactNode => {
  if (!text.trim()) return <br />;

  // Split text into words while preserving spaces and punctuation
  const words = text.split(/(\s+|[,.:;!?()])/);

  return words.map((word, idx) => {
    const lowerWord = word.toLowerCase();

    // Check if word matches any keyword category
    if (KEYWORDS.risk.some(keyword => lowerWord.includes(keyword))) {
      return <span key={idx} className="text-red-600 font-semibold">{word}</span>;
    }

    if (KEYWORDS.positive.some(keyword => lowerWord.includes(keyword))) {
      return <span key={idx} className="text-emerald-600 font-semibold">{word}</span>;
    }

    if (KEYWORDS.cost.some(keyword => lowerWord.includes(keyword))) {
      return <span key={idx} className="text-amber-500 font-semibold">{word}</span>;
    }

    if (KEYWORDS.metrics.some(keyword => lowerWord.includes(keyword))) {
      return <span key={idx} className="text-blue-600 font-semibold uppercase text-[13px]">{word}</span>;
    }

    // Highlight percentages
    if (word.match(/[+-]?\d+\.?\d*%/)) {
      const isPositive = word.startsWith('+') || (!word.startsWith('-') && parseFloat(word) > 0);
      return (
        <span key={idx} className={isPositive ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
          {word}
        </span>
      );
    }

    return <span key={idx}>{word}</span>;
  });
};

/**
 * Format text with bold markers (**text**)
 */
const formatBoldText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={idx}>{formatLine(boldText)}</strong>;
    }
    return <span key={idx}>{formatLine(part)}</span>;
  });
};

/**
 * Simple text formatter for percentage highlighting (legacy)
 */
export const formatPercentages = (content: string): React.ReactNode => {
  return content.split('\n').map((line, idx) => {
    if (line.includes('%')) {
      const parts = line.split(/([+-]?\d+\.?\d+%)/);
      return (
        <span key={idx}>
          {parts.map((part, i) => {
            if (part.match(/\+\d+\.?\d+%/)) {
              return <span key={i} className="text-emerald-600 font-semibold">{part}</span>;
            } else if (part.match(/-\d+\.?\d+%/)) {
              return <span key={i} className="text-red-600 font-semibold">{part}</span>;
            }
            return <span key={i}>{part}</span>;
          })}
          {idx < content.split('\n').length - 1 && <br />}
        </span>
      );
    }
    return (
      <React.Fragment key={idx}>
        {line}
        {idx < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    );
  });
};
