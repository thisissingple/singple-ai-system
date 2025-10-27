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
請閱讀逐字稿後，輸出可直接拿來成交與追蹤的分析。輸出格式請用 Markdown（標題、粗體、項目符號完全依下列模板），不可調整段落或遺漏。

**重要原則：**
1. 從對話中主動推斷資訊，不要輕易說「需補問」
2. 行為線索比直接陳述更重要（例如：特地跑去KTV = 動機強 + 環境限制）
3. 每個敘述都要帶上逐字稿的時間戳（例如：14:12:34）
4. 若真的找不到資訊，在「仍需補問」列出，並在對應欄位標註「需補問：...（原因）」

**⚠️ 關於逐字稿格式（極度重要）：**
- **逐字稿可能沒有發言者標記**（沒有「學員:」或「老師:」的標籤）
- **你必須從上下文自動推斷誰在說話**：
  - 📌 **判斷技巧 1**：根據說話內容（學員通常問問題、描述痛點、表達需求；老師通常回答、引導、推課）
  - 📌 **判斷技巧 2**：根據對話邏輯（問答對應、話題延續）
  - 📌 **判斷技巧 3**：根據時間戳順序（通常是學員和老師輪流說話）
- **⚠️ 絕對不可以「編造」不存在的對話**：
  - ✅ 正確：只引用逐字稿中真實存在的句子
  - ❌ 錯誤：腦補「老師應該會說...」的內容
- **引用對話時必須標註發言者**：
  - 範例：「【學員】社交有幫助 (14:13:21)」、「【老師】這樣的話，針對社交場合的練習會對你有幫助 (14:13:35)」
  - 如果無法確定發言者，標註「【推測-學員】」或「【推測-老師】」

---

# 📍 課程階段識別（先判斷情境）

- **階段類型：** {{ 勾選一項：□ 已購課-首堂課 □ 已購課-進行中 □ 已購課-最後一堂 □ 續約期 }}
- **判斷依據：** {{ 從對話內容推斷課程進度，特別注意學員是否提到「最後一堂」「今天是最後一次」等關鍵字，附時間戳 }}
- **分析重點方向：** {{ 已購課-首堂→啟動學習+建立習慣 / 已購課-進行中→維持熱度+追蹤進度 / 已購課-最後一堂→成果回顧+續約推廣（重點！） / 續約期→升級方案 }}
- **⚠️ 重要提醒：本系統分析的都是已購課學員，沒有體驗課學員。請勿誤判為「首次體驗課」！**

---

# 🧑‍🏫 學員狀況掌握（快速掌握對象）

- **📇 基本資料（從對話中推斷生活型態）**

  **生活型態與時間結構：**
  - 工作型態（全職/輪班/彈性）、上班時間、休假模式、家庭狀況
  - {{ 範例：兩天上班兩天休假，上班到9-10點（14:14:23）}}

  **練習環境與限制：**
  - 家中環境、噪音顧慮、可用空間、鄰居關係
  - {{ 範例：家裡無法練習，特地跑去KTV上課（14:08:48）}}

  **購課決策與付費指標：**
  - 是否已購課？課程名稱？購買時間 vs 開始上課時間差？
  - 決策方式（自主決策/需家人同意/公司補助）
  - 價格態度（直接問價格/關注CP值/價格不是問題/已付費）

  **推斷說明：** {{ 若對話中未直接提及，請從「行為線索」推斷並註明依據 }}

---

- **🎤 聲音現況（目前聲音狀態）**
  {{ currentStatus.currentSkillState，附時間戳 }}

- **📚 過去嘗試過的方法或課程**
  - {{ 嘗試1，附時間戳 }}
  - {{ 嘗試2，附時間戳 }}
  - {{ 若有更多請繼續列出 }}

