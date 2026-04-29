import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure required directories exist on startup
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("./chroma_db", exist_ok=True)
    yield


app = FastAPI(
    title="RAG Chatbot API",
    description="A Retrieval-Augmented Generation chatbot backend powered by LangChain and ChromaDB.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "RAG Chatbot API is running."}
