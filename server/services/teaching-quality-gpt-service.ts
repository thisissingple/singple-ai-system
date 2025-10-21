/**
 * Teaching Quality GPT Service
 *
 * Uses OpenAI API to analyze teaching quality from WEBVTT transcripts
 * and generate actionable improvement suggestions.
 *
 * Model: gpt-4o (fastest, most cost-effective)
 * Cost: ~$0.13 per analysis (estimated)
 */

import OpenAI from 'openai';

// ============================================================================
// Types
// ============================================================================

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

export interface StudentCurrentStatus {
  currentSkillState: string;       // 現在唱歌狀況（聲音、控制、信心）
  pastAttempts: string[];          // 過去試過的方法或課程
  currentBlocks: string[];         // 目前卡關重點
  desiredOutcome: string;          // 想成為或達到的狀態
  intendedUsage: string;           // 想把唱歌用在哪裡
  motivation: string;              // 當前內在/外在動機
}

export interface StudentAnalysis {
  technicalIssues: string[];       // 技術面問題（歌唱痛點）
  psychologicalIssues: string[];   // 心理面問題（自信、比較等）
  motivationSource: string;        // 動機來源
  studentProfile: string;          // 學員屬性
  currentStatus?: StudentCurrentStatus; // 詳細現況
  missingData?: string[];          // 找不到的關鍵資訊
}

export interface SalesStrategy {
  painPointAmplification: string;  // 痛點放大
  dreamVision: string;             // 夢想畫面
  transformationBridge?: string;   // 痛點轉接到渴望的過渡話術
  productMatch: string;            // 產品匹配
  scriptDesign: string[];          // 話術設計
  closingScript: string;           // 成交收斂
  doubleBindOptions?: string[];    // Double bind 話術
  nlpTechniques?: string[];        // 其他 NLP 技巧（調狀態、錨定等）
}

export interface ConversionSuggestion {
  studentAnalysis: StudentAnalysis;    // 學員狀況分析
  salesStrategy: SalesStrategy;        // 成交策略
  finalClosingScript: string;          // 完整成交話術
  conversionProbability: number;       // 轉換機率 (0-100)
}

export interface TeachingQualityAnalysis {
  overallScore: number;                      // 1-10
  strengths: AnalysisStrength[];             // 3-5 items
  weaknesses: AnalysisWeakness[];            // 2-4 items
  summary: string;                           // Course summary (課程摘要)
  suggestions: ImprovementSuggestion[];      // 3-5 items
  conversionSuggestions?: ConversionSuggestion; // Only if not converted (single object, not array)
}

export interface SuggestionEffectivenessAnalysis {
  wasExecuted: boolean;                      // Was the suggestion executed?
  effectivenessScore: number;                // 1-5 (how effective)
  evidence: string;                          // Evidence of improvement
  improvements: string[];                    // Specific improvements observed
  recommendations: string[];                 // Further recommendations
}

// ============================================================================
// System Prompts
// ============================================================================

