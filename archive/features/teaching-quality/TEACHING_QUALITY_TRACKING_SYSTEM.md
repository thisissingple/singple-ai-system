# 教學品質追蹤系統 - 完整設計方案 🎓

## 🎯 核心需求

### 1. 技術要求
- ✅ 使用 **OpenAI GPTs**（已有現成的 GPT）
- ✅ 獨立新頁面（不在報表中）
- ✅ 權限控制（Vicky 只能看自己的）

### 2. 功能要求
- ✅ **本次上課分析**：評分 + 優缺點
- ✅ **下次上課建議**：具體可執行的改進方向
- ✅ **建議執行追蹤**：下次上課檢查是否執行建議
- ✅ **結果對比分析**：
  - 執行了嗎？
  - 沒執行為什麼？
  - 執行了但未成交，還能往哪優化？
- ✅ **持續改進循環**：形成 PDCA 循環

---

## 📊 系統架構設計

### 頁面結構

```
/teaching-quality  (新頁面)
├── 我的上課記錄列表
│   ├── 篩選器（日期、學生、狀態）
│   └── 上課卡片列表
│
├── 單次上課詳細分析（點擊卡片進入）
│   ├── 本次上課分析
│   ├── AI 建議（下次上課怎麼做）
│   ├── 學生狀態追蹤
│   └── 歷史對比
│
└── 我的教學統計
    ├── 平均評分趨勢
    ├── 常見問題分析
    └── 改進建議完成率
```

---

## 🎨 UI/UX 設計

### 1. 主頁面 - 上課記錄列表

