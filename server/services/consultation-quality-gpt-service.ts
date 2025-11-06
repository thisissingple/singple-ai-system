/**
 * Consultation Quality GPT Service
 *
 * Uses OpenAI API to analyze consultation quality from transcripts
 * and generate actionable improvement suggestions for consultants.
 *
 * Model: gpt-4o (fastest, most cost-effective)
 * Cost: ~$0.10 per analysis (estimated)
 */

import OpenAI from 'openai';
import { createPool } from './pg-client';

// ============================================================================
// Types
// ============================================================================

interface AnalysisConfig {
  ai_model: string;
  temperature: number;
  max_tokens: number;
  analysis_prompt: string;
}

export interface AnalysisStrength {
  point: string;          // The strength point (優點)
  evidence: string;       // Specific evidence from transcript (具體證據)
}

export interface AnalysisWeakness {
  point: string;          // The weakness point (缺點)
  evidence: string;       // Specific evidence from transcript
}

export interface ImprovementSuggestion {
  suggestion: string;     // The suggestion (建議)
  method: string;         // Specific method to implement (具體做法)
  expectedEffect: string; // Expected outcome (預期效果)
  priority: number;       // Priority 1-5 (1 = highest)
}

export interface ConsultationQualityAnalysis {
  overallScore: number;                      // 1-10
  overallComment: string;                    // Overall evaluation
  strengths: AnalysisStrength[];             // 3-5 items
  weaknesses: AnalysisWeakness[];            // 2-4 items
  suggestions: ImprovementSuggestion[];      // 3-5 items

  // 評分維度（諮詢專用）
  rapportBuildingScore: number;              // 建立關係 (1-10)
  rapportBuildingComment: string;
  needsAnalysisScore: number;                // 需求分析 (1-10)
  needsAnalysisComment: string;
  objectionHandlingScore: number;            // 異議處理 (1-10)
  objectionHandlingComment: string;
  closingTechniqueScore: number;             // 成交技巧 (1-10)
  closingTechniqueComment: string;

  // Raw AI output (for display purposes)
  rawMarkdownOutput: string;                 // AI 生成的原始 Markdown 輸出
}

// ============================================================================
// System Prompts
// ============================================================================

const CONSULTATION_QUALITY_ANALYSIS_PROMPT = `你是一位專精教育銷售的策略顧問，專門分析諮詢師（Consultant/Closer）的銷售諮詢品質。

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
- 不要編造不存在的對話內容
`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse the markdown output from GPT to structured JSON
 */
