from typing import List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The user's question.")
    session_id: Optional[str] = Field(None, description="Optional session identifier for conversation tracking.")
    collection_name: Optional[str] = Field(None, description="ChromaDB collection to query. If omitted, all collections are searched.")


class ChatSource(BaseModel):
    content: str = Field(..., description="The text chunk retrieved from the document.")
    source: str = Field(..., description="The source filename.")
    page: Optional[int] = Field(None, description="Page number within the source document (if applicable).")


class ChatResponse(BaseModel):
    answer: str = Field(..., description="The generated answer from the LLM.")
    sources: List[ChatSource] = Field(default_factory=list, description="Document chunks used to construct the answer.")


class DocumentInfo(BaseModel):
    id: str = Field(..., description="Unique identifier for the document (collection name).")
    filename: str = Field(..., description="Original filename of the uploaded document.")
    chunk_count: int = Field(..., description="Number of chunks the document was split into.")
    created_at: str = Field(..., description="ISO-8601 timestamp of when the document was uploaded.")


class DocumentListResponse(BaseModel):
    documents: List[DocumentInfo] = Field(default_factory=list)


class DeleteResponse(BaseModel):
    message: str
    doc_id: str


class ErrorResponse(BaseModel):
    detail: str
