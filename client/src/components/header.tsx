import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Database, BarChart3, Users, LogOut, Shield, ShoppingCart, MessageCircle, Network } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
}

export function Header({ connectionStatus, autoRefresh, onAutoRefreshChange }: HeaderProps) {
  const [location] = useLocation();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="glass dark:glass-dark rounded-xl p-2">
                <Sparkles className="text-primary" size={20} />
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" data-testid="app-title">
                Oh Sheet
              </h1>
            </div>
            
            {/* Admin Navigation */}
            <nav className="flex items-center space-x-1">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-sheets"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Google Sheets
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant={location === "/analytics" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-analytics"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  數據儀表板
                </Button>
              </Link>
              <Link href="/users">
                <Button 
                  variant={location === "/users" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-users"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  用戶
                </Button>
              </Link>
              <Link href="/purchase-records">
                <Button 
                  variant={location === "/purchase-records" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-purchase-records"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  購買記錄
                </Button>
              </Link>
              <Link href="/consultation-records">
                <Button 
                  variant={location === "/consultation-records" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-consultation-records"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  諮詢記錄
                </Button>
              </Link>
              <Link href="/multi-source-analytics">
                <Button 
                  variant={location === "/multi-source-analytics" ? "default" : "ghost"} 
                  size="sm" 
                  className="glass dark:glass-dark"
                  data-testid="nav-multi-source-analytics"
                >
                  <Network className="mr-2 h-4 w-4" />
                  多源分析
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Sync Status */}
            <div className="flex items-center space-x-2">
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)} ${
                  connectionStatus === 'connected' ? 'animate-pulse-gentle' : ''
                }`}
                data-testid="status-indicator"
              />
              <span className="text-sm text-muted-foreground" data-testid="status-text">
                {getStatusText(connectionStatus)}
              </span>
            </div>
            
            {/* Auto-refresh Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">Auto-refresh</label>
              <Switch
                checked={autoRefresh}
                onCheckedChange={onAutoRefreshChange}
                data-testid="auto-refresh-toggle"
              />
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <Button 
                variant="ghost" 
                className="glass dark:glass-dark flex items-center space-x-2 hover:bg-destructive/10"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    AD
                  </AvatarFallback>
                </Avatar>
                <span>Admin</span>
                <LogOut className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
