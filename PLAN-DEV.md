# Alt Board — Phase 1 개발 상세 계획

> 목표: "과제 출제 → 학생 제출 → 교사 채점 → 통지서 생성" 시나리오가 실제로 작동
> 기준: 기존 코드베이스 탐색 결과를 바탕으로 한 구체적 구현 계획

---

## 기존 코드 분석 요약

### 재사용 대상

| 기존 코드 | 활용 방식 |
|-----------|----------|
| Board 모델 (members/writers, slug, school) | 필드 추가하여 Alt Board로 확장 |
| Post 모델 (title, content, attachments, editor) | Alt Docs로 그대로 사용 + 머지 엔진 추가 |
| Post 컨트롤러 (CRUD, 파일 업로드, S3 signed URL) | Alt Docs API로 재사용 |
| Survey 질문 타입 9종 (singleChoice, shortText, date 등) | Alt Form 필드 타입 참고 |
| SurveyBuilder/SurveyRenderer UI | Alt Form 빌더/렌더러 기반으로 확장 |
| Board 멤버 해석 로직 (getBoardMembers, isBoardMember) | 권한 체크에 재사용 |
| 댓글 시스템 (Comment 모델/컨트롤러) | Docs/Form 댓글로 그대로 사용 |
| 파일 업로드 (S3, signed URL) | Form 파일 필드에 재사용 |

### 제거/대체 대상 (Phase 2에서 실행)

| 기존 코드 | 대체 |
|-----------|------|
| Post.surveys (임베딩 방식) | AltForm 독립 모델 |
| SurveyResponse 모델 | AltSheetRow 모델 |
| Post.reservationConfig | Form 중복 검사 (Phase 2) |
| Reservation/ReservationSlot | Form 사전 등록 (Phase 2) |

---

## 구현 순서

### Step 1: Backend 모델 — AltForm, AltSheet, AltSheetRow

> 의존성 없음. 가장 먼저 생성.

#### 1-1. AltForm 모델 (`backend/src/models/AltForm.js`)

```
AltForm {
  board:         ObjectId → Board
  school:        ObjectId
  creator:       ObjectId → User
  creatorId:     String
  creatorName:   String

  title:         String (양식 제목)
  description:   String (양식 설명)

  fields: [{
    _id:         ObjectId (자동 생성)
    label:       String (필드명)
    type:        String (text|textarea|number|date|file|select|multiSelect|
                         checkbox|radio|userSelect|rating|scale|counter|approval)
    permission:  String (respondent|owner)
    visibleToRespondent: Boolean (owner일 때 응답자에게 공개 여부, 기본 false)
    required:    Boolean
    options:     [String] (select/radio/checkbox용)
    validation:  Mixed (타입별 검사 규칙)
    order:       Number
  }]

  settings: {
    openAt:      Date (공개 시작)
    closeAt:     Date (공개 종료)
    allowResubmit: Boolean (재제출 허용)
  }

  sheet:         ObjectId → AltSheet (자동 생성됨)
  isActive:      Boolean
  createdAt, updatedAt
}

인덱스: board, board+createdAt
```

**Phase 1 범위**: text, textarea, number, date, file 필드만 구현
**Phase 2 이후**: select, radio, approval, counter, 조건부 표시 등

#### 1-2. AltSheet 모델 (`backend/src/models/AltSheet.js`)

```
AltSheet {
  form:    ObjectId → AltForm (1:1)
  board:   ObjectId → Board
  school:  ObjectId
  name:    String (= Form 제목, 동기화)
  isActive: Boolean
  createdAt, updatedAt
}

인덱스: form (unique), board
```

#### 1-3. AltSheetRow 모델 (`backend/src/models/AltSheetRow.js`)

```
AltSheetRow {
  sheet:        ObjectId → AltSheet
  form:         ObjectId → AltForm
  board:        ObjectId → Board

  _respondent:  ObjectId → User (nullable, 직접 입력 모드에서는 수동 지정)
  _respondentId:   String
  _respondentName: String

  data:         Map<String, Mixed>  (필드 _id → 값)
    예: { "field1_id": "과제1", "field2_id": "파일URL", ... }

  _submittedAt: Date
  _updatedAt:   Date
  isActive:     Boolean
  createdAt, updatedAt
}

인덱스: sheet+_respondent, sheet+createdAt, form
```

