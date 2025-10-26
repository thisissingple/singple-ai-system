/**
 * Teaching Analysis Markdown Parser
 *
 * Parses the GPT-generated Markdown analysis report and extracts structured data
 * for the new UI components (PainPointsSection, TeachingScoresSection, etc.)
 */

export interface PainPoint {
  level: string;
  painDescription: string;
  evidence?: string;
  timestamp?: string;
  coachingValue: string;
  isExplored: boolean;
  needsToAsk?: string;
}

export interface ScoreMetric {
  label: string;
  value: number;
  maxValue: number;
  evidence: string;
  reasoning?: string;
  timestamps?: string[];
  criteria?: string;
}

export interface ProbabilityFactor {
  type: 'add' | 'subtract' | 'base';
  label: string;
  value: number;
  description: string;
  isApplied: boolean;
}

export interface SalesScript {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  technique: string;
}

export interface StudentProfile {
  lifestyle?: { text: string; timestamp?: string }[];
  environment?: { text: string; timestamp?: string }[];
  purchaseDecision?: { text: string; timestamp?: string }[];
  pushNote?: string;
  voiceStatus?: { text: string; timestamp?: string };
  pastAttempts?: { text: string; timestamp?: string }[];
  dreamVision?: { text: string; timestamp?: string };
  motivation?: { text: string; timestamp?: string };
  useCase?: { text: string; timestamp?: string };
  needsToAsk?: string[];
}

export interface ParsedTeachingAnalysis {
  painPoints: PainPoint[];
  teachingMetrics: ScoreMetric[];       // 教學品質評估 /25
  teachingTotalScore: number;           // 教學品質總分
  teachingMaxScore: number;             // 25
  salesMetrics: ScoreMetric[];          // 成交策略評估 /25 (原 scoreMetrics)
  salesTotalScore: number;              // 成交策略總分 (原 totalScore)
  salesMaxScore: number;                // 25 (原 maxTotalScore)
  scoreSummary?: string;
  probability: number;
  probabilityFactors: ProbabilityFactor[];
  probabilityReasoning?: string;
  salesScripts: SalesScript[];
  studentType?: string;
  studentProfile?: StudentProfile;
}

/**
 * Extract text with optional timestamp
 */
function extractTextWithTimestamp(text: string): { text: string; timestamp?: string } {
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const matches = Array.from(text.matchAll(timestampRegex));

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return {
      text: text.replace(/[（(]?\d{2}:\d{2}:\d{2}[）)]?/g, '').trim(),
      timestamp: lastMatch[1],
    };
  }
  return { text: text.trim() };
}

/**
 * Extract all timestamps from text
 */
function extractAllTimestamps(text: string): string[] {
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const matches = Array.from(text.matchAll(timestampRegex));
  return matches.map(match => match[1]);
}

/**
 * Extract sections from Markdown by heading level
 */
function extractSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingRegex = /^# (.+)$/gm;
  const matches: Array<{ title: string; start: number; bodyStart: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown))) {
    const title = match[1].trim();
    const headingLineEnd = markdown.indexOf('\n', match.index);
    const bodyStart = headingLineEnd === -1 ? markdown.length : headingLineEnd + 1;
    matches.push({
      title,
      start: match.index,
      bodyStart,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const end = next ? next.start : markdown.length;
    const body = markdown.slice(current.bodyStart, end).trim();
    sections[current.title] = body;
  }

  return sections;
}

/**
 * Parse pain points from the markdown section
 */
function parsePainPoints(sectionBody: string): PainPoint[] {
  const painPoints: PainPoint[] = [];
  const levelNames = ['目標層', '社交層', '情緒層', '環境層', '技術層'];

  for (const levelName of levelNames) {
    // Match pattern like "**1. 目標層痛點...**"
    const levelRegex = new RegExp(
      `\\*\\*\\d+\\.\\s*${levelName}痛點[^*]*\\*\\*([\\s\\S]*?)(?=\\*\\*\\d+\\.|$)`,
      'i'
    );
    const levelMatch = sectionBody.match(levelRegex);

    if (!levelMatch) {
      // If level not found, mark as not explored
      painPoints.push({
        level: levelName,
        painDescription: '',
        coachingValue: '',
        isExplored: false,
        needsToAsk: `建議補問：${levelName}相關問題`,
      });
      continue;
    }

    const levelContent = levelMatch[1].trim();

    // Check if unexplored (contains "未探索" or "❌")
    if (levelContent.includes('未探索') || levelContent.includes('❌')) {
      const needsMatch = levelContent.match(/建議補問[：:]\s*(.+)/);
      painPoints.push({
        level: levelName,
        painDescription: '',
        coachingValue: '',
        isExplored: false,
        needsToAsk: needsMatch ? needsMatch[1].trim() : undefined,
      });
      continue;
    }

    // Extract pain description
    const painMatch = levelContent.match(/[-–—]\s*\*\*內心痛點[：:]\*\*\s*(.+?)(?=\n|$)/);
    const painText = painMatch ? painMatch[1].trim() : '';

    // Extract evidence
    const evidenceMatch = levelContent.match(/[-–—]\s*\*\*行為證據[：:]\*\*\s*(.+?)(?=\n|$)/);
    const evidenceRaw = evidenceMatch ? evidenceMatch[1].trim() : '';
    const { text: evidenceText, timestamp } = extractTextWithTimestamp(evidenceRaw);

    // Extract coaching value
    const coachingMatch = levelContent.match(/[-–—]\s*\*\*一對一教練[^*]+\*\*\s*(.+?)(?=\n|$)/);
    const coachingValue = coachingMatch ? coachingMatch[1].trim() : '';

    painPoints.push({
      level: levelName,
      painDescription: painText,
      evidence: evidenceText,
      timestamp,
      coachingValue,
      isExplored: true,
    });
  }

  return painPoints;
}

/**
 * Parse teaching quality metrics from the section
 */
function parseTeachingMetrics(sectionBody: string): {
  metrics: ScoreMetric[];
  totalScore: number;
  maxTotalScore: number;
} {
  const metrics: ScoreMetric[] = [];
  const metricLabels = [
    '教學目標清晰度',
    '示範與講解品質',
    '學員理解度與互動',
    '即時回饋與調整',
    '課程結構與時間掌控',
  ];

  for (const label of metricLabels) {
    // Match the metric with number format (X/5)
    const metricRegex = new RegExp(
      `\\*\\*\\d+\\.\\s*${label}[：:]\\s*(\\d+)/(\\d+)\\*\\*([\\s\\S]*?)(?=\\n\\*\\*\\d+\\.|\\*\\*教學品質總分|$)`,
      'i'
    );
    const match = sectionBody.match(metricRegex);

    if (match) {
      const value = parseInt(match[1], 10);
      const maxValue = parseInt(match[2], 10);
      const content = match[3].trim();

      // Extract evidence
      const evidenceMatch = content.match(/[-–—]\s*\*\*證據[：:]\*\*\s*([\s\S]*?)(?=\n-\s*\*\*理由|$)/);
      const evidenceText = evidenceMatch ? evidenceMatch[1].trim() : '';

      // Extract reasoning
      const reasoningMatch = content.match(/[-–—]\s*\*\*理由[：:]\*\*\s*([\s\S]*?)(?=\n\*\*|$)/);
      const reasoningText = reasoningMatch ? reasoningMatch[1].trim() : '';

      // Extract all timestamps
      const allTimestamps = [
        ...extractAllTimestamps(evidenceText),
        ...extractAllTimestamps(reasoningText)
      ];

      metrics.push({
        label,
        value,
        maxValue,
        evidence: evidenceText,
        reasoning: reasoningText,
        timestamps: allTimestamps.length > 0 ? allTimestamps : undefined,
      });
    }
  }

  // Extract total score (try multiple patterns)
  let totalScore = 0;
  let maxTotalScore = 25;

  // Pattern 1: **教學品質總分：20/25**
  let totalMatch = sectionBody.match(/\*\*教學品質總分[：:]\s*(\d+)\s*\/\s*(\d+)\*\*/);

  if (!totalMatch) {
    // Pattern 2: Without trailing **
    totalMatch = sectionBody.match(/\*\*教學品質總分[：:]\*\*\s*(\d+)\s*\/\s*(\d+)/);
  }

  if (!totalMatch) {
    // Pattern 3: More flexible - just find the numbers after 教學品質總分
    totalMatch = sectionBody.match(/教學品質總分[^0-9]*(\d+)\s*\/\s*(\d+)/);
  }

  if (totalMatch) {
    totalScore = parseInt(totalMatch[1], 10);
    maxTotalScore = parseInt(totalMatch[2], 10);
  }

  return { metrics, totalScore, maxTotalScore };
}

/**
 * Parse sales strategy metrics from the section
 */
function parseScoreMetrics(sectionBody: string): {
  metrics: ScoreMetric[];
  totalScore: number;
  maxTotalScore: number;
  summary?: string;
} {
  const metrics: ScoreMetric[] = [];
  const metricLabels = [
    '呼應痛點程度',
    '推課引導力度',
    'Double Bind / NLP 應用',
    '情緒共鳴與信任',
    '節奏與收斂完整度',
  ];

  for (const label of metricLabels) {
    // Match the entire metric block including evidence and reasoning
    const metricRegex = new RegExp(
      `\\*\\*${label}[：:]\\s*(\\d+)/(\\d+)\\*\\*([\\s\\S]*?)(?=\\n\\*\\*[^證理]+[：:]\\s*\\d+/\\d+|$)`,
      'i'
    );
    const match = sectionBody.match(metricRegex);

    if (match) {
      const value = parseInt(match[1], 10);
      const maxValue = parseInt(match[2], 10);
      const content = match[3].trim();

      // Extract evidence (with more flexible pattern to handle nested bullets)
      const evidenceMatch = content.match(/[-–—]\s*\*\*證據[^*]*\*\*\s*([\s\S]*?)(?=\n-\s*\*\*理由|$)/);
      const evidenceText = evidenceMatch ? evidenceMatch[1].trim() : '';

      // Extract reasoning (with more flexible pattern)
      const reasoningMatch = content.match(/[-–—]\s*\*\*理由[：:]\*\*\s*([\s\S]*?)(?=\n\*\*[^*]+[：:]|$)/);
      const reasoningText = reasoningMatch ? reasoningMatch[1].trim() : '';

      // Extract all timestamps from both evidence and reasoning
      const allTimestamps = [
        ...extractAllTimestamps(evidenceText),
        ...extractAllTimestamps(reasoningText)
      ];

      metrics.push({
        label,
        value,
        maxValue,
        evidence: evidenceText,
        reasoning: reasoningText,
        timestamps: allTimestamps.length > 0 ? allTimestamps : undefined,
      });
    }
  }

  // Extract total score
  const totalMatch = sectionBody.match(/\*\*總評[^*]*[：:]\*\*\s*([^\n]+)/);
  let totalScore = 0;
  let maxTotalScore = 25;
  let summary: string | undefined;

  if (totalMatch) {
    summary = totalMatch[1].trim();
    const scoreMatch = summary.match(/(\d+)\s*\/\s*(\d+)/);
    if (scoreMatch) {
      totalScore = parseInt(scoreMatch[1], 10);
      maxTotalScore = parseInt(scoreMatch[2], 10);
    }
  }

  return { metrics, totalScore, maxTotalScore, summary };
}

/**
 * Parse probability section
 */
function parseProbability(sectionBody: string, sectionTitle?: string): {
  probability: number;
  factors: ProbabilityFactor[];
  reasoning?: string;
} {
  // Extract probability from title (e.g., "📈 預估成交機率：75%")
  let probability = 0;
  if (sectionTitle) {
    const probMatch = sectionTitle.match(/(\d+)%/);
    if (probMatch) {
      probability = parseInt(probMatch[1], 10);
    }
  }

  const factors: ProbabilityFactor[] = [];

  // Extract base score
  const baseMatch = sectionBody.match(/\*\*基礎分[：:]\s*(\d+)%\*\*/);
  if (baseMatch) {
    factors.push({
      type: 'base',
      label: '基礎分',
      value: parseInt(baseMatch[1], 10),
      description: '所有學員起始分',
      isApplied: true,
    });
  }

  // Extract add/subtract factors
  const factorRegex = /[-–—]\s*([✅❌])\s*([^：:]+)[：:]\s*([+\-])(\d+)%\s*→\s*(.+?)(?=\n|$)/g;
  let factorMatch;

  while ((factorMatch = factorRegex.exec(sectionBody)) !== null) {
    const isApplied = factorMatch[1] === '✅';
    const label = factorMatch[2].trim();
    const sign = factorMatch[3];
    const value = parseInt(factorMatch[4], 10);
    const description = factorMatch[5].trim();

    factors.push({
      type: sign === '+' ? 'add' : 'subtract',
      label,
      value,
      description,
      isApplied,
    });
  }

  return { probability, factors, reasoning: sectionBody };
}

/**
 * Parse student profile section
 */
function parseStudentProfile(sectionBody: string): StudentProfile {
  const profile: StudentProfile = {};

  // Extract lifestyle (生活型態與時間結構)
  const lifestyleMatch = sectionBody.match(/\*\*生活型態與時間結構[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*練習環境|$)/);
  if (lifestyleMatch) {
    const lifestyleContent = lifestyleMatch[1].trim();
    const items: { text: string; timestamp?: string }[] = [];

    // Extract bullet points and timestamps
    const bulletRegex = /[-–—]\s*([^\n]+)/g;
    let match;
    while ((match = bulletRegex.exec(lifestyleContent)) !== null) {
      const { text, timestamp } = extractTextWithTimestamp(match[1]);
      if (text) items.push({ text, timestamp });
    }
    if (items.length > 0) profile.lifestyle = items;
  }

  // Extract environment (練習環境與限制)
  const envMatch = sectionBody.match(/\*\*練習環境與限制[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*購課決策|$)/);
  if (envMatch) {
    const envContent = envMatch[1].trim();
    const items: { text: string; timestamp?: string }[] = [];

    const bulletRegex = /[-–—]\s*([^\n]+)/g;
    let match;
    while ((match = bulletRegex.exec(envContent)) !== null) {
      const { text, timestamp } = extractTextWithTimestamp(match[1]);
      if (text) items.push({ text, timestamp });
    }
    if (items.length > 0) profile.environment = items;
  }

  // Extract purchase decision (購課決策與付費指標)
  const purchaseMatch = sectionBody.match(/\*\*購課決策與付費指標[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*推斷說明|$)/);
  if (purchaseMatch) {
    const purchaseContent = purchaseMatch[1].trim();
    const items: { text: string; timestamp?: string }[] = [];

    const bulletRegex = /[-–—]\s*([^\n]+)/g;
    let match;
    while ((match = bulletRegex.exec(purchaseContent)) !== null) {
      const { text, timestamp } = extractTextWithTimestamp(match[1]);
      if (text) items.push({ text, timestamp });
    }
    if (items.length > 0) profile.purchaseDecision = items;
  }

  // Extract push note (推斷說明)
  const pushNoteMatch = sectionBody.match(/\*\*推斷說明[：:]\*\*\s*([^\n]+)/);
  if (pushNoteMatch) {
    profile.pushNote = pushNoteMatch[1].trim();
  }

  // Extract voice status (🎤 聲音現況)
  const voiceMatch = sectionBody.match(/[-–—]\s*\*\*🎤\s*聲音現況[^*]*\*\*\s*([^\n]+)/);
  if (voiceMatch) {
    const { text, timestamp } = extractTextWithTimestamp(voiceMatch[1]);
    profile.voiceStatus = { text, timestamp };
  }

  // Extract past attempts (📚 過去嘗試過的方法或課程)
  const pastAttemptsMatch = sectionBody.match(/[-–—]\s*\*\*📚\s*過去嘗試[^*]*\*\*\s*([\s\S]*?)(?=\n[-–—]\s*\*\*|需補問|$)/);
  if (pastAttemptsMatch) {
    const content = pastAttemptsMatch[1].trim();
    const items: { text: string; timestamp?: string }[] = [];

    const bulletRegex = /[-–—]\s*([^\n]+)/g;
    let match;
    while ((match = bulletRegex.exec(content)) !== null) {
      const { text, timestamp } = extractTextWithTimestamp(match[1]);
      if (text && !text.includes('需補問')) items.push({ text, timestamp });
    }
    if (items.length > 0) profile.pastAttempts = items;
  }

  // Extract dream vision (🏁 想成為什麼樣的自己)
  const dreamMatch = sectionBody.match(/[-–—]\s*\*\*🏁\s*想成為[^*]*\*\*\s*([^\n]+)/);
  if (dreamMatch && !dreamMatch[1].includes('需補問')) {
    const { text, timestamp } = extractTextWithTimestamp(dreamMatch[1]);
    profile.dreamVision = { text, timestamp };
  }

  // Extract motivation (🎯 為什麼現在特別想學)
  const motivationMatch = sectionBody.match(/[-–—]\s*\*\*🎯\s*為什麼現在[^*]*\*\*\s*([^\n]+)/);
  if (motivationMatch && !motivationMatch[1].includes('需補問')) {
    const { text, timestamp } = extractTextWithTimestamp(motivationMatch[1]);
    profile.motivation = { text, timestamp };
  }

  // Extract use case (🎬 想把聲音用在哪裡)
  const useCaseMatch = sectionBody.match(/[-–—]\s*\*\*🎬\s*想把聲音用在[^*]*\*\*\s*([^\n]+)/);
  if (useCaseMatch && !useCaseMatch[1].includes('需補問')) {
    const { text, timestamp } = extractTextWithTimestamp(useCaseMatch[1]);
    profile.useCase = { text, timestamp };
  }

  // Extract needs to ask (📝 仍需補問)
  const needsMatch = sectionBody.match(/[-–—]\s*\*\*📝\s*仍需補問\*\*\s*([\s\S]*?)(?=\n---|\n#|$)/);
  if (needsMatch) {
    const needsContent = needsMatch[1].trim();
    const items: string[] = [];
    const bulletRegex = /[-–—]\s*([^\n]+)/g;
    let match;
    while ((match = bulletRegex.exec(needsContent)) !== null) {
      const text = match[1].trim();
      if (text) items.push(text);
    }
    if (items.length > 0) profile.needsToAsk = items;
  }

  return profile;
}

/**
 * Parse sales scripts section
 */
function parseSalesScripts(sectionBody: string): SalesScript[] {
  const scripts: SalesScript[] = [];
  const scriptRegex =
    /(\d+)\.\s*\*\*版本\s*([A-C])\s*[—–-]\s*([^*]+)\*\*\s*\n\s*>\s*([\s\S]*?)(?=\n\d+\.\s*\*\*版本|$)/g;

  let match;
  while ((match = scriptRegex.exec(sectionBody)) !== null) {
    const id = `variant-${match[1]}`;
    const versionLetter = match[2];
    const title = match[3].trim();
    const body = match[4].trim();

    // Determine technique and target audience from title
    let technique = '未知技巧';
    let targetAudience = title;

    if (title.includes('已付費') || title.includes('高投入')) {
      technique = '價值重構';
    } else if (title.includes('環境限制') || title.includes('時間壓力')) {
      technique = '損失規避';
    } else if (title.includes('積極探索') || title.includes('高度投入')) {
      technique = '未來錨定';
    }

    scripts.push({
      id,
      title: `版本 ${versionLetter} - ${title}`,
      body,
      targetAudience,
      technique,
    });
  }

  return scripts;
}

/**
 * Main parser function
 */
export function parseTeachingAnalysisMarkdown(markdown: string): ParsedTeachingAnalysis | null {
  if (!markdown || markdown.trim().length === 0) {
    return null;
  }

  try {
    const sections = extractSections(markdown);

    // Find pain points section
    const painPointsTitle = Object.keys(sections).find(
      (title) => title.includes('深層痛點') || title.includes('⛔')
    );
    const painPoints = painPointsTitle
      ? parsePainPoints(sections[painPointsTitle])
      : [];

    // Find teaching quality metrics section
    const teachingTitle = Object.keys(sections).find(
      (title) => title.includes('教學品質評估') || title.includes('📚')
    );
    const { metrics: teachingMetrics, totalScore: teachingTotalScore, maxTotalScore: teachingMaxScore } =
      teachingTitle ? parseTeachingMetrics(sections[teachingTitle]) : {
        metrics: [],
        totalScore: 0,
        maxTotalScore: 25,
      };

    // Find sales strategy metrics section
    const scoresTitle = Object.keys(sections).find(
      (title) => title.includes('成交策略評估') || title.includes('🧮')
    );
    const { metrics: salesMetrics, totalScore: salesTotalScore, maxTotalScore: salesMaxScore, summary: scoreSummary } =
      scoresTitle ? parseScoreMetrics(sections[scoresTitle]) : {
        metrics: [],
        totalScore: 0,
        maxTotalScore: 25,
      };

    // Find probability section
    const probabilityTitle = Object.keys(sections).find(
      (title) => title.includes('預估成交機率') || title.includes('📈')
    );
    const { probability, factors: probabilityFactors, reasoning: probabilityReasoning } =
      probabilityTitle
        ? parseProbability(sections[probabilityTitle], probabilityTitle)
        : { probability: 0, factors: [], reasoning: undefined };

    // Find sales scripts section
    const scriptsTitle = Object.keys(sections).find(
      (title) => title.includes('完整成交話術') || title.includes('💬')
    );
    const salesScripts = scriptsTitle
      ? parseSalesScripts(sections[scriptsTitle])
      : [];

    // Find student profile section
    const profileTitle = Object.keys(sections).find(
      (title) => title.includes('學員狀況掌握') || title.includes('🧑‍🏫')
    );
    const studentProfile = profileTitle
      ? parseStudentProfile(sections[profileTitle])
      : undefined;

    return {
      painPoints,
      teachingMetrics,
      teachingTotalScore,
      teachingMaxScore,
      salesMetrics,
      salesTotalScore,
      salesMaxScore,
      scoreSummary,
      probability,
      probabilityFactors,
      probabilityReasoning,
      salesScripts,
      studentProfile,
    };
  } catch (error) {
    console.error('Error parsing teaching analysis markdown:', error);
    return null;
  }
}
