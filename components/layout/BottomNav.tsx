'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, FileDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const tabs = [
  { href: '/', label: '首页', icon: Home },
  { href: '/new', label: '新增', icon: Plus },
  { href: '/export', label: '导出', icon: FileDown },
  { href: '/settings', label: '设置', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // 详情页和新增页不显示底部导航
  if (pathname?.startsWith('/question/') || pathname === '/new') return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card/95 backdrop-blur-sm border-t border-line shadow-nav z-[60] safe-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 tap-area transition-colors',
                active ? 'text-math-accent' : 'text-ink-muted'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn('text-[11px]', active && 'font-medium')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
