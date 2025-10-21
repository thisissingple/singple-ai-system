/**
 * Formula Engine
 * Evaluates custom formulas for metric calculations
 */

export interface FormulaContext {
  [key: string]: number;
}

export interface FormulaDebugResult {
  result: number | null;
  substitutedFormula: string;
}

export class FormulaEngine {
  /**
   * Calculate metric with debug information
   * Returns both result and substituted formula
   */
  calculateMetricWithDebug(formula: string, context: FormulaContext): FormulaDebugResult {
    if (!formula || typeof formula !== 'string') {
      return { result: null, substitutedFormula: formula };
    }

    try {
      // Replace variable names with their values
      let expression = formula;

      // Sort keys by length (longest first) to avoid partial replacements
      const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

      for (const key of sortedKeys) {
        const value = context[key];
        // Use word boundaries to avoid partial replacements
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        expression = expression.replace(regex, String(value));
      }

      // Validate expression (only allow numbers, operators, parentheses, and whitespace)
      if (!/^[\d+\-*/().\s]+$/.test(expression)) {
        console.warn(`Invalid formula expression after substitution: ${expression}`);
        return { result: null, substitutedFormula: expression };
      }

      // Evaluate expression
      const result = this.safeEval(expression);

      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return { result: null, substitutedFormula: expression };
      }

      return { result, substitutedFormula: expression };
    } catch (error) {
      console.error('Formula calculation error:', error);
      return { result: null, substitutedFormula: formula };
    }
  }

  /**
   * Calculate metric using formula and context
   * Supports: +, -, *, /, (), variable names
   */
  calculateMetric(formula: string, context: FormulaContext): number | null {
    return this.calculateMetricWithDebug(formula, context).result;
  }

  /**
   * Safe evaluation of mathematical expressions
   * Only allows basic arithmetic operations
   */
  private safeEval(expression: string): number {
    // Remove whitespace
    expression = expression.replace(/\s/g, '');

    // Validate again before evaluation
    if (!/^[\d+\-*/().]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }

    // Use Function constructor as safer alternative to eval
    // Still requires validated input
    const func = new Function(`'use strict'; return (${expression});`);
    return func();
  }

  /**
   * Validate formula syntax
   */
  validateFormula(formula: string, allowedVariables: string[]): {
    valid: boolean;
    error?: string;
  } {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: '公式不能為空' };
    }

    if (formula.length > 500) {
      return { valid: false, error: '公式長度不能超過 500 字元' };
    }

    // Check for allowed characters
    const allowedPattern = /^[a-zA-Z0-9+\-*/().\s]+$/;
    if (!allowedPattern.test(formula)) {
      return { valid: false, error: '公式包含不允許的字元' };
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return { valid: false, error: '括號不匹配' };
      }
    }
    if (parenCount !== 0) {
      return { valid: false, error: '括號不匹配' };
    }

    // Extract variables used in formula
    const variablePattern = /[a-zA-Z][a-zA-Z0-9]*/g;
    const usedVariables = formula.match(variablePattern) || [];

    // Check if all variables are allowed
    const uniqueVariables = Array.from(new Set(usedVariables));
    const invalidVariables = uniqueVariables.filter((v) => !allowedVariables.includes(v));

    if (invalidVariables.length > 0) {
      return {
        valid: false,
        error: `未知的變數: ${invalidVariables.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Test formula with sample context
   */
  testFormula(
    formula: string,
    context: FormulaContext
  ): { success: boolean; result?: number; error?: string } {
    try {
      const result = this.calculateMetric(formula, context);

      if (result === null) {
        return { success: false, error: '公式計算失敗' };
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const formulaEngine = new FormulaEngine();
