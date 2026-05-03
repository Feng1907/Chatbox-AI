'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  KeyboardEvent,
} from 'react';
import { Send, Sparkles, MessageSquare, FileText, Trash2, Download } from 'lucide-react';
import clsx from 'clsx';
import type { Message, Document } from '@/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const SUGGESTIONS = [
  'What is this document about?',
  'Summarize the key points',
  'What are the main conclusions?',
];

/* ── Empty state ── */
function EmptyState({
  hasDocument,
  onSuggestionClick,
}: {
  hasDocument: boolean;
  onSuggestionClick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8 animate-fade-in">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl gradient-bg flex items-center justify-center shadow-glow-purple text-5xl">
          {hasDocument ? '💬' : '📂'}
        </div>
        {hasDocument && (
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-background">
            ✓
          </div>
        )}
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-semibold text-gray-100">
          {hasDocument ? 'Ready to chat!' : 'No document selected'}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          {hasDocument
            ? "Ask anything about your document. I'll find the most relevant information and cite my sources."
            : 'Upload a document from the sidebar and select it to start asking questions.'}
        </p>
      </div>

      {hasDocument && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="text-xs px-3 py-1.5 glass rounded-full text-gray-400 border border-gray-700 hover:border-purple-500/50 hover:text-gray-200 hover:bg-purple-500/10 transition-all duration-200 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Props ── */
interface ChatInterfaceProps {
  messages: Message[];
  onSend: (question: string) => void;
  onClear: () => void;
  onExport: () => void;
  activeDocument: Document | null;
  isLoading: boolean;
}

/* ── Main component ── */
export default function ChatInterface({
  messages,
  onSend,
  onClear,
  onExport,
  activeDocument,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 2000;
  const canSend = input.trim().length > 0 && !!activeDocument && !isLoading;

  /* Auto-scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* Auto-resize textarea */
  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 5 + 32;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [input, adjustTextarea]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, input, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      if (!activeDocument || isLoading) return;
      onSend(text);
    },
    [activeDocument, isLoading, onSend],
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex-shrink-0 glass border-b border-gray-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeDocument ? (
              <>
                <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-glow-purple">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-100 truncate max-w-xs">
                    {activeDocument.filename}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {activeDocument.chunk_count} chunks indexed
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-400">
                    Select a document to start
                  </h2>
                  <p className="text-xs text-gray-600">
                    Upload and select a document from the sidebar
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {hasMessages && (
              <>
                <button
                  onClick={onExport}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 glass px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200"
                  title="Export chat as Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={onClear}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 glass px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-red-500/50 transition-all duration-200"
                  title="Clear chat history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </>
            )}
            {!hasMessages && (
              <span className="text-xs text-gray-600 glass px-2.5 py-1 rounded-full border border-gray-700">
                0 messages
              </span>
            )}
            {hasMessages && (
              <span className="text-xs text-gray-500 glass px-2.5 py-1 rounded-full border border-gray-700">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Message list ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 px-6 py-4"
      >
        {!hasMessages ? (
          <EmptyState
            hasDocument={!!activeDocument}
            onSuggestionClick={handleSuggestionClick}
          />
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="animate-fade-in">
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 glass border-t border-gray-800/50 px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div
            className={clsx(
              'relative flex items-end gap-3 glass-card rounded-2xl p-3 transition-all duration-200',
              activeDocument
                ? 'border-gray-700 focus-within:border-purple-500/50 focus-within:shadow-glow-purple'
                : 'border-gray-800 opacity-60 cursor-not-allowed',
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                activeDocument
                  ? `Ask anything about "${activeDocument.filename}"…`
                  : 'Select a document to start chatting…'
              }
              disabled={!activeDocument || isLoading}
              rows={1}
              className={clsx(
                'flex-1 bg-transparent text-gray-100 placeholder-gray-600 text-sm leading-6',
                'resize-none outline-none min-h-[36px] max-h-[156px]',
                'disabled:cursor-not-allowed',
              )}
              style={{ height: '36px' }}
            />

            <button
              onClick={handleSend}
              disabled={!canSend}
              className={clsx(
                'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
                'transition-all duration-200 active:scale-95',
                canSend
                  ? 'gradient-bg text-white shadow-glow-purple hover:shadow-glow-blue hover:scale-105'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed',
              )}
              title="Send message (Enter)"
            >
              {isLoading ? (
                <div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span>Powered by GPT-4o mini</span>
              <span className="text-gray-700">•</span>
              <span>Enter to send, Shift+Enter for newline</span>
            </div>

            <span
              className={clsx(
                'text-xs tabular-nums',
                input.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-gray-700',
              )}
            >
              {input.length}/{MAX_CHARS}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
