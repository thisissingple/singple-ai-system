/**
 * User Impersonation Page
 * Allows admins to impersonate other users for testing and troubleshooting
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Search, AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles: string[];
  status: string;
}

export default function UserImpersonationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users list
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users-list');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Start impersonation mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/impersonate/${userId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start impersonation');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: '成功',
        description: `已切換為 ${data.user.email} 的視角`,
      });
      // Refresh the page to apply new user context
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Stop impersonation mutation
  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/stop-impersonate', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop impersonation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '成功',
        description: '已返回管理員視角',
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Refresh the page
      window.location.href = '/settings/user-impersonation';
    },
    onError: (error: any) => {
      toast({
        title: '錯誤',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const users: User[] = usersData?.data || [];

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query)
    );
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-purple-100 text-purple-800',
      teacher: 'bg-blue-100 text-blue-800',
      consultant: 'bg-green-100 text-green-800',
      setter: 'bg-yellow-100 text-yellow-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用戶模擬</h1>
          <p className="text-muted-foreground mt-1">
            以其他用戶身份登入,測試權限和功能
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => stopImpersonationMutation.mutate()}
          disabled={stopImpersonationMutation.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          返回管理員視角
        </Button>
      </div>

      {/* Warning banner */}
      <Card className="border-yellow-500 bg-yellow-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">注意事項</h3>
            <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
              <li>切換用戶視角後,所有操作都會以該用戶的權限執行</li>
              <li>請勿在模擬時進行敏感操作或修改重要數據</li>
              <li>使用完畢後請記得點擊「返回管理員視角」</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>選擇要模擬的用戶</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋用戶 (姓名或 email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users list */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '找不到符合的用戶' : '沒有可用的用戶'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => impersonateMutation.mutate(user.id)}
                      disabled={impersonateMutation.isPending}
                    >
                      切換視角
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
