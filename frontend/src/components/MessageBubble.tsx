'use client';

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import type { Message, Source } from '@/types';

/* ── Helpers ── */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (ext === 'txt') return '📝';
  if (ext === 'md')  return '📋';
  return '📎';
}

/* ── Inline "markdown" renderer ── */
function renderContent(text: string) {
  const lines = text.split('\n');

  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // Inline code: `code`
      const codeParts = part.split(/(`[^`]+`)/g);
      if (codeParts.length > 1) {
        return codeParts.map((cp, k) => {
          if (cp.startsWith('`') && cp.endsWith('`')) {
            return (
              <code
                key={k}
                className="font-mono text-sm bg-purple-500/15 border border-purple-500/25 rounded px-1.5 py-0.5 text-purple-300"
              >
                {cp.slice(1, -1)}
              </code>
            );
          }
          return cp;
        });
      }
      return part;
    });

    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

/* ── Source citation card ── */
function SourceCard({ source }: { source: Source }) {
  return (
    <div className="glass-card rounded-lg p-3 flex items-start gap-2.5 hover:border-purple-500/30 transition-colors">
      <span className="text-base flex-shrink-0 mt-0.5">{getFileIcon(source.source)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-purple-400 truncate">{source.source}</span>
          {source.page != null && (
            <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5">
              p.{source.page}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
          {source.content.slice(0, 160)}
          {source.content.length > 160 ? '…' : ''}
        </p>
      </div>
    </div>
  );
}

/* ── Sources collapsible section ── */
function SourcesSection({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-gray-700/50 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors group"
      >
        <FileText className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-medium">{sources.length} source{sources.length > 1 ? 's' : ''}</span>
        {open ? (
          <ChevronUp className="w-3 h-3 group-hover:text-purple-400 transition-colors" />
        ) : (
          <ChevronDown className="w-3 h-3 group-hover:text-purple-400 transition-colors" />
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((src, idx) => (
            <SourceCard key={idx} source={src} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main MessageBubble component ── */
interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = message.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  const isUser = message.role === 'user';

  return (
    <div
      className={clsx(
        'flex items-end gap-3 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm shadow-glow-purple mb-1">
          🤖
        </div>
      )}

      {/* Bubble + meta */}
      <div className={clsx('max-w-[75%] min-w-0 group', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
        {/* Bubble */}
        <div
          className={clsx(
            'relative px-4 py-3 text-sm leading-relaxed break-words',
            isUser
              ? 'gradient-bg text-white rounded-2xl rounded-br-sm shadow-glow-purple'
              : 'glass-card text-gray-100 rounded-2xl rounded-tl-sm',
          )}
        >
          {/* Content */}
          <div className="message-content">
            {renderContent(message.content)}
            {message.isStreaming && (
              <span className="cursor-blink" aria-hidden="true" />
            )}
          </div>

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <SourcesSection sources={message.sources} />
          )}

          {/* Copy button (assistant only, appears on hover) */}
          {!isUser && !message.isStreaming && message.content && (
            <button
              onClick={copyToClipboard}
              className={clsx(
                'absolute -top-2 -right-2 w-7 h-7 rounded-full glass flex items-center justify-center',
                'opacity-0 group-hover:opacity-100 transition-all duration-200',
                'hover:scale-110 active:scale-95',
                copied ? 'text-green-400' : 'text-gray-400 hover:text-gray-200',
              )}
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-600 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* User avatar placeholder to maintain alignment */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white mb-1 shadow">
          U
        </div>
      )}
    </div>
  );
}
