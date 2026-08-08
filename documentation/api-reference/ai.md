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
