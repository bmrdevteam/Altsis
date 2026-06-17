# ALTSIS 교육활동(Activity) Phase 1 구현 계획

> Automation Agent용 실행 문서. 전체 로드맵은 상위 기획( Activity System Integration ) 참고.

## 브랜치

| 항목 | 브랜치 |
|------|--------|
| **베이스** | `399-feature-altsis-next-project-update-to-v20` |
| **작업** | `feature/activity-system` |
| **PR 대상** | `399-feature-altsis-next-project-update-to-v20` (NOT `dev`) |

## 목표

**"교사가 템플릿(과제/퀴즈/토론)으로 활동 생성 → 학생 제출 → 교사 피드백"** 이 수업 상세 안에서 동작.

## 핵심 원칙

1. **Activity는 Syllabus에 종속** — 수업(`Syllabus`) 아래 레이어
2. **Alt Board/AltForm은 실행 엔진** — 병렬 시스템 만들지 말 것
3. **Feedback ≠ Evaluation** — Phase 1은 피드백만, `Enrollment.evaluation` 연동은 Phase 2
4. **템플릿 우선 UX** — 기본 제공(과제/퀴즈/토론) + 복제·수정·신규 생성

## Phase 1 체크리스트

### Backend

- [ ] `backend/src/models/Activity.js`
- [ ] `backend/src/models/ActivityTemplate.js`
- [ ] `backend/src/models/ActivitySubmission.js`
- [ ] `backend/src/models/index.js` 등록
- [ ] `backend/src/services/activities.js` — CRUD, AltForm 연동, 권한
- [ ] `backend/src/services/activitySubmissions.js` — 제출·피드백
- [ ] `backend/src/controllers/activities.js`
- [ ] `backend/src/controllers/activityTemplates.js`
- [ ] `backend/src/routes/activities.js`, `activityTemplates.js`
- [ ] `backend/src/routes/index.js` 마운트
- [ ] `Season.permissionActivityV2` + Registration 동기화 (`seasons.js` 패턴)
- [ ] `CalendarEvent` `sourceType: "activity"` 마감일 동기화
- [ ] 기본 템플릿 시드: 과제(`assignment`), 퀴즈(`quiz`), 토론(`discussion`)

### Frontend

- [ ] `frontend/src/types/activity.ts`
- [ ] `frontend/src/hooks/useAPIv2.ts` — `ActivityAPI`, `ActivityTemplateAPI`
- [ ] `frontend/src/pages/courses/activity/` — ActivityList, ActivityCreatePopup, ActivityDetail, ActivityTemplateList, ActivityTemplateEditor
- [ ] `frontend/src/pages/courses/tab/Mentoring/ActivityTab.tsx` (AltBoardTab 대체/발전)
- [ ] `frontend/src/pages/courses/tab/Enrolled/` — 학생 활동 탭
- [ ] `frontend/src/pages/courses/tab/Mentoring/Index.tsx` — `보드` → `활동` 탭
- [ ] `frontend/src/pages/admin/schools/tab/seasons/tab/permission/PermissionV2.tsx` — activity 권한
- [ ] AltFormRenderer / AltSheetView 래핑 (제출·피드백)

### 완료 조건

- 템플릿 갤러리에서 과제/퀴즈/토론 선택 → 제목·마감 입력 → Activity 생성
- 학생 제출 (`not_started` → `submitted`)
- 교사 피드백 (owner 필드 + ActivitySubmission.feedback)
- 템플릿 복제·수정·신규 생성
- 기존 테스트 통과

## 제외 (하지 말 것)

- Enrollment.evaluation 브릿지
- Timeline / 학생 할 일 대시보드
- AI 튜터 연동
- block editor Canvas (Markdown + 첨부로 시작)
- 별도 `/:academyId/:schoolId/activities` 최상위 라우트

## 데이터 모델 요약

### Activity

- `syllabus`, denormalized season/school fields
- `title`, `type`, `status` (draft/published/closed)
- `content`, `attachments`
- `altForm`, `altBoard`
- `openAt`, `dueAt`, `allowLateSubmission`, `allowResubmit`
- `evaluationMode`: none | feedback | formal
- `rubric` (embedded lightweight)
- `sourceTemplate`, `order`

### ActivityTemplate

- `scope`: builtin | school | personal
- `name`, `type`, `preset` (content, altFormSchema, rubric, aiTutor stub, etc.)
- `isEditable` (builtin=false)
- builtin 3종: 과제, 퀴즈, 토론

### ActivitySubmission

- `activity`, `altSheetRow`, `enrollment`, student fields
- `status`: not_started | in_progress | submitted | returned | completed
- `feedback[]`, `submittedAt`, `resubmitCount`

## API

```
/api/activities — CRUD + submissions + feedback + publish
/api/activity-templates — CRUD + duplicate + instantiate
```

## 참고 파일

- `CLAUDE.md` — 프로젝트 규칙
- `backend/src/models/Syllabus.js`, `Enrollment.js`, `AltForm.js`, `AltSheetRow.js`
- `backend/src/controllers/syllabuses.js`, `enrollments.js`, `altForms.js`
- `frontend/src/pages/courses/tab/Mentoring/AltBoardTab.tsx`
- `frontend/src/pages/boards/altBoard/AltFormRenderer.tsx`, `AltSheetView.tsx`
- `PLAN.md` — Alt Board 기획 (수업 보드 연동)

## Agent 지침

1. 이 문서와 `CLAUDE.md`를 먼저 읽을 것
2. 기존 패턴 준수 (ESM, useAPIv2, SCSS modules, `/:academyId/:schoolId` 라우팅)
3. 사용자 확인 없이 체크리스트 전체 완료
4. `feature/activity-system`에 커밋 후 **`399-feature-altsis-next-project-update-to-v20` 대상** PR 생성 (`dev` 아님)
5. PR 본문: 구현 요약, 테스트 방법, 알려진 제한
