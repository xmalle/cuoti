import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: '错题本 · 考研复习',
  description: '考研数学一与专业课错题记录与复习工具',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EFEEE7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
