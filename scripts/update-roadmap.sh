#!/bin/bash
# 自動更新路線圖時間戳記
# 使用方式: ./scripts/update-roadmap.sh "完成項目描述"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
TASK_DESC="$1"

# 更新 ROADMAP.md 的時間戳記
sed -i "s/> \*\*最後更新\*\*:.*/> **最後更新**: $TIMESTAMP/" ROADMAP.md

# 更新 TODAY.md 的時間戳記
sed -i "s/> \*\*更新時間\*\*:.*/> **更新時間**: $TIMESTAMP/" TODAY.md

echo "✅ 路線圖已更新: $TIMESTAMP"

if [ -n "$TASK_DESC" ]; then
    echo "📝 完成項目: $TASK_DESC"
fi
