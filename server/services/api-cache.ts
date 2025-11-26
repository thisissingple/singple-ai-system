/**
 * API 快取服務
 * 用於快取耗時的 API 回應，減少重複查詢資料庫的次數
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  // 預設快取時間：5 分鐘
  private defaultTTL = 5 * 60 * 1000;

  /**
   * 取得快取資料
   * @param key 快取鍵
   * @returns 快取資料，如果不存在或已過期則返回 null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      console.log(`[Cache] ❌ Expired: ${key}`);
      return null;
    }

    const age = Math.round((Date.now() - entry.timestamp) / 1000);
    console.log(`[Cache] ✅ Hit: ${key} (age: ${age}s)`);
    return entry.data as T;
  }

  /**
   * 設定快取資料
   * @param key 快取鍵
   * @param data 要快取的資料
   * @param ttl 快取時間（毫秒），預設 5 分鐘
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    const ttlSeconds = Math.round((ttl || this.defaultTTL) / 1000);
    console.log(`[Cache] 💾 Set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * 刪除指定快取
   * @param key 快取鍵
   */
  delete(key: string): void {
    this.cache.delete(key);
    console.log(`[Cache] 🗑️ Deleted: ${key}`);
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[Cache] 🧹 Cleared all (${size} entries)`);
  }

  /**
   * 清除符合 pattern 的快取
   * @param pattern 快取鍵的前綴
   */
  clearByPattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`[Cache] 🧹 Cleared ${count} entries matching: ${pattern}*`);
  }

  /**
   * 取得快取統計資訊
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 產生快取鍵
   * @param prefix API 前綴
   * @param params 查詢參數
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .filter(k => params[k] !== undefined && params[k] !== null)
      .map(k => `${k}=${params[k]}`)
      .join('&');

    return sortedParams ? `${prefix}?${sortedParams}` : prefix;
  }
}

// 匯出單例
export const apiCache = new APICache();

// 快取鍵前綴常數
export const CACHE_KEYS = {
  TRIAL_CLASS_REPORT: 'trial-class-report',
  OVERVIEW_REPORT: 'overview-report',
  CONSULTANT_REPORT: 'consultant-report',
} as const;

// 快取 TTL 設定（毫秒）
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,    // 1 分鐘
  MEDIUM: 5 * 60 * 1000,   // 5 分鐘
  LONG: 15 * 60 * 1000,    // 15 分鐘
} as const;
