import { readdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';

/**
 * 修復 migration 檔案的重複編號問題
 *
 * 問題：多個 migration 檔案使用相同編號，導致 Zeabur 部署失敗
 * 解決：按照檔案建立時間重新編號所有 migration 檔案
 */

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

interface MigrationFile {
  originalName: string;
  currentNumber: number;
  description: string;
  fullPath: string;
  mtime: Date;
}

async function fixMigrationNumbers() {
  console.log('🔍 掃描 migration 檔案...\n');

  // 1. 讀取所有 migration 檔案
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .map(filename => {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`⚠️  跳過格式不正確的檔案: ${filename}`);
        return null;
      }

      const fullPath = join(migrationsDir, filename);
      const stats = statSync(fullPath);

      return {
        originalName: filename,
        currentNumber: parseInt(match[1]),
        description: match[2],
        fullPath,
        mtime: stats.mtime,
      } as MigrationFile;
    })
    .filter((f): f is MigrationFile => f !== null);

  console.log(`📋 找到 ${files.length} 個 migration 檔案\n`);

  // 2. 按照建立時間排序（保持歷史順序）
  files.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

  // 3. 檢查重複編號
  const duplicates = new Map<number, MigrationFile[]>();
  files.forEach(file => {
    const existing = duplicates.get(file.currentNumber) || [];
    existing.push(file);
    duplicates.set(file.currentNumber, existing);
  });

  const duplicateNumbers = Array.from(duplicates.entries())
    .filter(([_, files]) => files.length > 1);

  if (duplicateNumbers.length > 0) {
    console.log('❌ 發現重複編號：\n');
    duplicateNumbers.forEach(([num, files]) => {
      console.log(`   編號 ${num.toString().padStart(3, '0')}: ${files.length} 個檔案`);
      files.forEach(f => {
        console.log(`      - ${f.originalName} (${f.mtime.toISOString()})`);
      });
    });
    console.log('');
  }

  // 4. 重新編號（從 000 開始，按照時間順序）
  console.log('🔄 開始重新編號...\n');

  const renameOperations: Array<{ from: string; to: string }> = [];

  files.forEach((file, index) => {
    const newNumber = index.toString().padStart(3, '0');
    const newFilename = `${newNumber}_${file.description}.sql`;
    const newPath = join(migrationsDir, newFilename);

    if (file.originalName !== newFilename) {
      renameOperations.push({
        from: file.originalName,
        to: newFilename,
      });
    }
  });

  if (renameOperations.length === 0) {
    console.log('✅ 所有檔案編號已正確，無需修改\n');
    return;
  }

  console.log(`📝 需要重新命名 ${renameOperations.length} 個檔案：\n`);
  renameOperations.forEach(op => {
    console.log(`   ${op.from} → ${op.to}`);
  });
  console.log('');

  // 5. 執行重新命名（使用臨時名稱避免衝突）
  console.log('🚀 執行重新命名...\n');

  // Step 1: 先全部改成臨時名稱
  renameOperations.forEach((op, index) => {
    const tempName = `temp_${index}_${op.to}`;
    const fromPath = join(migrationsDir, op.from);
    const tempPath = join(migrationsDir, tempName);
    renameSync(fromPath, tempPath);
  });

  // Step 2: 再改成最終名稱
  renameOperations.forEach((op, index) => {
    const tempName = `temp_${index}_${op.to}`;
    const tempPath = join(migrationsDir, tempName);
    const toPath = join(migrationsDir, op.to);
    renameSync(tempPath, toPath);
  });

  console.log('✅ 重新編號完成！\n');

  // 6. 驗證結果
  console.log('🔍 驗證結果...\n');
  const newFiles = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const newNumbers = new Set<string>();
  const duplicatesAfter: string[] = [];

  newFiles.forEach(filename => {
    const match = filename.match(/^(\d+)_/);
    if (match) {
      const num = match[1];
      if (newNumbers.has(num)) {
        duplicatesAfter.push(num);
      }
      newNumbers.add(num);
    }
  });

  if (duplicatesAfter.length > 0) {
    console.error('❌ 仍有重複編號！', duplicatesAfter);
    process.exit(1);
  }

  console.log(`✅ 驗證通過！共 ${newFiles.length} 個 migration 檔案，編號從 000 到 ${(newFiles.length - 1).toString().padStart(3, '0')}\n`);
  console.log('📋 前 10 個檔案：');
  newFiles.slice(0, 10).forEach(f => console.log(`   ${f}`));
  console.log('   ...');
  console.log('📋 後 10 個檔案：');
  newFiles.slice(-10).forEach(f => console.log(`   ${f}`));

  console.log('\n🎉 完成！現在可以 commit 並 push 到 GitHub 了。\n');
}

fixMigrationNumbers().catch(error => {
  console.error('❌ 錯誤：', error);
  process.exit(1);
});
