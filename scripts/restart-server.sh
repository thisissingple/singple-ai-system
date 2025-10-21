#!/bin/bash

echo "🔄 重新啟動伺服器..."

# 殺掉現有的 tsx 進程
pkill -f 'tsx server/index.ts' || echo "沒有運行中的伺服器"

# 等待進程結束
sleep 2

# 啟動開發伺服器
echo "🚀 啟動開發伺服器..."
npm run dev
