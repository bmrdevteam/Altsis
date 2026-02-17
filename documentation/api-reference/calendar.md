# 캘린더 API

캘린더 일정(CalendarEvent)과 사용자 캘린더(UserCalendar) API입니다. 일정의 생성/조회/수정/삭제, 반복 일정 확장, 수업 동기화, 사용자 캘린더 관리 기능을 제공합니다.

> **라우트 파일**: `backend/src/routes/calendarEvents.js`, `backend/src/routes/userCalendars.js`
> **컨트롤러 파일**: `backend/src/controllers/calendarEvents.js`, `backend/src/controllers/userCalendars.js`
> **모델 파일**: `backend/src/models/CalendarEvent.js`, `backend/src/models/UserCalendar.js`

---

## 엔드포인트 요약

### CalendarEvent

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/calendar-events` | 일정 생성 | `isLoggedIn` (`admin`\|`manager` - 학교 범위) |
| `GET` | `/api/calendar-events` | 일정 목록 조회 | `isLoggedIn` |
| `PUT` | `/api/calendar-events/:_id` | 일정 수정 | `isLoggedIn` (소유자 또는 `admin`\|`manager`) |
| `DELETE` | `/api/calendar-events/:_id` | 일정 삭제 | `isLoggedIn` (소유자 또는 `admin`\|`manager`) |
| `POST` | `/api/calendar-events/sync` | 수업 일정 동기화 | `isLoggedIn` |

### UserCalendar

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/user-calendars` | 사용자 캘린더 생성 | `isLoggedIn` (`admin`\|`manager` - 학교 범위) |
| `GET` | `/api/user-calendars` | 사용자 캘린더 목록 조회 | `isLoggedIn` |
| `PUT` | `/api/user-calendars/:_id` | 사용자 캘린더 수정 | `isLoggedIn` (소유자 또는 `admin`\|`manager`) |
| `DELETE` | `/api/user-calendars/:_id` | 사용자 캘린더 삭제 | `isLoggedIn` (소유자 또는 `admin`\|`manager`) |

---

## 일정 생성

캘린더 일정을 생성합니다. `scope`가 `"school"`인 경우 `admin` 또는 `manager` 권한이 필요하며, `school` 필드가 필수입니다.

```
POST /api/calendar-events
```

**권한**: `isLoggedIn` (학교 범위 일정 생성 시 `admin` 또는 `manager`)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | O | 일정 제목 |
| `start` | `string` (ISO 8601) | O | 시작 일시 |
| `end` | `string` (ISO 8601) | O | 종료 일시 |
| `scope` | `string` | O | `"school"` 또는 `"personal"` |
| `description` | `string` | X | 일정 설명 (기본값: `""`) |
| `isAllDay` | `boolean` | X | 종일 일정 여부 (기본값: `false`) |
| `school` | `ObjectId` | 조건부 | 학교 ID (`scope`가 `"school"`일 때 필수) |
| `recurrence` | `object` | X | 반복 설정 |
| `recurrence.type` | `string` | X | `"none"` \| `"daily"` \| `"weekly"` \| `"monthly"` (기본값: `"none"`) |
| `recurrence.endDate` | `string` (ISO 8601) | X | 반복 종료일 |
| `recurrence.days` | `number[]` | X | 반복 요일 (0=일, 1=월, ..., 6=토). `weekly` 타입에서 사용 |
| `color` | `string` | X | 일정 색상 (기본값: `"#4285f4"`) |
| `calendarId` | `ObjectId` | X | 소속 사용자 캘린더 ID |
| `reminder` | `object` | X | 알림 설정 |
| `reminder.enabled` | `boolean` | X | 알림 활성화 여부 (기본값: `false`) |
| `reminder.minutesBefore` | `number` | X | 알림 시간 (분 단위) |
| `reminder.useDefault` | `boolean` | X | 기본 알림 사용 여부 (기본값: `true`) |

### 요청 예시

```json
{
  "title": "팀 미팅",
  "start": "2024-03-15T10:00:00.000Z",
  "end": "2024-03-15T11:00:00.000Z",
  "scope": "personal",
  "description": "주간 팀 미팅",
  "isAllDay": false,
  "recurrence": {
    "type": "weekly",
    "endDate": "2024-06-30T23:59:59.000Z",
    "days": [1, 3, 5]
  },
  "color": "#34a853",
  "reminder": {
    "enabled": true,
    "minutesBefore": 10,
    "useDefault": false
  }
}
```

### 응답 (200)

