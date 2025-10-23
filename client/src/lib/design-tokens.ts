/**
 * Design Tokens - Global Design System
 *
 * Gray + Orange Color System (Apple/Notion Style)
 * - Gray: 80% usage (text, backgrounds, borders)
 * - Orange: 20% usage (emphasis, active states)
 *
 * References: Apple, Notion, Mailerlite
 * Created: 2025-10-23
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Gray Scale (Primary - 80% usage)
  gray: {
    50: 'bg-gray-50',        // Hover states, subtle backgrounds
    100: 'bg-gray-100',      // Badge backgrounds, borders
    200: 'bg-gray-200',      // Dividers, strong borders
    300: 'bg-gray-300',      // Low priority indicators
    400: 'bg-gray-400',      // Muted icons
    500: 'bg-gray-500',      // Secondary text
    600: 'bg-gray-600',      // Body text
    700: 'bg-gray-700',      // Important text
    800: 'bg-gray-800',      // Dark text
    900: 'bg-gray-900',      // Headings, primary text
  },

  // Orange Accent (Secondary - 20% usage)
  orange: {
    50: 'bg-orange-50',      // Active state backgrounds
    100: 'bg-orange-100',    // Light emphasis
    200: 'bg-orange-200',    // Borders for cards
    300: 'bg-orange-300',    // Medium priority dot
    400: 'bg-orange-400',    // Active borders, warnings
    500: 'bg-orange-500',    // High priority dot, emphasis
    600: 'bg-orange-600',    // Strong emphasis
  },

  // Semantic Colors (Special states)
  semantic: {
    success: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
  },
} as const;

// ============================================
// TEXT COLOR TOKENS
// ============================================

export const textColors = {
  // Gray text (primary)
  primary: 'text-gray-900',      // Headings, titles
  secondary: 'text-gray-700',    // Body text, important content
  tertiary: 'text-gray-600',     // Secondary content
  muted: 'text-gray-500',        // Hints, placeholders
  disabled: 'text-gray-400',     // Disabled states

  // Orange text (accent)
  accent: 'text-orange-600',     // Emphasis, links
  accentHover: 'text-orange-700', // Hover state

  // Semantic
  success: 'text-green-700',
  error: 'text-red-700',
  warning: 'text-yellow-700',
  info: 'text-blue-700',
} as const;

// ============================================
// TYPOGRAPHY TOKENS (3 sizes only)
// ============================================

export const typography = {
  // Sizes (only 3)
  lg: 'text-lg',    // 18px - Titles, headings
  sm: 'text-sm',    // 14px - Body text, table cells
  xs: 'text-xs',    // 12px - Captions, badges, hints

  // Weights
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  // Padding
  px: {
    xs: 'px-2',    // 8px
    sm: 'px-3',    // 12px
    md: 'px-4',    // 16px
    lg: 'px-6',    // 24px
  },
  py: {
    xs: 'py-1',    // 4px
    sm: 'py-2',    // 8px
    md: 'py-3',    // 12px
    lg: 'py-4',    // 16px
  },

  // Gap
  gap: {
    xs: 'gap-1',     // 4px
    sm: 'gap-1.5',   // 6px
    md: 'gap-2',     // 8px
    lg: 'gap-3',     // 12px
    xl: 'gap-4',     // 16px
  },

  // Space-y
  spaceY: {
    xs: 'space-y-1',   // 4px
    sm: 'space-y-2',   // 8px
    md: 'space-y-4',   // 16px
    lg: 'space-y-6',   // 24px
  },
} as const;

// ============================================
// BORDER TOKENS
// ============================================

export const borders = {
  // Border width
  width: {
    none: 'border-0',
    thin: 'border',         // 1px
    medium: 'border-2',     // 2px
    thick: 'border-4',      // 4px
  },

  // Border colors
  color: {
    gray: {
      light: 'border-gray-100',
      default: 'border-gray-200',
      dark: 'border-gray-300',
    },
    orange: {
      light: 'border-orange-200',
      default: 'border-orange-400',
    },
  },

  // Border radius
  radius: {
    none: 'rounded-none',
    sm: 'rounded',           // 4px
    md: 'rounded-md',        // 6px
    lg: 'rounded-lg',        // 8px
    full: 'rounded-full',    // Pills, badges
  },
} as const;

// ============================================
// COMPONENT TOKENS
// ============================================

export const components = {
  // Priority Dots
  priorityDot: {
    high: 'w-2 h-2 rounded-full bg-orange-500',
    medium: 'w-2 h-2 rounded-full bg-orange-300',
    low: 'w-2 h-2 rounded-full bg-gray-300',
  },

  // Badges
  badge: {
    base: 'px-2 py-1 text-xs rounded-full',
    variants: {
      success: 'px-2 py-1 text-xs rounded-full bg-green-50 text-green-700',
      error: 'px-2 py-1 text-xs rounded-full bg-red-50 text-red-700',
      warning: 'px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-700',
      info: 'px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700',
      neutral: 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700',
    },
  },

  // Buttons
  button: {
    base: 'px-3 h-8 text-xs rounded-md border transition-colors',
    variants: {
      default: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
      active: 'border-orange-400 bg-orange-50 text-orange-700',
      ghost: 'border-transparent bg-transparent text-gray-700 hover:bg-gray-50',
    },
  },

  // Cards
  card: {
    base: 'bg-white border rounded-lg shadow-sm',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50 transition-colors',
  },

  // Table Rows
  tableRow: {
    base: 'border-l-2 border-gray-100',
    hover: 'hover:bg-gray-50 transition-colors',
  },

  // Input Fields
  input: {
    base: 'h-8 px-3 text-xs rounded-md border border-gray-200 bg-white',
    focus: 'focus:border-orange-400 focus:ring-1 focus:ring-orange-400',
  },
} as const;

// ============================================
// SHADOW TOKENS
// ============================================

export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',       // Subtle elevation
  md: 'shadow-md',       // Cards, dialogs
  lg: 'shadow-lg',       // Modals
} as const;

// ============================================
// TRANSITION TOKENS
// ============================================

export const transitions = {
  colors: 'transition-colors',
  all: 'transition-all',
  fast: 'transition-all duration-150',
  normal: 'transition-all duration-300',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get priority dot className based on priority level
 */
