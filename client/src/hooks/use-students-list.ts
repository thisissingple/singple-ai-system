/**
 * Hook for fetching students list with filters
 */

import { useQuery } from '@tanstack/react-query';

export interface StudentListItem {
  id: string;
  student_email: string;
  student_name: string;
  total_classes: number;
  total_consultations: number;
  total_interactions: number;
  first_contact_date: string | null;
  last_interaction_date: string | null;
  conversion_status: string | null;
  consultation_status: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // New fields
  phone: string | null;
  total_spent: number;
  teacher: string | null;
  consultant: string | null;
  last_interaction: {
    type: 'class' | 'consultation' | 'purchase';
    date: string;
  } | null;
}

export interface StudentsListResponse {
  students: StudentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filterOptions: {
    teachers: string[];
    consultants: string[];
  };
}

interface UseStudentsListParams {
  page?: number;
  limit?: number;
  search?: string;
  showDeleted?: boolean;
  // Filter params
  teacher?: string;
  consultant?: string;
  conversionStatus?: 'renewed_high' | 'purchased_high' | 'purchased_trial' | 'not_purchased' | '';
  consultationStatus?: 'consulted' | 'no_show' | 'not_consulted' | '';
  lastInteraction?: 'today' | '3days' | '7days' | '30days' | 'over30days' | '';
}

export function useStudentsList({
  page = 1,
  limit = 20,
  search = '',
  showDeleted = false,
  teacher = '',
  consultant = '',
  conversionStatus = '',
  consultationStatus = '',
  lastInteraction = ''
}: UseStudentsListParams = {}) {
  return useQuery({
    queryKey: ['students-list', page, limit, search, showDeleted, teacher, consultant, conversionStatus, consultationStatus, lastInteraction],
    queryFn: async (): Promise<StudentsListResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        showDeleted: showDeleted.toString(),
      });

      // Add filter params if provided
      if (teacher) params.append('teacher', teacher);
      if (consultant) params.append('consultant', consultant);
      if (conversionStatus) params.append('conversionStatus', conversionStatus);
      if (consultationStatus) params.append('consultationStatus', consultationStatus);
      if (lastInteraction) params.append('lastInteraction', lastInteraction);

      const response = await fetch(`/api/students/list?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch students list');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30000, // 30 seconds
  });
}
