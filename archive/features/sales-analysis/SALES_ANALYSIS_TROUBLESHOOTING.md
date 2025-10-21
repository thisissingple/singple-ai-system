# 🔍 銷售分析顯示問題排查指南

> **問題**: 前端沒有顯示 GPT 輸出的完整銷售分析內容
> **時間**: 2025-10-14

---

## ✅ 已確認正常的部分

### 1. 資料庫數據 ✅
資料庫裡有完整的銷售分析內容（徐承靖的記錄）：

```
🎯 學員狀況分析:
  1. 技術面問題（3 項，每項都是完整句子）
  2. 心理面問題（2 項，每項都是完整句子）
  3. 動機來源（完整段落）
  4. 學員屬性（完整段落）

🧠 成交策略:
  1. 痛點放大（150+ 字完整話術）
  2. 夢想畫面（150+ 字完整話術）
  3. 產品匹配（100+ 字說明）
  4. 話術設計（4 個完整話術，每個 50+ 字）
  5. 成交收斂（80+ 字話術）

✨ 完整成交話術（200+ 字）
```

### 2. 類型定義 ✅
- Frontend: `ConversionSuggestion` (單一物件)
- Backend: `ConversionSuggestion` (單一物件)
- 已修正之前的陣列問題

### 3. API 端點 ✅
- `/api/teaching-quality/analyses/:id` 會正確解析 JSONB
- 權限檢查正常
- 返回結構正確

### 4. 前端組件 ✅
- `SalesAnalysisSection` 組件已創建
- 所有欄位都有正確的 mapping
- 視覺設計完整（顏色、卡片、邊框）

---

## 🔍 需要診斷的問題

### 可能原因 1：API 沒有返回數據
**測試方法**：
打開瀏覽器開發者工具（F12），在 Console 執行：

```javascript
fetch('/api/teaching-quality/analyses/f844c6cd-21fd-49b3-8f59-0d408f114f8c')
  .then(r => r.json())
  .then(data => {
    console.log('=== API Response ===');
    console.log('Has conversion_suggestions:', !!data.data.conversion_suggestions);
    console.log('Is object:', typeof data.data.conversion_suggestions === 'object');
    console.log('Is array:', Array.isArray(data.data.conversion_suggestions));
    console.log('Has studentAnalysis:', !!data.data.conversion_suggestions?.studentAnalysis);
    console.log('\nFull data:', data.data.conversion_suggestions);
  });
```

**預期結果**：
```
Has conversion_suggestions: true
Is object: true
Is array: false
Has studentAnalysis: true
Full data: {studentAnalysis: {...}, salesStrategy: {...}, ...}
```

**如果不符合預期**：API 有問題，需要檢查後端。

---

### 可能原因 2：前端條件判斷過濾掉了
**檢查點**：
前端有這些條件（client/src/pages/teaching-quality/teaching-quality-detail.tsx:267-271）：

```typescript
{analysis.conversion_status === 'not_converted' &&
 analysis.conversion_suggestions &&
 typeof analysis.conversion_suggestions === 'object' &&
 !Array.isArray(analysis.conversion_suggestions) &&
 analysis.conversion_suggestions.studentAnalysis && (
  <div id="section-sales-analysis">...</div>
)}
```

**測試方法**：
在 Console 執行：

```javascript
// 假設你已經在詳情頁面
console.log('conversion_status:', analysis.conversion_status);
console.log('Has conversion_suggestions:', !!analysis.conversion_suggestions);
console.log('typeof:', typeof analysis.conversion_suggestions);
console.log('Is array:', Array.isArray(analysis.conversion_suggestions));
console.log('Has studentAnalysis:', !!analysis.conversion_suggestions?.studentAnalysis);
```

**如果任何一個是 false**：條件沒通過，區塊不會顯示。

---

