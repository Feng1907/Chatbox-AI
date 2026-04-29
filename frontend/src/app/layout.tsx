import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RAG Chatbot - AI Document Assistant',
  description:
    'Intelligent document assistant powered by Retrieval-Augmented Generation. Upload your documents and get accurate, sourced answers.',
  keywords: ['RAG', 'chatbot', 'AI', 'document', 'assistant', 'GPT'],
  authors: [{ name: 'RAG Chatbot' }],
  openGraph: {
    title: 'RAG Chatbot - AI Document Assistant',
    description: 'Intelligent document assistant powered by RAG',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