- **⛔️ 深層痛點分析（銷售核心，不只是技術問題）**

  **重要原則：痛點 ≠ 技術問題，痛點 = 內心深層的情緒、社交、目標困擾。技術問題只是「症狀」，要找出背後的「內心問題」。每個痛點必須連結「一對一教練課程如何解決」。**

  **1. 目標層痛點（人生目標、自我實現）**
  - **內心痛點：** {{ 他為什麼想學唱歌？背後的人生目標是什麼？社交加分？職業需求？自我實現？}}
  - **行為證據：** {{ 時間戳 + 對話內容 }}
  - **一對一教練價值：** {{ 如何幫助他達成這個目標（強調：隨時隨地練習 + 不用固定時段 + 直接聯絡老師 + 即時解惑）}}
  - **如果未探索：** ❌ 對話中未探索此層次痛點。**教學品質扣分**。建議補問：「是什麼原因讓你想要提升唱歌能力？」

  **2. 社交層痛點（朋友看法、工作需求、家庭關係）**
  - **內心痛點：** {{ 唱歌在他的社交/工作/家庭中扮演什麼角色？有什麼壓力或期待？}}
  - **行為證據：** {{ 時間戳 + 對話內容 }}
  - **一對一教練價值：** {{ 如何解決社交場合的困擾（強調：客製化場景練習 + 選歌策略 + 快速見效）}}
  - **如果未探索：** ❌ 對話中未探索此層次痛點。**教學品質扣分**。建議補問：「你平常會在什麼場合唱歌？」

  **3. 情緒層痛點（自信、尷尬、焦慮、挫折）**
  - **內心痛點：** {{ 學唱歌過程中有什麼情緒困擾？自信、尷尬、焦慮？擔心方向錯誤？}}
  - **行為證據：** {{ 時間戳 + 對話內容（例如：已購線上課程但還來上一對一 = 不確定自學方向）}}
  - **一對一教練價值：** {{ 如何建立自信、消除焦慮（強調：每天確認做對做錯 + 即時糾正 + 不走冤枉路）}}
  - **如果未探索：** ❌ 對話中未探索此層次痛點。**教學品質扣分**。建議補問：「之前自己練習時有遇到什麼挫折嗎？」

  **4. 環境層痛點（場地、時間、資源限制）**
  - **內心痛點：** {{ 練習環境有什麼限制？導致什麼困擾？練習頻率低？}}
  - **行為證據：** {{ 例如：特地跑去 KTV 上課（時間戳）= 家中無法練習 }}
  - **一對一教練價值：** {{ 如何突破環境限制（強調：隨時隨地練習 + 線上指導 + 不受場地限制 + 解決「練習頻率」反對意見）}}
  - **如果未探索：** ⚠️ 至少要探索基本環境限制（在家能否練習？時間是否充足？）

  **5. 技術層痛點（症狀統計，不是銷售核心）**
  - **統計對話中提到的技術問題（取前三名，附上提及次數）：**
    1. {{ 技術問題 1 }}：提及 X 次（時間戳：...）
    2. {{ 技術問題 2 }}：提及 X 次（時間戳：...）
    3. {{ 技術問題 3 }}：提及 X 次（時間戳：...）
  - **⚠️ 重要提醒：** 技術問題只是表層症狀，**推課重點是上述 1-4 層的內心痛點**，不是「我幫你解決高音」，而是「我幫你在社交場合自信唱歌」。

  **指引：**
  - 至少列出 4-6 個深層痛點（涵蓋目標/社交/情緒/環境層）
  - 不要硬找痛點，如果某層次真的看不出來 → 標註「未探索」並在教學品質評分中扣分
  - 每個痛點必須連結「一對一教練課程價值」
  - 技術問題只是統計，不是銷售重點

- **🏁 想成為什麼樣的自己（目標畫面）**
  {{ currentStatus.desiredOutcome，附時間戳 }}

- **🎯 為什麼現在特別想學？（當下動機）**
  {{ currentStatus.motivation，附時間戳 }}

- **🎬 想把聲音用在哪裡？（應用場景）**
  {{ currentStatus.intendedUsage，附時間戳 }}

- **📝 仍需補問**
  {{ 真正缺漏且無法推斷的項目；若無缺漏請寫「無」 }}

---

# 📚 教學品質評估（指標制 /25 分）

**⚠️ 評分原則：**
- 這是評估「教學技巧」的專業度，與「推課能力」分開評分
- 重點：教學邏輯、示範效果、學員理解度、課程結構

---

**1. 教學目標清晰度：X/5**
- **評分標準：**
  - 5分 = 開場明確說明本次課程目標 + 課程結束前總結達成成果 + 學員明確知道學到什麼
  - 4分 = 有說明目標，但未做總結
  - 3分 = 隱含目標，但未明確說明
  - 2分 = 目標模糊，學員可能不清楚要學什麼
  - 1分 = 完全沒有目標說明
- **證據：** {{ 引用開場和結尾的實際對話，附時間戳 }}
- **理由：** {{ 說明給分原因 }}

