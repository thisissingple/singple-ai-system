/**
 * Calculate Overall Score and Grade
 *
 * Formula: (Teaching/25 × 30%) + (Sales/25 × 30%) + (ConversionRate/100 × 40%)
 */

export interface OverallScoreResult {
  score: number;           // 0-100
  grade: string;           // SSS, SS, S, A, B, C, D, E
  breakdown: {
    teaching: number;      // Teaching contribution (0-30)
    sales: number;         // Sales contribution (0-30)
    conversion: number;    // Conversion contribution (0-40)
  };
}

/**
 * Map score to grade
 */
export function getGrade(score: number): string {
  if (score >= 95) return 'SSS';
  if (score >= 90) return 'SS';
  if (score >= 85) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

/**
 * Get grade color
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'SSS':
      return 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white';
    case 'SS':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    case 'S':
      return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    case 'A':
      return 'bg-green-500 text-white';
    case 'B':
      return 'bg-blue-500 text-white';
    case 'C':
      return 'bg-yellow-500 text-white';
    case 'D':
      return 'bg-orange-500 text-white';
    case 'E':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Calculate overall score
 *
 * @param teachingScore - Teaching quality score (0-25)
 * @param salesScore - Sales strategy score (0-25)
 * @param conversionRate - Conversion probability (0-100)
 * @returns Overall score result with grade
 */
export function calculateOverallScore(
  teachingScore: number,
  salesScore: number,
  conversionRate: number
): OverallScoreResult {
  // Normalize to 0-100 scale
  const teachingNormalized = (teachingScore / 25) * 100;  // 0-100
  const salesNormalized = (salesScore / 25) * 100;        // 0-100
  const conversionNormalized = conversionRate;            // already 0-100

  // Calculate weighted contributions
  const teachingContribution = (teachingNormalized * 0.3);  // 30% weight
  const salesContribution = (salesNormalized * 0.3);        // 30% weight
  const conversionContribution = (conversionNormalized * 0.4); // 40% weight

  // Total score
  const totalScore = teachingContribution + salesContribution + conversionContribution;

  return {
    score: Math.round(totalScore), // Round to integer
    grade: getGrade(totalScore),
    breakdown: {
      teaching: Math.round(teachingContribution),
      sales: Math.round(salesContribution),
      conversion: Math.round(conversionContribution),
    },
  };
}
