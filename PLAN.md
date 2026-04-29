# Kế hoạch Phát triển Dự án: AI Chatbot RAG (Retrieval-Augmented Generation)

## 1. Tổng quan dự án
Xây dựng một hệ thống Chatbot AI có khả năng đọc, hiểu và trả lời câu hỏi dựa trên kho dữ liệu riêng (PDF, Markdown, Web) của người dùng hoặc doanh nghiệp. Đây là kiến trúc tối ưu nhất để giải quyết vấn đề "ảo giác" (hallucination) của AI.

## 2. Kiến trúc Hệ thống (Architecture)
Dự án sẽ triển khai theo quy trình chuẩn của RAG:
1. **Document Loading**: Trích xuất văn bản từ các nguồn dữ liệu đầu vào.
2. **Chunking**: Chia nhỏ văn bản thành các đoạn (chunks) có kích thước phù hợp (ví dụ: 500-1000 tokens).
3. **Embedding**: Chuyển đổi các đoạn văn bản thành vector bằng AI model (OpenAI Embeddings hoặc HuggingFace).
4. **Vector Storage**: Lưu trữ các vector này vào một Vector Database (ChromaDB, Pinecone hoặc SingleStore).
5. **Retrieval & Generation**: 
   - Khi có câu hỏi, hệ thống tìm các chunks có vector gần nhất.
   - Gửi các chunks đó kèm câu hỏi vào LLM để tổng hợp câu trả lời.

## 3. Tech Stack Đề xuất
- **Frontend**: React.js / Next.js (Tailwind CSS cho giao diện).
- **Backend**: Python (FastAPI).
- **AI Framework**: LangChain hoặc LlamaIndex.
- **LLM**: OpenAI API (GPT-4o) hoặc Ollama (để chạy local).
- **Vector DB**: ChromaDB (cho môi trường phát triển) hoặc SingleStore/Pinecone (cho production).

## 4. Lộ trình thực hiện (Timeline)

### Tuần 1: Thiết lập & Xử lý dữ liệu (Data Pipeline)
- [x] Khởi tạo project Backend với FastAPI.
- [x] Viết module xử lý file PDF và kỹ thuật Chunking (RecursiveCharacterTextSplitter).
- [x] Tích hợp API để vector hóa dữ liệu (Embedding).

### Tuần 2: Quản lý Vector & Truy vấn (Core RAG)
- [x] Thiết lập Vector Database (ChromaDB).
- [x] Viết logic tìm kiếm tương đồng (Similarity Search).
- [x] Xây dựng Prompt Template để định hướng AI trả lời dựa trên context.

### Tuần 3: Phát triển Giao diện (Frontend)
- [x] Thiết kế giao diện Chat chuyên nghiệp.
- [x] Tích hợp tính năng Upload file và quản lý danh sách tài liệu.
- [x] Kết nối Frontend với API Backend.

### Tuần 4: Tối ưu hóa & Hoàn thiện
- [x] Thêm tính năng Streaming (hiển thị câu trả lời từng chữ).
- [x] Hiển thị nguồn trích dẫn (Source Citation).
- [ ] Viết tài liệu hướng dẫn (README) và chuẩn bị CV/Portfolio.

## 5. Mục tiêu đầu ra
- Sản phẩm chạy được trên môi trường local hoặc cloud.
- Video demo quy trình upload tài liệu và chat.
- Mã nguồn sạch sẽ, có comment rõ ràng trên GitHub.

---

## 📊 TIẾN ĐỘ THỰC HIỆN

| Hạng mục | Trạng thái | Hoàn thành |
|---|---|---|
| Backend: FastAPI setup | ✅ Hoàn thành | 100% |
| Backend: Document Processor (PDF/TXT/MD) | ✅ Hoàn thành | 100% |
| Backend: Chunking (RecursiveCharacterTextSplitter) | ✅ Hoàn thành | 100% |
| Backend: Embedding + ChromaDB | ✅ Hoàn thành | 100% |
| Backend: RAG Chain + Strict Prompt | ✅ Hoàn thành | 100% |
| Backend: Streaming API | ✅ Hoàn thành | 100% |
| Backend: Source Citation API | ✅ Hoàn thành | 100% |
| Frontend: Next.js setup | ✅ Hoàn thành | 100% |
| Frontend: Chat UI (chuyên nghiệp) | ✅ Hoàn thành | 100% |
| Frontend: Document Upload + List | ✅ Hoàn thành | 100% |
| Frontend: Streaming response | ✅ Hoàn thành | 100% |
| Frontend: Source Citation display | ✅ Hoàn thành | 100% |
| README + Hướng dẫn | ✅ Hoàn thành | 100% |

**Tổng tiến độ: 100%** 🎉

### Log thực hiện
- `2026-04-29`: Khởi tạo project, xây dựng toàn bộ backend (FastAPI + LangChain + ChromaDB + OpenAI Streaming)
- `2026-04-29`: Xây dựng toàn bộ frontend (Next.js 14 + Tailwind CSS + shadcn-style components)
- `2026-04-29`: Tích hợp Streaming, Source Citation, Upload UI