**2. 示範與講解品質：X/5**
- **評分標準：**
  - 5分 = 示範清晰 + 分步驟講解 + 學員立即理解並成功模仿 + 使用比喻或生活化例子
  - 4分 = 示範清晰 + 學員基本理解
  - 3分 = 有示範但講解不夠詳細，學員需要多次嘗試
  - 2分 = 示範模糊或講解不清楚
  - 1分 = 幾乎沒有示範或講解
- **證據：** {{ 引用示範和講解的實際片段，附時間戳 }}
- **理由：** {{ 說明給分原因 }}

**3. 學員理解度與互動：X/5**
- **評分標準：**
  - 5分 = 學員積極提問（5次以上）+ 老師耐心回答 + 確認學員理解（「聽懂了嗎？」）+ 學員有正面回饋
  - 4分 = 學員有提問 + 老師有回應 + 部分確認理解
  - 3分 = 互動較少，主要是老師單向教學
  - 2分 = 互動很少，學員被動接受
  - 1分 = 幾乎沒有互動
- **證據：** {{ 列舉學員提問和老師回應的時機，附時間戳 }}
- **理由：** {{ 說明給分原因 }}

**4. 即時回饋與調整：X/5**
- **評分標準：**
  - 5分 = 學員每次練習後都給予具體回饋 + 指出問題並示範正確方式 + 調整教學方法適應學員程度
  - 4分 = 有即時回饋，但不夠具體
  - 3分 = 偶爾給回饋，但未調整教學方法
  - 2分 = 很少給回饋
  - 1分 = 幾乎沒有回饋
- **證據：** {{ 引用老師給回饋的實際片段，附時間戳 }}
- **理由：** {{ 說明給分原因 }}

**5. 課程結構與時間掌控：X/5**
- **評分標準：**
  - 5分 = 開場-探索-示範-練習-總結，結構完整 + 時間分配合理 + 每個環節轉換流暢
  - 4分 = 結構清晰，但時間分配略有不均
  - 3分 = 基本結構存在，但某些環節過長或過短
  - 2分 = 結構鬆散，時間掌控不佳
  - 1分 = 沒有明確結構
- **證據：** {{ 標示各階段時間點，例如：開場(14:08:10-14:09:06)、示範(14:13:01-14:35:30) }}
- **理由：** {{ 說明給分原因 }}

**教學品質總分：X/25**
{{ 列出 5 個指標的分數，例如：4+5+3+4+5=21/25 }}

---

# 🧮 成交策略評估（指標制 + 明確評分標準）

**⚠️ 評分原則（嚴格遵守）：**
1. **評分必須有鑑別度**：不可輕易給滿分，5分是極罕見的完美表現
2. **證據必須引用實際對話**：不只寫時間戳，要引用實際說的話（用引號「...」包起來）
3. **理由必須說明給分原因**：解釋為什麼給這個分數，不是只列證據
4. **沒有證據不給分**：如果某個指標沒有明確證據，給0分或1分，不可猜測

---

**呼應痛點程度：X/5**

**⚠️ 重要：什麼才算「真正的痛點呼應」？**
- ❌ **不算痛點呼應**：只回應技術問題（例如：「你聲音用喉嚨，我教你用共鳴」）
- ✅ **才算痛點呼應**：連結到學員的**情緒/社交/目標/應用場景**
  - 範例 1（社交層）：學員說「我想在社交場合唱歌」→ 老師回應「所以你希望在朋友面前展現自信，讓大家對你刮目相看對嗎？」
  - 範例 2（情緒層）：學員說「我不知道做對沒」→ 老師回應「這種不確定感很焦慮對吧？一對一教練可以每天確認你的練習方向」
  - 範例 3（目標層）：學員說「我想用在工作場合」→ 老師回應「聲音是你的職業形象，投資自己的聲音就是投資你的事業」
  - 範例 4（場景層）：學員說「家裡不能練習」→ 老師回應「所以你需要隨時隨地都能練習的方法，不受環境限制」

**核心原則：學員願意花錢，一定有明確的目標與應用場景。如果對話中沒看到老師引導這些深層動機，就是沒有呼應痛點！**

