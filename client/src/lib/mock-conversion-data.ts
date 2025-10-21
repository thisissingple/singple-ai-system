import { subDays, format, addDays } from 'date-fns';
import { nanoid } from 'nanoid';

export type ConversionStatus = 'converted' | 'pending' | 'lost';
export type ScenarioType = 'high' | 'normal' | 'low' | 'mixed';

export interface MockStudent {
  id: string;
  studentName: string;
  email: string;
  classDate: string;
  trialDate?: string;
  consultDate?: string;
  teacher: string;
  status: ConversionStatus;
  dealAmount?: number;
}

const TEACHERS = ['王老師', '李老師', '張老師', '陳老師', '林老師'];
const FIRST_NAMES = ['小明', '小華', '小芳', '小美', '小強', '小玲', '小傑', '小雯', '小偉', '小婷'];
const LAST_NAMES = ['王', '李', '張', '陳', '林', '黃', '吳', '劉', '蔡', '楊'];

/**
 * 生成隨機學生名稱
 */
function generateName(): string {
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  return `${lastName}${firstName}`;
}

/**
 * 生成隨機 Email
 */
function generateEmail(name: string): string {
  const domain = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'][Math.floor(Math.random() * 4)];
  const prefix = name.replace(/[\u4e00-\u9fa5]/g, 'user') + Math.floor(Math.random() * 1000);
  return `${prefix}@${domain}`;
}

/**
 * 生成隨機教師
 */
function randomTeacher(): string {
  return TEACHERS[Math.floor(Math.random() * TEACHERS.length)];
}

/**
 * 生成隨機金額（8000-50000）
 */
function randomAmount(): number {
  return Math.floor(Math.random() * 42000) + 8000;
}

/**
 * 生成單筆 Mock 學生資料
 */
export function generateMockStudent(seed?: Partial<MockStudent>): MockStudent {
  const name = seed?.studentName || generateName();
  const email = seed?.email || generateEmail(name);
  const teacher = seed?.teacher || randomTeacher();
  const status = seed?.status || 'pending';

  // 隨機過去 1-30 天的體驗課日期
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  const classDate = seed?.classDate || format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

  const student: MockStudent = {
    id: seed?.id || nanoid(),
    studentName: name,
    email,
    classDate,
    teacher,
    status,
  };

  // 如果狀態是 converted，添加試聽日期、諮詢日期和成交金額
  if (status === 'converted') {
    const trialDaysAfter = Math.floor(Math.random() * 3) + 1; // 1-3天後試聽
    const consultDaysAfter = Math.floor(Math.random() * 3) + 1; // 再1-3天後諮詢

    student.trialDate = seed?.trialDate || format(addDays(new Date(classDate), trialDaysAfter), 'yyyy-MM-dd');
    student.consultDate = seed?.consultDate || format(addDays(new Date(student.trialDate), consultDaysAfter), 'yyyy-MM-dd');
    student.dealAmount = seed?.dealAmount || randomAmount();
  } else if (status === 'pending') {
    // pending 狀態可能有試聽，但沒有諮詢
    if (Math.random() > 0.5) {
      const trialDaysAfter = Math.floor(Math.random() * 3) + 1;
      student.trialDate = seed?.trialDate || format(addDays(new Date(classDate), trialDaysAfter), 'yyyy-MM-dd');
    }
  }

  return student;
}

/**
 * 批量生成 Mock 學生資料
 */
export function generateMockBatch(count: number, scenario?: ScenarioType): MockStudent[] {
  if (scenario) {
    return generateScenario(scenario).slice(0, count);
  }

  const students: MockStudent[] = [];
  for (let i = 0; i < count; i++) {
    students.push(generateMockStudent());
  }
  return students;
}

/**
 * 根據場景生成 Mock 資料
 */
