'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Document } from '@/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : data.documents ?? []);
    } catch (err) {
      console.error('fetchDocuments error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    }
  }, []);

  const uploadDocument = useCallback(
    async (file: File): Promise<boolean> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        // Simulate progress while uploading
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 300);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
          throw new Error(errorData.detail ?? 'Upload failed');
        }

        setUploadProgress(100);
        await fetchDocuments();
        return true;
      } catch (err) {
        console.error('uploadDocument error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        return false;
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 800);
      }
    },
    [fetchDocuments],
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete document');
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        return true;
      } catch (err) {
        console.error('deleteDocument error:', err);
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isUploading,
    uploadProgress,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  };
}