```
┌─────────────────────────────────────────────────────────┐
│  🎓 我的教學品質追蹤                    [篩選] [統計圖表] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📅 2025-10-12  |  張三  |  體驗課第 1 堂              │
│  ┌────────────────────────────────────────────────┐    │
│  │  ⭐ 本次評分：8.5/10                            │    │
│  │  📊 狀態：✅ 已分析  |  ⏳ 待追蹤               │    │
│  │  💡 建議：3 項  |  ✅ 已執行：0 項              │    │
│  │  👤 學生狀態：體驗中（剩 7 堂）                │    │
│  │                                                │    │
│  │  [查看完整分析] [查看下次建議] [記錄執行結果]  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  📅 2025-10-10  |  李四  |  體驗課第 3 堂              │
│  ┌────────────────────────────────────────────────┐    │
│  │  ⭐ 本次評分：7.2/10                            │    │
│  │  📊 狀態：✅ 已分析  |  ✅ 已追蹤  |  📈 有改善  │    │
│  │  💡 上次建議：3 項  |  ✅ 已執行：2 項          │    │
│  │  👤 學生狀態：未轉高（已完課 3 天）            │    │
│  │                                                │    │
│  │  [查看對比分析] [查看轉換建議]                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 2. 單次上課詳細分析頁面

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回列表        張三 - 2025-10-12 體驗課分析         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 【本次上課分析】                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  整體評分：⭐⭐⭐⭐⭐ 8.5/10                     │    │
│  │                                                │    │
│  │  ✅ 表現良好（3 項）                            │    │
│  │  • 主動提問，課堂參與度高                      │    │
│  │  • 發音準確，語調自然                          │    │
│  │  • 能夠運用課堂所學進行對話                    │    │
│  │                                                │    │
│  │  ⚠️ 需要改進（2 項）                            │    │
│  │  • 部分語法錯誤（時態混淆）                    │    │
│  │  • 詞彙量有限，表達受限                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  💡 【下次上課建議】 - AI 生成                           │
│  ┌────────────────────────────────────────────────┐    │
│  │  建議 1：加強時態練習                          │    │
│  │  ├─ 具體做法：準備 5 個過去式情境對話          │    │
│  │  ├─ 預期效果：減少時態錯誤 50%                 │    │
│  │  ├─ 執行狀態：⏳ 待執行                         │    │
│  │  └─ [標記為已執行] [記錄執行結果]              │    │
│  │                                                │    │
│  │  建議 2：擴充生活詞彙                          │    │
│  │  ├─ 具體做法：使用圖片卡片教學 20 個新單字    │    │
│  │  ├─ 預期效果：表達更流暢                       │    │
│  │  ├─ 執行狀態：⏳ 待執行                         │    │
│  │  └─ [標記為已執行] [記錄執行結果]              │    │
│  │                                                │    │
│  │  建議 3：鼓勵學習態度                          │    │
│  │  ├─ 具體做法：課後給予正面回饋和鼓勵          │    │
│  │  ├─ 預期效果：維持高參與度                     │    │
│  │  ├─ 執行狀態：⏳ 待執行                         │    │
│  │  └─ [標記為已執行] [記錄執行結果]              │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  👤 【學生當前狀態】                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  體驗課進度：已上 1/8 堂（剩餘 7 堂）          │    │
│  │  購買日期：2025-10-05（7 天內，高優先）       │    │
│  │  轉換狀態：體驗中                              │    │
│  │  預估轉換率：75%（基於當前表現）               │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  [生成轉換話術建議]  [查看學生完整檔案]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 3. 建議執行追蹤頁面（下次上課後）

```
┌─────────────────────────────────────────────────────────┐
│  張三 - 2025-10-15 體驗課第 2 堂 - 建議執行對比         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 【本次上課分析】                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  整體評分：⭐⭐⭐⭐⭐⭐ 9.0/10  📈 提升 0.5 分   │    │
│  │                                                │    │
│  │  ✅ 新的進步                                    │    │
│  │  • 時態錯誤明顯減少（↓60%）                    │    │
│  │  • 詞彙運用更豐富                              │    │
│  │                                                │    │
│  │  ⚠️ 仍需改進                                    │    │
│  │  • 句型結構較簡單                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  🔄 【上次建議執行對比】 - AI 自動分析                   │
│  ┌────────────────────────────────────────────────┐    │
│  │  建議 1：加強時態練習                          │    │
│  │  ├─ 執行狀態：✅ 已執行                         │    │
│  │  ├─ 執行方式：使用情境對話練習（教師記錄）    │    │
│  │  ├─ AI 分析結果：                              │    │
│  │  │   ✅ 從對話記錄看出時態錯誤從 8 次降到 3 次  │    │
│  │  │   ✅ 學生在使用過去式時更有信心             │    │
│  │  │   📈 建議執行效果：優秀（改善 60%）          │    │
│  │  └─ 下次建議：持續鞏固，增加複雜時態          │    │
│  │                                                │    │
│  │  建議 2：擴充生活詞彙                          │    │
│  │  ├─ 執行狀態：✅ 部分執行                       │    │
│  │  ├─ 執行方式：教了 12 個新單字（目標 20 個）  │    │
│  │  ├─ AI 分析結果：                              │    │
│  │  │   ✅ 對話中使用了 8 個新單字                │    │
│  │  │   ⚠️ 部分單字使用不太準確                   │    │
│  │  │   📊 建議執行效果：良好（改善 40%）          │    │
│  │  └─ 下次建議：複習這 12 個單字，再增加 8 個   │    │
│  │                                                │    │
│  │  建議 3：鼓勵學習態度                          │    │
│  │  ├─ 執行狀態：✅ 已執行                         │    │
│  │  ├─ AI 分析結果：                              │    │
│  │  │   ✅ 學生主動提問次數增加（5→8 次）         │    │
│  │  │   ✅ 課堂氣氛更活躍                         │    │
│  │  │   📈 建議執行效果：優秀                      │    │
│  │  └─ 下次建議：繼續保持                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  🎯 【轉換優化建議】 - 學生仍未成交                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  AI 分析：張三學習表現優秀，進步明顯，但尚未  │    │
│  │  轉高階課程。可能原因和優化方向：              │    │
│  │                                                │    │
│  │  💰 可能原因 1：價格考量                       │    │
│  │  └─ 優化方向：                                │    │
│  │     • 強調學習成效（展示本次進步）            │    │
│  │     • 提供分期付款方案                        │    │
│  │     • 限時優惠促銷                            │    │
│  │                                                │    │
│  │  ⏰ 可能原因 2：時間安排                       │    │
│  │  └─ 優化方向：                                │    │
│  │     • 詢問理想上課時間                        │    │
│  │     • 提供彈性排課選項                        │    │
│  │                                                │    │
│  │  🎯 可能原因 3：尚未感受急迫性                 │    │
│  │  └─ 優化方向：                                │    │
│  │     • 設定學習目標（如：3 個月後出國）        │    │
│  │     • 展示其他學員成功案例                    │    │
│  │                                                │    │
│  │  [生成轉換話術]  [記錄跟進結果]                │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  💡 【新的下次上課建議】                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │  建議 1：加強複雜句型練習                      │    │
│  │  建議 2：複習並鞏固新詞彙                      │    │
│  │  建議 3：設定短期學習目標，增強動機            │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ 資料庫設計

