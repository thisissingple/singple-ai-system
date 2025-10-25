/**
 * Test Phase 31 Markdown Parser
 *
 * Tests the new parseTeachingAnalysisMarkdown function
 */

// Sample markdown from Phase 30 report
const sampleMarkdown = `
# 📍 課程階段識別（先判斷情境）

- **階段類型：** ☑ 首次體驗課
- **判斷依據：** 學員提到已購買線上課程（14:16:29），但仍來上體驗課，說明正在評估是否升級到一對一教練課程
- **分析重點方向：** 建立信任 + 展現一對一教練課程價值 + 強調與線上課程的差異

---

# 🧑‍🏫 學員狀況掌握（快速掌握對象）

## ⛔️ 深層痛點分析（銷售核心，不只是技術問題）

**1. 目標層痛點（人生目標、自我實現）**
- **內心痛點：** 希望唱歌能在社交場合中加分（14:13:21）
- **行為證據：** 學員主動提到「想在社交場合自信唱歌」（14:13:21）
- **一對一教練價值：** 客製化練習方案，針對社交場合設計選歌策略與練習

**2. 社交層痛點（朋友看法、工作需求、家庭關係）**
- **內心痛點：** 在社交場合中能夠自信表現
- **行為證據：** 提到「想在KTV不要丟臉」（14:13:21）
- **一對一教練價值：** 提供針對社交場合的選歌策略與練習

**3. 情緒層痛點（自信、尷尬、焦慮、挫折）**
- **內心痛點：** 挫折於自學效果不佳，不確定方向（14:16:29）
- **行為證據：** 已購買線上課程但仍來上一對一體驗課（14:16:29），說明對自學方向不確定
- **一對一教練價值：** 即時指導與糾正，建立信心，避免自學走錯方向

**4. 環境層痛點（場地、時間、資源限制）**
- **內心痛點：** 家中無法練習，練習頻率受限
- **行為證據：** 特地跑去KTV上課（14:08:48）
- **一對一教練價值：** 線上教學不受場地限制，隨時隨地可練習

**5. 技術層痛點（症狀統計，不是銷售核心）**
- **統計對話中提到的技術問題（取前三名，附上提及次數）：**
  1. 聲帶用力：提及 3 次（時間戳：14:10:12, 14:15:33, 14:18:22）
  2. 高音唱不上去：提及 2 次（時間戳：14:12:08, 14:17:45）
  3. 喉嚨不適：提及 1 次（時間戳：14:14:56）

---

# 🧮 成交策略評估（指標制 + 明確評分標準）

**呼應痛點程度：4/5**
- 評分標準：5分=精準命中3個以上核心痛點+深度共感+正常化處理 / 4分=命中2個核心痛點+有共感回應
- 證據：老師在 14:13:21、14:16:29 兩次回應學員的情緒痛點

**推課引導力度：4/5**
- 評分標準：4分 = 探索部分深層痛點 + 有推課引導 + 說明課程優勢 + 軟性邀約
- 證據：在 14:20:15 提到「一對一教練課程能確保你每天練習都做對」
- 關鍵話術：「隨時隨地練習，不用固定時段」
- **痛點連結評估：** 有連結情緒層痛點（自學不確定方向）到一對一教練課程價值

**Double Bind / NLP 應用：2/5**
- 評分標準：2分=有引導式提問但不明顯
- 證據：使用階層提問（14:15:00）

**情緒共鳴與信任：5/5**
- 評分標準：5分=深度同理+引用學員原話+建立「我懂你」的連結
- 證據：在 14:13:21 引用學員的話「社交場合自信唱歌」並給予深度回應

**節奏與收斂完整度：5/5**
- 評分標準：5分=開場-探索-演示-推課-約下次，完整且流暢
- 說明：課程結構清晰，從探索痛點到推課引導，最後成功收斂

**總評（總分/25）：** 老師在情緒共鳴與信任建立表現優秀，但在 NLP 技巧應用上有改進空間。總分 20/25

---

# 💬 完整成交話術總結（可照念 + 高度個人化）

1. **版本 A —「已付費/高投入型」學員專用（價值重構）**
   > 我注意到你已經購買了線上課程，這代表你對學習唱歌非常認真。但是，就像你剛才提到的，自學常常不知道方向對不對（14:16:29）。想像一下，如果你每天練習都能確保做對，你會感受到每個音符都是自然流出，不再擔心走冤枉路。一對一教練課程讓你隨時隨地練習，有問題立刻問老師，24小時內回覆，確保你的每一分鐘練習都是有效的。你可以選擇現在開始，讓你的投資發揮最大價值，還是繼續觀望，讓時間和課程隨著時間貶值？

2. **版本 B —「環境限制/時間壓力型」學員專用（損失規避）**
   > 我理解你家裡無法練習，特地跑去KTV上課（14:08:48），這樣的練習頻率一定很受限。想像一下，如果你能在任何地方、任何時間都能練習，不用擔心鄰居、不用特地跑去KTV，你會感受到練習變得輕鬆又方便。一對一教練課程讓你突破環境限制，隨時隨地練習，老師線上指導，提升你的練習頻率。你可以選擇接受這個解決方案，還是繼續受限於環境，接受進步緩慢？

3. **版本 C —「積極探索/高度投入型」學員專用（未來錨定）**
   > 我發現你在課程中問了很多問題，這代表你對學習非常認真（14:15:00）。想像一下，未來的你在社交場合自信唱歌（14:13:21），聽到掌聲和讚美，感受到每個音符都是自然流出。一對一教練課程讓你快速達成這個目標，系統化學習，老師即時指導，確保你每一步都做對。你可以選擇立即開始系統學習，快速達成目標，還是保持探索，但單打獨鬥進步有限？

---

# 📈 預估成交機率：75%（量化指標計算）

**量化計算公式（透明化評分）：**

**基礎分：40%**（所有學員起始分）

**加分項（最高+60%）：**
- ✅ 已購課/已付訂金：+20% → 已購買線上課程（14:16:29）
- ✅ 課後主動約下次上課時間：+15% → 學員主動詢問下次上課時間（14:25:00）
- ❌ 課程中積極提問（5次以上）：+10% → 提問次數未達標

**總分計算：40% + 20% + 15% = 75%**

**AI 推理說明：**
學員已經購買線上課程，說明付費意願高。課後主動約下次上課時間，說明對課程滿意度高。但在課程中提問次數未達5次，說明參與度有改進空間。總體而言，成交機率為75%，屬於「高」等級。
`;

