/**
 * Permission Hook
 *
 * 前端權限檢查，整合新的 permission_modules 系統
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';

interface PermissionCheckResult {
  allowed: boolean;
  scope?: 'all' | 'own_only';
  reason?: string;
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

/**
 * 檢查使用者是否有權限存取特定模組
 */
export function usePermission(moduleId: string) {
  const { user } = useAuth();

  return useQuery<PermissionCheckResult>({
    queryKey: ['permission', 'check', moduleId, user?.id],
    queryFn: async () => {
      if (!user) {
        return { allowed: false, reason: '未登入' };
      }

      // Admin/super_admin 自動通過
      if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
        return { allowed: true, scope: 'all', reason: 'Admin bypass' };
      }

      const response = await fetch(`/api/permissions/check/${moduleId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return { allowed: false, reason: '權限檢查失敗' };
      }

      const data = await response.json();
      return data.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 分鐘快取
  });
}

/**
 * 取得使用者可存取的所有模組
 */
export function useMyModules() {
  const { user } = useAuth();

  return useQuery<PermissionModule[]>({
    queryKey: ['permission', 'my-modules', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const response = await fetch('/api/permissions/my-modules', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accessible modules');
      }

      const data = await response.json();
      return data.data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * 快速檢查：是否有權限（不需要 scope 詳情）
 */
export function useHasPermission(moduleId: string): boolean {
  const { data } = usePermission(moduleId);
  return data?.allowed ?? false;
}
