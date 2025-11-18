/**
 * CopyableText Component
 *
 * A text component that copies content to clipboard when clicked.
 * Shows visual feedback and toast notification on successful copy.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check } from "lucide-react"

interface CopyableTextProps {
  /** The text content to display and copy */
  text: string
  /** Display label (optional, defaults to text) */
  label?: string
  /** Optional className for styling */
  className?: string
  /** Type of content (for toast message) */
  type?: 'email' | 'phone' | 'text'
  /** Show copy icon on hover */
  showIcon?: boolean
}

export function CopyableText({
  text,
  label,
  className,
  type = 'text',
  showIcon = false
}: CopyableTextProps) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click if used in table

    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      // Show toast notification
      const typeLabels = {
        email: 'Email',
        phone: '電話',
        text: '文字'
      }

      toast({
        title: "複製成功",
        description: `${typeLabels[type]} 已複製到剪貼簿`,
        duration: 2000,
      })

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        title: "複製失敗",
        description: "無法複製到剪貼簿",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  if (!text) {
    return <span className={cn("text-muted-foreground", className)}>-</span>
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "group inline-flex items-center gap-1.5 text-left",
        "hover:text-primary transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "rounded-sm px-1 -mx-1", // Add padding for better click area
        className
      )}
      title={`點擊複製 ${type === 'email' ? 'Email' : type === 'phone' ? '電話' : ''}`}
    >
      <span className={cn(
        "transition-colors",
        copied && "text-green-600"
      )}>
        {label || text}
      </span>

      {showIcon && (
        <span className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          copied && "opacity-100"
        )}>
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </span>
      )}
    </button>
  )
}

/**
 * Compact variant without icon, optimized for table cells
 */
export function CopyableTableCell({
  text,
  label,
  className,
  type = 'text'
}: Omit<CopyableTextProps, 'showIcon'>) {
  return (
    <CopyableText
      text={text}
      label={label}
      className={cn("text-sm", className)}
      type={type}
      showIcon={false}
    />
  )
}

/**
 * Variant with icon, optimized for detail views
 */
export function CopyableWithIcon({
  text,
  label,
  className,
  type = 'text'
}: Omit<CopyableTextProps, 'showIcon'>) {
  return (
    <CopyableText
      text={text}
      label={label}
      className={className}
      type={type}
      showIcon={true}
    />
  )
}
