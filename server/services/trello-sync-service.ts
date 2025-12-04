/**
 * Trello 同步服務
 * 用於同步學員課程進度從 Trello 看板
 */

import { queryDatabase } from './pg-client';

// Trello API 設定
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BASE_URL = 'https://api.trello.com/1';

// 模組定義（根據卡片數量）
const MODULE_CONFIG = {
  track: { name: '軌道', maxCards: 9, bonus: 1000 },
  pivot: { name: '支點', maxCards: 20, bonus: 1500 },
  breath: { name: '氣息', maxCards: 37, bonus: 2000 },
};

// 列表名稱對應
const LIST_NAME_COMPLETED = '已完成';

interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

interface TrelloCard {
  id: string;
  name: string;
  idList: string;
  idBoard: string;
  dateLastActivity: string;
}

interface SyncResult {
  success: boolean;
  boardsProcessed: number;
  cardsCompleted: number;
  errors: string[];
  durationSeconds?: number; // 同步花費時間（秒）
}

/**
 * Trello API 請求
 */
async function trelloRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TRELLO_BASE_URL}${endpoint}`);
  url.searchParams.set('key', TRELLO_API_KEY || '');
  url.searchParams.set('token', TRELLO_API_TOKEN || '');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 取得所有看板（原始資料，用於顯示）
 */
export async function getAllBoards(): Promise<TrelloBoard[]> {
  return trelloRequest<TrelloBoard[]>('/members/me/boards', {
    fields: 'name,url',
  });
}

/**
 * 取得所有學員看板
 * 篩選條件（精準匹配）：
 * 1. 包含 (K) 或 （K） → Karen
 * 2. 包含 (V) 或 （V） → Vicky
 * 3. 包含 (O) 或 （O） → Orange
 * 4. 包含 ELENA 或 ELANA → Elena
 *
 * 注意：其他縮寫如 (A), (B), (C), (T), (F), (E) 等不匹配
 */
export async function getStudentBoards(): Promise<TrelloBoard[]> {
  const boards = await getAllBoards();

  return boards.filter(board => {
    // 統一為半形括號進行比對
    const normalizedName = board.name
      .replace(/（/g, '(')
      .replace(/）/g, ')');
    const upperName = normalizedName.toUpperCase();

    // 條件 1: 包含 (K) → Karen
    if (normalizedName.includes('(K)')) return true;

    // 條件 2: 包含 (V) → Vicky
    if (normalizedName.includes('(V)')) return true;

    // 條件 3: 包含 (O) → Orange
    if (normalizedName.includes('(O)')) return true;

    // 條件 4: 包含 ELENA 或 ELANA → Elena
    if (upperName.includes('ELENA') || upperName.includes('ELANA')) return true;

    return false;
  });
}

/**
 * 取得看板分類狀態（用於前端顯示）
 */
export async function getBoardsWithSyncStatus(): Promise<{
  syncedBoards: Array<TrelloBoard & { teacherName: string | null; studentName: string | null; isMatched: boolean }>;
  unmatchedBoards: TrelloBoard[];
  totalBoards: number;
}> {
  const allBoards = await getAllBoards();
  const studentBoards = await getStudentBoards();
  const studentBoardIds = new Set(studentBoards.map(b => b.id));

  const syncedBoards = studentBoards.map(board => {
    const parsed = parseBoardName(board.name);
    return {
      ...board,
      teacherName: parsed.teacherName,
      studentName: parsed.studentName,
      isMatched: !!parsed.studentName,
    };
  });

  const unmatchedBoards = allBoards.filter(board => !studentBoardIds.has(board.id));

  return {
    syncedBoards,
    unmatchedBoards,
    totalBoards: allBoards.length,
  };
}

/**
 * 取得看板的所有列表
 */
export async function getBoardLists(boardId: string): Promise<TrelloList[]> {
  return trelloRequest<TrelloList[]>(`/boards/${boardId}/lists`);
}

/**
 * 取得列表中的所有卡片
 */
export async function getListCards(listId: string): Promise<TrelloCard[]> {
  return trelloRequest<TrelloCard[]>(`/lists/${listId}/cards`, {
    fields: 'name,idList,idBoard,dateLastActivity',
  });
}

/**
 * 老師名稱縮寫對照表（精準匹配）
 * (K) → Karen
 * (V) → Vicky
 * (O) → Orange
 */
const TEACHER_ABBREVIATIONS: Record<string, string> = {
  'K': 'Karen',
  'V': 'Vicky',
  'O': 'Orange',
};

/**
 * 老師名稱正規化對照表（處理大小寫和拼寫差異）
 */
const TEACHER_NAME_NORMALIZATION: Record<string, string> = {
  'ELENA': 'Elena',
  'ELANA': 'Elena',  // 拼寫錯誤修正
};

/**
 * 從看板名稱解析老師和學員資訊
 * 格式範例：(ELENA一對一) Kelly、(C) 韋辰、(V) 學員名、（K）Hsepherd
 */
function parseBoardName(boardName: string): { teacherName: string | null; studentName: string | null } {
  // 統一全形括號為半形括號
  const normalizedName = boardName
    .replace(/（/g, '(')
    .replace(/）/g, ')');

  // 嘗試匹配 (老師一對一) 學員名 或 (字母) 學員名
  const match = normalizedName.match(/^\(([^)]+)\)\s*(.+)$/);

  if (match) {
    let teacherPart = match[1];
    const studentName = match[2].trim();

    // 提取老師名稱（移除「一對一」、「初階」、「高階」、「教練」等後綴）
    let teacherName = teacherPart
      .replace(/一對一/g, '')
      .replace(/初階/g, '')
      .replace(/高階/g, '')
      .replace(/教練/g, '')
      .trim();

    // 處理單字母縮寫（如 V=Vicky, K=Karen）
    if (teacherName.length === 1) {
      const upperChar = teacherName.toUpperCase();
      teacherName = TEACHER_ABBREVIATIONS[upperChar] || null;
    } else if (teacherName.length <= 5) {
      // 處理短名稱的正規化（如 ELENA → Elena, VJ → Vicky）
      const upperName = teacherName.toUpperCase();
      teacherName = TEACHER_NAME_NORMALIZATION[upperName] || teacherName;
    }

    return { teacherName, studentName };
  }

  return { teacherName: null, studentName: null };
}

/**
 * 同步單個看板的進度
 */
export async function syncBoardProgress(board: TrelloBoard): Promise<{
  cardsCompleted: number;
  studentName: string | null;
  teacherName: string | null;
  completedCards: TrelloCard[];
}> {
  const { teacherName, studentName } = parseBoardName(board.name);

  if (!studentName) {
    return { cardsCompleted: 0, studentName: null, teacherName: null, completedCards: [] };
  }

  // 取得所有列表
  const lists = await getBoardLists(board.id);

  // 找到「已完成」列表
  const completedList = lists.find(list =>
    list.name.includes(LIST_NAME_COMPLETED)
  );

  if (!completedList) {
    return { cardsCompleted: 0, studentName, teacherName, completedCards: [] };
  }

  // 取得已完成的卡片
  const completedCards = await getListCards(completedList.id);

  // 過濾出課程卡片（排除非課程卡片）
  const courseCards = completedCards.filter(card => {
    const name = card.name.toLowerCase();
    // 排除一些非課程卡片
    return !name.includes('歌曲') && !name.includes('筆記') && !name.includes('資源');
  });

  return {
    cardsCompleted: courseCards.length,
    studentName,
    teacherName,
    completedCards: courseCards,
  };
}

/**
 * 更新資料庫中的課程進度
 */
export async function updateCourseProgress(
  studentEmail: string,
  boardId: string,
  cardsCompleted: number,
  teacherName: string | null,
  completedCards: TrelloCard[] = []
): Promise<void> {
  // 檢查是否已存在
  const existing = await queryDatabase(
    `SELECT id, cards_completed, teacher_id FROM teacher_course_progress WHERE trello_board_id = $1`,
    [boardId]
  );

  const trackCompleted = cardsCompleted >= MODULE_CONFIG.track.maxCards;
  const pivotCompleted = cardsCompleted >= MODULE_CONFIG.pivot.maxCards;
  const breathCompleted = cardsCompleted >= MODULE_CONFIG.breath.maxCards;

  let progressId: string;
  let teacherId: string | null = null;

  // 查找老師的 user_id（用於新建和更新）
  if (teacherName) {
    const teacherResult = await queryDatabase(
      `SELECT u.id FROM users u
       LEFT JOIN business_identities bi ON u.id = bi.user_id
       WHERE bi.display_name ILIKE $1 OR u.first_name ILIKE $1
       LIMIT 1`,
      [`%${teacherName}%`]
    );
    if (teacherResult.rows.length > 0) {
      teacherId = teacherResult.rows[0].id;
    }
  }

  if (existing.rows.length > 0) {
    progressId = existing.rows[0].id;
    const existingTeacherId = existing.rows[0].teacher_id;

    // 如果現有記錄沒有 teacher_id 但我們找到了，則更新它
    const shouldUpdateTeacher = !existingTeacherId && teacherId;

    // 更新現有記錄
    await queryDatabase(
      `UPDATE teacher_course_progress SET
        cards_completed = $1,
        track_completed = $2,
        track_completed_at = CASE WHEN $2 AND track_completed = false THEN NOW() ELSE track_completed_at END,
        pivot_completed = $3,
        pivot_completed_at = CASE WHEN $3 AND pivot_completed = false THEN NOW() ELSE pivot_completed_at END,
        breath_completed = $4,
        breath_completed_at = CASE WHEN $4 AND breath_completed = false THEN NOW() ELSE breath_completed_at END,
        teacher_id = CASE WHEN $6::uuid IS NOT NULL THEN $6::uuid ELSE teacher_id END,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE trello_board_id = $5`,
      [cardsCompleted, trackCompleted, pivotCompleted, breathCompleted, boardId, teacherId]
    );

    // 使用找到的 teacher_id 或現有的
    teacherId = teacherId || existingTeacherId;
  } else {
    // 建立新記錄（teacherId 已在開頭查詢）
    const insertResult = await queryDatabase(
      `INSERT INTO teacher_course_progress (
        student_email, trello_board_id, teacher_id,
        cards_completed, track_completed, pivot_completed, breath_completed,
        last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (trello_board_id) DO UPDATE SET
        cards_completed = EXCLUDED.cards_completed,
        track_completed = EXCLUDED.track_completed,
        pivot_completed = EXCLUDED.pivot_completed,
        breath_completed = EXCLUDED.breath_completed,
        last_synced_at = NOW()
      RETURNING id`,
      [studentEmail, boardId, teacherId, cardsCompleted, trackCompleted, pivotCompleted, breathCompleted]
    );
    progressId = insertResult.rows[0]?.id;
  }

  // 同步卡片完成記錄
  if (progressId && completedCards.length > 0) {
    await syncCardCompletions(progressId, teacherId, studentEmail, completedCards);
  }
}

/**
 * 同步卡片完成記錄
 */
async function syncCardCompletions(
  progressId: string,
  teacherId: string | null,
  studentEmail: string,
  completedCards: TrelloCard[]
): Promise<void> {
  // 取得現有的卡片完成記錄
  const existingCards = await queryDatabase(
    `SELECT trello_card_id FROM teacher_card_completions WHERE progress_id = $1`,
    [progressId]
  );
  const existingCardIds = new Set(existingCards.rows.map((r: any) => r.trello_card_id));

  // 只插入新完成的卡片
  for (let i = 0; i < completedCards.length; i++) {
    const card = completedCards[i];
    if (!existingCardIds.has(card.id)) {
      // 判斷卡片屬於哪個模組
      const cardNumber = i + 1;
      let moduleName = 'breath';
      if (cardNumber <= 9) moduleName = 'track';
      else if (cardNumber <= 20) moduleName = 'pivot';

      await queryDatabase(
        `INSERT INTO teacher_card_completions (
          progress_id, teacher_id, student_email,
          card_number, card_name, module_name,
          trello_card_id, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING`,
        [
          progressId,
          teacherId,
          studentEmail,
          cardNumber,
          card.name,
          moduleName,
          card.id,
          card.dateLastActivity || new Date().toISOString()
        ]
      );
    }
  }
}

/**
 * 處理單個看板的同步（用於並行處理）
 */
async function processSingleBoard(board: TrelloBoard): Promise<{
  success: boolean;
  cardsCompleted: number;
  boardName: string;
  error?: string;
}> {
  try {
    const progress = await syncBoardProgress(board);

    if (progress.studentName) {
      // 使用看板名稱作為臨時 email（之後可以關聯到實際學員）
      const tempEmail = `${progress.studentName.toLowerCase().replace(/\s+/g, '.')}@trello.sync`;

      await updateCourseProgress(
        tempEmail,
        board.id,
        progress.cardsCompleted,
        progress.teacherName,
        progress.completedCards
      );

      return {
        success: true,
        cardsCompleted: progress.cardsCompleted,
        boardName: board.name,
      };
    }

    return { success: false, cardsCompleted: 0, boardName: board.name };
  } catch (err: any) {
    return {
      success: false,
      cardsCompleted: 0,
      boardName: board.name,
      error: err.message,
    };
  }
}

/**
 * 執行完整同步（並行處理版本）
 * 使用批次並行處理以加速同步，同時避免觸發 Trello API rate limit
 */
export async function syncAllBoards(): Promise<SyncResult> {
  const BATCH_SIZE = 5; // 每批並行處理 5 個看板（保守設定，避免 429）
  const BATCH_DELAY_MS = 2000; // 每批之間延遲 2 秒，確保不觸發 rate limit

  const result: SyncResult = {
    success: true,
    boardsProcessed: 0,
    cardsCompleted: 0,
    errors: [],
  };

  try {
    const startTime = Date.now();
    console.log('🔄 開始 Trello 同步（並行模式）...');

    // 取得所有學員看板
    const boards = await getStudentBoards();
    console.log(`📋 找到 ${boards.length} 個學員看板，批次大小: ${BATCH_SIZE}`);

    // 分批並行處理
    for (let i = 0; i < boards.length; i += BATCH_SIZE) {
      const batch = boards.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(boards.length / BATCH_SIZE);

      console.log(`  📦 處理批次 ${batchNumber}/${totalBatches}（${batch.length} 個看板）...`);

      // 並行處理這批看板
      const batchResults = await Promise.all(
        batch.map(board => processSingleBoard(board))
      );

      // 統計結果
      for (const res of batchResults) {
        if (res.success) {
          result.boardsProcessed++;
          result.cardsCompleted += res.cardsCompleted;
          console.log(`    ✅ ${res.boardName}: ${res.cardsCompleted} 張卡片完成`);
        } else if (res.error) {
          result.errors.push(`${res.boardName}: ${res.error}`);
          console.error(`    ❌ ${res.boardName}: ${res.error}`);
        }
      }

      // 批次之間延遲，避免 rate limit
      if (i + BATCH_SIZE < boards.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    const durationSeconds = (Date.now() - startTime) / 1000;
    result.durationSeconds = Math.round(durationSeconds * 10) / 10; // 四捨五入到小數第一位

    console.log(`\n✅ 同步完成！處理 ${result.boardsProcessed} 個看板，${result.cardsCompleted} 張卡片`);
    console.log(`⏱️ 總耗時: ${result.durationSeconds} 秒`);

    // 保存同步耗時到資料庫
    await saveSyncDuration(result.durationSeconds);

  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
    console.error('❌ 同步失敗:', err.message);
  }

  return result;
}

/**
 * 保存同步耗時
 */
async function saveSyncDuration(durationSeconds: number): Promise<void> {
  try {
    // 更新最後同步時間記錄（使用 upsert）
    await queryDatabase(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ('trello_last_sync_duration', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [durationSeconds.toString()]
    );
  } catch (err) {
    console.error('保存同步耗時失敗:', err);
  }
}

/**
 * 取得同步狀態（包含耗時和完整統計）
 */
export async function getSyncStatus(): Promise<{
  lastSyncAt: Date | null;
  lastSyncDurationSeconds: number | null;
  totalBoards: number;
  totalCardsCompleted: number;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    trackCompleted: number;
    pivotCompleted: number;
    breathCompleted: number;
  };
}> {
  // 同時查詢同步狀態和完整統計
  const [statusResult, durationResult] = await Promise.all([
    queryDatabase(
      `SELECT
        MAX(last_synced_at) as last_sync_at,
        COUNT(*) as total_boards,
        SUM(cards_completed) as total_cards,
        SUM(CASE WHEN breath_completed THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN cards_completed > 0 AND NOT breath_completed THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN cards_completed = 0 THEN 1 ELSE 0 END) as not_started,
        SUM(CASE WHEN track_completed THEN 1 ELSE 0 END) as track_completed,
        SUM(CASE WHEN pivot_completed THEN 1 ELSE 0 END) as pivot_completed,
        SUM(CASE WHEN breath_completed THEN 1 ELSE 0 END) as breath_completed
      FROM teacher_course_progress`,
      []
    ),
    queryDatabase(
      `SELECT value FROM system_settings WHERE key = 'trello_last_sync_duration'`,
      []
    ),
  ]);

  const row = statusResult.rows[0] || {};
  const durationValue = durationResult.rows[0]?.value;

  return {
    lastSyncAt: row.last_sync_at || null,
    lastSyncDurationSeconds: durationValue ? parseFloat(durationValue) : null,
    totalBoards: parseInt(row.total_boards || '0'),
    totalCardsCompleted: parseInt(row.total_cards || '0'),
    stats: {
      total: parseInt(row.total_boards || '0'),
      completed: parseInt(row.completed || '0'),
      inProgress: parseInt(row.in_progress || '0'),
      notStarted: parseInt(row.not_started || '0'),
      trackCompleted: parseInt(row.track_completed || '0'),
      pivotCompleted: parseInt(row.pivot_completed || '0'),
      breathCompleted: parseInt(row.breath_completed || '0'),
    },
  };
}

/**
 * 取得學員進度列表
 */
export async function getStudentProgressList(options: {
  teacherId?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { teacherId, limit = 50, offset = 0 } = options;

  let query = `
    SELECT
      tcp.*,
      COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name
    FROM teacher_course_progress tcp
    LEFT JOIN users u ON tcp.teacher_id = u.id
    LEFT JOIN business_identities bi ON u.id = bi.user_id AND bi.identity_type = 'teacher' AND bi.is_active = true
    WHERE 1=1
  `;
  const params: any[] = [];

  if (teacherId) {
    params.push(teacherId);
    query += ` AND tcp.teacher_id = $${params.length}`;
  }

  query += ` ORDER BY tcp.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await queryDatabase(query, params);
  return result.rows;
}

/**
 * 取得學員的卡片完成明細
 */
export async function getStudentCardCompletions(progressId: string): Promise<any[]> {
  const result = await queryDatabase(
    `SELECT
      id, card_number, card_name, module_name,
      completed_at, is_paid, paid_at
    FROM teacher_card_completions
    WHERE progress_id = $1
    ORDER BY card_number ASC`,
    [progressId]
  );
  return result.rows;
}

/**
 * 取得老師週進度統計
 * 週期定義：週四為第一天，週三為最後一天
 */
export async function getTeacherWeeklyProgress(options: {
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  const { startDate, endDate } = options;

  // 預設取最近 26 週（半年）的資料
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 182); // 26 週 = 182 天

  const start = startDate || defaultStart.toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  // 使用自定義週次計算（週四開始）
  // PostgreSQL DOW: 0=週日, 1=週一, 2=週二, 3=週三, 4=週四, 5=週五, 6=週六
  // 我們要把週四當作一週開始，所以需要調整日期
  // 週四=4, 我們要減掉 4 來得到週四的開始日期
  // 但是週日~週三要算作上一週，所以要減掉更多天
  const result = await queryDatabase(
    `WITH weekly_data AS (
      SELECT
        tcp.teacher_id,
        COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name,
        -- 計算週四開始的週次
        -- 把日期調整到週四開始：如果是週日(0)~週三(3)，要減到上週四
        -- EXTRACT(DOW) 值：0=日,1=一,2=二,3=三,4=四,5=五,6=六
        -- 週四~週六(4,5,6): 減去 (DOW - 4) 天
        -- 週日~週三(0,1,2,3): 減去 (DOW + 3) 天 (加 7 再減 4)
        DATE(tcc.completed_at) -
          CASE
            WHEN EXTRACT(DOW FROM tcc.completed_at) >= 4
            THEN (EXTRACT(DOW FROM tcc.completed_at) - 4)::int
            ELSE (EXTRACT(DOW FROM tcc.completed_at) + 3)::int
          END as week_start,
        COUNT(tcc.id) as cards_completed,
        COUNT(DISTINCT tcp.id) as students_active
      FROM teacher_card_completions tcc
      JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
      LEFT JOIN users u ON tcp.teacher_id = u.id
      LEFT JOIN business_identities bi ON u.id = bi.user_id
        AND bi.identity_type = 'teacher' AND bi.is_active = true
      WHERE tcc.completed_at >= $1 AND tcc.completed_at <= $2
      GROUP BY tcp.teacher_id, teacher_name,
        DATE(tcc.completed_at) -
          CASE
            WHEN EXTRACT(DOW FROM tcc.completed_at) >= 4
            THEN (EXTRACT(DOW FROM tcc.completed_at) - 4)::int
            ELSE (EXTRACT(DOW FROM tcc.completed_at) + 3)::int
          END
    )
    SELECT
      teacher_id,
      teacher_name,
      week_start,
      cards_completed,
      students_active
    FROM weekly_data
    ORDER BY teacher_name, week_start DESC`,
    [start, end]
  );

  return result.rows;
}

/**
 * 取得老師某週的卡片完成明細
 * 用於點擊週進度數字展開詳細資訊
 */
export async function getWeeklyCardDetails(options: {
  teacherId: string;
  weekStart: string;  // 週四日期 (YYYY-MM-DD)
}): Promise<any[]> {
  const { teacherId, weekStart } = options;

  // 計算週結束日期（週三 = 週四 + 6 天）
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const result = await queryDatabase(
    `SELECT
      tcc.id,
      tcc.card_number,
      tcc.card_name,
      tcc.module_name,
      tcc.completed_at,
      tcc.is_paid,
      tcp.student_email,
      COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name
    FROM teacher_card_completions tcc
    JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
    LEFT JOIN users u ON tcp.teacher_id = u.id
    LEFT JOIN business_identities bi ON u.id = bi.user_id
      AND bi.identity_type = 'teacher' AND bi.is_active = true
    WHERE tcp.teacher_id = $1
      AND tcc.completed_at >= $2
      AND tcc.completed_at <= $3
    ORDER BY tcc.completed_at DESC`,
    [teacherId, weekStart, weekEndDate.toISOString()]
  );

  return result.rows;
}

/**
 * 取得老師的學員進度列表（按學員分組）
 * 包含備註、階段狀態、新學員標記等資訊
 */
export async function getTeacherStudentProgress(teacherId: string): Promise<any[]> {
  const result = await queryDatabase(
    `SELECT
      tcp.id,
      tcp.student_email,
      tcp.cards_completed,
      tcp.total_cards,
      tcp.notes,
      tcp.plan_type,
      tcp.track_completed,
      tcp.track_completed_at,
      tcp.pivot_completed,
      tcp.pivot_completed_at,
      tcp.breath_completed,
      tcp.breath_completed_at,
      tcp.status,
      tcp.last_synced_at,
      tcp.created_at,
      -- 首次完成卡片日期（加入日期）
      (
        SELECT MIN(completed_at)
        FROM teacher_card_completions tcc
        WHERE tcc.progress_id = tcp.id
      ) as first_card_completed_at,
      -- 加入天數
      COALESCE(
        EXTRACT(DAY FROM NOW() - (
          SELECT MIN(completed_at)
          FROM teacher_card_completions tcc
          WHERE tcc.progress_id = tcp.id
        ))::INTEGER,
        0
      ) as days_since_join,
      -- 判斷是否為新學員（最早完成卡片在兩週內）
      CASE
        WHEN (
          SELECT MIN(completed_at)
          FROM teacher_card_completions tcc
          WHERE tcc.progress_id = tcp.id
        ) >= NOW() - INTERVAL '14 days' THEN true
        ELSE false
      END as is_new_student,
      -- 計算當前階段（軌道1-10張, 支點11-20張, 氣息21-37張）
      CASE
        WHEN tcp.breath_completed THEN 'completed'
        WHEN tcp.pivot_completed THEN 'breath'
        WHEN tcp.track_completed THEN 'pivot'
        WHEN tcp.cards_completed > 0 THEN 'track'
        ELSE 'not_started'
      END as current_stage,
      -- 計算最近一週完成的卡片數
      (
        SELECT COUNT(*)
        FROM teacher_card_completions tcc
        WHERE tcc.progress_id = tcp.id
          AND tcc.completed_at >= NOW() - INTERVAL '7 days'
      ) as cards_this_week,
      -- 計算上一週完成的卡片數
      (
        SELECT COUNT(*)
        FROM teacher_card_completions tcc
        WHERE tcc.progress_id = tcp.id
          AND tcc.completed_at >= NOW() - INTERVAL '14 days'
          AND tcc.completed_at < NOW() - INTERVAL '7 days'
      ) as cards_last_week,
      -- 最後完成卡片時間
      (
        SELECT MAX(completed_at)
        FROM teacher_card_completions tcc
        WHERE tcc.progress_id = tcp.id
      ) as last_card_completed_at,
      -- 停滯天數（距離最後完成卡片的天數）
      COALESCE(
        EXTRACT(DAY FROM NOW() - (
          SELECT MAX(completed_at)
          FROM teacher_card_completions tcc
          WHERE tcc.progress_id = tcp.id
        ))::INTEGER,
        999
      ) as days_since_last_card,
      -- 健康狀態：順利/緩慢/停滯/消失
      CASE
        WHEN (
          SELECT COUNT(*)
          FROM teacher_card_completions tcc
          WHERE tcc.progress_id = tcp.id
            AND tcc.completed_at >= NOW() - INTERVAL '7 days'
        ) > 0 THEN 'healthy'
        WHEN COALESCE(
          EXTRACT(DAY FROM NOW() - (
            SELECT MAX(completed_at)
            FROM teacher_card_completions tcc
            WHERE tcc.progress_id = tcp.id
          ))::INTEGER, 999
        ) < 7 THEN 'healthy'
        WHEN COALESCE(
          EXTRACT(DAY FROM NOW() - (
            SELECT MAX(completed_at)
            FROM teacher_card_completions tcc
            WHERE tcc.progress_id = tcp.id
          ))::INTEGER, 999
        ) BETWEEN 7 AND 21 THEN 'slow'
        WHEN COALESCE(
          EXTRACT(DAY FROM NOW() - (
            SELECT MAX(completed_at)
            FROM teacher_card_completions tcc
            WHERE tcc.progress_id = tcp.id
          ))::INTEGER, 999
        ) BETWEEN 22 AND 90 THEN 'stalled'
        ELSE 'missing'
      END as health_status
    FROM teacher_course_progress tcp
    WHERE tcp.teacher_id = $1
    ORDER BY
      -- 新學員優先（根據最早完成卡片時間）
      CASE
        WHEN (
          SELECT MIN(completed_at)
          FROM teacher_card_completions tcc
          WHERE tcc.progress_id = tcp.id
        ) >= NOW() - INTERVAL '14 days' THEN 0
        ELSE 1
      END,
      -- 然後按進度排序
      tcp.cards_completed DESC,
      tcp.student_email ASC`,
    [teacherId]
  );

  // 計算週均速度和預估完課週數（在應用層計算更靈活）
  return result.rows.map(student => {
    const daysSinceJoin = Number(student.days_since_join) || 0;
    const weeksSinceJoin = Math.max(Math.ceil(daysSinceJoin / 7), 1);
    const cardsCompleted = Number(student.cards_completed) || 0;
    const totalCards = Number(student.total_cards) || 37;
    const cardsRemaining = totalCards - cardsCompleted;

    // 週均速度
    const avgCardsPerWeek = cardsCompleted > 0 ? Math.round((cardsCompleted / weeksSinceJoin) * 10) / 10 : 0;

    // 預估完課週數
    let estimatedWeeksToComplete: number | null = null;
    if (avgCardsPerWeek > 0 && cardsRemaining > 0) {
      estimatedWeeksToComplete = Math.ceil(cardsRemaining / avgCardsPerWeek);
    } else if (cardsRemaining === 0) {
      estimatedWeeksToComplete = 0; // 已完課
    }

    return {
      ...student,
      weeks_since_join: weeksSinceJoin,
      avg_cards_per_week: avgCardsPerWeek,
      estimated_weeks_to_complete: estimatedWeeksToComplete,
      cards_remaining: cardsRemaining
    };
  });
}

/**
 * 更新學員備註
 */
export async function updateStudentNotes(progressId: string, notes: string): Promise<void> {
  await queryDatabase(
    `UPDATE teacher_course_progress SET notes = $1, updated_at = NOW() WHERE id = $2`,
    [notes || null, progressId]
  );
}

/**
 * 更新學員方案類型（多選：軌道、支點、氣息）
 */
export async function updateStudentPlanType(progressId: string, planType: string[]): Promise<void> {
  // 驗證只允許 track, pivot, breath
  const validTypes = ['track', 'pivot', 'breath'];
  const filteredTypes = planType.filter(t => validTypes.includes(t));

  await queryDatabase(
    `UPDATE teacher_course_progress SET plan_type = $1, updated_at = NOW() WHERE id = $2`,
    [filteredTypes, progressId]
  );
}

/**
 * 取得老師進度總覽（彙總）
 * @param startDate 開始日期（可選）
 * @param endDate 結束日期（可選）
 */
export async function getTeacherProgressSummary(startDate?: string, endDate?: string): Promise<any[]> {
  // 卡片分類規則：
  // 軌道 (track): 卡片名稱以 '1' 開頭（1a, 1b, 1c, 1d）
  // 支點 (pivot): 卡片名稱以 '2', '3', '4' 開頭
  // 氣息 (breath): 卡片名稱以 '5', '6' 開頭
  // 其他 (other): 不符合上述規則的卡片

  // 如果沒有日期參數，返回全部累計數據（從所有卡片完成記錄中計算）
  if (!startDate || !endDate) {
    const result = await queryDatabase(
      `SELECT
        tcp.teacher_id,
        COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name,
        COUNT(DISTINCT tcp.id) as total_students,
        COUNT(tcc.id) as total_cards_completed,
        COUNT(CASE WHEN tcc.card_name ~ '^(1[a-zA-Z]|2[a-eA-E])' THEN 1 END) as track_count,
        COUNT(CASE WHEN tcc.card_name ~ '^(2[d-zD-Z]|3[a-zA-Z]|4[a-fA-F])' THEN 1 END) as pivot_count,
        COUNT(CASE WHEN tcc.card_name ~ '^(5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' THEN 1 END) as breath_count,
        COUNT(CASE WHEN tcc.card_name !~ '^(1[a-zA-Z]|2[a-zA-Z]|3[a-zA-Z]|4[a-fA-F]|5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' THEN 1 END) as other_count,
        SUM(CASE WHEN tcp.track_completed THEN 1 ELSE 0 END) as track_completed_count,
        SUM(CASE WHEN tcp.pivot_completed THEN 1 ELSE 0 END) as pivot_completed_count,
        SUM(CASE WHEN tcp.breath_completed THEN 1 ELSE 0 END) as breath_completed_count,
        SUM(CASE WHEN tcp.breath_completed THEN 0 ELSE 1 END) as in_progress_count
      FROM teacher_course_progress tcp
      LEFT JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
      LEFT JOIN users u ON tcp.teacher_id = u.id
      LEFT JOIN business_identities bi ON u.id = bi.user_id
        AND bi.identity_type = 'teacher' AND bi.is_active = true
      GROUP BY tcp.teacher_id, teacher_name
      ORDER BY total_students DESC`,
      []
    );
    return result.rows;
  }

  // 有日期參數，根據指定期間計算數據
  // 計算該期間內有交作業的學員數和卡片數
  const result = await queryDatabase(
    `WITH period_stats AS (
      SELECT
        tcp.teacher_id,
        COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name,
        COUNT(DISTINCT tcp.id) as total_students,
        COUNT(tcc.id) as total_cards_completed,
        COUNT(CASE WHEN tcc.card_name ~ '^(1[a-zA-Z]|2[a-eA-E])' THEN 1 END) as track_count,
        COUNT(CASE WHEN tcc.card_name ~ '^(2[d-zD-Z]|3[a-zA-Z]|4[a-fA-F])' THEN 1 END) as pivot_count,
        COUNT(CASE WHEN tcc.card_name ~ '^(5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' THEN 1 END) as breath_count,
        COUNT(CASE WHEN tcc.card_name !~ '^(1[a-zA-Z]|2[a-zA-Z]|3[a-zA-Z]|4[a-fA-F]|5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' THEN 1 END) as other_count
      FROM teacher_card_completions tcc
      JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
      LEFT JOIN users u ON tcp.teacher_id = u.id
      LEFT JOIN business_identities bi ON u.id = bi.user_id
        AND bi.identity_type = 'teacher' AND bi.is_active = true
      WHERE tcc.completed_at >= $1 AND tcc.completed_at < $2::date + INTERVAL '1 day'
      GROUP BY tcp.teacher_id, teacher_name
    )
    SELECT
      teacher_id,
      teacher_name,
      total_students,
      total_cards_completed,
      track_count,
      pivot_count,
      breath_count,
      other_count,
      0 as track_completed_count,
      0 as pivot_completed_count,
      0 as breath_completed_count,
      total_students as in_progress_count
    FROM period_stats
    ORDER BY total_students DESC`,
    [startDate, endDate]
  );

  return result.rows;
}

/**
 * 取得學員進度狀況的詳細資料（支援時間區間過濾）
 */
export async function getProgressDetails(
  type: string,
  teacherId?: string,
  startDate?: string,
  endDate?: string
): Promise<any> {
  // 構建日期過濾條件
  const dateFilter = startDate && endDate
    ? `AND tcc.completed_at >= '${startDate}' AND tcc.completed_at < '${endDate}'::date + INTERVAL '1 day'`
    : '';

  const teacherFilter = teacherId
    ? `AND tcp.teacher_id = '${teacherId}'`
    : '';

  switch (type) {
    case 'students': {
      // 學員清單：該期間有交作業的學員
      const query = startDate && endDate
        ? `SELECT DISTINCT tcp.id, tcp.student_email, tcp.cards_completed, tcp.total_cards,
             tcp.track_completed, tcp.pivot_completed, tcp.breath_completed
           FROM teacher_course_progress tcp
           INNER JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
           WHERE 1=1 ${teacherFilter}
             AND tcc.completed_at >= '${startDate}' AND tcc.completed_at < '${endDate}'::date + INTERVAL '1 day'
           ORDER BY tcp.cards_completed DESC`
        : `SELECT tcp.id, tcp.student_email, tcp.cards_completed, tcp.total_cards,
             tcp.track_completed, tcp.pivot_completed, tcp.breath_completed
           FROM teacher_course_progress tcp
           WHERE 1=1 ${teacherFilter}
           ORDER BY tcp.cards_completed DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    case 'cards': {
      // 完成卡片清單
      const query = `SELECT tcc.id, tcc.card_number, tcc.card_name, tcc.student_email, tcc.completed_at
        FROM teacher_card_completions tcc
        INNER JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
        WHERE 1=1 ${teacherFilter} ${dateFilter}
        ORDER BY tcc.completed_at DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    case 'cardChange': {
      // 卡片變化：比較本期和前期每位學員的卡片數
      if (!startDate || !endDate) {
        return [];
      }

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      // 計算前期的日期範圍（與本期同樣長度）
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const prevEnd = new Date(currentStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff + 1);

      // 查詢本期每位學員完成的卡片數
      const currentPeriodQuery = `SELECT tcp.student_email, COUNT(tcc.id) as cards_count
        FROM teacher_course_progress tcp
        INNER JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
        WHERE tcc.completed_at >= '${startDate}'
          AND tcc.completed_at < '${endDate}'::date + INTERVAL '1 day'
          ${teacherFilter}
        GROUP BY tcp.student_email`;

      // 查詢前期每位學員完成的卡片數
      const prevPeriodQuery = `SELECT tcp.student_email, COUNT(tcc.id) as cards_count
        FROM teacher_course_progress tcp
        INNER JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
        WHERE tcc.completed_at >= '${formatDate(prevStart)}'
          AND tcc.completed_at < '${formatDate(prevEnd)}'::date + INTERVAL '1 day'
          ${teacherFilter}
        GROUP BY tcp.student_email`;

      const [currentResult, prevResult] = await Promise.all([
        queryDatabase(currentPeriodQuery, []),
        queryDatabase(prevPeriodQuery, [])
      ]);

      // 建立 Map 方便查詢
      const currentMap = new Map(currentResult.rows.map((r: any) => [r.student_email, parseInt(r.cards_count)]));
      const prevMap = new Map(prevResult.rows.map((r: any) => [r.student_email, parseInt(r.cards_count)]));

      // 合併所有學員
      const allStudents = new Set([...Array.from(currentMap.keys()), ...Array.from(prevMap.keys())]);

      // 計算每位學員的變化
      const results: any[] = [];
      allStudents.forEach(email => {
        const currentCards = currentMap.get(email) || 0;
        const prevCards = prevMap.get(email) || 0;
        const change = currentCards - prevCards;

        let status: string;
        if (currentCards > 0 && prevCards === 0) {
          status = '新增';
        } else if (currentCards === 0 && prevCards > 0) {
          status = '流失';
        } else if (change > 0) {
          status = '增加';
        } else if (change < 0) {
          status = '減少';
        } else {
          status = '持平';
        }

        results.push({
          student_email: email,
          current_cards: currentCards,
          prev_cards: prevCards,
          change,
          status
        });
      });

      // 依變化量排序（維持/持平/增加優先，然後新增，最後減少/流失）
      const statusOrder: { [key: string]: number } = { '持平': 0, '增加': 1, '新增': 2, '減少': 3, '流失': 4 };
      results.sort((a, b) => {
        const orderDiff = statusOrder[a.status] - statusOrder[b.status];
        if (orderDiff !== 0) return orderDiff;
        return Math.abs(b.change) - Math.abs(a.change);
      });

      return {
        dateRange: {
          current: { start: startDate, end: endDate },
          prev: { start: formatDate(prevStart), end: formatDate(prevEnd) }
        },
        data: results
      };
    }

    case 'studentChange': {
      // 學員變化：比較本期和前期的學員名單（維持/新增/流失）
      if (!startDate || !endDate) {
        return [];
      }

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      // 計算前期的日期範圍（與本期同樣長度）
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const prevEnd = new Date(currentStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff + 1);

      // 查詢本期活躍學員
      const currentPeriodQuery = `SELECT DISTINCT tcp.student_email,
          COUNT(tcc.id) as cards_count
        FROM teacher_course_progress tcp
        INNER JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
        WHERE tcc.completed_at >= '${startDate}'
          AND tcc.completed_at < '${endDate}'::date + INTERVAL '1 day'
          ${teacherFilter}
        GROUP BY tcp.student_email`;

      // 查詢前期活躍學員
      const prevPeriodQuery = `SELECT DISTINCT tcp.student_email,
          COUNT(tcc.id) as cards_count
        FROM teacher_course_progress tcp
        INNER JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
        WHERE tcc.completed_at >= '${formatDate(prevStart)}'
          AND tcc.completed_at < '${formatDate(prevEnd)}'::date + INTERVAL '1 day'
          ${teacherFilter}
        GROUP BY tcp.student_email`;

      const [currentResult, prevResult] = await Promise.all([
        queryDatabase(currentPeriodQuery, []),
        queryDatabase(prevPeriodQuery, [])
      ]);

      // 建立 Map 方便查詢
      const currentMap = new Map(currentResult.rows.map((r: any) => [r.student_email, parseInt(r.cards_count)]));
      const prevMap = new Map(prevResult.rows.map((r: any) => [r.student_email, parseInt(r.cards_count)]));

      // 分類學員
      const maintained: any[] = []; // 維持（兩期都有）
      const newStudents: any[] = []; // 新增（本期有、前期沒有）
      const lost: any[] = []; // 流失（前期有、本期沒有）

      // 處理本期學員
      currentMap.forEach((cards, email) => {
        if (prevMap.has(email)) {
          maintained.push({
            student_email: email,
            current_cards: cards,
            prev_cards: prevMap.get(email),
            status: '維持'
          });
        } else {
          newStudents.push({
            student_email: email,
            current_cards: cards,
            prev_cards: 0,
            status: '新增'
          });
        }
      });

      // 處理前期有但本期沒有的學員
      prevMap.forEach((cards, email) => {
        if (!currentMap.has(email)) {
          lost.push({
            student_email: email,
            current_cards: 0,
            prev_cards: cards,
            status: '流失'
          });
        }
      });

      return {
        dateRange: {
          current: { start: startDate, end: endDate },
          prev: { start: formatDate(prevStart), end: formatDate(prevEnd) }
        },
        summary: {
          total_current: currentMap.size,
          total_prev: prevMap.size,
          maintained: maintained.length,
          new: newStudents.length,
          lost: lost.length
        },
        maintained: maintained.sort((a, b) => b.current_cards - a.current_cards),
        newStudents: newStudents.sort((a, b) => b.current_cards - a.current_cards),
        lost: lost.sort((a, b) => b.prev_cards - a.prev_cards)
      };
    }

    case 'track': {
      // 軌道卡片：1a ~ 2e
      const query = `SELECT tcc.id, tcc.card_number, tcc.card_name, tcc.student_email, tcc.completed_at
        FROM teacher_card_completions tcc
        INNER JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
        WHERE tcc.card_name ~ '^(1[a-zA-Z]|2[a-eA-E])' ${teacherFilter} ${dateFilter}
        ORDER BY tcc.completed_at DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    case 'pivot': {
      // 支點卡片：2d ~ 4f
      const query = `SELECT tcc.id, tcc.card_number, tcc.card_name, tcc.student_email, tcc.completed_at
        FROM teacher_card_completions tcc
        INNER JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
        WHERE tcc.card_name ~ '^(2[d-zD-Z]|3[a-zA-Z]|4[a-fA-F])' ${teacherFilter} ${dateFilter}
        ORDER BY tcc.completed_at DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    case 'breath': {
      // 氣息卡片：5a ~ 7g
      const query = `SELECT tcc.id, tcc.card_number, tcc.card_name, tcc.student_email, tcc.completed_at
        FROM teacher_card_completions tcc
        INNER JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
        WHERE tcc.card_name ~ '^(5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' ${teacherFilter} ${dateFilter}
        ORDER BY tcc.completed_at DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    case 'other': {
      // 其他卡片：不符合 1a~2e, 2d~4f, 5a~7g 的規則
      const query = `SELECT tcc.id, tcc.card_number, tcc.card_name, tcc.student_email, tcc.completed_at
        FROM teacher_card_completions tcc
        INNER JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
        WHERE tcc.card_name !~ '^(1[a-zA-Z]|2[a-zA-Z]|3[a-zA-Z]|4[a-fA-F]|5[a-zA-Z]|6[a-zA-Z]|7[a-gA-G])' ${teacherFilter} ${dateFilter}
        ORDER BY tcc.completed_at DESC`;
      const result = await queryDatabase(query, []);
      return result.rows;
    }

    default:
      return [];
  }
}

// 定時同步（每小時）
let syncInterval: NodeJS.Timeout | null = null;

export function startPeriodicSync(intervalMs: number = 60 * 60 * 1000): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log(`⏰ 啟動 Trello 定時同步（每 ${intervalMs / 1000 / 60} 分鐘）`);

  syncInterval = setInterval(async () => {
    console.log(`\n⏰ [${new Date().toISOString()}] 執行定時 Trello 同步...`);
    await syncAllBoards();
  }, intervalMs);

  // 立即執行一次
  syncAllBoards();
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏹️ 停止 Trello 定時同步');
  }
}

/**
 * 取得兩個期間的學員級別比較資料（用於深度 AI 分析）
 * 回傳：當期有互動的學員、前期有互動的學員、流失的學員、新增的學員
 */
export async function getStudentComparisonData(
  teacherId: string,
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string
): Promise<{
  currentStudents: Array<{ email: string; cards: number; cardDetails: string[] }>;
  prevStudents: Array<{ email: string; cards: number; cardDetails: string[] }>;
  lostStudents: Array<{ email: string; prevCards: number; totalProgress: number; lastCardDate: string | null }>;
  newStudents: Array<{ email: string; cards: number }>;
}> {
  // 取得當期有互動的學員
  const currentResult = await queryDatabase(
    `SELECT
      tcp.student_email as email,
      COUNT(tcc.id) as cards,
      array_agg(DISTINCT tcc.card_name ORDER BY tcc.card_name) as card_details
    FROM teacher_card_completions tcc
    JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
    WHERE tcp.teacher_id = $1
      AND tcc.completed_at >= $2 AND tcc.completed_at < $3::date + INTERVAL '1 day'
    GROUP BY tcp.student_email`,
    [teacherId, currentStart, currentEnd]
  );

  // 取得前期有互動的學員
  const prevResult = await queryDatabase(
    `SELECT
      tcp.student_email as email,
      COUNT(tcc.id) as cards,
      array_agg(DISTINCT tcc.card_name ORDER BY tcc.card_name) as card_details
    FROM teacher_card_completions tcc
    JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
    WHERE tcp.teacher_id = $1
      AND tcc.completed_at >= $2 AND tcc.completed_at < $3::date + INTERVAL '1 day'
    GROUP BY tcp.student_email`,
    [teacherId, prevStart, prevEnd]
  );

  const currentStudents = currentResult.rows.map((r: any) => ({
    email: r.email,
    cards: parseInt(r.cards),
    cardDetails: r.card_details || [],
  }));

  const prevStudents = prevResult.rows.map((r: any) => ({
    email: r.email,
    cards: parseInt(r.cards),
    cardDetails: r.card_details || [],
  }));

  const currentEmails = new Set(currentStudents.map(s => s.email));
  const prevEmails = new Set(prevStudents.map(s => s.email));

  // 流失的學員（前期有、當期沒有）- 需要查詢他們的整體進度和最後完成日期
  const lostEmails = prevStudents.filter(s => !currentEmails.has(s.email)).map(s => s.email);

  let lostStudents: Array<{ email: string; prevCards: number; totalProgress: number; lastCardDate: string | null }> = [];

  if (lostEmails.length > 0) {
    const lostDetailsResult = await queryDatabase(
      `SELECT
        tcp.student_email as email,
        tcp.cards_completed as total_progress,
        tcp.total_cards,
        MAX(tcc.completed_at) as last_card_date
      FROM teacher_course_progress tcp
      LEFT JOIN teacher_card_completions tcc ON tcc.progress_id = tcp.id
      WHERE tcp.teacher_id = $1
        AND tcp.student_email = ANY($2)
      GROUP BY tcp.student_email, tcp.cards_completed, tcp.total_cards`,
      [teacherId, lostEmails]
    );

    lostStudents = lostDetailsResult.rows.map((r: any) => {
      const prevStudent = prevStudents.find(s => s.email === r.email);
      return {
        email: r.email,
        prevCards: prevStudent?.cards || 0,
        totalProgress: parseInt(r.total_progress) || 0,
        lastCardDate: r.last_card_date ? new Date(r.last_card_date).toISOString().split('T')[0] : null,
      };
    });
  }

  // 新增的學員（當期有、前期沒有）
  const newStudents = currentStudents
    .filter(s => !prevEmails.has(s.email))
    .map(s => ({ email: s.email, cards: s.cards }));

  return {
    currentStudents,
    prevStudents,
    lostStudents,
    newStudents,
  };
}

/**
 * 取得學員的歷史完課頻率（用於判斷是否異常）
 */
export async function getStudentHistoricalFrequency(
  teacherId: string,
  studentEmails: string[],
  lookbackDays: number = 60
): Promise<Map<string, { avgCardsPerWeek: number; totalWeeks: number; consistency: string }>> {
  if (studentEmails.length === 0) {
    return new Map();
  }

  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  const result = await queryDatabase(
    `WITH weekly_activity AS (
      SELECT
        tcp.student_email,
        DATE_TRUNC('week', tcc.completed_at) as week_start,
        COUNT(tcc.id) as cards
      FROM teacher_card_completions tcc
      JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
      WHERE tcp.teacher_id = $1
        AND tcp.student_email = ANY($2)
        AND tcc.completed_at >= $3
      GROUP BY tcp.student_email, DATE_TRUNC('week', tcc.completed_at)
    )
    SELECT
      student_email,
      ROUND(AVG(cards)::numeric, 1) as avg_cards_per_week,
      COUNT(DISTINCT week_start) as total_weeks,
      STDDEV(cards) as stddev_cards
    FROM weekly_activity
    GROUP BY student_email`,
    [teacherId, studentEmails, lookbackDate.toISOString()]
  );

  const frequencyMap = new Map<string, { avgCardsPerWeek: number; totalWeeks: number; consistency: string }>();

  for (const row of result.rows) {
    const avgCards = parseFloat(row.avg_cards_per_week) || 0;
    const stddev = parseFloat(row.stddev_cards) || 0;

    // 判斷一致性
    let consistency = '穩定';
    if (stddev > avgCards * 0.5) {
      consistency = '不穩定';
    } else if (avgCards < 1) {
      consistency = '低頻';
    }

    frequencyMap.set(row.student_email, {
      avgCardsPerWeek: avgCards,
      totalWeeks: parseInt(row.total_weeks),
      consistency,
    });
  }

  return frequencyMap;
}

export default {
  getAllBoards,
  getStudentBoards,
  getBoardsWithSyncStatus,
  syncBoardProgress,
  syncAllBoards,
  getSyncStatus,
  getStudentProgressList,
  getStudentCardCompletions,
  getTeacherWeeklyProgress,
  getTeacherProgressSummary,
  getWeeklyCardDetails,
  getTeacherStudentProgress,
  getProgressDetails,
  getStudentComparisonData,
  getStudentHistoricalFrequency,
  startPeriodicSync,
  stopPeriodicSync,
};