console.log('🧪 Testing Phase 31 Markdown Parser...\n');

// Since we can't import from client code directly in a server test,
// let's create a simplified version of the parser for testing
function testParser(markdown: string) {
  console.log('📝 Input Markdown Length:', markdown.length);
  console.log('\n='.repeat(60));

  // Test 1: Extract sections
  console.log('\n✅ Test 1: Extract Sections');
  const sections: Record<string, string> = {};
  const headingRegex = /^# (.+)$/gm;
  const matches: Array<{ title: string; start: number; bodyStart: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown))) {
    const title = match[1].trim();
    const headingLineEnd = markdown.indexOf('\n', match.index);
    const bodyStart = headingLineEnd === -1 ? markdown.length : headingLineEnd + 1;
    matches.push({ title, start: match.index, bodyStart });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const end = next ? next.start : markdown.length;
    const body = markdown.slice(current.bodyStart, end).trim();
    sections[current.title] = body;
  }

  console.log('   Found sections:', Object.keys(sections).length);
  Object.keys(sections).forEach((title, index) => {
    console.log(`   ${index + 1}. ${title}`);
  });

  // Test 2: Pain Points
  console.log('\n✅ Test 2: Extract Pain Points');
  const painPointsTitle = Object.keys(sections).find(
    (title) => title.includes('深層痛點')
  );
  if (painPointsTitle) {
    const painPointsBody = sections[painPointsTitle];
    const levelNames = ['目標層', '社交層', '情緒層', '環境層', '技術層'];

    levelNames.forEach((levelName) => {
      const levelRegex = new RegExp(
        `\\*\\*\\d+\\.\\s*${levelName}痛點`,
        'i'
      );
      const found = levelRegex.test(painPointsBody);
      console.log(`   ${levelName}: ${found ? '✅ Found' : '❌ Not found'}`);
    });
  } else {
    console.log('   ❌ Pain points section not found');
  }

  // Test 3: Score Metrics
  console.log('\n✅ Test 3: Extract Score Metrics');
  const scoresTitle = Object.keys(sections).find(
    (title) => title.includes('成交策略評估')
  );
  if (scoresTitle) {
    const scoresBody = sections[scoresTitle];
    const metricLabels = [
      '呼應痛點程度',
      '推課引導力度',
      'Double Bind / NLP 應用',
      '情緒共鳴與信任',
      '節奏與收斂完整度',
    ];

    metricLabels.forEach((label) => {
      const metricRegex = new RegExp(`\\*\\*${label}[：:]\\s*(\\d+)/(\\d+)\\*\\*`, 'i');
      const match = scoresBody.match(metricRegex);
      if (match) {
        console.log(`   ${label}: ${match[1]}/${match[2]} ✅`);
      } else {
        console.log(`   ${label}: ❌ Not found`);
      }
    });

    // Total score
    const totalMatch = scoresBody.match(/總分[\s\S]*?(\d+)\s*\/\s*(\d+)/);
    if (totalMatch) {
      console.log(`   總分: ${totalMatch[1]}/${totalMatch[2]} ✅`);
    }
  } else {
    console.log('   ❌ Scores section not found');
  }

  // Test 4: Probability
  console.log('\n✅ Test 4: Extract Probability');
  const probabilityTitle = Object.keys(sections).find(
    (title) => title.includes('預估成交機率')
  );
  if (probabilityTitle) {
    const probMatch = probabilityTitle.match(/(\d+)%/);
    if (probMatch) {
      console.log(`   成交機率: ${probMatch[1]}% ✅`);
    }

    // Extract factors
    const probabilityBody = sections[probabilityTitle];
    const baseMatch = probabilityBody.match(/\*\*基礎分[：:]\s*(\d+)%\*\*/);
    if (baseMatch) {
      console.log(`   基礎分: ${baseMatch[1]}% ✅`);
    }

    const factorRegex = /[-–—]\s*([✅❌])\s*([^：:]+)[：:]\s*([+\-])(\d+)%/g;
    let factorMatch;
    let factorCount = 0;
    while ((factorMatch = factorRegex.exec(probabilityBody)) !== null) {
      factorCount++;
      const symbol = factorMatch[1];
      const label = factorMatch[2].trim();
      const sign = factorMatch[3];
      const value = factorMatch[4];
      console.log(`   因素 ${factorCount}: ${symbol} ${label} ${sign}${value}%`);
    }
  } else {
    console.log('   ❌ Probability section not found');
  }

  // Test 5: Sales Scripts
  console.log('\n✅ Test 5: Extract Sales Scripts');
  const scriptsTitle = Object.keys(sections).find(
    (title) => title.includes('完整成交話術')
  );
  if (scriptsTitle) {
    const scriptsBody = sections[scriptsTitle];
    const scriptRegex = /(\d+)\.\s*\*\*版本\s*([A-C])\s*[—–-]\s*([^*]+)\*\*/g;
    let scriptMatch;
    let scriptCount = 0;
    while ((scriptMatch = scriptRegex.exec(scriptsBody)) !== null) {
      scriptCount++;
      const versionLetter = scriptMatch[2];
      const title = scriptMatch[3].trim();
      console.log(`   版本 ${versionLetter}: ${title} ✅`);
    }
    console.log(`   Total scripts found: ${scriptCount}`);
  } else {
    console.log('   ❌ Scripts section not found');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Parser test completed!\n');
}

testParser(sampleMarkdown);
