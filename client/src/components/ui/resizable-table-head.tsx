/**
 * Resizable Table Head
 * Google Sheets-style resizable column header
 */

import { useState, useRef, useEffect } from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableTableHeadProps {
  children: React.ReactNode;
  width?: number;
  onResize?: (newWidth: number) => void;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function ResizableTableHead({
  children,
  width,
  onResize,
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  align = 'left',
}: ResizableTableHeadProps) {
  const [isResizing, setIsResizing] = useState(false);
  const thRef = useRef<HTMLTableCellElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;

      if (onResize) {
        onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = thRef.current?.offsetWidth || width || 100;
  };

  return (
    <TableHead
      ref={thRef}
      className={cn(
        'relative select-none whitespace-nowrap',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
      style={{ width: width ? `${width}px` : undefined, minWidth: width ? `${width}px` : undefined }}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Content */}
        <div
          className={cn(
            'flex items-center gap-1 flex-1',
            sortable && 'cursor-pointer hover:text-foreground',
            align === 'center' && 'justify-center',
            align === 'right' && 'justify-end'
          )}
          onClick={sortable && onSort ? onSort : undefined}
        >
          <span>{children}</span>
          {sortable && (
            <span className="inline-flex">
              {sortDirection === null && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
              {sortDirection === 'asc' && <ArrowUp className="h-3 w-3" />}
              {sortDirection === 'desc' && <ArrowDown className="h-3 w-3" />}
            </span>
          )}
        </div>

        {/* Resize Handle */}
        {onResize && (
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
              isResizing && 'bg-primary'
            )}
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </TableHead>
  );
}
