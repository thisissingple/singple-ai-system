/**
 * 體驗課報表頁面（包含側邊選單）
 */

import ReportsLayout from '../../reports-layout';
import DashboardTrialReport from '../../dashboard-trial-report';

export default function TrialReportPage() {
  return (
    <ReportsLayout title="體驗課總報表">
      <DashboardTrialReport />
    </ReportsLayout>
  );
}
