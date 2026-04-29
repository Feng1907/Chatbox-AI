# RAG Chatbot - AI Document Assistant

Hệ thống Chatbot AI cho phép upload tài liệu (PDF, TXT, Markdown) và đặt câu hỏi dựa trên nội dung tài liệu đó, sử dụng kiến trúc RAG (Retrieval-Augmented Generation).

## Demo

- Upload tài liệu → AI vector hóa và lưu vào ChromaDB
- Đặt câu hỏi → AI chỉ trả lời dựa trên tài liệu, không "bịa"
- Câu trả lời streaming theo từng ký tự với nguồn trích dẫn rõ ràng

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| AI Framework | LangChain |
| LLM | OpenAI GPT-4o mini |
| Embedding | OpenAI text-embedding-3-small |
| Vector DB | ChromaDB (local persistent) |
| Chunking | RecursiveCharacterTextSplitter |

## Cài đặt & Chạy

### Yêu cầu
- Python 3.10+
- Node.js 18+
- OpenAI API Key

### Backend

```bash
cd backend

# Tạo virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux

# Cài dependencies
pip install -r requirements.txt

# Tạo file .env
cp .env.example .env
# Mở .env và thêm OPENAI_API_KEY=sk-...

# Chạy server
uvicorn main:app --reload --port 8000
```

Backend chạy tại: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Frontend chạy tại: http://localhost:3000

## Kiến trúc RAG

```
[User uploads PDF]
        ↓
[PyPDFLoader extracts text]
        ↓
[RecursiveCharacterTextSplitter: chunk_size=800, overlap=150]
        ↓
[OpenAI Embeddings → vector hóa từng chunk]
        ↓
[ChromaDB lưu vectors]
        
[User đặt câu hỏi]
        ↓
[Câu hỏi được embedding]
        ↓
[ChromaDB similarity search → top-4 chunks]
        ↓
[Strict Prompt + chunks + câu hỏi → GPT-4o mini]
        ↓
[Streaming response + Source Citation]
```

## Strict System Prompt (chống hallucination)

AI được cấu hình với prompt nghiêm ngặt:
- Chỉ trả lời dựa trên context từ tài liệu
- Nếu không có thông tin: trả lời "Tôi không tìm thấy thông tin này trong tài liệu được cung cấp."
- Không sử dụng kiến thức nền ngoài tài liệu
- Trả lời theo ngôn ngữ của câu hỏi

## API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/upload` | Upload tài liệu (PDF/TXT/MD) |
| GET | `/api/documents` | Danh sách tài liệu đã upload |
| DELETE | `/api/documents/{id}` | Xóa tài liệu |
| POST | `/api/chat` | Chat (non-streaming) |
| GET | `/api/chat/stream` | Chat với streaming SSE |
