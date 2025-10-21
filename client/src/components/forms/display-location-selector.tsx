/**
 * Display Location Selector
 * 顯示位置選擇器組件
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DisplayLocations, RoleType, SidebarSection } from '@/types/custom-form';
import { ROLE_LABELS, SIDEBAR_SECTION_LABELS } from '@/types/custom-form';

interface DisplayLocationSelectorProps {
  value: DisplayLocations;
  onChange: (value: DisplayLocations) => void;
}

export function DisplayLocationSelector({ value, onChange }: DisplayLocationSelectorProps) {
  const handleTabToggle = (role: RoleType, checked: boolean) => {
    const newTabs = checked
      ? [...value.tabs, role]
      : value.tabs.filter(t => t !== role);

    onChange({ ...value, tabs: newTabs });
  };

  const handleSidebarToggle = (checked: boolean) => {
    onChange({
      ...value,
      sidebar: checked,
      sidebar_section: checked ? (value.sidebar_section || 'tools') : undefined
    });
  };

  const handleSidebarSectionChange = (section: SidebarSection) => {
    onChange({ ...value, sidebar_section: section });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>顯示位置</CardTitle>
        <CardDescription>
          選擇此表單要顯示在哪些地方
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tab 選擇 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">表單填寫頁面 Tab</Label>
          <p className="text-sm text-muted-foreground">
            選擇要顯示在哪些角色專區
          </p>
          <div className="space-y-2">
            {(['teacher', 'telemarketing', 'consultant'] as RoleType[]).map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={`tab-${role}`}
                  checked={value.tabs.includes(role)}
                  onCheckedChange={(checked) => handleTabToggle(role, checked as boolean)}
                />
                <Label
                  htmlFor={`tab-${role}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {ROLE_LABELS[role]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* 側邊選單選擇 */}
        <div className="space-y-3">
          <Label className="text-base font-medium">側邊選單</Label>
          <p className="text-sm text-muted-foreground">
            是否在側邊選單顯示此表單
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sidebar"
                checked={value.sidebar}
                onCheckedChange={handleSidebarToggle}
              />
              <Label
                htmlFor="sidebar"
                className="text-sm font-normal cursor-pointer"
              >
                顯示在側邊選單
              </Label>
            </div>

            {value.sidebar && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="sidebar-section" className="text-sm">
                  選擇區域
                </Label>
                <Select
                  value={value.sidebar_section || 'tools'}
                  onValueChange={(v) => handleSidebarSectionChange(v as SidebarSection)}
                >
                  <SelectTrigger id="sidebar-section" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['tools', 'reports', 'settings'] as SidebarSection[]).map((section) => (
                      <SelectItem key={section} value={section}>
                        {SIDEBAR_SECTION_LABELS[section]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* 預覽 */}
        {(value.tabs.length > 0 || value.sidebar) && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">預覽</Label>
            <div className="mt-2 text-sm text-muted-foreground">
              此表單將顯示在：
              <ul className="list-disc list-inside mt-1 space-y-1">
                {value.tabs.map((tab) => (
                  <li key={tab}>表單填寫 → {ROLE_LABELS[tab]}</li>
                ))}
                {value.sidebar && (
                  <li>
                    側邊選單 → {SIDEBAR_SECTION_LABELS[value.sidebar_section || 'tools']}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
