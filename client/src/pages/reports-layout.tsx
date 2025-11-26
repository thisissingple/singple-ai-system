/**
 * 報表頁面佈局包裝器
 * 注意：DashboardLayout 已在 AppLayout 中統一提供
 * 此元件現在只是透傳 children，保持向後兼容
 */

interface ReportsLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ReportsLayout({ children }: ReportsLayoutProps) {
  // DashboardLayout 已在 App.tsx 的 AppLayout 中統一處理
  // 這裡直接返回 children，避免重複嵌套
  return <>{children}</>;
}
