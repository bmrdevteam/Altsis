# AI API

Alter(전역 AI 어시스턴트), Skill 카탈로그, 강의계획서 검토(하위 호환), 학기 지침 템플릿 생성, Owner용 API 키/모델 관리를 제공합니다.

> **라우트 파일**: `backend/src/routes/ai.js`  
> **컨트롤러 파일**: `backend/src/controllers/ai.js`  
> **관련 서비스**: `backend/src/services/aiSkills.js`, `aiPromptPolicy.js`, `aiProvider.js` 등

기본 경로: `/api/ai`

UI에서의 Alter 사용법은 [사용자 가이드 — Alter](../user-guide/chat.md#alter-전역-ai-어시스턴트)를 참고하세요.

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/ai/skills` | Skill 카탈로그 조회 | `isLoggedIn` |
| `GET` | `/api/ai/alter/skill-settings` | Skill별 준비 설정(지침·참고자료) | `isLoggedIn` (+ 학기 AI 접근) |
| `GET` | `/api/ai/alter/conversations` | Alter 대화 목록 | `isLoggedIn` |
| `POST` | `/api/ai/alter/conversations` | Alter 대화 생성 | `isLoggedIn` |
| `POST` | `/api/ai/alter/conversations/bulk-delete` | 대화 일괄 삭제(소프트) | `isLoggedIn` (본인) |
| `GET` | `/api/ai/alter/conversations/:id/messages` | 대화 메시지 목록 | `isLoggedIn` (본인) |
| `PATCH` | `/api/ai/alter/conversations/:id` | 대화 제목 변경 | `isLoggedIn` (본인) |
| `DELETE` | `/api/ai/alter/conversations/:id` | 대화 삭제(소프트) | `isLoggedIn` (본인) |
| `POST` | `/api/ai/alter/attachment` | 첨부 업로드(텍스트 추출/이미지 키) | `isLoggedIn` (+ 학기 AI 접근) |
| `POST` | `/api/ai/alter` | Alter 통합 턴(Skill 라우팅) | `isLoggedIn` (+ 학기 AI 접근) |
| `POST` | `/api/ai/syllabus/review` | 강의계획서 초안(SSE, 하위 호환) | `isLoggedIn` (+ 학기 AI 접근) |
| `POST` | `/api/ai/syllabus/guidelines-template` | 학기 AI 지침 템플릿 생성 | `isAdManager` |
| `POST` | `/api/ai/test` | API 키 유효성 테스트 | `isOwner` |
| `POST` | `/api/ai/models` | 제공자 모델 목록 | `isOwner` |

대부분 엔드포인트는 아카데미 `aiEnabled`, API 키, 학기/학교 AI 접근 검사를 통과해야 합니다.

---

## 양식 AI 챗봇 (`aiChat` 항목)

활동 양식 안의 학생용 챗봇입니다. 상단바 Alter와 분리되어 있으며, 학생 전역 AI 권한(`permission.student`)은 필요 없습니다. 교사가 양식에 항목을 추가할 때는 교사 AI 권한이 필요합니다. 대화 열람은 양식 응답을 볼 수 있는 교사(admin/writer)만 가능하고, `shareResponses`여도 다른 학생에게는 비공개입니다.

> **라우트 파일**: `backend/src/routes/altForms.js`  
> **컨트롤러**: `backend/src/controllers/formAiChat.js`  
> **서비스**: `backend/src/services/formAiChat.js`

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/alt-forms/:_id/ai-chat/messages` | 학생 메시지 전송 + AI 응답. `{ fieldId, content, rowId?, season? }` | 양식 응답자 + 학기/학교 AI on |
| `GET` | `/api/alt-forms/:_id/ai-chat/sessions` | 세션 목록 (`fieldId`, `row` 쿼리) | 본인 또는 `canViewAllRows` |
| `GET` | `/api/alt-forms/:_id/ai-chat/sessions/:sessionId/messages` | 메시지 목록 | 본인 또는 `canViewAllRows` |

행 값에는 대화 전문이 아니라 `{ sessionId, messageCount, studentMessageCount, lastMessagePreview, lastMessageAt }` 요약만 저장합니다. 필수는 학생 메시지 1회 이상입니다. 제출 후 `allowResubmit`이 아니면 전송이 잠깁니다.

---

## Skill 카탈로그

```
GET /api/ai/skills
```

**권한**: `isLoggedIn`

### 응답 (200)

```json
{
  "skills": [
    {
      "id": "chat",
      "name": "챗봇",
      "description": "학습·작성에 대한 범용 도우미 대화",
      "profile": "chat"
    },
    {
      "id": "syllabus-draft",
      "name": "수업",
      "description": "제공된 정보·자료로 강의계획서 항목 초안을 작성합니다",
      "profile": "syllabusDraft"
    }
  ]
}
```

주요 Skill ID:

| ID | 이름 | 응답 형태 |
|----|------|-----------|
| `chat` | 챗봇 | JSON |
| `syllabus-draft` | 수업 | SSE |
| `evaluation-draft` | 평가 | SSE |
| `archive-draft` | 기록 | SSE |
| `document-draft` | 문서 | SSE |
| `document-review` | 문서 점검 | SSE |
| `form-response-draft` | 응답 | SSE |
| `activity-draft` | 활동 | SSE |
| `assessment-grade` | 채점 | SSE |

`form-response-draft`의 `docResponse`(기안문)는 양식 전체를 다시 쓰지 않고 칸만 채웁니다. 양식에 `(작성)` / `(본문 작성)` / `(기입)` 등 작성 칸이 있으면 해당 칸에 `<<<SLOT>>>` 채우기가 **필수**입니다. 작성 칸이 없으면 마크다운 빈 셀·HTML 표 빈 `td`(에디터 `&nbsp;`/빈 `p` 포함)·`라벨:`·밑줄 등 빈칸을 추론해 같은 SLOT 경로로 채우며, 추론이 부족하면 양식에 `(작성)`을 명시하는 것을 권장합니다. 선택 필드 누락·전체 양식 재작성은 서버에서 1회 재시도합니다.

---

## Alter 통합 턴

페이지 문맥과 Skill에 따라 초안·점검·일반 대화를 수행합니다. 초안/점검 Skill은 **SSE(`text/event-stream`)**, `chat`은 **JSON**을 반환합니다.

```
POST /api/ai/alter
```

**권한**: `isLoggedIn` (+ 학기 AI 접근)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `string` | O | 학기 ObjectId |
| `message` | `string` | X | 사용자 메시지 |
| `skill` | `string` | X | Skill ID. 없으면 `autoDetectSkill`로 추정, 기본 `chat` |
| `autoDetectSkill` | `boolean` | X | 메시지에서 Skill 자동 감지 (기본 `true`) |
| `context` | `object` | X | 페이지 문맥(`pageType`, `syllabusId`, `attachments` 등) |
| `history` | `object[]` | X | 직전 대화 이력 |
| `conversationId` | `string` | X | 기존 대화에 이어서 저장 |
| `persist` | `boolean` | X | 대화 저장 여부 (기본 `true`) |

### 요청 예시 (챗봇)

```json
{
  "season": "507f1f77bcf86cd799439011",
  "skill": "chat",
  "message": "이번 학기 평가 일정은 어떻게 잡으면 좋을까요?",
  "context": { "pageType": "calendar" }
}
```

### 응답 (200, chat — JSON)

```json
{
  "skill": "chat",
  "message": "평가 일정을 잡을 때…",
  "review": null,
  "draft": null,
  "conversationId": "507f1f77bcf86cd799439201"
}
```

### 페이지 스냅샷 · 데이터 확대

프론트는 데이터 화면에서 `registerPageContext`로 `getChatSnapshot`을 등록합니다. chat Skill 요청 시 `context.chatSnapshot`과 `context.dataExpand`가 함께 전달됩니다.

| 규칙 | 설명 |
|------|------|
| 읽기 문맥 | 페이지에 **이미 로드·표시된(권한 통과) 데이터**만 스냅샷에 넣습니다. 추가 fetch 없음 |
| `pageType: "sheet"` | 양식 응답 시트(표·시간표·문서). UI 라벨「응답 기록」 |
| Skill 쓰기 | 초안 반영·채점 등은 별도 훅(`apply*Draft`). 스냅샷만으로는 쓰지 않음 |

**데이터 확대** (`context.dataExpand: true` 또는 `chatSnapshot.dataExpand: true`): 사용자가 Alter 패널에서 켠 opt-in입니다. 프론트·백엔드 한도를 함께 올립니다.

| 한도 | 기본 | 데이터 확대 |
|------|------|-------------|
| 항목 수 | 50 | 150 |
| 스냅샷 전체 글자 | 48,000 | 120,000 |
| 필드값 글자 | 40,000 | 40,000 |

서버는 `buildAlterChatPageData`에서 동일 한도로 다시 자릅니다. 클라이언트만 키워도 서버 한도가 낮으면 잘립니다.  
목록형에서 전체보다 적게 포함되면 UI·프롬프트에 `포함 N / 전체 M`(또는 `N/M건`)으로 표시합니다. 문서/채점처럼 항목 1건 스냅샷의 `totalCount`는 문서 수(보통 1)이며 필드 수가 아닙니다.

### 응답 (SSE, draft Skill)

이벤트가 순차로 전송됩니다.

| 이벤트 | 설명 |
|--------|------|
| `step` | 진행 단계 안내 |
| `done` | 완료. `skill`, `message`, `draft`, `review`, `conversationId` |
| `error` | 오류. `message`, 선택적 `conversationId` |

```
event: step
data: {"message":"설정 확인 중..."}

event: done
data: {"skill":"syllabus-draft","message":"…","draft":{…},"review":null,"conversationId":"…"}
```

---

## Alter 대화

대화는 **학교 단위**로 모이며, 학기와 무관하게 목록에 나타날 수 있습니다.  
**한 대화에서 여러 Skill을 이어서 사용할 수 있습니다.** `lastSkill`은 목록 표시용 최근 실행 Skill이며, 대화가 그 Skill 전용으로 잠기지 않습니다.  
화면 전용 Skill(응답 초안·채점 등)은 해당 `pageType` 화면에서만 실행됩니다. 페이지를 떠나면 그 Skill 실행은 거절되고, `pageType`이 바뀌면 프론트는 새 대화로 분리할 수 있습니다.

### 목록

```
GET /api/ai/alter/conversations?school=&season=&limit=
```

`school`이 우선입니다. `season`만 있으면 해당 학기의 학교로 조회합니다.

### 생성

```
POST /api/ai/alter/conversations
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `string` | O | 학기 ObjectId |
| `title` | `string` | X | 대화 제목 |
| `pageType` | `string` | X | 시작 페이지 유형 |
| `contextLabel` | `string` | X | 표시용 문맥 라벨 |
| `syllabusId` | `string` | X | 관련 강의계획서 |

### 메시지 / 이름 변경 / 삭제

```
GET    /api/ai/alter/conversations/:id/messages?limit=
PATCH  /api/ai/alter/conversations/:id   // body: { "title": "…" }
DELETE /api/ai/alter/conversations/:id   // 소프트 삭제 → { "ok": true }
POST   /api/ai/alter/conversations/bulk-delete
  // body: { "ids": ["…"] }
  // → { "deleted": ["…"], "skipped": [{ "id": "…", "reason": "working"|"not_found" }] }
```

진행 중인(`status=working`) 대화는 단건·일괄 모두 삭제되지 않습니다.

---

## Skill 준비 설정

학교 라이브러리·학기 설정을 반영한 지침/참고자료를 조회합니다.

```
GET /api/ai/alter/skill-settings?season=&skill=
```

**권한**: `isLoggedIn` (+ 학기 AI 접근)

`skill` 기본값은 `chat`입니다. 응답 본문은 해석된 준비 설정 객체입니다.

---

## 첨부 업로드

```
POST /api/ai/alter/attachment?season=
Content-Type: multipart/form-data
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | query/body | O | 학기 ObjectId |
| `file` | file | O | 첨부 파일 |

지원: `txt` / `md` / `csv` / `pdf` / `docx` / `png` / `jpg` / `webp` (최대 10MB).

### 응답 (200)

```json
{
  "attachment": {
    "fileKey": "…",
    "originalName": "notes.pdf",
    "mimeType": "application/pdf",
    "extractedText": "…"
  }
}
```

---

## 강의계획서 검토 (하위 호환)

`POST /api/ai/alter`의 `skill=syllabus-draft`와 동일한 SSE Skill입니다.

```
POST /api/ai/syllabus/review
```

요청: `{ "season", "context", "message" }` — 응답은 SSE(`step` / `done` / `error`).

---

## 학기 지침 템플릿 생성

```
POST /api/ai/syllabus/guidelines-template
```

**권한**: `isAdManager` (아카데미 admin / school manager)

### 요청

```json
{ "season": "507f1f77bcf86cd799439011" }
```

### 응답 (200)

```json
{
  "guidelines": { },
  "usedFallback": false
}
```

생성 실패 시에도 검증된 기본 한국어 템플릿을 `usedFallback: true`와 함께 반환할 수 있습니다.

---

## API 키 테스트 (Owner)

```
POST /api/ai/test
```

**권한**: `isOwner`

### 요청

```json
{
  "apiKey": "sk-…",
  "provider": "openai",
  "aiModel": "gpt-4o-mini"
}
```

### 응답 (200)

```json
{
  "valid": true,
  "models": ["gpt-4o-mini", "gpt-4o"],
  "suggestedModel": "gpt-4o-mini"
}
```

키가 유효하지 않으면 `valid: false`와 `error` 메시지를 반환합니다(HTTP 200인 경우가 많음).

---

## 모델 목록 (Owner)

```
POST /api/ai/models
```

**권한**: `isOwner`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `apiKey` | `string` | 조건부 | 직접 입력한 키 |
| `provider` | `string` | X | 제공자 |
| `academyId` | `string` | 조건부 | 저장된 아카데미 키 사용 시 |

### 응답 (200)

```json
{ "models": ["gpt-4o-mini", "gpt-4o"] }
```

---

## 관련 문서

- [채팅 API](./chat.md) — DM/그룹/보드 채팅 (Alter와 별개)
- [API 개요](./overview.md)
- [사용자 가이드 — Alter](../user-guide/chat.md#alter-전역-ai-어시스턴트)
- [아카데미 관리 — AI 설정](../admin-guide/academy-management.md)
