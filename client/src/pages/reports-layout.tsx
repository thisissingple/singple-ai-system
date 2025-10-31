/**
 * 報表頁面佈局包裝器
 * 為所有報表頁面提供統一的側邊選單導航
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';

interface ReportsLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ReportsLayout({ children, title }: ReportsLayoutProps) {
  const filteredSidebar = useFilteredSidebar();

  return (
    <DashboardLayout
      sidebarSections={filteredSidebar}
      title={title || '教育機構數據儀表板'}
    >
      {children}
    </DashboardLayout>
  );
}