function parseAnalysisOutput(markdown: string): ConsultationQualityAnalysis {
  // Extract overall score
  const overallScoreMatch = markdown.match(/\*\*總體評分：\*\*\s*(\d+)/);
  const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : 5;

  // Extract overall comment
  const overallCommentMatch = markdown.match(/\*\*總體評語：\*\*\s*(.+?)(?=\n|---|$)/s);
  const overallComment = overallCommentMatch ? overallCommentMatch[1].trim() : '';

  // Extract dimension scores
  const rapportMatch = markdown.match(/## 1\. 建立關係.*?\*\*評分：\*\*\s*(\d+).*?\*\*評語：\*\*\s*(.+?)(?=\n\*\*|$)/s);
  const rapportBuildingScore = rapportMatch ? parseInt(rapportMatch[1]) : 5;
  const rapportBuildingComment = rapportMatch ? rapportMatch[2].trim() : '';

  const needsMatch = markdown.match(/## 2\. 需求分析.*?\*\*評分：\*\*\s*(\d+).*?\*\*評語：\*\*\s*(.+?)(?=\n\*\*|$)/s);
  const needsAnalysisScore = needsMatch ? parseInt(needsMatch[1]) : 5;
  const needsAnalysisComment = needsMatch ? needsMatch[2].trim() : '';

  const objectionMatch = markdown.match(/## 3\. 異議處理.*?\*\*評分：\*\*\s*(\d+).*?\*\*評語：\*\*\s*(.+?)(?=\n\*\*|$)/s);
  const objectionHandlingScore = objectionMatch ? parseInt(objectionMatch[1]) : 5;
  const objectionHandlingComment = objectionMatch ? objectionMatch[2].trim() : '';

  const closingMatch = markdown.match(/## 4\. 成交技巧.*?\*\*評分：\*\*\s*(\d+).*?\*\*評語：\*\*\s*(.+?)(?=\n\*\*|$)/s);
  const closingTechniqueScore = closingMatch ? parseInt(closingMatch[1]) : 5;
  const closingTechniqueComment = closingMatch ? closingMatch[2].trim() : '';

  // Extract strengths (simplified)
  const strengthsSection = markdown.match(/# 💪 本次諮詢的亮點.*?(?=# 🎓|$)/s);
  const strengths: AnalysisStrength[] = [];
  if (strengthsSection) {
    const strengthMatches = strengthsSection[0].matchAll(/\d+\.\s*\*\*(.+?)\*\*.*?- \*\*具體證據：\*\*\s*(.+?)(?=\n\s*- \*\*為什麼|----|$)/gs);
    for (const match of strengthMatches) {
      strengths.push({
        point: match[1].trim(),
        evidence: match[2].trim(),
      });
    }
  }

  // Extract weaknesses (simplified)
  const weaknessesSection = markdown.match(/# 🎓 本次諮詢的待改進之處.*?(?=# 🚀|$)/s);
  const weaknesses: AnalysisWeakness[] = [];
  if (weaknessesSection) {
    const weaknessMatches = weaknessesSection[0].matchAll(/\d+\.\s*\*\*(.+?)\*\*.*?- \*\*具體證據：\*\*\s*(.+?)(?=\n\s*- \*\*為什麼|----|$)/gs);
    for (const match of weaknessMatches) {
      weaknesses.push({
        point: match[1].trim(),
        evidence: match[2].trim(),
      });
    }
  }

  // Extract suggestions (simplified)
  const suggestionsSection = markdown.match(/# 🚀 行動建議.*?(?=# 🔍|---|$)/s);
  const suggestions: ImprovementSuggestion[] = [];
  if (suggestionsSection) {
    const suggestionMatches = suggestionsSection[0].matchAll(/### 建議 \d+（Priority (\d+)）\s*- \*\*建議：\*\*\s*(.+?)\s*- \*\*具體做法：\*\*\s*(.+?)\s*- \*\*預期效果：\*\*\s*(.+?)(?=###|---|$)/gs);
    for (const match of suggestionMatches) {
      suggestions.push({
        priority: parseInt(match[1]),
        suggestion: match[2].trim(),
        method: match[3].trim(),
        expectedEffect: match[4].trim(),
      });
    }
  }

  return {
    overallScore,
    overallComment,
    strengths: strengths.length > 0 ? strengths : [{ point: '待分析', evidence: '無足夠數據' }],
    weaknesses: weaknesses.length > 0 ? weaknesses : [{ point: '待分析', evidence: '無足夠數據' }],
    suggestions: suggestions.length > 0 ? suggestions : [
      {
        priority: 1,
        suggestion: '建議進行更詳細的諮詢分析',
        method: '收集更完整的對話記錄',
        expectedEffect: '提供更準確的改進建議',
      },
    ],
    rapportBuildingScore,
    rapportBuildingComment,
    needsAnalysisScore,
    needsAnalysisComment,
    objectionHandlingScore,
    objectionHandlingComment,
    closingTechniqueScore,
    closingTechniqueComment,
  };
}

// ============================================================================
// Main Service
// ============================================================================

export class ConsultationQualityGPTService {
  private openai: OpenAI | null = null;
  private config: AnalysisConfig | null = null;

  constructor() {
    // Don't initialize OpenAI in constructor - do it lazily when needed
    // This prevents errors during server startup in environments without API key
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * Load configuration from database (with caching)
   */
  private async loadConfig(): Promise<AnalysisConfig> {
    if (this.config) {
      return this.config;
    }

    const pool = createPool();
    try {
      const query = `
        SELECT ai_model, temperature, max_tokens, analysis_prompt
        FROM consultation_analysis_config
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        LIMIT 1
      `;
      const result = await pool.query(query);

      if (result.rows.length === 0) {
        // If no config in database, use hardcoded defaults as fallback
        this.config = {
          ai_model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 4000,
          analysis_prompt: CONSULTATION_QUALITY_ANALYSIS_PROMPT,
        };
      } else {
        const row = result.rows[0];
        // Convert temperature and max_tokens from database strings to numbers
        this.config = {
          ai_model: row.ai_model,
          temperature: parseFloat(row.temperature),
          max_tokens: parseInt(row.max_tokens, 10),
          analysis_prompt: row.analysis_prompt,
        };
      }

      return this.config;
    } finally {
      await pool.end();
    }
  }

  /**
   * Clear configuration cache (call this after updating config)
   */
  public clearConfigCache(): void {
    this.config = null;
  }

  /**
   * Analyze consultation quality from transcript
   */
  async analyzeConsultationQuality(transcript: string): Promise<ConsultationQualityAnalysis> {
    try {
      const openai = this.getOpenAI();
      const config = await this.loadConfig(); // Load config from database

      const completion = await openai.chat.completions.create({
        model: config.ai_model,
        messages: [
          { role: 'system', content: config.analysis_prompt },
          { role: 'user', content: `請分析以下諮詢逐字稿：\n\n${transcript}` },
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI API');
      }

      const analysis = parseAnalysisOutput(content);
      // Add raw markdown output
      return {
        ...analysis,
        rawMarkdownOutput: content,
      };
    } catch (error) {
      console.error('Error analyzing consultation quality:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const consultationQualityGPTService = new ConsultationQualityGPTService();
