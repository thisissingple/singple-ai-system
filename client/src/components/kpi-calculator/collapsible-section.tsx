/**
 * Collapsible Section Component
 * Expandable/collapsible section for KPI calculation steps
 */

import { useState, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
  icon?: ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  icon,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="border-2">
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