### 1. 新增教學品質分析表

```sql
-- Migration 027: Teaching quality tracking system

-- 主表：上課分析記錄
CREATE TABLE teaching_quality_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  attendance_id UUID NOT NULL REFERENCES trial_class_attendance(id),
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  class_date DATE NOT NULL,
  class_number INTEGER, -- 第幾堂課

  -- AI 分析結果（本次上課）
  current_analysis JSONB NOT NULL, -- 見下方結構

  -- 上次的建議（如果有）
  previous_suggestions JSONB, -- 見下方結構

  -- 建議執行追蹤
  suggestions_tracking JSONB, -- 見下方結構

  -- 學生狀態
  student_status JSONB, -- 見下方結構

  -- AI 模型資訊
  openai_model TEXT DEFAULT 'gpt-4-turbo-preview',
  gpt_id TEXT, -- 你的 GPT ID

  -- 時間戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_teaching_quality_teacher ON teaching_quality_analysis(teacher_name);
CREATE INDEX idx_teaching_quality_student ON teaching_quality_analysis(student_email);
CREATE INDEX idx_teaching_quality_date ON teaching_quality_analysis(class_date);
CREATE INDEX idx_teaching_quality_attendance ON teaching_quality_analysis(attendance_id);

-- 教師建議執行記錄表（追蹤教師是否執行了建議）
CREATE TABLE suggestion_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES teaching_quality_analysis(id),
  suggestion_id TEXT NOT NULL, -- 建議的唯一標識

  -- 執行狀態
  executed BOOLEAN DEFAULT FALSE,
  execution_date DATE,
  execution_note TEXT, -- 教師記錄執行方式

  -- AI 評估結果（下次上課後）
  effectiveness_score NUMERIC(3,1), -- 1-10 分
  effectiveness_note TEXT, -- AI 分析的效果說明

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suggestion_execution_analysis ON suggestion_execution_log(analysis_id);
```

### 2. JSONB 資料結構

#### current_analysis（本次上課分析）
```json
{
  "overall_score": 8.5,
  "strengths": [
    { "id": "s1", "description": "主動提問，課堂參與度高", "evidence": "對話中提問 8 次" },
    { "id": "s2", "description": "發音準確，語調自然", "evidence": "無明顯發音錯誤" }
  ],
  "weaknesses": [
    { "id": "w1", "description": "時態混淆", "evidence": "8 處時態錯誤", "severity": "medium" },
    { "id": "w2", "description": "詞彙量有限", "evidence": "重複使用基礎詞彙", "severity": "low" }
  ],
  "key_moments": [
    { "timestamp": "00:15:30", "description": "學生成功運用新學詞彙" },
    { "timestamp": "00:22:15", "description": "時態錯誤導致表達困難" }
  ],
  "summary": "學生積極主動，但語法基礎需加強"
}
```

#### previous_suggestions（給教師的下次上課建議）
```json
{
  "suggestions": [
    {
      "id": "sg1",
      "category": "grammar",
      "title": "加強時態練習",
      "specific_actions": [
        "準備 5 個過去式情境對話",
        "使用時間軸視覺輔助",
        "糾正時立即解釋原因"
      ],
      "expected_outcome": "減少時態錯誤 50%",
      "priority": "high",
      "estimated_time": "15 分鐘"
    },
    {
      "id": "sg2",
      "category": "vocabulary",
      "title": "擴充生活詞彙",
      "specific_actions": [
        "使用圖片卡片教學 20 個新單字",
        "讓學生用新單字造句",
        "課後發送單字表和例句"
      ],
      "expected_outcome": "表達更流暢",
      "priority": "medium",
      "estimated_time": "10 分鐘"
    }
  ],
  "conversion_tips": {
    "student_conversion_probability": 0.75,
    "key_selling_points": ["進步明顯", "學習態度好"],
    "suggested_timing": "完成 4 堂課後",
    "suggested_approach": "展示學習成效，提供短期優惠"
  }
}
```