const TEACHING_QUALITY_ANALYSIS_PROMPT = `你是一位專精銷售與教學場景的策略教練。
請閱讀逐字稿後，輸出可直接拿來成交與追蹤的分析。輸出格式請用 Markdown（標題、粗體、項目符號完全依下列模板），不可調整段落或遺漏。若找不到資訊：
1. 在「仍需補問」段落列出缺漏項目。
2. 同時在對應欄位以「需補問：...（原因）」填入提醒文字。
每個敘述都要帶上逐字稿的時間戳或引用片段（例如：00:12:34）。

---

# 🧑‍🏫 學員狀況掌握（快速掌握對象）

- **📇 基本資料（身份速寫）**
  - 年齡／性別／職業／角色：{{ studentProfile }}
  - 是否自己決定是否購課：{{ 決策資訊（可從 studentProfile 補充） }}
  - 價格敏感度／付費能力：{{ studentProfile 中的價格態度描述 }}

---

- **🎤 聲音現況（目前聲音狀態）**
  {{ currentStatus.currentSkillState }}

- **📚 過去嘗試過的方法或課程**
  {{ currentStatus.pastAttempts[0] }}
  {{ currentStatus.pastAttempts[1] }}

- **⛔️ 現在最卡的地方**
  {{ currentStatus.currentBlocks[0] }}
  {{ currentStatus.currentBlocks[1] }}

- **🏁 想成為什麼樣的自己（目標畫面）**
  {{ currentStatus.desiredOutcome }}

- **🎯 為什麼現在特別想學？（當下動機）**
  {{ currentStatus.motivation }}

- **🎬 想把聲音用在哪裡？（應用場景）**
  {{ currentStatus.intendedUsage }}

- **📝 仍需補問**
  {{ missingData 項目；若無缺漏請寫「無」 }}


# 🧮 成交策略評估（指標制）
- 呼應痛點程度：{{ scorePain }}/5（證據：{{ 痛點佐證與時間戳 }}）
- 推課引導力度：{{ scorePitch }}/5（證據：{{ 推課片段與時間戳 }}）
- Double Bind / NLP 應用：{{ scorePsych }}/5（證據：{{ 技巧引用與時間戳 }}）
- 情緒共鳴與信任：{{ scoreEmotion }}/5（證據：{{ 共感片段與時間戳 }}）
- 節奏與收斂完整度：{{ scoreFlow }}/5（說明：{{ 節奏評論 }}）
- **總評**：{{ 總結評論（含目前最有力／需補強的重點） }}

---

# 🚀 下一次成交策略建議（攻擊方向）
- {{ 建議方向1（對應特定痛點或瓶頸，含時間戳） }}
- {{ 建議方向2（可加入故事、案例或社會證明的切角） }}
- {{ 建議方向3（需補強的數據／教材／證據） }}

---

# 💬 完整成交話術總結（可照念）

1. **版本 A — Bateson 誘導 + Double Bind + 價值重構**
   > {{ 版本A話術（360-420 字，開頭先以口語化語氣共感「痛點」，中段引用至少兩個「卡關細節」與一個「夢想畫面」並標示時間戳，穿插兩句以上貝特森階層提問，引導學員重新定義價值；內文需至少 12 句，並包含下列感官小段：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若缺資訊須以「需補問」補足；結尾加入：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並附明確行動邀請。） }}

2. **版本 B — 情緒共鳴 + 損失規避 + Double Bind**
   > {{ 版本B話術（360-420 字，從情緒共鳴切入並引用核心痛點與夢想段落（附時間戳），描繪若不改變將帶來的損失；全文需至少 12 句並包含感官小段：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若資料不足改寫為「需補問」。結尾加入雙重束縛條列：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並重申立即行動的理由。） }}

3. **版本 C — 未來自我定位 + NLP 錨定 + 行動承諾**
   > {{ 版本C話術（360-420 字，透過未來自我定位與 NLP 錨定指令，引導學員感受成功場景，引用至少三個具體證據與時間戳；全文需至少 12 句並包含：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若資料不足以「需補問」補足。結尾以條列呈現雙重束縛：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並邀請學員做出具體承諾。） }}

---

# 📈 預估成交機率：{{ conversionProbability }}%
- **評估依據：**
  - 成員反饋／關鍵對話證據：{{ 含時間戳的佐證重點 }}
  - 技術改善空間：{{ 技術面評估 }}
  - 心理阻力程度：{{ 心理面評估 }}

---

## 寫作原則
- 內容要口語、務實，可以直接念出來。
- 保留所有 emoji、標題與段落順序。
- 缺資料就同時在「仍需補問」列出，並在原欄位填「需補問：...（原因）」。
- 三個成交版本必須明顯區隔（價值重構／損失規避／未來自我），每段字數需落在 360-420 字。
- 每個版本需嵌入貝特森提問或 NLP 技巧，並在內文以條列形式明確使用【視覺】、【聽覺】、【動覺】標籤描述感官畫面（缺資訊時以自然語氣補寫「需補問」）。
- 結尾的雙重束縛需以條列形式呈現兩個具體正向選項（格式必須為「- 選擇 A：...」「- 選擇 B：...」）。
- 成交機率需列出 2-3 個具時間戳的評估依據，說明分數來源。

---

**輸出格式**：只輸出上述 Markdown 內容，不要其他文字。`;

