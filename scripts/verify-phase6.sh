#!/bin/bash

# Phase 6 驗證腳本
# 驗證 AI 欄位對應功能是否正常運作

set -e

echo "🧪 Phase 6: AI 欄位對應 - 功能驗證"
echo "========================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查函數
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. 檢查必要檔案
echo "1️⃣  檢查檔案存在..."
echo "---"

FILES=(
    "server/services/ai-field-mapper.ts"
    "tests/test-ai-field-mapper.ts"
    "tests/test-field-mapping-api.ts"
    "supabase/migrations/011_create_field_mappings.sql"
    "docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file"
    else
        check_fail "$file 不存在"
        exit 1
    fi
done

echo ""

# 2. 檢查環境變數
echo "2️⃣  檢查環境變數..."
echo "---"

if [ -n "$SUPABASE_URL" ]; then
    check_pass "SUPABASE_URL 已設定"
else
    check_warn "SUPABASE_URL 未設定"
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    check_pass "SUPABASE_SERVICE_ROLE_KEY 已設定"
else
    check_warn "SUPABASE_SERVICE_ROLE_KEY 未設定"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    check_pass "ANTHROPIC_API_KEY 已設定 (AI 模式)"
else
    check_warn "ANTHROPIC_API_KEY 未設定 (使用規則式對應)"
fi

echo ""

# 3. 執行 CLI 測試
echo "3️⃣  執行 CLI 測試..."
echo "---"

if npx tsx tests/test-ai-field-mapper.ts > /tmp/phase6-cli-test.log 2>&1; then
    check_pass "CLI 測試通過"
    # 顯示關鍵結果
    grep -E "(✅|分析完成)" /tmp/phase6-cli-test.log | head -3
else
    check_fail "CLI 測試失敗"
    cat /tmp/phase6-cli-test.log
    exit 1
fi

echo ""

# 4. 檢查伺服器狀態
echo "4️⃣  檢查開發伺服器..."
echo "---"

if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    check_pass "開發伺服器運行中"

    # 執行 API 測試
    echo ""
    echo "5️⃣  執行 API 測試..."
    echo "---"

    if npx tsx tests/test-field-mapping-api.ts > /tmp/phase6-api-test.log 2>&1; then
        check_pass "API 測試通過"
        grep -E "(✅|Test)" /tmp/phase6-api-test.log | head -5
    else
        check_fail "API 測試失敗"
        cat /tmp/phase6-api-test.log
        exit 1
    fi
else
    check_warn "開發伺服器未運行"
    echo "   提示: 執行 'npm run dev' 啟動伺服器"
    echo "   跳過 API 測試"
fi

echo ""

# 6. 檢查 Migration 狀態
echo "6️⃣  檢查 Migration 狀態..."
echo "---"

if npx tsx scripts/run-migration-011.ts > /tmp/phase6-migration.log 2>&1; then
    if grep -q "field_mappings 表已存在" /tmp/phase6-migration.log; then
        check_pass "field_mappings 表已建立"
    else
        check_warn "field_mappings 表尚未建立"
        echo "   提示: 透過 Supabase Dashboard 執行 migration"
    fi
else
    check_warn "無法連線到 Supabase"
fi

echo ""

# 7. 總結
echo "========================================"
echo "📊 驗證總結"
echo "========================================"
echo ""

echo "✅ 核心功能:"
echo "   - AI Field Mapper 服務: 正常"
echo "   - CLI 測試: 通過"

if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "   - API 端點: 正常"
else
    echo "   - API 端點: 未測試（伺服器未運行）"
fi

echo ""
echo "📚 相關文檔:"
echo "   - 快速啟動: PHASE_6_QUICK_START.md"
echo "   - 完整總結: docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md"
echo "   - 專案進度: PROJECT_PROGRESS.md"

echo ""
echo "🚀 下一步:"
echo "   1. 執行 Migration (如尚未執行)"
echo "   2. 開發前端 UI (Phase 6.4)"
echo "   3. 整合 ETL (Phase 6.5)"

echo ""
echo "🎉 Phase 6 後端驗證完成！"
