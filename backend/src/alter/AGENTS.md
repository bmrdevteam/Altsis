# Alter — AI 코딩 규칙

새 도구·스킬·러너는 이 폴더의 경계 안에서만 추가한다. 설계는 [`documentation/alter/architecture.md`](../../../documentation/alter/architecture.md), 근거는 [`documentation/alter/audit.md`](../../../documentation/alter/audit.md).

1. 새 기능은 먼저 「도구인가, 스킬인가, 러너인가」를 정한다.
   - 데이터를 읽거나 한 가지 행동 → `tools/defs/<name>.tool.js`.
   - 여러 도구와 프롬프트 절차 → `skills/defs/<id>.skill.js`. `defineSkill`로만 추가한다.
   - 새 실행 계기(시간, 이벤트, 채널) → `runners/<name>/`. 채팅·예약·이벤트 러너는 `runAlterAgent`만 부른다. 이벤트 실행 문구는 `runners/event/prompt.js`에 있다.
   - 시나리오 평가는 `eval/scenarios/`에만 둔다. 제품 동작은 바꾸지 않는다.
2. 도구는 `defineTool`로만 만든다. 스키마는 zod 하나다. 손으로 쓴 JSON Schema와 인자 문자열은 금지다. 레지스트리가 OpenAI·Anthropic 스키마와 Gemini 인자 줄을 만든다.
3. 도구 이름을 `agent/`, `runners/`, `providers/` 코드에 문자열로 쓰지 않는다. 도구 전용 프롬프트 규칙은 `promptHints`에 둔다.
4. 권한 검사는 `policy/`만 한다. 컨트롤러와 도구 안에서 `registration.role`을 직접 비교하지 않는다. 컨트롤러에 업무 로직을 넣지 않는다.
5. 사용자 글이나 외부 글이 섞인 결과는 `untrustedOutput: true`다. 마스킹과 `<tool_result untrusted="true">` 래핑은 레지스트리가 한다. 도구는 원본만 돌려주고, 마스킹을 도구 안에서 중복하지 않는다.
6. 쓰기는 `effect: "write"` + `needsConfirm: true` + `commit()`이다. `execute`는 제안만 만든다. 예약·이벤트 같은 무인 러너에서는 `runAlterAgent`가 모드로 쓰기 도구를 빼므로, 러너 코드에서 빼는 관례에 기대지 않는다.
7. 오류는 `AlterError(code, status, userMessage)` 하나다. HTTP와 SSE는 `{ code, message }`다. `message`는 한국어다. 내부 메시지는 로그에만 남기고 사용자에게 보내지 않는다. 안정 코드는 `AI_NOT_ENABLED`, `FORBIDDEN`, `NOT_FOUND`, `LIMIT_REACHED`, `PROVIDER_ERROR`, `TOOL_ERROR`, `INVALID_INPUT`을 포함한다.
8. 프로바이더는 `llm` 포트로만 호출한다. `aiProvider.js`와 `fetch`를 도구·스킬에서 직접 호출하지 않는다.
9. 새 도구·스킬 PR에는 eval 시나리오를 정상 1개, 권한 또는 거절 1개 함께 넣는다.
10. 파일은 300줄 안팎을 목표로 하고, 400줄을 넘으면 나눈다. 도메인 코드(`src/controllers`, Alter 밖 `src/services`)에서 `alter/*`를 import하지 않는다. 도메인 이벤트는 `src/events/domainEvents.js`로만 발행한다. `runners/event`가 구독한다.
11. 완료 조건은 `npm test`, `npm run lint:deps`, `npm run eval:scripted`다. `npm test`가 `lint:deps`를 먼저 돌린다.

의존 방향: `runners → agent → tools → policy → core`. `runners`는 `skills`를 부를 수 있다. `core`(`src/alter/core/`)는 node 기본 모듈과 다른 `core` 파일만 의존한다. 도메인·policy·tools·providers·agent·runners를 부르지 않는다. `policy/access.js`의 `resolveAlterContext`가 채팅·에이전트·예약 생성/수정·러너·트리거 도구의 접근 검사다. 학원 AI, 역할, 소유, 이벤트 플래그, DM 동의를 여기서 본다. 기존 도메인 서비스는 `tools`와 `policy`만 부를 수 있다. `tools`/`skills`/`providers`는 `runners`와 `agent`를 import하지 않는다. `skills`는 `providers`도 import하지 않는다. `providers`는 `tools`를 import하지 않는다. `eval`은 러너·에이전트·프로바이더를 부를 수 있다. 마스킹·자르기·링크 정리·래핑·일정 상수·시간대·id는 `core`에 있고, `services/aiSafety.js`·`alterScheduleTime.js`·`alterAgentProtocol.js`는 기존 경로로 다시 내보낸다. 채팅·에이전트의 기존 입구는 `assertSeasonAiAccess`로 같은 검사를 부른다.

