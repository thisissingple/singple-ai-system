import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { type SheetData, type Spreadsheet, type Worksheet } from '@shared/schema';

interface DataTableProps {
  data: SheetData[];
  spreadsheet: Spreadsheet | null;
  worksheet?: Worksheet | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  isLive?: boolean;
  isLoading?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function DataTable({ data, spreadsheet, worksheet, pagination, onPageChange, isLive, isLoading }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterTerm, setFilterTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  if (!spreadsheet) {
    return (
      <Card data-testid="empty-table">
        <CardContent className="p-8 text-center text-muted-foreground">
          尚未選擇資料來源
        </CardContent>
      </Card>
    );
  }

  // Use worksheet headers if available, otherwise fall back to spreadsheet headers
  const headers = (worksheet?.headers || spreadsheet.headers || []) as string[];
  const normalizedFilter = filterTerm.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedFilter) return data;
    return data.filter((row) => {
      const values = row.data || {};
      return headers.some((header) => {
        const value = values?.[header];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(normalizedFilter);
      });
    });
  }, [data, headers, normalizedFilter]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) return filteredRows;
    const { key, direction } = sortConfig;
    return [...filteredRows].sort((a, b) => {
      const valueA = a.data?.[key];
      const valueB = b.data?.[key];
      const asString = valueA === null || valueA === undefined ? '' : String(valueA);
      const bsString = valueB === null || valueB === undefined ? '' : String(valueB);
      if (asString === bsString) return 0;
      if (direction === 'asc') {
        return asString.localeCompare(bsString, undefined, { numeric: true, sensitivity: 'base' });
      }
      return bsString.localeCompare(asString, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredRows, sortConfig]);

  // Calculate pagination
  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') return 1;
    return Math.ceil(sortedRows.length / rowsPerPage);
  }, [sortedRows.length, rowsPerPage]);

  // Reset to page 1 when changing rows per page or filtering
  const effectiveCurrentPage = Math.min(currentPage, totalPages);

  // Apply rows per page limit with pagination
  const paginatedRows = useMemo(() => {
    if (rowsPerPage === 'all') return sortedRows;
    const startIndex = (effectiveCurrentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, rowsPerPage, effectiveCurrentPage]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(value === 'all' ? 'all' : parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  const handleSort = (header: string) => {
    setSortConfig((current) => {
      if (current?.key === header) {
        return {
          key: header,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: header, direction: 'asc' };
    });
  };

  const renderSortIcon = (header: string) => {
    if (!sortConfig || sortConfig.key !== header) {
      return <MoreHorizontal size={12} className="text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  const formatCell = (header: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return '';
    const stringValue = String(value);

    if (header.toLowerCase().includes('日期') || header.toLowerCase().includes('date')) {
      return stringValue;
    }

    if (header.toLowerCase().includes('金額') || header.toLowerCase().includes('amount') || header.toLowerCase().includes('revenue')) {
      const numeric = Number(stringValue.replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(numeric)) {
        return `NT$ ${numeric.toLocaleString()}`;
      }
    }

    if (header.toLowerCase().includes('email') && stringValue.includes('@')) {
      return <span className="text-blue-600">{stringValue}</span>;
    }

    return stringValue;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          載入中…
        </CardContent>
      </Card>
    );
  }

  const rowsToRender = paginatedRows;

  if (!rowsToRender.length) {
    return (
      <Card data-testid="no-data-table">
        <CardHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{spreadsheet.name}</h2>
              <p className="text-sm text-muted-foreground">目前沒有資料可顯示</p>
            </div>
            <Input
              value={filterTerm}
              onChange={(event) => setFilterTerm(event.target.value)}
              placeholder="搜尋資料…"
              className="w-52"
            />
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          啟用同步後，這裡會顯示 Google Sheets 的內容。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden" data-testid="data-table">
      <CardHeader className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold" data-testid="table-title">
              {worksheet?.worksheetName || spreadsheet.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {worksheet ? `${spreadsheet.name} - 顯示 ${sortedRows.length} 列資料` : '顯示 Google Sheets 的原始資料'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(rowsPerPage)}
              onValueChange={handleRowsPerPageChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="顯示列數" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 列</SelectItem>
                <SelectItem value="50">50 列</SelectItem>
                <SelectItem value="100">100 列</SelectItem>
                <SelectItem value="all">全部 ({sortedRows.length})</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span data-testid="row-count">{paginatedRows.length} / {sortedRows.length} 列</span>
              <span data-testid="column-count">{headers.length} 欄</span>
              {rowsPerPage !== 'all' && totalPages > 1 && (
                <span>第 {effectiveCurrentPage} / {totalPages} 頁</span>
              )}
              {isLive && (
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              )}
            </div>
            <Input
              value={filterTerm}
              onChange={(event) => setFilterTerm(event.target.value)}
              placeholder="搜尋資料…"
              className="w-52"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <button
                      onClick={() => handleSort(header)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors"
                      data-testid={`sort-${header}`}
                    >
                      <span>{header}</span>
                      {renderSortIcon(header)}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, index) => (
                <TableRow key={row.id ?? `${row.worksheetId}-${row.rowIndex}-${index}`} className="hover:bg-muted/20 transition-colors">
                  {headers.map((header) => (
                    <TableCell key={`${row.id ?? row.rowIndex}-${header}`} className="px-6 py-3 whitespace-nowrap text-sm">
                      {formatCell(header, row.data?.[header])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Custom pagination for local data */}
        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                顯示第 {((effectiveCurrentPage - 1) * (rowsPerPage as number)) + 1} - {Math.min(effectiveCurrentPage * (rowsPerPage as number), sortedRows.length)} 列，共 {sortedRows.length} 列
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={effectiveCurrentPage === 1}
                >
                  首頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(effectiveCurrentPage - 1)}
                  disabled={effectiveCurrentPage <= 1}
                >
                  上一頁
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (effectiveCurrentPage <= 3) {
                      pageNum = i + 1;
                    } else if (effectiveCurrentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = effectiveCurrentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={effectiveCurrentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(effectiveCurrentPage + 1)}
                  disabled={effectiveCurrentPage >= totalPages}
                >
                  下一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={effectiveCurrentPage === totalPages}
                >
                  末頁
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Server-side pagination (existing) */}
        {pagination && (
          <div className="px-6 py-4 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                第 {pagination.page} / {pagination.totalPages} 頁（每頁 {pagination.limit} 筆，共 {pagination.total} 筆）
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  上一頁
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  下一頁
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
