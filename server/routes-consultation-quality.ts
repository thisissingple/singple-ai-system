/**
 * Consultation Quality API Endpoints
 * Manual-triggered AI analysis for consultation transcripts
 */

import { getSharedPool } from './services/pg-client';

// 使用共享連線池（不再每次調用 pool.end()）
const createPool = () => getSharedPool();
import { consultationQualityGPTService } from './services/consultation-quality-gpt-service';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getOrCreateStudentKB, addDataSourceRef } from './services/student-knowledge-service';
import { getOrCreateConsultantKB, addConsultantDataSourceRef } from './services/consultant-knowledge-service';
import { generateChatRecap, getChatRecapsForConsultation } from './services/consultation-chat-recap-service';

export function registerConsultationQualityRoutes(app: any, isAuthenticated: any, requireAdmin: any) {
  // ============================================================================
  // 1. GET /api/consultation-quality/list
  // Get consultation records with analysis status
  // ============================================================================
  app.get('/api/consultation-quality/list', isAuthenticated, async (req: any, res) => {
    try {
      const analyzed = req.query.analyzed as string; // 'true', 'false', or 'all'
      const closerNameFilter = req.query.closer_name as string;
      const searchQuery = req.query.search as string;

      const pool = createPool();

      // Build WHERE clause
      const conditions: string[] = ["e.is_show = '已上線'"];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by closer name
      if (closerNameFilter && closerNameFilter !== 'all') {
        conditions.push(`e.closer_name = $${paramIndex}`);
        params.push(closerNameFilter);
        paramIndex++;
      }

      // Filter by search query (student name or email)
      if (searchQuery && searchQuery.trim() !== '') {
        conditions.push(`(e.student_name ILIKE $${paramIndex} OR e.student_email ILIKE $${paramIndex})`);
        params.push(`%${searchQuery.trim()}%`);
        paramIndex++;
      }

      // Filter by analysis status
      if (analyzed === 'true') {
        conditions.push('cqa.id IS NOT NULL');
      } else if (analyzed === 'false') {
        conditions.push('cqa.id IS NULL');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Query consultations with analysis status
      const query = `
        SELECT
          e.id AS eod_id,
          e.student_name,
          e.student_email,
          e.closer_name,
          e.setter_name,
          e.consultation_date,
          e.consultation_result,
          e.plan,
          e.actual_amount,
          e.deal_date,

          -- Transcript status
          CASE
            WHEN e.consultation_transcript IS NOT NULL AND LENGTH(e.consultation_transcript) > 0
            THEN true
            ELSE false
          END AS has_transcript,

          -- Analysis status
          CASE
            WHEN cqa.id IS NOT NULL THEN true
            ELSE false
          END AS has_analysis,

          -- AI analysis results (if exists)
          cqa.id AS analysis_id,
          cqa.overall_rating,
          cqa.rapport_building_score,
          cqa.needs_analysis_score,
          cqa.objection_handling_score,
          cqa.closing_technique_score,
          cqa.analyzed_at

        FROM eods_for_closers e
        LEFT JOIN consultation_quality_analysis cqa
          ON e.student_email = cqa.student_email
          AND e.consultation_date = cqa.consultation_date
          AND e.closer_name = cqa.closer_name
        ${whereClause}
        ORDER BY e.consultation_date DESC
        LIMIT 200
      `;

      const result = await pool.query(query, params);

      // Get closer list with count
      const closerQuery = `
        SELECT
          e.closer_name,
          COUNT(*) AS count
        FROM eods_for_closers e
        WHERE e.is_show = '已上線' AND e.closer_name IS NOT NULL
        GROUP BY e.closer_name
        ORDER BY e.closer_name
      `;
      const closerResult = await pool.query(closerQuery, []);

      // pool.end() removed - using shared pool

      res.json({
        success: true,
        data: {
          records: result.rows,
          closers: closerResult.rows,
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch consultation records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 2. GET /api/consultation-quality/config
  // Get AI analysis configuration (admin only)
  // ============================================================================
  app.get('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
    try {
      const pool = createPool();
      const query = `
        SELECT
          ai_model, temperature, max_tokens, analysis_prompt,
          chat_ai_model, chat_temperature, chat_max_tokens, chat_system_prompt,
          updated_at, updated_by
        FROM consultation_analysis_config
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
      `;
      const result = await pool.query(query);
      // pool.end() removed - using shared pool

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '配置不存在' });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Failed to fetch config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 3. PUT /api/consultation-quality/config
  // Update AI analysis configuration (admin only)
  // ============================================================================
  app.put('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
    try {
      const {
        ai_model, temperature, max_tokens, analysis_prompt,
        chat_ai_model, chat_temperature, chat_max_tokens, chat_system_prompt
      } = req.body;
      const userEmail = req.session?.user?.email || 'unknown';

      // Validation
      if (!ai_model || temperature == null || !max_tokens || !analysis_prompt) {
        return res.status(400).json({ error: '所有分析欄位都是必填的' });
      }

      if (!chat_ai_model || chat_temperature == null || !chat_max_tokens || !chat_system_prompt) {
        return res.status(400).json({ error: '所有聊天助手欄位都是必填的' });
      }

      if (temperature < 0 || temperature > 1 || chat_temperature < 0 || chat_temperature > 1) {
        return res.status(400).json({ error: 'Temperature 必須在 0-1 之間' });
      }

      const pool = createPool();
      const query = `
        UPDATE consultation_analysis_config
        SET
          ai_model = $1,
          temperature = $2,
          max_tokens = $3,
          analysis_prompt = $4,
          chat_ai_model = $5,
          chat_temperature = $6,
          chat_max_tokens = $7,
          chat_system_prompt = $8,
          updated_at = NOW(),
          updated_by = $9
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        RETURNING *
      `;
      const result = await pool.query(query, [
        ai_model,
        temperature,
        max_tokens,
        analysis_prompt,
        chat_ai_model,
        chat_temperature,
        chat_max_tokens,
        chat_system_prompt,
        userEmail,
      ]);
      // pool.end() removed - using shared pool

      // Clear GPT service cache
      consultationQualityGPTService.clearConfigCache();

      res.json({
        success: true,
        data: result.rows[0],
        message: '配置已更新',
      });
    } catch (error: any) {
      console.error('Failed to update config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 4. POST /api/consultation-quality/config/reset
  // Reset configuration to defaults (admin only)
  // ============================================================================
  app.post('/api/consultation-quality/config/reset', requireAdmin, async (req: any, res) => {
    try {
      const userEmail = req.session?.user?.email || 'unknown';
      const pool = createPool();

      // Get the default prompt from migration
      const defaultPrompt = `你是一位專精教育銷售的策略顧問，專門分析諮詢師（Consultant/Closer）的銷售諮詢品質。

請閱讀諮詢逐字稿後，輸出詳細的分析與改進建議。輸出格式請用 Markdown（標題、粗體、項目符號完全依下列模板），不可調整段落或遺漏。

**重要原則：**
1. 從對話中主動推斷資訊，不要輕易說「需補問」
2. 行為線索比直接陳述更重要（例如：沉默 = 可能在思考價格、猶豫 = 有隱藏異議）
3. 每個敘述都要帶上逐字稿的時間戳（例如：14:12:34）
4. 若真的找不到資訊，在「仍需補問」列出，並在對應欄位標註「需補問：...（原因）」

**⚠️ 關於逐字稿格式（極度重要）：**
- **逐字稿可能沒有發言者標記**（沒有「學員:」或「諮詢師:」的標籤）
- **你必須從上下文自動推斷誰在說話**：
  - 📌 **判斷技巧 1**：根據說話內容（學員通常詢問、表達需求、提出異議；諮詢師通常引導、解答、推方案）
  - 📌 **判斷技巧 2**：根據對話邏輯（問答對應、話題延續）
  - 📌 **判斷技巧 3**：根據時間戳順序（通常是學員和諮詢師輪流說話）
- **⚠️ 絕對不可以「編造」不存在的對話**：
  - ✅ 正確：只引用逐字稿中真實存在的句子
  - ❌ 錯誤：腦補「諮詢師應該會說...」的內容
- **引用對話時必須標註發言者**：
  - 範例：「【學員】我想提升英文能力 (14:13:21)」、「【諮詢師】那你目前遇到最大的困難是什麼？(14:13:35)」
  - 如果無法確定發言者，標註「【推測-學員】」或「【推測-諮詢師】」

---

# 📊 諮詢品質總體評分（整體表現）

- **總體評分：** {{ 1-10 分 }}
- **總體評語：** {{ 2-3 句話總結本次諮詢的整體表現，包含主要優點與待改進之處 }}

---

# 🎯 評分維度詳細分析

## 1. 建立關係（Rapport Building）

**評分：** {{ 1-10 分 }}

**評語：**
{{ 評估諮詢師是否成功建立信任關係、營造舒適氛圍、展現同理心 }}

**具體證據：**
- ✅ 做得好的地方：{{ 例如：稱讚學員、分享相似經驗、使用學員名字、幽默互動等，附時間戳 }}
- ❌ 待改進之處：{{ 例如：過於公式化、缺乏眼神接觸（如適用）、未展現興趣等，附時間戳 }}

**改進建議：**
{{ 如何更好地建立關係，例如：更多個人化互動、尋找共同點、展現真誠興趣 }}

---

## 2. 需求分析（Needs Analysis）

**評分：** {{ 1-10 分 }}

**評語：**
{{ 評估諮詢師是否深入挖掘學員需求、痛點、目標、使用場景 }}

**具體證據：**
- ✅ 做得好的地方：{{ 例如：開放式提問、追問細節、確認理解、總結需求等，附時間戳 }}
- ❌ 待改進之處：{{ 例如：問題太表面、未追問深層動機、跳過關鍵資訊等，附時間戳 }}

**需求分析完整度檢查清單：**
- [ ] 學員的學習目標是什麼？
- [ ] 學員目前的能力水平？
- [ ] 學員遇到的具體痛點？
- [ ] 學員的使用場景（工作/社交/個人）？
- [ ] 學員的預算範圍與決策者？
- [ ] 學員的時間安排與練習頻率？

**改進建議：**
{{ 如何更深入挖掘需求，例如：使用 SPIN 提問法、5W2H 分析、痛點放大技巧 }}

---

## 3. 異議處理（Objection Handling）

**評分：** {{ 1-10 分 }}

**評語：**
{{ 評估諮詢師處理異議（價格、時間、效果疑慮等）的能力 }}

**具體證據：**
- **學員提出的異議：** {{ 列出對話中學員的所有異議，附時間戳 }}
- ✅ 諮詢師的處理方式：{{ 如何回應異議，是否有效化解，附時間戳 }}
- ❌ 待改進之處：{{ 例如：防禦性回應、忽略異議、直接否定、未深入挖掘真實顧慮等 }}

**異議處理技巧評估：**
- [ ] 是否先同理學員的顧慮？
- [ ] 是否詢問異議背後的真正原因？
- [ ] 是否提供具體證據或案例消除疑慮？
- [ ] 是否將異議轉化為購買理由？

**改進建議：**
{{ 如何更好地處理異議，例如：Feel-Felt-Found 技巧、提供社會證明、分解價格、風險逆轉 }}

---

## 4. 成交技巧（Closing Technique）

**評分：** {{ 1-10 分 }}

**評語：**
{{ 評估諮詢師的成交推進能力、促成決策的技巧 }}

**具體證據：**
- ✅ 做得好的地方：{{ 例如：試探性成交、限時優惠、雙選擇法、總結價值等，附時間戳 }}
- ❌ 待改進之處：{{ 例如：過於被動、未提出成交請求、錯過成交信號、缺乏緊迫感等，附時間戳 }}

**成交推進評估：**
- [ ] 是否識別成交信號（學員點頭、詢問細節、討論付款方式等）？
- [ ] 是否使用試探性成交（假設成交法）？
- [ ] 是否創造緊迫感（限時優惠、名額限制）？
- [ ] 是否提供多種方案選擇（雙選擇法、階梯式方案）？
- [ ] 是否確認決策者與決策流程？

**改進建議：**
{{ 如何更有效地推進成交，例如：ABC 成交法、沉默法、總結收斂、風險逆轉、付款方案設計 }}

---

# 💪 本次諮詢的亮點（Strengths）

請列出 3-5 個本次諮詢做得特別好的地方：

1. **{{ 亮點標題 }}**
   - **具體證據：** {{ 時間戳 + 對話內容 }}
   - **為什麼這是亮點：** {{ 解釋為什麼這個行為是優秀的 }}

2. **{{ 亮點標題 }}**
   - **具體證據：** {{ 時間戳 + 對話內容 }}
   - **為什麼這是亮點：** {{ 解釋為什麼這個行為是優秀的 }}

3. **{{ 亮點標題 }}**
   - **具體證據：** {{ 時間戳 + 對話內容 }}
   - **為什麼這是亮點：** {{ 解釋為什麼這個行為是優秀的 }}

---

# 🎓 本次諮詢的待改進之處（Weaknesses）

請列出 2-4 個本次諮詢需要改進的地方：

1. **{{ 待改進標題 }}**
   - **具體證據：** {{ 時間戳 + 對話內容或情境 }}
   - **為什麼這需要改進：** {{ 解釋為什麼這是問題 }}
   - **建議改法：** {{ 具體的改進方向 }}

2. **{{ 待改進標題 }}**
   - **具體證據：** {{ 時間戳 + 對話內容或情境 }}
   - **為什麼這需要改進：** {{ 解釋為什麼這是問題 }}
   - **建議改法：** {{ 具體的改進方向 }}

---

# 🚀 行動建議（Actionable Suggestions）

請列出 3-5 個具體的改進建議，按優先級排序（Priority 1 = 最高）：

### 建議 1（Priority {{ 1-5 }}）

- **建議：** {{ 清楚描述建議 }}
- **具體做法：** {{ 詳細的執行方法 }}
- **預期效果：** {{ 執行後預期達成的效果 }}

### 建議 2（Priority {{ 1-5 }}）

- **建議：** {{ 清楚描述建議 }}
- **具體做法：** {{ 詳細的執行方法 }}
- **預期效果：** {{ 執行後預期達成的效果 }}

### 建議 3（Priority {{ 1-5 }}）

- **建議：** {{ 清楚描述建議 }}
- **具體做法：** {{ 詳細的執行方法 }}
- **預期效果：** {{ 執行後預期達成的效果 }}

---

# 🔍 仍需補問的資訊（如果有）

{{ 如果有關鍵資訊在逐字稿中找不到，列出需要補問的問題，並說明原因 }}

---

**輸出格式要求：**
- 請將所有內容整理成上述 Markdown 格式
- 每個評分維度的評分必須是 1-10 的整數
- 每個建議的 Priority 必須是 1-5 的整數
- 所有時間戳必須準確引用逐字稿中的時間
- 不要編造不存在的對話內容`;

      const defaultChatPrompt = `你是一位專業的諮詢分析助手。你的任務是根據提供的諮詢逐字稿和 AI 分析結果，回答使用者的問題。

請根據以上資訊，用專業、友善的方式回答問題。如果資訊不足以回答問題，請誠實告知。回答時請：
1. 直接回答問題，不要重複問題
2. 引用具體的對話內容或分析結果作為依據
3. 提供洞察和建議
4. 保持簡潔明確`;

      const query = `
        UPDATE consultation_analysis_config
        SET
          ai_model = 'gpt-5',
          temperature = 0.7,
          max_tokens = 16000,
          analysis_prompt = $1,
          chat_ai_model = 'gpt-5',
          chat_temperature = 0.7,
          chat_max_tokens = 8000,
          chat_system_prompt = $2,
          updated_at = NOW(),
          updated_by = $3
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        RETURNING *
      `;
      const result = await pool.query(query, [defaultPrompt, defaultChatPrompt, userEmail]);
      // pool.end() removed - using shared pool

      // Clear GPT service cache
      consultationQualityGPTService.clearConfigCache();

      res.json({
        success: true,
        data: result.rows[0],
        message: '配置已重置為預設值',
      });
    } catch (error: any) {
      console.error('Failed to reset config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 5. GET /api/consultation-quality/:eodId
  // Get single consultation with analysis details
  // ============================================================================
  app.get('/api/consultation-quality/:eodId', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;
      const pool = createPool();

      // Get consultation record
      const consultationQuery = `
        SELECT
          e.*,
          cqa.id AS analysis_id,
          cqa.overall_rating,
          cqa.overall_comment,
          cqa.strengths,
          cqa.improvements,
          cqa.recommendations,
          cqa.rapport_building_score,
          cqa.rapport_building_comment,
          cqa.needs_analysis_score,
          cqa.needs_analysis_comment,
          cqa.objection_handling_score,
          cqa.objection_handling_comment,
          cqa.closing_technique_score,
          cqa.closing_technique_comment,
          cqa.raw_markdown_output,
          cqa.analyzed_at,
          cqa.analysis_version
        FROM eods_for_closers e
        LEFT JOIN consultation_quality_analysis cqa
          ON e.student_email = cqa.student_email
          AND e.consultation_date = cqa.consultation_date
          AND e.closer_name = cqa.closer_name
        WHERE e.id = $1
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      const record = result.rows[0];

      // DEBUG: Log what's being retrieved
      console.log('📤 [DEBUG] GET detail - raw_markdown_output length:', record.raw_markdown_output?.length || 0);
      console.log('📤 [DEBUG] GET detail - has_analysis:', record.analysis_id ? 'YES' : 'NO');

      // pool.end() removed - using shared pool

      res.json({
        success: true,
        data: record,
      });
    } catch (error: any) {
      console.error('Failed to fetch consultation detail:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 6. POST /api/consultation-quality/:eodId/save-to-kb
  // Save consultation analysis to student knowledge base
  // ============================================================================
  app.post('/api/consultation-quality/:eodId/save-to-kb', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;
      const pool = createPool();

      // Get consultation record with analysis ID
      const consultationQuery = `
        SELECT
          e.student_name,
          e.student_email,
          e.closer_name,
          e.consultation_date,
          cqa.id as analysis_id,
          cqa.overall_rating,
          cqa.analyzed_at
        FROM eods_for_closers e
        LEFT JOIN consultation_quality_analysis cqa
          ON e.student_email = cqa.student_email
          AND e.consultation_date = cqa.consultation_date
          AND e.closer_name = cqa.closer_name
        WHERE e.id = $1 AND cqa.id IS NOT NULL
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: '找不到諮詢分析記錄' });
      }

      const record = result.rows[0];

      // Validate student email
      if (!record.student_email) {
        // pool.end() removed - using shared pool
        return res.status(400).json({ error: '該諮詢記錄缺少學員 email，無法儲存至知識庫' });
      }

      // Find consultant email from users table
      // Note: closer_name could be first_name, full name, or nickname
      const userQuery = await pool.query(`
        SELECT email FROM users
        WHERE (
          first_name = $1
          OR CONCAT(first_name, ' ', COALESCE(last_name, '')) = $1
          OR CONCAT(first_name, last_name) = $1
        )
        AND 'consultant' = ANY(roles)
        LIMIT 1
      `, [record.closer_name]);

      const consultantEmail = userQuery.rows.length > 0 ? userQuery.rows[0].email : null;

      // pool.end() removed - using shared pool

      // 1. Save to student knowledge base
      await getOrCreateStudentKB(record.student_email, record.student_name);
      await addDataSourceRef(record.student_email, 'ai_analyses', record.analysis_id);

      console.log(`✅ Saved consultation analysis ${record.analysis_id} to student KB for ${record.student_name} (${record.student_email})`);

      // 2. Save to consultant knowledge base (if consultant email found)
      if (consultantEmail) {
        await getOrCreateConsultantKB(consultantEmail, record.closer_name);
        await addConsultantDataSourceRef(consultantEmail, 'consultation_analyses', record.analysis_id);
        console.log(`✅ Saved consultation analysis ${record.analysis_id} to consultant KB for ${record.closer_name} (${consultantEmail})`);
      } else {
        console.warn(`⚠️ Consultant email not found for ${record.closer_name}, skipping consultant KB`);
      }

      res.json({
        success: true,
        data: {
          studentEmail: record.student_email,
          studentName: record.student_name,
          consultantEmail: consultantEmail,
          consultantName: record.closer_name,
          analysisId: record.analysis_id,
          message: `已成功儲存至 ${record.student_name} 的知識庫` + (consultantEmail ? ` 及 ${record.closer_name} 的戰績` : ''),
        },
      });
    } catch (error: any) {
      console.error('Failed to save to knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 7. POST /api/consultation-quality/:eodId/analyze
  // Manually trigger AI analysis for a consultation (not automatic!)
  // ============================================================================
  app.post('/api/consultation-quality/:eodId/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;
      const pool = createPool();

      // Get consultation record
      const consultationQuery = `
        SELECT
          e.id,
          e.student_name,
          e.student_email,
          e.closer_name,
          e.consultation_date,
          e.consultation_transcript
        FROM eods_for_closers e
        WHERE e.id = $1
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      const consultation = result.rows[0];

      // Check if transcript exists
      if (!consultation.consultation_transcript || consultation.consultation_transcript.trim().length === 0) {
        // pool.end() removed - using shared pool
        return res.status(400).json({ error: '此諮詢記錄沒有轉錄內容，無法進行 AI 分析' });
      }

      // Check if analysis already exists (using multi-condition key instead of eod_id)
      const existingAnalysisQuery = `
        SELECT id FROM consultation_quality_analysis
        WHERE student_email = $1 AND consultation_date = $2 AND closer_name = $3
      `;
      const existingResult = await pool.query(existingAnalysisQuery, [
        consultation.student_email,
        consultation.consultation_date,
        consultation.closer_name
      ]);

      if (existingResult.rows.length > 0) {
        // pool.end() removed - using shared pool
        return res.status(400).json({ error: '此諮詢記錄已有 AI 分析，請先刪除舊分析後再重新分析' });
      }

      // Perform AI analysis
      console.log(`Analyzing consultation for ${consultation.student_name}...`);
      const analysis = await consultationQualityGPTService.analyzeConsultationQuality(
        consultation.consultation_transcript
      );

      // Insert analysis result (include student_email for multi-condition JOIN)
      const insertQuery = `
        INSERT INTO consultation_quality_analysis (
          eod_id,
          student_name,
          student_email,
          closer_name,
          consultation_date,
          overall_rating,
          overall_comment,
          strengths,
          improvements,
          recommendations,
          rapport_building_score,
          rapport_building_comment,
          needs_analysis_score,
          needs_analysis_comment,
          objection_handling_score,
          objection_handling_comment,
          closing_technique_score,
          closing_technique_comment,
          raw_markdown_output,
          tokens_used,
          response_time_ms,
          api_cost_usd,
          analyzed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          ($23::timestamptz AT TIME ZONE 'UTC')
        )
        RETURNING *
      `;

      // Get current UTC timestamp as ISO string (timestamptz compatible)
      const analyzedAt = new Date().toISOString();

      // DEBUG: Log raw markdown output before saving
      console.log('🔍 [DEBUG] Raw markdown output length:', analysis.rawMarkdownOutput?.length || 0);
      console.log('🔍 [DEBUG] Raw markdown preview:', analysis.rawMarkdownOutput?.substring(0, 200));
      console.log('🔍 [DEBUG] analyzed_at (UTC):', analyzedAt);

      const insertResult = await pool.query(insertQuery, [
        eodId,  // Keep for backwards compatibility but not used for JOINs
        consultation.student_name,
        consultation.student_email,  // New: for multi-condition JOIN
        consultation.closer_name,
        consultation.consultation_date,
        analysis.overallScore,
        analysis.overallComment,
        analysis.strengths,  // Already an array, PostgreSQL will handle it
        analysis.weaknesses,  // Already an array, PostgreSQL will handle it
        analysis.suggestions,  // Already an array, PostgreSQL will handle it
        analysis.rapportBuildingScore,
        analysis.rapportBuildingComment,
        analysis.needsAnalysisScore,
        analysis.needsAnalysisComment,
        analysis.objectionHandlingScore,
        analysis.objectionHandlingComment,
        analysis.closingTechniqueScore,
        analysis.closingTechniqueComment,
        analysis.rawMarkdownOutput,  // Raw AI markdown output
        analysis.tokensUsed || null,
        analysis.responseTimeMs || null,
        analysis.apiCostUsd || null,
        analyzedAt,  // Explicit UTC timestamp from Node.js
      ]);

      // DEBUG: Log what was saved
      console.log('✅ [DEBUG] Saved to DB - raw_markdown_output length:', insertResult.rows[0]?.raw_markdown_output?.length || 0);

      // pool.end() removed - using shared pool

      res.json({
        success: true,
        data: insertResult.rows[0],
        message: 'AI 分析完成',
      });
    } catch (error: any) {
      console.error('Failed to analyze consultation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 4. DELETE /api/consultation-quality/:eodId/analysis
  // Delete AI analysis for a consultation
  // ============================================================================
  app.delete('/api/consultation-quality/:eodId/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;
      const pool = createPool();

      // First get the consultation details for multi-condition delete
      const consultationQuery = `
        SELECT student_email, consultation_date, closer_name
        FROM eods_for_closers WHERE id = $1
      `;
      const consultationResult = await pool.query(consultationQuery, [eodId]);

      if (consultationResult.rows.length === 0) {
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: '找不到此諮詢記錄' });
      }

      const { student_email, consultation_date, closer_name } = consultationResult.rows[0];

      // Delete using multi-condition key instead of eod_id
      const deleteQuery = `
        DELETE FROM consultation_quality_analysis
        WHERE student_email = $1 AND consultation_date = $2 AND closer_name = $3
        RETURNING id
      `;

      const result = await pool.query(deleteQuery, [student_email, consultation_date, closer_name]);

      // pool.end() removed - using shared pool

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '找不到此諮詢記錄的 AI 分析' });
      }

      res.json({
        success: true,
        message: 'AI 分析已刪除',
      });
    } catch (error: any) {
      console.error('Failed to delete consultation analysis:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 5. POST /api/consultation-quality/chat
  // AI Chat interface for consultation Q&A (streaming)
  // ============================================================================
  app.post('/api/consultation-quality/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { messages, eodId, consultationTranscript, aiAnalysis } = req.body;

      // 🔍 DEBUG: Log incoming messages to detect image data
      console.log('[Chat API] Incoming request:', {
        messageCount: messages?.length || 0,
        eodId,
        hasTranscript: !!consultationTranscript,
        hasAnalysis: !!aiAnalysis,
      });

      // 🔍 Validate messages array - ensure no image content
      if (messages && Array.isArray(messages)) {
        messages.forEach((msg: any, index: number) => {
          if (typeof msg.content !== 'string') {
            console.error(`[Chat API] ❌ Message ${index} has non-string content:`, typeof msg.content);
            console.error(`[Chat API] Content structure:`, JSON.stringify(msg.content).substring(0, 200));
          }
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Fetch chat configuration from database
      const pool = createPool();
      const configQuery = `
        SELECT chat_ai_model, chat_temperature, chat_max_tokens, chat_system_prompt
        FROM consultation_analysis_config
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
      `;
      const configResult = await pool.query(configQuery);
      // pool.end() removed - using shared pool

      if (configResult.rows.length === 0) {
        return res.status(500).json({ error: '無法讀取聊天配置' });
      }

      const config = configResult.rows[0];

      // Convert database values to correct types (PostgreSQL returns DECIMAL as string)
      const temperature = parseFloat(config.chat_temperature);
      const maxTokens = parseInt(config.chat_max_tokens, 10);

      // Build system message with consultation context
      const systemMessage = `${config.chat_system_prompt}

## 諮詢逐字稿
${consultationTranscript || '（無逐字稿）'}

## AI 分析結果
${aiAnalysis || '（無分析結果）'}`;

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      // Call AI SDK with streaming using config values
      const result = await streamText({
        model: openai(config.chat_ai_model),
        system: systemMessage,
        messages,
        temperature,
        maxTokens,
      });

      // Stream the text chunks to response
      for await (const chunk of result.textStream) {
        res.write(chunk);
      }

      // After streaming completes, send metadata
      const usage = await result.usage;

      console.log('[Chat API] Raw usage object:', usage);

      // AI SDK v5 uses inputTokens/outputTokens instead of promptTokens/completionTokens
      const promptTokens = usage?.inputTokens || 0;
      const completionTokens = usage?.outputTokens || 0;
      const totalTokens = usage?.totalTokens || (promptTokens + completionTokens);

      // Calculate cost based on model (gpt-4o pricing: $2.50/1M input, $10/1M output)
      const apiCostUsd = config.chat_ai_model.includes('gpt-4o')
        ? (promptTokens * 0.0000025 + completionTokens * 0.00001)
        : (promptTokens * 0.0000005 + completionTokens * 0.0000015); // gpt-3.5-turbo fallback

      console.log('[Chat API] Usage:', {
        model: config.chat_ai_model,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        totalTokens,
        apiCostUsd,
      });

      const metadata = {
        tokensUsed: totalTokens,
        model: config.chat_ai_model,
        apiCostUsd,
      };

      // Send metadata after a delimiter
      res.write('\n<<<METADATA>>>\n');
      res.write(JSON.stringify(metadata));

      res.end();
    } catch (error: any) {
      console.error('Chat error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // ============================================================================
  // 9. POST /api/consultation-quality/:eodId/chat/generate-recap
  // Generate AI-powered chat recap
  // ============================================================================
  app.post('/api/consultation-quality/:eodId/chat/generate-recap', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;
      const { chatHistory, chatSessionStart } = req.body;

      if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
        return res.status(400).json({ error: '對話記錄不能為空' });
      }

      const pool = createPool();

      // Get consultation record
      const consultationQuery = `
        SELECT
          e.student_name,
          e.student_email,
          e.closer_name,
          e.consultation_date,
          cqa.id as analysis_id
        FROM eods_for_closers e
        LEFT JOIN consultation_quality_analysis cqa
          ON e.student_email = cqa.student_email
          AND e.consultation_date = cqa.consultation_date
          AND e.closer_name = cqa.closer_name
        WHERE e.id = $1
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: '找不到諮詢記錄' });
      }

      const record = result.rows[0];

      // Find consultant email from users table
      const userQuery = await pool.query(`
        SELECT email FROM users
        WHERE (
          first_name = $1
          OR CONCAT(first_name, ' ', COALESCE(last_name, '')) = $1
          OR CONCAT(first_name, last_name) = $1
        )
        AND 'consultant' = ANY(roles)
        LIMIT 1
      `, [record.closer_name]);

      const consultantEmail = userQuery.rows.length > 0 ? userQuery.rows[0].email : null;

      // pool.end() removed - using shared pool

      // Generate recap
      const recap = await generateChatRecap({
        eodId,
        analysisId: record.analysis_id,
        studentEmail: record.student_email,
        studentName: record.student_name,
        consultantEmail: consultantEmail || undefined,
        consultantName: record.closer_name,
        chatHistory,
        chatSessionStart: chatSessionStart ? new Date(chatSessionStart) : new Date(),
        generatedBy: req.session?.user?.email || 'unknown',
      });

      // Save chat recap to knowledge bases
      if (record.student_email) {
        await getOrCreateStudentKB(record.student_email, record.student_name);
        await addDataSourceRef(record.student_email, 'chat_recaps', recap.id);
        console.log(`✅ Saved chat recap ${recap.id} to student KB for ${record.student_name}`);
      }

      if (consultantEmail) {
        await getOrCreateConsultantKB(consultantEmail, record.closer_name);
        await addConsultantDataSourceRef(consultantEmail, 'chat_recaps', recap.id);
        console.log(`✅ Saved chat recap ${recap.id} to consultant KB for ${record.closer_name}`);
      }

      res.json({
        success: true,
        data: recap,
        message: '對話摘要已生成並儲存至知識庫',
      });
    } catch (error: any) {
      console.error('Failed to generate chat recap:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 9.5. POST /api/consultation-quality/chat/save-conversation
  // Save single Q&A conversation to consultant_ai_conversations
  // ============================================================================
  app.post('/api/consultation-quality/chat/save-conversation', isAuthenticated, async (req: any, res) => {
    try {
      const {
        eodId,
        question,
        answer,
        tokensUsed,
        apiCostUsd,
        responseTimeMs,
        model = 'gpt-4o',
      } = req.body;

      if (!question || !answer) {
        return res.status(400).json({ error: '問題和答案不能為空' });
      }

      const pool = createPool();

      // Get consultation info for redundant fields
      let studentEmail, studentName, consultantId, consultantName, analysisId, consultationDate;

      if (eodId) {
        const consultationQuery = `
          SELECT
            e.student_email,
            e.student_name,
            e.closer_name,
            e.consultation_date,
            cqa.id as analysis_id
          FROM eods_for_closers e
          LEFT JOIN consultation_quality_analysis cqa
            ON e.student_email = cqa.student_email
            AND e.consultation_date = cqa.consultation_date
            AND e.closer_name = cqa.closer_name
          WHERE e.id = $1
        `;
        const result = await pool.query(consultationQuery, [eodId]);

        if (result.rows.length > 0) {
          const record = result.rows[0];
          studentEmail = record.student_email;
          studentName = record.student_name;
          consultantName = record.closer_name;
          consultationDate = record.consultation_date;
          analysisId = record.analysis_id;

          // Find consultant email from users table
          const userQuery = await pool.query(`
            SELECT email FROM users
            WHERE (
              first_name = $1
              OR CONCAT(first_name, ' ', COALESCE(last_name, '')) = $1
              OR CONCAT(first_name, last_name) = $1
            )
            AND 'consultant' = ANY(roles)
            LIMIT 1
          `, [consultantName]);

          consultantId = userQuery.rows.length > 0 ? userQuery.rows[0].email : consultantName;
        }
      }

      // Default values if not found
      consultantId = consultantId || req.session?.user?.email || 'unknown';
      studentEmail = studentEmail || 'unknown';

      // Insert conversation
      const insertQuery = `
        INSERT INTO consultant_ai_conversations (
          consultant_id,
          student_email,
          eod_id,
          analysis_id,
          question,
          answer,
          question_type,
          tokens_used,
          model,
          response_time_ms,
          api_cost_usd,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'custom', $7, $8, $9, $10, NOW()
        )
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        consultantId,
        studentEmail,
        eodId || null,
        analysisId || null,
        question,
        answer,
        tokensUsed || null,
        model,
        responseTimeMs || null,
        apiCostUsd || null,
      ]);

      // pool.end() removed - using shared pool

      const savedConversation = insertResult.rows[0];

      // Save to student knowledge base
      if (studentEmail && studentEmail !== 'unknown') {
        try {
          await getOrCreateStudentKB(studentEmail, studentName || studentEmail);
          await addDataSourceRef(studentEmail, 'consultant_conversations', savedConversation.id);
          console.log(`✅ Saved conversation ${savedConversation.id} to student KB for ${studentEmail}`);
        } catch (err) {
          console.error('Failed to save to student KB:', err);
        }
      }

      // Save to consultant knowledge base
      if (consultantId && consultantName) {
        try {
          await getOrCreateConsultantKB(consultantId, consultantName);
          await addConsultantDataSourceRef(consultantId, 'consultant_conversations', savedConversation.id);
          console.log(`✅ Saved conversation ${savedConversation.id} to consultant KB for ${consultantName}`);
        } catch (err) {
          console.error('Failed to save to consultant KB:', err);
        }
      }

      res.json({
        success: true,
        data: savedConversation,
        message: '對話已儲存至知識庫',
      });
    } catch (error: any) {
      console.error('Failed to save conversation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 10. GET /api/consultation-quality/:eodId/chat/recaps
  // Get all chat recaps for a consultation
  // ============================================================================
  app.get('/api/consultation-quality/:eodId/chat/recaps', isAuthenticated, async (req: any, res) => {
    try {
      const { eodId } = req.params;

      const recaps = await getChatRecapsForConsultation(eodId);

      res.json({
        success: true,
        data: recaps,
      });
    } catch (error: any) {
      console.error('Failed to get chat recaps:', error);
      res.status(500).json({ error: error.message });
    }
  });

}
