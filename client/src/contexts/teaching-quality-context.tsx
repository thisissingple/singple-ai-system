/**
 * Teaching Quality Context
 *
 * 全域狀態管理，用於同步教學品質分析的更新
 * 當詳情頁重新分析後，通知列表頁重新載入資料
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TeachingQualityContextType {
  // 最後更新的分析 ID
  lastUpdatedAnalysisId: string | null;

  // 觸發重新分析通知
  notifyAnalysisUpdated: (analysisId: string) => void;

  // 清除通知
  clearNotification: () => void;
}

const TeachingQualityContext = createContext<TeachingQualityContextType | undefined>(undefined);

export function TeachingQualityProvider({ children }: { children: React.ReactNode }) {
  const [lastUpdatedAnalysisId, setLastUpdatedAnalysisId] = useState<string | null>(null);

  const notifyAnalysisUpdated = useCallback((analysisId: string) => {
    console.log('📢 Teaching Quality Context: Analysis updated:', analysisId);
    setLastUpdatedAnalysisId(analysisId);
  }, []);

  const clearNotification = useCallback(() => {
    setLastUpdatedAnalysisId(null);
  }, []);

  return (
    <TeachingQualityContext.Provider
      value={{
        lastUpdatedAnalysisId,
        notifyAnalysisUpdated,
        clearNotification,
      }}
    >
      {children}
    </TeachingQualityContext.Provider>
  );
}

export function useTeachingQuality() {
  const context = useContext(TeachingQualityContext);
  if (context === undefined) {
    throw new Error('useTeachingQuality must be used within a TeachingQualityProvider');
  }
  return context;
}
