import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Spreadsheet, type Worksheet, type InsertSpreadsheet } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

// Sync worksheet response type
export interface SyncWorksheetResponse {
  success: boolean;
  data: Worksheet;
  syncStats: {
    totalRows: number;
    insertedToSupabase: number;
    invalidRows: number;
    mappedFields: number;
    hasSyncedToSupabase: boolean;
    invalidRecords?: Array<{ rowIndex: number; errors: string[] }>;
  };
}

// 獲取所有 Spreadsheets
export function useSpreadsheets() {
  return useQuery({
    queryKey: ['/api/spreadsheets'],
    queryFn: async (): Promise<Spreadsheet[]> => {
      return apiRequest<Spreadsheet[]>('GET', '/api/spreadsheets');
    },
  });
}

// 獲取特定 Spreadsheet 的 Worksheets
export function useWorksheets(spreadsheetId: string) {
  return useQuery({
    queryKey: ['/api/spreadsheets', spreadsheetId, 'worksheets'],
    queryFn: async (): Promise<Worksheet[]> => {
      if (!spreadsheetId) return [];
      return apiRequest<Worksheet[]>('GET', `/api/spreadsheets/${spreadsheetId}/worksheets`);
    },
    enabled: !!spreadsheetId,
  });
}

// 獲取工作表數據
export function useSheetData(
  spreadsheetId: string,
  page = 1,
  limit = 50,
  search = ''
) {
  return useQuery({
    queryKey: ['/api/worksheets', spreadsheetId, 'data', { page, limit, search }],
    queryFn: async () => {
      if (!spreadsheetId) return { data: [], pagination: null };

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      return apiRequest('GET', `/api/worksheets/${spreadsheetId}/data?${params}`);
    },
    enabled: !!spreadsheetId,
  });
}

// 創建新的 Spreadsheet
export function useCreateSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertSpreadsheet): Promise<Spreadsheet> => {
      return apiRequest<Spreadsheet>('POST', '/api/spreadsheets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
    },
  });
}

// 同步 Spreadsheet
export function useSyncSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetId: string): Promise<void> => {
      return apiRequest('POST', `/api/spreadsheets/${spreadsheetId}/sync`);
    },
    onSuccess: (_, spreadsheetId) => {
      // 全局列表更新
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });

      // 精準失效：該 spreadsheet 的 worksheets 列表
      queryClient.invalidateQueries({
        queryKey: ['/api/spreadsheets', spreadsheetId, 'worksheets']
      });

      // 精準失效：該 spreadsheet 的數據
      queryClient.invalidateQueries({
        queryKey: ['/api/worksheets', spreadsheetId, 'data']
      });
    },
  });
}

// 刪除 Spreadsheet
export function useDeleteSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetId: string): Promise<void> => {
      return apiRequest('DELETE', `/api/spreadsheets/${spreadsheetId}`);
    },
    onSuccess: (_, spreadsheetId) => {
      // 全局列表更新
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });

      // 移除該 spreadsheet 的相關快取
      queryClient.invalidateQueries({
        queryKey: ['/api/spreadsheets', spreadsheetId, 'worksheets']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/worksheets', spreadsheetId, 'data']
      });

      // 刷新所有 worksheets 查詢（包含「已啟用工作表總覽」）
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/worksheets';
        }
      });
    },
  });
}

// 切換 Worksheet 啟用狀態
export function useToggleWorksheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      worksheet,
      isEnabled
    }: {
      worksheet: Worksheet;
      isEnabled: boolean;
    }): Promise<Worksheet> => {
      return apiRequest<Worksheet>('PUT', `/api/worksheets/${worksheet.id}/toggle`, {
        isEnabled,
        spreadsheetId: worksheet.spreadsheetId,
        gid: worksheet.gid,
        worksheetName: worksheet.worksheetName,
        range: worksheet.range ?? 'A1:Z1000'
      });
    },
    onSuccess: (updatedWorksheet: Worksheet, { worksheet }) => {
      const spreadsheetId = updatedWorksheet?.spreadsheetId || worksheet.spreadsheetId;

      // 精準失效：該 spreadsheet 的 worksheets 列表
      queryClient.invalidateQueries({
        queryKey: ['/api/spreadsheets', spreadsheetId, 'worksheets']
      });

      // 精準失效：該 worksheet 的數據
      queryClient.invalidateQueries({
        queryKey: ['/api/worksheets', spreadsheetId, 'data']
      });

      // 全局 spreadsheets 列表
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });

      // 全局 worksheets 查詢（用於「已啟用工作表總覽」）
      queryClient.invalidateQueries({ queryKey: ['/api/worksheets'] });
    },
  });
}