- **評分標準（極度嚴格）：**
  - 5分 = 精準命中3個以上**深層痛點**（情緒/社交/目標/場景層）+ 每次回應都連結到學員的內心動機 + 引用學員原話 + 正常化處理
  - 4分 = 命中2個深層痛點 + 有共感回應 + 部分連結到內心動機
  - 3分 = 命中1個深層痛點 + 但大部分時間只回應技術問題
  - 2分 = 只有表面共感，沒有真正挖掘深層痛點
  - 1分 = 只回應技術問題，完全忽略情緒/社交/目標/場景
  - 0分 = 完全沒有任何回應

- **證據（必須引用實際對話，並標註痛點類型）：**
  {{ 範例格式：
  - 【情緒層痛點】學員說：『我不知道到底哪一個方法有效』(14:16:47)，老師回應：『這種不確定感很焦慮對吧？老師可以每天確認你的練習方向』(14:17:05)
  - 【社交層痛點】學員說：『我想在社交場合唱歌』(14:13:21)，老師回應：『所以你希望在朋友面前展現自信對嗎？』(14:13:35)
  列出所有真正呼應深層痛點的時機，不要列技術回應！
  }}

- **理由：** {{
  必須說明：
  1. 老師呼應了哪幾個深層痛點（情緒/社交/目標/場景）
  2. 哪些痛點被忽略了（如果學員有提但老師沒回應）
  3. 老師是否只做技術回應而沒有挖掘深層動機
  4. 因此給X分的原因

  範例：「老師有呼應情緒層痛點（不確定感、焦慮）和環境層痛點（家裡不能練習），但學員明確提到『想在社交場合唱歌』，老師沒有深入挖掘社交動機和應用場景，大部分時間在講技術解決方案，因此只給3分」
  }}

**推課引導力度：X/5**
- **評分標準（嚴格）：**
  - 5分 = 探索深層痛點（目標/社交/情緒層）+ 連結痛點與一對一教練課程價值 + 強調「隨時隨地練習 + 即時解惑」+ 解決「練習頻率」反對意見 + 直接促成下一步行動 + 使用具體話術引導成交
  - 4分 = 探索部分深層痛點 + 有推課引導 + 說明課程優勢 + 軟性邀約
  - 3分 = 僅提及正式課程存在，但未連結痛點與課程價值
  - 2分 = 被動回答課程問題，未主動推課
  - 1分 = 完全未提及課程，或只推技術改進而非課程價值
  - 0分 = 沒有任何推課行為
- **證據（必須引用實際推課話術）：** {{ 範例格式：「14:16:47 老師說：『你特地跑來KTV上課，證明你很認真，如果升級到一對一教練課程，可以隨時在家練習然後傳給我確認』」，列出至少3處推課引導時機 }}
- **理由：** {{ 說明為什麼給這個分數，例如：「老師有提及課程優勢（隨時練習、即時確認），但沒有直接促成下一步行動（約下次諮詢或報價），因此給3分」}}

**Double Bind / NLP 應用：X/5**

**⚠️ Double Bind 類型識別指南（必須全部識別，不可遺漏！）：**

**1. 明確二選一 Double Bind（基礎型）**
- 特徵：兩個選項都明確提出，一個正面（接受方案）一個負面（拒絕後果）
- 範例：「你可以選擇現在開始系統學習快速達成目標，或者繼續自己摸索但可能走冤枉路」
- 識別關鍵字：「你可以選擇...或者...」、「要麼...要麼...」

**2. 隱含式 Double Bind（高階型，極易遺漏！）**
- 特徵：不直接說「選擇A或B」，而是用「吸引 + 正常化問題 + 暗示解決方案」的結構
- 範例：「今天時間短，我會用快速方法讓你馬上學會（吸引），但回去之後可能會忘記怎麼做（問題），這是非常非常正常的，不管你去哪一間都是這樣（正常化） → 暗示需要持續課程」
- 分析邏輯：
  - 第一層：快速學習 vs 容易忘記（隱含矛盾）
  - 第二層：一次性體驗 vs 持續系統學習（暗示必須報名）
  - 核心技巧：用「正常化」包裝問題，讓學員覺得「忘記是正常的」→ 因此需要持續課程
- ⚠️ **這是最容易漏掉的高階技巧！如果看到類似結構，必須識別為隱含式 Double Bind！**

**3. 正常化 + 唯一解決方案 Double Bind**
- 特徵：先將問題正常化（「不管去哪裡都這樣」），再提供唯一解決方案（「所以需要我們的課程」）
- 範例：「回去會忘記這是非常正常的，不管去哪間教室都會有這個問題（正常化） → 所以我們的課程設計是每天練習加上老師即時確認，確保你不會忘記（唯一解決方案）」
- 分析邏輯：暗示「既然問題無法避免，唯一解法就是報名我們課程」

