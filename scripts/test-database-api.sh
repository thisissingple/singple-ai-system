#!/bin/bash

# Database Browser API 測試腳本
# 測試所有資料庫 API 端點

BASE_URL="http://localhost:5000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 開始測試 Database Browser API..."
echo ""

# 測試 1: 列出所有表格
echo -e "${YELLOW}測試 1: GET /api/database/tables${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/database/tables")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    echo "回應: $body" | head -c 200
    echo ""
else
    echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
    echo "回應: $body"
fi
echo ""

# 測試 2: 查詢 users 表格欄位
echo -e "${YELLOW}測試 2: GET /api/database/tables/users/columns${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/database/tables/users/columns")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    column_count=$(echo "$body" | grep -o '"column_name"' | wc -l)
    echo "欄位數量: $column_count"
else
    echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
    echo "回應: $body"
fi
echo ""

# 測試 3: 查詢 users 表格資料（第一頁）
echo -e "${YELLOW}測試 3: GET /api/database/users/data?page=1&limit=5${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/database/users/data?page=1&limit=5")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    echo "回應: $body" | head -c 200
    echo ""
else
    echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
    echo "回應: $body"
fi
echo ""

# 測試 4: 搜尋功能
echo -e "${YELLOW}測試 4: GET /api/database/users/data?search=test&searchColumn=email${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/database/users/data?search=test&searchColumn=email")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    echo "回應: $body" | head -c 200
    echo ""
else
    echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
    echo "回應: $body"
fi
echo ""

# 測試 5: 查詢 Schema
echo -e "${YELLOW}測試 5: GET /api/database/schema${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/database/schema")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
    table_count=$(echo "$body" | grep -o '"table_name"' | wc -l)
    echo "表格數量: $table_count"
else
    echo -e "${RED}❌ 失敗 (HTTP $http_code)${NC}"
    echo "回應: $body"
fi
echo ""

echo "🎉 測試完成！"
echo ""
echo "📝 注意事項："
echo "  - 更新和刪除操作需要在前端測試"
echo "  - 建議使用瀏覽器測試完整的 CRUD 功能"
echo "  - 訪問 http://localhost:5000/tools/database-browser"
