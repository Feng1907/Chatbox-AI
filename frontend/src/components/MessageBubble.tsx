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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, Source } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

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

/* ── Code block with copy button ── */
function CodeBlock({ language, value, theme }: { language: string; value: string; theme: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-gray-700">
      {/* Language label + copy button */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors opacity-0 group-hover/code:opacity-100"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={theme === 'light' ? oneLight : oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem', background: 'transparent' }}
        showLineNumbers={value.split('\n').length > 5}
        wrapLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

/* ── Markdown renderer ── */
function MarkdownContent({ content, theme }: { content: string; theme: 'dark' | 'light' }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = !props.ref && String(children).includes('\n');
          if (isBlock || match) {
            return (
              <CodeBlock
                language={match?.[1] ?? ''}
                value={String(children).replace(/\n$/, '')}
                theme={theme}
              />
            );
          }
          return (
            <code
              className="font-mono text-sm bg-purple-500/15 border border-purple-500/25 rounded px-1.5 py-0.5 text-purple-300"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        h1({ children }) {
          return <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-purple-500/60 pl-3 my-2 text-gray-400 italic">
              {children}
            </blockquote>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-gray-100">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-gray-300">{children}</em>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="px-3 py-2 text-left font-semibold bg-gray-800/60 border border-gray-700">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-3 py-2 border border-gray-700">{children}</td>
          );
        },
        hr() {
          return <hr className="border-gray-700 my-3" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
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
  const { theme } = useTheme();

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
            {isUser ? (
              <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <MarkdownContent content={message.content} theme={theme} />
            )}
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

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white mb-1 shadow">
          U
        </div>
      )}
    </div>
  );
}
