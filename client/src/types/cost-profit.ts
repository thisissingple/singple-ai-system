export interface CostProfitRecord {
  id?: string;
  category_name: string;
  item_name: string;
  amount: number | null;
  notes?: string | null;
  month: string;
  year: number;
  is_confirmed?: boolean;
  source?: 'existing' | 'ai' | 'manual';
  created_at?: string;
  updated_at?: string;
  // 匯率鎖定相關欄位
  currency?: 'TWD' | 'USD' | 'RMB';
  exchange_rate_used?: number;  // 儲存時的匯率（對 TWD）
  amount_in_twd?: number;       // 換算後的 TWD 金額（鎖定值）
}

export interface CostProfitPrediction {
  category_name: string;
  item_name: string;
  predicted_amount: number;
  confidence?: number;
  reason?: string;
}