```json
{
  "calendarEvent": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "팀 미팅",
    "description": "주간 팀 미팅",
    "start": "2024-03-15T10:00:00.000Z",
    "end": "2024-03-15T11:00:00.000Z",
    "isAllDay": false,
    "scope": "personal",
    "user": "507f1f77bcf86cd799439022",
    "recurrence": {
      "type": "weekly",
      "endDate": "2024-06-30T23:59:59.000Z",
      "days": [1, 3, 5]
    },
    "color": "#34a853",
    "reminder": {
      "enabled": true,
      "minutesBefore": 10,
      "useDefault": false
    },
    "sourceType": "manual",
    "createdAt": "2024-03-10T09:00:00.000Z",
    "updatedAt": "2024-03-10T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`title`, `start`, `end`, `scope`, `school`) |
| `400` | `FIELD_INVALID(scope)` | `scope` 값이 `"school"` 또는 `"personal"`이 아님 |
| `403` | `PERMISSION_DENIED` | 학교 범위 일정 생성 시 권한 부족 |

---

## 일정 목록 조회

지정된 날짜 범위 내의 일정을 조회합니다. 반복 일정은 자동으로 개별 인스턴스로 확장됩니다. `scope`를 지정하지 않으면 개인 일정과 학교 일정을 모두 조회합니다.

```
GET /api/calendar-events
```

**권한**: `isLoggedIn`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `startDate` | `string` (ISO 8601) | O | 조회 시작일 |
| `endDate` | `string` (ISO 8601) | O | 조회 종료일 |
| `scope` | `string` | X | `"school"` 또는 `"personal"`. 미지정 시 전체 |
| `school` | `ObjectId` | X | 학교 ID 필터 |
| `user` | `ObjectId` | X | 대상 사용자 ID (미지정 시 로그인 사용자) |

### 요청 예시

```
GET /api/calendar-events?startDate=2024-03-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.000Z&school=507f1f77bcf86cd799439033
```

### 응답 (200)

반복 일정은 조회 범위 내에서 개별 인스턴스로 확장되어 반환됩니다. 확장된 인스턴스에는 `isRecurrenceInstance: true`와 `recurrenceParentId` 필드가 추가됩니다.

```json
{
  "calendarEvents": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "기말고사",
      "description": "1학기 기말고사",
      "start": "2024-03-20T09:00:00.000Z",
      "end": "2024-03-22T18:00:00.000Z",
      "isAllDay": true,
      "scope": "school",
      "school": "507f1f77bcf86cd799439033",
      "user": "507f1f77bcf86cd799439022",
      "recurrence": { "type": "none" },
      "color": "#4285f4",
      "sourceType": "manual",
      "createdAt": "2024-03-01T09:00:00.000Z",
      "updatedAt": "2024-03-01T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "팀 미팅",
      "start": "2024-03-18T10:00:00.000Z",
      "end": "2024-03-18T11:00:00.000Z",
      "isAllDay": false,
      "scope": "personal",
      "user": "507f1f77bcf86cd799439022",
      "recurrence": {
        "type": "weekly",
        "endDate": "2024-06-30T23:59:59.000Z",
        "days": [1, 3, 5]
      },
      "color": "#34a853",
      "sourceType": "manual",
      "isRecurrenceInstance": true,
      "recurrenceParentId": "507f1f77bcf86cd799439012",
      "createdAt": "2024-03-10T09:00:00.000Z",
      "updatedAt": "2024-03-10T09:00:00.000Z"
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(startDate)` | `startDate` 또는 `endDate` 누락 |

---

## 일정 수정

기존 캘린더 일정을 수정합니다. 개인 일정은 소유자만, 학교 일정은 `admin` 또는 `manager`만 수정할 수 있습니다.

```
PUT /api/calendar-events/:_id
```

**권한**: `isLoggedIn` (개인 일정: 소유자, 학교 일정: `admin` 또는 `manager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `ObjectId` | 일정 ID |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | X | 일정 제목 |
| `description` | `string` | X | 일정 설명 |
| `start` | `string` (ISO 8601) | X | 시작 일시 |
| `end` | `string` (ISO 8601) | X | 종료 일시 |
| `isAllDay` | `boolean` | X | 종일 일정 여부 |
| `recurrence` | `object` | X | 반복 설정 |
| `recurrence.type` | `string` | X | `"none"` \| `"daily"` \| `"weekly"` \| `"monthly"` |
| `recurrence.endDate` | `string` (ISO 8601) | X | 반복 종료일 |
| `recurrence.days` | `number[]` | X | 반복 요일 (0-6) |
| `color` | `string` | X | 일정 색상 |
| `calendarId` | `ObjectId` | X | 소속 사용자 캘린더 ID |
| `reminder` | `object` | X | 알림 설정 |
| `reminder.enabled` | `boolean` | X | 알림 활성화 여부 |
| `reminder.minutesBefore` | `number` | X | 알림 시간 (분 단위) |
| `reminder.useDefault` | `boolean` | X | 기본 알림 사용 여부 |

### 요청 예시

```json
{
  "title": "팀 미팅 (변경)",
  "start": "2024-03-15T14:00:00.000Z",
  "end": "2024-03-15T15:30:00.000Z",
  "color": "#ff9800"
}
```

### 응답 (200)

```json
{
  "calendarEvent": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "팀 미팅 (변경)",
    "description": "주간 팀 미팅",
    "start": "2024-03-15T14:00:00.000Z",
    "end": "2024-03-15T15:30:00.000Z",
    "isAllDay": false,
    "scope": "personal",
    "user": "507f1f77bcf86cd799439022",
    "recurrence": {
      "type": "weekly",
      "endDate": "2024-06-30T23:59:59.000Z",
      "days": [1, 3, 5]
    },
    "color": "#ff9800",
    "sourceType": "manual",
    "createdAt": "2024-03-10T09:00:00.000Z",
    "updatedAt": "2024-03-15T12:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 수정 권한 없음 |
| `404` | `calendarEvent_NOT_FOUND` | 일정을 찾을 수 없음 |

---

## 일정 삭제

캘린더 일정을 삭제합니다. 개인 일정은 소유자만, 학교 일정은 `admin` 또는 `manager`만 삭제할 수 있습니다.

```
DELETE /api/calendar-events/:_id
```

**권한**: `isLoggedIn` (개인 일정: 소유자, 학교 일정: `admin` 또는 `manager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `ObjectId` | 일정 ID |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 삭제 권한 없음 |
| `404` | `calendarEvent_NOT_FOUND` | 일정을 찾을 수 없음 |

---

## 수업 일정 동기화

수강 정보(enrollment), 강의 정보(syllabus), 메모(memo)를 캘린더 일정으로 동기화합니다. 등록(registration)의 기간 정보를 기반으로 매주 반복 일정을 생성하며, `sourceType`/`sourceId`를 사용한 upsert 전략으로 중복을 방지합니다.

```
POST /api/calendar-events/sync
```

**권한**: `isLoggedIn` (다른 사용자 대상 동기화 시 `admin`, `manager` 또는 `teacher`)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `ObjectId` | O | 학기 ID |
| `targetUser` | `ObjectId` | X | 동기화 대상 사용자 ID (미지정 시 로그인 사용자) |

### 요청 예시

```json
{
  "season": "507f1f77bcf86cd799439044"
}
```

### 동기화 상세

동기화 시 다음 세 가지 소스에서 일정이 생성됩니다:

| 소스 | `sourceType` | 색상 | 설명 |
|------|-------------|------|------|
| 수강 정보 | `"enrollment"` | `#4285f4` (파랑) | 학생의 수강 시간표 |
| 강의 정보 | `"syllabus"` | `#34a853` (초록) | 교사의 강의 시간표 |
| 메모 | `"memo"` | `#ff9800` (주황) | 등록 메모의 시간표 |

동기화 과정:

1. 등록(registration)의 기간(period) 정보 조회
2. 수강/강의/메모의 시간 정보를 기반으로 매주 반복 일정 데이터 생성
3. `sourceId`를 키로 upsert 실행 (enrollment/syllabus는 `$set`, memo는 `$setOnInsert`)
4. 더 이상 유효하지 않은 고아 이벤트 삭제
5. 동일 `sourceId`의 중복 이벤트 정리 (최신 1건만 유지)

> **참고**: `sourceId` 형식은 `{sourceType}_{documentId}_{timeIndex}` 입니다 (예: `enrollment_507f1f77_0`).

### 응답 (200)

```json
{
  "synced": 5,
  "removed": 2,
  "total": 8
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `synced` | `number` | 새로 생성된 일정 수 |
| `removed` | `number` | 삭제된 고아/중복 일정 수 |
| `total` | `number` | 동기화 대상 전체 일정 수 |

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(season)` | `season` 필드 누락 |
| `403` | `PERMISSION_DENIED` | 다른 사용자 대상 동기화 시 권한 부족 |
| `404` | `registration_NOT_FOUND` | 해당 학기/사용자의 등록 정보를 찾을 수 없음 |

---

## 사용자 캘린더 생성

사용자 캘린더(캘린더 그룹)를 생성합니다. 일정을 캘린더별로 분류하는 데 사용됩니다.

```
POST /api/user-calendars
```

**권한**: `isLoggedIn` (학교 범위 캘린더 생성 시 `admin` 또는 `manager`)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | O | 캘린더 이름 |
| `color` | `string` | X | 캘린더 색상 (기본값: `"#4285f4"`) |
| `scope` | `string` | X | `"school"` 또는 `"personal"` (기본값: `"personal"`) |
| `school` | `ObjectId` | 조건부 | 학교 ID (`scope`가 `"school"`일 때 필수) |

### 요청 예시

```json
{
  "name": "개인 학습",
  "color": "#e91e63"
}
```

### 응답 (200)

```json
{
  "userCalendar": {
    "_id": "507f1f77bcf86cd799439055",
    "user": "507f1f77bcf86cd799439022",
    "name": "개인 학습",
    "color": "#e91e63",
    "scope": "personal",
    "isDefault": false,
    "createdAt": "2024-03-10T09:00:00.000Z",
    "updatedAt": "2024-03-10T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(name)` | `name` 필드 누락 |
| `400` | `FIELD_REQUIRED(school)` | 학교 범위에서 `school` 필드 누락 |
| `403` | `PERMISSION_DENIED` | 학교 범위 캘린더 생성 시 권한 부족 |

---

## 사용자 캘린더 목록 조회

로그인 사용자의 개인 캘린더와 학교 캘린더를 조회합니다. 기본 캘린더(`isDefault`)가 먼저 정렬되며, 이후 생성일시 순으로 정렬됩니다.

```
GET /api/user-calendars
```

**권한**: `isLoggedIn`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `school` | `ObjectId` | X | 학교 ID (학교 범위 캘린더 필터) |

### 요청 예시

```
GET /api/user-calendars?school=507f1f77bcf86cd799439033
```

### 응답 (200)

```json
{
  "userCalendars": [
    {
      "_id": "507f1f77bcf86cd799439055",
      "user": "507f1f77bcf86cd799439022",
      "name": "기본 캘린더",
      "color": "#4285f4",
      "scope": "personal",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439056",
      "user": "507f1f77bcf86cd799439022",
      "name": "개인 학습",
      "color": "#e91e63",
      "scope": "personal",
      "isDefault": false,
      "createdAt": "2024-03-10T09:00:00.000Z",
      "updatedAt": "2024-03-10T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439057",
      "user": "507f1f77bcf86cd799439030",
      "school": "507f1f77bcf86cd799439033",
      "name": "학교 행사",
      "color": "#ff5722",
      "scope": "school",
      "isDefault": false,
      "createdAt": "2024-02-01T09:00:00.000Z",
      "updatedAt": "2024-02-01T09:00:00.000Z"
    }
  ]
}
```

---

## 사용자 캘린더 수정

사용자 캘린더의 이름과 색상을 수정합니다.

```
PUT /api/user-calendars/:_id
```

**권한**: `isLoggedIn` (소유자 또는 `admin`/`manager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `ObjectId` | 사용자 캘린더 ID |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | X | 캘린더 이름 |
| `color` | `string` | X | 캘린더 색상 |

### 요청 예시

```json
{
  "name": "개인 학습 (수정)",
  "color": "#9c27b0"
}
```

### 응답 (200)

```json
{
  "userCalendar": {
    "_id": "507f1f77bcf86cd799439055",
    "user": "507f1f77bcf86cd799439022",
    "name": "개인 학습 (수정)",
    "color": "#9c27b0",
    "scope": "personal",
    "isDefault": false,
    "createdAt": "2024-03-10T09:00:00.000Z",
    "updatedAt": "2024-03-15T12:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 수정 권한 없음 |
| `404` | `userCalendar_NOT_FOUND` | 캘린더를 찾을 수 없음 |

---

## 사용자 캘린더 삭제

사용자 캘린더를 삭제합니다. 기본 캘린더(`isDefault: true`)는 삭제할 수 없습니다.

```
DELETE /api/user-calendars/:_id
```

**권한**: `isLoggedIn` (소유자 또는 `admin`/`manager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `ObjectId` | 사용자 캘린더 ID |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `기본 캘린더는 삭제할 수 없습니다.` | 기본 캘린더 삭제 시도 |
| `403` | `PERMISSION_DENIED` | 삭제 권한 없음 |
| `404` | `userCalendar_NOT_FOUND` | 캘린더를 찾을 수 없음 |

---

## 데이터 모델

### CalendarEvent

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | 고유 ID |
| `title` | `string` | O | - | 일정 제목 |
| `description` | `string` | X | `""` | 일정 설명 |
| `start` | `Date` | O | - | 시작 일시 |
| `end` | `Date` | O | - | 종료 일시 |
| `isAllDay` | `boolean` | X | `false` | 종일 일정 여부 |
| `scope` | `string` | O | - | `"school"` \| `"personal"` |
| `school` | `ObjectId` | X | - | 학교 ID |
| `user` | `ObjectId` | O | - | 생성자 ID |
| `recurrence.type` | `string` | X | `"none"` | `"none"` \| `"daily"` \| `"weekly"` \| `"monthly"` |
| `recurrence.endDate` | `Date` | X | - | 반복 종료일 |
| `recurrence.days` | `number[]` | X | `[]` | 반복 요일 (0-6) |
| `color` | `string` | X | `"#4285f4"` | 일정 색상 |
| `reminder.enabled` | `boolean` | X | `false` | 알림 활성화 |
| `reminder.minutesBefore` | `number` | X | - | 알림 시간 (분) |
| `reminder.useDefault` | `boolean` | X | `true` | 기본 알림 사용 |
| `sourceType` | `string` | X | `"manual"` | `"manual"` \| `"enrollment"` \| `"syllabus"` \| `"memo"` |
| `sourceId` | `string` | X | - | 동기화 출처 ID |
| `syllabusId` | `ObjectId` | X | - | 연결된 강의 계획 ID |
| `calendarId` | `ObjectId` | X | - | 소속 사용자 캘린더 ID |
| `createdAt` | `Date` | 자동 | - | 생성 일시 |
| `updatedAt` | `Date` | 자동 | - | 수정 일시 |

**인덱스**:

| 인덱스 | 필드 |
|--------|------|
| `school_1_scope_1` | `{ school: 1, scope: 1 }` |
| `user_1_scope_1` | `{ user: 1, scope: 1 }` |
| `user_1_sourceType_1_sourceId_1` | `{ user: 1, sourceType: 1, sourceId: 1 }` |
| `user_1_recurrence.type_1_start_1_end_1` | `{ user: 1, "recurrence.type": 1, start: 1, end: 1 }` |
| `school_1_recurrence.type_1_start_1_end_1` | `{ school: 1, "recurrence.type": 1, start: 1, end: 1 }` |

### UserCalendar

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | 고유 ID |
| `user` | `ObjectId` | O | - | 소유자 ID |
| `school` | `ObjectId` | X | - | 학교 ID |
| `name` | `string` | O | - | 캘린더 이름 |
| `color` | `string` | X | `"#4285f4"` | 캘린더 색상 |
| `scope` | `string` | X | `"personal"` | `"school"` \| `"personal"` |
| `isDefault` | `boolean` | X | `false` | 기본 캘린더 여부 (삭제 불가) |
| `createdAt` | `Date` | 자동 | - | 생성 일시 |
| `updatedAt` | `Date` | 자동 | - | 수정 일시 |

**인덱스**:

| 인덱스 | 필드 |
|--------|------|
| `user_1` | `{ user: 1 }` |
| `user_1_school_1` | `{ user: 1, school: 1 }` |

---

## 프론트엔드 API 함수 (useAPIv2)

### CalendarEventAPI

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CCalendarEvent` | POST | `/api/calendar-events` | 일정 생성 |
| `RCalendarEvents` | GET | `/api/calendar-events` | 일정 목록 조회 |
| `UCalendarEvent` | PUT | `/api/calendar-events/:_id` | 일정 수정 |
| `DCalendarEvent` | DELETE | `/api/calendar-events/:_id` | 일정 삭제 |
| `SyncCalendarEvents` | POST | `/api/calendar-events/sync` | 수업 일정 동기화 |

### UserCalendarAPI

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CUserCalendar` | POST | `/api/user-calendars` | 사용자 캘린더 생성 |
| `RUserCalendars` | GET | `/api/user-calendars` | 사용자 캘린더 목록 조회 |
| `UUserCalendar` | PUT | `/api/user-calendars/:_id` | 사용자 캘린더 수정 |
| `DUserCalendar` | DELETE | `/api/user-calendars/:_id` | 사용자 캘린더 삭제 |
