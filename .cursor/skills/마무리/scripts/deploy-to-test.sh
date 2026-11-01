#!/usr/bin/env bash
# 「마무리」 자동 배포: 현재 tip을 399에 맞춘 뒤 test-frontend·test-backend에 merge·push한다.
# 사용자가 「마무리」라고 말하면 이 스크립트 실행이 사전 승인된 배포다. 따로 묻지 않는다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

# macOS에서 Xcode 라이선스 미동의로 /usr/bin/git이 실패할 수 있음
if [[ -x /Library/Developer/CommandLineTools/usr/bin/git ]]; then
  export DEVELOPER_DIR="${DEVELOPER_DIR:-/Library/Developer/CommandLineTools}"
  GIT=/Library/Developer/CommandLineTools/usr/bin/git
else
  GIT=git
fi

INTEGRATION="399-feature-altsis-next-project-update-to-v20"
TEST_BRANCHES=(test-frontend test-backend)

current_branch="$($GIT branch --show-current)"
if [[ -z "$current_branch" ]]; then
  echo "detached HEAD에서는 배포하지 않습니다." >&2
  exit 1
fi

# 작업 브랜치가 399가 아니면 먼저 푸시만 하고, 호출자가 399 반영을 끝낸 뒤 다시 돌린다.
if [[ "$current_branch" != "$INTEGRATION" ]]; then
  echo "현재 브랜치가 $INTEGRATION 가 아닙니다 ($current_branch)."
  echo "SKILL의 Land on 399를 끝낸 뒤 이 스크립트를 다시 실행하세요."
  exit 2
fi

$GIT fetch -q origin "$INTEGRATION" test-frontend test-backend
$GIT push -q origin "$INTEGRATION"

TIP="$($GIT rev-parse HEAD)"
echo "TIP=$TIP"

start_branch="$current_branch"
for B in "${TEST_BRANCHES[@]}"; do
  $GIT checkout -q "$B"
  $GIT pull -q --ff-only "origin" "$B"
  if $GIT merge-base --is-ancestor "$TIP" HEAD; then
    echo "${B}_has_tip=yes (already)"
  else
    $GIT merge --no-ff "$INTEGRATION" -m "Merge branch '$INTEGRATION' into $B"
    if ! $GIT push origin "$B"; then
      echo "${B}_push=failed — 배포 PR이 필요합니다." >&2
      $GIT checkout -q "$start_branch"
      exit 3
    fi
  fi
  if $GIT merge-base --is-ancestor "$TIP" HEAD; then
    echo "${B}_has_tip=yes"
  else
    echo "${B}_has_tip=no" >&2
    $GIT checkout -q "$start_branch"
    exit 4
  fi
done

$GIT checkout -q "$start_branch"
echo "deploy_ok=yes"
echo "TIP=$TIP"
