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

    // 取得可存取的模組 ID 列表
    const accessibleModules = modules?.map(m => m.module_id) || [];

    // 使用權限過濾
    return filterSidebarByPermission(user.roles || [], accessibleModules);
  }, [user, modules, isLoading]);
}
