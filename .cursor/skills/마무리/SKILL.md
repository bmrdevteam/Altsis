---
name: 마무리
description: >-
  작업 마무리 시 코드 정리·셀프 코드 리뷰·테스트·한글 커밋·푸시까지 순서대로 실행한다.
  Use when the user says 「마무리」, wrap-up, finish up, or asks to clean up, review,
  commit, and push current work.
---

# 「마무리」 워크플로

사용자가 **마무리**라고 말하면 아래를 **순서대로** 실행한다. 따로 물어보지 않는다.

PR 생성은 「마무리」에 포함하지 않는다. PR은 사용자가 따로 요청할 때만 한다.

## 실행 순서

1. **작업 중 불필요 코드 정리** — [Cleanup](#1-cleanup)
2. **셀프 코드 리뷰** — [Code Review](#2-code-review) (기준·출력 형식 준수)
3. **테스트** — [Test](#3-test)
4. **커밋 메시지 (한글)** — [Commit](#4-commit)
5. **커밋** — 관련 파일만 stage 후 커밋
6. **푸시** — [Push](#5-push)

Critical Issues가 있으면 커밋·푸시하지 말고 수정한 뒤 리뷰·테스트를 다시 통과시킨다.

---

## 1. Cleanup

이번 변경분(스테이징·미커밋·관련 최근 작업)을 훑어 아래를 제거·정리한다. 동작이 바뀌지 않게 유지한다.

- 미사용 import·변수·함수·컴포넌트·CSS 클래스·deprecated 별칭
- 임시 디버그 코드(`console.log` 등), 주석 처리된 죽은 코드, 작업 중 남은 TODO 스텁
- 중복 로직·같은 헬퍼의 불필요한 복사본(공통화가 안전하면 통일)
- 제품만 바뀐 잔여 문구/주석(예: 옛 기능명)과 더 이상 쓰이지 않는 prop·타입 export
- 정리할 내용이 없으면 이 단계는 짧게 확인하고 넘어간다.

---

## 2. Code Review

변경분을 Elite Lead / Repository Maintainer 관점으로 리뷰한다. 품질·아키텍처·보안·유지보수성에 타협하지 않는다.

상세 기준·출력 템플릿은 [`.agents/rules/code-quality-standards.md`](../../../.agents/rules/code-quality-standards.md)를 **그대로** 따른다 (요약 포인터: [review-standards.md](review-standards.md)).

개발 중에도 동일 기준이 Cursor always-apply 규칙(`.cursor/rules/code-quality-standards.mdc`)과 `AGENTS.md`로 적용된다.

### 이 단계에서의 동작

1. `git diff` / 관련 파일로 변경 범위 파악
2. 6 pillars로 평가 (Architecture, Security, Performance, Testing, Docs, A11y)
3. 기준 문서의 **Review Output Format**으로 리뷰 결과를 사용자에게 제시
4. **Critical Issues**가 있으면 즉시 수정 → 재리뷰
5. Status가 `CHANGES REQUESTED`이면 커밋·푸시로 진행하지 않음
6. `APPROVED` 또는 Critical 없는 `COMMENT`만 다음 단계로

---

## 3. Test

변경 범위에 맞는 검증 실행.

- 프론트 변경: `cd frontend && yarn test --watchAll=false` (관련 테스트가 있으면 해당 패턴 우선). 테스트가 없거나 부적절하면 타입/빌드 등 가능한 최소 검증을 시도하고 결과를 보고한다.
- 백엔드 변경: `cd backend && yarn test` (관련 경로가 있으면 해당 테스트 우선).
- 테스트 실패 시 커밋·푸시하지 말고 원인을 고치거나 보고한다.

---

## 4. Commit

1. 저장소 최근 커밋 스타일을 따르고, 한글 1–2문장으로 **왜** 바꿨는지 쓴다.
2. 관련 파일만 stage 후 커밋. 비밀·환경 파일은 넣지 않는다.
3. 커밋할 변경이 없으면 커밋을 건너뛴다.
4. Git Safety Protocol(훅 스킵 금지, force/amend 규칙 등)을 지킨다.

---

## 5. Push

현재 브랜치를 remote에 `git push` (필요 시 `-u`). force push는 사용자가 명시한 경우에만.
