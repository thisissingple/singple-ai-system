import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Save,
  X,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles?: string[];
  department?: string;
  status: string;
  created_at: string;
  last_login_at?: string;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles: string[];
  department: string;
  status: string;
}

const roleOptions = [
  { value: 'admin', label: '管理員' },
  { value: 'teacher', label: '教練' },
  { value: 'consultant', label: '諮詢師' },
  { value: 'setter', label: '電訪人員' },
  { value: 'staff', label: '行政人員' },
  { value: 'user', label: '一般使用者' },
];

const statusOptions = [
  { value: 'active', label: '啟用' },
  { value: 'inactive', label: '停用' },
];

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    roles: [],
    department: '',
    status: 'active',
  });

  // 載入使用者列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('載入失敗');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: '載入失敗',
        description: error instanceof Error ? error.message : '無法載入使用者列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 重置表單
  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      roles: [],
      department: '',
      status: 'active',
    });
    setEditingUser(null);
  };

  // 開啟編輯對話框
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'user',
      roles: user.roles || [],
      department: user.department || '',
      status: user.status || 'active',
    });
    setShowAddDialog(true);
  };

  // 切換角色（多重角色）
  const toggleRole = (roleValue: string) => {
    setFormData((prev) => {
      const newRoles = prev.roles.includes(roleValue)
        ? prev.roles.filter((r) => r !== roleValue)
        : [...prev.roles, roleValue];
      return { ...prev, roles: newRoles };
    });
  };

  // 儲存使用者
  const handleSave = async () => {
    // 驗證
    if (!formData.email || !formData.first_name) {
      toast({
        title: '請填寫必填欄位',
        description: 'Email 和姓名為必填',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '儲存失敗');
      }

      toast({
        title: editingUser ? '更新成功' : '新增成功',
        description: `使用者 ${formData.first_name} ${formData.last_name} 已${editingUser ? '更新' : '新增'}`,
      });

      setShowAddDialog(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '無法儲存使用者',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // 刪除使用者
  const handleDelete = async (user: User) => {
    if (!confirm(`確定要刪除使用者 ${user.first_name} ${user.last_name} 嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('刪除失敗');

      toast({
        title: '刪除成功',
        description: `使用者 ${user.first_name} ${user.last_name} 已刪除`,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: '刪除失敗',
        description: error instanceof Error ? error.message : '無法刪除使用者',
        variant: 'destructive',
      });
    }
  };

  // 取得角色標籤
  const getRoleLabel = (role: string) => {
    return roleOptions.find((r) => r.value === role)?.label || role;
  };

  // 取得狀態標籤
  const getStatusLabel = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.label || status;
  };

  return (
    <DashboardLayout sidebarConfig={sidebarConfig}>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">使用者管理</h1>
            <p className="text-muted-foreground mt-2">
              管理系統使用者、角色與權限
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                新增使用者
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? '編輯使用者' : '新增使用者'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="user@example.com"
                    disabled={!!editingUser}
                  />
                </div>

                {/* 姓名 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      名字 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      placeholder="例：小明"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">姓氏</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      placeholder="例：王"
                    />
                  </div>
                </div>

                {/* 主要角色 */}
                <div className="space-y-2">
                  <Label htmlFor="role">主要角色</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 多重角色 */}
                <div className="space-y-2">
                  <Label>額外角色（可多選）</Label>
                  <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
                    {roleOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${option.value}`}
                          checked={formData.roles.includes(option.value)}
                          onCheckedChange={() => toggleRole(option.value)}
                        />
                        <label
                          htmlFor={`role-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 部門 */}
                <div className="space-y-2">
                  <Label htmlFor="department">部門</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="例：教學部"
                  />
                </div>

                {/* 狀態 */}
                <div className="space-y-2">
                  <Label htmlFor="status">狀態</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 按鈕 */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    儲存
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 使用者列表 */}
        <Card>
          <CardHeader>
            <CardTitle>使用者列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>主要角色</TableHead>
                      <TableHead>所有角色</TableHead>
                      <TableHead>部門</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>建立時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-8"
                        >
                          尚無使用者
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(user.roles || []).map((role) => (
                                <span
                                  key={role}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  {getRoleLabel(role)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{user.department || '-'}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {getStatusLabel(user.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('zh-TW')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(user)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
