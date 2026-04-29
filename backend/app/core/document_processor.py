"""
document_processor.py
---------------------
Handles loading and splitting documents (PDF, TXT, MD) into LangChain Document chunks
ready for embedding and storage in ChromaDB.
"""

import os
from typing import List

from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader


CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _enrich_metadata(docs: List[Document], filename: str) -> List[Document]:
    """Attach a normalised 'source' filename to every chunk's metadata."""
    for doc in docs:
        doc.metadata["source"] = filename
        # PyPDFLoader already sets 'page'; TextLoader does not – default to None.
        if "page" not in doc.metadata:
            doc.metadata["page"] = None
    return docs


def process_pdf(file_path: str) -> List[Document]:
    """
    Load a PDF file and split it into overlapping text chunks.

    Args:
        file_path: Absolute or relative path to the PDF file.

    Returns:
        List of LangChain Document objects with metadata fields:
        ``source`` (filename) and ``page`` (0-based page index).
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    filename = os.path.basename(file_path)
    loader = PyPDFLoader(file_path)
    pages = loader.load()  # Each element is one page

    chunks = _splitter.split_documents(pages)
    return _enrich_metadata(chunks, filename)


def process_text(file_path: str) -> List[Document]:
    """
    Load a plain-text file (TXT or MD) and split it into overlapping text chunks.

    Args:
        file_path: Absolute or relative path to the text file.

    Returns:
        List of LangChain Document objects with metadata fields:
        ``source`` (filename) and ``page`` (None for text files).
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Text file not found: {file_path}")

    filename = os.path.basename(file_path)

    # TextLoader may raise on non-UTF-8 files; fall back to latin-1.
    try:
        loader = TextLoader(file_path, encoding="utf-8")
        docs = loader.load()
    except UnicodeDecodeError:
        loader = TextLoader(file_path, encoding="latin-1")
        docs = loader.load()

    chunks = _splitter.split_documents(docs)
    return _enrich_metadata(chunks, filename)


def process_file(file_path: str) -> List[Document]:
    """
    Dispatch to the correct processor based on file extension.

    Supported extensions: .pdf, .txt, .md

    Args:
        file_path: Path to the uploaded file.

    Returns:
        List of LangChain Document chunks.

    Raises:
        ValueError: If the file extension is not supported.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return process_pdf(file_path)
    elif ext in {".txt", ".md"}:
        return process_text(file_path)
    else:
        raise ValueError(
            f"Unsupported file type '{ext}'. Allowed types: .pdf, .txt, .md"
        )
