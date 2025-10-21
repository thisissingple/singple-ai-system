import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Download,
  Filter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { type Spreadsheet, type SheetData } from '@shared/schema';

interface DataDetailsViewProps {
  spreadsheet: Spreadsheet | null;
  sheetData: SheetData[];
  totalRecords: number;
  onExport: (data: SheetData[], format: 'csv' | 'json') => void;
}

interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

export function DataDetailsView({ 
  spreadsheet, 
  sheetData, 
  totalRecords, 
  onExport 
}: DataDetailsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const itemsPerPage = 20;

  // Get all available columns
  const columns = useMemo(() => {
    if (sheetData.length === 0) return [];
    const allColumns = new Set<string>();
    sheetData.forEach(row => {
      Object.keys(row.data).forEach(key => allColumns.add(key));
    });
    return Array.from(allColumns);
  }, [sheetData]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...sheetData]; // Create a copy to avoid mutating props

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row.data).some(value =>
          String(value).toLowerCase().includes(term)
        )
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = String(a.data[sortConfig.key!] || '').toLowerCase();
        const bVal = String(b.data[sortConfig.key!] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [sheetData, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (columnKey: string) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map(row => row.id)));
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">空</span>;
    }
    const str = String(value);
    if (str.length > 50) {
      return (
        <div className="group relative">
          <span className="truncate block">{str.substring(0, 47)}...</span>
          <div className="absolute left-0 top-full mt-1 p-2 bg-popover border rounded shadow-lg max-w-xs z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {str}
          </div>
        </div>
      );
    }
    return str;
  };

  if (!spreadsheet) {
    return (
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Spreadsheet Selected</h3>
            <p className="text-sm text-muted-foreground">
              Please select a spreadsheet to view detailed data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="data-details-view">
      {/* Search and Actions Bar */}
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                詳細數據檢視
              </CardTitle>
              <CardDescription>
                {spreadsheet.name} - 總計 {processedData.length} 筆記錄
                {selectedRows.size > 0 && (
                  <span className="ml-2 text-primary">
                    ({selectedRows.size} 筆已選擇)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedRows.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selectedData = sheetData.filter(row => selectedRows.has(row.id));
                      onExport(selectedData, 'csv');
                    }}
                    className="glass dark:glass-dark"
                    data-testid="export-selected-csv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    導出已選擇 (CSV)
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport(processedData, 'csv')}
                className="glass dark:glass-dark"
                data-testid="export-all-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                導出全部 (CSV)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索所有欄位..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 glass dark:glass-dark"
                data-testid="input-search-details"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {processedData.length} / {sheetData.length}
              </Badge>
              {sortConfig.key && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  排序: {sortConfig.key} {getSortIcon(sortConfig.key)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                      data-testid="select-all-checkbox"
                    />
                  </TableHead>
                  <TableHead className="w-16">#</TableHead>
                  {columns.map(column => (
                    <TableHead key={column} className="min-w-[120px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column)}
                        className="h-8 px-2 hover:bg-primary/10"
                        data-testid={`sort-${column}`}
                      >
                        <span className="truncate max-w-[100px]">{column}</span>
                        {getSortIcon(column)}
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="w-12">
                    <MoreHorizontal className="h-4 w-4" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow 
                    key={row.id}
                    className={`hover:bg-primary/5 ${selectedRows.has(row.id) ? 'bg-primary/10' : ''}`}
                    data-testid={`data-row-${index}`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleRowSelect(row.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {startIndex + index + 1}
                    </TableCell>
                    {columns.map(column => (
                      <TableCell key={`${row.id}-${column}`} className="max-w-[200px]">
                        {formatCellValue(row.data[column])}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-4">
                <div className="text-sm text-muted-foreground">
                  顯示 {startIndex + 1} - {Math.min(startIndex + itemsPerPage, processedData.length)} 
                  {' '}共 {processedData.length} 筆記錄
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="glass dark:glass-dark"
                    data-testid="prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0 glass dark:glass-dark"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && (
                      <span className="text-muted-foreground">...{totalPages}</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="glass dark:glass-dark"
                    data-testid="next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}