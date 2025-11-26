/**
 * Student Profile Hook
 * 學員完整檔案查詢 Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from './use-toast';

// ============================================================================
// Types
// ============================================================================

export interface StudentProfileSummary {
  basicInfo: {
    age?: string;
    occupation?: string;
    decisionMaker?: boolean;
    priceSensitivity?: string;
    discoveredAt?: string;
    lastUpdatedAt?: string;
  };
  painPoints: Array<{
    point: string;
    occurrences: number;
    firstMentioned: string;
    lastMentioned: string;
  }>;
  goals: {
    desiredOutcome?: string;
    intendedUsage?: string;
    motivation?: string;
    lastUpdatedAt?: string;
  };
  psychologicalState: {
    confidence?: string;
    barriers?: string[];
    emotionalState?: string;
  };
  purchaseHistory: Array<{
    packageName: string;
    purchaseDate: string;
    amount: number;
  }>;
  conversionBarriers: string[];
  savedInsights?: Array<{
    conversationId: string;
    question: string;
    answer: string;
    savedAt: string;
  }>;
}

export interface StudentDataSources {
  trial_classes: string[];
  eods_records: string[];
  ai_analyses: string[];
  purchases: string[];
}

export interface StudentKnowledgeBase {
  id: string;
  student_email: string;
  student_name: string;
  profile_summary: StudentProfileSummary;
  data_sources: StudentDataSources;
  ai_pregenerated_insights: {
    painPointAnalysis?: string;
    conversionStrategy?: string;
    conversionProbability?: number;
    executionEvaluation?: string;
    nextSteps?: string;
    generatedAt?: string;
  };
  total_classes: number;
  total_consultations: number;
  total_interactions: number;
  first_contact_date: string | null;
  last_interaction_date: string | null;
  conversion_status: 'renewed_high' | 'purchased_high' | 'purchased_trial' | 'not_purchased' | 'not_converted' | 'converted' | 'in_progress' | null;
  created_at: string;
  updated_at: string;
}

export interface TrialClassRecord {
  id: string;
  student_email: string;
  student_name: string;
  class_date: string;
  teacher_id?: string;
  teacher_name?: string;
  attendance_status?: string;
  is_showed?: boolean;
  notes?: string;
  class_time?: string;
  course_type?: string;
  created_at?: string;
}

export interface EodsRecord {
  id: string;
  student_email: string;
  student_name?: string;
  closer_id?: string;
  closer_name?: string;
  deal_date?: string;
  plan_name?: string;
  deal_amount?: number;
  conversion_probability?: number;
  consultation_notes?: string;
  deal_status?: string;
  created_at?: string;
}

export interface AIAnalysisRecord {
  id: string;
  attendance_id?: string;
  teacher_id?: string;
  teaching_score?: number;
  interaction_score?: number;
  design_score?: number;
  overall_score?: number;
  ai_suggestions?: string;
  analyzed_at: string;
}

export interface PurchaseRecord {
  id: string;
  student_email: string;
  student_name?: string;
  purchase_date: string;
  course_type?: string;
  amount?: number;
  status?: string;
  payment_method?: string;
  phone?: string;
  created_at?: string;
}

export interface StudentFullContext {
  kb: StudentKnowledgeBase;
  trialClasses: TrialClassRecord[];
  eodsRecords: EodsRecord[];
  aiAnalyses: AIAnalysisRecord[];
  consultationAnalyses: any[];  // Consultation AI analyses
  aiConversations: any[];  // Teacher AI conversations
  consultantConversations: any[];  // Consultant AI conversations
  chatRecaps: any[];  // Consultation chat recaps
  purchases: PurchaseRecord[];
  totalAiCost: number;  // Total AI cost from all sources (4 sources)
}

export interface PresetQuestion {
  id: string;
  label: string;
  questionType: string;
  description?: string;
}

export interface Conversation {
  id: string;
  teacher_id: string;
  student_email: string;
  question: string;
  question_type?: string;
  answer: string;
  created_at: string;
  tokens_used?: number;
  api_cost_usd?: number;
  response_time_ms?: number;
  is_cached?: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchStudentProfile(email: string): Promise<StudentFullContext> {
  const res = await fetch(`/api/teaching-quality/student/${encodeURIComponent(email)}/profile`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '查詢學員檔案失敗');
  }
  const data = await res.json();
  return data.data;
}

async function fetchPresetQuestions(): Promise<PresetQuestion[]> {
  const res = await fetch('/api/teaching-quality/preset-questions');
  if (!res.ok) {
    throw new Error('取得預設問題列表失敗');
  }
  const data = await res.json();
  return data.data;
}

async function askPresetQuestion(
  email: string,
  questionType: string
): Promise<{ conversation: Conversation; cachedAnswer: boolean }> {
  const res = await fetch(`/api/teaching-quality/student/${encodeURIComponent(email)}/ask-preset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionType }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'AI 問題查詢失敗');
  }
  const data = await res.json();
  return data.data;
}

async function askCustomQuestion(
  email: string,
  question: string
): Promise<{ conversation: Conversation }> {
  const res = await fetch(`/api/teaching-quality/student/${encodeURIComponent(email)}/ask-custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'AI 問題查詢失敗');
  }
  const data = await res.json();
  return data.data;
}

async function fetchConversations(
  email: string,
  limit: number = 20
): Promise<Conversation[]> {
  const res = await fetch(
    `/api/teaching-quality/student/${encodeURIComponent(email)}/conversations?limit=${limit}`
  );
  if (!res.ok) {
    throw new Error('取得對話歷史失敗');
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 查詢學員完整檔案
 */
export function useStudentProfile(email: string | null) {
  return useQuery({
    queryKey: ['student-profile', email],
    queryFn: () => fetchStudentProfile(email!),
    enabled: !!email,
    staleTime: 2 * 60 * 1000, // 2 分鐘內視為新鮮
    retry: 1,
  });
}

/**
 * 取得預設問題列表
 */
export function usePresetQuestions() {
  return useQuery({
    queryKey: ['preset-questions'],
    queryFn: fetchPresetQuestions,
    staleTime: 10 * 60 * 1000, // 10 分鐘
  });
}

/**
 * 詢問預設問題 Mutation
 */
export function useAskPresetQuestion(email: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionType: string) => askPresetQuestion(email, questionType),
    onSuccess: () => {
      // 重新查詢對話歷史
      queryClient.invalidateQueries({ queryKey: ['conversations', email] });
      queryClient.invalidateQueries({ queryKey: ['student-profile', email] });
    },
    onError: (error: Error) => {
      toast({
        title: 'AI 問題查詢失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * 詢問自訂問題 Mutation
 */
export function useAskCustomQuestion(email: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (question: string) => askCustomQuestion(email, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', email] });
    },
    onError: (error: Error) => {
      toast({
        title: 'AI 問題查詢失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * 取得對話歷史
 */
export function useConversations(email: string | null, limit: number = 20) {
  return useQuery({
    queryKey: ['conversations', email, limit],
    queryFn: () => fetchConversations(email!, limit),
    enabled: !!email,
    staleTime: 1 * 60 * 1000, // 1 分鐘
  });
}
