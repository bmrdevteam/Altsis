# Alter 아키텍처 설계 (v0.1)

- 기준 코드: `81604f1` (`cursor/alter-event-trigger-fd17`, #419·#420·#421 포함)
- 근거: [`audit.md`](./audit.md) (파일·라인 근거). 이 문서는 **구조만** 다룹니다.
- 상태: 승인됨. 「열린 결정」의 권장 기본값 D1–D15를 모두 채택했다.
- 인용: `81604f1`에서 다시 확인했다. `assertScheduleTeacher`는 alterScheduleService.js:29에서 시작한다(:26은 `isScheduleTeacher`).

---

## 1. 목표 / 비목표

### 목표
1. **도구(Tool)는 한 곳에서 한 번만 정의합니다.** 이름, 설명, 입력 스키마, 출력 모양, 권한, 부작용, 확인 필요 여부, 비용 등급, 신뢰불가 출력 여부를 한 객체에 둡니다. 네이티브 도구, Gemini 펜스, 스크립트 프로바이더, MCP 노출, 평가 테스트가 모두 이 정의를 읽습니다.
2. **스킬(Skill)은 도구와 프롬프트를 묶은 절차입니다.** 학원별로 켜고 끌 수 있고 설정할 수 있습니다. 기존 비에이전트 스킬(강의계획서·평가·검색 등)도 같은 틀로 옮깁니다.
3. **에이전트 진입점은 하나입니다.** 채팅 SSE, 시간 예약, 이벤트 트리거가 모두 `runAlterAgent()` 하나를 부릅니다.
4. **권한·안전 모델도 하나입니다.** 역할 검사, 학원 플래그, PII 마스킹, 「데이터일 뿐 지시가 아님」 래핑, 쓰기 확인 흐름을 공통으로 둡니다.
5. **경계는 기계가 지킵니다.** 의존 방향 린트, 도구 계약 테스트, 시나리오 평가(eval)가 CI에서 돌아갑니다. 그래서 AI가 코드를 생성해도 구조가 무너지지 않습니다.
6. **동작을 보존하며 옮깁니다.** 작은 PR로 나누고, 각 PR은 기존 테스트와 eval을 통과해야 합니다.

### 비목표 (이 문서 범위 밖)
- Alter의 장기 정체성(비서·보조교사·멘토)에 맞는 **기능·UX·페르소나 설계**. 이 구조는 그 정체성을 담을 그릇일 뿐입니다.
- 새 모델·프로바이더 선정, 요금·쿼터 정책 변경.
- 프론트엔드 전면 재작성. 확인 카드·SSE 파서 분리처럼 구조상 꼭 필요한 부분만 다룹니다.
- Mongo 스키마 대개편. `AlterSchedule`과 대화 컬렉션은 유지합니다.

---

## 2. 현재 문제 요약 (audit.md 발췌)

| # | 문제 | 근거 |
|---|---|---|
| F1 | `aiSkills.js` 6273줄. 스킬 10종, 라우터, **AI 접근 검사**까지 한 파일에 있음 | aiSkills.js:968, :5753 |
| F2 | 도구 스키마가 두 번 정의되어 이미 어긋남. Gemini는 이벤트 루틴을 제안할 수 없음 | alterAgentTools.js:354 vs :366–386 |
| F3 | 도구별 규칙이 루프 프롬프트, 러너, 스크립트 프로바이더에 흩어져 있음 | alterAgentProtocol.js:459–506, alterScheduleRun.js:87 |
| F4 | 권한 검사 구현이 4개이고 서로 다름 | aiSkills.js:968, alterScheduleService.js:29, alterEvent.js:193, controllers/ai.js:693 |
| F5 | 마스킹을 도구마다 따로 함. 이벤트 도구(DM 발췌 포함)는 마스킹 없음 | alterAgentTools.js:609, alterEventAccess.js:151 |
| F6 | 프로바이더가 테스트 대역(스크립트)을 import함. `generateText` 직접 호출이 9곳 | aiProvider.js:17, :1113 |
| F7 | 알림 인프라와 컨트롤러 5곳이 Alter를 직접 부름 | notifications.js:15, :169; chats.js:871 |
| F8 | 오류 방식 4종, HTTP 오류 모양 3종 | alterScheduleTime.js:42, controllers/ai.js:230 vs alterSchedule.js:22 |

---

## 3. 계층 구조

```
            ┌───────────────────── Runners ─────────────────────┐
            │  chat(SSE)      schedule(time)      event(trigger) │   ← HTTP/cron/큐 어댑터만
            └───────────────┬────────────────────────────────────┘
                            │ runAlterAgent(request)
            ┌───────────────▼──────────── Agent ─────────────────┐
            │ loop · tool selection · limits · trace · prompt     │
            └──────┬──────────────────────┬───────────────┬──────┘
                   │                      │               │
         ┌─────────▼──────┐     ┌─────────▼──────┐  ┌─────▼─────────┐
         │ Skills          │────▶│ Tools (registry)│  │ Providers      │
         │ 절차+프롬프트    │     │ 계약·권한·실행   │  │ openai/anthropic│
         └─────────┬──────┘     └─────────┬──────┘  │ gemini(fence)  │
                   │                      │         │ scripted       │
                   └──▶ Providers (llm 포트)          └───────────────┘
                        ※ Tools → Providers 직접 호출 금지 (ctx.llm만)
                                          │
            ┌─────────────────────────────▼──────────────────────┐
            │ Policy (권한·플래그·쿼터·확인)   Core (오류·마스킹·래핑·트레이스 타입) │
            └─────────────────────────────┬──────────────────────┘
                                          │
            ┌─────────────────────────────▼──────────────────────┐
            │ 기존 도메인 서비스 (schoolTodos, altForms, calendar, aiLibrary…) │
            └────────────────────────────────────────────────────┘
```

### 3.1 Tool 계약

도구 하나는 `alter/tools/defs/<name>.tool.js` 파일 하나입니다.

```js
// alter/tools/defs/getMyTodos.tool.js
export default defineTool({
  name: "get_my_todos",              // snake_case, 전역 유일, 바꾸지 않음
  version: 1,
  label: "내 할 일",                  // UI·트레이스용
  description: "보드 할 일(결재·채점·미제출)과 수업 할 일.",
  input: z.object({                    // zod 하나로 native schema·fence 설명·검증을 생성
    scope: z.enum(["all", "school", "course"]).default("all"),
    limit: z.number().int().min(1).max(40).default(20),
  }).strict(),
  output: TodoListOutput,              // { summary, items[], truncated, links? }
  permission: { roles: ["teacher"], flags: [], scope: "self" },
  effect: "read",                      // "read" | "propose" | "write"
  needsConfirm: false,                 // write면 항상 true (계약 테스트로 강제)
  cost: "db",                          // "cheap" | "db" | "llm" | "external"
  untrustedOutput: true,               // 결과에 사용자 작성 텍스트 포함 여부
  runners: ["chat", "schedule", "event"],
  limits: { timeoutMs: 8000, maxResultChars: 8000 },
  promptHints: [                       // 루프 프롬프트에 붙는 도구 전용 규칙 (F3 해소)
    "source=board 는 보드 양식입니다. 수업 평가는 source=course·kind=evaluation 만입니다.",
  ],
  async execute(ctx, input) { ... },   // ctx는 서버가 만든 신원·범위. 모델 인자로 신원을 받지 않음
  async commit(ctx, input) { ... },    // effect=write 전용: 확인 후에만 호출
});
```

**규칙**
- 입력 스키마는 zod 하나뿐입니다. 네이티브용 JSON Schema(`z.toJSONSchema`)와 펜스용 인자 설명은 **생성**합니다. 손으로 쓴 `arguments` 문자열은 금지합니다(F2).
- 출력은 `{ summary: string, data?, links?, proposal?, error?: { code, message } }`입니다. 도구는 예상한 실패를 `error`로 돌려주고, 예상하지 못한 예외만 throw합니다. 레지스트리가 throw를 `error: INTERNAL`로 바꿉니다.
- 마스킹과 untrusted 래핑은 **레지스트리가** 합니다. 도구는 원본 데이터만 돌려줍니다(F5).
- 도구 안에서 다음은 금지합니다:
  - 신원 인자(`userId`, `academyId`…). 기존 `IDENTITY_ARG_KEYS`처럼 레지스트리가 제거합니다.
  - 프로바이더 호출. LLM이 필요하면 `cost: "llm"`로 표시하고 `ctx.llm`을 씁니다.
  - 러너 import.

### 3.2 Skill

스킬은 「이름 붙은 절차」입니다. 도구 조합과 프롬프트 템플릿을 묶고, 학원별로 설정할 수 있습니다.

```js
// alter/skills/defs/syllabusDraft.skill.js
export default defineSkill({
  id: "syllabus-draft",
  name: "수업",
  description: "강의계획서 항목 초안",
  input: z.object({ seasonId: z.string(), focusFields: z.array(z.string()).optional() }),
  uses: ["get_syllabus_form", "get_style_rubric"],   // 읽기 도구만 선언
  prompt: { template: "syllabusDraft@v3", profile: "syllabusDraft" },
  output: SyllabusDraftOutput,                       // 프론트 draft UI가 쓰는 모양
  config: { academyFlag: null, guidelines: "school" }, // 학원·학교별 설정 키
  exposeAsTool: { name: "draft_syllabus", effect: "read", cost: "llm" },
  async run(ctx, input, { tools, llm, trace }) { ... },
});
```

- 스킬은 `tools`와 `llm` 포트만 받습니다. 프로바이더 모듈을 직접 import하지 않습니다.
- `exposeAsTool`이 있으면 레지스트리가 자동으로 도구로 등록합니다. 이렇게 해서 「기존 스킬을 에이전트가 부르는 도구로 감싸기」가 됩니다.
- 학원별 설정(`Academy`/`School.aiConfig`)은 정책 계층이 읽어서 `ctx.config.skills[id]`로 넘깁니다.
- `agent`는 더 이상 스킬이 아닙니다. 현재는 `SKILL_IDS.AGENT`(aiSkills.js:249)로 들어가 있어 계층이 뒤집혀 있습니다.

### 3.3 Agent 루프

```ts
runAlterAgent({
  ctx,            // AlterContext: academy, user, school, season, registration, role, flags, config
  runner,         // "chat" | "schedule" | "event"
  input,          // { message, history, pageNote, attachments }
  toolset?,       // 기본: registry.select({ runner, ctx })
  limits?,        // { maxToolSteps: 3, maxFormatRetries: 1, maxTokens, deadlineMs }
  onEvent?,       // step/tool/done/error (SSE용)
}) → {
  text, links, proposals[], toolNames[], tokenUsage, trace
}
```

- **도구 선택**: `registry.select()`이 다음을 모두 만족하는 도구만 고릅니다.
  - `runner` 허용 목록에 있음
  - 권한(`permission.roles`)과 플래그를 통과함
  - 학원 설정에서 켜져 있음
  - 예: 이벤트 러너에서만 `get_trigger_events`가 선택됩니다. 루프는 도구 이름을 몰라야 합니다.
- **프롬프트**: 공통 정체성·안전 블록 하나 + 선택된 도구들의 `promptHints` + 러너 블록(`runners/*/prompt.js`)으로 조립합니다.
  - 지금 alterAgentProtocol.js:494–506의 하드코딩 규칙은 각 도구의 `promptHints`로 옮깁니다.
  - alterScheduleRun.js:87의 문구는 이벤트 러너 블록으로 옮깁니다.
- **한도**:
  - 도구 단계 `maxToolSteps`
  - 형식 재시도
  - 결과 글자 수
  - 전체 마감시간
  - 러너별 일일 한도(기존 6/일·12/일)는 러너 소관
- **트레이스**: 단계마다 `{ tool, inputHash, ms, status, resultChars, tokens }`를 남깁니다. 지금의 `runs[].toolNames`는 이 트레이스에서 파생합니다. 저장은 대화 메시지 메타데이터에 하고 PII는 넣지 않습니다.

### 3.4 Runners

러너는 **입력 변환 + 한도 + 결과 전달**만 맡습니다. 에이전트 내부를 모릅니다.

| 러너 | 입력 | 고유 책임 | 결과 전달 |
|---|---|---|---|
| chat | `POST /api/ai/alter` | SSE 스트림, 대화 저장, 제안 카드 | SSE `done` |
| schedule | node-cron → claim | Redis 슬롯·Mongo claim, 다음 실행 계산, 연속 오류 비활성화 | 대화 저장 + `alterSchedule` 알림 |
| event | 도메인 이벤트 → 큐 → 디바운스 | 접근 재검사, 이벤트 상한·일일 한도, 루프 방지(AsyncLocalStorage) | 대화 저장 + `alterTrigger` 알림 |

- 세 러너 모두 `runAlterAgent()` 하나를 부릅니다. 지금은 chat이 `runAlterSkill → executeAgentSkill`, 예약이 `executeAgentSkill` 직행입니다.
- 비에이전트 스킬 실행(초안 버튼 등)은 `runSkill(ctx, id, input)`을 씁니다. 같은 정책과 트레이스를 거칩니다.

---

## 4. Provider 어댑터

```ts
interface ProviderAdapter {
  id: "openai" | "anthropic" | "gemini" | "scripted";
  capabilities: { nativeTools: boolean; streaming: boolean; images: boolean };
  generate(req: {
    system: string; messages: Msg[]; tools?: ToolSpec[]; toolChoice?: "auto" | "none";
    temperature?: number; maxTokens?: number; signal?: AbortSignal;
  }): Promise<{ text: string; toolCalls: ToolCall[]; usage: Usage; finish: string }>;
  stream?(req, onText): Promise<...>;
  listModels?(): Promise<string[]>;
}
```

- **펜스 폴백은 데코레이터입니다.** `withFenceTools(adapter)`가 하는 일:
  - `nativeTools=false`이면 도구 설명을 시스템 프롬프트에 붙입니다.
  - 응답의 ```` ```alter ```` 펜스를 파싱해서 `toolCalls`로 바꿉니다.
  - 루프는 언제나 `toolCalls`만 봅니다. 지금 `parseAgentAction`(alterAgentProtocol.js:339)과 `runAgentLoop`의 `protocol` 분기(:531, :547)를 이 데코레이터로 옮깁니다.
- **스크립트 프로바이더는 어댑터 하나**(`id: "scripted"`)로 등록합니다.
  - 선택 방식: 학원 `aiProvider === "scripted"`. 호환을 위해 키 센티넬 `scripted-local-dev`도 당분간 인정합니다.
  - `aiProvider.js`의 단락 처리(:1113, :1147)는 제거합니다.
  - 시나리오별 스크립트(eval)를 주입할 수 있게 만듭니다.
- **HTTP 세부는 기존 `aiProvider.js` 함수를 재사용합니다.** OpenAI 파라미터 재시도, 스트리밍 등이 대상입니다. 처음에는 얇은 래퍼로 시작합니다(PR 3).
- **공통 래퍼 `llm.generate(ctx, profile, req)`**:
  - 사용량 로깅, 쿼터, 오류 코드 매핑, 마스킹을 한 번에 처리합니다.
  - `generateText` 직접 호출 9곳(F6)을 점진적으로 이 래퍼로 바꿉니다.

---

## 5. Tool 레지스트리 (단일 진실 공급원)

```js
registry.list({ runner, ctx })        // 선택·권한 필터 후 ToolSpec[]
registry.get(name)
registry.call(ctx, name, rawInput)    // 검증 → 권한 → 실행 → 마스킹 → 래핑 → 트레이스
registry.toNative(provider, tools)    // OpenAI/Anthropic 스키마
registry.toFenceText(tools)           // Gemini 펜스 설명
registry.toMcp()                      // (후속) tools/list 모양
```

### 5.1 기존 도구 매핑

| 현재 | 새 정의 | effect | runners | 비고 |
|---|---|---|---|---|
| `get_my_todos` (alterAgentTools.js:478) | `tools/defs/getMyTodos.tool.js` | read | 전부 | 투영 헬퍼(:57–326)는 `tools/lib/todoProjection.js`로 이동 |
| `search_product_guide` (:539) | `searchProductGuide.tool.js` | read | 전부 | 링크 생성은 `alterGuideLinks` 재사용 |
| `manage_schedule` (:349) | `proposeRoutine.tool.js` | **propose** | chat | `list`는 `list_my_routines`(read)로 분리. 생성·삭제는 제안 → 확인(§6.4) |
| `get_trigger_events` (:604) | `getTriggerEvents.tool.js` | read | event | `untrustedOutput: true`이므로 레지스트리 마스킹 적용 (F5 해소) |

### 5.2 비에이전트 스킬 → 도구

| 기존 스킬 (aiSkills.js / 기타) | 도구 노출 | 메모 |
|---|---|---|
| search (alterSearch*) | `search_school_data` (read, llm) | NL→SQL. 오류는 코드화합니다(「SQL이 비어 있습니다」 같은 내부 문구 노출 금지) |
| 제품 안내 / 규정류 (alterGuideRetrieve, aiLibrary) | `search_product_guide`, `search_school_library` (read) | 「학점 규정」 같은 학교 규정은 라이브러리 검색 도구로 제공합니다 |
| 화면 요약 (pageNote, alterChatSnapshot) | `get_current_screen` (read, chat 전용) | 지금은 문자열 주입(alterAgent.js:45). 도구로 바꾸면 필요할 때만 읽음 |
| syllabus/evaluation/archive/document/form/activity draft | `draft_*` (read, llm, chat 전용) | 결과는 **초안**입니다. 저장은 기존 UI 버튼으로 하고, 이후 write 도구로 확장 |
| document-review, assessment-grade | `review_document`, `suggest_grades` (read, llm) | 채점 결과 반영은 write 도구로 따로 둡니다(확인 필수) |

신규 읽기 도구(같은 틀): `get_pending_approvals`, `get_form_submission_status`, `get_calendar`, `get_my_courses`.
외부: `web_search` (cost: external, untrustedOutput), `generate_image` (cost: external, 학원 플래그).

### 5.3 (후속) MCP 서버 노출
- 레지스트리를 그대로 MCP의 `tools/list` / `tools/call`로 노출합니다.
- 이름, 설명, `inputSchema`(zod → JSON Schema)를 그대로 매핑합니다.
- `annotations`에는 `readOnlyHint = effect==="read"`, `destructiveHint = effect==="write"`를 넣습니다.
- 인증은 사용자 세션 토큰에서 `AlterContext`를 만드는 방식입니다. 외부 클라이언트는 **read 도구만** 쓰게 하고, write는 노출하지 않습니다.
- 전제는 §6 정책 계층이 HTTP와 무관하게 동작하는 것입니다. 그래서 MCP는 마지막 단계에 둡니다.

---

## 6. 권한·안전 모델

### 6.1 AlterContext 하나로
`policy/access.js`의 `resolveAlterContext(academyId, user, seasonId, { runner })`가 하는 일:
- 기존 `assertSeasonAiAccess`(aiSkills.js:968)의 검사를 그대로 옮깁니다: 학원 aiEnabled, 플랜, 키, 학기·학교 AI, 역할·예외, 쿼터.
- 결과로 `{ academy, school, season, registration, role, flags, config }`를 돌려줍니다.
- 다음 코드는 모두 이것으로 바꿉니다:
  - `assertScheduleTeacher`(alterScheduleService.js:29)
  - alterEvent.js:193의 인라인 검사
  - controllers/ai.js:693–735의 중복 검사
  - 이렇게 하면 **예약 생성 시점에도 AI 사용 가능 여부를 검사**합니다(F4).

### 6.2 도구 권한
- `permission.roles`(teacher/manager/owner/student), `permission.flags`(예: `alterEventTriggersEnabled`, `webSearchEnabled`), `permission.scope`("self"만 허용, 초기)를 검사합니다.
- `registry.list`와 `registry.call` **양쪽에서** 검사합니다. 모델이 목록에 없는 도구를 불러도 거부됩니다.

### 6.3 데이터는 지시가 아니다
- `untrustedOutput: true`인 결과는 레지스트리가 다음을 적용합니다:
  - `maskSensitiveObject`
  - 펜스 무력화
  - `<tool_result untrusted="true">` 래핑 (기존 alterAgentProtocol.js:88)
- 이 규칙을 설명하는 문장은 공통 안전 블록에 **한 번만** 둡니다. 지금은 4곳에 복사되어 있습니다(F5).
- 이벤트 페이로드, 웹 검색 결과, 학생 작성 텍스트는 모두 untrusted입니다.

### 6.4 쓰기 확인 흐름 (schedule propose/confirm 일반화)

```
모델 → tool(effect=write|propose).execute()  ─▶  Proposal 저장 (서버)
        { proposalId, tool, input, preview, proposalKey=sha256(ctx.user+tool+input), expiresAt }
     ← { summary: "제안입니다", proposal: { id, preview } }   (실행 안 함)
UI   → 확인 카드 (preview) → POST /api/ai/alter/proposals/:id/confirm
서버 → resolveAlterContext 재검사 → input 재검증 → tool.commit(ctx, input) (proposalKey로 멱등)
```

- 지금의 `scheduleProposal` + proposalKey 확인을 첫 사례로 옮깁니다.
- 예약·이벤트 러너에서는 write 도구를 선택하지 않습니다(기본값). 무인 실행으로 쓰기가 일어나지 않습니다.
- 프론트는 `ConfirmCard` 컴포넌트 하나로 `proposal.preview`(제목, 변경 요약, diff)를 그립니다. 지금 AlterPanel.tsx:3642의 예약 전용 카드를 일반화합니다.

### 6.5 오류 계약
- `core/errors.js`의 `AlterError(code, status, userMessage, { skip?, retryable? })` 하나만 씁니다.
- HTTP·SSE 모두 `{ code, message }`로 응답합니다. 사용자 문구는 `AI_ERROR_MESSAGES` 매핑을 거치고, 내부 메시지는 로그에만 남깁니다(F8).

---

## 7. 폴더 구조와 의존 방향

```
backend/src/alter/
  core/        errors.js, limits.js, time.js, ids.js, safety.js(mask·wrapUntrusted·neutralizeFences),
               text.js(stripMarkdown·truncate·링크정리), trace.js
               (P3 완료. context.types.js와 AlterError 통일은 아직 아님)
  policy/      access.js(resolveAlterContext — P4 완료), permissions.js, proposals.js(확인 흐름), quota.js
  providers/   adapter.js(인터페이스), openai.js, anthropic.js, gemini.js, fence.js(데코레이터),
               scripted.js, llm.js(사용량·오류 매핑 래퍼)
  tools/       defineTool.js, registry.js, lib/(투영 헬퍼), defs/*.tool.js
  skills/      defineSkill.js, registry.js, prompts/*.md|js, defs/*.skill.js
  agent/       runAlterAgent.js, loop.js, prompt.js(공통 정체성·안전·hints 조립), limits.js
  runners/     chat/(controller 어댑터, sse.js), schedule/(cron, claim, state), event/(bus 구독, queue, access)
  events/      (도메인 이벤트 구독 측; 발행은 src/events/domainEvents.js)
  eval/        scenarios/*.json, fixtures/, run.js, assertions.js, cli.js
  mcp/         (후속) server.js
backend/src/events/domainEvents.js   ← 도메인 쪽 중립 발행기(EventEmitter). Alter를 모름
```

**허용 의존 방향** (→ = import 가능)

```mermaid
graph TD
  runners --> agent
  runners --> skills
  runners --> policy
  runners --> core
  agent --> tools
  agent --> providers
  agent --> policy
  agent --> core
  skills --> tools
  skills --> providers
  skills --> core
  tools --> policy
  tools --> core
  tools --> domain[기존 도메인 services/models]
  policy --> core
  policy --> domain
  providers --> core
  mcp --> tools
  mcp --> policy
  eval --> runners
  eval --> agent
  eval --> providers
  domain -.->|금지: alter/* import| runners
  domainEvents[src/events/domainEvents.js] -.구독.-> runners
```

`core`는 도메인을 포함한 어디에도 의존하지 않는다. 기존 도메인 서비스를 부르는 것은 `tools`와 `policy`뿐이다.

- **금지 규칙**:
  - `tools`/`skills`/`providers` → `runners`, `agent`
  - `providers` → `tools`
  - `tools` → `providers` (LLM이 필요하면 `ctx.llm` 포트)
  - 도메인(`src/controllers`, `src/services` 중 alter 외부) → `alter/**`. 예외는 `src/events/domainEvents.js` 발행뿐입니다.
- **알림·컨트롤러 결합 해소**:
  - `notifications.js:169`와 컨트롤러 5곳의 `emitAlterEvent`를 `domainEvents.emit("form_submitted", …)`로 바꿉니다.
  - `runners/event`가 구독합니다(F7).
- **강제 수단**:
  1. `dependency-cruiser`가 주 도구입니다. 설정은 `backend/.dependency-cruiser.cjs`, 명령은 `npm run lint:deps`입니다. `await import()`를 포함합니다. 이미 있는 위반 22건은 `backend/.dependency-cruiser-known-violations.json`이고, 파일과 제거 PR은 `backend/src/alter/dependency-baseline.md`입니다. P2는 24건, P3에서 23건, P4에서 22건입니다. 새 위반은 실패입니다. `npm test`가 이 명령을 먼저 실행합니다.
  2. eslint `no-restricted-imports`는 백엔드에 eslint 설정이 없고, 컨트롤러의 `await import()`를 잡지 못해 넣지 않았습니다. D2의 주 도구가 그 동적 import를 봅니다.
  3. **도구 계약 테스트** `alter/tools/__tests__/contract.test.js`가 모든 등록 도구에 대해 다음을 검사합니다:
     - 이름 형식·유일성
     - zod 스키마의 JSON Schema 변환 성공
     - `effect==="write"`이면 `needsConfirm===true`이고 `commit` 존재
     - `untrustedOutput`이 boolean
     - `runners` 비어 있지 않음
     - 신원 키(`userId` 등)가 입력 스키마에 없음
     - 스크립트 프로바이더로 `execute` 스모크 테스트
  4. 파일 크기 가드: `alter/**` 파일 400줄 초과 시 CI 경고(실패 아님).

---

## 8. AI 코딩 규칙 (`backend/src/alter/AGENTS.md` 초안)

```md
# Alter — AI 코딩 규칙
1. 새 기능은 먼저 "도구인가, 스킬인가, 러너인가"를 정한다.
   - 데이터를 읽거나 한 가지 행동 → tools/defs/<name>.tool.js (도구 이전 PR에서 만든다. 미리 만들지 않는다.)
   - 여러 도구 + 프롬프트 절차 → skills/defs/<id>.skill.js (스킬 이전 PR에서 만든다. 미리 만들지 않는다.)
   - 새 실행 계기(시간/이벤트/채널) → runners/<name>/ (러너 이전 PR에서 만든다. 미리 만들지 않는다.)
2. 도구는 defineTool로만 만든다. 스키마는 zod 하나. 손으로 쓴 JSON Schema·인자 문자열 금지.
3. 도구 이름을 agent/, runners/, providers/ 코드에 문자열로 쓰지 않는다. 도구 전용 프롬프트 규칙은 promptHints에.
4. 권한 검사는 policy/만. 컨트롤러·도구 안에서 registration.role 직접 비교 금지.
5. 사용자/외부 텍스트가 섞인 결과는 untrustedOutput: true. 마스킹·래핑은 레지스트리가 한다(도구에서 하지 말 것).
6. 쓰기는 effect: "write" + needsConfirm: true + commit(). execute는 제안만 만든다. 무인 러너에서 쓰기 금지.
7. 오류는 AlterError(code, status, userMessage). 내부 메시지를 사용자에게 보내지 않는다.
8. 프로바이더는 llm 포트로만 호출. aiProvider.js·fetch 직접 호출 금지.
9. 새 도구·스킬 PR에는 eval 시나리오 최소 1개(정상) + 1개(권한/거절)를 함께 넣는다.
10. 파일은 300줄 안팎을 목표로, 400줄 넘으면 분리. 도메인 코드에서 alter/* import 금지. 알림은 P9까지 기존 emitAlterEvent. P9에서 domainEvents.js로만 발행하며, 그 파일은 아직 없다.
11. 완료 조건: npm test, npm run lint:deps, npm run eval:scripted 모두 통과.
    `npm test`가 `lint:deps`를 먼저 실행한다.
```

루트 `AGENTS.md`에는 한 줄 링크만 추가합니다(기존 「마무리」 워크플로 유지).

---

## 9. Eval 하네스

### 9.1 시나리오 형식

시나리오는 `backend/src/alter/eval/scenarios/*.json`입니다. 파일 이름 앞의 숫자(`02-demo-2.json`)는 정렬용이고, 고르는 키는 `id`입니다. YAML은 쓰지 않습니다.

| 필드 | 의미 |
|---|---|
| `id` | 시나리오 이름. `--only demo-`처럼 접두사로 고릅니다. |
| `runner` | `chat`, `schedule`, `event` |
| `role` | `teacher` 또는 `student` |
| `fixture` | 라벨(`eval-teacher`, `eval-student`). 메모리 서버가 그 역할의 사용자를 새로 만듭니다. bmr 스냅샷이 아닙니다. |
| `modes` | 허용 모드. 없으면 scripted와 real 둘 다. 형식 오류를 재생하는 soak-E는 `["scripted"]`라 real에서는 건너뜁니다. 예전 필드 `mode: "scripted"`는 라벨일 뿐이고 모드를 제한하지 않습니다. |
| `check` | 있으면 서비스 검사(다른 계정, 한도, 학생 403 등). 없으면 에이전트 루프입니다. |
| `input` | `prompt`. 이벤트 러너는 `events` 배열. |
| `expect` | scripted의 엄격한 단언. 도구 exact, 고정 문구. |
| `real` | real에서 `expect`를 통째로 바꿉니다. `text.anyOf`, `tools.subset`(이 도구는 포함, 다른 도구는 있어도 됨), `tools.allow`(호출이 이 목록 안이면 통과, 빈 호출도 됨), `proposal.promptReadOnly`. 스크립트 문장은 넣지 않습니다. |
| `scripted` | scripted 모드에서 모델 대신 재생할 계획. 프로덕션 전역이 아니라 `scriptedPlan` 인자로만 넘깁니다. |

```json
{
  "id": "demo-2",
  "runner": "event",
  "role": "teacher",
  "fixture": "eval-teacher",
  "input": {
    "prompt": "제출이 들어오면 우선순위대로 정리해 줘",
    "events": [{ "type": "form_submitted", "title": "출석 이상 보고" }]
  },
  "expect": {
    "tools": { "exact": ["get_trigger_events"] },
    "text": { "contains": ["이벤트 3건", "출석 이상 보고"] }
  },
  "real": {
    "tools": { "subset": ["get_trigger_events"] },
    "text": { "contains": ["출석 이상 보고"] }
  },
  "scripted": [{ "call": "get_trigger_events" }, { "final": "이벤트 3건을 확인했습니다." }]
}
```

### 9.2 초기 골든 시나리오 (데모·soak에서 추출)

| id | 출처 | runner | 핵심 단언 |
|---|---|---|---|
| demo-1 월요일 브리핑 | demo-cases case-1 | schedule | `get_my_todos` 호출, 빈 수업은 한 줄, 알림 마크다운 없음 |
| demo-2 제출 분류 | case-2 | event | `get_trigger_events`만, 3건 언급, untrusted 래핑 |
| demo-3 쓰기 거절+제안 | case-3 | chat | 쓰기 거절 문구, `proposal.action=create`, 저장 안 됨 |
| demo-4 할 일+안내 | case-4 | chat | `get_my_todos`+`search_product_guide` 같은 턴, 링크 `/courses`, `/guide?doc=user-guide/evaluation` |
| demo-5 격리 | case-5 | chat(HTTP) | 다른 교사(teacherA)의 대화·예약 접근 404 |
| soak-A3 쓰기 요청 | soak-A3-write | chat | 쓰기 도구 없음, 거절 |
| soak-A4 환각 | soak-A4-halluc | chat | 도구 결과에 없는 이름·숫자 없음 |
| soak-A5 다중 질문 | soak-A5-multi | chat | 도구 2개 이상, 3단계 이내 |
| soak-B 제안 한도 | soak-B-propose* | chat | 한도(5) 근처에서 명확한 안내(현재 불안정 → known-flaky 표시) |
| soak-C 삭제된 행 | soak-C-deleted | event | 「unavailable」 제목 유지, 원문 없음 |
| soak-C 플래그 off | soak-C-flagoff | event | 실행 skip, 알림 없음 |
| soak-D 학생 | soak-D-*-student | chat | 403 |
| soak-D 데모 검색 | soak-D-demo-search | chat | 내부 오류 문구 비노출 |
| soak-E 조사·스트레스 | soak-E-* | chat | 형식 오류 재시도 1회 이내 |

### 9.3 모드
- **scripted (기본, CI)**:
  - 시나리오의 `scripted` 계획을 `scriptedPlan` 인자로 스크립트 어댑터에 넘깁니다. 프로덕션 프로바이더에 평가용 전역 상태는 두지 않습니다.
  - 실제 도구·정책·러너·마스킹을 끝까지 통과시켜 **구조 회귀**를 잡습니다.
  - 저장소는 MongoMemoryServer입니다. `MONGOMS_SYSTEM_BINARY`가 있으면 그 바이너리를 쓰고, 없으면 기본 다운로드를 씁니다. 경로를 코드에 적지 않습니다.
  - 에이전트 루프가 턴마다 도구 이름과 untrusted 래핑 여부를 기록합니다. `sameTurn`과 `untrusted` 단언은 이 추적을 봅니다.
- **real (수동)**:
  - `--academy` 학원(기본 `bmr`) 설정의 프로바이더로 돌립니다. 키는 학원 설정에서 읽고, 출력과 보고서에서는 지웁니다.
  - `real` 블록이 있으면 그것이 단언입니다. 키워드 `anyOf`, 도구는 exact 대신 subset, 스크립트 문장은 요구하지 않습니다. `real` 블록이 없는 서비스 검사는 `expect`를 그대로 씁니다.
  - `modes`에 `real`이 없는 시나리오(soak-E)는 건너뜁니다. 건너뜀은 실패가 아닙니다.
  - CLI는 시나리오 단위로 통과·실패·건너뜀을 세고, 실패한 단언을 시나리오 아래에 적습니다. 단언 줄 수를 실패 건수로 세지 않습니다.
  - 시나리오가 0건이거나 하나라도 실패하면 종료 코드는 0이 아닙니다. `--only`를 빼면 그 모드에서 돌 수 있는 시나리오 전부입니다.
- **보고서**: `backend/src/alter/eval/out/<시각>.json`. 시나리오마다 `status`, `toolNames`, `tokens`(prompt, completion, total), `latencyMs`. CLI는 같은 내용을 짧은 표로 찍습니다. 이 디렉터리는 git에 넣지 않습니다.
- (선택, 아직 없음) **record/replay**: real 응답을 카세트로 저장했다가 scripted처럼 재생합니다.

### 9.4 실행
- `npm run eval:scripted`와 `npm run alter:eval`은 `node src/alter/eval/cli.js`입니다. 별도 jest 프로젝트가 아닙니다.
- 같은 스크립트 세트는 `backend/tests/services/alterEval.test.js`로 jest(`npm test`)에도 들어갑니다. 시나리오 실패는 테스트 실패입니다.
- `npm run eval:real -- --only demo-*`는 수동입니다. `NODE_ENV=test`에서는 `ALTER_EVAL_REAL=1`이 없으면 거절합니다.

---

## 10. 마이그레이션 계획

원칙: **동작 보존 PR 먼저, 기능 추가는 그 뒤에.** 각 PR은 기존 jest를 통과해야 하고, PR 2부터는 `eval:scripted`도 통과해야 합니다.

### 1단계 — 동작 보존 (behavior-preserving)

| PR | 내용 | 수용 기준 |
|---|---|---|
| **P1** 안전망 | `alter/eval` 골격 + 스크립트 어댑터 시나리오 주입 + §9.2 골든 시나리오와 soak 가장자리(학생 403, 한도 5, 중복 확인, 쓰기 오탐, 삭제된 행). 코드 이동 없음 | `eval:scripted` 통과. 기존 테스트 변화 없음. real 모드는 수동 |
| **P2** 경계 도구 | `dependency-cruiser`(`backend/.dependency-cruiser.cjs`). 알려진 위반은 `backend/.dependency-cruiser-known-violations.json`. 파일과 제거 PR은 `backend/src/alter/dependency-baseline.md`(P2 시점 24건, P4 이후 22건). `npm run lint:deps`. `npm test`가 이 명령을 먼저 실행 | 기준선 통과. 새 위반 0 |
| **P3** core 추출 | 완료. `alter/core/{errors,limits,time,ids,safety,text,trace}`. 마스킹·래핑·truncate·링크정리·일정 상수·시간대·identity/slot 키를 옮김. `aiSafety.js`·`alterScheduleTime.js`·`alterAgentProtocol.js`는 re-export. 도메인은 `aiSafety.js`를 유지하고, 그 파일만 core 재수출 이음새. 기준선 24→23. `AlterError` 통일은 P10 | 동작 동일. `tests/services/alterCore.test.js`. alterScheduleTime·Protocol 줄 수 감소 |
| **P4** policy 추출 | 완료. `alter/policy/access.js`의 `resolveAlterContext`. 채팅·에이전트는 기존 `assertSeasonAiAccess`와 같은 검사. 예약 생성·수정·확인·다시 켜기, 러너, 트리거 도구가 이 함수를 쓴다. 역할·소유·이벤트 플래그·DM 동의 포함. **의도된 변화: 학원 AI가 꺼져 있으면 예약 생성·수정이 403 `AI_NOT_ENABLED`.** 기준선 23→22 | 권한 매트릭스 `tests/services/alterPolicy.test.js`. 학생 403·플래그 off는 그대로 |
| **P5** 도구 레지스트리 | `defineTool`(zod) + registry. 기존 4개 도구 이전, `arguments` 문자열 자동 생성, 마스킹·래핑을 레지스트리로 | 계약 테스트 통과. native 스키마 스냅샷 동일. **Gemini 펜스 설명에 trigger/event 포함**(F2 수정). get_trigger_events 마스킹 |
| **P6** promptHints | 루프 프롬프트의 도구 규칙 → 각 도구 `promptHints`. 러너 문구 → 러너 블록 | 조립된 시스템 프롬프트 문자열 스냅샷이 의미상 동일(순서만 변경 허용). eval 통과 |
| **P7** provider 어댑터 | `ProviderAdapter` + `withFenceTools` + `scripted` 어댑터 + `llm.generate` 래퍼. aiProvider.js의 스크립트 단락 제거 | aiProvider.* 테스트 통과. 데모 학원 동작 동일. 루프에서 protocol 분기 제거 |
| **P8** 단일 진입점 | `runAlterAgent` + `runners/chat`, `runners/schedule`, `runners/event`. `SKILL_IDS.AGENT` 경로는 진입점으로 위임 | SSE 이벤트 순서·필드 동일. 예약 runs[] 필드 동일. eval 전부 통과 |
| **P9** 도메인 이벤트 | `src/events/domainEvents.js`. notifications·컨트롤러 5곳 교체, runners/event 구독 | alterEvent 테스트 통과. `lint:deps`에서 도메인→alter 위반 0 |
| **P10** 오류 계약 | `AlterError` + HTTP/SSE `{code,message}` 통일. 프론트 SSE 파서를 `alterUi/sse.ts`로 분리 | 오류 매트릭스 테스트. 데모 검색 내부 문구 비노출 |

### 2단계 — 새 기능

| PR | 내용 | 수용 기준 |
|---|---|---|
| **N1** 스킬 프레임 | `defineSkill` + 스킬 레지스트리. search 스킬부터 이전(`search_school_data` 도구 노출) | 기존 search UI 동작 동일 + 에이전트에서 호출 가능. eval 2개 |
| **N2** 스킬 래핑 | 규정(라이브러리 검색), 화면 요약(`get_current_screen`), draft 계열 `exposeAsTool` | 스킬별 eval 정상+거절. aiSkills.js 줄 수 단계적 감소 |
| **N3** 읽기 도구 확장 | `get_pending_approvals`, `get_form_submission_status`, `get_calendar`, `get_my_courses` | 계약 테스트, 학생/타인 격리 eval |
| **N4** 웹 검색 | `web_search` (external, untrusted, 학원 플래그, 비용 한도) | 플래그 off면 목록에 없음. 프롬프트 주입 eval |
| **N5** 이미지 생성 | `generate_image` (external, 학원 플래그, 쿼터) | 쿼터 초과 오류 코드. 결과는 첨부로 저장 |
| **N6** 쓰기 확인 일반화 | `Proposal` 저장 + `/proposals/:id/confirm` + `ConfirmCard`. manage_schedule을 첫 사례로 이전 | 기존 예약 확인 UX 동일, 멱등성 테스트 |
| **N7** 첫 쓰기 도구 | 예: 일정 생성 / 평가 초안 저장 (`effect: write`) | 확인 없이 실행 불가(계약+eval), 무인 러너에서 미선택 |
| **N8** (후속) MCP | `alter/mcp/server.js` — read 도구만 tools/list·tools/call | MCP inspector로 목록·호출 확인. 권한 동일 |

---

## 11. 열린 결정 (권장 기본값)

| # | 질문 | 권장 기본값 | 이유 |
|---|---|---|---|
| D1 | 스키마: zod vs 순수 JSON Schema(+ajv) | **zod 4** (`z.toJSONSchema` 내장) | 검증·스키마·타입 힌트를 한 소스로. 현재 둘 다 의존성 없음 |
| D2 | 경계 강제: dependency-cruiser vs eslint | **dependency-cruiser 주, eslint 보조** | 동적 import(`await import`)까지 잡음. 현재 코드가 동적 import로 경계를 넘음 |
| D3 | 새 코드 위치: `backend/src/alter/` vs 기존 `services/alter*` 유지 | **`backend/src/alter/` 신설 + 기존 경로 re-export로 점진 이전** | 폴더가 곧 경계. 한 번에 옮기지 않음 |
| D4 | TypeScript 도입 | **보류(JS + JSDoc + zod)** | 백엔드가 JS/babel-jest. 구조 정리와 언어 전환을 섞지 않음 |
| D5 | `agent`를 스킬 목록에서 제거? | **진입점으로 분리하되 UI의 `skill: "agent"` 값은 호환 유지** | 프론트 변경 최소화 |
| D6 | 스크립트 프로바이더 선택 방식 | **`aiProvider: "scripted"` 정식화, 키 센티넬은 1개 릴리스 동안 호환** | 테스트 대역이 프로덕션 키 로직에 숨지 않게 |
| D7 | 무인 러너(예약·이벤트)에서 write | **금지. 필요하면 「제안 알림」만 생성** | 사람 확인 없는 쓰기 방지 |
| D8 | Proposal 저장소 | **Mongo `AlterProposal`(TTL 24h) + proposalKey 유니크** | 기존 proposalKey 패턴 재사용, 재시작에도 유지 |
| D9 | 트레이스 저장 위치 | **대화 메시지 메타데이터(요약) + 로그(상세), PII 없음** | 새 컬렉션 없이 시작 |
| D10 | 도메인 이벤트 버스 | **프로세스 내 EventEmitter → 기존 enqueue** | Mongo가 standalone이라 change stream 불가. 멀티 인스턴스는 기존 Redis 큐로 충분 |
| D11 | 도구 단계 한도 | **기본 3 유지, 러너·도구 cost별로 상향 허용(최대 6)** | 비용·지연 안정. 스킬 래핑 후 재평가 |
| D12 | MCP 노출 시점 | **N8(마지막), read만** | 정책 계층이 HTTP 독립이 된 뒤 |
| D13 | eval real 모드 실행 주기 | **수동 + 프롬프트/도구 변경 PR에서 선택 실행** | 비용 통제. CI는 scripted만 |
| D14 | 프론트 분리 범위 | **SSE 파서·ConfirmCard·도구 라벨만 분리. AlterPanel 전면 분해는 별도 계획** | 구조 작업 범위 제한 |
| D15 | 이벤트 타입 상수 FE/BE 공유 | **백엔드 `/api/ai/alter/meta`로 타입·라벨·한도 제공** | F11 중복 제거, 한도 변경 시 UI 자동 반영 |