export function getPriorityDotClass(priority: 'high' | 'medium' | 'low'): string {
  return components.priorityDot[priority];
}

/**
 * Get badge className based on variant
 */
export function getBadgeClass(variant: keyof typeof components.badge.variants): string {
  return components.badge.variants[variant];
}

/**
 * Get button className based on variant and active state
 */
export function getButtonClass(active: boolean = false): string {
  const base = components.button.base;
  const variant = active ? components.button.variants.active : components.button.variants.default;
  return `${base} ${variant}`;
}

/**
 * Combine className strings
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// PRIORITY CONFIG (migrated from student-insights.tsx)
// ============================================

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface PriorityConfig {
  label: string;
  dotColor: string;
  borderColor: string;
  textColor: string;
}

export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityConfig> = {
  high: {
    label: '高優先',
    dotColor: 'bg-orange-500',
    borderColor: 'border-orange-200',
    textColor: 'text-gray-600',
  },
  medium: {
    label: '中優先',
    dotColor: 'bg-orange-300',
    borderColor: 'border-orange-100',
    textColor: 'text-gray-600',
  },
  low: {
    label: '低優先',
    dotColor: 'bg-gray-300',
    borderColor: 'border-gray-100',
    textColor: 'text-gray-600',
  },
} as const;

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  colors,
  textColors,
  typography,
  spacing,
  borders,
  components,
  shadows,
  transitions,
  getPriorityDotClass,
  getBadgeClass,
  getButtonClass,
  cn,
  PRIORITY_CONFIG,
};
