/**
 * 員工管理頁面
 * 顯示所有員工列表，支援查看詳情、管理角色身份、薪資與勞健保設定
 */

import { useState, useEffect } from 'react';
import { Plus, Search, Eye, UserPlus, Briefcase, FileText, Shield, Calendar, Key, Copy, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Save, CheckCircle2, Loader2 as Loader2Icon, AlertCircle, Shield as ShieldIcon, LogIn, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type {
  EmployeeData,
  BusinessIdentity,
  IdentityType,
  EmploymentType,
  CommissionType,
} from '@/types/employee';
import {
  getIdentityTypeLabel,
  getEmploymentTypeLabel,
  getCommissionTypeLabel,
  formatCurrency,
} from '@/types/employee';

// 權限相關介面
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

type SortField = 'employee_number' | 'first_name' | 'department' | 'hire_date';
type SortDirection = 'asc' | 'desc';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('employee_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeData | null>(null);
  const [showAddIdentityDialog, setShowAddIdentityDialog] = useState(false);
  const [newIdentityType, setNewIdentityType] = useState<IdentityType>('teacher');
  const [newIdentityDisplayName, setNewIdentityDisplayName] = useState('');
  const [newIdentityEffectiveFrom, setNewIdentityEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showCompensationDialog, setShowCompensationDialog] = useState(false);
  const [compensationData, setCompensationData] = useState({
    base_salary: '',
    commission_type: 'none' as CommissionType,
    effective_from: new Date().toISOString().split('T')[0],
    adjustment_reason: '',
  });
  const [showInsuranceDialog, setShowInsuranceDialog] = useState(false);
  const [insuranceData, setInsuranceData] = useState({
    labor_insurance_grade: '',
    labor_insurance_amount: '',
    health_insurance_grade: '',
    health_insurance_amount: '',
    pension_employer_rate: '0.06',
    pension_employee_rate: '0.06',
    effective_from: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // 新增員工相關狀態
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    department: '',
    roles: ['user'] as string[],
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // 帳號資訊對話框狀態
  const [showAccountInfoDialog, setShowAccountInfoDialog] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    email: '',
    password: '',
    name: '',
  });

  // 重設密碼相關狀態
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    userId: '',
    newPassword: '',
  });
  const [resetPasswordGenerated, setResetPasswordGenerated] = useState('');

  // 刪除員工相關狀態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteEmployeeData, setDeleteEmployeeData] = useState({
    userId: '',
    name: '',
  });

  // 編輯員工相關狀態
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editEmployeeData, setEditEmployeeData] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    department: '',
  });

  // 編輯角色身份相關狀態
  const [showEditIdentityDialog, setShowEditIdentityDialog] = useState(false);
  const [editIdentityData, setEditIdentityData] = useState({
    identityId: '',
    userId: '',
    display_name: '',
    effective_from: '',
    effective_to: '',
  });

  // 編輯薪資相關狀態
  const [showEditCompensationDialog, setShowEditCompensationDialog] = useState(false);
  const [editCompensationData, setEditCompensationData] = useState({
    compensationId: '',
    userId: '',
    base_salary: '',
    commission_type: 'none' as CommissionType,
    commission_rate: '',
    // 階梯式抽成欄位
    tier1_max_revenue: '',
    tier1_commission_amount: '',
    tier2_max_revenue: '',
    tier2_commission_amount: '',
    other_revenue_rate: '',
    effective_from: '',
    adjustment_reason: '',
  });

  // 編輯勞健保相關狀態
  const [showEditInsuranceDialog, setShowEditInsuranceDialog] = useState(false);
  const [editInsuranceData, setEditInsuranceData] = useState({
    insuranceId: '',
    userId: '',
    labor_insurance_grade: '',
    labor_insurance_amount: '',
    health_insurance_grade: '',
    health_insurance_amount: '',
    pension_employer_rate: '',
    pension_employee_rate: '',
    effective_from: '',
    notes: '',
  });

  // Inline editing 狀態 - 薪資
  const [inlineSalary, setInlineSalary] = useState({
    base_salary: '',
  });
  const [salaryChanged, setSalaryChanged] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);

  // Inline editing 狀態 - 教師抽成（被成交：其他諮詢師幫老師成交）
  const [inlineCommission, setInlineCommission] = useState({
    commission_rate: '',
    other_revenue_rate: '',
  });
  const [commissionChanged, setCommissionChanged] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);

  // Inline editing 狀態 - 教師自己成交（老師自己當諮詢師）
  const [selfClosingCommission, setSelfClosingCommission] = useState({
    commission_type: 'fixed_rate' as 'fixed_rate' | 'tiered',
    commission_rate: '',
    other_revenue_rate: '',
    tier1_max_revenue: '',
    tier1_commission_amount: '',
    tier2_max_revenue: '',
    tier2_commission_amount: '',
  });
  const [selfClosingChanged, setSelfClosingChanged] = useState(false);
  const [savingSelfClosing, setSavingSelfClosing] = useState(false);

  // Inline editing 狀態 - 諮詢師抽成
  const [consultantCommission, setConsultantCommission] = useState({
    commission_rate: '15',      // 一般業績 15%
    other_revenue_rate: '8',    // 其他業績 8%
  });
  const [consultantChanged, setConsultantChanged] = useState(false);
  const [savingConsultant, setSavingConsultant] = useState(false);

  // Inline editing 狀態 - 電訪人員抽成
  const [setterCommission, setSetterCommission] = useState({
    commission_rate: '10',      // 一般業績 10%
    other_revenue_rate: '8',    // 其他業績 8%
  });
  const [setterChanged, setSetterChanged] = useState(false);
  const [savingSetter, setSavingSetter] = useState(false);

  // 初始化 inline editing 狀態
  useEffect(() => {
    if (viewingEmployee) {
      // 薪資
      if (viewingEmployee.latest_compensation) {
        const comp = viewingEmployee.latest_compensation;
        setInlineSalary({
          base_salary: comp.base_salary?.toString() || '',
        });
        setSalaryChanged(false);
      }

      // 從 role_commissions 讀取按角色區分的抽成設定
      const roleCommissions = (viewingEmployee as any).role_commissions || {};

      // 教師抽成 - 被成交（其他諮詢師幫老師成交）
      const teacherComm = roleCommissions.teacher || viewingEmployee.latest_compensation;
      if (teacherComm) {
        setInlineCommission({
          commission_rate: teacherComm.commission_rate?.toString() || '',
          other_revenue_rate: teacherComm.other_revenue_rate?.toString() || '',
        });
        setCommissionChanged(false);

        // 教師抽成 - 自己成交（老師自己當諮詢師）
        // TODO: 目前先使用相同資料，之後需要新增獨立欄位儲存
        const commType = teacherComm.commission_type === 'tiered' ? 'tiered' : 'fixed_rate';
        setSelfClosingCommission({
          commission_type: commType as 'fixed_rate' | 'tiered',
          commission_rate: teacherComm.commission_rate?.toString() || '',
          other_revenue_rate: teacherComm.other_revenue_rate?.toString() || '',
          tier1_max_revenue: teacherComm.tier1_max_revenue?.toString() || '',
          tier1_commission_amount: teacherComm.tier1_commission_amount?.toString() || '',
          tier2_max_revenue: teacherComm.tier2_max_revenue?.toString() || '',
          tier2_commission_amount: teacherComm.tier2_commission_amount?.toString() || '',
        });
        setSelfClosingChanged(false);
      }

      // 諮詢師抽成
      const consultantComm = roleCommissions.consultant;
      if (consultantComm) {
        setConsultantCommission({
          commission_rate: consultantComm.commission_rate?.toString() || '15',
          other_revenue_rate: consultantComm.other_revenue_rate?.toString() || '8',
        });
      } else {
        setConsultantCommission({ commission_rate: '15', other_revenue_rate: '8' });
      }
      setConsultantChanged(false);

      // 電訪人員抽成
      const setterComm = roleCommissions.setter;
      if (setterComm) {
        setSetterCommission({
          commission_rate: setterComm.commission_rate?.toString() || '10',
          other_revenue_rate: setterComm.other_revenue_rate?.toString() || '8',
        });
      } else {
        setSetterCommission({ commission_rate: '10', other_revenue_rate: '8' });
      }
      setSetterChanged(false);
    }
  }, [viewingEmployee]);

  // 權限管理相關狀態
  const { toast } = useToast();
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [originalPermissions, setOriginalPermissions] = useState<PermissionState>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // 載入員工列表
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      const data = await response.json();

      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('載入員工列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchModules();
  }, []);

  // 模擬用戶視角
  const handleImpersonate = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/admin/impersonate/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('切換視角失敗');
      }

      const data = await response.json();

      toast({
        title: '成功',
        description: `已切換為 ${userName} 的視角`,
      });

      // Refresh to apply new user context
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '切換視角失敗',
        variant: 'destructive',
      });
    }
  };

  // 載入權限模組列表
  const fetchModules = async () => {
    try {
      const response = await fetch('/api/permissions/modules', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setModules(data.data || []);
      }
    } catch (error: any) {
      console.error('fetchModules error:', error);
    }
  };

  // 載入使用者權限
  const fetchUserPermissions = async (userId: string) => {
    setLoadingPermissions(true);
    try {
      const response = await fetch(`/api/permissions/user/${userId}`, {
        credentials: 'include',
      });
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
      }
    } catch (error: any) {
      console.error('fetchUserPermissions error:', error);
      toast({
        title: '錯誤',
        description: '載入使用者權限失敗',
        variant: 'destructive',
      });
    } finally {
      setLoadingPermissions(false);
    }
  };

  // 切換模組啟用狀態
  const handleToggleModule = (moduleId: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        enabled: checked,
        scope: prev[moduleId]?.scope || 'all',
      },
    }));
  };

  // 修改權限範圍
  const handleScopeChange = (moduleId: string, scope: 'all' | 'own_only') => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        enabled: prev[moduleId]?.enabled || false,
        scope,
      },
    }));
  };

  // 儲存權限
  const handleSavePermissions = async () => {
    if (!viewingEmployee) return;

    setSavingPermissions(true);
    try {
      // Convert permission state to API format
      const permissionsArray = Object.entries(permissions)
        .filter(([_, perm]) => perm.enabled)
        .map(([module_id, perm]) => ({
          module_id,
          scope: perm.scope,
          is_active: true,
        }));

      const response = await fetch(`/api/permissions/user/${viewingEmployee.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ permissions: permissionsArray }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '成功',
          description: '權限設定已儲存',
        });

        // Refresh permissions
        await fetchUserPermissions(viewingEmployee.user.id);
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
      setSavingPermissions(false);
    }
  };

  // 重置權限變更
  const handleResetPermissions = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  // 排序切換功能
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 同一欄位：切換方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 不同欄位：設定新欄位，預設升序
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 過濾和排序員工
  const filteredAndSortedEmployees = employees
    .filter((empData) => {
      const emp = empData.user;
      const profile = empData.profile;
      const searchLower = searchTerm.toLowerCase();
      return (
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        profile?.employee_number?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // 第一優先：固定在職在前，離職在後
      const statusA = a.user.status === 'active' ? 0 : 1;
      const statusB = b.user.status === 'active' ? 0 : 1;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // 第二優先：根據選擇的欄位排序
      let compareResult = 0;

      switch (sortField) {
        case 'employee_number':
          const numA = a.profile?.employee_number || '';
          const numB = b.profile?.employee_number || '';
          compareResult = numA.localeCompare(numB);
          break;

        case 'first_name':
          const nameA = a.user.first_name || '';
          const nameB = b.user.first_name || '';
          compareResult = nameA.localeCompare(nameB);
          break;

        case 'department':
          const deptA = a.user.department || '';
          const deptB = b.user.department || '';
          compareResult = deptA.localeCompare(deptB);
          break;

        case 'hire_date':
          const hireA = a.profile?.hire_date || '';
          const hireB = b.profile?.hire_date || '';
          compareResult = hireA.localeCompare(hireB);
          break;
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

  // 查看員工詳情
  const handleViewDetail = async (empData: EmployeeData) => {
    try {
      // 重新載入完整員工資料
      const response = await fetch(`/api/employees/${empData.user.id}`);
      const data = await response.json();

      if (data.success) {
        setViewingEmployee(data.data);
        setShowDetailDialog(true);
        // 同時載入該員工的權限
        await fetchUserPermissions(empData.user.id);
      }
    } catch (error) {
      console.error('載入員工詳情失敗:', error);
      alert('載入失敗');
    }
  };

  // 新增角色身份
  const handleAddIdentity = async () => {
    if (!viewingEmployee || !newIdentityType) {
      alert('請填寫必要資訊');
      return;
    }

    try {
      const response = await fetch(`/api/employees/${viewingEmployee.user.id}/business-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_type: newIdentityType,
          display_name: newIdentityDisplayName || viewingEmployee.user.first_name,
          effective_from: newIdentityEffectiveFrom,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddIdentityDialog(false);
        setNewIdentityType('teacher');
        setNewIdentityDisplayName('');
        setNewIdentityEffectiveFrom(new Date().toISOString().split('T')[0]);
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
        // 重新載入列表
        fetchEmployees();
      } else {
        alert(data.message || '新增失敗');
      }
    } catch (error) {
      console.error('新增角色身份失敗:', error);
      alert('新增失敗');
    }
  };

  // 停用角色身份
  const handleDeactivateIdentity = async (identityId: string) => {
    if (!viewingEmployee) return;

    if (!confirm('確定要停用此角色身份嗎？')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/business-identity/${identityId}/deactivate`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            effective_to: new Date().toISOString().split('T')[0],
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
        // 重新載入列表
        fetchEmployees();
      } else {
        alert(data.message || '停用失敗');
      }
    } catch (error) {
      console.error('停用角色身份失敗:', error);
      alert('停用失敗');
    }
  };

  // 設定主身份
  const handleSetPrimaryIdentity = async (identityId: string) => {
    if (!viewingEmployee) return;

    try {
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/business-identities/${identityId}/set-primary`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: '設定成功',
          description: '已設定為主身份',
        });
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
        // 重新載入列表
        fetchEmployees();
      } else {
        toast({
          title: '設定失敗',
          description: data.message || '無法設定主身份',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('設定主身份失敗:', error);
      toast({
        title: '設定失敗',
        description: '網路錯誤，請稍後再試',
        variant: 'destructive',
      });
    }
  };

  // 新增薪資設定
  const handleAddCompensation = async () => {
    if (!viewingEmployee) return;

    try {
      const response = await fetch(`/api/employees/${viewingEmployee.user.id}/compensation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_salary: compensationData.base_salary ? parseFloat(compensationData.base_salary) : null,
          commission_type: compensationData.commission_type,
          effective_from: compensationData.effective_from,
          adjustment_reason: compensationData.adjustment_reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowCompensationDialog(false);
        setCompensationData({
          base_salary: '',
          commission_type: 'none',
          effective_from: new Date().toISOString().split('T')[0],
          adjustment_reason: '',
        });
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
        fetchEmployees();
      } else {
        alert(data.message || '新增失敗');
      }
    } catch (error) {
      console.error('新增薪資設定失敗:', error);
      alert('新增失敗');
    }
  };

  // 生成隨機密碼
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // 新增員工
  const handleAddEmployee = async () => {
    if (!newEmployeeData.email || !newEmployeeData.firstName || !newEmployeeData.password) {
      alert('請填寫必要資訊（Email、姓名、密碼）');
      return;
    }

    try {
      const response = await fetch('/api/auth/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployeeData),
      });

      const data = await response.json();

      if (data.success) {
        // 設定帳號資訊並顯示對話框
        setAccountInfo({
          email: newEmployeeData.email,
          password: newEmployeeData.password,
          name: `${newEmployeeData.firstName}${newEmployeeData.lastName ? ' ' + newEmployeeData.lastName : ''}`,
        });
        setShowAccountInfoDialog(true);

        // 關閉新增對話框並重置表單
        setShowAddEmployeeDialog(false);
        setNewEmployeeData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          department: '',
          roles: ['user'],
        });
        setGeneratedPassword('');

        // 重新載入列表
        fetchEmployees();
      } else {
        alert(data.error || '建立失敗');
      }
    } catch (error) {
      console.error('建立員工失敗:', error);
      alert('建立失敗');
    }
  };

  // 重設密碼
  const handleResetPassword = async () => {
    if (!resetPasswordData.newPassword) {
      alert('請填寫新密碼');
      return;
    }

    try {
      const response = await fetch('/api/auth/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetPasswordData.userId,
          newPassword: resetPasswordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 設定帳號資訊並顯示對話框
        setAccountInfo({
          email: viewingEmployee?.user.email || '',
          password: resetPasswordData.newPassword,
          name: `${viewingEmployee?.user.first_name || ''}${viewingEmployee?.user.last_name ? ' ' + viewingEmployee.user.last_name : ''}`,
        });
        setShowAccountInfoDialog(true);

        // 關閉重設密碼對話框並重置表單
        setShowResetPasswordDialog(false);
        setResetPasswordData({
          userId: '',
          newPassword: '',
        });
        setResetPasswordGenerated('');
      } else {
        alert(data.error || '重設失敗');
      }
    } catch (error) {
      console.error('重設密碼失敗:', error);
      alert('重設失敗');
    }
  };

  // 刪除員工
  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeData.userId) {
      alert('請選擇要刪除的員工');
      return;
    }

    try {
      const response = await fetch(`/api/employees/${deleteEmployeeData.userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowDeleteDialog(false);
        setShowDetailDialog(false);
        setDeleteEmployeeData({ userId: '', name: '' });
        // 重新載入員工列表
        fetchEmployees();
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除員工失敗:', error);
      alert('刪除失敗');
    }
  };

  // 編輯員工基本資料
  const handleEditEmployee = async () => {
    if (!editEmployeeData.userId) {
      alert('請選擇要編輯的員工');
      return;
    }

    if (!editEmployeeData.firstName || !editEmployeeData.email) {
      alert('姓名和 Email 為必填');
      return;
    }

    try {
      const response = await fetch(`/api/employees/${editEmployeeData.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editEmployeeData.firstName,
          last_name: editEmployeeData.lastName,
          nickname: editEmployeeData.nickname,
          email: editEmployeeData.email,
          department: editEmployeeData.department,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('員工資料更新成功！');
        setShowEditDialog(false);
        setEditEmployeeData({
          userId: '',
          firstName: '',
          lastName: '',
          nickname: '',
          email: '',
          department: '',
        });
        // 重新載入列表和詳情
        fetchEmployees();
        if (viewingEmployee) {
          handleViewDetail(viewingEmployee);
        }
      } else {
        alert(data.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新員工資料失敗:', error);
      alert('更新失敗');
    }
  };

  // 切換員工狀態（在職 ↔ 離職）
  const handleToggleStatus = async () => {
    if (!viewingEmployee) return;

    const currentStatus = viewingEmployee.user.status;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const statusText = newStatus === 'active' ? '在職' : '離職';

    const confirmed = confirm(`確定要將員工狀態設為「${statusText}」嗎？`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/employees/${viewingEmployee.user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`員工狀態已更新為「${statusText}」`);
        // 重新載入列表和詳情
        fetchEmployees();
        handleViewDetail(viewingEmployee);
      } else {
        alert(data.error || '更新失敗');
      }
    } catch (error) {
      console.error('更新員工狀態失敗:', error);
      alert('更新失敗');
    }
  };

  // 編輯角色身份
  const handleEditIdentity = async () => {
    if (!editIdentityData.identityId || !editIdentityData.userId) {
      alert('請選擇要編輯的角色身份');
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${editIdentityData.userId}/business-identity/${editIdentityData.identityId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            display_name: editIdentityData.display_name,
            effective_from: editIdentityData.effective_from,
            effective_to: editIdentityData.effective_to || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('角色身份更新成功！');
        setShowEditIdentityDialog(false);
        setEditIdentityData({
          identityId: '',
          userId: '',
          display_name: '',
          effective_from: '',
          effective_to: '',
        });
        // 重新載入員工詳情
        if (viewingEmployee) {
          handleViewDetail(viewingEmployee);
        }
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新角色身份失敗:', error);
      alert('更新失敗');
    }
  };

  // 刪除角色身份
  const handleDeleteIdentity = async () => {
    if (!editIdentityData.identityId || !editIdentityData.userId) {
      alert('請選擇要刪除的角色身份');
      return;
    }

    if (!confirm('確定要刪除此角色身份嗎？此操作無法復原！')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${editIdentityData.userId}/business-identity/${editIdentityData.identityId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('角色身份已刪除！');
        setShowEditIdentityDialog(false);
        setEditIdentityData({
          identityId: '',
          userId: '',
          display_name: '',
          effective_from: '',
          effective_to: '',
        });
        // 重新載入員工詳情
        if (viewingEmployee) {
          handleViewDetail(viewingEmployee);
        }
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除角色身份失敗:', error);
      alert('刪除失敗');
    }
  };

  // 編輯薪資記錄
  const handleEditCompensation = async () => {
    if (!editCompensationData.compensationId || !editCompensationData.userId) {
      alert('請選擇要編輯的薪資記錄');
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${editCompensationData.userId}/compensation/${editCompensationData.compensationId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_salary: editCompensationData.base_salary ? parseFloat(editCompensationData.base_salary) : null,
            commission_type: editCompensationData.commission_type,
            commission_rate: editCompensationData.commission_rate ? parseFloat(editCompensationData.commission_rate) : null,
            // 階梯式抽成欄位
            tier1_max_revenue: editCompensationData.tier1_max_revenue ? parseFloat(editCompensationData.tier1_max_revenue) : null,
            tier1_commission_amount: editCompensationData.tier1_commission_amount ? parseFloat(editCompensationData.tier1_commission_amount) : null,
            tier2_max_revenue: editCompensationData.tier2_max_revenue ? parseFloat(editCompensationData.tier2_max_revenue) : null,
            tier2_commission_amount: editCompensationData.tier2_commission_amount ? parseFloat(editCompensationData.tier2_commission_amount) : null,
            other_revenue_rate: editCompensationData.other_revenue_rate ? parseFloat(editCompensationData.other_revenue_rate) : null,
            effective_from: editCompensationData.effective_from,
            adjustment_reason: editCompensationData.adjustment_reason,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('薪資記錄更新成功！');
        setShowEditCompensationDialog(false);
        setEditCompensationData({
          compensationId: '',
          userId: '',
          base_salary: '',
          commission_type: 'none',
          commission_rate: '',
          tier1_max_revenue: '',
          tier1_commission_amount: '',
          tier2_max_revenue: '',
          tier2_commission_amount: '',
          other_revenue_rate: '',
          effective_from: '',
          adjustment_reason: '',
        });
        // 重新載入員工詳情
        if (viewingEmployee) {
          handleViewDetail(viewingEmployee);
        }
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新薪資記錄失敗:', error);
      alert('更新失敗');
    }
  };

  // Inline 儲存薪資資訊 (只更新底薪)
  const handleSaveInlineSalary = async () => {
    if (!viewingEmployee?.latest_compensation) return;

    setSavingSalary(true);
    try {
      const comp = viewingEmployee.latest_compensation;
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/compensation/${comp.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_salary: inlineSalary.base_salary ? parseFloat(inlineSalary.base_salary) : null,
            // 保持其他欄位不變
            commission_type: comp.commission_type,
            commission_rate: comp.commission_rate,
            tier1_max_revenue: comp.tier1_max_revenue,
            tier1_commission_amount: comp.tier1_commission_amount,
            tier2_max_revenue: comp.tier2_max_revenue,
            tier2_commission_amount: comp.tier2_commission_amount,
            other_revenue_rate: comp.other_revenue_rate,
            effective_from: comp.effective_from,
            adjustment_reason: comp.adjustment_reason,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: '已儲存',
          description: '底薪已更新成功',
        });
        setSalaryChanged(false);
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
      } else {
        toast({
          title: '儲存失敗',
          description: data.message || '更新失敗',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新底薪失敗:', error);
      toast({
        title: '儲存失敗',
        description: '更新失敗',
        variant: 'destructive',
      });
    } finally {
      setSavingSalary(false);
    }
  };

  // Inline 儲存抽成資訊（教師角色）
  const handleSaveInlineCommission = async () => {
    if (!viewingEmployee) return;

    setSavingCommission(true);
    try {
      // 使用新的 role-commission API
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/role-commission/teacher`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commission_type: inlineCommission.commission_type,
            commission_rate: inlineCommission.commission_rate ? parseFloat(inlineCommission.commission_rate) : null,
            other_revenue_rate: inlineCommission.other_revenue_rate ? parseFloat(inlineCommission.other_revenue_rate) : null,
            tier1_max_revenue: inlineCommission.tier1_max_revenue ? parseFloat(inlineCommission.tier1_max_revenue) : null,
            tier1_commission_amount: inlineCommission.tier1_commission_amount ? parseFloat(inlineCommission.tier1_commission_amount) : null,
            tier2_max_revenue: inlineCommission.tier2_max_revenue ? parseFloat(inlineCommission.tier2_max_revenue) : null,
            tier2_commission_amount: inlineCommission.tier2_commission_amount ? parseFloat(inlineCommission.tier2_commission_amount) : null,
            notes: `教師抽成更新 ${new Date().toLocaleDateString('zh-TW')}`,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: '已儲存',
          description: '抽成設定已更新成功',
        });
        setCommissionChanged(false);
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
      } else {
        toast({
          title: '儲存失敗',
          description: data.message || '更新失敗',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新抽成設定失敗:', error);
      toast({
        title: '儲存失敗',
        description: '更新失敗',
        variant: 'destructive',
      });
    } finally {
      setSavingCommission(false);
    }
  };

  // 儲存諮詢師抽成設定（使用 role-commission API）
  const handleSaveConsultantCommission = async () => {
    if (!viewingEmployee) return;

    setSavingConsultant(true);
    try {
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/role-commission/consultant`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commission_type: 'fixed_rate',
            commission_rate: consultantCommission.commission_rate ? parseFloat(consultantCommission.commission_rate) : null,
            other_revenue_rate: consultantCommission.other_revenue_rate ? parseFloat(consultantCommission.other_revenue_rate) : null,
            notes: `諮詢師抽成更新 ${new Date().toLocaleDateString('zh-TW')}`,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: '已儲存',
          description: '諮詢師抽成設定已更新成功',
        });
        setConsultantChanged(false);
        handleViewDetail(viewingEmployee);
      } else {
        toast({
          title: '儲存失敗',
          description: data.message || '更新失敗',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新諮詢師抽成設定失敗:', error);
      toast({
        title: '儲存失敗',
        description: '更新失敗',
        variant: 'destructive',
      });
    } finally {
      setSavingConsultant(false);
    }
  };

  // 儲存電訪人員抽成設定（使用 role-commission API）
  const handleSaveSetterCommission = async () => {
    if (!viewingEmployee) return;

    setSavingSetter(true);
    try {
      const response = await fetch(
        `/api/employees/${viewingEmployee.user.id}/role-commission/setter`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commission_type: 'fixed_rate',
            commission_rate: setterCommission.commission_rate ? parseFloat(setterCommission.commission_rate) : null,
            other_revenue_rate: setterCommission.other_revenue_rate ? parseFloat(setterCommission.other_revenue_rate) : null,
            notes: `電訪人員抽成更新 ${new Date().toLocaleDateString('zh-TW')}`,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: '已儲存',
          description: '電訪人員抽成設定已更新成功',
        });
        setSetterChanged(false);
        handleViewDetail(viewingEmployee);
      } else {
        toast({
          title: '儲存失敗',
          description: data.message || '更新失敗',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新電訪人員抽成設定失敗:', error);
      toast({
        title: '儲存失敗',
        description: '更新失敗',
        variant: 'destructive',
      });
    } finally {
      setSavingSetter(false);
    }
  };

  // 編輯勞健保記錄
  const handleEditInsurance = async () => {
    if (!editInsuranceData.insuranceId || !editInsuranceData.userId) {
      alert('請選擇要編輯的勞健保記錄');
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/${editInsuranceData.userId}/insurance/${editInsuranceData.insuranceId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labor_insurance_grade: editInsuranceData.labor_insurance_grade ? parseInt(editInsuranceData.labor_insurance_grade) : null,
            labor_insurance_amount: editInsuranceData.labor_insurance_amount ? parseFloat(editInsuranceData.labor_insurance_amount) : null,
            health_insurance_grade: editInsuranceData.health_insurance_grade ? parseInt(editInsuranceData.health_insurance_grade) : null,
            health_insurance_amount: editInsuranceData.health_insurance_amount ? parseFloat(editInsuranceData.health_insurance_amount) : null,
            pension_employer_rate: editInsuranceData.pension_employer_rate ? parseFloat(editInsuranceData.pension_employer_rate) : null,
            pension_employee_rate: editInsuranceData.pension_employee_rate ? parseFloat(editInsuranceData.pension_employee_rate) : null,
            effective_from: editInsuranceData.effective_from,
            notes: editInsuranceData.notes,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('勞健保記錄更新成功！');
        setShowEditInsuranceDialog(false);
        setEditInsuranceData({
          insuranceId: '',
          userId: '',
          labor_insurance_grade: '',
          labor_insurance_amount: '',
          health_insurance_grade: '',
          health_insurance_amount: '',
          pension_employer_rate: '',
          pension_employee_rate: '',
          effective_from: '',
          notes: '',
        });
        // 重新載入員工詳情
        if (viewingEmployee) {
          handleViewDetail(viewingEmployee);
        }
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新勞健保記錄失敗:', error);
      alert('更新失敗');
    }
  };

  // 新增勞健保設定
  const handleAddInsurance = async () => {
    if (!viewingEmployee) return;

    try {
      const response = await fetch(`/api/employees/${viewingEmployee.user.id}/insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labor_insurance_grade: insuranceData.labor_insurance_grade ? parseInt(insuranceData.labor_insurance_grade) : null,
          labor_insurance_amount: insuranceData.labor_insurance_amount ? parseFloat(insuranceData.labor_insurance_amount) : null,
          health_insurance_grade: insuranceData.health_insurance_grade ? parseInt(insuranceData.health_insurance_grade) : null,
          health_insurance_amount: insuranceData.health_insurance_amount ? parseFloat(insuranceData.health_insurance_amount) : null,
          pension_employer_rate: parseFloat(insuranceData.pension_employer_rate),
          pension_employee_rate: parseFloat(insuranceData.pension_employee_rate),
          effective_from: insuranceData.effective_from,
          notes: insuranceData.notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowInsuranceDialog(false);
        setInsuranceData({
          labor_insurance_grade: '',
          labor_insurance_amount: '',
          health_insurance_grade: '',
          health_insurance_amount: '',
          pension_employer_rate: '0.06',
          pension_employee_rate: '0.06',
          effective_from: new Date().toISOString().split('T')[0],
          notes: '',
        });
        // 重新載入員工詳情
        handleViewDetail(viewingEmployee);
        fetchEmployees();
      } else {
        alert(data.message || '新增失敗');
      }
    } catch (error) {
      console.error('新增勞健保設定失敗:', error);
      alert('新增失敗');
    }
  };

  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="員工管理">
      <div className="p-6 space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold">員工管理</h1>
          <p className="text-muted-foreground mt-1">
            管理員工基本資料、角色身份、薪資與勞健保資訊
          </p>
        </div>

      {/* 搜尋列與新增按鈕 */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋員工姓名、Email、員工編號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddEmployeeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增員工
        </Button>
      </div>

      {/* 員工列表 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('employee_number')}
              >
                <div className="flex items-center gap-1">
                  員工編號
                  {sortField === 'employee_number' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('first_name')}
              >
                <div className="flex items-center gap-1">
                  暱稱 / 本名
                  {sortField === 'first_name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                  )}
                </div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>角色身份</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('hire_date')}
              >
                <div className="flex items-center gap-1">
                  到職日
                  {sortField === 'hire_date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                  )}
                </div>
              </TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  載入中...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {searchTerm ? '找不到符合條件的員工' : '尚無員工資料'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEmployees.map((empData) => (
                <TableRow key={empData.user.id}>
                  <TableCell className="font-mono text-sm">
                    {empData.profile?.employee_number || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{empData.profile?.nickname || '-'}</span>
                      <span className="text-xs text-muted-foreground">
                        {empData.user.last_name || ''}{empData.user.first_name || ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{empData.user.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {empData.identities?.filter(id => id.is_active).length > 0 ? (
                        empData.identities.filter(id => id.is_active).map((identity) => (
                          <Badge
                            key={identity.id}
                            variant={identity.is_primary ? 'default' : 'secondary'}
                            className={`text-xs ${identity.is_primary ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}`}
                          >
                            {getIdentityTypeLabel(identity.identity_type)} {identity.identity_code}
                            {identity.is_primary && ' ★'}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {empData.profile?.hire_date
                      ? new Date(empData.profile.hire_date).toLocaleDateString('zh-TW')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={empData.user.status === 'active' ? 'default' : 'secondary'}
                    >
                      {empData.user.status === 'active' ? '在職' : '離職'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(empData)}
                        title="查看詳情"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        詳情
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(
                          empData.user.id,
                          `${empData.user.first_name} ${empData.user.last_name}`
                        )}
                        title="切換到此用戶的視角"
                        className="text-primary hover:bg-primary/10"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        切換視角
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 員工詳情對話框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              員工詳情 - {viewingEmployee?.user.first_name} {viewingEmployee?.user.last_name}
            </DialogTitle>
            <DialogDescription>
              查看和管理員工的角色身份、薪資、勞健保、權限等完整資訊
            </DialogDescription>
          </DialogHeader>

          {viewingEmployee && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">員工資訊</TabsTrigger>
                <TabsTrigger value="salary">薪資設定</TabsTrigger>
                <TabsTrigger value="permissions">權限管理</TabsTrigger>
              </TabsList>

              {/* 員工資訊分頁 - 包含基本資訊、角色身份、薪資資訊、勞健保 */}
              <TabsContent value="info" className="space-y-4">
                {/* 基本資訊區塊 */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      基本資訊
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditEmployeeData({
                            userId: viewingEmployee.user.id,
                            firstName: viewingEmployee.user.first_name || '',
                            lastName: viewingEmployee.user.last_name || '',
                            nickname: viewingEmployee.profile?.nickname || '',
                            email: viewingEmployee.user.email || '',
                            department: viewingEmployee.user.department || '',
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        編輯
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResetPasswordData({
                            userId: viewingEmployee.user.id,
                            newPassword: '',
                          });
                          setShowResetPasswordDialog(true);
                        }}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        重設密碼
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDeleteEmployeeData({
                            userId: viewingEmployee.user.id,
                            name: `${viewingEmployee.user.first_name} ${viewingEmployee.user.last_name || ''}`,
                          });
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        刪除員工
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">員工編號：</span>
                      <span className="font-mono">{viewingEmployee.profile?.employee_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">本名：</span>
                      <span className="font-medium">
                        {viewingEmployee.user.first_name || viewingEmployee.user.last_name
                          ? `${viewingEmployee.user.first_name || ''} ${viewingEmployee.user.last_name || ''}`.trim()
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">暱稱：</span>
                      <span>{viewingEmployee.profile?.nickname || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email：</span>
                      <span>{viewingEmployee.user.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">聘用類型：</span>
                      <span>
                        {viewingEmployee.profile?.employment_type
                          ? getEmploymentTypeLabel(viewingEmployee.profile.employment_type as EmploymentType)
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">到職日期：</span>
                      <span>
                        {viewingEmployee.profile?.hire_date
                          ? new Date(viewingEmployee.profile.hire_date).toLocaleDateString('zh-TW')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">狀態：</span>
                      <Badge variant={viewingEmployee.user.status === 'active' ? 'default' : 'secondary'}>
                        {viewingEmployee.user.status === 'active' ? '在職' : '離職'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleStatus}
                        className="h-6 text-xs"
                      >
                        切換狀態
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* 角色身份區塊 */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      角色身份
                    </h3>
                    <Button size="sm" onClick={() => setShowAddIdentityDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      新增身份
                    </Button>
                  </div>

                  {viewingEmployee.identities?.length > 0 ? (
                    <div className="space-y-2">
                      {viewingEmployee.identities.map((identity) => (
                        <div
                          key={identity.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            !identity.is_active ? 'bg-muted/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={identity.is_active ? 'default' : 'secondary'}>
                              {getIdentityTypeLabel(identity.identity_type)}
                            </Badge>
                            {identity.is_primary && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                主身份
                              </Badge>
                            )}
                            <span className="font-mono text-sm font-medium">{identity.identity_code}</span>
                            {identity.display_name && (
                              <span className="text-sm text-muted-foreground">
                                ({identity.display_name})
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(identity.effective_from).toLocaleDateString('zh-TW')}
                                {identity.effective_to && ` ~ ${new Date(identity.effective_to).toLocaleDateString('zh-TW')}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditIdentityData({
                                  identityId: identity.id,
                                  userId: viewingEmployee.user.id,
                                  display_name: identity.display_name || '',
                                  effective_from: identity.effective_from,
                                  effective_to: identity.effective_to || '',
                                });
                                setShowEditIdentityDialog(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              編輯
                            </Button>
                            {identity.is_active && !identity.is_primary && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetPrimaryIdentity(identity.id)}
                                className="text-yellow-700 hover:bg-yellow-50"
                              >
                                設為主身份
                              </Button>
                            )}
                            {identity.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivateIdentity(identity.id)}
                              >
                                停用
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      尚無角色身份
                    </p>
                  )}
                </Card>
              </TabsContent>

              {/* 薪資設定分頁 - 新版按角色分區設計 */}
              <TabsContent value="salary" className="space-y-4">
                {/* 底薪區塊 */}
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">底薪</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={inlineSalary.base_salary}
                          onChange={(e) => {
                            setInlineSalary({ base_salary: e.target.value });
                            setSalaryChanged(true);
                          }}
                          placeholder="0"
                          className="h-8 w-32"
                        />
                      </div>
                    </div>
                    {salaryChanged && (
                      <Button
                        size="sm"
                        onClick={handleSaveInlineSalary}
                        disabled={savingSalary}
                      >
                        {savingSalary ? (
                          <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        儲存
                      </Button>
                    )}
                    {!viewingEmployee.latest_compensation && (
                      <Button size="sm" variant="outline" onClick={() => setShowCompensationDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        初始設定
                      </Button>
                    )}
                  </div>
                </Card>

                {/* 現行抽成規則標題 */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold text-sm">現行抽成規則</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    使用中
                  </Badge>
                </div>

                {/* 根據身份動態顯示抽成區塊 */}
                {viewingEmployee.identities.filter(i => i.is_active).length > 0 ? (
                  <>
                    {/* 教師抽成區塊 */}
                    {viewingEmployee.identities.some(i => i.identity_type === 'teacher' && i.is_active) && (
                      <Card className="overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🎓</span>
                            <span className="font-medium text-sm">教師抽成</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {viewingEmployee.identities.find(i => i.identity_type === 'teacher' && i.is_active)?.is_primary && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">主要身份</Badge>
                            )}
                            {!viewingEmployee.identities.find(i => i.identity_type === 'teacher' && i.is_active)?.is_primary && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">次要身份</Badge>
                            )}
                            {commissionChanged && (
                              <Button
                                size="sm"
                                onClick={handleSaveInlineCommission}
                                disabled={savingCommission}
                              >
                                {savingCommission ? (
                                  <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3 mr-1" />
                                )}
                                儲存
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* 被成交 - 其他諮詢師幫老師成交 */}
                            <div className="bg-slate-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">被成交</span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">固定比例</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">其他諮詢師幫老師成交</p>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 text-muted-foreground font-medium">業績類型</th>
                                    <th className="text-right py-2 text-muted-foreground font-medium">抽成比例</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b">
                                    <td className="py-2">一般業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={inlineCommission.commission_rate}
                                          onChange={(e) => {
                                            setInlineCommission(prev => ({ ...prev, commission_rate: e.target.value }));
                                            setCommissionChanged(true);
                                          }}
                                          placeholder="18"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-2">其他業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={inlineCommission.other_revenue_rate}
                                          onChange={(e) => {
                                            setInlineCommission(prev => ({ ...prev, other_revenue_rate: e.target.value }));
                                            setCommissionChanged(true);
                                          }}
                                          placeholder="8"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* 自己成交 - 老師自己當諮詢師 - 根據 commission_type 動態顯示 */}
                            <div className="bg-slate-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">自己成交</span>
                                <select
                                  value={selfClosingCommission.commission_type === 'tiered' ? 'tiered' : 'fixed_rate'}
                                  onChange={(e) => {
                                    setSelfClosingCommission(prev => ({
                                      ...prev,
                                      commission_type: e.target.value as 'fixed_rate' | 'tiered'
                                    }));
                                    setSelfClosingChanged(true);
                                  }}
                                  className="text-xs px-2 py-1 rounded border bg-white"
                                >
                                  <option value="fixed_rate">固定比例</option>
                                  <option value="tiered">階梯式</option>
                                </select>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">老師自己當諮詢師成交</p>

                              {/* 固定比例模式 */}
                              {(selfClosingCommission.commission_type !== 'tiered') && (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 text-muted-foreground font-medium">業績類型</th>
                                      <th className="text-right py-2 text-muted-foreground font-medium">抽成比例</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b">
                                      <td className="py-2">一般業績</td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={selfClosingCommission.commission_rate}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, commission_rate: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="18"
                                            className="h-7 w-20 text-right text-sm"
                                          />
                                          <span className="text-muted-foreground">%</span>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="py-2">其他業績</td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={selfClosingCommission.other_revenue_rate}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, other_revenue_rate: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="8"
                                            className="h-7 w-20 text-right text-sm"
                                          />
                                          <span className="text-muted-foreground">%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}

                              {/* 階梯式模式 */}
                              {selfClosingCommission.commission_type === 'tiered' && (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 text-muted-foreground font-medium">業績區間</th>
                                      <th className="text-right py-2 text-muted-foreground font-medium">抽成金額</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b">
                                      <td className="py-2">
                                        <div className="flex items-center gap-1">
                                          <span>0 ~</span>
                                          <Input
                                            type="number"
                                            value={selfClosingCommission.tier1_max_revenue}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, tier1_max_revenue: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="105000"
                                            className="h-7 w-24 text-sm"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <span className="text-muted-foreground">$</span>
                                          <Input
                                            type="number"
                                            value={selfClosingCommission.tier1_commission_amount}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, tier1_commission_amount: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="33000"
                                            className="h-7 w-20 text-right text-sm"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                    <tr className="border-b">
                                      <td className="py-2">
                                        <div className="flex items-center gap-1">
                                          <span>{Number(selfClosingCommission.tier1_max_revenue || 105000).toLocaleString()} ~</span>
                                          <Input
                                            type="number"
                                            value={selfClosingCommission.tier2_max_revenue}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, tier2_max_revenue: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="150000"
                                            className="h-7 w-24 text-sm"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <span className="text-muted-foreground">$</span>
                                          <Input
                                            type="number"
                                            value={selfClosingCommission.tier2_commission_amount}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, tier2_commission_amount: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="7500"
                                            className="h-7 w-20 text-right text-sm"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="py-2">其他業績</td>
                                      <td className="py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={selfClosingCommission.other_revenue_rate}
                                            onChange={(e) => {
                                              setSelfClosingCommission(prev => ({ ...prev, other_revenue_rate: e.target.value }));
                                              setSelfClosingChanged(true);
                                            }}
                                            placeholder="8"
                                            className="h-7 w-20 text-right text-sm"
                                          />
                                          <span className="text-muted-foreground">%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 諮詢師抽成區塊 */}
                    {viewingEmployee.identities.some(i => i.identity_type === 'consultant' && i.is_active) && (
                      <Card className="overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💼</span>
                            <span className="font-medium text-sm">諮詢師抽成</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {viewingEmployee.identities.find(i => i.identity_type === 'consultant' && i.is_active)?.is_primary ? (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">主要身份</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">次要身份</Badge>
                            )}
                            {consultantChanged && (
                              <Button
                                size="sm"
                                onClick={handleSaveConsultantCommission}
                                disabled={savingConsultant}
                              >
                                {savingConsultant ? <Loader2Icon className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                儲存
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* 成交 - 固定比例 */}
                            <div className="bg-slate-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">成交</span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">固定比例</Badge>
                              </div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 text-muted-foreground font-medium">業績類型</th>
                                    <th className="text-right py-2 text-muted-foreground font-medium">抽成比例</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b">
                                    <td className="py-2">一般業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={consultantCommission.commission_rate}
                                          onChange={(e) => {
                                            setConsultantCommission(prev => ({ ...prev, commission_rate: e.target.value }));
                                            setConsultantChanged(true);
                                          }}
                                          placeholder="15"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-2">其他業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={consultantCommission.other_revenue_rate}
                                          onChange={(e) => {
                                            setConsultantCommission(prev => ({ ...prev, other_revenue_rate: e.target.value }));
                                            setConsultantChanged(true);
                                          }}
                                          placeholder="8"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 電訪人員抽成區塊 */}
                    {viewingEmployee.identities.some(i => i.identity_type === 'setter' && i.is_active) && (
                      <Card className="overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📞</span>
                            <span className="font-medium text-sm">電訪人員抽成</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {viewingEmployee.identities.find(i => i.identity_type === 'setter' && i.is_active)?.is_primary ? (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200">主要身份</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">次要身份</Badge>
                            )}
                            {setterChanged && (
                              <Button
                                size="sm"
                                onClick={handleSaveSetterCommission}
                                disabled={savingSetter}
                              >
                                {savingSetter ? <Loader2Icon className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                儲存
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* 成交 - 固定比例 */}
                            <div className="bg-slate-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">成交</span>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">固定比例</Badge>
                              </div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 text-muted-foreground font-medium">業績類型</th>
                                    <th className="text-right py-2 text-muted-foreground font-medium">抽成比例</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b">
                                    <td className="py-2">一般業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={setterCommission.commission_rate}
                                          onChange={(e) => {
                                            setSetterCommission(prev => ({ ...prev, commission_rate: e.target.value }));
                                            setSetterChanged(true);
                                          }}
                                          placeholder="10"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-2">其他業績</td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={setterCommission.other_revenue_rate}
                                          onChange={(e) => {
                                            setSetterCommission(prev => ({ ...prev, other_revenue_rate: e.target.value }));
                                            setSetterChanged(true);
                                          }}
                                          placeholder="8"
                                          className="h-7 w-20 text-right text-sm"
                                        />
                                        <span className="text-muted-foreground">%</span>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground text-center">
                      尚未設定角色身份，請先在「員工資訊」分頁中新增角色
                    </p>
                  </Card>
                )}

                {/* 未來抽成規則區塊 */}
                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                    ▼ 未來抽成規則 ▼
                  </span>
                </div>

                <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <span className="font-medium text-sm text-amber-800">新制抽成規則</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">預備中</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="enable-new-rule" disabled />
                      <Label htmlFor="enable-new-rule" className="text-xs text-muted-foreground">啟用新制</Label>
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground">新制抽成規則將在此顯示</p>
                    <p className="text-xs text-muted-foreground mt-1">可設定上線日期，届時自動切換</p>
                  </div>
                </Card>

                {/* 勞健保資訊區塊 */}
                <div className="flex items-center gap-2 mt-6">
                  <Shield className="h-4 w-4" />
                  <span className="font-semibold text-sm">勞健保資訊</span>
                </div>

                <Card className="p-4">
                  {viewingEmployee.latest_insurance ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">勞保級距</span>
                          <span className="font-medium">{viewingEmployee.latest_insurance.labor_insurance_grade || '-'}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">勞保金額</span>
                          <span className="font-medium">{formatCurrency(viewingEmployee.latest_insurance.labor_insurance_amount)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">健保級距</span>
                          <span className="font-medium">{viewingEmployee.latest_insurance.health_insurance_grade || '-'}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">健保金額</span>
                          <span className="font-medium">{formatCurrency(viewingEmployee.latest_insurance.health_insurance_amount)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">退休金(雇主)</span>
                          <span className="font-medium">{formatCurrency(viewingEmployee.latest_insurance.pension_employer_amount)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">退休金(員工)</span>
                          <span className="font-medium">{formatCurrency(viewingEmployee.latest_insurance.pension_employee_amount)}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditInsuranceData({
                              insuranceId: viewingEmployee.latest_insurance!.id,
                              userId: viewingEmployee.user.id,
                              labor_insurance_grade: viewingEmployee.latest_insurance!.labor_insurance_grade?.toString() || '',
                              labor_insurance_amount: viewingEmployee.latest_insurance!.labor_insurance_amount?.toString() || '',
                              health_insurance_grade: viewingEmployee.latest_insurance!.health_insurance_grade?.toString() || '',
                              health_insurance_amount: viewingEmployee.latest_insurance!.health_insurance_amount?.toString() || '',
                              pension_employer_rate: viewingEmployee.latest_insurance!.pension_employer_rate?.toString() || '',
                              pension_employee_rate: viewingEmployee.latest_insurance!.pension_employee_rate?.toString() || '',
                              effective_from: viewingEmployee.latest_insurance!.effective_from,
                              notes: viewingEmployee.latest_insurance!.notes || '',
                            });
                            setShowEditInsuranceDialog(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          編輯勞健保
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">尚未設定勞健保</p>
                      <Button size="sm" onClick={() => setShowInsuranceDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        設定勞健保
                      </Button>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* 權限管理分頁 */}
              <TabsContent value="permissions" className="space-y-4">
                {loadingPermissions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : viewingEmployee.user.roles?.includes('admin') || viewingEmployee.user.roles?.includes('super_admin') ? (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">管理員權限</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          此使用者為管理員，自動擁有所有功能的完整存取權限，無需額外設定。
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <>
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <ShieldIcon className="h-4 w-4" />
                            功能權限設定
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            勾選使用者可以存取的功能模組，並設定資料範圍
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {JSON.stringify(permissions) !== JSON.stringify(originalPermissions) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetPermissions}
                              disabled={savingPermissions}
                            >
                              重置
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={handleSavePermissions}
                            disabled={savingPermissions || JSON.stringify(permissions) === JSON.stringify(originalPermissions)}
                          >
                            {savingPermissions ? (
                              <>
                                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
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

                      <div className="space-y-6">
                        {Object.entries(
                          modules.reduce((acc, module) => {
                            if (!acc[module.module_category]) {
                              acc[module.module_category] = [];
                            }
                            acc[module.module_category].push(module);
                            return acc;
                          }, {} as Record<string, typeof modules>)
                        ).map(([category, categoryModules]) => (
                          <div key={category} className="space-y-4">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-base">
                                {categoryLabels[category] || category}
                              </h4>
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
                        ))}
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增角色身份對話框 */}
      <Dialog open={showAddIdentityDialog} onOpenChange={setShowAddIdentityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增角色身份</DialogTitle>
            <DialogDescription>
              為 {viewingEmployee?.user.first_name} 新增角色身份，系統將自動生成對應的業務編號
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>身份類型 *</Label>
              <Select
                value={newIdentityType}
                onValueChange={(value) => setNewIdentityType(value as IdentityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">教師 (T001, T002...)</SelectItem>
                  <SelectItem value="consultant">諮詢師 (C001, C002...)</SelectItem>
                  <SelectItem value="setter">電訪 (S001, S002...)</SelectItem>
                  <SelectItem value="employee">員工 (E001, E002...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>顯示名稱（選填）</Label>
              <Input
                value={newIdentityDisplayName}
                onChange={(e) => setNewIdentityDisplayName(e.target.value)}
                placeholder={viewingEmployee?.user.first_name || ''}
              />
            </div>

            <div className="space-y-2">
              <Label>生效日期 *</Label>
              <Input
                type="date"
                value={newIdentityEffectiveFrom}
                onChange={(e) => setNewIdentityEffectiveFrom(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              業務編號將根據現有最大編號自動遞增生成
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIdentityDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddIdentity}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 設定薪資對話框 */}
      <Dialog open={showCompensationDialog} onOpenChange={setShowCompensationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>設定薪資</DialogTitle>
            <DialogDescription>
              為 {viewingEmployee?.user.first_name} 設定薪資，新設定會將舊設定標記為歷史
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">底薪 (NT$)</Label>
              <Input
                id="base_salary"
                type="number"
                value={compensationData.base_salary}
                onChange={(e) =>
                  setCompensationData({ ...compensationData, base_salary: e.target.value })
                }
                placeholder="30000"
              />
            </div>

            <div className="space-y-2">
              <Label>抽成類型</Label>
              <Select
                value={compensationData.commission_type}
                onValueChange={(value) =>
                  setCompensationData({ ...compensationData, commission_type: value as CommissionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{getCommissionTypeLabel('none')}</SelectItem>
                  <SelectItem value="percentage">{getCommissionTypeLabel('percentage')}</SelectItem>
                  <SelectItem value="fixed">{getCommissionTypeLabel('fixed')}</SelectItem>
                  <SelectItem value="tiered">{getCommissionTypeLabel('tiered')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_from">生效日期 *</Label>
              <Input
                id="effective_from"
                type="date"
                value={compensationData.effective_from}
                onChange={(e) =>
                  setCompensationData({ ...compensationData, effective_from: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment_reason">調整原因</Label>
              <Input
                id="adjustment_reason"
                value={compensationData.adjustment_reason}
                onChange={(e) =>
                  setCompensationData({ ...compensationData, adjustment_reason: e.target.value })
                }
                placeholder="例如：年度調薪、職務異動"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompensationDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCompensation}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 設定勞健保對話框 */}
      <Dialog open={showInsuranceDialog} onOpenChange={setShowInsuranceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>設定勞健保</DialogTitle>
            <DialogDescription>
              為 {viewingEmployee?.user.first_name} 設定勞健保資訊
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor_insurance_grade">勞保級距</Label>
                <Input
                  id="labor_insurance_grade"
                  type="number"
                  value={insuranceData.labor_insurance_grade}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, labor_insurance_grade: e.target.value })
                  }
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="labor_insurance_amount">勞保金額 (NT$)</Label>
                <Input
                  id="labor_insurance_amount"
                  type="number"
                  value={insuranceData.labor_insurance_amount}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, labor_insurance_amount: e.target.value })
                  }
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="health_insurance_grade">健保級距</Label>
                <Input
                  id="health_insurance_grade"
                  type="number"
                  value={insuranceData.health_insurance_grade}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, health_insurance_grade: e.target.value })
                  }
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_insurance_amount">健保金額 (NT$)</Label>
                <Input
                  id="health_insurance_amount"
                  type="number"
                  value={insuranceData.health_insurance_amount}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, health_insurance_amount: e.target.value })
                  }
                  placeholder="800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pension_employer_rate">退休金提撥率-雇主 (0-1)</Label>
                <Input
                  id="pension_employer_rate"
                  type="number"
                  step="0.01"
                  value={insuranceData.pension_employer_rate}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, pension_employer_rate: e.target.value })
                  }
                  placeholder="0.06"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pension_employee_rate">退休金提撥率-員工 (0-1)</Label>
                <Input
                  id="pension_employee_rate"
                  type="number"
                  step="0.01"
                  value={insuranceData.pension_employee_rate}
                  onChange={(e) =>
                    setInsuranceData({ ...insuranceData, pension_employee_rate: e.target.value })
                  }
                  placeholder="0.06"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_effective_from">生效日期 *</Label>
              <Input
                id="insurance_effective_from"
                type="date"
                value={insuranceData.effective_from}
                onChange={(e) =>
                  setInsuranceData({ ...insuranceData, effective_from: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_notes">備註</Label>
              <Input
                id="insurance_notes"
                value={insuranceData.notes}
                onChange={(e) =>
                  setInsuranceData({ ...insuranceData, notes: e.target.value })
                }
                placeholder="例如：薪資調整、級距變更"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInsuranceDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddInsurance}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增員工對話框 */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增員工</DialogTitle>
            <DialogDescription>
              建立新員工帳號，系統將自動發送登入資訊給員工
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">名字 *</Label>
                <Input
                  id="firstName"
                  value={newEmployeeData.firstName}
                  onChange={(e) =>
                    setNewEmployeeData({ ...newEmployeeData, firstName: e.target.value })
                  }
                  placeholder="志明"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">姓氏</Label>
                <Input
                  id="lastName"
                  value={newEmployeeData.lastName}
                  onChange={(e) =>
                    setNewEmployeeData({ ...newEmployeeData, lastName: e.target.value })
                  }
                  placeholder="陳"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newEmployeeData.email}
                onChange={(e) =>
                  setNewEmployeeData({ ...newEmployeeData, email: e.target.value })
                }
                placeholder="email@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">部門</Label>
              <Input
                id="department"
                value={newEmployeeData.department}
                onChange={(e) =>
                  setNewEmployeeData({ ...newEmployeeData, department: e.target.value })
                }
                placeholder="教學部"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmployeePassword">初始密碼 *</Label>
              <div className="flex gap-2">
                <Input
                  id="newEmployeePassword"
                  value={newEmployeeData.password}
                  onChange={(e) =>
                    setNewEmployeeData({ ...newEmployeeData, password: e.target.value })
                  }
                  placeholder="至少 6 個字元"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const pwd = generatePassword();
                    setNewEmployeeData({ ...newEmployeeData, password: pwd });
                    setGeneratedPassword(pwd);
                  }}
                >
                  產生
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                建立成功後，系統會顯示帳號資訊供您複製給員工。員工首次登入需要修改密碼。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmployeeDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddEmployee}>新增員工</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重設密碼對話框 */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重設密碼</DialogTitle>
            <DialogDescription>
              為員工設定新密碼，員工下次登入需要修改密碼
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="resetPassword">新密碼 *</Label>
              <div className="flex gap-2">
                <Input
                  id="resetPassword"
                  value={resetPasswordData.newPassword}
                  onChange={(e) =>
                    setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })
                  }
                  placeholder="至少 6 個字元"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const pwd = generatePassword();
                    setResetPasswordData({ ...resetPasswordData, newPassword: pwd });
                    setResetPasswordGenerated(pwd);
                  }}
                >
                  產生
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                建議使用「產生」按鈕生成安全的隨機密碼
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleResetPassword}>重設密碼</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯員工對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯員工資料</DialogTitle>
            <DialogDescription>
              修改員工的基本資料
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editFirstName">名字 *</Label>
              <Input
                id="editFirstName"
                value={editEmployeeData.firstName}
                onChange={(e) =>
                  setEditEmployeeData({ ...editEmployeeData, firstName: e.target.value })
                }
                placeholder="名字"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLastName">姓氏</Label>
              <Input
                id="editLastName"
                value={editEmployeeData.lastName}
                onChange={(e) =>
                  setEditEmployeeData({ ...editEmployeeData, lastName: e.target.value })
                }
                placeholder="姓氏（選填）"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNickname">暱稱</Label>
              <Input
                id="editNickname"
                value={editEmployeeData.nickname}
                onChange={(e) =>
                  setEditEmployeeData({ ...editEmployeeData, nickname: e.target.value })
                }
                placeholder="暱稱（選填）"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmployeeData.email}
                onChange={(e) =>
                  setEditEmployeeData({ ...editEmployeeData, email: e.target.value })
                }
                placeholder="employee@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDepartment">部門</Label>
              <Input
                id="editDepartment"
                value={editEmployeeData.department}
                onChange={(e) =>
                  setEditEmployeeData({ ...editEmployeeData, department: e.target.value })
                }
                placeholder="部門（選填）"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditEmployee}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯角色身份對話框 */}
      <Dialog open={showEditIdentityDialog} onOpenChange={setShowEditIdentityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯角色身份</DialogTitle>
            <DialogDescription>
              修改角色身份的顯示名稱和生效日期
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>顯示名稱</Label>
              <Input
                value={editIdentityData.display_name}
                onChange={(e) =>
                  setEditIdentityData({ ...editIdentityData, display_name: e.target.value })
                }
                placeholder="選填，例如：資深教練"
              />
            </div>

            <div>
              <Label>開始時間 *</Label>
              <Input
                type="date"
                value={editIdentityData.effective_from}
                onChange={(e) =>
                  setEditIdentityData({ ...editIdentityData, effective_from: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>結束時間</Label>
              <Input
                type="date"
                value={editIdentityData.effective_to}
                onChange={(e) =>
                  setEditIdentityData({ ...editIdentityData, effective_to: e.target.value })
                }
                placeholder="選填，空白表示仍在職"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteIdentity}>
              刪除
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditIdentityDialog(false)}>
                取消
              </Button>
              <Button onClick={handleEditIdentity}>儲存</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯薪資記錄對話框 */}
      <Dialog open={showEditCompensationDialog} onOpenChange={setShowEditCompensationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯薪資記錄</DialogTitle>
            <DialogDescription>
              修改員工的薪資設定
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>底薪（NTD）</Label>
              <Input
                type="number"
                value={editCompensationData.base_salary}
                onChange={(e) =>
                  setEditCompensationData({ ...editCompensationData, base_salary: e.target.value })
                }
                placeholder="例如：35000"
              />
            </div>

            {/* 抽成設定區 */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">抽成設定</p>
                <Select
                  value={editCompensationData.commission_type}
                  onValueChange={(value: CommissionType) =>
                    setEditCompensationData({ ...editCompensationData, commission_type: value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">無抽成</SelectItem>
                    <SelectItem value="fixed_rate">固定比例</SelectItem>
                    <SelectItem value="tiered">階梯式</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* 固定比例區 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">固定比例抽成</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">一般業績 (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCompensationData.commission_rate}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, commission_rate: e.target.value })
                      }
                      placeholder="18"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">其他業績 (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editCompensationData.other_revenue_rate}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, other_revenue_rate: e.target.value })
                      }
                      placeholder="8"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 階梯式區 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">階梯式抽成（自己成交）</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">第一階上限 (NTD)</Label>
                    <Input
                      type="number"
                      value={editCompensationData.tier1_max_revenue}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, tier1_max_revenue: e.target.value })
                      }
                      placeholder="105000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">第一階抽成 (NTD)</Label>
                    <Input
                      type="number"
                      value={editCompensationData.tier1_commission_amount}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, tier1_commission_amount: e.target.value })
                      }
                      placeholder="33000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">第二階上限 (NTD)</Label>
                    <Input
                      type="number"
                      value={editCompensationData.tier2_max_revenue}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, tier2_max_revenue: e.target.value })
                      }
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">第二階抽成 (NTD)</Label>
                    <Input
                      type="number"
                      value={editCompensationData.tier2_commission_amount}
                      onChange={(e) =>
                        setEditCompensationData({ ...editCompensationData, tier2_commission_amount: e.target.value })
                      }
                      placeholder="7500"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                系統會根據「抽成類型」決定使用哪種計算方式
              </p>
            </div>

            <div>
              <Label>生效日期</Label>
              <Input
                type="date"
                value={editCompensationData.effective_from}
                onChange={(e) =>
                  setEditCompensationData({ ...editCompensationData, effective_from: e.target.value })
                }
              />
            </div>

            <div>
              <Label>調整原因</Label>
              <Input
                value={editCompensationData.adjustment_reason}
                onChange={(e) =>
                  setEditCompensationData({ ...editCompensationData, adjustment_reason: e.target.value })
                }
                placeholder="例如：年度調薪、升職加薪"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCompensationDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditCompensation}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯勞健保記錄對話框 */}
      <Dialog open={showEditInsuranceDialog} onOpenChange={setShowEditInsuranceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯勞健保記錄</DialogTitle>
            <DialogDescription>
              修改員工的勞健保設定
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>勞保級距</Label>
              <Input
                type="number"
                value={editInsuranceData.labor_insurance_grade}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, labor_insurance_grade: e.target.value })
                }
                placeholder="例如：1"
              />
            </div>

            <div>
              <Label>勞保金額（NTD）</Label>
              <Input
                type="number"
                value={editInsuranceData.labor_insurance_amount}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, labor_insurance_amount: e.target.value })
                }
                placeholder="例如：25250"
              />
            </div>

            <div>
              <Label>健保級距</Label>
              <Input
                type="number"
                value={editInsuranceData.health_insurance_grade}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, health_insurance_grade: e.target.value })
                }
                placeholder="例如：1"
              />
            </div>

            <div>
              <Label>健保金額（NTD）</Label>
              <Input
                type="number"
                value={editInsuranceData.health_insurance_amount}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, health_insurance_amount: e.target.value })
                }
                placeholder="例如：25250"
              />
            </div>

            <div>
              <Label>退休金雇主提繳率</Label>
              <Input
                type="number"
                step="0.01"
                value={editInsuranceData.pension_employer_rate}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, pension_employer_rate: e.target.value })
                }
                placeholder="預設：0.06 (6%)"
              />
            </div>

            <div>
              <Label>退休金員工提繳率</Label>
              <Input
                type="number"
                step="0.01"
                value={editInsuranceData.pension_employee_rate}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, pension_employee_rate: e.target.value })
                }
                placeholder="預設：0.06 (6%)"
              />
            </div>

            <div className="col-span-2">
              <Label>生效日期</Label>
              <Input
                type="date"
                value={editInsuranceData.effective_from}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, effective_from: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <Label>備註</Label>
              <Input
                value={editInsuranceData.notes}
                onChange={(e) =>
                  setEditInsuranceData({ ...editInsuranceData, notes: e.target.value })
                }
                placeholder="選填"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditInsuranceDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditInsurance}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 帳號資訊對話框 */}
      <Dialog open={showAccountInfoDialog} onOpenChange={setShowAccountInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ 員工帳號建立成功</DialogTitle>
            <DialogDescription>
              請複製以下資訊並傳送給員工 {accountInfo.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Card className="p-4 bg-muted">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">員工姓名</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={accountInfo.name}
                      readOnly
                      className="bg-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(accountInfo.name);
                        alert('已複製姓名');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">登入帳號 (Email)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={accountInfo.email}
                      readOnly
                      className="bg-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(accountInfo.email);
                        alert('已複製 Email');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">臨時密碼</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={accountInfo.password}
                      readOnly
                      className="bg-white font-mono text-lg"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(accountInfo.password);
                        alert('已複製密碼');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">登入網址</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value="https://singple-ai-system.zeabur.app/login"
                      readOnly
                      className="bg-white text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('https://singple-ai-system.zeabur.app/login');
                        alert('已複製登入網址');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>📌 提醒事項：</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>此為系統自動生成的臨時密碼</li>
                <li>員工首次登入時，系統會要求修改密碼</li>
                <li>請確保將密碼安全地傳送給員工</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const text = `
🎉 歡迎加入 Singple 教育機構管理系統

姓名：${accountInfo.name}
登入帳號：${accountInfo.email}
臨時密碼：${accountInfo.password}
登入網址：https://singple-ai-system.zeabur.app/login

📌 提醒：
• 此為臨時密碼，首次登入需修改
• 請妥善保管您的密碼
                  `.trim();
                  navigator.clipboard.writeText(text);
                  alert('已複製完整資訊');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                複製全部資訊
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAccountInfoDialog(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除員工確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ 確認刪除員工</DialogTitle>
            <DialogDescription>
              此操作無法復原，將會永久刪除員工的所有資料
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-semibold mb-2">
                即將刪除以下員工：
              </p>
              <p className="text-lg font-bold text-red-900">
                {deleteEmployeeData.name}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-semibold mb-2">
                ⚠️ 警告：此操作將會刪除
              </p>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>員工基本資料（users、employee_profiles）</li>
                <li>所有業務身份記錄（business_identities）</li>
                <li>所有薪資記錄（salary_records）</li>
                <li>所有勞健保記錄（insurance_records）</li>
                <li>其他相關的業務資料</li>
              </ul>
              <p className="text-sm text-amber-800 font-semibold mt-3">
                此操作無法復原，請謹慎確認！
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                如果只是要停用員工帳號，建議使用「切換狀態」功能將員工設為「離職」狀態，這樣可以保留歷史資料。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteEmployeeData({ userId: '', name: '' });
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
