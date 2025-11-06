/**
 * Impersonation Banner Component
 * Shows a floating button when admin is impersonating another user
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ImpersonationBanner() {
  const { toast } = useToast();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserName, setImpersonatedUserName] = useState('');

  useEffect(() => {
    // Check if currently impersonating
    const checkImpersonationStatus = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.user.isImpersonating) {
            setIsImpersonating(true);
            setImpersonatedUserName(`${data.user.first_name} ${data.user.last_name}`);
          } else {
            setIsImpersonating(false);
          }
        }
      } catch (error) {
        console.error('Failed to check impersonation status:', error);
      }
    };

    checkImpersonationStatus();
  }, []);

  const handleStopImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/stop-impersonate', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to stop impersonation');
      }

      toast({
        title: '成功',
        description: '已返回管理員視角',
      });

      // Reload page to refresh UI
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-yellow-900 text-sm mb-1">
              正在模擬用戶
            </h3>
            <p className="text-sm text-yellow-800 mb-3 break-words">
              目前以 <span className="font-medium">{impersonatedUserName}</span> 的身份查看系統
            </p>
            <Button
              size="sm"
              variant="default"
              onClick={handleStopImpersonation}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              返回管理員視角
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