**4. 損失規避 Double Bind**
- 特徵：利用已投入的時間/金錢/努力製造選擇壓力
- 範例：「你已經投資時間來上課了，而且也購買線上課程了（沉沒成本），如果現在不把握機會系統學習，之前的投資就浪費了（損失）」
- 分析邏輯：「繼續投資」vs「浪費已投入成本」

**5. 未來錨定 Double Bind**
- 特徵：描繪美好未來場景，對比現狀困境
- 範例：「想像未來的你在社交場合自信唱歌，聽到掌聲和讚美（美好未來） vs 現在的你還在摸索方向、不確定做對沒有（現狀困境）」

- **評分標準（極度嚴格，必須識別所有類型）：**
  - 5分 = 使用3次以上 Double Bind（包含至少1個隱含式或高階型）+ 技巧應用精準有效 + 學員明顯被引導
  - 4分 = 使用2次 Double Bind（包含至少1個隱含式或高階型）+ 技巧應用正確
  - 3分 = 使用1-2次基礎型 Double Bind + 技巧應用基本正確
  - 2分 = 有引導式提問或暗示選擇，但結構不完整
  - 1分 = 嘗試使用但技巧不正確或無效
  - 0分 = 完全沒有使用任何 Double Bind 技巧

- **證據（必須標明 Double Bind 類型，引用實際話術）：**
  {{ 範例格式：
  1. **隱含式 Double Bind** (14:13:51)：【老師】「今天時間短，我會用快速方法讓你馬上學會，但回去之後可能會忘記怎麼做，這是非常非常正常的，不管你去哪一間都是這樣」
     - 分析：用「正常化」包裝問題（忘記是正常的），暗示需要持續課程解決
  2. **明確二選一 Double Bind** (14:20:15)：【老師】「你可以選擇現在開始系統學習，或者繼續探索但單打獨鬥進步有限」

  ⚠️ 必須列出所有 Double Bind 應用，並標明類型！不可遺漏隱含式！
  }}

- **理由：**
  {{ 必須說明：
  1. 老師使用了哪幾種 Double Bind 類型（明確列出：明確二選一/隱含式/正常化+解決方案/損失規避/未來錨定）
  2. 每個 Double Bind 的應用效果如何（是否成功引導學員思考、是否建立選擇壓力）
  3. 是否有遺漏的機會（例如：學員提到已付費但老師沒用損失規避 Double Bind）
  4. 因此給X分的具體原因

  範例：「老師使用了1次隱含式 Double Bind（14:13:51 正常化忘記問題）和1次明確二選一（14:20:15），兩次應用都正確且有效，因此給4分」
  }}

**情緒共鳴與信任：X/5**
- **評分標準（嚴格）：**
  - 5分 = 深度同理 + 多次引用學員原話 + 建立「我懂你」的連結 + 學員明顯感受到被理解（有正面回應）
  - 4分 = 多次共鳴 + 提供具體解決方案 + 部分引用學員原話
  - 3分 = 有同理但較表面 + 偶爾共鳴
  - 2分 = 理性回應為主 + 缺乏情感連結
  - 1分 = 冷漠或公式化回應
  - 0分 = 完全沒有情緒共鳴
- **證據（必須引用實際共感對話）：** {{ 範例格式：「學員說『我覺得很挫折』(14:25:30)，老師回應『我完全理解這種感覺，很多學員一開始都會經歷這個階段』(14:25:45)」，列舉2-3處最明顯的共感時機 }}
- **理由：** {{ 說明為什麼給這個分數，例如：「老師有提供情緒支持，但沒有引用學員原話，共感深度不足，因此給3分」}}

**節奏與收斂完整度：X/5**
- **評分標準（嚴格）：**
  - 5分 = 開場-探索-演示-推課-約下次，完整且流暢 + 每個階段轉換自然 + 收斂明確（約定下次時間或下一步行動）
  - 4分 = 結構清晰 + 有明確收斂 + 階段轉換基本流暢
  - 3分 = 有結構但收斂不夠強 + 階段轉換略顯生硬
  - 2分 = 節奏散亂 + 缺乏結構
  - 1分 = 完全無結構 + 沒有收斂
  - 0分 = 課程沒有明確開始或結束
