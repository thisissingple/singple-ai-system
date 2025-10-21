import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import Dashboard from '@/pages/dashboard';

/**
 * 資料來源管理頁面
 * 使用舊 Dashboard 的 Google Sheets 管理功能
 * 包裝在 DashboardLayout 中以提供側邊選單
 */
export default function DataSourcesPage() {
  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="資料來源">
      <Dashboard />
    </DashboardLayout>
  );
}
