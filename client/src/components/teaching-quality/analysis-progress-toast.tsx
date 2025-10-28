/**
 * Analysis Progress Toast
 * Shows real-time progress of background analysis jobs
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisJobStatus {
  id: string;
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  result?: any;
}

interface AnalysisProgressToastProps {
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function AnalysisProgressToast({
  jobId,
  onComplete,
  onError,
}: AnalysisProgressToastProps) {
  const [job, setJob] = useState<AnalysisJobStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    let pollInterval: NodeJS.Timeout;
    let isPolling = true;

    async function pollJobStatus() {
      try {
        const response = await fetch(`/api/teaching-quality/job-status/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        const updatedJob: AnalysisJobStatus = data.job;

        setJob(updatedJob);

        // Stop polling when job is completed or failed
        if (updatedJob.status === 'completed') {
          isPolling = false;
          onComplete?.();

          // Auto-hide after 3 seconds
          setTimeout(() => setIsVisible(false), 3000);
        } else if (updatedJob.status === 'failed') {
          isPolling = false;
          onError?.(updatedJob.errorMessage || 'Analysis failed');

          // Auto-hide after 5 seconds
          setTimeout(() => setIsVisible(false), 5000);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        // Continue polling even on error
      }
    }

    // Initial poll
    pollJobStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(() => {
      if (isPolling) {
        pollJobStatus();
      } else {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [jobId, onComplete, onError]);

  if (!isVisible || !job) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-in slide-in-from-bottom-5">
      <Card className={cn(
        "shadow-lg border-2",
        job.status === 'completed' && "border-green-500 bg-green-50",
        job.status === 'failed' && "border-red-500 bg-red-50",
        job.status === 'processing' && "border-blue-500 bg-blue-50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {job.status === 'pending' && (
                <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
              )}
              {job.status === 'processing' && (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {job.status === 'completed' && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {job.status === 'failed' && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {job.status === 'pending' && '準備重新分析...'}
                {job.status === 'processing' && '正在重新分析...'}
                {job.status === 'completed' && '✅ 重新分析完成！'}
                {job.status === 'failed' && '❌ 重新分析失敗'}
              </div>

              {job.status === 'failed' && job.errorMessage && (
                <div className="mt-1 text-sm text-red-700">
                  {job.errorMessage}
                </div>
              )}

              {(job.status === 'pending' || job.status === 'processing') && (
                <div className="mt-2 space-y-1">
                  <Progress value={job.progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    {job.progress}% 完成
                  </div>
                </div>
              )}

              {job.status === 'completed' && (
                <div className="mt-1 text-sm text-green-700">
                  頁面將自動更新分析結果
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