### 可能原因 3：看錯記錄了
**檢查點**：
- 是否點擊的是「徐承靖」這筆記錄？
- 其他記錄可能還沒有重新分析，所以沒有銷售分析數據

**確認方法**：
1. 回到列表頁 `/teaching-quality`
2. 找到「徐承靖」這筆記錄
3. 確認它的狀態是「未轉單」（not_converted）
4. 點擊進入詳情

---

### 可能原因 4：快速導航沒有「銷售分析」按鈕
**如果看不到這個按鈕**：說明條件判斷沒通過，區塊沒有渲染。

**應該看到的導航**（在頁面頂部的 Sticky 導航欄）：
```
快速導航： [課程摘要] [🎯 銷售分析（重點）] [優缺點分析] [改進建議] [完整逐字稿]
```

---

## 🛠️ 快速修復步驟

### 步驟 1：確認記錄狀態
```bash
npx tsx scripts/check-conversion-suggestions.ts
```

應該看到：
```
✅ Found record: 徐承靖
Has studentAnalysis: true
Has salesStrategy: true
Has finalClosingScript: true
Has conversionProbability: true
```

### 步驟 2：重新啟動開發伺服器
```bash
# 清理舊進程
npm run dev:clean

# 或手動
pkill -f tsx
npm run dev
```

### 步驟 3：清除瀏覽器緩存
1. 打開開發者工具（F12）
2. 右鍵點擊刷新按鈕
3. 選擇「清除緩存並硬性重新載入」

### 步驟 4：訪問詳情頁
```
http://localhost:5000/teaching-quality
```
點擊「徐承靖」記錄

---

## 📊 預期顯示效果

### 應該看到的完整內容：

#### 1. 快速導航（頂部 Sticky）
```
快速導航： [課程摘要] [🎯 銷售分析（重點）] [優缺點分析] ...
```

#### 2. 銷售分析區塊（綠色大標題）
```
🎯 銷售分析報告              [轉換機率：75%]
```

#### 3. 學員狀況分析（藍色卡片）
```
🎯 學員狀況分析
深入了解學員的痛點、心理狀態與動機

🎤 1. 技術面問題（歌唱上的具體痛點）
  • 目前在切換真假音時會有困難，尤其是高音後假音突然不見。
  • 聲音上容易緊繃，影響音質和喉嚨健康。
  • 共鳴技巧不足，無法輕鬆切換到柔和聲音。

🧠 2. 心理面問題（自信、比較、尷尬等）
  • 對於投入高額學費學習有猶豫，擔心效果不如預期。
  • 在學習過程中容易因為不確定性而感到焦慮。

🎯 3. 動機來源（為什麼現在想學、觸發點）
  希望能自在地唱林俊傑、周杰倫的歌曲，並在KTV中表現自如。

👤 4. 學員屬性（年齡/付費能力/價格敏感度）
  年齡層推估為青年，具備一定的付費能力，但對於高額課程有較高價格敏感度。
```

#### 4. 成交策略（綠色卡片）
```
🧠 成交策略
可直接複製使用的銷售話術與策略

⚠️ 1. 痛點放大
"學習唱歌的過程中，遇到困難是常有的事，尤其是像您這樣已經有一定基礎的學員。您提到切換真假音的困難和聲音緊繃的問題，這在缺乏正確技巧指導下是非常正常的。想像一下，如果每次唱歌都能輕鬆切換音域，不再感到緊繃，這會讓您的演唱更加自信和自在。"

💭 2. 夢想畫面
"想像一下，當您下次在KTV中唱起林俊傑或周杰倫的歌，您的朋友們都被您的演唱驚豔，讚嘆您的聲音變得如此柔和且有層次。每一次的高音都如行雲流水般自然，這樣的成就感將讓您對唱歌更加熱愛。"

📦 3. 產品匹配
推薦課程：軌道系統。理由：此系統專門針對改善真假音切換問題及減少聲音緊繃，能有效提升您的演唱表現，適合您的需求。

💬 4. 話術設計
[話術 1] 【痛點放大】『切換真假音的困難其實很多人都有，只要掌握對的方法，您就能輕鬆自如地演唱。』
[話術 2] 【夢想畫面】『想像在聚會上，您輕鬆唱出林俊傑的歌曲，朋友們都驚訝於您的進步，這種成就感是不是很棒呢？』
[話術 3] 【價值塑造】『我們的課程設計不僅是為了讓您學習技巧，更是幫助您真正掌握並運用，讓您在任何場合都能自信演唱。』
[話術 4] 【價格接受度引導】『我們的分期付款計劃讓您每月只需付出小額支出，壓力小但效果顯著。』

✅ 5. 成交收斂
"『我們可以先從軌道系統開始，這能幫您快速解決目前的困擾，並且我們提供靈活的付款選項，讓您無負擔學習。』"
```

