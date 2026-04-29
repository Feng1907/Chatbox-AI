'use client';

import { useState, useCallback } from 'react';
import type { Message, Source } from '@/types';

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (question: string, docId: string): Promise<void> => {
      if (!question.trim() || !docId) return;

      setError(null);
      setIsLoading(true);

      // Add user message immediately
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: question.trim(),
        timestamp: new Date(),
      };

      // Add placeholder assistant message
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

            // Handle SSE format: "data: ..."
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);

              if (data === '[DONE]') {
                break;
              }

              // Check for sources marker
              if (data.startsWith('[SOURCES]')) {
                try {
                  const sourcesJson = data.slice(9);
                  sources = JSON.parse(sourcesJson) as Source[];
                } catch {
                  console.warn('Failed to parse sources JSON');
                }
                continue;
              }

              // Check for error
              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(7));
              }

              // Regular content chunk
              accumulatedContent += data;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: accumulatedContent }
                    : msg,
                ),
              );
            } else if (trimmed.startsWith('[SOURCES]')) {
              // Handle non-SSE sources format
              try {
                const sourcesJson = trimmed.slice(9);
                sources = JSON.parse(sourcesJson) as Source[];
              } catch {
                console.warn('Failed to parse sources JSON');
              }
            } else if (trimmed !== '[DONE]' && !trimmed.startsWith('event:') && !trimmed.startsWith(':')) {
              // Plain text streaming (fallback)
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

        // Finalize the assistant message
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

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
