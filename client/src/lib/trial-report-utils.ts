/**
 * Utility functions for Total Report
 * Handles search, sorting, filtering, and export operations
 */

import type {
  TotalReportData,
  TeacherInsight,
  StudentInsight,
  MultiSortConfig,
  ExportFormat,
  RawDataRow,
} from '@/types/trial-report';

/**
 * Search function - searches across teacher and student data
 */
export function searchReportData(
  data: TotalReportData,
  searchTerm: string
): { teachers: TeacherInsight[]; students: StudentInsight[] } {
  const term = searchTerm.toLowerCase().trim();

  if (!term) {
    return {
      teachers: data.teacherInsights,
      students: data.studentInsights,
    };
  }

  const filteredTeachers = data.teacherInsights.filter(
    (teacher) =>
      teacher.teacherName.toLowerCase().includes(term) ||
      teacher.teacherId.toLowerCase().includes(term) ||
      teacher.aiSummary.toLowerCase().includes(term)
  );

  const filteredStudents = data.studentInsights.filter(
    (student) =>
      student.studentName.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term) ||
      student.teacherName.toLowerCase().includes(term) ||
      student.recommendedAction.toLowerCase().includes(term) ||
      student.status.toLowerCase().includes(term)
  );

  return {
    teachers: filteredTeachers,
    students: filteredStudents,
  };
}

/**
 * Multi-field sorting with priority
 * Supports stacked sorting (e.g., first by conversion rate, then by class count)
 */
export function sortWithPriority<T extends Record<string, any>>(
  data: T[],
  sortConfigs: MultiSortConfig[]
): T[] {
  if (sortConfigs.length === 0) return data;

  // Sort configs by priority (1 = highest)
  const sortedConfigs = [...sortConfigs].sort((a, b) => a.priority - b.priority);

  return [...data].sort((a, b) => {
    for (const config of sortedConfigs) {
      const { field, direction } = config;
      const aValue = a[field];
      const bValue = b[field];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'zh-TW');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'zh-TW');
      }

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

/**
 * Simple single-field sorting
 */
export function sortByField<T extends Record<string, any>>(
  data: T[],
  field: string,
  direction: 'asc' | 'desc'
): T[] {
  return sortWithPriority(data, [{ field, direction, priority: 1 }]);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }

  // Create blob and download
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], filename: string): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prepare teacher data for export
 */
export function prepareTeacherExportData(teachers: TeacherInsight[]): any[] {
  return teachers.map((teacher) => ({
    教師ID: teacher.teacherId,
    教師姓名: teacher.teacherName,
    授課數: teacher.classCount,
    學生數: teacher.studentCount,
    轉換率: `${teacher.conversionRate.toFixed(1)}%`,
    平均滿意度: teacher.avgSatisfaction.toFixed(1),
    總收入: teacher.totalRevenue,
    AI建議: teacher.aiSummary,
  }));
}

/**
 * Prepare student data for export
 */
export function prepareStudentExportData(students: StudentInsight[]): any[] {
  return students.map((student) => ({
    學生ID: student.studentId,
    學生姓名: student.studentName,
    Email: student.email,
    上課日期: student.classDate,
    教師: student.teacherName,
    狀態: student.status,
    意向分數: student.intentScore,
    推薦下一步: student.recommendedAction,
    最後聯繫: student.lastContactDate || '',
    成交金額: student.dealAmount || 0,
    音檔連結: student.audioTranscriptUrl || '',
    AI備註: student.aiNotes || '',
  }));
}

/**
 * Prepare raw data for export
 */
export function prepareRawDataExport(rawData: RawDataRow[]): any[] {
  return rawData.map((row) => ({
    ID: row.id,
    資料來源: row.source,
    最後更新: row.lastUpdated,
    ...row.data,
  }));
}

/**
 * Calculate statistics for filtered data
 */
export interface DataStatistics {
  totalCount: number;
  convertedCount: number;
  pendingCount: number;
  lostCount: number;
  avgIntentScore: number;
  totalRevenue: number;
}

export function calculateStudentStatistics(students: StudentInsight[]): DataStatistics {
  const stats: DataStatistics = {
    totalCount: students.length,
    convertedCount: 0,
    pendingCount: 0,
    lostCount: 0,
    avgIntentScore: 0,
    totalRevenue: 0,
  };

  let intentScoreSum = 0;

  for (const student of students) {
    switch (student.status) {
      case 'converted':
        stats.convertedCount++;
        stats.totalRevenue += student.dealAmount || 0;
        break;
      case 'pending':
      case 'contacted':
        stats.pendingCount++;
        break;
      case 'lost':
        stats.lostCount++;
        break;
    }
    intentScoreSum += student.intentScore;
  }

  stats.avgIntentScore = students.length > 0 ? intentScoreSum / students.length : 0;

  return stats;
}

/**
 * Filter students by status
 */
export function filterStudentsByStatus(
  students: StudentInsight[],
  statuses: string[]
): StudentInsight[] {
  if (statuses.length === 0) return students;
  return students.filter((student) => statuses.includes(student.status));
}

/**
 * Filter by date range
 */
export function filterByDateRange(
  students: StudentInsight[],
  startDate: string,
  endDate: string
): StudentInsight[] {
  return students.filter((student) => {
    const classDate = new Date(student.classDate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return classDate >= start && classDate <= end;
  });
}

/**
 * Get top N items
 */
export function getTopN<T>(data: T[], n: number): T[] {
  return data.slice(0, Math.min(n, data.length));
}
