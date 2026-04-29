"""
routes.py
---------
FastAPI route definitions for the RAG chatbot API.

Endpoints:
  POST   /api/upload                      – Upload a PDF/TXT/MD document
  GET    /api/documents                   – List all uploaded documents
  DELETE /api/documents/{doc_id}          – Delete a document and its vectors
  POST   /api/chat                        – Non-streaming chat
  GET    /api/chat/stream                 – Server-Sent Events streaming chat
"""

import os
import re
import shutil
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse

from app.core.document_processor import process_file
from app.core.rag_chain import ask_question, ask_question_stream
from app.core.vector_store import (
    add_documents,
    delete_collection,
    list_collections,
)
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    DeleteResponse,
    DocumentInfo,
    DocumentListResponse,
)

router = APIRouter()

UPLOAD_DIR = "./uploads"
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sanitize_collection_name(filename: str) -> str:
    """
    Derive a valid ChromaDB collection name from a filename.

    ChromaDB collection names must:
    - Be 3–63 characters long
    - Start and end with an alphanumeric character
    - Contain only alphanumeric characters, underscores, or hyphens
    - Not contain consecutive periods
    """
    stem = os.path.splitext(filename)[0]
    sanitized = re.sub(r"[^a-zA-Z0-9_\-]", "_", stem)
    sanitized = re.sub(r"_+", "_", sanitized).strip("_")
    sanitized = sanitized[:63]
    if len(sanitized) < 3:
        sanitized = sanitized.ljust(3, "0")
    return sanitized.lower()


def _validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"File type '{ext}' is not supported. "
                f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )
    return ext


def _ensure_upload_dir() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/upload",
    response_model=DocumentInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document (PDF, TXT, MD) for ingestion into the vector store.",
)
async def upload_document(file: UploadFile = File(...)) -> DocumentInfo:
    _ensure_upload_dir()

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided with the uploaded file.",
        )

    ext = _validate_extension(file.filename)

    collection_name = _sanitize_collection_name(file.filename)
    if not collection_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not derive a valid collection name from the filename.",
        )

    save_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save file to disk
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {exc}",
        )
    finally:
        await file.close()

    # Process and embed
    try:
        docs = process_file(save_path)
    except ValueError as exc:
        os.remove(save_path)
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(exc),
        )
    except Exception as exc:
        os.remove(save_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {exc}",
        )

    try:
        chunk_count = add_documents(docs, collection_name, filename=file.filename)
    except EnvironmentError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store document vectors: {exc}",
        )

    return DocumentInfo(
        id=collection_name,
        filename=file.filename,
        chunk_count=chunk_count,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get(
    "/documents",
    response_model=DocumentListResponse,
    summary="List all documents currently stored in the vector store.",
)
async def list_documents() -> DocumentListResponse:
    try:
        collections = list_collections()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {exc}",
        )

    documents = [
        DocumentInfo(
            id=col["name"],
            filename=col["filename"],
            chunk_count=col["chunk_count"],
            created_at=col["upload_time"],
        )
        for col in collections
    ]
    return DocumentListResponse(documents=documents)


@router.delete(
    "/documents/{doc_id}",
    response_model=DeleteResponse,
    summary="Delete a document and all its vector embeddings.",
)
async def delete_document(doc_id: str) -> DeleteResponse:
    try:
        delete_collection(doc_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {exc}",
        )

    # Also remove the uploaded file if it still exists
    for fname in os.listdir(UPLOAD_DIR) if os.path.isdir(UPLOAD_DIR) else []:
        if _sanitize_collection_name(fname) == doc_id:
            try:
                os.remove(os.path.join(UPLOAD_DIR, fname))
            except OSError:
                pass
            break

    return DeleteResponse(
        message=f"Document '{doc_id}' has been deleted successfully.",
        doc_id=doc_id,
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Non-streaming chat endpoint. Returns the full answer and source citations.",
)
async def chat(request: ChatRequest) -> ChatResponse:
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question must not be empty.",
        )

    try:
        answer, sources = ask_question(
            question=request.question,
            collection_name=request.collection_name,
        )
    except EnvironmentError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the answer: {exc}",
        )

    return ChatResponse(answer=answer, sources=sources)


@router.get(
    "/chat/stream",
    summary="Streaming chat endpoint using Server-Sent Events (SSE).",
    response_description="A stream of SSE events. Each event carries a text chunk. "
                          "The final event before [DONE] is a JSON blob prefixed with [SOURCES].",
)
async def chat_stream(
    question: str = Query(..., min_length=1, description="The user's question."),
    collection: Optional[str] = Query(
        None,
        description="ChromaDB collection name to restrict search to. "
                    "Omit to search all collections.",
    ),
) -> StreamingResponse:
    """
    Server-Sent Events streaming chat.

    SSE event format:
        data: <text_chunk>\\n\\n

    Sources are sent as the last data event before [DONE]:
        data: [SOURCES]{"sources": [...]}\\n\\n
        data: [DONE]\\n\\n
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for chunk in ask_question_stream(
                question=question,
                collection_name=collection,
            ):
                # Each chunk is either a text token or the [SOURCES] JSON blob.
                yield f"data: {chunk}\n\n"
        except EnvironmentError as exc:
            yield f"data: [ERROR]{exc}\n\n"
        except ValueError as exc:
            yield f"data: [ERROR]{exc}\n\n"
        except Exception as exc:
            yield f"data: [ERROR]An unexpected error occurred: {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering for SSE
            "Connection": "keep-alive",
        },
    )