**설계 결정**: `data`를 `Map<String, Mixed>`로 하여 필드 변경에 유연하게 대응.
필드 _id를 키로 사용하므로 필드명이 바뀌어도 데이터 매핑이 깨지지 않음.

---

### Step 2: Backend 모델 — Board 확장

> Step 1과 동시 진행 가능.

#### 2-1. Board 모델 수정 (`backend/src/models/Board.js`)

추가 필드:

```
boardMode:     String (classic|alt)  기본값 classic, alt이면 Alt Board
syllabus:      ObjectId → Syllabus (수업 보드일 때)
altBoardRole:  Map<String(userId), String(admin|writer|respondent)>
               보드 내 역할 (기존 members/writers와 별도)
```

- `boardMode: "classic"` — 기존 게시판으로 동작 (하위 호환)
- `boardMode: "alt"` — Alt Board로 동작 (탭 구조, Form/Sheet 지원)
- 기존 보드 기능은 유지, Alt Board만 새 기능 사용

#### 2-2. Syllabus 모델 수정 (`backend/src/models/Syllabus.js`)

추가 필드:

```
altBoard:  ObjectId → Board (수업 보드 참조)
```

---

### Step 3: Backend 컨트롤러 — AltForm CRUD

> Step 1 완료 후.

#### 3-1. `backend/src/controllers/altForms.js`

```
POST   /alt-forms              create    — Form 생성 + Sheet 자동 생성
GET    /alt-forms/:_id?        find      — Form 목록/상세 조회
PUT    /alt-forms/:_id         update    — Form 수정 (필드 변경 → Sheet 동기화)
DELETE /alt-forms/:_id         remove    — Form 삭제 (Sheet도 함께)
```

**create 핵심 로직**:
```
1. AltForm 생성
2. AltSheet 자동 생성 (form 참조, name = form.title)
3. form.sheet = sheet._id 저장
4. 응답: { form, sheet }
```

**update 핵심 로직 (필드 변경 시)**:
```
- 필드 추가: 기존 AltSheetRow에는 영향 없음 (data Map에 해당 키 없으면 빈 값)
- 필드 삭제: AltSheetRow.data에서 해당 키 $unset
- 필드 옵션 변경: 기존 데이터 유지
```

#### 3-2. `backend/src/services/altForms.js`

```
canManageForm(form, user, board)  — 관리자/작성자 권한 확인
canRespondForm(form, user, board) — 응답자 권한 + 공개 기간 확인
getRespondentFields(form)         — respondent 권한 필드만 반환
getOwnerFields(form)              — owner 권한 필드 반환
getVisibleFields(form, userRole)  — 역할별 보이는 필드 반환
```

---

### Step 4: Backend 컨트롤러 — AltSheetRow CRUD (응답 처리)

> Step 3 완료 후.

#### 4-1. `backend/src/controllers/altSheetRows.js`

```
POST   /alt-sheet-rows              create     — Form 응답 제출 (= Sheet에 행 추가)
GET    /alt-sheet-rows              find       — Sheet 행 조회 (교사: 전체, 학생: 본인만)
GET    /alt-sheet-rows/my           findMy     — 내 응답만 조회
PUT    /alt-sheet-rows/:_id         update     — 셀 값 수정 (교사만)
DELETE /alt-sheet-rows/:_id         remove     — 행 삭제 / 응답 철회
POST   /alt-sheet-rows/bulk        createBulk — 다중 행 입력 (교사 직접 입력)
```

**create 핵심 로직 (Form 응답 제출)**:
```
1. Form 공개 기간 확인 (openAt <= now <= closeAt)
2. 재제출 확인 (allowResubmit + 기존 응답 존재 여부)
3. respondent 필드만 추출하여 data Map 구성
4. 유효성 검사 (required, 글자 수, 숫자 범위 등)
5. AltSheetRow 생성 (_respondent = req.user)
6. 응답: { row }
```