const SUGGESTION_EFFECTIVENESS_ANALYSIS_PROMPT = `你是一位教學改進追蹤專家，負責評估教師是否執行了之前的改進建議，以及執行效果如何。

你會收到：
1. 上次的分析報告和改進建議
2. 本次的上課對話記錄

你的任務是分析教師是否執行了建議，以及執行效果：

1. **是否執行** (true/false)
   - 從對話記錄中尋找證據
   - 判斷教師是否有意識地執行建議

2. **效果評分** (1-5)
   - 1 = 無效果
   - 2 = 略有效果
   - 3 = 中等效果
   - 4 = 顯著效果
   - 5 = 極佳效果

3. **改善證據**
   - 列出具體的改善證據（時間點、對話內容）

4. **觀察到的改進** (陣列)
   - 列出所有觀察到的改進點

5. **進一步建議** (陣列)
   - 如何繼續優化

**輸出格式**：嚴格遵守 JSON 格式。`;

const CONVERSION_OPTIMIZATION_PROMPT = `你是一個專業的「諮詢銷售分析教練」。
我會提供你我跟學員的完整對話紀錄，請你根據以下步驟，輸出一份完整的分析報告：

---

## 📊 輸出 JSON 格式要求：

你必須輸出一個 JSON 物件，包含以下結構：

{
  "studentAnalysis": {
    "technicalIssues": ["技術面問題1", "技術面問題2"],
    "psychologicalIssues": ["心理面問題1", "心理面問題2"],
    "motivationSource": "動機來源描述",
    "studentProfile": "學員屬性描述"
  },
  "salesStrategy": {
    "painPointAmplification": "如何承接學員的痛點並正常化",
    "dreamVision": "如何描述學員想要的未來場景",
    "productMatch": "適合推薦哪種類型的課程",
    "scriptDesign": ["話術1", "話術2", "話術3"],
    "closingScript": "最後收斂成交的語句"
  },
  "finalClosingScript": "完整的成交話術（整合所有元素）",
  "conversionProbability": 75
}

---

## 🎯 分析重點：

### 學員狀況分析
1. **技術面問題**：歌唱上的具體痛點
2. **心理面問題**：自信、比較、尷尬等
3. **動機來源**：為什麼現在想學、觸發點
4. **學員屬性**：年齡層/是否自己付費/對價值的敏感度

### 成交策略
1. **痛點放大**：如何承接學員的痛點並正常化
2. **夢想畫面**：如何描述學員想要的未來場景
3. **產品匹配**：適合推薦哪種類型的課程（初學/進階/短期衝刺/完整系統）
4. **話術設計**：可直接在通話中使用的具體話術
5. **成交收斂**：最後收斂成交的語句

---

## ✍️ 輸出原則：
- 用口語、親切、實戰能直接套用的文字
- 不要給籠統的建議，要給可複製的話術
- 條列清晰，方便一眼就能抓到重點
- 最後必須提供一段「完整的成交話術」作為總結

---

**輸出格式**：嚴格遵守 JSON 格式，不要加任何其他文字。`;

