/**
 * FilterButton Component
 *
 * Unified filter button with gray + orange active state
 * Part of the Gray + Orange design system
 */

import { getButtonClass } from '@/lib/design-tokens';

interface FilterButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FilterButton({
  children,
  active = false,
  onClick,
  className = '',
}: FilterButtonProps) {
  const buttonClass = getButtonClass(active);

  return (
    <button onClick={onClick} className={`${buttonClass} ${className}`}>
      {children}
    </button>
  );
}