export function generateScenario(type: ScenarioType): MockStudent[] {
  const baseCount = 50;
  const students: MockStudent[] = [];

  let convertedRatio: number;
  let pendingRatio: number;
  let lostRatio: number;

  switch (type) {
    case 'high':
      // 高轉換：80% 轉換，15% 進行中，5% 流失
      convertedRatio = 0.80;
      pendingRatio = 0.15;
      lostRatio = 0.05;
      break;
    case 'normal':
      // 一般：40% 轉換，35% 進行中，25% 流失
      convertedRatio = 0.40;
      pendingRatio = 0.35;
      lostRatio = 0.25;
      break;
    case 'low':
      // 低轉換：15% 轉換，35% 進行中，50% 流失
      convertedRatio = 0.15;
      pendingRatio = 0.35;
      lostRatio = 0.50;
      break;
    case 'mixed':
      // 混合：平均分布
      convertedRatio = 0.33;
      pendingRatio = 0.33;
      lostRatio = 0.34;
      break;
  }

  const convertedCount = Math.floor(baseCount * convertedRatio);
  const pendingCount = Math.floor(baseCount * pendingRatio);
  const lostCount = baseCount - convertedCount - pendingCount;

  // 生成已轉換學生
  for (let i = 0; i < convertedCount; i++) {
    students.push(generateMockStudent({ status: 'converted' }));
  }

  // 生成進行中學生
  for (let i = 0; i < pendingCount; i++) {
    students.push(generateMockStudent({ status: 'pending' }));
  }

  // 生成已流失學生
  for (let i = 0; i < lostCount; i++) {
    students.push(generateMockStudent({ status: 'lost' }));
  }

  return students;
}

/**
 * 將 MockStudent[] 轉換為符合前端資料結構的格式
 */
export interface ConversionRecord {
  id: string;
  data: {
    email: string;
    姓名?: string;
    學生姓名?: string;
    name?: string;
    日期?: string;
    上課日期?: string;
    classDate?: string;
    date?: string;
    教師?: string;
    teacher?: string;
    試聽日期?: string;
    trialDate?: string;
    諮詢日期?: string;
    consultDate?: string;
    成交金額?: number;
    金額?: number;
    amount?: number;
    dealAmount?: number;
    狀態?: string;
    status?: string;
  };
  lastUpdated: string;
}

/**
 * 轉換 MockStudent 為體驗課上課記錄格式
 */
export function mockToAttendanceRecord(student: MockStudent): ConversionRecord {
  return {
    id: student.id,
    data: {
      email: student.email,
      姓名: student.studentName,
      學生姓名: student.studentName,
      name: student.studentName,
      日期: student.classDate,
      上課日期: student.classDate,
      classDate: student.classDate,
      date: student.classDate,
      教師: student.teacher,
      teacher: student.teacher,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 轉換 MockStudent 為購買記錄格式（只包含已轉換的學生）
 */
export function mockToConversionRecord(student: MockStudent): ConversionRecord | null {
  if (student.status !== 'converted' || !student.dealAmount) {
    return null;
  }

  return {
    id: `${student.id}-conversion`,
    data: {
      email: student.email,
      姓名: student.studentName,
      學生姓名: student.studentName,
      name: student.studentName,
      日期: student.consultDate || student.trialDate || student.classDate,
      date: student.consultDate,
      教師: student.teacher,
      teacher: student.teacher,
      成交金額: student.dealAmount,
      金額: student.dealAmount,
      amount: student.dealAmount,
      dealAmount: student.dealAmount,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 批量轉換為上課記錄
 */
export function mockStudentsToAttendanceData(students: MockStudent[]): ConversionRecord[] {
  return students.map(mockToAttendanceRecord);
}

/**
 * 批量轉換為購買記錄（過濾掉未轉換的）
 */
export function mockStudentsToConversionData(students: MockStudent[]): ConversionRecord[] {
  return students
    .map(mockToConversionRecord)
    .filter((record): record is ConversionRecord => record !== null);
}