// ============================================================================
// OpenAI Client Initialization
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export async function analyzeTeachingQuality(
  transcriptText: string,
  studentName: string,
  teacherName: string,
  classTopic?: string
): Promise<TeachingQualityAnalysis> {
  const client = getOpenAIClient();

  const userMessage = `📥 學員對話紀錄：

**學員姓名**: ${studentName}
**諮詢師/教師**: ${teacherName}
**課程主題**: ${classTopic || '體驗課'}

**完整對話記錄**:
${transcriptText}

---

請依照系統提示中的 Markdown 模板，生成完整的銷售分析報告。務必：
- 保留所有標題、分隔線與 emoji。
- 針對每個欄位填入具體內容，缺資料時使用「需補問：...」並同步列入「仍需補問」清單。
- 每個觀察與話術都加上逐字稿時間戳（例如：00:12:34）或引用片段。
- 最後一段需包含兩個 double bind 行動選項與成交機率。`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TEACHING_QUALITY_ANALYSIS_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const trimmedContent = content.trim();
    let parsedResult: any = null;

    try {
      parsedResult = JSON.parse(trimmedContent);
    } catch {
      parsedResult = null;
    }

    if (parsedResult && typeof parsedResult === 'object' && !Array.isArray(parsedResult)) {
      const result = parsedResult;

      // Transform new sales-focused format to existing structure
      const strengths: AnalysisStrength[] = [];
      const weaknesses: AnalysisWeakness[] = [];
      const suggestions: ImprovementSuggestion[] = [];

      if (result.studentAnalysis) {
        const {
          technicalIssues,
          psychologicalIssues,
          motivationSource,
          studentProfile,
          currentStatus,
          missingData
        } = result.studentAnalysis;

        strengths.push({
          point: '學員痛點與內在動機',
          evidence: `技術面：${(technicalIssues || []).join('、') || '未提及'} | 心理面：${(psychologicalIssues || []).join('、') || '未提及'} | 動機：${motivationSource || '未提及'} | 屬性：${studentProfile || '未提及'}`
        });

        if (currentStatus) {
          const {
            currentSkillState,
            pastAttempts,
            currentBlocks,
            desiredOutcome,
            intendedUsage,
            motivation
          } = currentStatus;

          strengths.push({
            point: '學員現況與渴望',
            evidence: [
              `目前狀況：${currentSkillState || '未提及'}`,
              `過去嘗試：${(pastAttempts || []).join('、') || '未提及'}`,
              `現在卡關：${(currentBlocks || []).join('、') || '未提及'}`,
              `渴望達成：${desiredOutcome || '未提及'}`,
              `應用場景：${(intendedUsage || '未提及')}`,
              `當下動機：${motivation || '未提及'}`
            ].join(' | ')
          });
        }

        if (missingData && missingData.length > 0) {
          weaknesses.push({
            point: '資訊缺漏',
            evidence: `逐字稿缺少：${missingData.join('、')}（記得下一次補問）`
          });
        }
      }

      if (result.salesStrategy) {
        const {
          painPointAmplification,
          dreamVision,
          transformationBridge,
          productMatch,
          scriptDesign,
          doubleBindOptions,
          nlpTechniques,
          closingScript
        } = result.salesStrategy;

        if (painPointAmplification) {
          suggestions.push({
            suggestion: '痛點放大話術',
            method: painPointAmplification,
            expectedEffect: '讓學員感覺被理解，建立信任',
            priority: 1
          });
        }

        if (dreamVision) {
          suggestions.push({
            suggestion: '夢想畫面話術',
            method: dreamVision,
            expectedEffect: '激發學員對未來的想像和渴望',
            priority: 1
          });
        }

        if (transformationBridge) {
          suggestions.push({
            suggestion: '痛點到渴望的過渡',
            method: transformationBridge,
            expectedEffect: '把痛點連到渴望，創造必然性',
            priority: 1
          });
        }

        if (productMatch) {
          suggestions.push({
            suggestion: '產品匹配',
            method: productMatch,
            expectedEffect: '提供最適合的課程方案',
            priority: 2
          });
        }

        if (scriptDesign && scriptDesign.length > 0) {
          scriptDesign.forEach((script: string, index: number) => {
            suggestions.push({
              suggestion: `實戰話術 ${index + 1}`,
              method: script,
              expectedEffect: '可直接在通話中使用',
              priority: 1
            });
          });
        }

        if (doubleBindOptions && doubleBindOptions.length > 0) {
          doubleBindOptions.forEach((option: string, index: number) => {
            suggestions.push({
              suggestion: `Double bind 話術 ${index + 1}`,
              method: option,
              expectedEffect: '引導學員在兩個正向選項中做決定',
              priority: 1
            });
          });
        }

        if (nlpTechniques && nlpTechniques.length > 0) {
          suggestions.push({
            suggestion: 'NLP 技巧提醒',
            method: nlpTechniques.join('；'),
            expectedEffect: '用語言與狀態管理強化說服力',
            priority: 2
          });
        }

        if (closingScript) {
          suggestions.push({
            suggestion: '成交收斂話術',
            method: closingScript,
            expectedEffect: '自然引導學員做出購買決策',
            priority: 1
          });
        }
      }

      const missingPenalty = (() => {
        let penalty = 0;
        const missingList = Array.isArray(result.studentAnalysis?.missingData)
          ? result.studentAnalysis.missingData.length
          : 0;
        penalty += missingList * 5;

        const technicalCount = Array.isArray(result.studentAnalysis?.technicalIssues)
          ? result.studentAnalysis.technicalIssues.length
          : 0;
        if (technicalCount === 0) penalty += 5;

        const psychologicalCount = Array.isArray(result.studentAnalysis?.psychologicalIssues)
          ? result.studentAnalysis.psychologicalIssues.length
          : 0;
        if (psychologicalCount === 0) penalty += 5;

        if (!result.studentAnalysis?.motivationSource) penalty += 5;
        if (!result.studentAnalysis?.currentStatus?.currentSkillState) penalty += 5;
        if (!result.studentAnalysis?.currentStatus?.desiredOutcome) penalty += 5;
        if (!result.studentAnalysis?.currentStatus?.intendedUsage) penalty += 5;
        if (!result.studentAnalysis?.currentStatus?.motivation) penalty += 5;

        if (!result.salesStrategy?.transformationBridge) penalty += 5;
        const doubleBindCount = Array.isArray(result.salesStrategy?.doubleBindOptions)
          ? result.salesStrategy.doubleBindOptions.length
          : 0;
        if (doubleBindCount < 2) penalty += 5;

        return penalty;
      })();

      const rawConversionProb = typeof result.conversionProbability === 'number'
        ? result.conversionProbability
        : 50;
      const conversionProb = Math.max(0, rawConversionProb - missingPenalty);
      const overallScore = Math.max(1, Math.min(10, Math.round(conversionProb / 10)));

      return {
        overallScore,
        strengths,
        weaknesses,
        summary: result.finalClosingScript || '完整成交話術未生成',
        suggestions,
        conversionSuggestions: result.studentAnalysis && result.salesStrategy ? {
          studentAnalysis: result.studentAnalysis,
          salesStrategy: result.salesStrategy,
          finalClosingScript: result.finalClosingScript,
          conversionProbability: result.conversionProbability || rawConversionProb
        } : undefined
      };
    }

    // Handle Markdown-based response
    const markdownOutput = trimmedContent;
    const probabilityMatch = markdownOutput.match(/預估成交機率：[^0-9]*(\d+)/);
    const conversionProb = probabilityMatch ? Math.min(100, Math.max(0, parseInt(probabilityMatch[1], 10))) : 50;
    const overallScore = Math.max(1, Math.min(10, Math.round(conversionProb / 10)));

    return {
      overallScore,
      strengths: [{
        point: 'Markdown 報告',
        evidence: '請參考原始 Markdown 分析報告。'
      }],
      weaknesses: [],
      summary: '請參考 Markdown 報告內容。',
      suggestions: [{
        suggestion: '依 Markdown 報告執行策略',
        method: '詳見 Markdown 各段落的話術規劃與建議。',
        expectedEffect: '確保銷售流程與教學優化落地',
        priority: 1
      }],
      conversionSuggestions: {
        markdownOutput,
        conversionProbability: conversionProb
      }
    };

  } catch (error) {
    console.error('Error analyzing teaching quality:', error);
    throw new Error(`Failed to analyze teaching quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Suggestion Effectiveness Analysis
// ============================================================================

export async function analyzeSuggestionEffectiveness(
  previousTranscript: string,
  currentTranscript: string,
  suggestion: ImprovementSuggestion,
  teacherName: string,
  studentName: string
): Promise<SuggestionEffectivenessAnalysis> {
  const client = getOpenAIClient();

  const userMessage = `請分析教師是否執行了之前的改進建議，以及執行效果。

**教師姓名**: ${teacherName}
**學生姓名**: ${studentName}

**上次的建議**:
- 建議: ${suggestion.suggestion}
- 執行方法: ${suggestion.method}
- 預期效果: ${suggestion.expectedEffect}

**上次的對話記錄** (參考):
${previousTranscript.substring(0, 3000)}...

**本次的對話記錄**:
${currentTranscript}

請評估建議的執行情況和效果。

**輸出 JSON 格式**:
{
  "wasExecuted": true,
  "effectivenessScore": 4,
  "evidence": "在本次課程中，教師明顯放慢了語速...",
  "improvements": [
    "語速從平均每分鐘180字降到140字",
    "學生理解度提升，幾乎沒有要求重複"
  ],
  "recommendations": [
    "繼續保持當前語速",
    "可以加入更多停頓來確認理解"
  ]
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUGGESTION_EFFECTIVENESS_ANALYSIS_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);

    return {
      wasExecuted: result.wasExecuted || false,
      effectivenessScore: result.effectivenessScore || 3,
      evidence: result.evidence || '',
      improvements: result.improvements || [],
      recommendations: result.recommendations || []
    };

  } catch (error) {
    console.error('Error analyzing suggestion effectiveness:', error);
    throw new Error(`Failed to analyze suggestion effectiveness: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Conversion Optimization Analysis
// ============================================================================

export async function analyzeConversionOptimization(
  transcriptText: string,
  studentName: string,
  teacherName: string,
  studentBackground?: string
): Promise<ConversionSuggestion> {
  const client = getOpenAIClient();

  const userMessage = `📥 學員對話紀錄：

**學員姓名**: ${studentName}
**諮詢師/教師**: ${teacherName}
${studentBackground ? `**學員背景**: ${studentBackground}` : ''}

**完整對話記錄**:
${transcriptText}

---

請根據上述對話記錄，提供完整的銷售分析報告。`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: CONVERSION_OPTIMIZATION_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);

    // Validate and return the structured response
    return {
      studentAnalysis: result.studentAnalysis || {
        technicalIssues: [],
        psychologicalIssues: [],
        motivationSource: '',
        studentProfile: ''
      },
      salesStrategy: result.salesStrategy || {
        painPointAmplification: '',
        dreamVision: '',
        productMatch: '',
        scriptDesign: [],
        closingScript: ''
      },
      finalClosingScript: result.finalClosingScript || '',
      conversionProbability: result.conversionProbability || 50
    };

  } catch (error) {
    console.error('Error analyzing conversion optimization:', error);
    throw new Error(`Failed to analyze conversion optimization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Cost Estimation
// ============================================================================

export function estimateAnalysisCost(transcriptLength: number): number {
  // GPT-4o pricing (as of 2024):
  // Input: $2.50 per 1M tokens
  // Output: $10.00 per 1M tokens

  // Rough estimates:
  // - System prompt: ~500 tokens
  // - User message: ~200 tokens + transcript
  // - Transcript: ~1 token per 4 characters (English/Chinese mix)
  // - Output: ~1000 tokens

  const systemPromptTokens = 500;
  const userMessageTokens = 200;
  const transcriptTokens = Math.ceil(transcriptLength / 4);
  const outputTokens = 1000;

  const totalInputTokens = systemPromptTokens + userMessageTokens + transcriptTokens;
  const totalOutputTokens = outputTokens;

  const inputCost = (totalInputTokens / 1_000_000) * 2.50;
  const outputCost = (totalOutputTokens / 1_000_000) * 10.00;

  return inputCost + outputCost;
}
