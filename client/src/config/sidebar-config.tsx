/**
 * 側邊選單配置
 * 定義所有導航項目與路由
 */

import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  Target,
  TrendingUp,
  Smile,
  DollarSign,
  Database,
  Calculator,
  Brain,
  Settings,
  Sheet,
  PenTool,
  FormInput,
  GraduationCap,
  Phone,
  PhoneCall,
  BarChart3,
  Facebook,
  BookOpen,
  MessageSquare,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { SidebarSectionConfig } from '@/components/layout/sidebar';
import type { Role } from './permissions';

export interface PermissionModule {
  id: string;
  module_id: string;
  module_name: string;
  module_category: string;
  description: string | null;
  supports_scope: boolean;
  display_order: number;
  is_active: boolean;
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  requiredRoles?: Role[]; // 舊系統：角色權限（已棄用）
  requiredModule?: string; // 新系統：權限模組 ID
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
  category?: string; // 對應到 permission module category
}

export const sidebarConfig: SidebarSection[] = [
  // ==================== 教師系統 ====================
  {
    title: '教師系統',
    category: 'teacher_system',
    items: [
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredModule: 'trial_class_report',
      },
      {
        label: '完課率報表',
        href: '/reports/completion-rate',
        icon: Target,
        badge: '即將推出',
        requiredModule: 'trial_class_report',
      },
      {
        label: '滿意度報表',
        href: '/reports/satisfaction',
        icon: Smile,
        badge: '即將推出',
        requiredModule: 'trial_class_report',
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredModule: 'form_builder',
      },
    ],
  },

  // ==================== 電訪系統 ====================
  {
    title: '電訪系統',
    category: 'telemarketing_system',
    items: [
      {
        label: '學生跟進',
        href: '/telemarketing/student-follow-up',
        icon: UserCog,
        requiredModule: 'telemarketing_system',
      },
      {
        label: '廣告名單',
        href: '/telemarketing/ad-leads',
        icon: Phone,
        requiredModule: 'ad_leads',
      },
      {
        label: '電訪記錄',
        href: '/telemarketing/call-records',
        icon: PhoneCall,
        requiredModule: 'telemarketing_system',
      },
      {
        label: 'GoHighLevel 聯絡人',
        href: '/leads/gohighlevel',
        icon: Users,
        requiredModule: 'telemarketing_system',
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredModule: 'form_builder',
      },
    ],
  },

  // ==================== 諮詢師系統 ====================
  {
    title: '諮詢師系統',
    category: 'consultant_system',
    items: [
      {
        label: '諮詢師報表',
        href: '/reports/consultants',
        icon: Users,
        requiredModule: 'consultant_report',
      },
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredModule: 'trial_class_report',
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredModule: 'consultant_forms',
      },
    ],
  },

  // ==================== 管理系統 ====================
  {
    title: '管理系統',
    category: 'management_system',
    items: [
      {
        label: '儀表板總覽',
        href: '/',
        icon: LayoutDashboard,
        requiredModule: 'dashboard',
      },
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredModule: 'trial_class_report',
      },
      {
        label: '成本獲利管理',
        href: '/reports/cost-profit',
        icon: DollarSign,
        requiredModule: 'cost_profit',
      },
      {
        label: '收支記錄管理',
        href: '/reports/income-expense',
        icon: Calculator,
        requiredModule: 'income_expense',
      },
      {
        label: '諮詢師報表',
        href: '/reports/consultants',
        icon: Users,
        requiredModule: 'consultant_report',
      },
      {
        label: '完課率報表',
        href: '/reports/completion-rate',
        icon: Target,
        badge: '即將推出',
        requiredModule: 'trial_class_report',
      },
      {
        label: '滿意度報表',
        href: '/reports/satisfaction',
        icon: Smile,
        badge: '即將推出',
        requiredModule: 'trial_class_report',
      },
      {
        label: '廣告成效',
        href: '/telemarketing/ad-performance',
        icon: BarChart3,
        requiredModule: 'ad_leads',
      },
      {
        label: 'GoHighLevel 聯絡人',
        href: '/leads/gohighlevel',
        icon: Users,
        requiredModule: 'telemarketing_system',
      },
      {
        label: '學生跟進',
        href: '/telemarketing/student-follow-up',
        icon: UserCog,
        requiredModule: 'telemarketing_system',
      },
      {
        label: '廣告名單',
        href: '/telemarketing/ad-leads',
        icon: Phone,
        requiredModule: 'ad_leads',
      },
      {
        label: '電訪記錄',
        href: '/telemarketing/call-records',
        icon: PhoneCall,
        requiredModule: 'telemarketing_system',
      },
      {
        label: '資料庫瀏覽器',
        href: '/tools/database-browser',
        icon: Database,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬工具）
      },
      {
        label: 'KPI 計算器',
        href: '/tools/kpi-calculator',
        icon: Calculator,
        requiredModule: 'dashboard',
      },
      {
        label: 'AI 分析',
        href: '/tools/ai-analysis',
        icon: Brain,
        requiredModule: 'dashboard',
      },
      {
        label: 'Raw Data MVP',
        href: '/tools/raw-data-mvp',
        icon: Sheet,
        requiredModule: 'dashboard',
      },
      {
        label: 'Know-it-all AI',
        href: '/tools/know-it-all-chat',
        icon: MessageSquare,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: 'Know-it-all 文件',
        href: '/tools/know-it-all-documents',
        icon: BookOpen,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredModule: 'form_builder',
      },
      {
        label: '員工管理',
        href: '/settings/employees',
        icon: UserCog,
        requiredModule: 'employee_management',
      },
      {
        label: '權限管理',
        href: '/settings/permissions',
        icon: Shield,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: '資料來源',
        href: '/settings/data-sources',
        icon: Sheet,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: '表單管理',
        href: '/settings/form-builder',
        icon: FormInput,
        requiredModule: 'form_builder',
      },
      {
        label: 'Google Sheets 串接 2.0',
        href: '/settings/google-sheets-sync',
        icon: RefreshCw,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: 'Facebook 整合',
        href: '/settings/facebook',
        icon: Facebook,
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
      {
        label: '系統設定',
        href: '/settings/system',
        icon: Settings,
        badge: '即將推出',
        requiredRoles: ['admin'], // 保留舊系統（admin 專屬）
      },
    ],
  },
];

