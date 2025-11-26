/**
 * App 主佈局
 * 將 DashboardLayout 提升到路由外層，避免導航時整個頁面重新渲染
 * Suspense 只包住內容區，讓側邊欄保持穩定
 */

import { Suspense } from 'react';
import { DashboardLayout } from './dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

// 內容區 Loading 元件（只顯示在內容區）
function ContentLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const filteredSidebar = useFilteredSidebar();

  return (
    <DashboardLayout sidebarSections={filteredSidebar}>
      <Suspense fallback={<ContentLoader />}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
}
