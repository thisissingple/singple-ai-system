import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Worksheet, Spreadsheet } from '@shared/schema';

interface InvalidRecord {
  rowIndex: number;
  errors: string[];
  rowData?: Record<string, any>;
  missingFields?: string[];                 // Supabase 欄位名稱（snake_case）
  missingGoogleSheetColumns?: string[];    // Google Sheets 欄位名稱（用於 highlight）
}

interface InvalidRecordsTableProps {
  invalidRecords: InvalidRecord[];
  worksheet: Worksheet;
  spreadsheet?: Spreadsheet;
  onResync?: () => void;
}

export function InvalidRecordsTable({ invalidRecords, worksheet, spreadsheet, onResync }: InvalidRecordsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  if (!invalidRecords || invalidRecords.length === 0) {
    return null;
  }

  // 構建 Google Sheets URL
  const getGoogleSheetsUrl = (rowIndex?: number) => {
    if (!spreadsheet?.spreadsheetId) {
      return '#';
    }
    const baseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}`;
    if (worksheet.gid) {
      // 跳轉到特定工作表和列
      const range = rowIndex !== undefined ? `#gid=${worksheet.gid}&range=A${rowIndex + 2}` : `#gid=${worksheet.gid}`;
      return `${baseUrl}${range}`;
    }
    return baseUrl;
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          未同步資料 ({invalidRecords.length} 筆)
        </CardTitle>
        <CardDescription>
          以下資料因為缺少必填欄位，未能同步到 Supabase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">工作表</TableHead>
                <TableHead className="w-[150px]">Google Sheets 位置</TableHead>
                <TableHead>錯誤原因</TableHead>
                <TableHead className="w-[120px]">資料預覽</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invalidRecords.map((record, idx) => (
                <Fragment key={`record-${idx}`}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(getGoogleSheetsUrl(), '_blank')}
                      >
                        {worksheet.worksheetName}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="font-mono p-0"
                        onClick={() => window.open(getGoogleSheetsUrl(record.rowIndex), '_blank')}
                      >
                        第 {record.rowIndex + 2} 列 →
                      </Button>
                    </TableCell>
                    <TableCell className="text-destructive text-sm">
                      {record.errors.map((error, i) => (
                        <div key={i}>• {error}</div>
                      ))}
                      {record.missingFields && record.missingFields.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          欄位：{record.missingFields.join('、')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.rowData && Object.keys(record.rowData).length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(idx)}
                          className="gap-1"
                        >
                          {expandedRows.has(idx) ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              收起
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              查看
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">無資料</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(idx) && record.rowData && (
                    <TableRow key={`${idx}-preview`}>
                      <TableCell colSpan={4} className="bg-muted/30">
                        <div className="p-4 space-y-2">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            第 {record.rowIndex + 2} 列完整資料預覽：
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(record.rowData).map(([key, value]) => {
                              // 使用 Google Sheets 欄位名稱來 highlight
                              const isMissing = record.missingGoogleSheetColumns?.includes(key) || false;

                              return (
                                <div
                                  key={key}
                                  className={`p-2 rounded border ${isMissing ? 'border-destructive bg-destructive/5' : 'border-border'}`}
                                >
                                  <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    {key}
                                    {isMissing && (
                                      <Badge variant="destructive" className="text-xs px-1 py-0">
                                        缺少
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm break-words">
                                    {value !== null && value !== undefined && value !== ''
                                      ? String(value)
                                      : <span className="text-muted-foreground italic">（空白）</span>
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="font-medium">💡 如何修正：</div>
              <div className="pl-4">
                1. 點擊「工作表」按鈕開啟 Google Sheets<br />
                2. 點擊「第 X 列」快速跳轉到錯誤位置<br />
                3. 填寫缺少的必填欄位<br />
                4. 點擊「重新同步」完成修正
              </div>
            </div>
            {onResync && (
              <Button onClick={onResync} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                重新同步
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
