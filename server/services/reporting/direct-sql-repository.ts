/**
 * Direct SQL Repository
 * 使用 Supabase Client 直接查詢繞過 PostgREST schema cache 問題
 *
 * ⚠️  IMPORTANT: Transaction Pooler Timeout Issue
 * ===============================================
 * 這個 repository 使用 Supabase Client，它透過 PostgREST 連接到資料庫。
 * 預設使用 Transaction Pooler (port 5432)，有嚴格的查詢時間限制。
 *
 * 問題：
 * - 當查詢時間超過 ~5-7 秒，Transaction Pooler 會強制終止連線
 * - 這會導致 {:shutdown, :db_termination} 錯誤
 * - 可能造成 502 錯誤或 Node.js 崩潰
 *
 * 解決方案：
 * 1. 【推薦】切換到 Session Pooler (port 6543) - 支援較長查詢時間
 *    在 Zeabur 環境變數中，將 SUPABASE_URL 的 port 從 5432 改為 6543
 * 2. 或優化查詢邏輯，使用分頁或更精確的過濾條件
 * 3. 或使用 Direct Connection（無 pooler 限制）
 *
 * 參考：https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */

import { getSupabaseClient } from '../supabase-client';
import { DateRange, SupabaseDataRow } from './supabase-report-repository';

export class DirectSqlRepository {
  /**
   * Get trial class attendance data
   * NOTE: PostgREST schema cache 問題 - 暫時取得全部資料後在應用層過濾
   */
  async getAttendance(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();

    try {
      // 繞過 PostgREST schema cache - 取得全部資料
      const { data, error } = await client
        .from('trial_class_attendance')
        .select('*');

      if (error) throw error;

      // 在應用層過濾日期
      const filtered = (data || []).filter(row => {
        if (dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31') {
          return true; // All period
        }
        const classDate = row.class_date || row['上課日期'];
        if (!classDate) return true; // Include null dates
        return classDate >= dateRange.start && classDate <= dateRange.end;
      });

      return filtered.map(row => this.normalizeAttendanceRow(row));
    } catch (error) {
      console.error('Error in getAttendance (direct query):', error);
      throw error;
    }
  }

  /**
   * Get trial class purchase data
   * NOTE: PostgREST schema cache 問題 - 暫時取得全部資料後在應用層過濾
   */
  async getPurchases(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();

    try {
      // 繞過 PostgREST schema cache - 取得全部資料
      const { data, error } = await client
        .from('trial_class_purchases')
        .select('*');

      if (error) throw error;

      // 在應用層過濾日期
      const filtered = (data || []).filter(row => {
        if (dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31') {
          return true; // All period
        }
        const purchaseDate = row.purchase_date || row['體驗課購買日期'];
        if (!purchaseDate) return true; // Include null dates
        return purchaseDate >= dateRange.start && purchaseDate <= dateRange.end;
      });

      return filtered.map(row => this.normalizePurchaseRow(row));
    } catch (error) {
      console.error('Error in getPurchases (direct query):', error);
      throw error;
    }
  }

  /**
   * Get EODs (deals) data
   * NOTE: PostgREST schema cache 問題 - 暫時取得全部資料後在應用層過濾
   */
  async getDeals(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();

    try {
      // 繞過 PostgREST schema cache - 取得全部資料
      const { data, error } = await client
        .from('eods_for_closers')
        .select('*');

      if (error) throw error;

      // 在應用層過濾日期
      const filtered = (data || []).filter(row => {
        if (dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31') {
          return true; // All period
        }
        const dealDate = row.deal_date || row['成交日期'];
        if (!dealDate) return true; // Include null dates
        return dealDate >= dateRange.start && dealDate <= dateRange.end;
      });

      return filtered.map(row => this.normalizeDealRow(row));
    } catch (error) {
      console.error('Error in getDeals (direct query):', error);
      throw error;
    }
  }

