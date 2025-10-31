/**
 * Sidebar Hook
 *
 * 提供過濾後的側邊欄配置（整合權限系統）
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMyModules } from './use-permission';
import { sidebarConfig, filterSidebarByPermission } from '@/config/sidebar-config';
import type { SidebarSection } from '@/config/sidebar-config';

/**
 * 取得過濾後的側邊欄配置（根據使用者權限）
 */
export function useFilteredSidebar(): SidebarSection[] {
  const { user } = useAuth();
  const { data: modules, isLoading } = useMyModules();

  return useMemo(() => {
    if (!user) {
      // 未登入：只顯示首頁
      return sidebarConfig.slice(0, 1);
    }

    if (isLoading) {
      // 載入中：暫時顯示全部（避免閃爍）
      return sidebarConfig;
    }

    // 傳遞完整的模組資料（包含 category）
    return filterSidebarByPermission((user.roles || []) as any, modules || []);
  }, [user, modules, isLoading]);
}
