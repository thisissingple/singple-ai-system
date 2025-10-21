/**
 * Redefine KPI Dialog Component
 * 讓使用者用自然語言重新定義 KPI
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ParsedDefinition {
  numerator: {
    label: string;
    conditions: string[];
  };
  denominator: {
    label: string;
    conditions: string[];
  };
  needsConfirmation?: Array<{
    question: string;
    defaultValue?: string | number;
    key: string;
    field?: string;
    options?: string[];
    userInput?: string;
  }>;
}

interface PreviewResult {
  numeratorCount: number;
  denominatorCount: number;
  value: number;
  isValid: boolean;
}

interface RedefineKPIDialogProps {
  open: boolean;
  onClose: () => void;
  kpiName: string;
  kpiLabel: string;
  currentValue: number;
  currentDefinition?: string;
}

export function RedefineKPIDialog({
  open,
  onClose,
  kpiName,
  kpiLabel,
  currentValue,
  currentDefinition
}: RedefineKPIDialogProps) {
  const [userInput, setUserInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedDefinition, setParsedDefinition] = useState<ParsedDefinition | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<Record<string, any>>({});

  const handleAnalyze = async () => {
    if (!userInput.trim()) {
      setError('請輸入定義');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 呼叫 AI 解析 API
      const response = await fetch('/api/kpi/parse-definition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiName,
          definition: userInput,
        }),
      });

      if (!response.ok) {
        throw new Error('解析失敗');
      }

      const data = await response.json();
      setParsedDefinition(data.parsed);

      // 如果有需要確認的參數，設定預設值
      let defaults: Record<string, any> = {};
      if (data.parsed.needsConfirmation) {
        data.parsed.needsConfirmation.forEach((item: any) => {
          // 如果有選項，預設選第一個；否則使用 defaultValue
          if (item.options && item.options.length > 0) {
            defaults[item.key] = item.options[0];
          } else if (item.defaultValue !== undefined) {
            defaults[item.key] = item.defaultValue;
          }
        });
        setConfirmations(defaults);
      }

      // 立即計算預覽
      await calculatePreview(data.parsed, defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失敗');
      setParsedDefinition(null);
      setPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculatePreview = async (definition: ParsedDefinition, params: Record<string, any>) => {
    try {
      const response = await fetch('/api/kpi/preview-calculation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiName,
          definition,
          parameters: params,
        }),
      });

      if (!response.ok) {
        throw new Error('計算失敗');
      }

      const data = await response.json();
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : '計算失敗');
    }
  };

  const handleSave = async () => {
    if (!parsedDefinition || !preview) return;

    try {
      const response = await fetch('/api/kpi/save-definition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiName,
          naturalLanguage: userInput,
          parsedDefinition,
          parameters: confirmations,
        }),
      });

      if (!response.ok) {
        throw new Error('儲存失敗');
      }

      // 成功後關閉並重新計算
      onClose();
      // TODO: 觸發報表重新載入
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            重新定義：{kpiLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 當前狀態 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>當前值：{currentValue.toFixed(1)}%</span>
                {currentValue > 100 && (
                  <Badge variant="destructive">異常 (超過 100%)</Badge>
                )}
              </div>
              {currentDefinition && (
                <p className="text-xs text-muted-foreground mt-1">
                  當前定義：{currentDefinition}
                </p>
              )}
            </AlertDescription>
          </Alert>

          {/* 自然語言輸入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              💬 用自然語言告訴 AI 你的定義：
            </label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="例如：已上過體驗課升高階的學生 / 已上完課的學生"
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !userInput.trim()}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  發送給 AI 分析
                </>
              )}
            </Button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* AI 理解的定義 */}
          {parsedDefinition && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  🤖 AI 理解的定義：
                </h3>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        分子：{parsedDefinition.numerator.label}
                      </p>
                      <ul className="text-sm text-muted-foreground ml-4 mt-1 space-y-1">
                        {parsedDefinition.numerator.conditions.map((cond, idx) => (
                          <li key={idx}>- {cond}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">
                        分母：{parsedDefinition.denominator.label}
                      </p>
                      <ul className="text-sm text-muted-foreground ml-4 mt-1 space-y-1">
                        {parsedDefinition.denominator.conditions.map((cond, idx) => (
                          <li key={idx}>- {cond}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 需要確認的參數 */}
                {parsedDefinition.needsConfirmation && parsedDefinition.needsConfirmation.length > 0 && (
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <h4 className="text-sm font-medium">❓ AI 需要確認：</h4>
                    {parsedDefinition.needsConfirmation.map((item) => (
                      <div key={item.key} className="space-y-2">
                        <label className="text-sm font-medium">
                          {item.question}
                          {item.userInput && (
                            <span className="text-muted-foreground ml-2">
                              (你輸入的：「{item.userInput}」)
                            </span>
                          )}
                        </label>

                        {/* 如果有選項列表，顯示單選按鈕 */}
                        {item.options && item.options.length > 0 ? (
                          <div className="space-y-1 pl-4">
                            {item.options.map((option) => (
                              <label
                                key={option}
                                className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded"
                              >
                                <input
                                  type="radio"
                                  name={item.key}
                                  value={option}
                                  checked={confirmations[item.key] === option}
                                  onChange={(e) => {
                                    const newConfirmations = {
                                      ...confirmations,
                                      [item.key]: e.target.value
                                    };
                                    setConfirmations(newConfirmations);
                                    // 選擇後自動重新計算預覽
                                    if (parsedDefinition) {
                                      calculatePreview(parsedDefinition, newConfirmations);
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          /* 沒有選項時，顯示輸入框 */
                          <input
                            type="text"
                            value={confirmations[item.key] || item.defaultValue || ''}
                            onChange={(e) => setConfirmations({
                              ...confirmations,
                              [item.key]: e.target.value
                            })}
                            className="border rounded px-2 py-1 text-sm w-full"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 即時預覽 */}
          {preview && (
            <Card className={preview.isValid ? 'border-green-300' : 'border-orange-300'}>
              <CardContent className="pt-4">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  🔍 即時預覽：
                </h3>
                <div className="space-y-1 text-sm">
                  <p>• 符合條件（分子）：{preview.numeratorCount} 人</p>
                  <p>• 總數（分母）：{preview.denominatorCount} 人</p>
                  <p className="font-bold text-lg mt-2">
                    計算結果：{preview.value.toFixed(1)}%
                    {preview.isValid ? (
                      <Badge variant="default" className="ml-2">✅ 結果合理</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2">⚠️ 仍有問題</Badge>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!parsedDefinition || !preview || !preview.isValid}
          >
            💾 套用此定義
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
