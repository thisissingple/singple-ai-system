import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Shield,
  Save,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

interface PermissionModule {
  id: string;
  module_id: string;
  module_name: string;
  module_category: string;
  description: string | null;
  supports_scope: boolean;
  display_order: number;
  is_active: boolean;
}

interface UserPermission {
  module_id: string;
  scope: 'all' | 'own_only';
  is_active: boolean;
}

interface PermissionState {
  [moduleId: string]: {
    enabled: boolean;
    scope: 'all' | 'own_only';
  };
}

const categoryLabels: Record<string, string> = {
  teacher_system: '教師系統',
  telemarketing_system: '電訪系統',
  consultant_system: '諮詢師系統',
  management_system: '管理系統',
};

export default function PermissionsManagement() {
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [originalPermissions, setOriginalPermissions] = useState<PermissionState>({});

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const isAdmin = selectedUser?.roles?.includes('admin') || selectedUser?.roles?.includes('super_admin');
  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  // Fetch users
  useEffect(() => {
    fetchUsers();
    fetchModules();
  }, []);

  // Fetch user permissions when user is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        const errorMsg = '您沒有權限訪問此頁面，請先登入';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
        setError(''); // Clear error on success
      } else {
        throw new Error(data.message || '載入使用者失敗');
      }
    } catch (error: any) {
      console.error('fetchUsers error:', error);
      setError(error.message || '載入使用者失敗');
      toast({
        title: '錯誤',
        description: error.message || '載入使用者失敗',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const response = await fetch('/api/permissions/modules');

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('您沒有權限訪問此頁面，請先登入');
      }

      const data = await response.json();

      if (data.success) {
        setModules(data.data || []);
      } else {
        throw new Error(data.error || '載入權限模組失敗');
      }
    } catch (error: any) {
      console.error('fetchModules error:', error);
      toast({
        title: '錯誤',
        description: error.message || '載入權限模組失敗',
        variant: 'destructive',
      });
    } finally {
      setLoadingModules(false);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    setLoadingPermissions(true);
    try {
      const response = await fetch(`/api/permissions/user/${userId}`);

      // Check for authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('您沒有權限訪問此頁面，請先登入');
      }

      const data = await response.json();

      if (data.success) {
        const userPermissions: UserPermission[] = data.data || [];

        // Convert to state format
        const permissionState: PermissionState = {};
        userPermissions.forEach((perm) => {
          permissionState[perm.module_id] = {
            enabled: perm.is_active,
            scope: perm.scope,
          };
        });

        setPermissions(permissionState);
        setOriginalPermissions(JSON.parse(JSON.stringify(permissionState)));
      } else {
        throw new Error(data.error || '載入使用者權限失敗');
      }
    } catch (error: any) {
      console.error('fetchUserPermissions error:', error);
      toast({
        title: '錯誤',
        description: error.message || '載入使用者權限失敗',
        variant: 'destructive',
      });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleToggleModule = (moduleId: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        enabled: checked,
        scope: prev[moduleId]?.scope || 'all',
      },
    }));
  };

  const handleScopeChange = (moduleId: string, scope: 'all' | 'own_only') => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        enabled: prev[moduleId]?.enabled || false,
        scope,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast({
        title: '錯誤',
        description: '請選擇一個使用者',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Convert permission state to API format
      const permissionsArray = Object.entries(permissions)
        .filter(([_, perm]) => perm.enabled)
        .map(([module_id, perm]) => ({
          module_id,
          scope: perm.scope,
          is_active: true,
        }));

      const response = await fetch(`/api/permissions/user/${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: permissionsArray }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '成功',
          description: '權限設定已儲存',
        });

        // Refresh permissions
        await fetchUserPermissions(selectedUserId);
      } else {
        throw new Error(data.error || '儲存權限失敗');
      }
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '儲存權限失敗',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  // Group modules by category
  const modulesByCategory = modules.reduce((acc, module) => {
    if (!acc[module.module_category]) {
      acc[module.module_category] = [];
    }
    acc[module.module_category].push(module);
    return acc;
  }, {} as Record<string, PermissionModule[]>);

  return (
    <DashboardLayout
      title="權限管理"
      sidebarSections={sidebarConfig}
    >
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  權限管理
                </CardTitle>
                <CardDescription>
                  手動分配使用者可以存取的功能模組
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-900">無法載入權限管理頁面</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Selection */}
        {!error && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-4 w-4" />
              選擇使用者
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="user-select" className="min-w-[80px]">
                  使用者
                </Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={loadingUsers}
                >
                  <SelectTrigger id="user-select" className="flex-1 max-w-md">
                    <SelectValue placeholder="選擇使用者..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>目前角色：</span>
                  {selectedUser.roles?.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))}
                  {isAdmin && (
                    <Badge variant="default" className="ml-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      管理員（擁有所有權限）
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>}

        {/* Permissions Configuration */}
        {!error && selectedUserId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">功能權限設定</CardTitle>
                  <CardDescription>
                    勾選使用者可以存取的功能模組，並設定資料範圍
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={saving}
                    >
                      重置
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !hasChanges || isAdmin}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        儲存中...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        儲存變更
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPermissions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isAdmin ? (
                <div className="flex items-center gap-3 p-6 bg-muted/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    此使用者為管理員，自動擁有所有功能的完整存取權限，無需額外設定。
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(modulesByCategory).map(
                    ([category, categoryModules]) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">
                            {categoryLabels[category] || category}
                          </h3>
                          <Badge variant="outline">
                            {categoryModules.length} 個模組
                          </Badge>
                        </div>

                        <div className="space-y-3 pl-4">
                          {categoryModules.map((module) => {
                            const perm = permissions[module.module_id] || {
                              enabled: false,
                              scope: 'all',
                            };

                            return (
                              <div
                                key={module.module_id}
                                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <Checkbox
                                  id={module.module_id}
                                  checked={perm.enabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleModule(
                                      module.module_id,
                                      checked as boolean
                                    )
                                  }
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-2">
                                  <Label
                                    htmlFor={module.module_id}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {module.module_name}
                                  </Label>
                                  {module.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {module.description}
                                    </p>
                                  )}

                                  {/* Scope Selection */}
                                  {module.supports_scope && perm.enabled && (
                                    <RadioGroup
                                      value={perm.scope}
                                      onValueChange={(value) =>
                                        handleScopeChange(
                                          module.module_id,
                                          value as 'all' | 'own_only'
                                        )
                                      }
                                      className="flex gap-4 pt-2"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value="all"
                                          id={`${module.module_id}-all`}
                                        />
                                        <Label
                                          htmlFor={`${module.module_id}-all`}
                                          className="text-xs font-normal cursor-pointer"
                                        >
                                          查看所有資料
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value="own_only"
                                          id={`${module.module_id}-own`}
                                        />
                                        <Label
                                          htmlFor={`${module.module_id}-own`}
                                          className="text-xs font-normal cursor-pointer"
                                        >
                                          僅查看自己的資料
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <Separator />
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!selectedUserId && !error && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <Shield className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="font-semibold">開始設定權限</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    請先從上方選擇一個使用者，然後勾選他們可以存取的功能模組。
                    您可以為每個模組設定資料範圍（查看所有資料或僅自己的資料）。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