/**
 * 根據使用者權限過濾側邊選單（新系統）
 * @param userRoles - 使用者角色（用於 admin 判斷和舊系統）
 * @param accessibleModules - 使用者可存取的權限模組完整資料（包含 category）
 */
export function filterSidebarByPermission(
  userRoles: Role[] | null,
  accessibleModules: PermissionModule[]
): SidebarSection[] {
  if (!userRoles || userRoles.length === 0) {
    // 未登入：只顯示首頁
    return [{
      title: '主要功能',
      items: [{
        label: '儀表板總覽',
        href: '/',
        icon: LayoutDashboard,
      }],
    }];
  }

  // Admin/super_admin 看所有選單
  if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
    return sidebarConfig;
  }

  // 建立模組 ID 和 category 的對照表
  const moduleIdSet = new Set(accessibleModules.map(m => m.module_id));
  const accessibleCategories = new Set(accessibleModules.map(m => m.module_category));

  // 其他使用者：根據權限模組過濾
  return sidebarConfig
    .filter(section => {
      // 先過濾 section：只保留使用者有權限的 category
      if (section.category && !accessibleCategories.has(section.category)) {
        return false;
      }
      return true;
    })
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // 過濾掉「即將推出」的項目
        if (item.badge === '即將推出') {
          return false;
        }

        // 優先檢查新系統 (requiredModule)
        if (item.requiredModule) {
          return moduleIdSet.has(item.requiredModule);
        }

        // 回退到舊系統 (requiredRoles) - 用於 admin 專屬工具
        if (item.requiredRoles && item.requiredRoles.length > 0) {
          return item.requiredRoles.some(role => userRoles.includes(role));
        }

        // 沒設定任何權限要求：不顯示（改為更嚴格的預設行為）
        return false;
      }),
    }))
    .filter(section => section.items.length > 0); // 過濾掉空區塊
}

/**
 * 舊函數：向後兼容（已廢棄）
 * @deprecated 請使用 filterSidebarByPermission
 */
export function filterSidebarByRole(
  userRoles: Role[] | null
): SidebarSection[] {
  // 回退到舊邏輯（臨時）
  if (!userRoles || userRoles.length === 0) {
    return [{
      title: '主要功能',
      items: [{
        label: '儀表板總覽',
        href: '/',
        icon: LayoutDashboard,
      }],
    }];
  }

  if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
    return sidebarConfig;
  }

  return sidebarConfig.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      return item.requiredRoles.some(role => userRoles.includes(role));
    }),
  })).filter(section => section.items.length > 0);
}
