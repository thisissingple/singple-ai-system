/**
 * Server-side parser for extracting teaching/sales scores from Markdown analysis
 * Phase 32-33: Dual score system
 */

export interface ParsedScores {
  teachingScore: number;      // 0-25
  salesScore: number;          // 0-25
  conversionProbability: number; // 0-100
  overallScore: number;        // 0-100 (calculated)
}

/**
 * Parse teaching score from Markdown (教學品質總分)
 */
function parseTeachingScore(markdown: string): number {
  // Pattern 1: Strict match with bold
  let match = markdown.match(/\*\*教學品質總分[：:]\s*(\d+)\s*\/\s*(\d+)\*\*/);

  // Pattern 2: Moderate tolerance
  if (!match) {
    match = markdown.match(/\*\*教學品質總分[：:]\*\*\s*(\d+)\s*\/\s*(\d+)/);
  }

  // Pattern 3: Maximum tolerance
  if (!match) {
    match = markdown.match(/教學品質總分[^0-9]*(\d+)\s*\/\s*(\d+)/);
  }

  if (match) {
    const score = parseInt(match[1], 10);
    const maxScore = parseInt(match[2], 10);

    // Validate score is within 0-25 range
    if (score >= 0 && score <= maxScore && maxScore === 25) {
      return score;
    }
  }

  // Fallback: Try to calculate from individual metrics
  const metricsMatches = markdown.matchAll(/\*\*\d+\.\s+[^*]+[：:]\s*(\d+)\/5\*\*/g);
  let sum = 0;
  let count = 0;

  for (const metricMatch of metricsMatches) {
    const metricScore = parseInt(metricMatch[1], 10);
    if (metricScore >= 0 && metricScore <= 5) {
      sum += metricScore;
      count++;
    }
  }

  // If we found exactly 5 metrics (教學品質評估), return their sum
  if (count === 5) {
    return sum;
  }

  return 0; // Unable to parse
}

/**
 * Parse sales score from Markdown (成交策略總分)
 */
function parseSalesScore(markdown: string): number {
  // Pattern 1: Most specific - Look for "總評（總分/25）：" format (e.g., **總評（總分/25）：** 16/25)
  // This avoids accidentally matching "教學品質總分：18/25" from teaching section
  let totalMatch = markdown.match(/總評[（(][^)）]*[)）][：:]\s*\*\*\s*(\d+)\s*\/\s*25/);

  if (totalMatch) {
    const score = parseInt(totalMatch[1], 10);
    if (score >= 0 && score <= 25) {
      return score;
    }
  }

  // Pattern 2: Alternative format - **總評：** 16/25
  if (!totalMatch) {
    totalMatch = markdown.match(/\*\*總評[：:]\*\*\s*(\d+)\s*\/\s*25/);
    if (totalMatch) {
      const score = parseInt(totalMatch[1], 10);
      if (score >= 0 && score <= 25) {
        return score;
      }
    }
  }

  // Pattern 3: Fallback - Look for individual metric scores in 成交策略評估 section
  const strategySection = markdown.match(/# 🧮 成交策略評估[\s\S]*?(?=# |$)/);

  if (strategySection) {
    const sectionText = strategySection[0];
    const metricsMatches = sectionText.matchAll(/\*\*[^*]+[：:]\s*(\d+)\/5\*\*/g);
    let sum = 0;
    let count = 0;

    for (const metricMatch of metricsMatches) {
      const metricScore = parseInt(metricMatch[1], 10);
      if (metricScore >= 0 && metricScore <= 5) {
        sum += metricScore;
        count++;
      }
    }

    // If we found exactly 5 metrics, return their sum
    if (count === 5) {
      return sum;
    }
  }

  return 0; // Unable to parse
}

/**
 * Parse conversion probability from Markdown (預估成交機率)
 */
function parseConversionProbability(markdown: string): number {
  // Pattern 1: Most flexible - Look for "預估成交機率" followed by percentage
  let match = markdown.match(/預估成交機率[^0-9]{0,20}(\d+)%/);

  if (match) {
    const prob = parseInt(match[1], 10);
    if (prob >= 0 && prob <= 100) {
      return prob;
    }
  }

  // Pattern 2: Look in calculation section for "總計" followed by percentage
  match = markdown.match(/總計[^0-9]{0,10}(\d+)%/);

  if (match) {
    const prob = parseInt(match[1], 10);
    if (prob >= 0 && prob <= 100) {
      return prob;
    }
  }

  return 55; // Default fallback (matches old conversionProb logic)
}

/**
 * Calculate overall score from component scores
 * Formula: (teaching/25 * 30) + (sales/25 * 30) + (probability * 0.4)
 */
function calculateOverallScore(
  teachingScore: number,
  salesScore: number,
  conversionProbability: number
): number {
  const teachingContribution = (teachingScore / 25) * 30;
  const salesContribution = (salesScore / 25) * 30;
  const conversionContribution = conversionProbability * 0.4;

  const total = teachingContribution + salesContribution + conversionContribution;

  // Round to integer, ensure 0-100 range
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * Main export: Parse all scores from Markdown analysis
 */
export function parseScoresFromMarkdown(markdown: string): ParsedScores {
  const teachingScore = parseTeachingScore(markdown);
  const salesScore = parseSalesScore(markdown);
  const conversionProbability = parseConversionProbability(markdown);
  const overallScore = calculateOverallScore(teachingScore, salesScore, conversionProbability);

  return {
    teachingScore,
    salesScore,
    conversionProbability,
    overallScore,
  };
}
