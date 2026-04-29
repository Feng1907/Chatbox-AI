"""
vector_store.py
---------------
ChromaDB-backed vector store manager.

All collections live in the ./chroma_db persistent directory.
Each collection corresponds to one uploaded document and carries
collection-level metadata: filename, upload_time, chunk_count.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings
from langchain.schema import Document
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings


CHROMA_PERSIST_DIR = "./chroma_db"

# Metadata key stored on the ChromaDB collection object itself
# (distinct from per-chunk metadata stored on individual documents).
_META_FILENAME = "filename"
_META_UPLOAD_TIME = "upload_time"
_META_CHUNK_COUNT = "chunk_count"


def _get_client() -> chromadb.PersistentClient:
    """Return a persistent ChromaDB client."""
    return chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False),
    )


def _get_embeddings() -> OpenAIEmbeddings:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY is not set. Please configure it in your .env file."
        )
    return OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=api_key)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def add_documents(
    docs: List[Document],
    collection_name: str,
    filename: Optional[str] = None,
) -> int:
    """
    Embed and persist a list of LangChain Documents into a ChromaDB collection.

    If the collection already exists its contents are replaced (delete + re-add).

    Args:
        docs: Chunked LangChain Document objects (must have metadata['source']).
        collection_name: Name of the ChromaDB collection to write to.
        filename: Human-readable original filename stored as collection metadata.
                  Defaults to the 'source' field of the first document.

    Returns:
        Number of chunks stored.
    """
    if not docs:
        raise ValueError("docs list is empty – nothing to store.")

    resolved_filename = filename or docs[0].metadata.get("source", collection_name)
    upload_time = datetime.now(timezone.utc).isoformat()
    chunk_count = len(docs)

    client = _get_client()

    # Delete existing collection if present so re-uploads are clean.
    existing = [c.name for c in client.list_collections()]
    if collection_name in existing:
        client.delete_collection(collection_name)

    # Create the collection with high-level metadata stored at collection level.
    collection_meta = {
        _META_FILENAME: resolved_filename,
        _META_UPLOAD_TIME: upload_time,
        _META_CHUNK_COUNT: str(chunk_count),
    }
    client.create_collection(name=collection_name, metadata=collection_meta)

    # Use LangChain's Chroma wrapper to embed and store the chunks.
    Chroma.from_documents(
        documents=docs,
        embedding=_get_embeddings(),
        collection_name=collection_name,
        persist_directory=CHROMA_PERSIST_DIR,
    )

    return chunk_count


def similarity_search(
    query: str,
    collection_name: str,
    k: int = 4,
) -> List[Document]:
    """
    Retrieve the top-k most semantically similar chunks for a query.

    Args:
        query: User's question string.
        collection_name: ChromaDB collection to search.
        k: Number of chunks to return.

    Returns:
        List of LangChain Document objects with page_content and metadata.

    Raises:
        ValueError: If the collection does not exist.
    """
    client = _get_client()
    existing = [c.name for c in client.list_collections()]
    if collection_name not in existing:
        raise ValueError(f"Collection '{collection_name}' does not exist.")

    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_PERSIST_DIR,
    )
    return vector_store.similarity_search(query, k=k)


def similarity_search_all(query: str, k: int = 4) -> List[Document]:
    """
    Search across ALL collections and return the top-k globally most relevant chunks.

    Useful when no specific collection is specified in a chat request.

    Args:
        query: User's question string.
        k: Total number of chunks to return.

    Returns:
        Merged and de-duplicated list of Document objects.
    """
    client = _get_client()
    collections = client.list_collections()
    if not collections:
        return []

    all_results: List[tuple[float, Document]] = []

    embeddings = _get_embeddings()
    for col in collections:
        vector_store = Chroma(
            collection_name=col.name,
            embedding_function=embeddings,
            persist_directory=CHROMA_PERSIST_DIR,
        )
        # Use similarity_search_with_score to rank across collections.
        try:
            results = vector_store.similarity_search_with_score(query, k=k)
            for doc, score in results:
                all_results.append((score, doc))
        except Exception:
            # Empty or corrupted collection – skip gracefully.
            continue

    # Lower score = more similar in ChromaDB's L2 distance metric.
    all_results.sort(key=lambda t: t[0])
    return [doc for _, doc in all_results[:k]]


def delete_collection(collection_name: str) -> None:
    """
    Delete an entire collection (all chunks) from ChromaDB.

    Args:
        collection_name: Name of the collection to remove.

    Raises:
        ValueError: If the collection does not exist.
    """
    client = _get_client()
    existing = [c.name for c in client.list_collections()]
    if collection_name not in existing:
        raise ValueError(f"Collection '{collection_name}' does not exist.")
    client.delete_collection(collection_name)


def list_collections() -> List[Dict[str, Any]]:
    """
    Return metadata for every collection currently stored in ChromaDB.

    Returns:
        List of dicts with keys: name, filename, upload_time, chunk_count.
    """
    client = _get_client()
    result = []
    for col in client.list_collections():
        meta = col.metadata or {}
        result.append(
            {
                "name": col.name,
                "filename": meta.get(_META_FILENAME, col.name),
                "upload_time": meta.get(_META_UPLOAD_TIME, ""),
                "chunk_count": int(meta.get(_META_CHUNK_COUNT, 0)),
            }
        )
    return result
