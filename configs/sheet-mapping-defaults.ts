export type SheetType = 'trial_attendance' | 'trial_purchase' | 'eods';

export type SheetMappingTransform = 'date' | 'number' | 'boolean' | null;

export type SheetKeyStrategy = 'spreadsheet_row' | 'email_date';

export type SheetTargetTable =
  | 'trial_class_attendance'
  | 'trial_class_purchase'
  | 'eods_for_closers';

export interface SheetMappingField {
  supabaseColumn: string;
  aliases: string[];
  required?: boolean;
  transform?: SheetMappingTransform;
}

export interface SheetFieldMapping {
  sheetType: SheetType;
  sheetNamePatterns: string[];
  targetTable: SheetTargetTable;
  fields: SheetMappingField[];
  keyStrategy: SheetKeyStrategy;
}

const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  student_name: ['student_name', 'studentName', '姓名', '學生姓名', 'name', 'student', '學員姓名', 'Name'],
  student_email: ['student_email', 'studentEmail', '學員信箱', 'email', 'mail', '信箱', 'Email'],
  teacher_name: ['teacher_name', 'teacher', '教師', '老師', 'teacherName', '教師姓名', 'instructor'],
  class_date: ['class_date', 'classDate', '上課日期', 'date', '日期', 'trialDate', '體驗日期', '最近一次上課日期'],
  course_type: ['course_type', 'courseType', '課程類型', 'course', '類型', 'plan', '方案', 'subject'],
  status: ['status', '狀態', 'state', 'stage', '階段', '目前狀態（自動計算）'],
  intent_score: ['intent_score', 'intentScore', '意向分數', 'intent', '意願分數', 'score'],
  satisfaction: ['satisfaction', '滿意度', 'rating', '評分'],
  attended: ['attended', '出席', 'present', '是否出席', 'attendance'],
  purchase_date: ['purchase_date', 'purchaseDate', '購買日期', 'buyDate', '成交日期', '體驗課購買日期'],
  plan: ['plan', 'courseType', '方案', '課程方案', 'planName', '方案名稱'],
  deal_date: ['deal_date', 'dealDate', '成交日期', 'closedDate', 'closed_at', '（諮詢）成交日期'],
  deal_amount: ['deal_amount', 'dealAmount', '成交金額', 'amount', '金額', 'price', 'revenue', '收入', '（諮詢）實收金額'],
};

const createCommonFields = (): SheetMappingField[] => [
  {
    supabaseColumn: 'student_name',
    aliases: COMMON_FIELD_ALIASES.student_name,
  },
  {
    supabaseColumn: 'student_email',
    aliases: COMMON_FIELD_ALIASES.student_email,
    required: true,
  },
  {
    supabaseColumn: 'teacher_name',
    aliases: COMMON_FIELD_ALIASES.teacher_name,
  },
  {
    supabaseColumn: 'class_date',
    aliases: COMMON_FIELD_ALIASES.class_date,
    transform: 'date',
  },
  {
    supabaseColumn: 'course_type',
    aliases: COMMON_FIELD_ALIASES.course_type,
  },
  {
    supabaseColumn: 'status',
    aliases: COMMON_FIELD_ALIASES.status,
  },
  {
    supabaseColumn: 'intent_score',
    aliases: COMMON_FIELD_ALIASES.intent_score,
    transform: 'number',
  },
];

const withAdditionalFields = (
  base: SheetMappingField[],
  additions: SheetMappingField[]
): SheetMappingField[] => [...base, ...additions];

const ATTENDANCE_FIELDS = withAdditionalFields(createCommonFields(), [
  {
    supabaseColumn: 'satisfaction',
    aliases: COMMON_FIELD_ALIASES.satisfaction,
    transform: 'number',
  },
  {
    supabaseColumn: 'attended',
    aliases: COMMON_FIELD_ALIASES.attended,
    transform: 'boolean',
  },
]);

const PURCHASE_FIELDS = withAdditionalFields(createCommonFields(), [
  {
    supabaseColumn: 'purchase_date',
    aliases: COMMON_FIELD_ALIASES.purchase_date,
    transform: 'date',
  },
  {
    supabaseColumn: 'plan',
    aliases: COMMON_FIELD_ALIASES.plan,
  },
]);

const EODS_FIELDS: SheetMappingField[] = [
  {
    supabaseColumn: 'student_name',
    aliases: COMMON_FIELD_ALIASES.student_name,
  },
  {
    supabaseColumn: 'student_email',
    aliases: COMMON_FIELD_ALIASES.student_email,
    required: true,
  },
  {
    supabaseColumn: 'deal_date',
    aliases: COMMON_FIELD_ALIASES.deal_date,
    transform: 'date',
  },
  {
    supabaseColumn: 'deal_amount',
    aliases: COMMON_FIELD_ALIASES.deal_amount,
    transform: 'number',
  },
  {
    supabaseColumn: 'course_type',
    aliases: COMMON_FIELD_ALIASES.course_type,
  },
  {
    supabaseColumn: 'status',
    aliases: COMMON_FIELD_ALIASES.status,
  },
];

const mappingList: SheetFieldMapping[] = [
  {
    sheetType: 'trial_attendance',
    sheetNamePatterns: ['體驗課上課', 'attendance', '上課打卡'],
    targetTable: 'trial_class_attendance',
    fields: ATTENDANCE_FIELDS,
    keyStrategy: 'spreadsheet_row',
  },
  {
    sheetType: 'trial_purchase',
    sheetNamePatterns: ['體驗課購買', 'purchase', '學員轉單'],
    targetTable: 'trial_class_purchase',
    fields: PURCHASE_FIELDS,
    keyStrategy: 'email_date',
  },
  {
    sheetType: 'eods',
    sheetNamePatterns: ['eod', '成交', 'closer'],
    targetTable: 'eods_for_closers',
    fields: EODS_FIELDS,
    keyStrategy: 'email_date',
  },
];

export const SHEET_MAPPING_DEFAULTS: Record<SheetType, SheetFieldMapping> = mappingList.reduce(
  (acc, mapping) => {
    acc[mapping.sheetType] = mapping;
    return acc;
  },
  {} as Record<SheetType, SheetFieldMapping>
);

export const SHEET_MAPPING_DEFAULT_LIST: SheetFieldMapping[] = mappingList;

export function cloneSheetMapping(mapping: SheetFieldMapping): SheetFieldMapping {
  return {
    ...mapping,
    sheetNamePatterns: [...mapping.sheetNamePatterns],
    fields: mapping.fields.map((field) => ({
      ...field,
      aliases: [...field.aliases],
    })),
  };
}

export function getDefaultSheetMapping(sheetType: SheetType): SheetFieldMapping {
  const mapping = SHEET_MAPPING_DEFAULTS[sheetType];
  if (!mapping) {
    throw new Error(`Unknown sheet type: ${sheetType}`);
  }
  return cloneSheetMapping(mapping);
}

export interface SheetMappingUpdateInput {
  keyStrategy?: SheetKeyStrategy;
  fields?: SheetMappingField[];
}
