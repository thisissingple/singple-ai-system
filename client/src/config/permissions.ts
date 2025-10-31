/**
 * 權限控制配置
 * 定義各角色可訪問的路由和功能
 */

export type Role = 'admin' | 'super_admin' | 'manager' | 'teacher' | 'consultant' | 'setter' | 'user';

export interface PermissionRule {
  /** 允許訪問的角色列表 */
  roles: Role[];
  /** 是否需要特定業務身份 */
  requiresIdentity?: ('teacher' | 'consultant' | 'setter')[];
}

/**
 * 路由權限配置
 * key: 路由路徑或路徑前綴
 * value: 權限規則
 */
export const routePermissions: Record<string, PermissionRule> = {
  // 主要功能 - 管理者可訪問
  '/': {
    roles: ['admin', 'manager', 'teacher', 'consultant', 'setter', 'user'],
  },

  // 教師系統
  '/reports/trial-report': {
    roles: ['admin', 'manager', 'teacher', 'consultant'],
  },
  '/teaching-quality': {
    roles: ['admin', 'manager', 'teacher'],
  },
  '/reports/completion-rate': {
    roles: ['admin', 'manager', 'teacher'],
  },
  '/reports/satisfaction': {
    roles: ['admin', 'manager', 'teacher'],
  },

  // 電訪系統
  '/telemarketing/student-follow-up': {
    roles: ['admin', 'manager', 'setter'],
  },
  '/telemarketing/ad-leads': {
    roles: ['admin', 'manager', 'setter'],
  },
  '/telemarketing/call-records': {
    roles: ['admin', 'manager', 'setter'],
  },
  '/telemarketing/ad-performance': {
    roles: ['admin', 'manager'],
  },
  '/leads/gohighlevel': {
    roles: ['admin', 'manager', 'setter'],
  },

  // 諮詢師系統
  '/reports/consultants': {
    roles: ['admin', 'manager', 'consultant'],
  },

  // 管理系統 - 報表
  '/reports/cost-profit': {
    roles: ['admin', 'manager'],
  },
  '/reports/cost-profit/manage': {
    roles: ['admin'],
  },
  '/reports/income-expense': {
    roles: ['admin', 'manager'],
  },

  // 管理系統 - 工具
  '/tools/database-browser': {
    roles: ['admin'],
  },
  '/tools/kpi-calculator': {
    roles: ['admin', 'manager'],
  },
  '/tools/ai-analysis': {
    roles: ['admin', 'manager'],
  },
  '/tools/raw-data-mvp': {
    roles: ['admin', 'manager'],
  },

  // 通用功能 - 表單填寫
  '/forms': {
    roles: ['admin', 'manager', 'teacher', 'consultant', 'setter', 'user'],
  },

  // 管理系統 - 設定
  '/settings/employees': {
    roles: ['admin'],
  },
  '/settings/data-sources': {
    roles: ['admin'],
  },
  '/settings/form-builder': {
    roles: ['admin', 'manager'],
  },
  '/settings/facebook': {
    roles: ['admin'],
  },
  '/settings/system': {
    roles: ['admin'],
  },

  // 認證頁面 - 所有人可訪問
  '/auth/login': {
    roles: ['admin', 'manager', 'teacher', 'consultant', 'setter', 'user'],
  },
  '/auth/change-password': {
    roles: ['admin', 'manager', 'teacher', 'consultant', 'setter', 'user'],
  },
};

/**
 * 檢查用戶是否有權限訪問特定路由
 * @param path 路由路徑
 * @param userRole 用戶角色
 * @param userIdentities 用戶的業務身份列表（可選）
 * @returns 是否有權限
 */
export function hasPermission(
  path: string,
  userRole: Role | Role[],
  userIdentities?: string[]
): boolean {
  // 將單一角色轉為陣列
  const roles = Array.isArray(userRole) ? userRole : [userRole];

  // Admin 有所有權限
  if (roles.includes('admin')) {
    return true;
  }

  // 查找匹配的權限規則
  let matchedRule: PermissionRule | undefined;
  let matchedPath = '';

  // 完全匹配優先
  if (routePermissions[path]) {
    matchedRule = routePermissions[path];
    matchedPath = path;
  } else {
    // 尋找前綴匹配（例如 /reports/trial-report 匹配 /reports）
    const pathSegments = path.split('/').filter(Boolean);
    for (let i = pathSegments.length; i > 0; i--) {
      const prefixPath = '/' + pathSegments.slice(0, i).join('/');
      if (routePermissions[prefixPath]) {
        matchedRule = routePermissions[prefixPath];
        matchedPath = prefixPath;
        break;
      }
    }
  }

  // 沒有找到規則，預設拒絕訪問
  if (!matchedRule) {
    console.warn(`No permission rule found for path: ${path}`);
    return false;
  }

  // 檢查角色權限
  const hasRolePermission = roles.some(role => matchedRule!.roles.includes(role));

  if (!hasRolePermission) {
    return false;
  }

  // 檢查是否需要特定業務身份
  if (matchedRule.requiresIdentity && matchedRule.requiresIdentity.length > 0) {
    if (!userIdentities || userIdentities.length === 0) {
      return false;
    }

    // 用戶至少要有其中一個要求的身份
    return matchedRule.requiresIdentity.some(requiredIdentity =>
      userIdentities.includes(requiredIdentity)
    );
  }

  return true;
}

/**
 * 根據用戶角色過濾側邊欄項目
 * @param items 側邊欄項目列表
 * @param userRole 用戶角色
 * @param userIdentities 用戶的業務身份列表（可選）
 * @returns 過濾後的側邊欄項目
 */
export function filterMenuItems<T extends { href: string }>(
  items: T[],
  userRole: Role | Role[],
  userIdentities?: string[]
): T[] {
  return items.filter(item =>
    hasPermission(item.href, userRole, userIdentities)
  );
}

/**
 * 取得角色的顯示名稱
 */
export function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    admin: '管理員',
    super_admin: '超級管理員',
    manager: '部門主管',
    teacher: '教師',
    consultant: '諮詢師',
    setter: '電訪人員',
    user: '一般員工',
  };
  return roleNames[role] || role;
}
