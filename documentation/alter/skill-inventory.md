# Alter 스킬 전수 조사 (0단계)

- 기준: `cursor/alter-n4-followup-1f65` 위 코드
- 상태: 1단계 게이트가 읽는 분류. form-draft는 2단계 디스패치와 확인 카드를 탄다. 나머지 작성형 실행은 아직 기존 HTTP 경로다.
- 기계가 읽는 목록: `backend/src/alter/skills/catalog.js`와 각 `defineTool` / `defineSkill`의 `meta`
- 문서를 따로 둔 이유: 원인 메모(P-1~P-4), 역할 매핑, 학생 권한, 감사 로그처럼 실행 메타데이터가 아닌 조사 결과가 있다. 허용 판단에 쓰는 필드(kind, channel, 역할, 플래그, 확인, 학생 허용)는 코드가 기준이다.

## 분류 규칙

| 필드 | 값 |
|---|---|
| kind | `read` 읽기, `draft` 초안(저장 안 함), `write` 실제 저장 |
| channel | `tool` 도구 통로, `dispatch` 스킬 호출 통로. 읽기는 `tool`, 초안·저장은 `dispatch` |
| confirmation | `read` → `none`. 초안·비용 낮음 → `before_apply`. 초안·비용 높음과 `write` → `both`. `write`를 더 약하게 두면 로드 시 실패 |
| studentAllowed | 이번 범위의 새 스킬은 `false`. 화면 요약만 기존처럼 학생 역할이 있다 |
| 플래그 | 역할보다 먼저. owner 포함 전원 거부 |

`generate_image`는 지금 도구로 호출된다. 메타데이터의 `intendedChannel`은 `dispatch`다. 통로를 바꾸는 작업은 3단계다. 1단계에서 목록에서 빼지 않는다.

## 도구 (채널 tool)

| id | kind | 역할 | 플래그 | 확인 | 학생 | 비용 | 데이터 범위 |
|---|---|---|---|---|---|---|---|
| get_my_todos | read | owner, admin, manager, teacher | | none | 아니오 | low | 자기 보드·수업 할 일 |
| search_product_guide | read | 위와 같음 | | none | 아니오 | low | 제품 안내 |
| manage_schedule | read | 위와 같음 | | none | 아니오 | low | 자기 예약 제안. 채팅만 (`includeScheduleTool`) |
| get_trigger_events | read | 위와 같음 | | none | 아니오 | low | 이벤트 러너 대기 항목 |
| search_school_data | read | 위와 같음 | | none | 아니오 | low | 채팅 전용 학사 검색. 제출 표는 제외 |
| lookup_credit_rules | read | 위와 같음 | | none | 아니오 | low | 학교 라이브러리 학점 규정. 채팅만 |
| get_current_screen | read | 위 + student | | none | 예 | low | 이번 턴의 화면 유형·라벨 |
| get_pending_approvals | read | staff·teacher | | none | 아니오 | low | 자기 결재 대기 |
| get_form_submission_status | read | staff·teacher | | none | 아니오 | low | 맡거나 관리하는 수업·볼 수 있는 보드 |
| get_calendar | read | staff·teacher | | none | 아니오 | low | 그 학교의 학교 일정 |
| get_my_courses | read | staff·teacher | | none | 아니오 | low | 시간·강의실·수강 인원 |
| web_search | read | staff·teacher | webSearchEnabled | none | 아니오 | low | 공개 웹. 연락처 마스킹. 하루 20회 |
| generate_image | draft | staff·teacher | imageGenEnabled | both | 아니오 | high | 채팅만. 첨부 1장. 하루 10회. 실행 통로는 아직 tool |

staff·teacher = owner, admin, manager, 학기 교사.

## 절차 스킬 (defineSkill, 채널 tool)

메시지에 id가 있거나 러너가 id를 받으면 그 `allowedTools`만 남긴다.

| id | 허용 도구 | 역할 | 학생 |
|---|---|---|---|
| fixture-brief | get_my_todos | staff·teacher | 아니오 |
| school-search | search_school_data | staff·teacher | 아니오 |
| credit-rules | lookup_credit_rules | staff·teacher | 아니오 |
| screen-summary | get_current_screen | staff·teacher, student | 예 |

## 화면 칩의 작성형 스킬 (채널 dispatch, 이번 단계에서는 실행하지 않음)

| id | kind | 역할 | 확인 | 학생 | 화면 |
|---|---|---|---|---|---|
| syllabus-draft | draft | staff·teacher | before_apply | 아니오 | syllabus-edit |
| evaluation-draft | draft | staff·teacher | before_apply | 아니오 | evaluation |
| archive-draft | draft | staff·teacher | before_apply | 아니오 | archive |
| document-draft | draft | staff·teacher | before_apply | 아니오 | document |
| document-review | draft | staff·teacher | before_apply | 아니오 | docs |
| form-response-draft | draft | staff·teacher | before_apply | 아니오 | form-response |
| activity-draft | draft | staff·teacher | before_apply | 아니오 | activity |
| form-draft | draft | owner, admin, manager | before_apply | 아니오 | form-editor |
| assessment-grade | draft | staff·teacher | before_apply | 아니오 | assessment-grade |