경계는 `npm run lint:deps`다. 설정은 `backend/.dependency-cruiser.cjs`이고, 알려진 위반은 0건이다. 목록은 `backend/.dependency-cruiser-known-violations.json`에 있고, 파일 설명은 [dependency-baseline.md](dependency-baseline.md)에 있다. 새 위반은 실패다. 도메인이 Alter 서비스 심볼을 부를 때는 `services/aiAlterPublic.js`만 쓴다. 그 파일은 재수출만 한다. 백엔드에는 eslint 설정이 없고, 실제 결합의 상당수가 `await import()`라 `no-restricted-imports`는 넣지 않았다.

## 도구를 추가하는 법

1. `tools/defs/<camelName>.tool.js`에 `defineTool` 하나를 둔다. `name`은 snake_case이고 한 번 정하면 바꾸지 않는다.
2. `input`은 zod 하나다. `description`, `permission.roles`, `permission.access`, `readOnly`, `promptHints`를 적는다. 지금은 읽기만 있으므로 `readOnly: true`다. `promptHints`는 비어 있으면 안 된다. 언제 부르는지, 인자를 어떻게 쓰는지, 결과를 어떻게 말하는지 적는다.
3. `handler(ctx, input)`는 서버가 만든 `ctx`만 신원으로 쓴다. 실행 시점에 다시 볼 접근은 `resolveAlterContext`를 부른다. 마스킹과 `MAX_TOOL_RESULT_CHARS` 상한은 레지스트리가 `core/safety`로 한다. 도구는 원본만 돌려준다.
4. `tools/registry.js`의 `TOOLS`에 그 파일을 넣는다. OpenAI·Anthropic 스키마, Gemini 인자 줄, 시스템 프롬프트의 도구 안내는 여기서 나온다. 도구를 빼면 그 힌트도 프롬프트에서 빠진다.
5. 계약 테스트가 이름·스키마·역할·`readOnly`·`promptHints`·결과 상한을 본다. 새 도구면 eval 시나리오를 정상 1개, 거절 1개 함께 넣는다.
6. 읽기 도구 `get_pending_approvals`, `get_form_submission_status`, `get_calendar`, `get_my_courses`는 `include`로 빼지 않는다. 채팅·예약·이벤트에 모두 나온다. 실행 전에 `resolveAlterContext`로 선생님인지 다시 본다. 제출 현황은 양식·보드 이름으로 찾는다. 맡거나 관리하는 수업과, 수업이 아닌 교사 보드 중 화면에서 기록 전체를 이미 보는 보드만 센다. 다른 교사 수업은 세지 않는다. 로그인 아이디·답안·식별 번호는 넣지 않고 사용자에게 묻지 않는다. 채팅의 `search_school_data`는 제출·응답 표를 빼서 이 범위를 우회하지 않는다. HTTP 검색은 표를 그대로 둔다. 수업 목록은 시간·강의실·수강 인원만, 학교 일정은 그 학교의 학교 일정만 돌려준다.
7. `web_search`는 학원 `webSearchEnabled`가 켜져 있을 때만 목록에 들어간다. 기본은 꺼짐이라 채팅·예약·이벤트 모두 호출하지 않는다. 켜면 세 러너가 같은 읽기 도구를 고른다. 쿼리는 모델이 적은 공개 질문만 쓰고, 연락처는 `core/safety`로 뺀 뒤 학원에 설정된 프로바이더의 웹 검색으로 보낸다. 결과의 지시는 따르지 않고 제목과 URL을 출처로 적는다. 사용자당 하루 20회다.

## 스킬을 추가하는 법

