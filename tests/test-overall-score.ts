/**
 * Test Overall Score Calculation
 */

import { calculateOverallScore, getGrade, getGradeColor } from '../client/src/lib/calculate-overall-score';

console.log('🧪 測試整體評分計算\n');

// Test case 1: 陳冠霖的數據（假設教學評分為 21/25）
const chen = {
  teaching: 21,
  sales: 17,
  conversion: 75,
};

const chenResult = calculateOverallScore(chen.teaching, chen.sales, chen.conversion);
console.log('📊 陳冠霖 (Teaching: 21/25, Sales: 17/25, Conversion: 75%)');
console.log(`   Overall Score: ${chenResult.score}/100`);
console.log(`   Grade: ${chenResult.grade}`);
console.log(`   Breakdown:`);
console.log(`     - Teaching:   ${chenResult.breakdown.teaching}/30 (${chen.teaching}/25 × 30%)`);
console.log(`     - Sales:      ${chenResult.breakdown.sales}/30 (${chen.sales}/25 × 30%)`);
console.log(`     - Conversion: ${chenResult.breakdown.conversion}/40 (${chen.conversion}% × 40%)`);
console.log(`   Color: ${getGradeColor(chenResult.grade)}\n`);

// Test case 2: Perfect score
const perfect = {
  teaching: 25,
  sales: 25,
  conversion: 100,
};

const perfectResult = calculateOverallScore(perfect.teaching, perfect.sales, perfect.conversion);
console.log('📊 Perfect Score (Teaching: 25/25, Sales: 25/25, Conversion: 100%)');
console.log(`   Overall Score: ${perfectResult.score}/100`);
console.log(`   Grade: ${perfectResult.grade}`);
console.log(`   Breakdown:`);
console.log(`     - Teaching:   ${perfectResult.breakdown.teaching}/30`);
console.log(`     - Sales:      ${perfectResult.breakdown.sales}/30`);
console.log(`     - Conversion: ${perfectResult.breakdown.conversion}/40\n`);

// Test case 3: Low score
const low = {
  teaching: 10,
  sales: 10,
  conversion: 30,
};

const lowResult = calculateOverallScore(low.teaching, low.sales, low.conversion);
console.log('📊 Low Score (Teaching: 10/25, Sales: 10/25, Conversion: 30%)');
console.log(`   Overall Score: ${lowResult.score}/100`);
console.log(`   Grade: ${lowResult.grade}`);
console.log(`   Breakdown:`);
console.log(`     - Teaching:   ${lowResult.breakdown.teaching}/30`);
console.log(`     - Sales:      ${lowResult.breakdown.sales}/30`);
console.log(`     - Conversion: ${lowResult.breakdown.conversion}/40\n`);

// Test grade boundaries
console.log('🎯 Grade Boundaries:');
console.log(`   SSS: ${getGrade(95)} (95+)`);
console.log(`   SS:  ${getGrade(90)} (90-94)`);
console.log(`   S:   ${getGrade(85)} (85-89)`);
console.log(`   A:   ${getGrade(80)} (80-84)`);
console.log(`   B:   ${getGrade(70)} (70-79)`);
console.log(`   C:   ${getGrade(60)} (60-69)`);
console.log(`   D:   ${getGrade(50)} (50-59)`);
console.log(`   E:   ${getGrade(49)} (<50)`);

console.log('\n✅ All tests completed!');
