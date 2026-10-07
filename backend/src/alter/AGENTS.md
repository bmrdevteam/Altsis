# Alter — AI 코딩 규칙

새 도구·스킬·러너는 이 폴더의 경계 안에서만 추가한다. 설계는 [`documentation/alter/architecture.md`](../../../documentation/alter/architecture.md), 근거는 [`documentation/alter/audit.md`](../../../documentation/alter/audit.md).

1. 새 기능은 먼저 「도구인가, 스킬인가, 러너인가」를 정한다.
   - 데이터를 읽거나 한 가지 행동 → `tools/defs/<name>.tool.js`
   - 여러 도구와 프롬프트 절차 → `skills/defs/<id>.skill.js`
   - 새 실행 계기(시간, 이벤트, 채널) → `runners/<name>/`
   - 시나리오 평가는 `eval/scenarios/`에만 둔다. 제품 동작은 바꾸지 않는다.
2. 도구는 `defineTool`로만 만든다. 스키마는 zod 하나다. 손으로 쓴 JSON Schema와 인자 문자열은 금지다. (zod와 레지스트리는 P5. 그 전에는 기존 `services/alterAgentTools.js`를 늘리지 말고, 옮길 준비를 이 규칙에 맞춘다.)
3. 도구 이름을 `agent/`, `runners/`, `providers/` 코드에 문자열로 쓰지 않는다. 도구 전용 프롬프트 규칙은 `promptHints`에 둔다.
4. 권한 검사는 `policy/`만 한다. 컨트롤러와 도구 안에서 `registration.role`을 직접 비교하지 않는다. 컨트롤러에 업무 로직을 넣지 않는다.
5. 사용자 글이나 외부 글이 섞인 결과는 `untrustedOutput: true`다. 마스킹과 `<tool_result untrusted="true">` 래핑은 레지스트리가 한다. 도구는 원본만 돌려주고, 마스킹을 도구 안에서 중복하지 않는다.
6. 쓰기는 `effect: "write"` + `needsConfirm: true` + `commit()`이다. `execute`는 제안만 만든다. 예약·이벤트 같은 무인 러너에서는 쓰기 도구를 고르지 않는다.
7. 오류는 `AlterError(code, status, userMessage)` 하나다. HTTP와 SSE는 `{ code, message }`다. 내부 메시지는 로그에만 남기고 사용자에게 보내지 않는다. (통일은 P10. 새 코드는 이 계약을 먼저 따른다.)
8. 프로바이더는 `llm` 포트로만 호출한다. `aiProvider.js`와 `fetch`를 도구·스킬에서 직접 호출하지 않는다.
9. 새 도구·스킬 PR에는 eval 시나리오를 정상 1개, 권한 또는 거절 1개 함께 넣는다.
10. 파일은 300줄 안팎을 목표로 하고, 400줄을 넘으면 나눈다. 도메인 코드(`src/controllers`, Alter 밖 `src/services`)에서 `alter/*`를 import하지 않는다. 알림은 `src/events/domainEvents.js`로만 발행한다.
11. 완료 조건은 `npm test`와 `npm run eval:scripted`다. `npm run lint:deps`는 P2에서 추가되며, 그 뒤로는 세 명령이 모두 통과해야 한다.

의존 방향: `runners → agent → tools → policy → core → 기존 도메인`. `tools`/`skills`/`providers`는 `runners`와 `agent`를 import하지 않는다. `providers`는 `tools`를 import하지 않는다. `eval`은 러너·에이전트·프로바이더를 부를 수 있다.