**find 핵심 로직 (권한 기반 필터링)**:
```
관리자/작성자:
  - 전체 행 반환
  - 모든 필드 포함

응답자:
  - _respondent = req.user인 행만
  - respondent 필드 + visibleToRespondent=true인 owner 필드만
```

---

### Step 5: Backend — Alt Docs 머지 엔진

> Step 4 완료 후. AltSheetRow 데이터가 있어야 테스트 가능.

#### 5-1. `backend/src/utils/mergeEngine.js`

```
parseMergeTemplate(content)
  → { sheetName, tokens[] }

  토큰 타입:
    - TEXT (일반 텍스트)
    - VARIABLE ({{변수}})
    - EACH_START / EACH_END
    - TABLE ({{#table col1, col2}})
    - COUNT ({{_count}})

renderMerge(template, rows)
  → 렌더링된 문자열

  동작:
    - rows.length === 1: {{변수}} → rows[0][변수]
    - rows.length > 1: {{변수}} → rows[0][변수] (첫 행)
    - {{#each}}...{{/each}}: 모든 행 반복
    - {{#table col1, col2}}: 마크다운 테이블 생성
    - {{_count}}: rows.length
```

#### 5-2. `backend/src/controllers/posts.js` 수정

기존 `find` (게시글 조회)에 머지 처리 추가:

```
GET /posts/:_id?merge=true&userId=xxx

1. 게시글 content에서 {{#sheet 시트명}} 파싱
2. 시트명으로 AltSheet 조회 (같은 board 내)
3. Sheet 열람 권한 확인
4. 열람자 판별:
   - userId 파라미터 있음 (교사) → 해당 user의 행 조회
   - 없음 (학생) → req.user의 행 조회
5. mergeEngine.renderMerge() 실행
6. 렌더링된 content 반환
```

---

### Step 6: Backend — 수업 계획서 ↔ Alt Board 연결

> Step 2 완료 후.

#### 6-1. `backend/src/controllers/syllabuses.js` 수정

수업 계획서에서 Alt Board 접근 시:

```
GET /syllabuses/:_id/alt-board

1. syllabus.altBoard 확인
2. 없으면 자동 생성:
   - Board 생성 (boardMode: "alt", syllabus: _id)
   - Enrollment 기반 멤버 동기화
     - 교사 → altBoardRole: admin
     - 학생 → altBoardRole: respondent
   - syllabus.altBoard = board._id 저장
3. board 반환
```

#### 6-2. 멤버 동기화 로직

```
syncAltBoardMembers(board, syllabus)
  1. Enrollment 조회 (syllabus._id 기준)
  2. 교사 (syllabus.user + teachers[]) → admin
  3. 학생 (enrollment.student) → respondent
  4. board.altBoardRole 업데이트
```

- Enrollment 변경 시 훅으로 자동 동기화 (또는 보드 접근 시 lazy 동기화)

---

### Step 7: Backend — 캘린더 마감일 동기화

> Step 3 완료 후.

#### 7-1. CalendarEvent sourceType 확장

`backend/src/models/CalendarEvent.js` 수정:

```
sourceType에 "altForm" 추가
sourceId → AltForm._id 참조
```

#### 7-2. Form 생성/수정 시 캘린더 동기화

`backend/src/controllers/altForms.js`의 create/update에서:

```
Form에 closeAt이 설정되면:
  → CalendarEvent 생성/업데이트
     title: "{보드명} - {Form제목} 마감"
     date: closeAt
     sourceType: "altForm"
     sourceId: form._id
```

---

### Step 8: Frontend 타입 정의

> Backend Step 1~2와 동시 진행 가능.

#### 8-1. `frontend/src/types/altForm.ts`

