/**
 * 體驗課學員記錄表
 * 顯示每個學員的整體體驗課狀況（一個學員一筆）
 * 複用現有的 StudentInsights 組件邏輯
 */

import { StudentInsights } from './student-insights';
import type { StudentInsight } from '@/types/trial-report';
import type { TeacherClassRecord } from './teacher-insights';

interface StudentRecordsTableProps {
  students: StudentInsight[];
  classRecords?: TeacherClassRecord[];
}

export function StudentRecordsTable({ students, classRecords = [] }: StudentRecordsTableProps) {
  // 直接使用現有的 StudentInsights 組件，它已經包含完整的學員記錄功能
  // 包含：優先級、篩選、排序、學員資訊等
  return <StudentInsights students={students} classRecords={classRecords} initialFilter="all" />;
}
