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
} from 'lucide-react';
import { SidebarSectionConfig } from '@/components/layout/sidebar';
import type { Role } from './permissions';

export interface SidebarItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  requiredRoles?: Role[]; // 新增：需要的角色權限
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const sidebarConfig: SidebarSection[] = [
  // ==================== 教師系統 ====================
  {
    title: '教師系統',
    items: [
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredRoles: ['teacher'],
      },
      {
        label: '完課率報表',
        href: '/reports/completion-rate',
        icon: Target,
        badge: '即將推出',
        requiredRoles: ['teacher'],
      },
      {
        label: '滿意度報表',
        href: '/reports/satisfaction',
        icon: Smile,
        badge: '即將推出',
        requiredRoles: ['teacher'],
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredRoles: ['teacher'],
      },
    ],
  },

  // ==================== 電訪系統 ====================
  {
    title: '電訪系統',
    items: [
      {
        label: '學生跟進',
        href: '/telemarketing/student-follow-up',
        icon: UserCog,
        requiredRoles: ['setter'],
      },
      {
        label: '廣告名單',
        href: '/telemarketing/ad-leads',
        icon: Phone,
        requiredRoles: ['setter'],
      },
      {
        label: '電訪記錄',
        href: '/telemarketing/call-records',
        icon: PhoneCall,
        requiredRoles: ['setter'],
      },
      {
        label: 'GoHighLevel 聯絡人',
        href: '/leads/gohighlevel',
        icon: Users,
        requiredRoles: ['setter'],
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredRoles: ['setter'],
      },
    ],
  },

  // ==================== 諮詢師系統 ====================
  {
    title: '諮詢師系統',
    items: [
      {
        label: '諮詢師報表',
        href: '/reports/consultants',
        icon: Users,
        requiredRoles: ['consultant'],
      },
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredRoles: ['consultant'],
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredRoles: ['consultant'],
      },
    ],
  },

  // ==================== 管理系統 ====================
  {
    title: '管理系統',
    items: [
      {
        label: '儀表板總覽',
        href: '/',
        icon: LayoutDashboard,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '體驗課總覽',
        href: '/reports/trial-overview',
        icon: FileText,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '成本獲利管理',
        href: '/reports/cost-profit',
        icon: DollarSign,
        requiredRoles: ['admin'],
      },
      {
        label: '收支記錄管理',
        href: '/reports/income-expense',
        icon: Calculator,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '諮詢師報表',
        href: '/reports/consultants',
        icon: Users,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '完課率報表',
        href: '/reports/completion-rate',
        icon: Target,
        badge: '即將推出',
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '滿意度報表',
        href: '/reports/satisfaction',
        icon: Smile,
        badge: '即將推出',
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '廣告成效',
        href: '/telemarketing/ad-performance',
        icon: BarChart3,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: 'GoHighLevel 聯絡人',
        href: '/leads/gohighlevel',
        icon: Users,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '學生跟進',
        href: '/telemarketing/student-follow-up',
        icon: UserCog,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '廣告名單',
        href: '/telemarketing/ad-leads',
        icon: Phone,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '電訪記錄',
        href: '/telemarketing/call-records',
        icon: PhoneCall,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '資料庫瀏覽器',
        href: '/tools/database-browser',
        icon: Database,
        requiredRoles: ['admin'],
      },
      {
        label: 'KPI 計算器',
        href: '/tools/kpi-calculator',
        icon: Calculator,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: 'AI 分析',
        href: '/tools/ai-analysis',
        icon: Brain,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: 'Raw Data MVP',
        href: '/tools/raw-data-mvp',
        icon: Sheet,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '表單填寫',
        href: '/forms',
        icon: PenTool,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: '員工管理',
        href: '/settings/employees',
        icon: UserCog,
        requiredRoles: ['admin'],
      },
      {
        label: '資料來源',
        href: '/settings/data-sources',
        icon: Sheet,
        requiredRoles: ['admin'],
      },
      {
        label: '表單管理',
        href: '/settings/form-builder',
        icon: FormInput,
        requiredRoles: ['admin', 'manager'],
      },
      {
        label: 'Facebook 整合',
        href: '/settings/facebook',
        icon: Facebook,
        requiredRoles: ['admin'],
      },
      {
        label: '系統設定',
        href: '/settings/system',
        icon: Settings,
        badge: '即將推出',
        requiredRoles: ['admin'],
      },
    ],
  },
];

/**
 * 根據使用者角色過濾側邊選單
 */
export function filterSidebarByRole(
  userRoles: Role[] | null
): SidebarSection[] {
  if (!userRoles || userRoles.length === 0) {
    // 未登入或無角色：只顯示首頁
    return [{
      title: '主要功能',
      items: [{
        label: '儀表板總覽',
        href: '/',
        icon: LayoutDashboard,
      }],
    }];
  }

  // Admin 看所有選單
  if (userRoles.includes('admin')) {
    return sidebarConfig;
  }

  // 其他角色：根據 requiredRoles 過濾
  return sidebarConfig.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        // 沒設定權限要求的項目都可以看
        return true;
      }

      // 檢查使用者是否有任一必要角色
      return item.requiredRoles.some(role => userRoles.includes(role));
    }),
  })).filter(section => section.items.length > 0); // 過濾掉空區塊
}
