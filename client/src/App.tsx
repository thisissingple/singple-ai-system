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
import { AppLayout } from "@/components/layout/app-layout";

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
const AIUsageDashboard = lazy(() => import("@/pages/settings/ai-usage-dashboard"));
const SalaryCalculator = lazy(() => import("@/pages/salary/salary-calculator"));
const SalaryRecords = lazy(() => import("@/pages/salary/salary-records"));
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
const StudentProfilePage = lazy(() => import("@/pages/students/student-profile-page"));
const TeacherWorkspace = lazy(() => import("@/pages/teacher-workspace"));
const TrialOverviewGamified = lazy(() => import("@/pages/reports/trial-overview-gamified"));
const StudentProfileGamified = lazy(() => import("@/pages/students/student-profile-gamified"));
const StudentProfileDemo = lazy(() => import("@/pages/students/student-profile-demo"));
const CourseProgressPage = lazy(() => import("@/pages/teaching/course-progress"));

// Archive 頁面（低使用頻率，保留但移至 archive 目錄）
const DataSourcesPage = lazy(() => import("@/pages/archive/settings/data-sources"));
const FacebookSettings = lazy(() => import("@/pages/archive/settings/facebook-settings"));
const KnowItAllChat = lazy(() => import("@/pages/archive/tools/know-it-all-chat"));
const KnowItAllDocuments = lazy(() => import("@/pages/archive/tools/know-it-all-documents"));
const TeachingQualityList = lazy(() => import("@/pages/archive/teaching-quality/teaching-quality-list"));

// 全螢幕 Loading（用於登入頁等非 Layout 頁面）
function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

// 受保護的路由內容（在 AppLayout 內部）
function ProtectedRoutes() {
  return (
    <Switch>
      {/* 首頁 */}
      <Route path="/" component={DashboardOverview} />

      {/* 報表路由 */}
      <Route path="/reports/trial-overview" component={TrialOverviewPage} />
      <Route path="/reports/trial-overview-gamified" component={TrialOverviewGamified} />
      <Route path="/reports/trial-report">
        <Redirect to="/reports/trial-overview?tab=data" />
      </Route>
      <Route path="/reports/cost-profit" component={CostProfitUnifiedPage} />
      <Route path="/reports/income-expense" component={IncomeExpenseManager} />
      <Route path="/reports/consultants" component={ConsultantsPage} />

      {/* 諮詢品質分析詳情頁 */}
      <Route path="/consultation-quality/:eodId" component={ConsultationQualityDetail} />

      {/* 學員管理路由 */}
      <Route path="/students/profile" component={StudentProfilePage} />
      <Route path="/students/profile-gamified" component={StudentProfileGamified} />
      <Route path="/students/profile-demo" component={StudentProfileDemo} />

      {/* 教師工作區 */}
      <Route path="/teacher/workspace" component={TeacherWorkspace} />

      {/* 教學系統 - 課程進度追蹤 */}
      <Route path="/teaching/course-progress" component={CourseProgressPage} />

      {/* 工具路由 */}
      <Route path="/tools/kpi-calculator" component={KPICalculatorPage} />
      <Route path="/tools/ai-analysis" component={AIAnalysisPage} />
      <Route path="/tools/raw-data-mvp" component={RawDataMVPPage} />
      <Route path="/tools/database-browser" component={DatabaseBrowser} />
      <Route path="/tools/know-it-all-chat" component={KnowItAllChat} />
      <Route path="/tools/know-it-all-documents" component={KnowItAllDocuments} />
      <Route path="/forms" component={FormsPage} />

      {/* 電訪系統路由 */}
      <Route path="/telemarketing/student-follow-up" component={StudentFollowUp} />
      <Route path="/telemarketing/ad-leads" component={AdLeadsList} />
      <Route path="/telemarketing/call-records" component={CallRecordsList} />
      <Route path="/telemarketing/ad-performance" component={AdPerformanceReport} />

      {/* GoHighLevel 聯絡人 */}
      <Route path="/leads/gohighlevel" component={GoHighLevelContacts} />

      {/* 教學品質路由 */}
      <Route path="/teaching-quality">
        <Redirect to="/reports/trial-overview?tab=analysis" />
      </Route>
      <Route path="/teaching-quality/:id" component={TeachingQualityDetail} />

      {/* 設定路由 */}
      <Route path="/settings/data-sources" component={DataSourcesPage} />
      <Route path="/settings/form-builder" component={FormBuilderList} />
      <Route path="/settings/form-builder/new" component={FormBuilderEditor} />
      <Route path="/settings/form-builder/edit/:id" component={FormBuilderEditor} />
      <Route path="/settings/google-sheets-sync" component={GoogleSheetsSync} />
      <Route path="/settings/users" component={UserManagement} />
      <Route path="/settings/employees" component={EmployeesPage} />
      <Route path="/settings/permissions" component={PermissionsPage} />
      <Route path="/settings/consultation-analysis-config" component={ConsultationAnalysisConfig} />
      <Route path="/settings/ai-usage" component={AIUsageDashboard} />
      <Route path="/salary/calculator" component={SalaryCalculator} />
      <Route path="/salary/records" component={SalaryRecords} />
      <Route path="/settings/user-impersonation" component={UserImpersonationPage} />
      <Route path="/settings/facebook" component={FacebookSettings} />

      {/* 舊路由重導向（向後兼容） */}
      <Route path="/dashboard/kpi-calculator">
        <Redirect to="/tools/kpi-calculator" />
      </Route>
      <Route path="/dashboard/trial-report">
        <Redirect to="/reports/trial-overview?tab=data" />
      </Route>
      <Route path="/dashboard/total-report">
        <Redirect to="/reports/trial-overview?tab=data" />
      </Route>
      <Route path="/dashboard/ai-analysis">
        <Redirect to="/tools/ai-analysis" />
      </Route>
      <Route path="/dashboard/raw-data-mvp">
        <Redirect to="/tools/raw-data-mvp" />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// 主路由（包含公開和受保護路由的分流）
function Router() {
  return (
    <Switch>
      {/* 公開路由 - 無需登入，獨立頁面 */}
      <Route path="/login" component={LoginPage} />
      <Route path="/login-debug" component={LoginDebugPage} />
      <Route path="/forgot-password">
        <Suspense fallback={<FullPageLoader />}>
          <ForgotPasswordPage />
        </Suspense>
      </Route>
      <Route path="/forms/share/:id">
        <Suspense fallback={<FullPageLoader />}>
          <PublicFormPage />
        </Suspense>
      </Route>
      <Route path="/forms/public/trial-class">
        <Suspense fallback={<FullPageLoader />}>
          <PublicTrialClassForm />
        </Suspense>
      </Route>

      {/* 修改密碼（受保護但無 Layout） */}
      <Route path="/change-password">
        <ProtectedRoute>
          <Suspense fallback={<FullPageLoader />}>
            <ChangePasswordPage />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* 受保護的路由 - 需要登入，使用 AppLayout */}
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <ProtectedRoutes />
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
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
          <Route path="/forms/share/:id">
            <Suspense fallback={<FullPageLoader />}>
              <PublicFormPage />
            </Suspense>
          </Route>

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
