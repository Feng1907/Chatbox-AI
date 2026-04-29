"""
rag_chain.py
------------
Core RAG (Retrieval-Augmented Generation) logic.

Provides both synchronous (ask_question) and async streaming
(ask_question_stream) interfaces for querying the LLM with retrieved context.
"""

import json
import os
from typing import AsyncGenerator, List, Optional, Tuple

from langchain.schema import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.vector_store import similarity_search, similarity_search_all
from app.models.schemas import ChatSource


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_SYSTEM_TEMPLATE = """\
You are a helpful assistant that answers questions STRICTLY based on the provided document context.

RULES:
- Only answer using information found in the CONTEXT section below.
- If the answer is not in the context, say exactly: "Tôi không tìm thấy thông tin này trong tài liệu được cung cấp."
- Do NOT use your general knowledge. Do NOT make assumptions.
- Always cite which part of the document supports your answer.
- Answer in the same language as the question.

CONTEXT:
{context}
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_llm(streaming: bool = False) -> ChatOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY is not set. Please configure it in your .env file."
        )
    return ChatOpenAI(
        model="gpt-4o-mini",
        streaming=streaming,
        temperature=0,
        openai_api_key=api_key,
    )


def _build_context(docs: List[Document]) -> str:
    """Concatenate retrieved chunks into a single context string."""
    parts = []
    for i, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page")
        page_info = f", page {page + 1}" if page is not None else ""
        parts.append(f"[{i}] Source: {source}{page_info}\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _docs_to_sources(docs: List[Document]) -> List[ChatSource]:
    """Convert LangChain Documents to ChatSource schema objects."""
    sources = []
    for doc in docs:
        page_raw = doc.metadata.get("page")
        sources.append(
            ChatSource(
                content=doc.page_content,
                source=doc.metadata.get("source", "unknown"),
                page=(page_raw + 1) if page_raw is not None else None,
            )
        )
    return sources


def _retrieve(
    question: str,
    collection_name: Optional[str],
    k: int = 4,
) -> List[Document]:
    """Retrieve relevant chunks from the vector store."""
    if collection_name:
        return similarity_search(question, collection_name, k=k)
    return similarity_search_all(question, k=k)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def ask_question(
    question: str,
    collection_name: Optional[str] = None,
) -> Tuple[str, List[ChatSource]]:
    """
    Synchronous RAG query.

    Retrieves relevant document chunks and asks the LLM to answer based solely
    on that context.

    Args:
        question: The user's question.
        collection_name: Optional ChromaDB collection to restrict retrieval to.
                         If None, all collections are searched.

    Returns:
        Tuple of (answer_text, list_of_ChatSource).
    """
    docs = _retrieve(question, collection_name)

    if not docs:
        no_docs_msg = "Tôi không tìm thấy thông tin này trong tài liệu được cung cấp."
        return no_docs_msg, []

    context = _build_context(docs)
    system_prompt = _SYSTEM_TEMPLATE.format(context=context)

    llm = _get_llm(streaming=False)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=question),
    ]

    response = llm.invoke(messages)
    answer = response.content

    return answer, _docs_to_sources(docs)


async def ask_question_stream(
    question: str,
    collection_name: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Async streaming RAG query.

    Yields:
        Text chunks from the LLM as they arrive, followed by a final JSON
        chunk prefixed with ``[SOURCES]`` containing serialised source metadata.

    Usage (inside a FastAPI StreamingResponse):
        async for chunk in ask_question_stream(question, collection_name):
            yield f"data: {chunk}\\n\\n"

    Format of the last yielded value:
        ``[SOURCES]{"sources": [...]}``
    """
    docs = _retrieve(question, collection_name)

    if not docs:
        no_docs_msg = "Tôi không tìm thấy thông tin này trong tài liệu được cung cấp."
        yield no_docs_msg
        sources_payload = json.dumps({"sources": []})
        yield f"[SOURCES]{sources_payload}"
        return

    context = _build_context(docs)
    system_prompt = _SYSTEM_TEMPLATE.format(context=context)

    llm = _get_llm(streaming=True)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=question),
    ]

    async for chunk in llm.astream(messages):
        token = chunk.content
        if token:
            yield token

    # After all text chunks, emit the sources as a structured JSON blob.
    chat_sources = _docs_to_sources(docs)
    sources_data = [
        {
            "content": s.content,
            "source": s.source,
            "page": s.page,
        }
        for s in chat_sources
    ]
    sources_payload = json.dumps({"sources": sources_data}, ensure_ascii=False)
    yield f"[SOURCES]{sources_payload}"