  /**
   * Normalize attendance row
   */
  private normalizeAttendanceRow(row: any): SupabaseDataRow {
    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: row['姓名'] || row.student_name,
      student_email: row['email'] || row.student_email,
      teacher_name: row['授課老師'] || row.teacher_name,
      class_date: row['上課日期'] || row.class_date,
      status: row['是否已評價'] || row.status,
      raw_data: {
        ...row.raw_data || {},
        // 保留所有原始欄位供 AI 使用
        姓名: row['姓名'],
        email: row['email'],
        上課日期: row['上課日期'],
        授課老師: row['授課老師'],
        是否已評價: row['是否已評價'],
        未轉單原因: row['未轉單原因'],
        體驗課文字檔: row['體驗課文字檔'],
        // 英文別名
        student_name: row['姓名'],
        student_email: row['email'],
        class_date: row['上課日期'],
        teacher_name: row['授課老師'],
        is_reviewed: row['是否已評價'],
        no_conversion_reason: row['未轉單原因'],
        trial_class_notes: row['體驗課文字檔'],
      },
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Normalize purchase row
   */
  private normalizePurchaseRow(row: any): SupabaseDataRow {
    const status = row['目前狀態（自動計算）'] || row.current_status || row['目前狀態'] || row.status;

    // 提取體驗課堂數（優先使用資料庫英文欄位）
    const trialClassCount = row.trial_class_count || row['體驗堂數'] || 0;

    // 提取剩餘堂數（處理 "3 堂" 格式）
    const remainingClassesRaw = row.remaining_classes || row['剩餘堂數（自動計算）'] || '0';
    const remainingClasses = typeof remainingClassesRaw === 'string'
      ? parseInt(remainingClassesRaw.replace(/[^\d]/g, '')) || 0
      : remainingClassesRaw;

    const attendedClasses = trialClassCount - remainingClasses;

    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: row['姓名'] || row.student_name,
      student_email: row['email'] || row.student_email,
      purchase_date: row['體驗課購買日期'] || row.purchase_date,
      course_type: row['方案名稱'] || row.package_name || row.course_type,
      plan: row['方案名稱'] || row.package_name || row.plan,
      status: status,
      // 加入頂層欄位供 total-report-service 使用
      trial_class_count: trialClassCount,
      remaining_classes: remainingClasses,
      attended_classes: attendedClasses,
      raw_data: {
        ...row.raw_data || {},
        // 保留所有原始欄位供 AI 使用
        姓名: row['姓名'] || row.student_name,
        email: row['email'] || row.student_email,
        年齡: row['年齡'] || row.age,
        職業: row['職業'] || row.occupation,
        方案名稱: row['方案名稱'] || row.package_name,
        體驗堂數: trialClassCount,
        '剩餘堂數（自動計算）': remainingClasses,
        體驗課購買日期: row['體驗課購買日期'] || row.purchase_date,
        '目前狀態（自動計算）': status,
        更新日期: row['更新日期'] || row.updated_at,
        最近一次上課日期: row['最近一次上課日期'] || row.last_class_date,
        備註: row['備註'] || row.notes,
        // 英文別名
        student_name: row['姓名'] || row.student_name,
        student_email: row['email'] || row.student_email,
        age: row['年齡'] || row.age,
        occupation: row['職業'] || row.occupation,
        package_name: row['方案名稱'] || row.package_name,
        trial_class_count: trialClassCount,
        remaining_classes: remainingClasses,
        attended_classes: attendedClasses,
        purchase_date: row['體驗課購買日期'] || row.purchase_date,
        currentStatus: status,
        current_status: status,
        updated_at_field: row['更新日期'] || row.updated_at,
        last_class_date: row['最近一次上課日期'] || row.last_class_date,
        note: row['備註'] || row.notes,
      },
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Normalize deal row
   */
  private normalizeDealRow(row: any): SupabaseDataRow {
    const dealDate = row['成交日期'] || row.deal_date;
    const dealAmount = row['實收金額'] || row.actual_amount || row.deal_amount;
    const studentEmail = row['email'] || row.student_email;
    const studentName = row['name'] || row.student_name;
    const plan = row['成交方案'] || row.plan;  // ✅ 提取方案名稱

    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: studentName,
      student_email: studentEmail,
      deal_date: dealDate,
      deal_amount: dealAmount,
      plan: plan,  // ✅ 加入頂層
      actual_amount: dealAmount,  // ✅ 加入頂層（別名）
      raw_data: {
        ...row.raw_data || {},
        // 保留所有原始欄位供 AI 使用
        name: row['name'],
        email: row['email'],
        電話負責人: row['電話負責人'],
        諮詢人員: row['諮詢人員'],
        是否上線: row['是否上線'],
        名單來源: row['名單來源'],
        諮詢結果: row['諮詢結果'],
        成交方案: row['成交方案'],
        方案數量: row['方案數量'],
        付款方式: row['付款方式'],
        分期期數: row['分期期數'],
        方案價格: row['方案價格'],
        實收金額: row['實收金額'],
        諮詢日期: row['諮詢日期'],
        成交日期: row['成交日期'],
        備註: row['備註'],
        提交表單時間: row['提交表單時間'],
        月份: row['月份'],
        年份: row['年份'],
        週別: row['週別'],
        是否為首次填寫: row['是否為首次填寫'],
        是否為首次成交: row['是否為首次成交'],
        // 英文別名
        student_name: studentName,
        student_email: studentEmail,
        phone_owner: row['電話負責人'],
        consultant: row['諮詢人員'],
        is_online: row['是否上線'],
        lead_source: row['名單來源'],
        consultation_result: row['諮詢結果'],
        deal_package: row['成交方案'],
        package_quantity: row['方案數量'],
        payment_method: row['付款方式'],
        installment_periods: row['分期期數'],
        package_price: row['方案價格'],
        actual_amount: dealAmount,
        deal_amount: dealAmount,
        consultation_date: row['諮詢日期'],
        deal_date: dealDate,
        note: row['備註'],
        form_submit_time: row['提交表單時間'],
        month: row['月份'],
        year: row['年份'],
        week: row['週別'],
        is_first_form: row['是否為首次填寫'],
        is_first_deal: row['是否為首次成交'],
      },
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
}

// Export singleton instance
export const directSqlRepository = new DirectSqlRepository();