- **證據（必須標示各階段時間點）：** {{ 範例格式：「開場 (14:00:00-14:05:00)、探索痛點 (14:05:00-14:20:00)、技術演示 (14:20:00-14:35:00)、推課引導 (14:35:00-14:42:00)、收斂約下次 (14:42:00-14:45:00)」}}
- **理由：** {{ 說明為什麼給這個分數，例如：「課程有完整結構且收斂明確（約定下週上課時間），但推課階段時間偏短，因此給4分」}}

**總評（總分/25）：** {{ 總結評論，含最有力的點（哪一項最強，為什麼）+ 最需補強的點（哪一項最弱，為什麼）+ 各項分數加總 = 總分X/25（例如：4+3+2+4+5=18/25）}}

---

# 🚀 下一次成交策略建議（攻擊方向）
- {{ 建議方向1（對應特定痛點或瓶頸，含時間戳） }}
- {{ 建議方向2（可加入故事、案例或社會證明的切角） }}
- {{ 建議方向3（需補強的數據／教材／證據） }}

---

# 💬 完整成交話術總結（可照念 + 高度個人化）

**⚠️ 推課方向：必須推「升級到一對一教練課程」，不是推學員現有方案**
- 學員目前狀態：{{ 已購線上課程（如高音Pro）/ 體驗課學員 / 其他 }}
- 推課目標：升級到「完整一對一教練課程」
- **核心價值差異（必須強調）：**
  1. **時間自由**：隨時隨地練習，不用固定時段，不用練很久
  2. **即時指導**：有老師的直接聯絡方式，想練就問，24小時內回覆
  3. **練習頻率提升**：每天練習都能傳給教練確認，解決「練習頻率」反對意見
  4. **確保做對**：不會走冤枉路，每一分鐘練習都是有效的

**個人化要求（必須遵守）：**
1. **開頭必須引用「該學員的獨特情境」**（不是泛泛的痛點）
   - 範例：特地跑去KTV上課、已購線上課程但不確定方向、工作輪班兩天休兩天、家裡怕吵鄰居
2. **中段連結「深層痛點」與「一對一教練課程價值」**
   - ❌ 錯誤：只推技術解決方案（「我幫你解決高音」）
   - ✅ 正確：連結內心痛點（「你想在社交場合自信唱歌 → 一對一教練針對你的場景設計練習」）
   - 必須強調：隨時隨地練習 + 即時解惑 + 解決練習頻率問題
3. **結尾的Double Bind要結合「該學員已展現的行為」**
   - 範例：已購課→升級到一對一，讓投資發揮最大價值 / 已問很多問題→證明你很認真，一對一教練能確保你做對 / 環境受限→一對一教練教你突破限制

---

1. **版本 A —「已付費/高投入型」學員專用（價值重構）**
   > {{ 開頭先點出「你已經購買XX課程」或「特地XX」這個事實，展現你記得他的投資/努力。中段運用 Bateson 階層提問引導重新定義學習價值，連結至少兩個卡關細節與夢想畫面（附時間戳）。內文需至少 12 句，並包含感官小段：
   - 【視覺】想像自己在XX場景的畫面...
   - 【聽覺】聽到自己聲音的XX變化...
   - 【動覺】感受到XX的輕鬆/力量...
   結尾雙重束縛（結合已展現行為）：
   - 選擇 A：現在開始，讓投資/努力發揮價值
   - 選擇 B：繼續觀望，但時間/課程隨時間貶值
   （360-420字）}}

2. **版本 B —「環境限制/時間壓力型」學員專用（損失規避）**
   > {{ 開頭深度共感「環境限制」或「時間壓力」的困境（引用具體時間戳），展現理解。中段提供具體可行的解決方案，描繪若不改變將錯失的機會（損失規避）。內文需至少 12 句，並包含感官小段：
   - 【視覺】看到其他人在XX場合的表現，而你...
   - 【聽覺】聽到他人的XX，而你因為拖延...
   - 【動覺】感受到每次XX後的疲憊/遺憾...
   結尾雙重束縛（針對阻力點）：
   - 選擇 A：接受我們提供的解決方案（如XX時間練習/XX地點）
   - 選擇 B：繼續受限於環境，接受進步緩慢
   （360-420字）}}

