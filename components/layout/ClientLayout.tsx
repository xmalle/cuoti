'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // 新增页和详情页不显示底部导航栏，也不需要 pb-20
  const hideNav = pathname === '/new' || pathname?.startsWith('/question/');

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${hideNav ? '' : 'pb-20'}`}>{children}</main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