#### suggestions_tracking（建議執行追蹤）
```json
{
  "tracked_suggestions": [
    {
      "suggestion_id": "sg1",
      "from_previous_class_date": "2025-10-12",
      "executed": true,
      "execution_details": {
        "date": "2025-10-15",
        "how_executed": "使用情境對話練習，共做了 6 個場景",
        "time_spent": "18 分鐘",
        "teacher_note": "學生反應很好"
      },
      "ai_effectiveness_analysis": {
        "score": 9.0,
        "outcome_achieved": true,
        "evidence": [
          "時態錯誤從 8 次降到 3 次（↓62.5%）",
          "學生在使用過去式時更有信心",
          "主動糾正自己的時態錯誤 2 次"
        ],
        "comparison": {
          "before": "8 處時態錯誤",
          "after": "3 處時態錯誤",
          "improvement": "62.5%"
        },
        "next_step": "持續鞏固，增加現在完成式練習"
      }
    },
    {
      "suggestion_id": "sg2",
      "executed": "partial",
      "execution_details": {
        "date": "2025-10-15",
        "how_executed": "教了 12 個新單字（目標 20 個）",
        "why_partial": "時間不夠",
        "teacher_note": "學生吸收良好"
      },
      "ai_effectiveness_analysis": {
        "score": 7.0,
        "outcome_achieved": "partial",
        "evidence": [
          "對話中使用了 8 個新單字",
          "部分單字使用不太準確",
          "詞彙豐富度提升 40%"
        ],
        "next_step": "複習這 12 個單字，確保掌握後再增加"
      }
    }
  ],
  "overall_execution_rate": 0.75,
  "overall_effectiveness_score": 8.0
}
```

#### student_status（學生當前狀態）
```json
{
  "trial_progress": {
    "completed_classes": 2,
    "total_classes": 8,
    "remaining_classes": 6
  },
  "purchase_info": {
    "purchase_date": "2025-10-05",
    "days_since_purchase": 10,
    "priority": "high"
  },
  "conversion_status": {
    "status": "體驗中",
    "converted": false,
    "predicted_conversion_probability": 0.80,
    "factors": {
      "positive": ["進步明顯", "參與度高", "學習態度好"],
      "concerns": ["價格敏感", "時間安排"]
    }
  },
  "performance_trend": {
    "scores": [8.5, 9.0],
    "trend": "improving",
    "average_score": 8.75
  }
}
```

---

## 🔌 OpenAI GPTs 整合

### 1. API 呼叫方式

```typescript
// server/services/teaching-quality-gpt-service.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class TeachingQualityGPTService {
  private gptId: string; // 你的 GPT ID

  constructor() {
    this.gptId = process.env.TEACHING_QUALITY_GPT_ID || 'your-gpt-id';
  }

  /**
   * 分析單次上課
   */
  async analyzeClass(params: {
    transcript: string;
    studentName: string;
    teacherName: string;
    classDate: string;
    classNumber: number;
    previousAnalysis?: any; // 上次的分析（如果有）
  }) {
    const prompt = this.buildAnalysisPrompt(params);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // 或使用你的 GPT
      messages: [
        {
          role: 'system',
          content: '你是專業的英語教學品質分析專家...'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * 追蹤建議執行效果
   */
  async trackSuggestionEffectiveness(params: {
    currentTranscript: string;
    previousAnalysis: any;
    previousSuggestions: any;
    executionLog: any; // 教師記錄的執行情況
  }) {
    const prompt = this.buildTrackingPrompt(params);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: '你是專業的教學改進效果評估專家...'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * 生成轉換優化建議（學生未成交時）
   */
  async generateConversionSuggestions(params: {
    studentHistory: any[]; // 所有上課記錄
    currentStatus: any; // 當前狀態
  }) {
    const prompt = this.buildConversionPrompt(params);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: '你是專業的教育銷售顧問...'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private buildAnalysisPrompt(params: any): string {
    return `
分析以下體驗課的教學品質...
（詳細 prompt 設計）
    `;
  }

  private buildTrackingPrompt(params: any): string {
    return `
對比上次和本次的上課記錄，評估教師建議的執行效果...
（詳細 prompt 設計）
    `;
  }

  private buildConversionPrompt(params: any): string {
    return `
分析學生的學習歷程，提供轉換優化建議...
（詳細 prompt 設計）
    `;
  }
}
```

### 2. 如果使用你的自訂 GPT

```typescript
// 使用 Assistants API
async analyzeClassWithCustomGPT(params: any) {
  // 1. 創建 Thread
  const thread = await openai.beta.threads.create();

  // 2. 添加訊息
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: this.buildAnalysisPrompt(params),
  });

  // 3. 執行你的 GPT
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: this.gptId, // 你的 GPT ID
  });

  // 4. 等待完成
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (runStatus.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  // 5. 取得回覆
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data[0];

  return JSON.parse(lastMessage.content[0].text.value);
}
```

---

## 🚀 API 設計

