/**
 * KPI 計算器頁面（包含側邊選單）
 */

import ReportsLayout from '../reports-layout';
import DashboardKPICalculator from '../dashboard-kpi-calculator';

export default function KPICalculatorPage() {
  return (
    <ReportsLayout title="KPI 計算器">
      <DashboardKPICalculator />
    </ReportsLayout>
  );
}
