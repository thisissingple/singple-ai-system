/**
 * GoHighLevel Contacts 管理頁面
 * 顯示從 GoHighLevel webhook 接收的聯絡人資料
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Mail,
  User,
  Search,
  Calendar,
  Tag,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Contact {
  id: string;
  contact_id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string[];
  source: string;
  location_id: string;
  company_name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  today: number;
  week: number;
  bySources: Array<{ source: string; count: number }>;
}

export default function GoHighLevelContacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // 查詢統計資料
  const { data: statsData } = useQuery({
    queryKey: ['/api/gohighlevel/stats'],
    queryFn: async () => {
      const response = await fetch('/api/gohighlevel/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入統計資料');
      const result = await response.json();
      return result.data as Stats;
    },
  });

  // 查詢聯絡人列表
  const { data: contactsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/gohighlevel/contacts', page, searchQuery, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (sourceFilter && sourceFilter !== 'all') params.append('source', sourceFilter);

      const response = await fetch(`/api/gohighlevel/contacts?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入聯絡人資料');
      return response.json();
    },
  });

  const contacts = contactsData?.data || [];
  const pagination = contactsData?.pagination;

  // 處理搜尋
  const handleSearch = () => {
    setPage(1); // 重置到第一頁
    refetch();
  };

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GoHighLevel 聯絡人</h1>
          <p className="text-muted-foreground mt-1">
            管理從 GoHighLevel webhook 接收的聯絡人資料
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          重新整理
        </Button>
      </div>

      {/* 統計卡片 */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                總聯絡人數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                今日新增
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsData.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本週新增
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statsData.week}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                來源數量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statsData.bySources?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選與搜尋 */}
      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 搜尋 */}
            <div className="space-y-2">
              <Label>搜尋（姓名/電話/Email）</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入關鍵字..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 來源篩選 */}
            <div className="space-y-2">
              <Label>來源</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇來源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部來源</SelectItem>
                  {statsData?.bySources?.map((src) => (
                    <SelectItem key={src.source} value={src.source}>
                      {src.source} ({src.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 清除篩選 */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('all');
                  setPage(1);
                }}
              >
                清除篩選
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 聯絡人列表 */}
      <Card>
        <CardHeader>
          <CardTitle>聯絡人列表</CardTitle>
          <CardDescription>
            {pagination && `共 ${pagination.total} 筆資料，第 ${pagination.page} / ${pagination.totalPages} 頁`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              尚無聯絡人資料
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>聯絡方式</TableHead>
                      <TableHead>來源</TableHead>
                      <TableHead>標籤</TableHead>
                      <TableHead>建立時間</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact: Contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{contact.name}</div>
                              {contact.company_name && (
                                <div className="text-xs text-muted-foreground">
                                  {contact.company_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {contact.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{contact.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {contact.source ? (
                            <Badge variant="secondary">{contact.source}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">未指定</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">無標籤</span>
                            )}
                            {contact.tags && contact.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(contact.created_at), 'yyyy/MM/dd HH:mm', {
                              locale: zhTW,
                            })}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedContact(contact)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    第 {pagination.page} / {pagination.totalPages} 頁
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 聯絡人詳情對話框（簡單版） */}
      {selectedContact && (
        <Card className="fixed inset-0 m-auto w-full max-w-2xl h-fit z-50 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedContact.name}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedContact(null)}
              >
                關閉
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">姓名</Label>
                <div>{selectedContact.name}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">電話</Label>
                <div>{selectedContact.phone || '-'}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div>{selectedContact.email || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">來源</Label>
                <div>{selectedContact.source || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">公司</Label>
                <div>{selectedContact.company_name || '-'}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">標籤</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedContact.tags && selectedContact.tags.length > 0 ? (
                    selectedContact.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">無標籤</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">建立時間</Label>
                <div>
                  {format(new Date(selectedContact.created_at), 'yyyy/MM/dd HH:mm', {
                    locale: zhTW,
                  })}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">更新時間</Label>
                <div>
                  {format(new Date(selectedContact.updated_at), 'yyyy/MM/dd HH:mm', {
                    locale: zhTW,
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 背景遮罩 */}
      {selectedContact && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
