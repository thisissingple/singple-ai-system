/**
 * Raw Data Table Component
 * Collapsible wrapper for displaying raw data from Google Sheets
 * Uses existing DataTable component for consistency
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RawDataRow } from '@/types/trial-report';

interface RawDataTableProps {
  rawData: RawDataRow[];
}

export function RawDataTable({ rawData }: RawDataTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (rawData.length === 0) {
    return null;
  }

  // Extract headers from first row
  const headers = rawData.length > 0 ? Object.keys(rawData[0].data) : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              原始資料表格
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    收合
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    展開查看 ({rawData.length} 筆)
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-4">
              顯示符合搜尋與排序條件的原始資料。此表格資料來源：
              {rawData.length > 0 && rawData[0].source}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      {headers.map((header) => (
                        <TableHead key={header} className="min-w-[120px]">
                          {header}
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[150px]">最後更新</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.map((row, index) => (
                      <TableRow key={row.id || index} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          {row.id.substring(0, 8)}...
                        </TableCell>
                        {headers.map((header) => (
                          <TableCell key={`${row.id}-${header}`} className="text-sm">
                            {formatCellValue(row.data[header])}
                          </TableCell>
                        ))}
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.lastUpdated).toLocaleString('zh-TW')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              共 {rawData.length} 筆原始資料 · 來源: {rawData[0]?.source || '未知'}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Format cell value for display
 */
function formatCellValue(value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof value === 'number') {
    // Check if it looks like a currency amount
    if (value >= 1000) {
      return `NT$ ${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    // Check if it's an email
    if (value.includes('@')) {
      return <span className="text-blue-600">{value}</span>;
    }

    // Check if it's a date
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return value;
    }
  }

  return String(value);
}
