import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { filterSidebarByRole, type SidebarSection } from '@/config/sidebar-config';

/**
 * 根據當前使用者角色過濾側邊選單
 */
export function useFilteredSidebar(): SidebarSection[] {
  const { user } = useAuth();

  return useMemo(() => {
    // 如果沒有用戶（認證關閉），預設為 admin 權限顯示所有功能
    const roles = user?.roles || ['admin'];
    return filterSidebarByRole(roles);
  }, [user?.roles]);
}
