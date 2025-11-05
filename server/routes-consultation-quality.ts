/**
 * Consultation Quality API Endpoints
 * Manual-triggered AI analysis for consultation transcripts
 */

import { createPool } from './services/pg-client';
import { consultationQualityGPTService } from './services/consultation-quality-gpt-service';

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
        LEFT JOIN consultation_quality_analysis cqa ON e.id = cqa.eod_id
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

      await pool.end();

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
  // 2. GET /api/consultation-quality/:eodId
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
          cqa.analyzed_at,
          cqa.analysis_version
        FROM eods_for_closers e
        LEFT JOIN consultation_quality_analysis cqa ON e.id = cqa.eod_id
        WHERE e.id = $1
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      const record = result.rows[0];

      await pool.end();

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
  // 3. POST /api/consultation-quality/:eodId/analyze
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
          e.closer_name,
          e.consultation_date,
          e.consultation_transcript
        FROM eods_for_closers e
        WHERE e.id = $1
      `;

      const result = await pool.query(consultationQuery, [eodId]);

      if (result.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      const consultation = result.rows[0];

      // Check if transcript exists
      if (!consultation.consultation_transcript || consultation.consultation_transcript.trim().length === 0) {
        await pool.end();
        return res.status(400).json({ error: '此諮詢記錄沒有轉錄內容，無法進行 AI 分析' });
      }

      // Check if analysis already exists
      const existingAnalysisQuery = `
        SELECT id FROM consultation_quality_analysis WHERE eod_id = $1
      `;
      const existingResult = await pool.query(existingAnalysisQuery, [eodId]);

      if (existingResult.rows.length > 0) {
        await pool.end();
        return res.status(400).json({ error: '此諮詢記錄已有 AI 分析，請先刪除舊分析後再重新分析' });
      }

      // Perform AI analysis
      console.log(`Analyzing consultation for ${consultation.student_name}...`);
      const analysis = await consultationQualityGPTService.analyzeConsultationQuality(
        consultation.consultation_transcript
      );

      // Insert analysis result
      const insertQuery = `
        INSERT INTO consultation_quality_analysis (
          eod_id,
          student_name,
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
          closing_technique_comment
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, [
        eodId,
        consultation.student_name,
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
      ]);

      await pool.end();

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

      const deleteQuery = `
        DELETE FROM consultation_quality_analysis
        WHERE eod_id = $1
        RETURNING id
      `;

      const result = await pool.query(deleteQuery, [eodId]);

      await pool.end();

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
  // 5. GET /api/consultation-quality/config
  // Get AI analysis configuration (admin only)
  // ============================================================================
  app.get('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
    try {
      const pool = createPool();
      const query = `
        SELECT ai_model, temperature, max_tokens, analysis_prompt, updated_at, updated_by
        FROM consultation_analysis_config
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
      `;
      const result = await pool.query(query);
      await pool.end();

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
  // 6. PUT /api/consultation-quality/config
  // Update AI analysis configuration (admin only)
  // ============================================================================
  app.put('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
    try {
      const { ai_model, temperature, max_tokens, analysis_prompt } = req.body;
      const userEmail = req.session?.user?.email || 'unknown';

      // Validation
      if (!ai_model || temperature == null || !max_tokens || !analysis_prompt) {
        return res.status(400).json({ error: '所有欄位都是必填的' });
      }

      if (temperature < 0 || temperature > 1) {
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
          updated_at = NOW(),
          updated_by = $5
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        RETURNING *
      `;
      const result = await pool.query(query, [
        ai_model,
        temperature,
        max_tokens,
        analysis_prompt,
        userEmail,
      ]);
      await pool.end();

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
  // 7. POST /api/consultation-quality/config/reset
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

      const query = `
        UPDATE consultation_analysis_config
        SET
          ai_model = 'gpt-4o',
          temperature = 0.7,
          max_tokens = 4000,
          analysis_prompt = $1,
          updated_at = NOW(),
          updated_by = $2
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        RETURNING *
      `;
      const result = await pool.query(query, [defaultPrompt, userEmail]);
      await pool.end();

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
}