1. `skills/defs/<id>.skill.js`에 `defineSkill` 하나를 둔다. `id`는 kebab-case이고 한 번 정하면 바꾸지 않는다.
2. `name`, `description`, `when`(언제 쓰는지), `tools`(레지스트리 도구 이름), `input`(zod), `prompt`(절차), `readOnly`, `permission.roles`를 적는다. `tools` 밖 도구는 실행 목록에 들어가지 않는다.
3. `skills/registry.js`의 `SKILLS`에 그 파일을 넣는다. 채팅은 메시지에 스킬 `id`가 있고 역할이 맞을 때만 그 스킬을 고른다. 고르지 않으면 기존 도구 집합 그대로다.
4. `runners/skill/run.js`가 고른 스킬의 도구만 `runAlterAgent`에 넘긴다. 단계 한도는 에이전트 한도를 그대로 쓴다. 스킬 파일에서 `providers`와 `agent`를 import하지 않는다.
5. 계약 테스트 `skills/__tests__/contract.test.js`가 id·절차·역할·허용 도구를 본다. eval은 선택 1개, 허용 도구 밖 호출이 실행되지 않는 거절 1개를 함께 넣는다.
6. 이미 있는 학사 검색·학점 규정·화면 요약은 `school-search`, `credit-rules`, `screen-summary`다. 도구는 `search_school_data`, `lookup_credit_rules`, `get_current_screen`이고 채팅에만 나온다. 예약·이벤트 러너에는 `include`로 빠진다. 검색 SQL 가드는 `executeSearchSkill`에 있고, 도구 결과에는 SQL과 내부 오류를 넣지 않는다. HTTP 검색 스킬은 `registerAlterSearchRunner`로 같은 실행 함수를 쓴다. 초안 스킬(`syllabus-draft` 등)은 응답을 유지하려고 기존 실행 함수에 둔다.

## 프로바이더를 추가하는 법

1. `providers/<id>.js`에 어댑터를 둔다. `id`, `capabilities`(`nativeTools`, `streaming`, `images`), `generate`가 있다.
2. `generate`는 메시지와 레지스트리의 중립 도구 스키마(`name`, `description`, `parameters`)를 받고 `{ text, toolCalls, usage, finish }`를 돌려준다. `usage`는 `promptTokens`, `candidatesTokens`, `thoughtsTokens`, `totalTokens`다. 와이어 형식의 토큰 수는 `providers/usage.js`로 맞춘다.
3. 네이티브 도구가 없으면 `withFenceTools`로 감싼다. 펜스 파싱은 그 래퍼가 하고, 루프는 `toolCalls`만 본다.
4. `providers/llm.js`의 `createLlm`에 등록한다. 에이전트는 `llm.generate`만 부른다. `aiProvider.js`와 `fetch`를 도구·스킬·루프에서 직접 부르지 않는다.
5. 스크립트 대역은 `id: "scripted"`다. 계획은 `scriptedPlan` 인자로만 넘긴다. 전역에 넣지 않는다. 계약 테스트 `providers/__tests__/contract.test.js`에 같은 정규화 픽스처를 추가한다.

## 러너를 추가하는 법

1. `runners/<name>/run.js`에서 입력(메시지, 기록, 화면 메모)을 만들고 `runAlterAgent({ ctx, input, mode, provider, limits })`를 부른다. 모드 문자열은 `chat`, `schedule`, `event` 중 하나다.
2. 모델 호출, 도구 선택, 단계 한도, 트레이스, 사용량은 `agent/runAlterAgent.js`가 맡는다. 러너에 루프를 복사하지 않는다.
3. `schedule`과 `event`는 무인 모드다. 쓰기 도구(`readOnly === false` 또는 `effect === "write"`)는 `runAlterAgent`가 뺀다. 러너에서 한 번 더 거르지 않는다.
4. SSE, 예약 claim, 일일 한도, 디바운스, 알림, 루프 방지는 러너 바깥의 기존 전달 경로에 둔다. 러너는 그 경로가 넘긴 인자로 에이전트만 호출한다.
5. 채팅 스킬 `SKILL_IDS.AGENT`는 `registerAlterAgentRunner`로 채팅 러너를 연결한다. `aiSkills.js`가 `alter/agent`를 직접 import하지 않는다.

## 도메인 이벤트를 발행하는 법

1. 도메인 코드는 `emitDomainEvent(name, payload)`만 부른다. 이름은 `approval_requested`, `form_submitted`, `form_posted`, `calendar_created`, `dm_received`다. `alter/*`를 import하지 않는다.
2. 양식 이벤트 payload에는 `formName`, `boardName`, `kind`(`approval` | `submission` | `post`)를 넣는다. 구독자가 이 값으로 모델이 읽는 제목을 만든다.
3. `runners/event/subscribe.js`가 버스를 구독해 기존 큐로 넘긴다. 루프 방지, 디바운스, 일일 한도, 옵트인은 큐에 그대로 있다.