#### 5. 完整成交話術（綠藍漸變卡片，4px 粗邊框）
```
✨ 完整成交話術（直接複製使用）
整合所有元素的完整話術 • 可直接在通話中使用

『承靖，我知道您對唱歌的熱愛以及對提升自我的渴望。切換真假音和聲音緊繃這些問題，很多像您一樣的學員都遇到過，但只要有正確的指導，這些都可以輕鬆克服。我們的軌道系統課程專為解決這類問題設計，讓您能夠在KTV中自信演唱您喜愛的歌曲。每月的小額分期付款，讓您在學習的同時不必承受過大的經濟壓力。我相信，通過這個課程，您將能夠達成想要的進步與成就。』

💡 提示：這段話術可以直接複製貼上，或根據實際對話調整用詞    [📋 複製話術]
```

---

## 🐛 如果還是看不到

### Debug 步驟：

1. **檢查 React 組件是否渲染**
   打開 React DevTools，找到 `TeachingQualityDetail` 組件，查看 props：
   ```
   analysis.conversion_status = "not_converted"
   analysis.conversion_suggestions = {...}
   ```

2. **檢查 Console 是否有錯誤**
   - TypeScript 錯誤？
   - API 錯誤？
   - 組件渲染錯誤？

3. **手動觸發重新分析**（如果上面都沒問題）
   ```bash
   # 只分析一筆記錄（徐承靖）
   cat << 'EOF' | npx tsx
   import { queryDatabase } from './server/services/pg-client';
   import { analyzeTeachingQuality } from './server/services/teaching-quality-gpt-service';

   (async () => {
     const result = await queryDatabase(
       'SELECT * FROM teaching_quality_analysis WHERE student_name = $1 LIMIT 1',
       ['徐承靖']
     );

     if (result.rows.length > 0) {
       const record = result.rows[0];
       console.log('Re-analyzing...', record.student_name);

       const analysis = await analyzeTeachingQuality(
         record.transcript_text,
         record.student_name,
         record.teacher_name,
         record.class_topic
       );

       await queryDatabase(
         'UPDATE teaching_quality_analysis SET conversion_suggestions = $1 WHERE id = $2',
         [JSON.stringify(analysis.conversionSuggestions), record.id]
       );

       console.log('✅ Done! Refresh the page.');
     }
   })();
   EOF
   ```

---

## 📸 截圖請求

如果可以的話，請提供：

1. **教學品質列表頁截圖** - 顯示「徐承靖」記錄
2. **詳情頁截圖** - 打開徐承靖的詳情
3. **開發者工具 Console 截圖** - 執行上面的 API 測試
4. **開發者工具 Network 截圖** - 查看 API 請求

這樣我才能精確診斷問題所在。

---

## 📞 聯絡資訊

如果需要進一步協助，請提供：
- 看到了什麼（或沒看到什麼）
- Console 有沒有錯誤訊息
- Network tab 的 API response

---

**最後更新**: 2025-10-14
**狀態**: 待診斷
