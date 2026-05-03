'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, Source } from '@/types';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const storageKey = (docId: string) => `rag_chat_history_${docId}`;

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  // Save to localStorage when streaming finishes
  useEffect(() => {
    if (!isLoading && currentDocId && messages.length > 0) {
      try {
        localStorage.setItem(storageKey(currentDocId), JSON.stringify(messages));
      } catch { /* quota exceeded or SSR */ }
    }
  }, [isLoading, currentDocId, messages]);

  const loadMessages = useCallback((docId: string) => {
    setCurrentDocId(docId);
    setError(null);
    try {
      const raw = localStorage.getItem(storageKey(docId));
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        setMessages(parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
        return;
      }
    } catch { /* corrupted data */ }
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (question: string, docId: string): Promise<void> => {
      if (!question.trim() || !docId) return;

      setError(null);
      setIsLoading(true);
      setCurrentDocId(docId);

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: question.trim(),
        timestamp: new Date(),
      };

      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const params = new URLSearchParams({
          question: question.trim(),
          collection: docId,
        });

        const response = await fetch(`/api/chat/stream?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';
        let sources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);

              if (data === '[DONE]') {
                break;
              }

              if (data.startsWith('[SOURCES]')) {
                try {
                  sources = JSON.parse(data.slice(9)) as Source[];
                } catch {
                  console.warn('Failed to parse sources JSON');
                }
                continue;
              }

              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(7));
              }

              accumulatedContent += data;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: accumulatedContent }
                    : msg,
                ),
              );
            } else if (trimmed.startsWith('[SOURCES]')) {
              try {
                sources = JSON.parse(trimmed.slice(9)) as Source[];
              } catch {
                console.warn('Failed to parse sources JSON');
              }
            } else if (trimmed !== '[DONE]' && !trimmed.startsWith('event:') && !trimmed.startsWith(':')) {
              accumulatedContent += trimmed;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: accumulatedContent }
                    : msg,
                ),
              );
            }
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: accumulatedContent || 'I could not generate a response. Please try again.',
                  sources: sources.length > 0 ? sources : undefined,
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } catch (err) {
        console.error('sendMessage error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const clearMessages = useCallback((docId?: string) => {
    setMessages([]);
    setError(null);
    if (docId) {
      try {
        localStorage.removeItem(storageKey(docId));
      } catch { /* ignore */ }
    }
  }, []);

  const exportChat = useCallback((filename?: string) => {
    if (messages.length === 0) return;

    const lines = messages.map((m) => {
      const role = m.role === 'user' ? '**You**' : '**Assistant**';
      const time = new Date(m.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      let text = `${role} _(${time})_\n\n${m.content}`;
      if (m.sources && m.sources.length > 0) {
        text += '\n\n> Sources: ' + m.sources.map((s) => s.source).join(', ');
      }
      return text;
    });

    const content = `# Chat Export\n\n${lines.join('\n\n---\n\n')}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ? `${filename}_chat.md` : 'chat_export.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadMessages,
    exportChat,
  };
}
