import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  BarChart3, 
  Users, 
  Sparkles,
  ArrowRight,
  Eye,
  Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DashboardTemplate {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: string;
  config: any;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface DashboardTemplatesProps {
  onUseTemplate: (templateId: string) => void;
}

export function DashboardTemplates({ onUseTemplate }: DashboardTemplatesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 獲取模板列表
  const { data: templates = [], isLoading } = useQuery<DashboardTemplate[]>({
    queryKey: ['/api/dashboards/templates'],
    queryFn: async () => {
      return apiRequest<DashboardTemplate[]>('GET', '/api/dashboards/templates');
    }
  });

  // 使用模板創建儀表板
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest('POST', '/api/dashboards/from-template', { templateId });
    },
    onSuccess: () => {
      toast({
        title: "儀表板創建成功",
        description: "已從模板創建新的儀表板，您可以在「我的儀表板」中查看和編輯。"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards'] });
    },
    onError: (error: any) => {
      toast({
        title: "創建失敗",
        description: error.message || "無法從模板創建儀表板，請稍後再試。",
        variant: "destructive"
      });
    }
  });

  const handleUseTemplate = (templateId: string) => {
    useTemplateMutation.mutate(templateId);
    onUseTemplate(templateId);
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'conversion':
        return <TrendingUp className="h-8 w-8" />;
      case 'sales':
        return <BarChart3 className="h-8 w-8" />;
      case 'user_analytics':
        return <Users className="h-8 w-8" />;
      default:
        return <Sparkles className="h-8 w-8" />;
    }
  };

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'conversion':
        return 'from-green-500/20 to-blue-500/20 border-green-500/30';
      case 'sales':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'user_analytics':
        return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
      default:
        return 'from-gray-500/20 to-blue-500/20 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-8 bg-muted rounded w-8"></div>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded mb-4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暫無可用模板</h3>
          <p className="text-muted-foreground mb-6">
            管理員尚未創建任何儀表板模板
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">儀表板模板</h2>
          <p className="text-muted-foreground mt-1">
            選擇預製模板快速開始，或創建自定義儀表板
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {templates.length} 個模板
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`group hover:shadow-lg transition-all duration-200 bg-gradient-to-br ${getTemplateColor(template.type)} hover:scale-[1.02]`}
            data-testid={`template-card-${template.type}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/80 text-foreground">
                    {getTemplateIcon(template.type)}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-foreground">
                      {template.displayName}
                    </CardTitle>
                    {template.isDefault && (
                      <Badge variant="outline" className="text-xs">
                        推薦
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {template.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {template.description}
                </p>
              )}
              
              {/* 模板特性預覽 */}
              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                  包含功能
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.config?.widgets?.slice(0, 3).map((widget: any, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {widget.title}
                    </Badge>
                  ))}
                  {template.config?.widgets?.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.config.widgets.length - 3} 更多
                    </Badge>
                  )}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={useTemplateMutation.isPending}
                  data-testid={`use-template-${template.type}`}
                >
                  {useTemplateMutation.isPending ? (
                    "創建中..."
                  ) : (
                    <>
                      使用模板
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* 自定義提示 */}
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-2">需要更多自定義？</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            使用模板後，您可以在「我的儀表板」中完全自定義版塊、數據源和佈局
          </p>
          <Badge variant="outline">
            支持拖拽編輯、數據源配置、自定義計算
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}