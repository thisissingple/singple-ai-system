/**
 * AI 分析頁面（包含側邊選單）
 */

import ReportsLayout from '../reports-layout';
import DashboardAIAnalysis from '../dashboard-ai-analysis';

export default function AIAnalysisPage() {
  return (
    <ReportsLayout title="AI 分析">
      <DashboardAIAnalysis />
    </ReportsLayout>
  );
}
