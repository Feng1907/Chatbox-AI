'use client';

import { useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import { useChat } from '@/hooks/useChat';
import { useDocuments } from '@/hooks/useDocuments';

export default function Home() {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    documents,
    isUploading,
    uploadProgress,
    uploadDocument,
    deleteDocument,
  } = useDocuments();

  const { messages, isLoading, sendMessage, clearMessages } = useChat();

  const activeDocument = documents.find((d) => d.id === activeDocId) ?? null;

  const handleSelectDocument = useCallback(
    (id: string) => {
      if (id !== activeDocId) {
        setActiveDocId(id);
        clearMessages();
      }
      setSidebarOpen(false);
    },
    [activeDocId, clearMessages],
  );

  const handleDeleteDocument = useCallback(
    async (id: string) => {
      const success = await deleteDocument(id);
      if (success && id === activeDocId) {
        setActiveDocId(null);
        clearMessages();
      }
    },
    [activeDocId, clearMessages, deleteDocument],
  );

  const handleSendMessage = useCallback(
    (question: string) => {
      if (!activeDocId) return;
      sendMessage(question, activeDocId);
    },
    [activeDocId, sendMessage],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: always visible, mobile: drawer) ── */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          onUpload={uploadDocument}
          onSelect={handleSelectDocument}
          onDelete={handleDeleteDocument}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile header with hamburger */}
        <div className="flex-shrink-0 lg:hidden flex items-center gap-3 px-4 py-3 glass border-b border-gray-800/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 rounded-lg glass flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-sm font-bold gradient-text">RAG Chatbot</h1>
          {activeDocument && (
            <span className="text-xs text-gray-500 truncate ml-auto max-w-[40%]">
              {activeDocument.filename}
            </span>
          )}
        </div>

        {/* Chat interface fills remaining height */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            messages={messages}
            onSend={handleSendMessage}
            activeDocument={activeDocument}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
}
