# Reminders API

독립 리마인더 CRUD와, 향후 24시간 이내의 통합 upcoming 조회(독립 리마인더 + 캘린더 이벤트 리마인더)를 제공합니다. 알림 발송·설정 필터는 [알림 API](./notifications.md)와 연동됩니다.

> **라우트 파일**: `backend/src/routes/reminders.js`  
> **컨트롤러 파일**: `backend/src/controllers/reminders.js`  
> **모델 파일**: `backend/src/models/Reminder.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/reminders/upcoming` | 24시간 이내 통합 리마인더 | `isLoggedIn` |
| `POST` | `/api/reminders` | 독립 리마인더 생성 | `isLoggedIn` |
| `PUT` | `/api/reminders/:_id` | 리마인더 수정 | `isLoggedIn` (본인) |
| `PUT` | `/api/reminders/:_id/complete` | 완료 처리 | `isLoggedIn` (본인) |
| `DELETE` | `/api/reminders/:_id` | 삭제 | `isLoggedIn` (본인) |

---

## Upcoming 조회

미완료 독립 리마인더(앞으로 24시간 + 과거 미통보)와, `reminder.enabled`인 캘린더 일정의 예정 알림을 합쳐 반환합니다. 이벤트 기본 분 값은 사용자 알림 설정의 `eventReminderDefault`(기본 15분)를 사용합니다.

```
GET /api/reminders/upcoming
```

**권한**: `isLoggedIn`

### 응답 (200)

통합 배열을 `reminderTime` 오름차순으로 반환합니다. `type`은 `"standalone"` 또는 `"event"`입니다.

```json
{
  "reminders": [
    {
      "type": "standalone",
      "reminderTime": "2026-08-07T10:00:00.000Z",
      "data": {
        "_id": "507f1f77bcf86cd799439301",
        "title": "상담 준비",
        "completed": false
      }
    },
    {
      "type": "event",
      "reminderTime": "2026-08-07T11:45:00.000Z",
      "data": {
        "_id": "507f1f77bcf86cd799439401",
        "title": "전체회의",
        "eventStart": "2026-08-07T12:00:00.000Z",
        "minutesBefore": 15,
        "isRecurring": false
      }
    }
  ]
}
```

---

## 리마인더 생성

```
POST /api/reminders
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | O | 제목 |
| `reminderTime` | `string` (ISO 8601) | O | 알림 시각 |
| `memo` | `string` | X | 메모 |

`reminderTime`이 이미 지났거나 1분 이내이면 즉시 `reminder` 유형 알림을 발송할 수 있습니다. 그 외에는 스케줄러 큐에 등록됩니다.

### 응답 (200)

```json
{
  "reminder": {
    "_id": "507f1f77bcf86cd799439301",
    "title": "상담 준비",
    "memo": "",
    "reminderTime": "2026-08-07T10:00:00.000Z",
    "completed": false,
    "notified": false
  }
}
```

---

## 수정 / 완료 / 삭제

```
PUT    /api/reminders/:_id            // title, memo, reminderTime
PUT    /api/reminders/:_id/complete   // completed: true, 큐에서 제거
DELETE /api/reminders/:_id
```

`reminderTime` 변경 시 `notified`가 초기화되고 스케줄러에 다시 등록됩니다.

---

## 관련 문서

- [알림 API](./notifications.md)
- [캘린더 API](./calendar.md)
- [API 개요](./overview.md)