```typescript
// 1. 生成上課分析
POST /api/teaching-quality/analyze
Body: {
  attendanceId: string;
}
Response: {
  success: true,
  data: {
    id: string,
    current_analysis: {...},
    suggestions: {...},
    student_status: {...}
  }
}

// 2. 獲取教師的上課列表
GET /api/teaching-quality/my-classes
Query: {
  startDate?: string,
  endDate?: string,
  studentName?: string,
  status?: 'analyzed' | 'tracked' | 'all'
}
Response: {
  success: true,
  data: [
    {
      id: string,
      class_date: string,
      student_name: string,
      current_analysis: {...},
      has_previous_suggestions: boolean,
      suggestions_executed: number,
      suggestions_total: number,
      student_converted: boolean
    }
  ]
}

// 3. 獲取單次上課詳細分析
GET /api/teaching-quality/:id
Response: {
  success: true,
  data: {
    // 完整的分析資料
  }
}

// 4. 標記建議為已執行
POST /api/teaching-quality/:id/mark-suggestion-executed
Body: {
  suggestionId: string,
  executionNote: string, // 教師記錄執行方式
  executionDate: string
}

// 5. 生成建議執行追蹤分析（下次上課後）
POST /api/teaching-quality/:id/track-suggestions
Body: {
  currentAttendanceId: string // 本次上課的 attendance ID
}
Response: {
  success: true,
  data: {
    suggestions_tracking: {...},
    new_suggestions: {...}
  }
}

// 6. 生成轉換優化建議
POST /api/teaching-quality/:studentEmail/conversion-suggestions
Response: {
  success: true,
  data: {
    possible_reasons: [...],
    optimization_directions: [...],
    suggested_script: "轉換話術..."
  }
}

// 7. 獲取教師統計
GET /api/teaching-quality/my-stats
Response: {
  success: true,
  data: {
    average_score: 8.3,
    score_trend: [8.0, 8.2, 8.5, 8.3],
    suggestion_execution_rate: 0.85,
    student_conversion_rate: 0.45,
    common_issues: [
      { issue: "時態混淆", frequency: 15 },
      { issue: "詞彙量有限", frequency: 12 }
    ]
  }
}
```

---

## 🎨 前端實作

### 1. 路由設計

```typescript
// client/src/App.tsx
{
  path: '/teaching-quality',
  element: <TeachingQualityLayout />,
  children: [
    {
      index: true,
      element: <TeachingQualityList /> // 上課列表
    },
    {
      path: ':analysisId',
      element: <TeachingQualityDetail /> // 單次分析詳情
    },
    {
      path: 'stats',
      element: <TeachingQualityStats /> // 我的統計
    }
  ]
}
```

### 2. 核心組件

```typescript
// client/src/pages/teaching-quality/teaching-quality-list.tsx
export function TeachingQualityList() {
  const { data: classes, isLoading } = useQuery({
    queryKey: ['teaching-quality', 'my-classes'],
    queryFn: () => fetch('/api/teaching-quality/my-classes').then(r => r.json())
  });

  return (
    <div>
      <h1>我的教學品質追蹤</h1>
      {classes?.map(classItem => (
        <ClassCard
          key={classItem.id}
          data={classItem}
          onAnalyze={() => analyzeClass(classItem.attendance_id)}
          onTrack={() => trackSuggestions(classItem.id)}
        />
      ))}
    </div>
  );
}

// client/src/pages/teaching-quality/teaching-quality-detail.tsx
export function TeachingQualityDetail() {
  const { analysisId } = useParams();
  const { data: analysis } = useQuery({
    queryKey: ['teaching-quality', analysisId],
    queryFn: () => fetch(`/api/teaching-quality/${analysisId}`).then(r => r.json())
  });

  return (
    <div>
      {/* 本次上課分析 */}
      <CurrentAnalysisSection data={analysis.current_analysis} />

      {/* 下次上課建議 */}
      <SuggestionsSection
        suggestions={analysis.previous_suggestions}
        onMarkExecuted={(suggestionId, note) => {
          markSuggestionExecuted(analysisId, suggestionId, note);
        }}
      />

      {/* 建議執行追蹤（如果有） */}
      {analysis.suggestions_tracking && (
        <SuggestionsTrackingSection data={analysis.suggestions_tracking} />
      )}

      {/* 學生狀態 */}
      <StudentStatusSection data={analysis.student_status} />

      {/* 轉換優化建議（如果未成交） */}
      {!analysis.student_status.conversion_status.converted && (
        <ConversionSuggestionsSection studentEmail={analysis.student_email} />
      )}
    </div>
  );
}
```

