/**
 * Public Form Page
 * 透過分享連結直接填寫自訂表單
 */

import { useEffect, useMemo, useState } from 'react';
import { useRoute } from 'wouter';
import { Loader2 } from 'lucide-react';
import { DynamicFormRenderer } from '@/components/forms/dynamic-form-renderer';
import type { FormConfig } from '@/types/custom-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function PublicFormPage() {
  const [, params] = useRoute('/forms/share/:id');
  const formId = params?.id;

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!formId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    void fetch(`/api/forms/custom/${formId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('找不到指定的表單或連結已失效');
        }
        const data = await response.json();
        if (isMounted) {
          setFormConfig(data.form);
        }
      })
      .catch((err) => {
        console.error('載入表單失敗:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : '無法載入表單');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [formId]);

  const pageTitle = useMemo(() => {
    if (formConfig) return `${formConfig.name} - 線上填寫`;
    return '表單填寫';
  }, [formConfig]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">線上表單填寫</h1>
          <p className="text-muted-foreground">
            請確認資訊後提交，資料會自動同步到系統
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <Alert variant="destructive">
            <AlertTitle>無法開啟表單</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && formConfig && (
          <Card>
            <CardHeader>
              <CardTitle>{formConfig.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {submitted && (
                <Alert className="border-green-300 bg-green-50 text-green-800">
                  <AlertTitle>已成功送出</AlertTitle>
                  <AlertDescription>
                    感謝填寫！如需再次提交，可重新整理或關閉此頁面。
                  </AlertDescription>
                </Alert>
              )}

              <DynamicFormRenderer
                formConfig={formConfig}
                onSuccess={() => setSubmitted(true)}
              />

              {submitted && (
                <div className="text-center">
                  <Button size="sm" variant="outline" onClick={() => setSubmitted(false)}>
                    重新填寫
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
