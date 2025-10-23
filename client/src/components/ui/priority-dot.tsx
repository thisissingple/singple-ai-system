/**
 * PriorityDot Component
 *
 * Displays a colored dot indicator for priority levels
 * Part of the Gray + Orange design system
 */

import { getPriorityDotClass, type PriorityLevel } from '@/lib/design-tokens';

interface PriorityDotProps {
  priority: PriorityLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export function PriorityDot({ priority, size = 'md', className = '' }: PriorityDotProps) {
  const dotClass = getPriorityDotClass(priority);
  const sizeClass = sizeMap[size];

  return <div className={`rounded-full ${sizeClass} ${dotClass} ${className}`} />;
}