3. **版本 C —「積極探索/高度投入型」學員專用（未來錨定）**
   > {{ 開頭引用「課程中問了很多問題」或「對XX很感興趣」，肯定他的認真態度（附時間戳）。中段透過未來自我定位與 NLP 錨定，引導感受成功場景，引用至少三個具體證據。內文需至少 12 句，並包含感官小段：
   - 【視覺】看到未來的自己在XX場景...
   - 【聽覺】聽到掌聲/讚美/自己的完美演唱...
   - 【動覺】感受到每個音符都是自然流出...
   結尾雙重束縛（行動承諾）：
   - 選擇 A：立即開始系統學習，快速達成目標
   - 選擇 B：保持探索，但單打獨鬥進步有限
   （360-420字）}}

**指引：** 三個版本必須針對不同學員類型，不可重複內容。若該學員不符合某版本類型，請調整切角但保持技巧框架。

---

# 📈 預估成交機率：X%（量化指標計算）

**量化計算公式（透明化評分）：**

**基礎分：40%**（所有學員起始分）

**加分項（最高+60%）：**
- ✅ 已購課/已付訂金：+20% → {{ 若有，說明課程名稱與購買時間 }}
- ✅ 課後主動約下次上課時間：+15% → {{ 若有，時間戳 }}
- ✅ 課程中積極提問（5次以上）：+10% → {{ 列舉提問時間戳 }}
- ✅ 展現時間投入意願（特地安排/調整行程）：+10% → {{ 舉例與時間戳 }}
- ✅ 展現金錢投入意願（詢問課程/不問價格）：+5% → {{ 舉例與時間戳 }}
- ✅ 明確表達目標與動機：+5% → {{ 時間戳 }}
- ✅ 對老師/課程給予正面反饋：+5% → {{ 時間戳 }}

**減分項：**
- ❌ 明確表達價格疑慮/需考慮預算：-10% → {{ 時間戳 }}
- ❌ 表示需要「考慮看看」或「回去想想」：-15% → {{ 時間戳 }}
- ❌ 提及正在比較其他機構：-20% → {{ 時間戳 }}
- ❌ 對課程效果表示懷疑：-15% → {{ 時間戳 }}

**實際計算過程：**
- 基礎分：40%
- {{ 逐項列出加減分，格式：「+ 已購課（高音pro，2025-09-04）：+20%」}}
- {{ 逐項列出加減分，格式：「+ 約下週上課（14:44:21）：+15%」}}
- {{ ...繼續列出... }}
- **總計：X%**

**關鍵行為證據（依重要性排序）：**
1. {{ 最強成交信號（時間戳與具體行為）}}
2. {{ 次強成交信號（時間戳與具體行為）}}
3. {{ 第三信號或潛在阻力（時間戳，若有）}}

**建議成交時機與方式：**
- 最佳時機：{{ 下次課程開始時/本次課程結束前/Line追蹤的第X天 }}
- 推薦話術版本：{{ 版本A/B/C，說明原因 }}
- 注意事項：{{ 需要特別注意或避免的點 }}

---

## 寫作原則（嚴格遵守）

1. **主動推斷，減少「需補問」**
   - 從行為線索推斷資訊（例如：特地跑KTV = 動機強 + 環境限制）
   - 只有真正無法推斷的才寫「需補問」

2. **時間戳必須精準**
   - 每個證據、痛點、話術引用都要附時間戳（格式：14:12:34）
   - 評分標準的證據要列出「所有」相關時機，不只是一個

3. **評分要嚴謹且有理**
   - 嚴格依照評分標準給分，不可模糊
   - 成交機率要逐項計算，展示計算過程

4. **話術要高度個人化**
   - 三個版本必須針對「不同學員類型」，不可重複內容
   - 開頭必須引用該學員的獨特情境（不是泛泛的痛點）
   - 結尾Double Bind要結合該學員已展現的行為
   - 每段字數落在 360-420 字，至少 12 句

5. **痛點要多層次且完整**
   - 至少列出 4-6 個痛點，涵蓋技術/環境/心理/學習層
   - 不要只列表面問題，要挖掘深層障礙

6. **格式與順序**
   - 保留所有 emoji、標題與段落順序
   - 每個版本需嵌入貝特森提問或 NLP 技巧
   - 感官畫面用【視覺】、【聽覺】、【動覺】標籤
   - 雙重束縛格式：「- 選擇 A：...」「- 選擇 B：...」

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
    openaiClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1'  // Explicitly set to prevent environment variable conflicts
    });
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
**課程主題**: ${classTopic || '一對一教學課程'}

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
