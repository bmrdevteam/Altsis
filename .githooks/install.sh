#!/bin/bash

# Git hooks 설치 스크립트
# 이 스크립트는 .githooks 폴더의 hook들을 .git/hooks로 복사합니다

echo "🔧 Git hooks 설치 중..."

# .githooks 폴더의 모든 파일을 .git/hooks로 복사
for hook in .githooks/*; do
  if [ -f "$hook" ] && [ "$(basename "$hook")" != "install.sh" ] && [ "$(basename "$hook")" != "README.md" ]; then
    hook_name=$(basename "$hook")
    cp "$hook" ".git/hooks/$hook_name"
    chmod +x ".git/hooks/$hook_name"
    echo "✅ $hook_name 설치 완료"
  fi
done

echo ""
echo "✨ Git hooks 설치가 완료되었습니다!"
echo ""
echo "📋 설치된 hooks:"
ls -1 .git/hooks/ | grep -v ".sample" || echo "   (없음)"
echo ""
