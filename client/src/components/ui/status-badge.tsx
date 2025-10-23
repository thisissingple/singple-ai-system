/**
 * StatusBadge Component
 *
 * Unified rounded-full badge component for status display
 * Part of the Gray + Orange design system
 */

import { getBadgeClass } from '@/lib/design-tokens';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
  className?: string;
}

export function StatusBadge({ children, variant, className = '' }: StatusBadgeProps) {
  const badgeClass = getBadgeClass(variant);

  return <span className={`${badgeClass} ${className}`}>{children}</span>;
}

/**
 * Helper function to determine badge variant based on status string
 */
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case '已轉高':
    case '已完成':
    case '出席':
    case '已接通':
      return 'success';

    case '未轉高':
    case '缺席':
    case '拒接':
    case '無效':
      return 'error';

    case '體驗中':
    case '進行中':
    case '考慮中':
      return 'info';

    case '未開始':
    case '待處理':
      return 'neutral';

    default:
      return 'neutral';
  }
}