`executeFormDraftSkill`은 아직 `user.auth`가 admin 또는 manager일 때만 실행한다. owner는 레지스트리에는 있고, HTTP 실행 함수에는 아직 없다. 2단계에서 게이트로 맞춘다.

칩 `chat`과 `agent`는 스킬 제한이 아니다. `search` 칩은 `search_school_data`를 쓰는 기존 검색 러너다.

## 역할 매핑

별도 auth 값 「교사」는 없다.

| 기획 역할 | 코드 |
|---|---|
| owner | `user.auth === "owner"` |
| admin | `user.auth === "admin"` (모든 학교의 학교 관리자) |
| manager | `user.auth === "manager"` 또는 그 학교 `schoolAuth === "manager"` |
| teacher | `registration.role === "teacher"` 이고 위 관리자가 아님 |
| member | 그 외 계정 |
| student | `registration.role === "student"` 또는 `user.auth === "student"` |

도구에 적힌 `teacher`는 학기 교사만이 아니라 owner·admin·manager·교사로 펼친다. 기존 채팅 입구와 같다.

## 학생 권한 (Q2)

라이브 Alter 입구 `resolveChatContext`는 역할이 student이면 `aiConfig.permission`을 보기 전에 403을 던진다. 학생 예외 허용은 이 입구에 닿지 않는다. 이번 변경은 그 입구를 그대로 둔다.

게이트는 `studentAllowed !== true`인 스킬·도구를 학생에게 목록과 실행 모두에서 거절한다. 예외는 `get_current_screen` / `screen-summary`뿐이다. 새 디스패치 스킬은 전부 `studentAllowed: false`다.

## 학원 플래그

`academyAiFlags.js`의 키는 `alterEventTriggersEnabled`, `webSearchEnabled`, `imageGenEnabled`다. 기본은 꺼짐. owner만 값을 바꾼다. 읽기 게이트는 플래그를 역할보다 먼저 보고, 꺼져 있으면 owner도 거부한다.

학년도 시작일을 학원 설정으로 둔 필드는 없다. `Season.year`는 표시용이다. 감사 로그 만료는 학년도가 없으면 3월 1일을 경계로 계산한다 (`core/auditRetention.js`).

## 감사 로그 (Q7, 설계만)

전용 감사 컬렉션은 없다. AI 사용량은 `logAIUsage`, 웹 검색은 마스킹된 검색어만 로그에 남긴다. 원문 프롬프트는 남기지 않는다.

보존·열람 필드는 `core/auditRetention.js`에 있다. 2026학년도 기록은 2027학년도가 끝나는 시점(기본 2028-02-29)에 만료된다. owner는 전체, admin은 자기 학원 요약(비용 추정 제외), manager 이하는 열람 없음. 삭제 배치와 열람 API는 4단계다.

## P-1 ~ P-4

| # | 원인 | 이번 처리 |
|---|---|---|
| P-1 | 에이전트 모드에는 작성형 디스패치가 없다. 양식 칩은 `executeFormDraftSkill`로 따로 간다. | 2단계. 메타데이터만 등록 |
| P-2 | 스킬 id로 도구를 좁히는 코드가 eval의 `executeTurn`에만 있었다. 라이브 `runChatAgent`는 도구 전체를 넘겼다. | 라이브와 eval 채팅이 `runners/chat` → `prepareGatedTurn` → `evaluateSkillAccess`를 같이 쓴다 |
| P-3 | 대화 목록은 저장되지만 열린 id는 React state뿐이었다. | 브라우저 저장 + `PUT/GET /ai/alter/conversations/active` |
| P-4 | 챗봇 칩은 도구가 없는 LLM 턴이다. 웹 검색 도구는 에이전트 목록에만 있고, 플래그가 꺼지면 그 목록에서도 빠진다. 플래그 미적용이 아니다. | 챗봇에 웹 검색을 붙이는 일은 3단계. 1단계는 에이전트 경로의 플래그 거부를 owner까지 맞춘다 |

## 확인 카드

칩 없이 초안을 제안하는 카드, 실행 전 확인, 반영 전 확인은 2단계다. 게이트는 디스패치 스킬의 실행 단계에서 `needs_confirmation`을 돌려 그 흐름이 붙을 자리를 남겨 둔다. 1단계에서는 디스패치 스킬을 에이전트 도구로 열지 않는다.