---

## 🔐 權限控制

### 1. 資料庫層級

```typescript
// server/middleware/teaching-quality-auth.ts

export function requireTeachingQualityAccess(req, res, next) {
  const user = req.session.user;

  // 管理員可以看所有
  if (user.role === 'admin') {
    return next();
  }

  // 教師只能看自己的
  if (user.role === 'teacher') {
    req.teacherFilter = { teacher_name: user.name };
    return next();
  }

  return res.status(403).json({ error: '無權限訪問' });
}
```

### 2. API 層級

```typescript
// server/routes.ts

app.get('/api/teaching-quality/my-classes',
  isAuthenticated,
  requireTeachingQualityAccess,
  async (req, res) => {
    const { teacher_name } = req.teacherFilter || {};

    let query = 'SELECT * FROM teaching_quality_analysis';
    const params = [];

    if (teacher_name) {
      query += ' WHERE teacher_name = $1';
      params.push(teacher_name);
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  }
);
```

### 3. 前端層級

```typescript
// client/src/pages/teaching-quality/teaching-quality-list.tsx

const currentUser = useAuth(); // 從 context 取得當前用戶

// 只顯示當前教師可以看的資料
const { data: classes } = useQuery({
  queryKey: ['teaching-quality', 'my-classes', currentUser.name],
  queryFn: () => fetch('/api/teaching-quality/my-classes').then(r => r.json())
});
```

---

## 📊 實作優先級

### Phase 1：基礎分析功能（Week 1-2）⭐ 最重要

1. ✅ 資料庫設計和遷移
2. ✅ OpenAI GPT 服務整合
3. ✅ 單次上課分析 API
4. ✅ 基礎前端頁面（列表 + 詳情）
5. ✅ 權限控制

### Phase 2：建議追蹤功能（Week 3-4）

1. ✅ 建議執行標記功能
2. ✅ AI 建議追蹤分析
3. ✅ 對比顯示 UI
4. ✅ 效果評估

### Phase 3：轉換優化功能（Week 5-6）

1. ✅ 轉換狀態分析
2. ✅ 優化建議生成
3. ✅ 話術生成
4. ✅ 跟進記錄

### Phase 4：統計和優化（Week 7+）

1. ⏳ 教師統計面板
2. ⏳ 趨勢分析
3. ⏳ 批次處理
4. ⏳ 匯出報表

---

## 💰 成本估算

### OpenAI API 成本

**假設使用 GPT-4 Turbo**：
- Input: $10 / 1M tokens
- Output: $30 / 1M tokens

**單次分析成本**：
- Transcript (input): ~10,000 tokens = $0.10
- Analysis (output): ~1,000 tokens = $0.03
- **總計: ~$0.13 / 次**

**每月成本**：
- 100 堂課 × $0.13 = $13/月
- 500 堂課 × $0.13 = $65/月

**追蹤分析額外成本**：
- 每次追蹤 ~$0.15（需對比兩次對話）
- 100 次追蹤 = $15/月

**總預估**：每月 $30-80（取決於使用量）

---

## 🎯 關鍵決策問題

開始實作前需要確認：

1. **你的 GPT 設定**：
   - GPT ID 是什麼？
   - GPT 的 prompt 已經設定好了嗎？
   - 需要什麼格式的輸入？
   - 輸出格式是什麼？

2. **權限設計**：
   - ✅ Vicky 只能看自己的（已確認）
   - 管理員能看所有嗎？
   - 電話人員需要看嗎（用於跟進）？

3. **建議執行記錄方式**：
   - 教師手動標記「已執行」？
   - 還是 AI 自動從下次對話中推斷？
   - 還是兩者結合？

4. **分析時機**：
   - 上課後立即自動分析？
   - 還是教師手動觸發？
   - 還是每天批次處理？

---

## 💡 我的建議

**最小可行產品（MVP）**：
1. 先做 Phase 1（基礎分析）
2. 手動觸發分析（不做自動）
3. 教師手動標記建議執行
4. 簡化的對比分析

**驗證價值後再擴展**：
- 自動化流程
- 複雜的趨勢分析
- 批次處理

**先確認你的 GPT**：
- 給我看你的 GPT prompt
- 我可以幫你設計更好的整合方式
- 確保輸入輸出格式一致

---

準備好了嗎？給我你的 GPT 資訊，我們就可以開始實作了！🚀
