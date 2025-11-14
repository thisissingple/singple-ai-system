import { Switch, Route, Redirect } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { TeachingQualityProvider } from "@/contexts/teaching-quality-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ImpersonationBanner } from "@/components/impersonation-banner";

// 只有這些頁面需要立即載入（登入頁面和 404）
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/auth/login";
import LoginDebugPage from "@/pages/auth/login-debug";

// 優化：使用 lazy loading 延遲載入其他頁面，減少初始 bundle 大小

// 主要頁面
const DashboardOverview = lazy(() => import("@/pages/dashboard-overview"));
const TrialOverviewPage = lazy(() => import("@/pages/reports/trial-overview"));
const CostProfitUnifiedPage = lazy(() => import("@/pages/reports/cost-profit-unified"));
const IncomeExpenseManager = lazy(() => import("@/pages/reports/income-expense-manager"));
const KPICalculatorPage = lazy(() => import("@/pages/tools/kpi-calculator"));
const AIAnalysisPage = lazy(() => import("@/pages/tools/ai-analysis"));
const RawDataMVPPage = lazy(() => import("@/pages/tools/raw-data-mvp"));
const DatabaseBrowser = lazy(() => import("@/pages/tools/database-browser"));
const FormsPage = lazy(() => import("@/pages/forms/forms-page"));
const PublicFormPage = lazy(() => import("@/pages/forms/form-share"));
const FormBuilderList = lazy(() => import("@/pages/settings/form-builder-list"));
const FormBuilderEditor = lazy(() => import("@/pages/settings/form-builder-editor"));
const GoogleSheetsSync = lazy(() => import("@/pages/settings/google-sheets-sync"));
const UserManagement = lazy(() => import("@/pages/settings/user-management"));
const EmployeesPage = lazy(() => import("@/pages/settings/employees"));
const PermissionsPage = lazy(() => import("@/pages/settings/permissions"));
const ConsultationAnalysisConfig = lazy(() => import("@/pages/settings/consultation-analysis-config"));
const UserImpersonationPage = lazy(() => import("@/pages/settings/user-impersonation"));
const TeachingQualityDetail = lazy(() => import("@/pages/teaching-quality/teaching-quality-detail"));
const ChangePasswordPage = lazy(() => import("@/pages/auth/change-password"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const PublicTrialClassForm = lazy(() => import("@/pages/forms/public-trial-class-form"));
const AdLeadsList = lazy(() => import("@/pages/telemarketing/ad-leads-list"));
const AdPerformanceReport = lazy(() => import("@/pages/telemarketing/ad-performance-report"));
const CallRecordsList = lazy(() => import("@/pages/telemarketing/call-records-list"));
const StudentFollowUp = lazy(() => import("@/pages/telemarketing/student-follow-up"));
const GoHighLevelContacts = lazy(() => import("@/pages/leads/gohighlevel-contacts"));
const ConsultantsPage = lazy(() => import("@/pages/reports/consultants"));
const ConsultationQualityDetail = lazy(() => import("@/pages/consultation-quality/consultation-quality-detail"));

// Archive 頁面（低使用頻率，保留但移至 archive 目錄）
const DataSourcesPage = lazy(() => import("@/pages/archive/settings/data-sources"));
const FacebookSettings = lazy(() => import("@/pages/archive/settings/facebook-settings"));
const KnowItAllChat = lazy(() => import("@/pages/archive/tools/know-it-all-chat"));
const KnowItAllDocuments = lazy(() => import("@/pages/archive/tools/know-it-all-documents"));
const TeachingQualityList = lazy(() => import("@/pages/archive/teaching-quality/teaching-quality-list"));

// Loading 元件
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* 公開路由 - 無需登入 */}
        <Route path="/login" component={LoginPage} />
        <Route path="/login-debug" component={LoginDebugPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
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

      {/* 新的整合頁面：體驗課總覽 */}
      <Route path="/reports/trial-overview">
        <ProtectedRoute><TrialOverviewPage /></ProtectedRoute>
      </Route>

      {/* 舊路由重導向到新的整合頁面 */}
      <Route path="/reports/trial-report">
        <ProtectedRoute>
          <Redirect to="/reports/trial-overview?tab=data" />
        </ProtectedRoute>
      </Route>

      <Route path="/reports/cost-profit">
        <ProtectedRoute><CostProfitUnifiedPage /></ProtectedRoute>
      </Route>
      <Route path="/reports/income-expense">
        <ProtectedRoute><IncomeExpenseManager /></ProtectedRoute>
      </Route>
      <Route path="/reports/consultants">
        <ProtectedRoute><ConsultantsPage /></ProtectedRoute>
      </Route>

      {/* 諮詢品質分析詳情頁 */}
      <Route path="/consultation-quality/:eodId">
        <ProtectedRoute><ConsultationQualityDetail /></ProtectedRoute>
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
      <Route path="/tools/know-it-all-chat">
        <ProtectedRoute><KnowItAllChat /></ProtectedRoute>
      </Route>
      <Route path="/tools/know-it-all-documents">
        <ProtectedRoute><KnowItAllDocuments /></ProtectedRoute>
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
      {/* 舊的列表頁重導向到新的整合頁面的學員分析 Tab */}
      <Route path="/teaching-quality">
        <ProtectedRoute>
          <Redirect to="/reports/trial-overview?tab=analysis" />
        </ProtectedRoute>
      </Route>

      {/* 詳情頁保持獨立 */}
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
      <Route path="/settings/google-sheets-sync">
        <ProtectedRoute><GoogleSheetsSync /></ProtectedRoute>
      </Route>
      <Route path="/settings/users">
        <ProtectedRoute><UserManagement /></ProtectedRoute>
      </Route>
      <Route path="/settings/employees">
        <ProtectedRoute><EmployeesPage /></ProtectedRoute>
      </Route>
      <Route path="/settings/permissions">
        <ProtectedRoute><PermissionsPage /></ProtectedRoute>
      </Route>
      <Route path="/settings/consultation-analysis-config">
        <ProtectedRoute><ConsultationAnalysisConfig /></ProtectedRoute>
      </Route>
      <Route path="/settings/user-impersonation">
        <ProtectedRoute><UserImpersonationPage /></ProtectedRoute>
      </Route>
      <Route path="/settings/facebook">
        <ProtectedRoute><FacebookSettings /></ProtectedRoute>
      </Route>

      {/* 舊路由重導向（向後兼容） */}
      <Route path="/dashboard/kpi-calculator">
        <ProtectedRoute>
          <Redirect to="/tools/kpi-calculator" />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/trial-report">
        <ProtectedRoute>
          <Redirect to="/reports/trial-overview?tab=data" />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/total-report">
        <ProtectedRoute>
          <Redirect to="/reports/trial-overview?tab=data" />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/ai-analysis">
        <ProtectedRoute>
          <Redirect to="/tools/ai-analysis" />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/raw-data-mvp">
        <ProtectedRoute>
          <Redirect to="/tools/raw-data-mvp" />
        </ProtectedRoute>
      </Route>

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ImpersonationBanner />
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
