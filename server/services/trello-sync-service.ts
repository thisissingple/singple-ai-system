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
 * 取得所有學員看板
 * 篩選條件：看板名稱包含「一對一」或以 (老師名稱) 開頭
 */
export async function getStudentBoards(): Promise<TrelloBoard[]> {
  const boards = await trelloRequest<TrelloBoard[]>('/members/me/boards', {
    fields: 'name,url',
  });

  // 篩選學員看板（包含老師名稱的）
  const teacherPatterns = ['ELENA', 'KAREN', 'VICKY', 'ORANGE', '一對一'];

  return boards.filter(board => {
    const name = board.name.toUpperCase();
    return teacherPatterns.some(pattern => name.includes(pattern.toUpperCase()));
  });
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
 * 從看板名稱解析老師和學員資訊
 * 格式範例：(ELENA一對一) Kelly、(C) 韋辰
 */
function parseBoardName(boardName: string): { teacherName: string | null; studentName: string | null } {
  // 嘗試匹配 (老師一對一) 學員名 或 (字母) 學員名
  const match = boardName.match(/^\(([^)]+)\)\s*(.+)$/);

  if (match) {
    let teacherPart = match[1];
    const studentName = match[2].trim();

    // 提取老師名稱
    let teacherName = teacherPart.replace(/一對一/g, '').trim();

    // 處理單字母縮寫（如 C, A, B 可能代表不同老師或分類）
    if (teacherName.length === 1) {
      // 這些可能是分類標記，不是老師名稱
      teacherName = null;
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

  if (existing.rows.length > 0) {
    progressId = existing.rows[0].id;
    teacherId = existing.rows[0].teacher_id;
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
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE trello_board_id = $5`,
      [cardsCompleted, trackCompleted, pivotCompleted, breathCompleted, boardId]
    );
  } else {
    // 嘗試找到老師的 user_id (使用 business_identities.display_name 或 users.first_name)
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

    // 建立新記錄
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
 * 執行完整同步
 */
export async function syncAllBoards(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    boardsProcessed: 0,
    cardsCompleted: 0,
    errors: [],
  };

  try {
    console.log('🔄 開始 Trello 同步...');

    // 取得所有學員看板
    const boards = await getStudentBoards();
    console.log(`📋 找到 ${boards.length} 個學員看板`);

    for (const board of boards) {
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

          result.boardsProcessed++;
          result.cardsCompleted += progress.cardsCompleted;

          console.log(`  ✅ ${board.name}: ${progress.cardsCompleted} 張卡片完成`);
        }
      } catch (err: any) {
        result.errors.push(`${board.name}: ${err.message}`);
        console.error(`  ❌ ${board.name}: ${err.message}`);
      }
    }

    console.log(`\n✅ 同步完成！處理 ${result.boardsProcessed} 個看板，${result.cardsCompleted} 張卡片`);

  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
    console.error('❌ 同步失敗:', err.message);
  }

  return result;
}

/**
 * 取得同步狀態
 */
export async function getSyncStatus(): Promise<{
  lastSyncAt: Date | null;
  totalBoards: number;
  totalCardsCompleted: number;
}> {
  const result = await queryDatabase(
    `SELECT
      MAX(last_synced_at) as last_sync_at,
      COUNT(*) as total_boards,
      SUM(cards_completed) as total_cards
    FROM teacher_course_progress`,
    []
  );

  return {
    lastSyncAt: result.rows[0]?.last_sync_at || null,
    totalBoards: parseInt(result.rows[0]?.total_boards || '0'),
    totalCardsCompleted: parseInt(result.rows[0]?.total_cards || '0'),
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
      bi.display_name as teacher_nickname,
      CONCAT(u.first_name, ' ', u.last_name) as teacher_name
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
 */
export async function getTeacherWeeklyProgress(options: {
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  const { startDate, endDate } = options;

  // 預設取最近 8 週的資料
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 56); // 8 週

  const start = startDate || defaultStart.toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  const result = await queryDatabase(
    `WITH weekly_data AS (
      SELECT
        tcp.teacher_id,
        COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name,
        DATE_TRUNC('week', tcc.completed_at) as week_start,
        COUNT(tcc.id) as cards_completed,
        COUNT(DISTINCT tcp.id) as students_active
      FROM teacher_card_completions tcc
      JOIN teacher_course_progress tcp ON tcc.progress_id = tcp.id
      LEFT JOIN users u ON tcp.teacher_id = u.id
      LEFT JOIN business_identities bi ON u.id = bi.user_id
        AND bi.identity_type = 'teacher' AND bi.is_active = true
      WHERE tcc.completed_at >= $1 AND tcc.completed_at <= $2
      GROUP BY tcp.teacher_id, teacher_name, DATE_TRUNC('week', tcc.completed_at)
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
 * 取得老師進度總覽（彙總）
 */
export async function getTeacherProgressSummary(): Promise<any[]> {
  const result = await queryDatabase(
    `SELECT
      tcp.teacher_id,
      COALESCE(bi.display_name, u.first_name, '未分配') as teacher_name,
      COUNT(tcp.id) as total_students,
      SUM(tcp.cards_completed) as total_cards_completed,
      SUM(CASE WHEN tcp.track_completed THEN 1 ELSE 0 END) as track_completed_count,
      SUM(CASE WHEN tcp.pivot_completed THEN 1 ELSE 0 END) as pivot_completed_count,
      SUM(CASE WHEN tcp.breath_completed THEN 1 ELSE 0 END) as breath_completed_count,
      SUM(CASE WHEN tcp.breath_completed THEN 0 ELSE 1 END) as in_progress_count
    FROM teacher_course_progress tcp
    LEFT JOIN users u ON tcp.teacher_id = u.id
    LEFT JOIN business_identities bi ON u.id = bi.user_id
      AND bi.identity_type = 'teacher' AND bi.is_active = true
    GROUP BY tcp.teacher_id, teacher_name
    ORDER BY total_students DESC`,
    []
  );

  return result.rows;
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

export default {
  getStudentBoards,
  syncBoardProgress,
  syncAllBoards,
  getSyncStatus,
  getStudentProgressList,
  getStudentCardCompletions,
  getTeacherWeeklyProgress,
  getTeacherProgressSummary,
  startPeriodicSync,
  stopPeriodicSync,
};