// 更新 Worksheet 狀態 (用於範圍等設定)
export function useUpdateWorksheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      worksheetId,
      updates
    }: {
      worksheetId: string;
      updates: { range?: string }
    }): Promise<Worksheet> => {
      return apiRequest<Worksheet>('PUT', `/api/worksheets/${worksheetId}`, updates);
    },
    onSuccess: (worksheet: Worksheet) => {
      // 精準失效：更新該 spreadsheet 的 worksheets 列表
      queryClient.invalidateQueries({
        queryKey: ['/api/spreadsheets', worksheet.spreadsheetId, 'worksheets']
      });

      // 精準失效：更新該 worksheet 的數據
      queryClient.invalidateQueries({
        queryKey: ['/api/worksheets', worksheet.spreadsheetId, 'data']
      });

      // 全局列表更新
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
    },
  });
}

// 同步單個 Worksheet 資料
export function useSyncSingleWorksheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worksheetId: string): Promise<SyncWorksheetResponse> => {
      // 直接使用 fetch，因為 apiRequest 只回傳 data，會丟掉 syncStats
      const response = await fetch(`/api/worksheets/${worksheetId}/sync`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const json = await response.json();
      return json as SyncWorksheetResponse;
    },
    onSuccess: (response: SyncWorksheetResponse) => {
      const worksheet = response.data;

      // 安全檢查：確保 worksheet 存在
      if (!worksheet) {
        console.warn('⚠️  Sync response missing worksheet data, invalidating all queries');
        queryClient.invalidateQueries({ queryKey: ['/api/worksheets'] });
        queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
        return;
      }

      // 精準失效：更新該 spreadsheet 的 worksheets 列表
      queryClient.invalidateQueries({
        queryKey: ['/api/spreadsheets', worksheet.spreadsheetId, 'worksheets']
      });

      // 精準失效：更新該 worksheet 的數據
      queryClient.invalidateQueries({
        queryKey: ['/api/worksheets', worksheet.id, 'data']
      });

      // 全局 worksheets 查詢
      queryClient.invalidateQueries({ queryKey: ['/api/worksheets'] });

      // 全局 spreadsheets 列表
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
    },
  });
}

// 同步 Spreadsheet 的所有啟用工作表（支援 worksheet-level Supabase mapping）
export function useSyncEnabledWorksheets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spreadsheetId: string): Promise<Spreadsheet> => {
      return apiRequest<Spreadsheet>('POST', `/api/spreadsheets/${spreadsheetId}/sync-worksheets`);
    },
    onSuccess: (data: Spreadsheet) => {
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets', data.id, 'worksheets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets', data.id, 'data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spreadsheets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/worksheets'] });
    },
  });
}

// Get all Supabase tables
export function useSupabaseTables() {
  return useQuery<string[]>({
    queryKey: ['/api/supabase/tables'],
    queryFn: async () => apiRequest<string[]>('GET', '/api/supabase/tables'),
  });
}

// Set Supabase table mapping for a worksheet
export function useSetWorksheetSupabaseMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ worksheetId, supabaseTable }: { worksheetId: string; supabaseTable: string }) => {
      return apiRequest('PUT', `/api/worksheets/${worksheetId}/supabase-mapping`, { supabaseTable });
    },
    onSuccess: (_, { worksheetId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/worksheets'] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/worksheets' || (typeof key === 'string' && key.includes('/worksheets'));
        }
      });
    },
  });
}

// Create a new Supabase table
export function useCreateSupabaseTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableName, columns }: { tableName: string; columns?: any[] }) => {
      return apiRequest('POST', '/api/supabase/tables', { tableName, columns });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supabase/tables'] });
    },
  });
}
