/**
 * 表單填寫主頁面
 * 顯示表單列表，點擊後彈出填寫
 */

import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, Phone, Briefcase, Settings, FileText, Plus, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DynamicFormRenderer } from '@/components/forms/dynamic-form-renderer';
import { useToast } from '@/hooks/use-toast';
import type { FormConfig, RoleType } from '@/types/custom-form';

// 內建表單（暫時保留）
import ConsultationForm from './consultation-form';
import TelemarketingForm from './telemarketing-form';

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState<RoleType>('teacher');
  const [customForms, setCustomForms] = useState<FormConfig[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [allForms, setAllForms] = useState<FormConfig[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<RoleType>('teacher');
  const { toast } = useToast();

  useEffect(() => {
    loadCustomForms();
  }, []);

  const loadCustomForms = async () => {
    try {
      const response = await fetch('/api/forms/custom?status=active');
      const data = await response.json();

      if (data.success) {
        setCustomForms(data.forms);
        setAllForms(data.forms);
      }
    } catch (error) {
      console.error('載入自訂表單失敗:', error);
      toast({
        title: '錯誤',
        description: '無法載入自訂表單',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFormToTab = async () => {
    if (!selectedFormId || !selectedTab) {
      toast({
        title: '請選擇表單和分頁',
        variant: 'destructive',
      });
      return;
    }

    const form = allForms.find(f => f.id === selectedFormId);
    if (!form) return;

    const currentTabs = form.display_locations.tabs || [];

    // 檢查是否已經存在
    if (currentTabs.includes(selectedTab)) {
      toast({
        title: '此表單已存在於該分頁中',
        variant: 'destructive',
      });
      return;
    }

    const newTabs = [...currentTabs, selectedTab];

    try {
      const response = await fetch(`/api/forms/custom/${selectedFormId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          display_locations: {
            ...form.display_locations,
            tabs: newTabs,
          },
        }),
      });

      if (response.ok) {
        const updatedForms = allForms.map(f =>
          f.id === selectedFormId
            ? { ...f, display_locations: { ...f.display_locations, tabs: newTabs } }
            : f
        );
        setAllForms(updatedForms);
        setCustomForms(updatedForms);

        // 重置選擇
        setSelectedFormId('');

        toast({
          title: '成功',
          description: '表單已加入分頁',
        });
      } else {
        throw new Error('更新失敗');
      }
    } catch (error) {
      toast({
        title: '錯誤',
        description: '更新表單顯示位置失敗',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFormFromTab = async (formId: string, tab: RoleType) => {
    const form = allForms.find(f => f.id === formId);
    if (!form) return;

    const newTabs = form.display_locations.tabs.filter(t => t !== tab);

    try {
      const response = await fetch(`/api/forms/custom/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          display_locations: {
            ...form.display_locations,
            tabs: newTabs,
          },
        }),
      });

      if (response.ok) {
        const updatedForms = allForms.map(f =>
          f.id === formId
            ? { ...f, display_locations: { ...f.display_locations, tabs: newTabs } }
            : f
        );
        setAllForms(updatedForms);
        setCustomForms(updatedForms);

        toast({
          title: '成功',
          description: '表單已從分頁移除',
        });
      }
    } catch (error) {
      toast({
        title: '錯誤',
        description: '移除失敗',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = async (
    form: FormConfig,
    event?: MouseEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    event?.stopPropagation();

    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/forms/share/${form.id}`
        : `/forms/share/${form.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: '已複製表單連結',
        description: '貼上即可分享給需要填寫的老師',
      });
    } catch (error) {
      console.error('複製連結失敗:', error);
      toast({
        title: '無法自動複製',
        description: '請手動複製顯示的連結',
        variant: 'destructive',
      });
      window.prompt?.('請複製以下表單連結', shareUrl);
    }
  };

  // 篩選當前 Tab 的表單
  const getFormsForTab = (role: RoleType) => {
    return customForms.filter(form =>
      form.display_locations.tabs.includes(role)
    );
  };

  const handleFormSuccess = () => {
    toast({
      title: '成功',
      description: '表單已提交',
    });
    setSelectedForm(null);
  };

  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="表單填寫">
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">資料填寫</h1>
            <p className="text-muted-foreground mt-1">
              選擇表單進行填寫，資料將即時同步至報表系統
            </p>
          </div>
          <Button onClick={() => setShowManageDialog(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            管理表單分配
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RoleType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teacher">
              <GraduationCap className="h-4 w-4 mr-2" />
              老師專區
            </TabsTrigger>
            <TabsTrigger value="telemarketing">
              <Phone className="h-4 w-4 mr-2" />
              電訪人員專區
            </TabsTrigger>
            <TabsTrigger value="consultant">
              <Briefcase className="h-4 w-4 mr-2" />
              諮詢師專區
            </TabsTrigger>
          </TabsList>

          {/* 老師專區 */}
          <TabsContent value="teacher" className="mt-6">
            <div className="space-y-4">
              {/* 自訂表單（包含體驗課打卡表單） */}
              {getFormsForTab('teacher').map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedForm(form)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>{form.name}</CardTitle>
                          {form.description && (
                            <CardDescription>{form.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedForm(form);
                          }}
                        >
                          填寫表單
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => handleCopyLink(form, event)}
                        >
                          <Copy className="mr-1 h-4 w-4" />
                          複製連結
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {loading && (
                <div className="text-center py-8 text-muted-foreground">
                  載入中...
                </div>
              )}

              {!loading && getFormsForTab('teacher').length === 0 && (
                <Card>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <p>此分類暫無自訂表單</p>
                    <p className="text-sm mt-2">請至「設定 → 表單管理」建立新表單</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 電訪人員專區 */}
          <TabsContent value="telemarketing" className="mt-6">
            <div className="space-y-4">
              {/* 內建表單 */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>電訪記錄</CardTitle>
                        <CardDescription>記錄電話訪問的結果</CardDescription>
                      </div>
                    </div>
                    <Dialog>
                      <Button onClick={() => {}} variant="outline">
                        填寫表單
                      </Button>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>電訪記錄</DialogTitle>
                        </DialogHeader>
                        <TelemarketingForm />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              </Card>

              {/* 自訂表單 */}
              {getFormsForTab('telemarketing').map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedForm(form)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>{form.name}</CardTitle>
                        {form.description && (
                          <CardDescription>{form.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedForm(form);
                        }}
                      >
                        填寫表單
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => handleCopyLink(form, event)}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        複製連結
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}

              {!loading && getFormsForTab('telemarketing').length === 0 && (
                <Card>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <p>此分類暫無自訂表單</p>
                    <p className="text-sm mt-2">請至「設定 → 表單管理」建立新表單</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 諮詢師專區 */}
          <TabsContent value="consultant" className="mt-6">
            <div className="space-y-4">
              {/* 內建表單 */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>諮詢記錄 (EODs for Closers)</CardTitle>
                        <CardDescription>記錄諮詢師的成交記錄</CardDescription>
                      </div>
                    </div>
                    <Dialog>
                      <Button onClick={() => {}} variant="outline">
                        填寫表單
                      </Button>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>諮詢記錄</DialogTitle>
                        </DialogHeader>
                        <ConsultationForm />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              </Card>

              {/* 自訂表單 */}
              {getFormsForTab('consultant').map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedForm(form)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>{form.name}</CardTitle>
                        {form.description && (
                          <CardDescription>{form.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedForm(form);
                        }}
                      >
                        填寫表單
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => handleCopyLink(form, event)}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        複製連結
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}

              {!loading && getFormsForTab('consultant').length === 0 && (
                <Card>
                  <CardContent className="text-center py-12 text-muted-foreground">
                    <p>此分類暫無自訂表單</p>
                    <p className="text-sm mt-2">請至「設定 → 表單管理」建立新表單</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 自訂表單彈出視窗 */}
      <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedForm && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedForm.name}</DialogTitle>
              </DialogHeader>
              <DynamicFormRenderer
                formConfig={selectedForm}
                onSuccess={handleFormSuccess}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 管理表單分配對話框 */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>管理表單分配</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              選擇表單並分配到指定分頁
            </p>
          </DialogHeader>

          {allForms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>尚無自訂表單</p>
              <p className="text-sm mt-2">請先到「設定 → 表單管理」建立表單</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* 新增表單到分頁 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">新增表單到分頁</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">選擇表單</label>
                      <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                        <SelectTrigger>
                          <SelectValue placeholder="請選擇表單" />
                        </SelectTrigger>
                        <SelectContent>
                          {allForms.map((form) => (
                            <SelectItem key={form.id} value={form.id}>
                              {form.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">分配到分頁</label>
                      <Select value={selectedTab} onValueChange={(v) => setSelectedTab(v as RoleType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="請選擇分頁" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">老師專區</SelectItem>
                          <SelectItem value="telemarketing">電訪人員專區</SelectItem>
                          <SelectItem value="consultant">諮詢師專區</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAddFormToTab} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    新增到分頁
                  </Button>
                </CardContent>
              </Card>

              {/* 當前分配狀態 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">當前分配狀態</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allForms.filter(f => f.display_locations.tabs.length > 0).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        尚未分配任何表單
                      </p>
                    ) : (
                      allForms
                        .filter(f => f.display_locations.tabs.length > 0)
                        .map((form) => (
                          <div key={form.id} className="border rounded-lg p-3">
                            <div className="font-medium text-sm mb-2">{form.name}</div>
                            <div className="flex flex-wrap gap-2">
                              {form.display_locations.tabs.map((tab) => (
                                <div
                                  key={tab}
                                  className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-sm"
                                >
                                  <span>
                                    {tab === 'teacher' && '老師專區'}
                                    {tab === 'telemarketing' && '電訪人員專區'}
                                    {tab === 'consultant' && '諮詢師專區'}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveFormFromTab(form.id, tab)}
                                    className="hover:text-destructive"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowManageDialog(false)}>
              完成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