```typescript
type TAltFormFieldType =
  | "text" | "textarea" | "number" | "date" | "file"
  | "select" | "multiSelect" | "checkbox" | "radio"
  | "userSelect" | "approval" | "rating" | "scale" | "counter";

type TAltFormFieldPermission = "respondent" | "owner";

type TAltFormField = {
  _id: string;
  label: string;
  type: TAltFormFieldType;
  permission: TAltFormFieldPermission;
  visibleToRespondent: boolean;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
};

type TAltFormSettings = {
  openAt?: string;
  closeAt?: string;
  allowResubmit: boolean;
};

type TAltForm = {
  _id: string;
  board: string;
  school: string;
  creator: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  fields: TAltFormField[];
  settings: TAltFormSettings;
  sheet: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

#### 8-2. `frontend/src/types/altSheet.ts`

```typescript
type TAltSheet = {
  _id: string;
  form: string;
  board: string;
  school: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TAltSheetRow = {
  _id: string;
  sheet: string;
  form: string;
  board: string;
  _respondent?: string;
  _respondentId?: string;
  _respondentName?: string;
  data: Record<string, any>;
  _submittedAt: string;
  _updatedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

#### 8-3. `frontend/src/types/board.ts` 확장

```typescript
// 기존 TBoard에 추가
type TAltBoardRole = "admin" | "writer" | "respondent";

type TBoard = {
  // ... 기존 필드
  boardMode: "classic" | "alt";
  syllabus?: string;
  altBoardRole?: Record<string, TAltBoardRole>;
};
```

---

### Step 9: Frontend API — useAPIv2 확장

> Step 8과 동시 진행.

#### 9-1. `frontend/src/hooks/useAPIv2.ts` 추가

```typescript
// Alt Form
CAltForm({ data })
RAltForms({ query: { board } })
RAltForm({ params: { _id } })
UAltForm({ params: { _id }, data })
DAltForm({ params: { _id } })

// Alt Sheet Row
CAltSheetRow({ data })                      // Form 응답 제출
RAltSheetRows({ query: { sheet, form } })   // Sheet 행 조회
RAltSheetRowsMy({ query: { form } })        // 내 응답 조회
UAltSheetRow({ params: { _id }, data })     // 셀 수정
DAltSheetRow({ params: { _id } })           // 행 삭제
CAltSheetRowsBulk({ data })                 // 다중 행 입력

// 수업 계획서 Alt Board
RSyllabusAltBoard({ params: { _id } })      // 수업 계획서의 Alt Board 조회/생성
```

---

### Step 10: Frontend — Board UI 탭 구조

> Step 8~9 완료 후.

#### 10-1. 보드 상세 페이지 수정

`frontend/src/pages/boards/BoardPid.tsx` 수정:

```
boardMode === "alt"일 때:
  탭 네비게이션 표시
  ├── [Docs]  → 기존 PostList 컴포넌트 재사용
  ├── [Form]  → AltFormList (신규)
  ├── [Sheet] → AltSheetList (신규)
  └── [채팅]  → Phase 4

boardMode === "classic"일 때:
  기존 게시판 UI 그대로
```

#### 10-2. 신규 컴포넌트 구조

```
frontend/src/pages/boards/altBoard/
├── AltBoardTabs.tsx          — 탭 네비게이션
├── AltFormList.tsx           — Form 목록
├── AltFormCreate.tsx         — Form 생성/편집 (빌더)
├── AltFormRenderer.tsx       — Form 응답 UI (학생용)
├── AltSheetList.tsx          — Sheet 목록
├── AltSheetView.tsx          — Sheet 테이블 뷰
└── AltDocsMergeRenderer.tsx  — 머지 렌더링 컴포넌트
```

---

### Step 11: Frontend — Alt Form 빌더

> Step 10과 동시 진행 가능.

#### 11-1. AltFormCreate.tsx

기존 SurveyBuilder 참고하여 구현:

```
┌─ Form 설정 ─────────────────────────────┐
│  제목: [____________]                    │
│  설명: [____________]                    │
│                                         │
│  공개 시작: [____-__-__ __:__]           │
│  공개 종료: [____-__-__ __:__]           │
│  재제출: ☐ 허용                          │
├─────────────────────────────────────────┤
│  필드 목록 (드래그 정렬)                   │
│                                         │
│  ┌ 필드 1 ─────────────────────────┐    │
│  │ 라벨: [과제 제목]                │    │
│  │ 타입: [text ▼]                  │    │
│  │ 권한: ● respondent  ○ owner     │    │
│  │ ☑ 필수                          │    │
│  │ 유효성: 최소 [1]자  최대 [100]자 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ 필드 추가]                           │
└─────────────────────────────────────────┘
```

Phase 1에서 지원하는 필드 타입: text, textarea, number, date, file
나머지는 Phase 2에서 추가.

#### 11-2. AltFormRenderer.tsx

기존 SurveyRenderer 참고하여 구현:

```
Form 제목 / 설명

[제출 상태: ✓ 제출 완료 (3/15 14:23)  또는  ○ 미제출]

필드 1: 과제 제목 *
[____________]

필드 2: 파일 업로드
[파일 선택]

[제출]  [취소]
```

- respondent 권한 필드만 표시
- 공개 기간 외에는 접근 불가 표시
- 이미 제출한 경우 상태 표시 + 재제출 옵션

---

### Step 12: Frontend — Alt Sheet 테이블 뷰

> Step 11과 동시 진행 가능.

#### 12-1. AltSheetView.tsx

```
┌─────────────────────────────────────────────────┐
│  Sheet: 과제 제출                                │
├──────────┬──────────┬──────────┬────────────────┤
│ 응답자    │ 과제 제목 │ 파일     │ 점수           │
├──────────┼──────────┼──────────┼────────────────┤
│ 김학생    │ 1주차    │ 📎 a.pdf│ [90  ]  ← 편집  │
│ 박학생    │ 1주차    │ 📎 b.pdf│ [85  ]         │
│ 이학생    │ —        │ —        │ [   ]          │
└──────────┴──────────┴──────────┴────────────────┘

교사 뷰: 전체 행 + 모든 컬럼 + 셀 편집 가능
학생 뷰: 본인 행만 + respondent 컬럼 + 공개된 owner 컬럼 (읽기 전용)
```

핵심 기능:
- 컬럼 = Form 필드 (자동), 시스템 컬럼 (_respondent, _submittedAt)
- 셀 클릭 시 인라인 편집 (교사만, owner 필드)
- 행 삭제 (교사)
- 행 직접 추가 (교사, 직접 입력 모드)

---

### Step 13: Frontend — Alt Docs 머지 렌더링

> Step 12 이후. Sheet 데이터가 있어야 의미있음.

#### 13-1. AltDocsMergeRenderer.tsx

기존 게시글 뷰어 (PostPid.tsx)에 통합:

```
게시글 content에 {{#sheet}} 감지 시:

교사 뷰:
  ┌────────────────────────────┐
  │ 조회 대상: [김학생 ▼] [검색]│  ← 사용자 선택
  ├────────────────────────────┤
  │                            │
  │  김학생님의 과제 현황        │  ← 렌더링된 결과
  │  - 1주차 과제: 90점         │
  │  총 1건 제출                │
  │                            │
  │  [.md 다운로드] [인쇄]      │
  └────────────────────────────┘

학생 뷰:
  ┌────────────────────────────┐
  │  내 과제 현황               │  ← 자동 매칭
  │  - 1주차 과제: 90점         │
  │  총 1건 제출                │
  │                            │
  │  [.md 다운로드]             │
  └────────────────────────────┘
```

---

### Step 14: Frontend — 수업 계획서 탭

> Step 10 완료 후.

#### 14-1. 수업 계획서 페이지 수정

기존 수업 계획서 페이지에 [Alt Board] 탭 추가:

```
[수업 정보] [수업 계획] [수강생] [Alt Board]
                                    ↓
                          BoardPid (boardMode="alt") 렌더링
```

- 탭 클릭 시 RSyllabusAltBoard API 호출 → Alt Board 자동 생성/조회
- 이후 AltBoardTabs로 Docs/Form/Sheet 탭 표시

---

## 구현 의존성 그래프

```
Step 1 (모델: AltForm, AltSheet, AltSheetRow)
Step 2 (모델: Board 확장, Syllabus 확장)     ← 동시 진행 가능
Step 8 (타입 정의)                           ← 동시 진행 가능
Step 9 (API 훅)                             ← Step 8 후

Step 3 (컨트롤러: AltForm CRUD)              ← Step 1 후
Step 4 (컨트롤러: AltSheetRow CRUD)          ← Step 3 후
Step 5 (머지 엔진)                           ← Step 4 후
Step 6 (수업 계획서 연결)                     ← Step 2 후
Step 7 (캘린더 동기화)                        ← Step 3 후

Step 10 (Board UI 탭)                        ← Step 9 후
Step 11 (Form 빌더/렌더러)                    ← Step 10 후
Step 12 (Sheet 테이블 뷰)                     ← Step 10 후 (11과 동시 가능)
Step 13 (Docs 머지 렌더링)                    ← Step 12 후
Step 14 (수업 계획서 탭)                       ← Step 10 후
```

```
병렬 그룹 A (Backend 기반):  Step 1 + 2 + 8 → Step 3 → Step 4 → Step 5
병렬 그룹 B (연동):          Step 6 (← Step 2), Step 7 (← Step 3)
병렬 그룹 C (Frontend):      Step 9 → 10 → 11 + 12 + 14 → 13
```

---

## 파일 생성/수정 목록

### Backend 신규 파일

```
backend/src/models/AltForm.js
backend/src/models/AltSheet.js
backend/src/models/AltSheetRow.js
backend/src/controllers/altForms.js
backend/src/controllers/altSheetRows.js
backend/src/services/altForms.js
backend/src/utils/mergeEngine.js
```

### Backend 수정 파일

```
backend/src/models/Board.js          — boardMode, syllabus, altBoardRole 추가
backend/src/models/Syllabus.js       — altBoard 필드 추가
backend/src/models/CalendarEvent.js  — sourceType "altForm" 추가
backend/src/controllers/posts.js     — 머지 렌더링 엔드포인트 추가
backend/src/controllers/syllabuses.js — Alt Board 조회/생성 엔드포인트 추가
backend/src/routes/*.js              — 새 라우트 등록
```

### Frontend 신규 파일

```
frontend/src/types/altForm.ts
frontend/src/types/altSheet.ts
frontend/src/pages/boards/altBoard/AltBoardTabs.tsx
frontend/src/pages/boards/altBoard/AltFormList.tsx
frontend/src/pages/boards/altBoard/AltFormCreate.tsx
frontend/src/pages/boards/altBoard/AltFormRenderer.tsx
frontend/src/pages/boards/altBoard/AltSheetList.tsx
frontend/src/pages/boards/altBoard/AltSheetView.tsx
frontend/src/pages/boards/altBoard/AltDocsMergeRenderer.tsx
```

### Frontend 수정 파일

```
frontend/src/types/board.ts        — boardMode, altBoardRole 추가
frontend/src/hooks/useAPIv2.ts     — Alt Form/Sheet API 추가
frontend/src/pages/boards/BoardPid.tsx — Alt Board 탭 분기
```

---

## Phase 1 완료 검증 시나리오

```
1. 교사가 수업 계획서에서 [Alt Board] 탭을 클릭한다
   → Alt Board가 자동 생성되고 수강생이 멤버로 동기화된다

2. 교사가 [Form] 탭에서 "1주차 과제" Form을 생성한다
   - 필드: 과제 제목 (text, respondent), 파일 (file, respondent),
           점수 (number, owner, 응답자에게 공개), 피드백 (text, owner, 응답자에게 공개)
   - 공개 종료: 3/17 23:59
   → Sheet가 자동 생성된다

3. 학생이 [Form] 탭에서 "1주차 과제"를 열고 응답한다
   - 과제 제목, 파일만 보임
   - 제출 → Sheet에 행 추가됨
   → 캘린더에 마감일 이벤트가 표시된다

4. 교사가 [Sheet] 탭에서 "1주차 과제" Sheet를 연다
   - 전체 학생 응답이 테이블로 표시됨
   - 점수, 피드백 셀을 클릭하여 채점

5. 학생이 [Sheet] 탭에서 본인 행을 확인한다
   - 본인 행만 표시, 점수/피드백이 읽기 전용으로 보임

6. 교사가 [Docs] 탭에서 "성적 통지서" 게시글을 작성한다
   - {{#sheet 1주차 과제}}
   - {{_respondentName}}님의 과제 점수: {{점수}}점
   - 피드백: {{피드백}}
   → 교사는 학생을 선택하여 결과 확인
   → 학생은 자동으로 본인 결과 확인
```
