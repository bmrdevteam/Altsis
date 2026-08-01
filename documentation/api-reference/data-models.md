# 데이터 모델

Altsis 학교 정보 시스템의 MongoDB 스키마(Mongoose) 전체 명세입니다. 모든 모델은 `backend/src/models/` 디렉토리에 정의되어 있습니다.

---

## 목차

1. [Academy (아카데미)](#academy-아카데미)
2. [User (사용자)](#user-사용자)
3. [School (학교)](#school-학교)
4. [Season (학기)](#season-학기)
5. [Registration (학기 등록)](#registration-학기-등록)
6. [Syllabus (강의계획서)](#syllabus-강의계획서)
7. [Enrollment (수강)](#enrollment-수강)
8. [Archive (기록)](#archive-기록)
9. [Form (양식)](#form-양식)
10. [Board (보드)](#board-보드)
11. [Post (게시글)](#post-게시글)
12. [Comment (댓글)](#comment-댓글)
13. [Notification (알림)](#notification-알림)
14. [NotificationSetting (알림 설정)](#notificationsetting-알림-설정)
15. [CalendarEvent (캘린더 일정)](#calendarevent-캘린더-일정)
16. [UserCalendar (사용자 캘린더)](#usercalendar-사용자-캘린더)
17. [ChatRoom (채팅방)](#chatroom-채팅방)
18. [ChatMessage (채팅 메시지)](#chatmessage-채팅-메시지)
19. [ChatFile (채팅 파일)](#chatfile-채팅-파일)
20. [Reminder (리마인더)](#reminder-리마인더)
21. [ThemeSetting (테마 설정)](#themesetting-테마-설정)
22. [Apps (앱)](#apps-앱)
23. [TimeBlock (시간 블록)](#timeblock-시간-블록)
24. [AltForm (양식 빌더)](#altform-양식-빌더)
25. [AltSheet (시트)](#altsheet-시트)
26. [AltSheetRow (시트 행)](#altsheetrow-시트-행)
27. [AIChatSession (AI 채팅 세션)](#aichatsession-ai-채팅-세션)
28. [AIChatMessage (AI 채팅 메시지)](#aichatmessage-ai-채팅-메시지)
29. [AIUsageLog (AI 사용량 로그)](#aiusagelog-ai-사용량-로그)
30. [BoardFavorite (보드 즐겨찾기)](#boardfavorite-보드-즐겨찾기)
31. [SurveyResponse (설문 응답)](#surveyresponse-설문-응답)
32. [RequestStat (요청 통계)](#requeststat-요청-통계)

---

## Academy (아카데미)

아카데미는 시스템의 최상위 단위입니다. 아카데미 문서는 **루트 DB**에 저장되며, 각 아카데미는 독립적인 데이터베이스(`{academyId}-db`)를 가집니다.

> **파일**: `backend/src/models/Academy.js`
> **DB**: 루트 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `academyId_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `academyId` | `String` | O | - | 아카데미 고유 ID (유효성 검사 적용) |
| `academyName` | `String` | O | - | 아카데미 이름 (유효성 검사 적용) |
| `email` | `String` | X | - | 이메일 (유효성 검사 적용) |
| `tel` | `String` | X | - | 전화번호 (유효성 검사 적용) |
| `adminId` | `String` | O | - | 관리자 사용자 ID (유효성 검사 적용) |
| `adminName` | `String` | O | - | 관리자 이름 (유효성 검사 적용) |
| `dbName` | `String` | 자동 | - | 아카데미 DB명 (`{academyId}-db`). **API 응답에서 제외** (`select: false`) |
| `isActivated` | `Boolean` | X | `true` | 활성화 상태. `false`이면 로그인 불가 |
| `chatEnabled` | `Boolean` | X | `false` | 채팅 기능 활성화 상태 |
| `boardEnabled` | `Boolean` | X | `false` | 보드 기능 활성화 상태 |
| `aiEnabled` | `Boolean` | X | `false` | AI 기능 활성화 상태 |
| `aiProvider` | `String` | X | `"gemini"` | AI 제공자 (`openai` / `anthropic` / `gemini`) |
| `aiApiKey` | `String` | X | - | 선택한 제공자의 API 키. **API 응답에서 제외** (`select: false`) |
| `aiModel` | `String` | X | `"gemini-3.6-flash"` | 사용 AI 모델명 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 (timestamps) |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 (timestamps) |

### pre-save 훅

- `academyId`가 변경되면 `dbName`을 `{academyId}-db`로 자동 설정합니다.

---

## User (사용자)

사용자 계정 정보입니다. 비밀번호는 bcrypt로 해시화되어 저장됩니다.

> **파일**: `backend/src/models/User.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `userId_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `userId` | `String` | O | - | 사용자 고유 ID (유효성 검사 적용) |
| `userName` | `String` | O | - | 사용자 이름 (유효성 검사 적용) |
| `password` | `String` | O | - | 비밀번호. bcrypt 해시. **API 응답에서 제외** (`select: false`) |
| `auth` | `String` | X | `"member"` | 권한 등급. enum: `"owner"`, `"admin"`, `"manager"`, `"member"` |
| `email` | `String` | X | - | 이메일 (유효성 검사 적용) |
| `tel` | `String` | X | - | 전화번호 (유효성 검사 적용) |
| `snsId` | `Object` | X | - | 소셜 로그인 계정 |
| `snsId.google` | `String` | X | - | 연결된 Google 이메일 |
| `schools` | `Array` | X | `[]` | 등록된 학교 목록 |
| `schools[].school` | `ObjectId` | - | - | 학교 `_id` |
| `schools[].schoolId` | `String` | - | - | 학교 ID |
| `schools[].schoolName` | `String` | - | - | 학교 이름 |
| `profile` | `String` | X | - | 프로필 사진 URL |
| `academyId` | `String` | X | - | 소속 아카데미 ID |
| `academyName` | `String` | X | - | 소속 아카데미 이름 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 (timestamps) |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 (timestamps) |

### pre-save 훅

- `password`가 변경되면 bcrypt로 해시화하여 저장합니다 (salt rounds: 환경변수 `saltRounds`).

### 인스턴스 메서드

- `comparePassword(plainPassword)`: 평문 비밀번호를 해시와 비교합니다.

---

## School (학교)

학교 정보와 기록 양식(FormArchive)을 관리합니다.

> **파일**: `backend/src/models/School.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `schoolId_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `schoolId` | `String` | O | - | 학교 고유 ID (유효성 검사 적용) |
| `schoolName` | `String` | O | - | 학교 이름 (유효성 검사 적용) |
| `formArchive` | `Array` | X | `[]` | 기록 양식 목록 |
| `deletedFormArchive` | `Array` | X | `[]` | 삭제된 기록 양식 (휴지통) |
| `links` | `Array` | X | `[]` | 외부 링크 목록 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### 서브 도큐먼트: FormArchiveItem

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `String` | - | 양식 이름 |
| `dataType` | `String` | `"array"` | 데이터 타입. enum: `"array"`, `"object"` |
| `fields` | `Array` | - | 필드 정의 배열 |
| `fields[].label` | `String` | - | 필드 이름 |
| `fields[].type` | `String` | `"input"` | enum: `"select"`, `"input"`, `"input-number"`, `"file"`, `"file-image"` |
| `fields[].options` | `String[]` | `[]` | 선택지 |
| `fields[].runningTotal` | `Boolean` | `false` | 누적 합계 표시 |
| `fields[].total` | `Boolean` | `false` | 합계 표시 |
| `authTeacher` | `String` | `"undefined"` | enum: `"undefined"`, `"viewAndEditStudents"`, `"viewAndEditMyStudents"` |
| `authStudent` | `String` | `"undefined"` | enum: `"undefined"`, `"view"`, `"viewAndEdit"` |
| `authManager` | `String` | `"undefined"` | enum: `"undefined"`, `"viewAndEdit"` |

### 서브 도큐먼트: DeletedFormArchiveItem

FormArchiveItem과 동일한 구조에 `deletedAt` 필드가 추가됩니다.

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `deletedAt` | `Date` | `Date.now` | 삭제 시점 |

### 서브 도큐먼트: Link

| 필드 | 타입 | 설명 |
|------|------|------|
| `url` | `String` | URL (예: `https://www.naver.com`) |
| `title` | `String` | 링크 제목 (예: "네이버") |

---

## Season (학기)

학기 정보로, 기간, 교과목, 강의실, 양식, 권한 등을 포함합니다.

> **파일**: `backend/src/models/Season.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `school_1, year_-1, term_1` | UNIQUE, COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `school` | `ObjectId` | O | - | 학교 `_id` |
| `schoolId` | `String` | O | - | 학교 ID |
| `schoolName` | `String` | O | - | 학교 이름 |
| `year` | `String` | O | - | 학년도 (예: "2024학년도") |
| `term` | `String` | O | - | 학기 (예: "1학기") |
| `period` | `Object` | X | `{start:"", end:""}` | 기간 |
| `period.start` | `String` | - | `""` | 시작일 (`YYYY-MM-DD` 또는 빈 문자열) |
| `period.end` | `String` | - | `""` | 종료일 (`YYYY-MM-DD` 또는 빈 문자열) |
| `classrooms` | `String[]` | X | `[]` | 강의실 목록 |
| `subjects` | `Object` | X | `{label:[], data:[]}` | 교과목 |
| `subjects.label` | `String[]` | - | `[]` | 분류 라벨 (예: `["교과","과목"]`) |
| `subjects.data` | `String[][]` | - | `[]` | 교과목 데이터 (예: `[["국어","현대시"]]`) |
| `formTimetable` | `Object` | X | - | 시간표 양식 (`{title, data}`) |
| `formSyllabus` | `Object` | X | - | 강의계획서 양식 (`{title, data}`) |
| `formEvaluation` | `Array` | X | `[]` | 평가 양식 항목 배열 |
| `permissionSyllabusV2` | `Object` | X | (아래 참조) | 수업 개설 권한 |
| `permissionEnrollmentV2` | `Object` | X | (아래 참조) | 수강신청 권한 |
| `permissionEvaluationV2` | `Object` | X | (아래 참조) | 평가 권한 |
| `aiSettings` | `Object` | X | (아래 참조) | AI 설정 |
| `isActivated` | `Boolean` | X | `false` | 활성화 상태 |
| `isActivatedFirst` | `Boolean` | X | `false` | 최초 활성화 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### 서브 도큐먼트: Permission

기본값: `{ teacher: false, student: false, exceptions: [] }`

| 필드 | 타입 | 설명 |
|------|------|------|
| `teacher` | `Boolean` | 교사 역할 허용 여부 |
| `student` | `Boolean` | 학생 역할 허용 여부 |
| `exceptions` | `Array` | 예외 사용자 목록 |
| `exceptions[].registration` | `String` | Registration `_id` |
| `exceptions[].role` | `String` | 역할 |
| `exceptions[].user` | `String` | 사용자 `_id` |
| `exceptions[].userId` | `String` | 사용자 ID |
| `exceptions[].userName` | `String` | 사용자 이름 |
| `exceptions[].isAllowed` | `Boolean` | 허용 여부 |

### 서브 도큐먼트: FormEvaluationItem

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `String` | - | 평가 항목명 (예: "멘토평가") |
| `type` | `String` | `"input"` | enum: `"input"`, `"input-number"`, `"select"` |
| `options` | `String[]` | `[]` | 선택지 (`type`이 `select`인 경우) |
| `combineBy` | `String` | `"term"` | 동기화 단위. enum: `"term"`, `"year"` |
| `authOption` | `String` | `"editByTeacher"` | 권한 옵션. enum: `"editByStudent"`, `"editByTeacher"`, `"editByTeacherAndStudentCanView"` |
| `auth` | `Object` | - | `authOption`에 따라 자동 설정 |
| `auth.edit` | `Object` | - | 편집 권한 (`{teacher, student}`) |
| `auth.view` | `Object` | - | 열람 권한 (`{teacher, student}`) |

### 서브 도큐먼트: AiSettings

기본값: `{ enabled: false, permission: {teacher: false, student: false}, guidelines: "", references: [] }`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `enabled` | `Boolean` | `false` | AI 활성화 |
| `permission.teacher` | `Boolean` | `false` | 교사 AI 사용 권한 |
| `permission.student` | `Boolean` | `false` | 학생 AI 사용 권한 |
| `guidelines` | `String` | `""` | AI 기본 지침 |
| `references` | `Array` | `[]` | 참고자료 배열 |
| `references[].title` | `String` | - | 자료 제목 |
| `references[].content` | `String` | - | 자료 내용 |
| `references[].fileName` | `String` | - | 파일명 |
| `references[].fileKey` | `String` | - | S3 키 |
| `references[].fileSize` | `Number` | - | 파일 크기 |
| `references[].mimeType` | `String` | - | MIME 타입 |

### 인스턴스 메서드

- `getSubdocument()`: 다른 모델에 내장할 학기 하위 문서를 반환합니다.

---

## Registration (학기 등록)

사용자의 학기별 등록 정보(역할, 학년, 담당교사 등)를 관리합니다.

> **파일**: `backend/src/models/Registration.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `season_1, user_1` | UNIQUE, COMPOUND |
| `user_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `season` | `ObjectId` | O | - | 학기 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` |
| `schoolId` | `String` | X | - | 학교 ID |
| `schoolName` | `String` | X | - | 학교 이름 |
| `year` | `String` | X | - | 학년도 |
| `term` | `String` | X | - | 학기 |
| `period` | `Object` | X | - | 기간 (Season에서 복사) |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | O | - | 사용자 ID |
| `userName` | `String` | O | - | 사용자 이름 |
| `role` | `String` | O | `"student"` | 역할. enum: `"student"`, `"teacher"` |
| `grade` | `String` | X | - | 학년 |
| `group` | `String` | X | - | 그룹 |
| `teacher` | `ObjectId` | X | - | 담당 교사 `_id` |
| `teacherId` | `String` | X | - | 담당 교사 ID |
| `teacherName` | `String` | X | - | 담당 교사 이름 |
| `subTeacher` | `ObjectId` | X | - | 부담당 교사 `_id` |
| `subTeacherId` | `String` | X | - | 부담당 교사 ID |
| `subTeacherName` | `String` | X | - | 부담당 교사 이름 |
| `isActivated` | `Boolean` | X | `false` | 학기 활성화 상태 (Season에서 동기화) |
| `memos` | `Array` | X | `[]` | 메모 배열 |
| `memos[].title` | `String` | - | - | 메모 제목 |
| `memos[].day` | `String` | - | - | 요일 |
| `memos[].start` | `String` | - | - | 시작 시간 |
| `memos[].end` | `String` | - | - | 종료 시간 |
| `memos[].memo` | `String` | - | - | 메모 내용 |
| `permissionSyllabusV2` | `Boolean` | X | `false` | 수업 개설 권한 |
| `permissionEnrollmentV2` | `Boolean` | X | `false` | 수강신청 권한 |
| `permissionEvaluationV2` | `Boolean` | X | `false` | 평가 권한 |
| `formEvaluation` | `Array` | X | `[]` | 평가 양식 (Season에서 복사) |

---

## Syllabus (강의계획서)

수업 개설 정보를 관리합니다.

> **파일**: `backend/src/models/Syllabus.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `season_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `season` | `ObjectId` | O | - | 학기 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` |
| `schoolId` | `String` | X | - | 학교 ID |
| `schoolName` | `String` | X | - | 학교 이름 |
| `year` | `String` | X | - | 학년도 |
| `term` | `String` | X | - | 학기 |
| `user` | `ObjectId` | O | - | 개설자 `_id` |
| `userId` | `String` | O | - | 개설자 사용자 ID |
| `userName` | `String` | O | - | 개설자 이름 |
| `classTitle` | `String` | O | - | 수업 제목 |
| `time` | `Array` | X | `[]` | 수업 시간 (TimeBlock 배열) |
| `classroom` | `String` | X | - | 강의실 |
| `subject` | `String[]` | X | `[]` | 교과목 분류 |
| `point` | `Number` | X | `0` | 학점 |
| `limit` | `Number` | X | `0` | 수강 정원 (0: 무제한) |
| `count` | `Number` | X | `0` | 현재 수강생 수 |
| `count_limit` | `String` | X | - | 수강/정원 표시 문자열 |
| `info` | `Object` | X | - | 세부 정보 (에디터 데이터) |
| `teachers` | `Array` | O | - | 멘토(교사) 목록 (최소 1명 필수) |
| `teachers[]._id` | `ObjectId` | O | - | 교사 `_id` |
| `teachers[].userId` | `String` | O | - | 교사 사용자 ID |
| `teachers[].userName` | `String` | O | - | 교사 이름 |
| `teachers[].confirmed` | `Boolean` | X | `false` | 승인 상태 |
| `teachers[].isHiddenFromCalendar` | `Boolean` | X | `false` | 캘린더 숨김 |
| `coverImage` | `String` | X | - | 커버 이미지 URL |
| `coverColor` | `String` | X | - | 커버 배경 색상 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### pre-save 훅

- `time`이 변경되면 요일+시작시간 순으로 자동 정렬합니다.

---

## Enrollment (수강)

학생의 수강 정보와 평가 데이터를 관리합니다. 평가 데이터는 암호화되어 저장됩니다.

> **파일**: `backend/src/models/Enrollment.js`
> **DB**: 아카데미 데이터베이스
> **암호화**: `mongoose-encryption` (`evaluation` 필드)

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `syllabus_1, student_1` | UNIQUE, COMPOUND |
| `student_1, season_1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| **강의계획서 데이터** | | | | |
| `syllabus` | `ObjectId` | O | - | 강의계획서 `_id` |
| `season` | `ObjectId` | X | - | 학기 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` |
| `schoolId` | `String` | X | - | 학교 ID |
| `schoolName` | `String` | X | - | 학교 이름 |
| `year` | `String` | X | - | 학년도 |
| `term` | `String` | X | - | 학기 |
| `user` | `ObjectId` | X | - | 개설자 `_id` |
| `userId` | `String` | X | - | 개설자 사용자 ID |
| `userName` | `String` | X | - | 개설자 이름 |
| `classTitle` | `String` | X | - | 수업 제목 |
| `time` | `Array` | X | `[]` | 수업 시간 |
| `classroom` | `String` | X | - | 강의실 |
| `subject` | `String[]` | X | `[]` | 교과목 |
| `point` | `Number` | X | - | 학점 |
| `limit` | `Number` | X | - | 수강 정원 |
| `count_limit` | `String` | X | - | 수강/정원 표시 |
| `info` | `Object` | X | - | 세부 정보 |
| `teachers` | `Array` | X | - | 멘토 목록 |
| `coverImage` | `String` | X | - | 커버 이미지 |
| `coverColor` | `String` | X | - | 커버 색상 |
| **수강 데이터** | | | | |
| `student` | `ObjectId` | O | - | 수강생(학생) `_id` |
| `studentId` | `String` | X | - | 학생 사용자 ID |
| `studentName` | `String` | X | - | 학생 이름 |
| `studentGrade` | `String` | X | - | 학생 학년 |
| `evaluation` | `Object` | X | - | 평가 데이터. **암호화 저장**. 예: `{"멘토평가": "...", "출석등급": "A"}` |
| `memo` | `String` | X | - | 메모 |
| `isHiddenFromCalendar` | `Boolean` | X | `false` | 캘린더 숨김 설정 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

> **중요**: `evaluation` 필드는 `mongoose-encryption`으로 암호화됩니다. 평가 조회 전용 API(`GET /api/enrollments/evaluation`)에서만 복호화된 데이터가 반환됩니다.

---

## Archive (기록)

학생의 기록 데이터를 관리합니다. 학교의 기록 양식(FormArchive)에 따라 구조화된 데이터가 암호화되어 저장됩니다.

> **파일**: `backend/src/models/Archive.js`
> **DB**: 아카데미 데이터베이스
> **암호화**: `mongoose-encryption` (`data` 필드)

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `school_1, user_1` | UNIQUE, COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | X | - | 사용자 ID |
| `userName` | `String` | X | - | 사용자 이름 |
| `school` | `ObjectId` | O | - | 학교 `_id` |
| `schoolId` | `String` | X | - | 학교 ID |
| `schoolName` | `String` | X | - | 학교 이름 |
| `data` | `Object` | X | `{}` | 기록 데이터. **암호화 저장**. 예: `{"인적사항": {"이름": "홍길동"}, "성적기록": [{...}]}` |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## Form (양식)

시간표, 강의계획서, 인쇄용 양식 등의 문서 템플릿을 관리합니다.

> **파일**: `backend/src/models/Form.js`
> **DB**: 아카데미 데이터베이스

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `userId` | `String` | X | - | 작성자 사용자 ID |
| `userName` | `String` | X | - | 작성자 이름 |
| `type` | `String` | O | - | 양식 타입 (예: `"timetable"`, `"syllabus"`, `"print"`) |
| `title` | `String` | O | - | 양식 제목 |
| `archived` | `Boolean` | X | `false` | 보관 처리 설정 |
| `data` | `Array` | X | - | 에디터에 의해 설정된 양식 데이터 |
| `permissionView` | `Object` | X | (아래 참조) | 문서 열람 권한 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### 서브 도큐먼트: FormPermission

기본값: `{ teacher: true, student: false, exceptions: [] }`

| 필드 | 타입 | 설명 |
|------|------|------|
| `teacher` | `Boolean` | 교사 열람 권한 |
| `student` | `Boolean` | 학생 열람 권한 |
| `exceptions` | `Array` | 예외 사용자 목록 |
| `exceptions[].user` | `ObjectId` | 사용자 `_id` |
| `exceptions[].userId` | `String` | 사용자 ID |
| `exceptions[].userName` | `String` | 사용자 이름 |
| `exceptions[].isAllowed` | `Boolean` | 허용 여부 |

---

## Board (보드)

학교별 보드를 관리합니다. Alt Board 모드에서는 양식(Form), 시트(Sheet), 보드 채팅을 지원합니다. 작성/읽기/댓글 권한을 역할별로 세밀하게 설정할 수 있습니다.

> **파일**: `backend/src/models/Board.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `school_1` | INDEX |
| `school_1, slug_1` | UNIQUE, COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `school` | `ObjectId` | O | - | 학교 `_id` |
| `schoolId` | `String` | O | - | 학교 ID |
| `schoolName` | `String` | O | - | 학교 이름 |
| `name` | `String` | O | - | 게시판 이름 |
| `slug` | `String` | O | - | URL 슬러그 |
| `description` | `String` | X | `""` | 게시판 설명 |
| `creator` | `ObjectId` | X | - | 생성자 `_id` |
| `creatorId` | `String` | X | - | 생성자 사용자 ID |
| `creatorName` | `String` | X | - | 생성자 이름 |
| `permissionWrite` | `Object` | X | `{manager:true, teacher:true, student:false}` | 게시글 작성 권한 |
| `permissionRead` | `Object` | X | `{manager:true, teacher:true, student:true}` | 게시글 읽기 권한 |
| `permissionComment` | `Object` | X | `{manager:true, teacher:true, student:true}` | 댓글 작성 권한 |
| `isDefault` | `Boolean` | X | `false` | 기본 게시판 (공지사항) 여부 |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 |
| `order` | `Number` | X | `0` | 정렬 순서 |
| `postCount` | `Number` | X | `0` | 게시글 수 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### 서브 도큐먼트: BoardPermission

| 필드 | 타입 | 설명 |
|------|------|------|
| `manager` | `Boolean` | 운영자 권한 |
| `teacher` | `Boolean` | 교사 권한 |
| `student` | `Boolean` | 학생 권한 |
| `exceptions` | `Array` | 예외 사용자 목록 |

---

## Post (게시글)

게시판의 게시글을 관리합니다.

> **파일**: `backend/src/models/Post.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `board_1, createdAt_-1` | COMPOUND |
| `board_1, isPinned_-1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `board` | `ObjectId` | O | - | 게시판 `_id` |
| `author` | `ObjectId` | O | - | 작성자 `_id` |
| `authorId` | `String` | O | - | 작성자 사용자 ID |
| `authorName` | `String` | O | - | 작성자 이름 |
| `authorProfile` | `String` | X | - | 작성자 프로필 사진 URL |
| `title` | `String` | O | - | 제목 |
| `content` | `String` | O | - | 내용 (Markdown) |
| `category` | `String` | X | - | 카테고리 |
| `isPinned` | `Boolean` | X | `false` | 상단 고정 여부 |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 (soft delete) |
| `viewCount` | `Number` | X | `0` | 조회수 |
| `targetAudience` | `Object` | X | - | 대상 지정 (알림 발송 대상) |
| `targetAudience.type` | `String` | X | `"all"` | enum: `"all"`, `"manager"`, `"teacher"`, `"student"`, `"custom"` |
| `targetAudience.users` | `Array` | X | - | custom인 경우 사용자 목록 |
| `targetAudience.grade` | `Number` | X | - | 학년 지정 |
| `attachments` | `Array` | X | `[]` | 첨부파일 배열 |
| `attachments[].url` | `String` | - | - | 파일 URL |
| `attachments[].fileName` | `String` | - | - | 파일명 |
| `attachments[].fileSize` | `Number` | - | - | 파일 크기 (bytes) |
| `attachments[].mimeType` | `String` | - | - | MIME 타입 |
| `attachments[].key` | `String` | - | - | S3 키 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## Comment (댓글)

게시글의 댓글을 관리합니다. 대댓글(답글)을 지원합니다.

> **파일**: `backend/src/models/Comment.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `post_1, createdAt_1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `post` | `ObjectId` | O | - | 게시글 `_id` |
| `author` | `ObjectId` | O | - | 작성자 `_id` |
| `authorId` | `String` | O | - | 작성자 사용자 ID |
| `authorName` | `String` | O | - | 작성자 이름 |
| `authorProfile` | `String` | X | - | 작성자 프로필 사진 URL |
| `content` | `String` | O | - | 댓글 내용 |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 (soft delete) |
| `parentComment` | `ObjectId` | X | `null` | 부모 댓글 `_id` (대댓글인 경우) |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## Notification (알림)

발신 및 수신 알림을 관리합니다.

> **파일**: `backend/src/models/Notification.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `type` | `String` | O | - | 알림 유형. enum: `"sent"`, `"received"` |
| `user` | `ObjectId` | O | - | 소유자 `_id` |
| `userId` | `String` | O | - | 소유자 사용자 ID |
| `userName` | `String` | O | - | 소유자 이름 |
| **발신 (`type: "sent"`)** | | | | |
| `toUserList` | `Array` | X | - | 수신자 목록 |
| `toUserList[].user` | `ObjectId` | O | - | 수신자 `_id` |
| `toUserList[].userId` | `String` | O | - | 수신자 사용자 ID |
| `toUserList[].userName` | `String` | O | - | 수신자 이름 |
| **수신 (`type: "received"`)** | | | | |
| `fromUser` | `ObjectId` | X | - | 발신자 `_id` |
| `fromUserId` | `String` | X | - | 발신자 사용자 ID |
| `fromUserName` | `String` | X | - | 발신자 이름 |
| `checked` | `Boolean` | X | - | 확인 여부 |
| **공통** | | | | |
| `category` | `String` | X | - | 카테고리 |
| `title` | `String` | O | - | 알림 제목 |
| `description` | `String` | X | - | 알림 설명 |
| `date` | `Date` | X | - | 알림 일시 |
| `notificationType` | `String` | X | `"direct"` | 알림 유형. enum: `"direct"`, `"classInvitation"`, `"classCancellation"`, `"classApproval"`, `"classApprovalCancel"`, `"scheduleStart"`, `"newPost"`, `"reminder"` |
| `relatedEntity` | `Object` | X | - | 관련 엔티티 |
| `relatedEntity.type` | `String` | X | - | enum: `"enrollment"`, `"syllabus"`, `"calendarEvent"`, `"post"`, `"reminder"` |
| `relatedEntity.id` | `ObjectId` | X | - | 관련 엔티티 `_id` |
| `autoDeleteOnCheck` | `Boolean` | X | `true` | 확인 시 자동 삭제 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## NotificationSetting (알림 설정)

사용자별 알림 수신 설정을 관리합니다.

> **파일**: `backend/src/models/NotificationSetting.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | O | - | 사용자 ID |
| `userName` | `String` | O | - | 사용자 이름 |
| `settings` | `Object` | X | (아래 참조) | 알림 설정 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### Settings 기본값

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `classInvitation` | `Boolean` | `true` | 수업 초대 알림 |
| `classCancellation` | `Boolean` | `true` | 수업 초대 취소 알림 |
| `classApproval` | `Boolean` | `true` | 수업 승인 알림 |
| `classApprovalCancel` | `Boolean` | `true` | 수업 승인 취소 알림 |
| `scheduleStart` | `Boolean` | `true` | 일정 시작 알림 |
| `newPost` | `Boolean` | `true` | 새 게시글 알림 |
| `directMessage` | `Boolean` | `true` | 직접 메시지 알림 |
| `soundEnabled` | `Boolean` | `true` | 알림음 활성화 |
| `reminder` | `Boolean` | `true` | 리마인더 알림 |
| `eventReminderDefault` | `Number` | `15` | 기본 이벤트 리마인더 (분) |

---

## CalendarEvent (캘린더 일정)

캘린더 일정을 관리합니다. 수동 생성 일정 외에 수강/강의계획서/메모로부터 자동 동기화된 일정도 포함됩니다.

> **파일**: `backend/src/models/CalendarEvent.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `school_1, scope_1` | COMPOUND |
| `user_1, scope_1` | COMPOUND |
| `user_1, sourceType_1, sourceId_1` | COMPOUND |
| `user_1, recurrence.type_1, start_1, end_1` | COMPOUND |
| `school_1, recurrence.type_1, start_1, end_1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `title` | `String` | O | - | 일정 제목 |
| `description` | `String` | X | `""` | 일정 설명 |
| `start` | `Date` | O | - | 시작 일시 |
| `end` | `Date` | O | - | 종료 일시 |
| `isAllDay` | `Boolean` | X | `false` | 종일 일정 여부 |
| `scope` | `String` | O | - | 범위. enum: `"school"`, `"personal"` |
| `school` | `ObjectId` | X | - | 학교 `_id` (scope가 `school`인 경우) |
| `user` | `ObjectId` | O | - | 생성자 `_id` |
| `recurrence` | `Object` | X | `{type:"none"}` | 반복 설정 |
| `recurrence.type` | `String` | X | `"none"` | enum: `"none"`, `"daily"`, `"weekly"`, `"monthly"` |
| `recurrence.endDate` | `Date` | X | - | 반복 종료일 |
| `recurrence.days` | `Number[]` | X | - | 반복 요일 (0=일, 1=월, ..., 6=토) |
| `color` | `String` | X | `"#4285f4"` | 일정 색상 |
| `reminder` | `Object` | X | `{enabled:false, useDefault:true}` | 리마인더 설정 |
| `reminder.enabled` | `Boolean` | X | `false` | 리마인더 활성화 |
| `reminder.minutesBefore` | `Number` | X | - | 몇 분 전 알림 |
| `reminder.useDefault` | `Boolean` | X | `true` | 기본 설정 사용 |
| `sourceType` | `String` | X | `"manual"` | 출처 유형. enum: `"manual"`, `"enrollment"`, `"syllabus"`, `"memo"` |
| `sourceId` | `String` | X | - | 출처 ID |
| `syllabusId` | `ObjectId` | X | - | 연결된 강의계획서 `_id` |
| `calendarId` | `ObjectId` | X | - | 소속 사용자 캘린더 `_id` |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## UserCalendar (사용자 캘린더)

사용자 캘린더 그룹을 관리합니다. 일정을 캘린더별로 분류하고 색상을 설정할 수 있습니다.

> **파일**: `backend/src/models/UserCalendar.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1` | INDEX |
| `user_1, school_1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 소유자 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` (scope가 `school`인 경우) |
| `name` | `String` | O | - | 캘린더 이름 |
| `color` | `String` | X | `"#4285f4"` | 캘린더 색상 |
| `scope` | `String` | X | `"personal"` | enum: `"school"`, `"personal"` |
| `isDefault` | `Boolean` | X | `false` | 기본 캘린더 여부 (삭제 불가) |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## ChatRoom (채팅방)

1:1 채팅(direct) 및 그룹 채팅(group)을 관리합니다.

> **파일**: `backend/src/models/ChatRoom.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `participants.user_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `type` | `String` | O | - | 방 유형. enum: `"direct"`, `"group"` |
| `name` | `String` | X | - | 방 이름 (그룹 채팅용) |
| `creator` | `ObjectId` | X | - | 생성자 `_id` |
| `creatorId` | `String` | X | - | 생성자 사용자 ID |
| `creatorName` | `String` | X | - | 생성자 이름 |
| `participants` | `Array` | X | - | 참가자 목록 |
| `participants[].user` | `ObjectId` | O | - | 참가자 `_id` |
| `participants[].userId` | `String` | O | - | 참가자 사용자 ID |
| `participants[].userName` | `String` | O | - | 참가자 이름 |
| `participants[].profile` | `String` | X | - | 프로필 이미지 URL |
| `participants[].joinedAt` | `Date` | X | `Date.now` | 참가 시각 |
| `participants[].lastReadAt` | `Date` | X | - | 마지막 읽은 시각 |
| `lastMessage` | `Object` | X | - | 마지막 메시지 미리보기 |
| `lastMessage.content` | `String` | X | - | 메시지 내용 (요약) |
| `lastMessage.sender` | `ObjectId` | X | - | 발신자 `_id` |
| `lastMessage.senderName` | `String` | X | - | 발신자 이름 |
| `lastMessage.sentAt` | `Date` | X | - | 발신 시각 |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 |
| `settings` | `Object` | X | - | 방 설정 |
| `settings.allowInvites` | `Boolean` | X | `true` | 초대 허용 여부 |
| `settings.allowChat` | `Boolean` | X | `true` | 채팅 허용 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## ChatMessage (채팅 메시지)

채팅방의 개별 메시지를 관리합니다.

> **파일**: `backend/src/models/ChatMessage.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `room_1` | INDEX |
| `room_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `room` | `ObjectId` | O | - | 채팅방 `_id` |
| `sender` | `ObjectId` | O | - | 발신자 `_id` |
| `senderId` | `String` | O | - | 발신자 사용자 ID |
| `senderName` | `String` | O | - | 발신자 이름 |
| `content` | `String` | O | - | 메시지 내용 |
| `messageType` | `String` | X | `"text"` | 메시지 유형. enum: `"text"`, `"image"`, `"file"`, `"system"` |
| `attachment` | `Object` | X | - | 첨부 파일 (image/file 메시지인 경우) |
| `attachment.url` | `String` | X | - | 파일 URL |
| `attachment.fileName` | `String` | X | - | 파일명 |
| `attachment.fileSize` | `Number` | X | - | 파일 크기 (bytes) |
| `attachment.mimeType` | `String` | X | - | MIME 타입 |
| `attachment.key` | `String` | X | - | S3 키 |
| `readBy` | `Array` | X | - | 읽은 사용자 목록 |
| `readBy[].user` | `ObjectId` | X | - | 사용자 `_id` |
| `readBy[].readAt` | `Date` | X | - | 읽은 시각 |
| `isDeleted` | `Boolean` | X | `false` | 삭제 여부 (soft delete) |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## ChatFile (채팅 파일)

채팅에서 공유된 파일을 사용자별로 관리합니다.

> **파일**: `backend/src/models/ChatFile.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1, createdAt_-1` | COMPOUND |
| `user_1, fileType_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 소유자 `_id` |
| `userId` | `String` | O | - | 소유자 사용자 ID |
| `room` | `ObjectId` | O | - | 채팅방 `_id` |
| `message` | `ObjectId` | X | - | 채팅 메시지 `_id` |
| `fileName` | `String` | O | - | 원본 파일명 |
| `fileSize` | `Number` | O | - | 파일 크기 (bytes) |
| `mimeType` | `String` | O | - | MIME 타입 |
| `key` | `String` | O | - | S3 키 |
| `url` | `String` | O | - | 파일 URL |
| `fileType` | `String` | O | - | 파일 유형. enum: `"image"`, `"file"` |
| `isDeleted` | `Boolean` | X | `false` | 삭제 여부 (soft delete) |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## Reminder (리마인더)

사용자 리마인더를 관리합니다.

> **파일**: `backend/src/models/Reminder.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1, completed_1, reminderTime_1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | O | - | 사용자 ID |
| `userName` | `String` | O | - | 사용자 이름 |
| `title` | `String` | O | - | 리마인더 제목 |
| `memo` | `String` | X | `""` | 메모 |
| `reminderTime` | `Date` | O | - | 알림 시각 |
| `completed` | `Boolean` | X | `false` | 완료 여부 |
| `notified` | `Boolean` | X | `false` | 알림 발송 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## ThemeSetting (테마 설정)

사용자별 테마 설정을 관리합니다.

> **파일**: `backend/src/models/ThemeSetting.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | O | - | 사용자 ID |
| `userName` | `String` | O | - | 사용자 이름 |
| `selectedTheme` | `String` | X | `"light"` | 선택된 테마. 가능한 값: `"light"`, `"dark"`, `"high-contrast"`, `"sepia"`, `"system"`, `"custom"` |
| `colors` | `Object` | X | (아래 참조) | 사용자 정의 색상 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

### Colors 기본값

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `primaryColor` | `"#313775"` | 주 브랜드 색상 |
| `backgroundColor` | `"#ffffff"` | 페이지 배경색 |
| `componentColor` | `"#f5f5f5"` | 컴포넌트 배경색 |
| `textColor` | `"#000000"` | 기본 텍스트 색상 |
| `accentColor` | `"#007aff"` | 강조/하이라이트 색상 |
| `successColor` | `"#52c41a"` | 성공 상태 색상 |
| `errorColor` | `"#ff4d4f"` | 오류 상태 색상 |

---

## Apps (앱)

시스템에 등록된 앱 목록을 관리합니다.

> **파일**: `backend/src/models/Apps.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `title_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `title` | `String` | X | - | 앱 제목 (고유) |
| `description` | `String` | X | - | 앱 설명 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## TimeBlock (시간 블록)

수업 시간표의 개별 시간 블록입니다. Syllabus, Enrollment 등에서 서브 도큐먼트로 사용됩니다.

> **파일**: `backend/src/models/TimeBlock.js`

### 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `label` | `String` | O | 시간 라벨 (예: "월8", "수3") |
| `day` | `String` | X | 요일 (예: "월", "화", "수", "목", "금", "토", "일") |
| `start` | `String` | X | 시작 시간 (예: "10:00") |
| `end` | `String` | X | 종료 시간 (예: "11:00") |

> **참고**: `_id`가 없는 서브 도큐먼트입니다 (`{ _id: false }`).

---

## AltForm (양식 빌더)

Alt Board의 양식 빌더로, 데이터 수집용 Form을 관리합니다. Form 생성 시 연결된 AltSheet가 자동 생성됩니다.

> **파일**: `backend/src/models/AltForm.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `board_1` | INDEX |
| `board_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `board` | `ObjectId` | O | - | 보드 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` |
| `creator` | `ObjectId` | X | - | 생성자 `_id` |
| `creatorId` | `String` | X | - | 생성자 사용자 ID |
| `creatorName` | `String` | X | - | 생성자 이름 |
| `title` | `String` | O | - | 양식 제목 |
| `description` | `String` | X | `""` | 양식 설명 |
| `fields` | `Array` | X | `[]` | 필드 정의 배열 |
| `fields[].label` | `String` | O | - | 필드명 |
| `fields[].type` | `String` | O | - | 필드 타입 (text, textarea, number, date, file, select, multiSelect, checkbox, radio, userSelect, approval, rating, scale, counter) |
| `fields[].permission` | `String` | X | `"respondent"` | respondent 또는 owner |
| `fields[].visibleToRespondent` | `Boolean` | X | `false` | owner 필드를 응답자에게 공개 |
| `fields[].required` | `Boolean` | X | `false` | 필수 입력 여부 |
| `fields[].options` | `[String]` | X | `[]` | 선택지 (select/radio/checkbox용) |
| `fields[].validation` | `Mixed` | X | - | 타입별 유효성 검사 규칙 |
| `fields[].order` | `Number` | X | - | 표시 순서 |
| `settings` | `Object` | X | - | Form 설정 |
| `settings.openAt` | `Date` | X | - | 공개 시작 시각 |
| `settings.closeAt` | `Date` | X | - | 공개 종료 시각 |
| `settings.allowResubmit` | `Boolean` | X | `false` | 재제출 허용 |
| `settings.quizMode` | `Boolean` | X | `false` | 퀴즈 모드 |
| `settings.shareResponses` | `Boolean` | X | `false` | 응답 공유 |
| `sheet` | `ObjectId` | X | - | 연결된 AltSheet `_id` |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## AltSheet (시트)

AltForm에 1:1로 연결되는 데이터 시트입니다. Form 생성 시 자동 생성됩니다.

> **파일**: `backend/src/models/AltSheet.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `form_1` | UNIQUE |
| `board_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `form` | `ObjectId` | O | - | AltForm `_id` (1:1) |
| `board` | `ObjectId` | X | - | 보드 `_id` |
| `school` | `ObjectId` | X | - | 학교 `_id` |
| `name` | `String` | X | - | 시트 이름 (= Form 제목) |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## AltSheetRow (시트 행)

AltSheet의 개별 행 데이터입니다. Form 응답 제출 시 또는 교사 직접 입력으로 생성됩니다.

> **파일**: `backend/src/models/AltSheetRow.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `sheet_1, _respondent_1` | COMPOUND |
| `sheet_1, createdAt_-1` | COMPOUND |
| `form_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `sheet` | `ObjectId` | O | - | AltSheet `_id` |
| `form` | `ObjectId` | X | - | AltForm `_id` |
| `board` | `ObjectId` | X | - | 보드 `_id` |
| `_respondent` | `ObjectId` | X | - | 응답자 `_id` |
| `_respondentId` | `String` | X | - | 응답자 사용자 ID |
| `_respondentName` | `String` | X | - | 응답자 이름 |
| `data` | `Map<String, Mixed>` | X | - | 필드 `_id` → 값 매핑 |
| `_submittedAt` | `Date` | X | - | 응답 시각 |
| `_updatedAt` | `Date` | X | - | 수정 시각 |
| `isActive` | `Boolean` | X | `true` | 활성화 상태 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## AIChatSession (AI 채팅 세션)

AI 채팅(Alter)의 세션 정보를 관리합니다. 보드당 학생 1인 1세션 구조입니다.

> **파일**: `backend/src/models/AIChatSession.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `board_1, student_1` | UNIQUE, COMPOUND |
| `board_1, lastMessageAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `board` | `ObjectId` | O | - | 보드 `_id` |
| `student` | `ObjectId` | O | - | 학생 `_id` |
| `studentId` | `String` | O | - | 학생 사용자 ID |
| `studentName` | `String` | O | - | 학생 이름 |
| `isActive` | `Boolean` | X | `true` | 세션 활성 여부 |
| `lastMessageAt` | `Date` | X | - | 마지막 메시지 시각 |
| `lastMessagePreview` | `String` | X | - | 마지막 메시지 미리보기 |
| `messageCount` | `Number` | X | `0` | 메시지 수 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## AIChatMessage (AI 채팅 메시지)

AI 채팅 세션의 개별 메시지입니다. 학생, AI, 교사 3가지 발신자 유형을 지원합니다.

> **파일**: `backend/src/models/AIChatMessage.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `session_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `session` | `ObjectId` | O | - | AIChatSession `_id` |
| `board` | `ObjectId` | O | - | 보드 `_id` |
| `senderType` | `String` | O | - | 발신자 유형. enum: `"student"`, `"ai"`, `"teacher"` |
| `sender` | `ObjectId` | X | `null` | 발신자 `_id` (AI인 경우 null) |
| `senderId` | `String` | X | `null` | 발신자 사용자 ID |
| `senderName` | `String` | O | - | 발신자 이름 |
| `content` | `String` | O | - | 메시지 내용 |
| `tokenUsage` | `Object` | X | - | 토큰 사용량 (AI 응답 시) |
| `tokenUsage.promptTokens` | `Number` | X | - | 프롬프트 토큰 수 |
| `tokenUsage.candidatesTokens` | `Number` | X | - | 응답 토큰 수 |
| `tokenUsage.totalTokens` | `Number` | X | - | 총 토큰 수 |
| `isDeleted` | `Boolean` | X | `false` | 소프트 삭제 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

> **참고**: `tokenUsage`는 `_id`가 없는 서브 도큐먼트입니다 (`{ _id: false }`).

---

## AIUsageLog (AI 사용량 로그)

AI 기능 사용량을 추적하는 로그입니다. 요청별 토큰 사용량을 기록합니다.

> **파일**: `backend/src/models/AIUsageLog.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `createdAt_1` | INDEX |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `userId` | `String` | O | - | 사용자 ID |
| `userName` | `String` | O | - | 사용자 이름 |
| `provider` | `String` | X | `"unknown"` | AI 제공자 (`openai` / `anthropic` / `gemini`) |
| `model` | `String` | O | - | AI 모델명 |
| `feature` | `String` | X | `"unknown"` | 기능 (`syllabus` / `chat` 등) |
| `success` | `Boolean` | X | `true` | 호출 성공 여부 |
| `errorCode` | `String` | X | - | 실패 시 에러 코드 |
| `promptTokens` | `Number` | X | `0` | 프롬프트 토큰 수 |
| `candidatesTokens` | `Number` | X | `0` | 응답 토큰 수 |
| `thoughtsTokens` | `Number` | X | `0` | 사고 토큰 수 |
| `totalTokens` | `Number` | X | `0` | 총 토큰 수 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## BoardFavorite (보드 즐겨찾기)

사용자의 보드 즐겨찾기 정보입니다. 사용자당 보드 1개의 즐겨찾기를 보장합니다.

> **파일**: `backend/src/models/BoardFavorite.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `user_1, school_1` | COMPOUND |
| `user_1, board_1` | UNIQUE, COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `user` | `ObjectId` | O | - | 사용자 `_id` |
| `board` | `ObjectId` | O | - | 보드 `_id` |
| `school` | `ObjectId` | O | - | 학교 `_id` |
| `order` | `Number` | X | `0` | 정렬 순서 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

---

## SurveyResponse (설문 응답)

게시글에 첨부된 설문의 개별 응답입니다. 설문당 응답자 1인 1응답을 보장합니다.

> **파일**: `backend/src/models/SurveyResponse.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `post_1` | INDEX |
| `post_1, surveyId_1, respondent_1` | UNIQUE, COMPOUND |
| `post_1, surveyId_1, createdAt_-1` | COMPOUND |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `post` | `ObjectId` | O | - | 게시글 `_id` |
| `surveyId` | `ObjectId` | O | - | 설문 `_id` |
| `respondent` | `ObjectId` | O | - | 응답자 `_id` |
| `respondentId` | `String` | O | - | 응답자 사용자 ID |
| `respondentName` | `String` | O | - | 응답자 이름 |
| `answers` | `Array` | O | - | 답변 배열 |
| `answers[].questionId` | `String` | O | - | 질문 ID |
| `answers[].value` | `Mixed` | X | - | 답변 값 |
| `answers[].files` | `Array` | X | `[]` | 첨부 파일 목록 |
| `answers[].files[].fileName` | `String` | X | - | 파일 이름 |
| `answers[].files[].fileSize` | `Number` | X | - | 파일 크기 (bytes) |
| `answers[].files[].mimeType` | `String` | X | - | MIME 타입 |
| `answers[].files[].key` | `String` | X | - | S3 키 |
| `createdAt` | `Date` | 자동 | - | 생성 시각 |
| `updatedAt` | `Date` | 자동 | - | 수정 시각 |

> **참고**: `answers[]` 및 `answers[].files[]`는 `_id`가 없는 서브 도큐먼트입니다 (`{ _id: false }`).

---

## RequestStat (요청 통계)

일별 API 요청 통계를 집계하는 모델입니다. 날짜별 1개의 문서로 관리됩니다.

> **파일**: `backend/src/models/RequestStat.js`
> **DB**: 아카데미 데이터베이스

### 인덱스

| 인덱스 | 속성 |
|--------|------|
| `_id` | UNIQUE |
| `date_1` | UNIQUE |

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | MongoDB 기본 키 |
| `date` | `String` | O | - | 날짜 식별자 (YYYY-MM-DD) |
| `requests` | `Number` | X | `0` | 총 요청 수 |
| `totalResponseTime` | `Number` | X | `0` | 응답 시간 합계 (ms) |
| `dataIn` | `Number` | X | `0` | 수신 데이터량 (bytes) |
| `dataOut` | `Number` | X | `0` | 송신 데이터량 (bytes) |
| `uniqueUsers` | `[String]` | X | `[]` | 고유 사용자 ID 목록 |

---

## 모델 관계도

```
Academy (루트 DB)
  |
  +-- [아카데미 DB]
        |
        +-- User
        |     |
        |     +-- schools[] --> School
        |
        +-- School
        |     |
        |     +-- formArchive[]
        |     +-- deletedFormArchive[]
        |     +-- links[]
        |
        +-- Season
        |     |
        |     +-- school --> School
        |     +-- subjects, classrooms, formEvaluation
        |     +-- permissionSyllabusV2, permissionEnrollmentV2, permissionEvaluationV2
        |     +-- aiSettings
        |
        +-- Registration
        |     |
        |     +-- season --> Season
        |     +-- user --> User
        |     +-- teacher --> User (담당 교사)
        |
        +-- Syllabus
        |     |
        |     +-- season --> Season
        |     +-- user --> User (개설자)
        |     +-- teachers[] --> User
        |     +-- time[] (TimeBlock)
        |
        +-- Enrollment
        |     |
        |     +-- syllabus --> Syllabus
        |     +-- student --> User
        |     +-- evaluation (암호화)
        |
        +-- Archive
        |     |
        |     +-- user --> User
        |     +-- school --> School
        |     +-- data (암호화)
        |
        +-- Board --> Post --> Comment
        |     |
        |     +-- AltForm --> AltSheet --> AltSheetRow
        |     +-- BoardFavorite
        |     +-- SurveyResponse (via Post)
        |
        +-- AIChatSession --> AIChatMessage
        +-- AIUsageLog
        |
        +-- Notification, NotificationSetting
        |
        +-- CalendarEvent, UserCalendar
        |
        +-- ChatRoom --> ChatMessage, ChatFile
        |
        +-- Reminder, ThemeSetting, Form, Apps
        |
        +-- RequestStat
```
