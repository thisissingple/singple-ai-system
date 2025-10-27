import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { TeachingQualityProvider } from "@/contexts/teaching-quality-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

// 舊版頁面（用於兼容舊路由）
import DashboardKPICalculator from "@/pages/dashboard-kpi-calculator";
import DashboardTrialReport from "@/pages/dashboard-trial-report";
import DashboardAIAnalysis from "@/pages/dashboard-ai-analysis";
import DashboardRawDataMVP from "@/pages/dashboard-raw-data-mvp";

// 新版頁面（包含側邊選單）
import DashboardOverview from "@/pages/dashboard-overview";
import TrialReportPage from "@/pages/reports/trial-report";
import CostProfitDashboard from "@/pages/reports/cost-profit-dashboard";
import CostProfitManagerPage from "@/pages/reports/cost-profit-manager";
import IncomeExpenseManager from "@/pages/reports/income-expense-manager";
import KPICalculatorPage from "@/pages/tools/kpi-calculator";
import AIAnalysisPage from "@/pages/tools/ai-analysis";
import RawDataMVPPage from "@/pages/tools/raw-data-mvp";
import DatabaseBrowser from "@/pages/tools/database-browser";
import FormsPage from "@/pages/forms/forms-page";
import PublicFormPage from "@/pages/forms/form-share";
import DataSourcesPage from "@/pages/settings/data-sources";
import FormBuilderList from "@/pages/settings/form-builder-list";
import FormBuilderEditor from "@/pages/settings/form-builder-editor";
import UserManagement from "@/pages/settings/user-management";
import EmployeesPage from "@/pages/settings/employees";
import FacebookSettings from "@/pages/settings/facebook-settings";
import TeachingQualityList from "@/pages/teaching-quality/teaching-quality-list";
import TeachingQualityDetail from "@/pages/teaching-quality/teaching-quality-detail";
import LoginPage from "@/pages/auth/login";
import ChangePasswordPage from "@/pages/auth/change-password";
import PublicTrialClassForm from "@/pages/forms/public-trial-class-form";
import AdLeadsList from "@/pages/telemarketing/ad-leads-list";
import AdPerformanceReport from "@/pages/telemarketing/ad-performance-report";
import CallRecordsList from "@/pages/telemarketing/call-records-list";
import StudentFollowUp from "@/pages/telemarketing/student-follow-up";
import GoHighLevelContacts from "@/pages/leads/gohighlevel-contacts";

function Router() {
  return (
    <Switch>
      {/* 公開路由 - 無需登入 */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forms/share/:id" component={PublicFormPage} />
      <Route path="/forms/public/trial-class" component={PublicTrialClassForm} />

      {/* 需要登入但可在未修改密碼時訪問 */}
      <Route path="/change-password">
        <ProtectedRoute>
          <ChangePasswordPage />
        </ProtectedRoute>
      </Route>

      {/* 受保護的路由 - 需要登入 */}
      <Route path="/">
        <ProtectedRoute>
          <DashboardOverview />
        </ProtectedRoute>
      </Route>

      {/* 報表路由（新，包含側邊選單） */}
      <Route path="/reports/trial-report">
        <ProtectedRoute><TrialReportPage /></ProtectedRoute>
      </Route>
      <Route path="/reports/cost-profit">
        <ProtectedRoute><CostProfitDashboard /></ProtectedRoute>
      </Route>
      <Route path="/reports/cost-profit/manage">
        <ProtectedRoute><CostProfitManagerPage /></ProtectedRoute>
      </Route>
      <Route path="/reports/income-expense">
        <ProtectedRoute><IncomeExpenseManager /></ProtectedRoute>
      </Route>

      {/* 工具路由（新，包含側邊選單） */}
      <Route path="/tools/kpi-calculator">
        <ProtectedRoute><KPICalculatorPage /></ProtectedRoute>
      </Route>
      <Route path="/tools/ai-analysis">
        <ProtectedRoute><AIAnalysisPage /></ProtectedRoute>
      </Route>
      <Route path="/tools/raw-data-mvp">
        <ProtectedRoute><RawDataMVPPage /></ProtectedRoute>
      </Route>
      <Route path="/tools/database-browser">
        <ProtectedRoute><DatabaseBrowser /></ProtectedRoute>
      </Route>
      <Route path="/forms">
        <ProtectedRoute><FormsPage /></ProtectedRoute>
      </Route>

      {/* 電訪系統路由 */}
      <Route path="/telemarketing/student-follow-up">
        <ProtectedRoute><StudentFollowUp /></ProtectedRoute>
      </Route>
      <Route path="/telemarketing/ad-leads">
        <ProtectedRoute><AdLeadsList /></ProtectedRoute>
      </Route>
      <Route path="/telemarketing/call-records">
        <ProtectedRoute><CallRecordsList /></ProtectedRoute>
      </Route>
      <Route path="/telemarketing/ad-performance">
        <ProtectedRoute><AdPerformanceReport /></ProtectedRoute>
      </Route>

      {/* GoHighLevel 聯絡人 */}
      <Route path="/leads/gohighlevel">
        <ProtectedRoute><GoHighLevelContacts /></ProtectedRoute>
      </Route>

      {/* 教學品質路由 */}
      <Route path="/teaching-quality">
        <ProtectedRoute><TeachingQualityList /></ProtectedRoute>
      </Route>
      <Route path="/teaching-quality/:id">
        <ProtectedRoute><TeachingQualityDetail /></ProtectedRoute>
      </Route>

      {/* 設定路由 */}
      <Route path="/settings/data-sources">
        <ProtectedRoute><DataSourcesPage /></ProtectedRoute>
      </Route>
      <Route path="/settings/form-builder">
        <ProtectedRoute><FormBuilderList /></ProtectedRoute>
      </Route>
      <Route path="/settings/form-builder/new">
        <ProtectedRoute><FormBuilderEditor /></ProtectedRoute>
      </Route>
      <Route path="/settings/form-builder/edit/:id">
        <ProtectedRoute><FormBuilderEditor /></ProtectedRoute>
      </Route>
      <Route path="/settings/users">
        <ProtectedRoute><UserManagement /></ProtectedRoute>
      </Route>
      <Route path="/settings/employees">
        <ProtectedRoute><EmployeesPage /></ProtectedRoute>
      </Route>
      <Route path="/settings/facebook">
        <ProtectedRoute><FacebookSettings /></ProtectedRoute>
      </Route>

      {/* 舊路由兼容（保持原有功能） */}
      <Route path="/dashboard/kpi-calculator">
        <ProtectedRoute><DashboardKPICalculator /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/trial-report">
        <ProtectedRoute><DashboardTrialReport /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/total-report">
        <ProtectedRoute><DashboardTrialReport /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/ai-analysis">
        <ProtectedRoute><DashboardAIAnalysis /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/raw-data-mvp">
        <ProtectedRoute><DashboardRawDataMVP /></ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          {/* 完全公開的路由 - 不需要 AuthProvider */}
          <Route path="/forms/share/:id" component={PublicFormPage} />

          {/* 其他路由 - 需要 AuthProvider */}
          <Route>
            <AuthProvider>
              <TeachingQualityProvider>
                <Router />
              </TeachingQualityProvider>
            </AuthProvider>
          </Route>
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
