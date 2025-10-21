/**
 * Teaching Quality Analysis Types
 *
 * Frontend types for the AI-powered teaching quality tracking system
 */

// ============================================================================
// Analysis Types
// ============================================================================

export interface AnalysisStrength {
  point: string;          // The strength point (優點)
  evidence: string;       // Specific evidence from transcript (具體證據)
}

export interface AnalysisWeakness {
  point: string;          // The weakness point (缺點)
  evidence: string;       // Specific evidence from transcript
}

export interface ImprovementSuggestion {
  suggestion: string;     // The suggestion (建議)
  method: string;         // Specific method to implement (具體做法)
  expectedEffect: string; // Expected outcome (預期效果)
  priority: number;       // Priority 1-5 (1 = highest)
}

export interface StudentAnalysis {
  technicalIssues: string[];       // 技術面問題（歌唱痛點）
  psychologicalIssues: string[];   // 心理面問題（自信、比較等）
  motivationSource: string;        // 動機來源
  studentProfile: string;          // 學員屬性
}

export interface SalesStrategy {
  painPointAmplification: string;  // 痛點放大
  dreamVision: string;             // 夢想畫面
  productMatch: string;            // 產品匹配
  scriptDesign: string[];          // 話術設計
  closingScript: string;           // 成交收斂
}

export interface ConversionSuggestion {
  studentAnalysis: StudentAnalysis;    // 學員狀況分析
  salesStrategy: SalesStrategy;        // 成交策略
  finalClosingScript: string;          // 完整成交話術
  conversionProbability: number;       // 轉換機率 (0-100)
}

export type ConversionStatus = 'converted' | 'not_converted' | 'pending';

// ============================================================================
// Main Analysis Record
// ============================================================================

export interface TeachingQualityAnalysis {
  id: string;
  attendance_id: string;

  // Teacher and student info
  teacher_id: string;
  teacher_name: string;
  student_name: string;

  // Class information
  class_date: string;
  class_topic?: string;

  // Transcript
  transcript_text: string;
  transcript_file_url?: string;

  // AI Analysis Results
  overall_score: number;
  strengths: AnalysisStrength[];
  weaknesses: AnalysisWeakness[];
  class_summary: string;
  suggestions: ImprovementSuggestion[];

  // Conversion optimization
  conversion_status: ConversionStatus;
  conversion_suggestions?: ConversionSuggestion;  // Single object, not array

  // AI Model Information
  ai_model: string;
  ai_prompt_version: string;

  // Metadata
  analyzed_at: string;
  analyzed_by: string;
  created_at: string;
  updated_at: string;

  // Aggregate data (from JOIN)
  total_suggestions?: number;
  executed_suggestions?: number;
}

// ============================================================================
// Suggestion Execution Log
// ============================================================================

export interface SuggestionExecutionLog {
  id: string;
  analysis_id: string;

  // Suggestion details
  suggestion_index: number;
  suggestion_text: string;

  // Execution tracking
  is_executed: boolean;
  executed_at?: string;
  execution_notes?: string;

  // Effectiveness tracking
  next_analysis_id?: string;
  effectiveness_score?: number; // 1-5
  effectiveness_evidence?: string;

  // Metadata
  marked_by?: string;
  evaluated_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Analysis with Suggestion Logs
// ============================================================================

export interface TeachingQualityAnalysisDetail extends TeachingQualityAnalysis {
  suggestion_logs: SuggestionExecutionLog[];

  // Purchase information (from trial_class_purchases)
  purchased_package?: string;
  remaining_lessons?: number;
}

// ============================================================================
// Teacher Statistics
// ============================================================================

export interface TeacherStatistics {
  total_classes: number;
  avg_score: number;
  converted_count: number;
  not_converted_count: number;
  executed_suggestions: number;
  total_suggestions: number;
  avg_effectiveness?: number;
  score_trend: {
    class_date: string;
    overall_score: number;
  }[];
}

// ============================================================================
// Effectiveness Analysis Result
// ============================================================================

export interface SuggestionEffectivenessAnalysis {
  wasExecuted: boolean;
  effectivenessScore: number; // 1-5
  evidence: string;
  improvements: string[];
  recommendations: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeClassRequest {
  attendanceId: string;
  transcriptText: string;
  transcriptFileUrl?: string;
  classTopic?: string;
}

export interface AnalyzeClassResponse {
  success: boolean;
  data: TeachingQualityAnalysis;
}

export interface GetAnalysesRequest {
  limit?: number;
  offset?: number;
  teacherId?: string;
}

export interface GetAnalysesResponse {
  success: boolean;
  data: TeachingQualityAnalysis[];
  limit: number;
  offset: number;
}

export interface GetAnalysisDetailResponse {
  success: boolean;
  data: TeachingQualityAnalysisDetail;
}

export interface MarkSuggestionExecutedRequest {
  executionNotes?: string;
}

export interface AnalyzeSuggestionEffectivenessRequest {
  nextAnalysisId: string;
}

export interface AnalyzeSuggestionEffectivenessResponse {
  success: boolean;
  data: SuggestionEffectivenessAnalysis;
}

export interface GenerateConversionSuggestionsRequest {
  studentBackground?: string;
}

export interface GenerateConversionSuggestionsResponse {
  success: boolean;
  data: ConversionSuggestion;
}

export interface GetTeacherStatsResponse {
  success: boolean;
  data: TeacherStatistics;
}

export interface EstimateCostRequest {
  transcriptText: string;
}

export interface EstimateCostResponse {
  success: boolean;
  data: {
    transcriptLength: number;
    estimatedCostUSD: string;
    estimatedCostNTD: string;
  };
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AnalysisFilters {
  teacherId?: string;
  dateFrom?: string;
  dateTo?: string;
  minScore?: number;
  maxScore?: number;
  conversionStatus?: ConversionStatus;
}

export interface AnalysisListState {
  analyses: TeachingQualityAnalysis[];
  loading: boolean;
  error: string | null;
  filters: AnalysisFilters;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getScoreColor(score: number): string {
  if (score >= 9) return 'text-green-600';
  if (score >= 7) return 'text-blue-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 9) return 'bg-green-100 text-green-800';
  if (score >= 7) return 'bg-blue-100 text-blue-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export function getEffectivenessLabel(score: number): string {
  switch (score) {
    case 1: return '無效果';
    case 2: return '略有效果';
    case 3: return '中等效果';
    case 4: return '顯著效果';
    case 5: return '極佳效果';
    default: return '未評估';
  }
}

export function getEffectivenessColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-blue-600';
  if (score >= 2) return 'text-yellow-600';
  return 'text-red-600';
}

export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return '最高優先';
    case 2: return '高優先';
    case 3: return '中優先';
    case 4: return '低優先';
    case 5: return '最低優先';
    default: return '未設定';
  }
}

export function getPriorityBadgeColor(priority: number): string {
  if (priority === 1) return 'bg-red-100 text-red-800';
  if (priority === 2) return 'bg-orange-100 text-orange-800';
  if (priority === 3) return 'bg-yellow-100 text-yellow-800';
  if (priority === 4) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

export function getConversionStatusLabel(status: ConversionStatus): string {
  switch (status) {
    case 'converted': return '已轉換';
    case 'not_converted': return '未轉換';
    case 'pending': return '待定';
    default: return '未知';
  }
}

export function getConversionStatusColor(status: ConversionStatus): string {
  switch (status) {
    case 'converted': return 'bg-green-100 text-green-800';
    case 'not_converted': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  });
}
