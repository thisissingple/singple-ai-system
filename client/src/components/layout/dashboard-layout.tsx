/**
 * 儀表板主佈局
 * 包含：頂部導航欄、側邊選單、主內容區
 * 支援：拖曳收合側邊欄
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sidebar, type SidebarSectionConfig } from './sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Bell, User, PanelLeftClose, PanelLeft, LogOut, Key, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarSections: SidebarSectionConfig[];
  title?: string;
  className?: string;
}

export function DashboardLayout({
  children,
  sidebarSections,
  title = '簡單歌唱 Singple',
  className,
}: DashboardLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 登出處理
  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('登出失敗:', error);
      alert('登出失敗，請稍後再試');
    }
  };

  // 拖曳相關事件處理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      // 如果滑鼠移動到左側 100px 以內，收合側邊欄
      if (e.clientX < 100) {
        setIsSidebarOpen(false);
        setIsDragging(false);
      }
      // 如果滑鼠移動到右側（> 200px），展開側邊欄
      else if (e.clientX > 200 && !isSidebarOpen) {
        setIsSidebarOpen(true);
        setIsDragging(false);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isSidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航欄 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          {/* 側邊選單切換按鈕 - 所有螢幕尺寸都顯示 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? '收合側邊欄' : '展開側邊欄'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>

          {/* Logo/品牌名稱 */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">簡單歌唱 Singple</h1>
          </div>

          {/* 頁面標題（如果與預設不同） */}
          {title !== '簡單歌唱 Singple' && (
            <>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{title}</span>
            </>
          )}

          {/* 右側工具列 */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>

            {/* 使用者選單 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.first_name || '管理員'} {user?.last_name || ''}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'admin@example.com'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      角色: {user?.roles?.join(', ') || user?.role || 'admin'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/change-password')}>
                  <Key className="mr-2 h-4 w-4" />
                  修改密碼
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings/users')}>
                  <Settings className="mr-2 h-4 w-4" />
                  系統設定
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 主體區域 */}
      <div className="flex relative">
        {/* 側邊選單 - 支援所有螢幕尺寸收合 */}
        <aside
          ref={sidebarRef}
          className={cn(
            'h-[calc(100vh-3.5rem)] shrink-0 transition-all duration-300 ease-in-out',
            'fixed left-0 top-14 z-40',
            'md:sticky md:top-14',
            'bg-background border-r overflow-hidden',
            isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
          )}
        >
          <div className="relative h-full w-64">
            <Sidebar sections={sidebarSections} />

            {/* 拖曳手把 - 在側邊欄右側邊緣 */}
            {isSidebarOpen && (
              <div
                className={cn(
                  'absolute top-0 right-0 w-1 h-full cursor-col-resize z-50',
                  'hover:bg-primary/20 transition-colors',
                  isDragging && 'bg-primary/40'
                )}
                onMouseDown={handleMouseDown}
                title="拖曳以收合側邊欄"
              />
            )}
          </div>
        </aside>

        {/* 主內容區 - 側邊欄收合時佔滿寬度 */}
        <main
          className={cn(
            'flex-1 overflow-auto h-[calc(100vh-3.5rem)] transition-all duration-300 ease-in-out',
            className
          )}
        >
          {children}
        </main>
      </div>

      {/* 遮罩（手機版） */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
