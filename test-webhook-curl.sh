#!/bin/bash

# GoHighLevel Webhook 測試腳本
# 用法：./test-webhook-curl.sh <your-domain>
# 範例：./test-webhook-curl.sh https://your-app.replit.app

DOMAIN="${1:-http://localhost:5000}"
WEBHOOK_URL="${DOMAIN}/api/webhooks/gohighlevel"

echo "🧪 GoHighLevel Webhook 測試"
echo "=========================================="
echo "目標 URL: $WEBHOOK_URL"
echo ""

# 測試 1: 發送新聯絡人
echo "📤 測試 1: 發送新聯絡人資料..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-contact-001",
    "contactId": "test-contact-001",
    "name": "測試聯絡人",
    "firstName": "測試",
    "lastName": "聯絡人",
    "email": "test001@example.com",
    "phone": "+886912345678",
    "tags": ["潛在客戶", "體驗課", "高優先"],
    "source": "GoHighLevel 測試",
    "locationId": "loc-test-123",
    "companyName": "簡單歌唱教室",
    "address": "台北市信義區信義路五段",
    "city": "台北市",
    "state": "台灣",
    "postalCode": "110",
    "country": "Taiwan",
    "customFields": {
      "interest": "歌唱課程",
      "budget": "5000-10000",
      "trial_date": "2025-10-25"
    }
  }')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP 狀態碼: $HTTP_STATUS"
echo "回應內容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ 測試 1 成功！"
else
  echo "❌ 測試 1 失敗（HTTP $HTTP_STATUS）"
fi
echo ""

# 測試 2: 更新現有聯絡人
echo "🔄 測試 2: 更新現有聯絡人..."
sleep 1
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-contact-001",
    "name": "測試聯絡人（已更新）",
    "firstName": "測試更新",
    "lastName": "聯絡人",
    "email": "test001-updated@example.com",
    "phone": "+886987654321",
    "tags": ["潛在客戶", "體驗課", "高優先", "已更新"],
    "source": "GoHighLevel 測試"
  }')

HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS/d')

echo "HTTP 狀態碼: $HTTP_STATUS2"
echo "回應內容:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""

if [ "$HTTP_STATUS2" = "200" ]; then
  echo "✅ 測試 2 成功！"
else
  echo "❌ 測試 2 失敗（HTTP $HTTP_STATUS2）"
fi
echo ""

# 測試 3: 發送另一個新聯絡人
echo "📤 測試 3: 發送另一個新聯絡人..."
sleep 1
RESPONSE3=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-contact-002",
    "name": "王小華",
    "email": "wang@example.com",
    "phone": "+886922334455",
    "tags": ["Facebook 廣告"],
    "source": "Facebook",
    "customFields": {
      "interest": "流行歌",
      "level": "初學"
    }
  }')

HTTP_STATUS3=$(echo "$RESPONSE3" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY3=$(echo "$RESPONSE3" | sed '/HTTP_STATUS/d')

echo "HTTP 狀態碼: $HTTP_STATUS3"
echo "回應內容:"
echo "$BODY3" | jq '.' 2>/dev/null || echo "$BODY3"
echo ""

if [ "$HTTP_STATUS3" = "200" ]; then
  echo "✅ 測試 3 成功！"
else
  echo "❌ 測試 3 失敗（HTTP $HTTP_STATUS3）"
fi
echo ""

# 測試 4: 錯誤處理（缺少 ID）
echo "❌ 測試 4: 錯誤處理（預期失敗）..."
RESPONSE4=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "無效聯絡人",
    "email": "invalid@example.com"
  }')

HTTP_STATUS4=$(echo "$RESPONSE4" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY4=$(echo "$RESPONSE4" | sed '/HTTP_STATUS/d')

echo "HTTP 狀態碼: $HTTP_STATUS4"
echo "回應內容:"
echo "$BODY4" | jq '.' 2>/dev/null || echo "$BODY4"
echo ""

if [ "$HTTP_STATUS4" = "400" ]; then
  echo "✅ 測試 4 成功（正確拒絕無效資料）"
else
  echo "⚠️  測試 4: HTTP $HTTP_STATUS4（預期為 400）"
fi
echo ""

# 總結
echo "=========================================="
echo "📊 測試總結"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 在 Supabase Dashboard 檢查資料："
echo "   SELECT * FROM gohighlevel_contacts ORDER BY created_at DESC;"
echo ""
echo "2. 查看前端頁面："
echo "   ${DOMAIN}/leads/gohighlevel"
echo ""
echo "3. 檢查統計資料："
echo "   curl -s ${DOMAIN}/api/gohighlevel/stats"
echo ""
