export interface Source {
  content: string;
  source: string;
  page?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface Document {
  id: string;
  filename: string;
  chunk_count: number;
  created_at: string;
}

export interface UploadResponse {
  message: string;
  collection_name: string;
  chunks_created: number;
  document_id: string;
}

export interface ChatStreamChunk {
  type: 'content' | 'sources' | 'error' | 'done';
  data: string;
}
