import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon, 
  Download, 
  RefreshCw,
  ChevronDown,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { type SheetData } from '@shared/schema';

interface DataFiltersProps {
  data: SheetData[];
  onFilterChange: (filteredData: SheetData[]) => void;
  onExport: (filteredData: SheetData[], format: 'csv' | 'json') => void;
  isLoading?: boolean;
}

interface FilterState {
  search: string;
  status: string;
  category: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  customFilters: Record<string, string>;
}

export function DataFilters({ data, onFilterChange, onExport, isLoading = false }: DataFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    category: 'all',
    dateRange: {
      from: undefined,
      to: undefined,
    },
    customFilters: {},
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({});
  const [currentFilteredData, setCurrentFilteredData] = useState<SheetData[]>([]);

  // Extract available columns and unique values from data
  useEffect(() => {
    if (data.length === 0) return;

    const columns = new Set<string>();
    const valueMap: Record<string, Set<string>> = {};

    data.forEach(row => {
      Object.keys(row.data).forEach(key => {
        columns.add(key);
        if (!valueMap[key]) valueMap[key] = new Set();
        const value = String(row.data[key] || '').trim();
        if (value) valueMap[key].add(value);
      });
    });

    setAvailableColumns(Array.from(columns));
    
    const uniqueValuesMap: Record<string, string[]> = {};
    Object.entries(valueMap).forEach(([key, values]) => {
      uniqueValuesMap[key] = Array.from(values).slice(0, 20); // Limit to 20 options
    });
    setUniqueValues(uniqueValuesMap);
  }, [data]);

  // Apply filters to data
  useEffect(() => {
    let filtered = [...data];
    setCurrentFilteredData(filtered);

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row.data).some(value =>
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(row => {
        const status = row.data.Status || row.data.status || row.data.狀態 || '';
        return String(status).toLowerCase().includes(filters.status.toLowerCase());
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(row => {
        const category = row.data.Category || row.data.category || row.data.類別 || row.data.Type || '';
        return String(category).toLowerCase() === filters.category.toLowerCase();
      });
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(row => {
        const rowDate = new Date(row.lastUpdated || '');
        if (isNaN(rowDate.getTime())) return true;
        
        if (filters.dateRange.from && rowDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && rowDate > filters.dateRange.to) return false;
        return true;
      });
    }

    // Custom column filters
    Object.entries(filters.customFilters).forEach(([column, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(row => {
          const rowValue = String(row.data[column] || '').toLowerCase();
          return rowValue.includes(value.toLowerCase());
        });
      }
    });

    onFilterChange(filtered);
    setCurrentFilteredData(filtered);
    
    // Count active filters
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    count += Object.values(filters.customFilters).filter(v => v && v !== 'all').length;
    setActiveFiltersCount(count);
  }, [filters, data, onFilterChange]);

  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      dateRange: {
        from: undefined,
        to: undefined,
      },
      customFilters: {},
    });
  };

  const updateCustomFilter = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      customFilters: {
        ...prev.customFilters,
        [column]: value,
      },
    }));
  };

  const getStatusOptions = () => {
    const statuses = new Set<string>();
    data.forEach(row => {
      const status = row.data.Status || row.data.status || row.data.狀態 || '';
      if (status) statuses.add(String(status));
    });
    return Array.from(statuses);
  };

  const getCategoryOptions = () => {
    const categories = new Set<string>();
    data.forEach(row => {
      const category = row.data.Category || row.data.category || row.data.類別 || row.data.Type || '';
      if (category) categories.add(String(category));
    });
    return Array.from(categories);
  };

  return (
    <Card className="glass-card dark:glass-card-dark border-0 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Data Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Filter and search through your data
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(currentFilteredData, 'csv')}
              disabled={isLoading}
              className="glass dark:glass-dark"
              data-testid="export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(currentFilteredData, 'json')}
              disabled={isLoading}
              className="glass dark:glass-dark"
              data-testid="export-json"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
                data-testid="clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="glass dark:glass-dark border-0">
            <TabsTrigger value="basic">Basic Filters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="date">Date Range</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search all fields..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 glass dark:glass-dark"
                    data-testid="search-input"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="glass dark:glass-dark" data-testid="status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {getStatusOptions().map(status => (
                      <SelectItem key={status} value={status.toLowerCase()}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="glass dark:glass-dark" data-testid="category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getCategoryOptions().map(category => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableColumns.slice(0, 6).map(column => (
                <div key={column} className="space-y-2">
                  <Label htmlFor={`filter-${column}`}>{column}</Label>
                  <Select 
                    value={filters.customFilters[column] || 'all'} 
                    onValueChange={(value) => updateCustomFilter(column, value)}
                  >
                    <SelectTrigger className="glass dark:glass-dark">
                      <SelectValue placeholder={`All ${column.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {column}</SelectItem>
                      {(uniqueValues[column] || []).map(value => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {availableColumns.length > 6 && (
              <div className="text-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Settings className="h-4 w-4 mr-2" />
                  Show More Columns ({availableColumns.length - 6} more)
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="date" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="glass dark:glass-dark w-full justify-start text-left font-normal"
                      data-testid="date-from"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        format(filters.dateRange.from, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="glass dark:glass-dark w-full justify-start text-left font-normal"
                      data-testid="date-to"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? (
                        format(filters.dateRange.to, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: date } 
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {(filters.dateRange.from || filters.dateRange.to) && (
              <div className="flex items-center gap-2 p-3 glass dark:glass-dark rounded-lg">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Filtering data from{' '}
                  {filters.dateRange.from ? format(filters.dateRange.from, "MMM dd, yyyy") : 'beginning'}{' '}
                  to{' '}
                  {filters.dateRange.to ? format(filters.dateRange.to, "MMM dd, yyyy") : 'now'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { from: undefined, to: undefined } 
                  }))}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Filter Summary */}
        {activeFiltersCount > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  />
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                  />
                </Badge>
              )}
              {filters.category !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Category: {filters.category}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
                  />
                </Badge>
              )}
              {(filters.dateRange.from || filters.dateRange.to) && (
                <Badge variant="secondary" className="gap-1">
                  Date Range
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { from: undefined, to: undefined } 
                    }))}
                  />
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}