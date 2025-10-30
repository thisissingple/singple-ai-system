/**
 * Query Analyzer Service
 *
 * Purpose: Analyze user queries to determine complexity and recommend optimal AI model
 * Features: Complexity scoring, model recommendation, cost optimization
 * Created: 2025-10-30
 */

export type QueryComplexity = 'simple' | 'medium' | 'complex';

export interface QueryAnalysisResult {
  complexity: QueryComplexity;
  score: number; // 0-100
  factors: {
    length: number; // Query length score (0-30)
    technical: number; // Technical terms score (0-30)
    structure: number; // Query structure score (0-40)
  };
  recommendedModel: string;
  reasoning: string;
}

// =============================================
// Model Recommendations by Complexity
// =============================================

const MODEL_RECOMMENDATIONS = {
  simple: 'gpt-5-nano', // Cheapest for simple queries
  medium: 'gpt-5-mini', // Balanced for medium complexity
  complex: 'gpt-5', // Best for complex queries
};

// =============================================
// Technical Keywords (indicate complexity)
// =============================================

const TECHNICAL_KEYWORDS = [
  // Business/Strategy
  '策略', '戰略', '分析', '評估', '優化', '架構', '流程', '機制',
  'strategy', 'analysis', 'evaluation', 'optimization', 'framework',

  // Technical
  '技術', '系統', '演算法', '架構', '整合', 'API', '資料庫', '模型',
  'technical', 'system', 'algorithm', 'architecture', 'integration', 'database',

  // Complex reasoning
  '如何', '為什麼', '比較', '差異', '優缺點', '建議', '方案',
  'how', 'why', 'compare', 'difference', 'pros', 'cons', 'recommend', 'solution',
];

const COMPLEX_PATTERNS = [
  /比較.*和.*的/,  // Comparison
  /如何.*以及.*/,  // Multiple steps
  /分析.*並.*建議/, // Analysis + recommendation
  /為什麼.*但是.*/, // Reasoning with contrast
  /優缺點|pros.*cons/i, // Pros and cons
];

// =============================================
// Query Analysis Functions
// =============================================

/**
 * Analyze query length
 * Short queries (<20 chars) = simple
 * Medium queries (20-100 chars) = medium
 * Long queries (>100 chars) = complex
 */
function analyzeLengthScore(query: string): number {
  const length = query.length;

  if (length < 20) return 5;
  if (length < 50) return 15;
  if (length < 100) return 25;
  return 30;
}

/**
 * Analyze technical content
 * Count technical keywords and patterns
 */
function analyzeTechnicalScore(query: string): number {
  const lowerQuery = query.toLowerCase();

  // Count technical keywords
  const keywordCount = TECHNICAL_KEYWORDS.filter(keyword =>
    lowerQuery.includes(keyword.toLowerCase())
  ).length;

  // Check complex patterns
  const patternMatches = COMPLEX_PATTERNS.filter(pattern =>
    pattern.test(query)
  ).length;

  const score = (keywordCount * 5) + (patternMatches * 10);
  return Math.min(score, 30); // Cap at 30
}

/**
 * Analyze query structure
 * - Questions with multiple parts = more complex
 * - Contains connectors (和、或、但是、以及) = more complex
 * - Has specific requirements = more complex
 */
function analyzeStructureScore(query: string): number {
  let score = 0;

  // Question marks (multiple questions)
  const questionMarks = (query.match(/[?？]/g) || []).length;
  score += Math.min(questionMarks * 10, 15);

  // Connectors (indicate multiple parts)
  const connectors = ['和', '或', '但是', '以及', '而且', '另外', 'and', 'or', 'but', 'also'];
  const connectorCount = connectors.filter(conn => query.includes(conn)).length;
  score += Math.min(connectorCount * 5, 15);

  // Numbered lists (1. 2. 3.)
  const hasNumbering = /[1-9]\./.test(query);
  if (hasNumbering) score += 10;

  return Math.min(score, 40); // Cap at 40
}

/**
 * Main analysis function
 * Analyzes query and recommends optimal model
 */
export function analyzeQuery(query: string): QueryAnalysisResult {
  // Calculate individual scores
  const lengthScore = analyzeLengthScore(query);
  const technicalScore = analyzeTechnicalScore(query);
  const structureScore = analyzeStructureScore(query);

  // Total score (0-100)
  const totalScore = lengthScore + technicalScore + structureScore;

  // Determine complexity
  let complexity: QueryComplexity;
  let recommendedModel: string;
  let reasoning: string;

  if (totalScore < 30) {
    complexity = 'simple';
    recommendedModel = MODEL_RECOMMENDATIONS.simple;
    reasoning = '簡單問題，使用最便宜的模型即可';
  } else if (totalScore < 60) {
    complexity = 'medium';
    recommendedModel = MODEL_RECOMMENDATIONS.medium;
    reasoning = '中等複雜度，使用性價比高的模型';
  } else {
    complexity = 'complex';
    recommendedModel = MODEL_RECOMMENDATIONS.complex;
    reasoning = '複雜問題，使用最強大的模型確保品質';
  }

  return {
    complexity,
    score: totalScore,
    factors: {
      length: lengthScore,
      technical: technicalScore,
      structure: structureScore,
    },
    recommendedModel,
    reasoning,
  };
}

/**
 * Get recommended model for a query (convenience function)
 */
export function getRecommendedModel(query: string): string {
  const analysis = analyzeQuery(query);
  return analysis.recommendedModel;
}

/**
 * Check if query should use smart mode
 * (returns true if query benefits from automatic model selection)
 */
export function shouldUseSmartMode(query: string): boolean {
  const analysis = analyzeQuery(query);
  // Smart mode beneficial when complexity is clear (not borderline)
  return analysis.score < 25 || analysis.score > 65;
}

// =============================================
// Export
// =============================================

export const QueryAnalyzerService = {
  analyzeQuery,
  getRecommendedModel,
  shouldUseSmartMode,
};

export default QueryAnalyzerService;
