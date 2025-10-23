#!/bin/bash

# 簡單的 GoHighLevel Webhook 測試腳本

URL="https://singple-ai-system.zeabur.app/api/webhooks/gohighlevel"

echo "🧪 測試 GoHighLevel Webhook"
echo "URL: $URL"
echo ""
echo "發送測試資料..."
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ghl-test-'$(date +%s)'",
    "name": "GoHighLevel 測試聯絡人",
    "firstName": "測試",
    "lastName": "聯絡人",
    "email": "ghl-test@example.com",
    "phone": "+886912345678",
    "tags": ["GoHighLevel", "Webhook測試"],
    "source": "Webhook 手動測試",
    "customFields": {
      "test_time": "'$(date +%Y-%m-%d\ %H:%M:%S)'"
    }
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat

echo ""
echo "---"
echo "請到 Supabase 執行以下 SQL 查看結果："
echo ""
echo "SELECT contact_id, name, email, phone, created_at"
echo "FROM gohighlevel_contacts"
echo "ORDER BY created_at DESC"
echo "LIMIT 5;"
echo ""
