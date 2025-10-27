/**
 * Database Browser Page
 * 資料庫瀏覽器 - 查看和編輯 Supabase 表格資料
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReportsLayout from '../reports-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export default function DatabaseBrowser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('email');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [addFormData, setAddFormData] = useState<Record<string, any>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // 取得所有表格
  const { data: tablesData } = useQuery({
    queryKey: ['database', 'tables'],
    queryFn: async () => {
      const res = await fetch('/api/database/tables');
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    },
  });

  // 取得表格欄位
  const { data: columnsData } = useQuery({
    queryKey: ['database', 'columns', selectedTable],
    queryFn: async () => {
      if (!selectedTable) return null;
      const res = await fetch(`/api/database/tables/${selectedTable}/columns`);
      if (!res.ok) throw new Error('Failed to fetch columns');
      return res.json();
    },
    enabled: !!selectedTable,
  });

  // 取得表格資料
  const { data: tableData, isLoading } = useQuery({
    queryKey: ['database', 'data', selectedTable, page, searchQuery, searchColumn],
    queryFn: async () => {
      if (!selectedTable) return null;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery, searchColumn }),
      });
      const res = await fetch(`/api/database/${selectedTable}/data?${params}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    },
    enabled: !!selectedTable,
  });

  // 更新資料
  const updateMutation = useMutation({
    mutationFn: async ({ tableName, id, updates }: { tableName: string; id: string; updates: any }) => {
      const res = await fetch(`/api/database/${tableName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', 'data', selectedTable] });
      setIsEditDialogOpen(false);
      setEditingRow(null);
      toast({
        title: "更新成功",
        description: "資料已成功更新",
      });
    },
    onError: (error: any) => {
      toast({
        title: "更新失敗",
        description: error.message || "無法更新資料",
        variant: "destructive",
      });
    },
  });

  // 新增資料
  const addMutation = useMutation({
    mutationFn: async ({ tableName, data }: { tableName: string; data: any }) => {
      const res = await fetch(`/api/database/${tableName}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', 'data', selectedTable] });
      setIsAddDialogOpen(false);
      setAddFormData({});
      toast({
        title: "新增成功",
        description: "資料已成功新增",
      });
    },
    onError: (error: any) => {
      toast({
        title: "新增失敗",
        description: error.message || "無法新增資料",
        variant: "destructive",
      });
    },
  });

  // 刪除資料
  const deleteMutation = useMutation({
    mutationFn: async ({ tableName, id }: { tableName: string; id: string }) => {
      const res = await fetch(`/api/database/${tableName}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', 'data', selectedTable] });
      toast({
        title: "刪除成功",
        description: "資料已成功刪除",
      });
    },
    onError: (error: any) => {
      toast({
        title: "刪除失敗",
        description: error.message || "無法刪除資料",
        variant: "destructive",
      });
    },
  });

  const tables: string[] = tablesData?.tables || [];
  const columns: ColumnInfo[] = columnsData?.columns || [];
  const data = tableData?.data || [];
  const pagination = tableData?.pagination;

  const handleAdd = () => {
    // 初始化新增表單資料
    const initialData: Record<string, any> = {};
    columns
      .filter(col => !['id', 'created_at', 'updated_at'].includes(col.column_name))
      .forEach(col => {
        initialData[col.column_name] = '';
      });
    setAddFormData(initialData);
    setIsAddDialogOpen(true);
  };

  const handleSaveAdd = () => {
    if (!selectedTable) return;

    // 移除空值和不需要的欄位
    const dataToSubmit: Record<string, any> = {};
    Object.entries(addFormData).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        dataToSubmit[key] = value;
      }
    });

    addMutation.mutate({
      tableName: selectedTable,
      data: dataToSubmit,
    });
  };

  const handleEdit = (row: any) => {
    setEditingRow(row);
    setEditFormData({ ...row });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRow || !selectedTable) return;

    // 移除不需要更新的欄位
    const { id, created_at, updated_at, ...updates } = editFormData;

    updateMutation.mutate({
      tableName: selectedTable,
      id: editingRow.id,
      updates,
    });
  };

  const handleDelete = (row: any) => {
    if (!selectedTable) return;
    if (confirm(`確定要刪除這筆資料嗎？\nID: ${row.id}`)) {
      deleteMutation.mutate({
        tableName: selectedTable,
        id: row.id,
      });
    }
  };

  const handleSearch = () => {
    setPage(1); // 重置到第一頁
  };

  // 當選擇表格時，重置搜尋和頁碼
  useEffect(() => {
    setSearchQuery('');
    setPage(1);
  }, [selectedTable]);

  // 當欄位資料載入後，設定預設搜尋欄位
  useEffect(() => {
    if (columns.length > 0) {
      // 優先順序：email > name > id（第一個欄位）
      const emailCol = columns.find(col => col.column_name.includes('email'));
      const nameCol = columns.find(col => col.column_name.includes('name'));
      const idCol = columns.find(col => col.column_name === 'id');

      if (emailCol) {
        setSearchColumn(emailCol.column_name);
      } else if (nameCol) {
        setSearchColumn(nameCol.column_name);
      } else if (idCol) {
        setSearchColumn(idCol.column_name);
      } else if (columns[0]) {
        setSearchColumn(columns[0].column_name);
      }
    }
  }, [columns]);

  return (
    <ReportsLayout title="資料庫瀏覽器">
      <div className="p-6 space-y-4">
        {/* 頂部工具列 */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="請選擇資料表" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTable && (
            <>
              <div className="h-6 w-px bg-gray-300" />
              <Select value={searchColumn} onValueChange={setSearchColumn}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.column_name} value={col.column_name}>
                      {col.column_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={`搜尋 ${searchColumn}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleSearch} size="sm">搜尋</Button>
              <div className="h-6 w-px bg-gray-300" />
              <Button onClick={handleAdd} size="sm" variant="default" className="gap-1">
                <Plus className="h-4 w-4" />
                新增紀錄
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                共 {pagination?.total || 0} 筆
              </div>
            </>
          )}
        </div>

        {/* 表格區域 - 類似 Google Sheets */}
        {selectedTable && (
          <div className="bg-white rounded-lg border overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">載入中...</div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">沒有資料</div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.column_name}
                          className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 relative group"
                          style={{
                            minWidth: columnWidths[col.column_name] || 150,
                            width: columnWidths[col.column_name] || 150,
                          }}
                        >
                          <div className="truncate">{col.column_name}</div>
                          {/* 調整大小控制器 */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-blue-500 group-hover:bg-blue-300"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const startX = e.clientX;
                              const startWidth = columnWidths[col.column_name] || 150;

                              const handleMouseMove = (e: MouseEvent) => {
                                const diff = e.clientX - startX;
                                const newWidth = Math.max(80, startWidth + diff);
                                setColumnWidths(prev => ({
                                  ...prev,
                                  [col.column_name]: newWidth
                                }));
                              };

                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };

                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }}
                          />
                        </th>
                      ))}
                      <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-700 bg-gray-50 w-[100px] sticky right-0">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row: any, rowIndex: number) => (
                      <tr
                        key={row.id}
                        className={`${rowIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'} ${
                          (updateMutation.isPending || deleteMutation.isPending) ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {columns.map((col) => (
                          <td
                            key={col.column_name}
                            className="border border-gray-200 px-3 py-2 text-gray-900"
                            style={{
                              minWidth: columnWidths[col.column_name] || 150,
                              width: columnWidths[col.column_name] || 150,
                            }}
                          >
                            <div className="truncate" title={String(row[col.column_name] || '')}>
                              {row[col.column_name] !== null && row[col.column_name] !== undefined
                                ? String(row[col.column_name])
                                : '-'}
                            </div>
                          </td>
                        ))}
                        <td className="border border-gray-200 px-2 py-2 text-center sticky right-0 bg-inherit">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(row)}
                              className="h-7 w-7 p-0"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(row)}
                              className="h-7 w-7 p-0 hover:text-red-600"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 底部分頁 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-muted-foreground">
                  第 {pagination.page} / {pagination.totalPages} 頁
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    下一頁
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* 編輯對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!updateMutation.isPending) {
          setIsEditDialogOpen(open);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯資料</DialogTitle>
            <DialogDescription>
              編輯 {selectedTable} 的資料
            </DialogDescription>
          </DialogHeader>

          {/* 載入遮罩 */}
          {updateMutation.isPending && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-700">正在儲存資料...</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {columns.filter(col => !['id', 'created_at', 'updated_at'].includes(col.column_name)).map((col) => (
              <div key={col.column_name} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={col.column_name} className="text-right">
                  {col.column_name}
                </Label>
                <Input
                  id={col.column_name}
                  value={editFormData[col.column_name] || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    [col.column_name]: e.target.value
                  })}
                  className="col-span-3"
                  disabled={updateMutation.isPending}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!addMutation.isPending) {
          setIsAddDialogOpen(open);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增資料</DialogTitle>
            <DialogDescription>
              在 {selectedTable} 表格中新增一筆資料
            </DialogDescription>
          </DialogHeader>

          {/* 載入遮罩 */}
          {addMutation.isPending && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-700">正在新增資料...</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 py-4">
            {columns.filter(col => !['id', 'created_at', 'updated_at'].includes(col.column_name)).map((col) => (
              <div key={col.column_name} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`add-${col.column_name}`} className="text-right">
                  {col.column_name}
                  {col.is_nullable === 'NO' && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={`add-${col.column_name}`}
                  value={addFormData[col.column_name] || ''}
                  onChange={(e) => setAddFormData({
                    ...addFormData,
                    [col.column_name]: e.target.value
                  })}
                  className="col-span-3"
                  placeholder={col.data_type}
                  disabled={addMutation.isPending}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setAddFormData({});
              }}
              disabled={addMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  新增中...
                </>
              ) : (
                '新增'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ReportsLayout>
  );
}
