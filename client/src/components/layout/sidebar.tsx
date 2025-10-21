/**
 * 側邊選單組件
 * 支援階層式選單、展開/收合、圖標等功能
 */

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SidebarItemConfig {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: SidebarItemConfig[];
  badge?: string | number;
}

export interface SidebarSectionConfig {
  title?: string;
  items: SidebarItemConfig[];
}

interface SidebarProps {
  sections: SidebarSectionConfig[];
  className?: string;
  onItemClick?: (href: string) => void;
}

function SidebarItem({
  item,
  level = 0,
  onItemClick,
}: {
  item: SidebarItemConfig;
  level?: number;
  onItemClick?: (href: string) => void;
}) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? location === item.href : false;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (item.href) {
      onItemClick?.(item.href);
    }
  };

  const ItemContent = (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium',
        level > 0 && 'ml-4'
      )}
      onClick={handleClick}
    >
      {/* 展開/收合圖標 */}
      {hasChildren && (
        <div className="w-4 h-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      )}

      {/* 項目圖標 */}
      {item.icon && !hasChildren && (
        <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
      )}

      {/* 標籤 */}
      <span className="flex-1 text-sm">{item.label}</span>

      {/* Badge */}
      {item.badge && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
          {item.badge}
        </span>
      )}
    </div>
  );

  return (
    <div>
      {/* 主項目 */}
      {item.href && !hasChildren ? (
        <Link href={item.href}>{ItemContent}</Link>
      ) : (
        ItemContent
      )}

      {/* 子項目 */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child, index) => (
            <SidebarItem
              key={index}
              item={child}
              level={level + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarSection({ section, onItemClick }: { section: SidebarSectionConfig; onItemClick?: (href: string) => void }) {
  return (
    <div className="py-2">
      {/* 區塊標題 */}
      {section.title && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {section.title}
        </h3>
      )}

      {/* 項目列表 */}
      <div className="space-y-1">
        {section.items.map((item, index) => (
          <SidebarItem key={index} item={item} onItemClick={onItemClick} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ sections, className, onItemClick }: SidebarProps) {
  return (
    <div className={cn('w-64 border-r bg-background h-full flex flex-col', className)}>
      <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">
        <div className="space-y-4 px-3 py-4">
          {sections.map((section, index) => (
            <SidebarSection key={index} section={section} onItemClick={onItemClick} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
