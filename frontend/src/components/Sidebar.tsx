'use client';

import {
  useRef,
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
} from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  FolderOpen,
  Hash,
} from 'lucide-react';
import clsx from 'clsx';
import type { Document } from '@/types';

/* ── Helpers ── */
const ACCEPTED_TYPES = ['.pdf', '.txt', '.md'];
const ACCEPTED_MIME = ['application/pdf', 'text/plain', 'text/markdown'];

function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getFileIcon(filename: string) {
  const ext = getFileExt(filename);
  if (ext === 'pdf') return <span className="text-red-400 text-base">📄</span>;
  if (ext === 'txt') return <span className="text-blue-400 text-base">📝</span>;
  if (ext === 'md')  return <span className="text-purple-400 text-base">📋</span>;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/* ── Toast notification ── */
interface ToastProps {
  type: 'success' | 'error';
  message: string;
}

function Toast({ type, message }: ToastProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium animate-slide-up',
        type === 'success'
          ? 'bg-green-900/50 border border-green-700/50 text-green-300'
          : 'bg-red-900/50 border border-red-700/50 text-red-300',
      )}
    >
      {type === 'success' ? (
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      <span className="truncate">{message}</span>
    </div>
  );
}

/* ── Upload zone ── */
interface UploadZoneProps {
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
  uploadProgress: number;
}

function UploadZone({ onUpload, isUploading, uploadProgress }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = `.${getFileExt(file.name)}`;
      if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
        showToast('error', `File type not supported. Use: ${ACCEPTED_TYPES.join(', ')}`);
        return;
      }
      const success = await onUpload(file);
      if (success) {
        showToast('success', `"${file.name}" uploaded successfully!`);
      } else {
        showToast('error', 'Upload failed. Please try again.');
      }
    },
    [onUpload, showToast],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={clsx(
          'relative rounded-xl border-2 border-dashed p-5 text-center',
          'transition-all duration-300 cursor-pointer group',
          isUploading
            ? 'border-purple-500/50 bg-purple-500/5 cursor-default'
            : isDragging
              ? 'border-purple-400 bg-purple-500/10 scale-[1.01] pulse-border'
              : 'border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/5',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleChange}
          className="sr-only"
          disabled={isUploading}
        />

        {isUploading ? (
          /* Uploading state */
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin" />
            <div>
              <p className="text-xs font-medium text-purple-300 mb-2">Uploading &amp; indexing…</p>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full gradient-bg rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          /* Idle / dragging state */
          <div className="space-y-2">
            <div
              className={clsx(
                'w-10 h-10 rounded-xl mx-auto flex items-center justify-center transition-all duration-200',
                isDragging
                  ? 'gradient-bg shadow-glow-purple scale-110'
                  : 'bg-gray-800 group-hover:gradient-bg group-hover:shadow-glow-purple',
              )}
            >
              <Upload
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isDragging ? 'text-white' : 'text-gray-400 group-hover:text-white',
                )}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300 group-hover:text-gray-100 transition-colors">
                {isDragging ? 'Drop it here!' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">PDF, TXT, MD supported</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}

/* ── Document list item ── */
interface DocItemProps {
  doc: Document;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function DocItem({ doc, isActive, onSelect, onDelete }: DocItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDelete) {
        onDelete(doc.id);
      } else {
        setConfirmDelete(true);
        setTimeout(() => setConfirmDelete(false), 3000);
      }
    },
    [confirmDelete, doc.id, onDelete],
  );

  return (
    <div
      onClick={() => onSelect(doc.id)}
      className={clsx(
        'group relative flex items-start gap-2.5 p-3 rounded-xl cursor-pointer',
        'transition-all duration-200 hover:bg-gray-800/60',
        isActive
          ? 'gradient-border bg-gradient-card'
          : 'border border-transparent hover:border-gray-700',
      )}
    >
      {/* File icon */}
      <div className="flex-shrink-0 mt-0.5">{getFileIcon(doc.filename)}</div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'text-xs font-medium truncate leading-tight',
            isActive ? 'text-gray-100' : 'text-gray-300 group-hover:text-gray-100',
          )}
          title={doc.filename}
        >
          {doc.filename}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <Hash className="w-2.5 h-2.5" />
            {doc.chunk_count} chunks
          </span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-600">{formatDate(doc.created_at)}</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={clsx(
          'flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center',
          'transition-all duration-200',
          'opacity-0 group-hover:opacity-100',
          confirmDelete
            ? 'bg-red-600 text-white opacity-100'
            : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400',
        )}
        title={confirmDelete ? 'Click again to confirm delete' : 'Delete document'}
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 gradient-bg rounded-r-full" />
      )}
    </div>
  );
}

/* ── Props ── */
interface SidebarProps {
  documents: Document[];
  activeDocId: string | null;
  onUpload: (file: File) => Promise<boolean>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

/* ── Main Sidebar ── */
export default function Sidebar({
  documents,
  activeDocId,
  onUpload,
  onSelect,
  onDelete,
  isUploading,
  uploadProgress,
}: SidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col glass border-r border-gray-800/50">
      {/* ── Logo / Title ── */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-gray-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-glow-purple">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-none">RAG Chatbot</h1>
            <p className="text-xs text-gray-500 mt-0.5">AI Document Assistant</p>
          </div>
        </div>
      </div>

      {/* ── Upload section ── */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-800/50">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Upload Document
        </h2>
        <UploadZone
          onUpload={onUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {/* ── Documents list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Your Documents
          </h2>
          {documents.length > 0 && (
            <span className="text-xs text-gray-600 glass px-2 py-0.5 rounded-full border border-gray-700">
              {documents.length}
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gray-800/60 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">No documents yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Upload a PDF, TXT, or MD file to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc, idx) => (
              <div
                key={doc.id}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <DocItem
                  doc={doc}
                  isActive={doc.id === activeDocId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active document indicator ── */}
      {activeDocId && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800/50">
          {(() => {
            const activeDoc = documents.find((d) => d.id === activeDocId);
            if (!activeDoc) return null;
            return (
              <div className="flex items-center gap-2 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                <span className="text-xs text-gray-400 truncate">
                  Active:{' '}
                  <span className="text-gray-200 font-medium">
                    {activeDoc.filename}
                  </span>
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </aside>
  );
}
