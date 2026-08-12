# 알림 API

알림(Notification) 및 알림 설정(NotificationSetting) API입니다. 알림의 생성, 조회, 확인(읽음), 삭제와 알림 유형별 수신 설정을 관리합니다.

> **라우트 파일**: `backend/src/routes/notifications.js`
> **컨트롤러 파일**: `backend/src/controllers/notifications.js`
> **모델 파일**: `backend/src/models/Notification.js`, `backend/src/models/NotificationSetting.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/notifications` | 알림 생성 | `isLoggedIn` (`admin`\|`manager` 또는 활성 등록이 있는 `teacher`) |
| `GET` | `/api/notifications` | 알림 목록 조회 | `isLoggedIn` |
| `GET` | `/api/notifications/:_id` | 알림 상세 조회 | `isLoggedIn` (본인 소유) |
| `PUT` | `/api/notifications/:_id/check` | 알림 확인 | `isLoggedIn` (본인 소유) |
| `DELETE` | `/api/notifications/:_id` | 알림 삭제 | `isLoggedIn` (본인 소유) |
| `PUT` | `/api/notifications/bulk-check` | 알림 일괄 확인 | `isLoggedIn` |
| `GET` | `/api/notifications/settings` | 알림 설정 조회 | `isLoggedIn` |
| `PUT` | `/api/notifications/settings` | 알림 설정 수정 | `isLoggedIn` |
| `GET` | `/api/notifications/push/vapid-public-key` | Web Push VAPID 공개키 | `isLoggedIn` |
| `POST` | `/api/notifications/push/subscribe` | Web Push 구독 등록 | `isLoggedIn` |
| `DELETE` | `/api/notifications/push/subscribe` | Web Push 구독 해제 | `isLoggedIn` |
| `POST` | `/api/notifications/push/test` | Web Push 테스트 발송 | `isLoggedIn` |

---

## 알림 생성

알림을 생성하여 지정된 사용자들에게 발송합니다. 수신자별로 `received` 타입 알림이, 발신자에게는 `sent` 타입 알림이 생성됩니다. 생성 후 Socket.io를 통해 수신자에게 실시간 알림 이벤트(`listen`)가 전송됩니다.

```
POST /api/notifications
```

**권한**: `isLoggedIn` - `admin` 또는 `manager`는 항상 허용, 그 외 사용자는 활성화된 `teacher` 등록이 있어야 함

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `toUserList` | `object[]` | O | 수신자 목록 |
| `toUserList[].user` | `string` | O | 수신자 ObjectId |
| `toUserList[].userId` | `string` | O | 수신자 사용자 ID |
| `toUserList[].userName` | `string` | O | 수신자 이름 |
| `title` | `string` | O | 알림 제목 |
| `description` | `string` | O | 알림 내용 |
| `category` | `string` | X | 알림 카테고리 |

### 요청 예시

```json
{
  "toUserList": [
    {
      "user": "507f1f77bcf86cd799439011",
      "userId": "student01",
      "userName": "홍길동"
    },
    {
      "user": "507f1f77bcf86cd799439012",
      "userId": "student02",
      "userName": "김철수"
    }
  ],
  "title": "수업 안내",
  "description": "내일 오후 3시에 보충 수업이 있습니다.",
  "category": "수업"
}
```

### 응답 (200)

```json
{
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439101",
      "type": "received",
      "user": "507f1f77bcf86cd799439011",
      "userId": "student01",
      "userName": "홍길동",
      "fromUser": "507f1f77bcf86cd799439099",
      "fromUserId": "teacher01",
      "fromUserName": "박선생",
      "checked": false,
      "category": "수업",
      "title": "수업 안내",
      "description": "내일 오후 3시에 보충 수업이 있습니다.",
      "notificationType": "direct",
      "autoDeleteOnCheck": true,
      "date": "2024-03-15T09:00:00.000Z",
      "createdAt": "2024-03-15T09:00:00.000Z",
      "updatedAt": "2024-03-15T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439102",
      "type": "received",
      "user": "507f1f77bcf86cd799439012",
      "userId": "student02",
      "userName": "김철수",
      "fromUser": "507f1f77bcf86cd799439099",
      "fromUserId": "teacher01",
      "fromUserName": "박선생",
      "checked": false,
      "category": "수업",
      "title": "수업 안내",
      "description": "내일 오후 3시에 보충 수업이 있습니다.",
      "notificationType": "direct",
      "autoDeleteOnCheck": true,
      "date": "2024-03-15T09:00:00.000Z",
      "createdAt": "2024-03-15T09:00:00.000Z",
      "updatedAt": "2024-03-15T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439103",
      "type": "sent",
      "user": "507f1f77bcf86cd799439099",
      "userId": "teacher01",
      "userName": "박선생",
      "toUserList": [
        {
          "user": "507f1f77bcf86cd799439011",
          "userId": "student01",
          "userName": "홍길동"
        },
        {
          "user": "507f1f77bcf86cd799439012",
          "userId": "student02",
          "userName": "김철수"
        }
      ],
      "category": "수업",
      "title": "수업 안내",
      "description": "내일 오후 3시에 보충 수업이 있습니다.",
      "notificationType": "direct",
      "autoDeleteOnCheck": true,
      "date": "2024-03-15T09:00:00.000Z",
      "createdAt": "2024-03-15T09:00:00.000Z",
      "updatedAt": "2024-03-15T09:00:00.000Z"
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`toUserList`, `title`, `description`, `user`, `userId`, `userName`) |
| `403` | `PERMISSION_DENIED` | `admin`/`manager`가 아니고 활성 `teacher` 등록이 없는 경우 |

---

## 알림 목록 조회

로그인한 사용자의 알림 목록을 조회합니다. 성능을 위해 `description` 필드는 응답에서 제외됩니다.

```
GET /api/notifications
```

**권한**: `isLoggedIn`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | `string` | O | `"received"` (받은 알림) 또는 `"sent"` (보낸 알림) |
| `checked` | `string` | X | `"true"` 또는 `"false"` - 확인 여부로 필터링 |

### 응답 (200)

```json
{
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439101",
      "type": "received",
      "user": "507f1f77bcf86cd799439011",
      "userId": "student01",
      "userName": "홍길동",
      "fromUser": "507f1f77bcf86cd799439099",
      "fromUserId": "teacher01",
      "fromUserName": "박선생",
      "checked": false,
      "category": "수업",
      "title": "수업 안내",
      "notificationType": "direct",
      "autoDeleteOnCheck": true,
      "date": "2024-03-15T09:00:00.000Z",
      "createdAt": "2024-03-15T09:00:00.000Z",
      "updatedAt": "2024-03-15T09:00:00.000Z"
    }
  ]
}
```

> **참고**: `description` 필드는 목록 조회 시 성능 최적화를 위해 제외됩니다. 상세 내용이 필요하면 개별 알림 상세 조회 API를 사용하세요.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(type)` | `type` 쿼리 파라미터 누락 |

---

## 알림 상세 조회

알림의 상세 정보를 조회합니다. `description` 필드를 포함한 전체 데이터를 반환합니다.

```
GET /api/notifications/:_id
```

**권한**: `isLoggedIn` (본인 소유 알림만 조회 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 알림 ObjectId |

### 응답 (200)

```json
{
  "notification": {
    "_id": "507f1f77bcf86cd799439101",
    "type": "received",
    "user": "507f1f77bcf86cd799439011",
    "userId": "student01",
    "userName": "홍길동",
    "fromUser": "507f1f77bcf86cd799439099",
    "fromUserId": "teacher01",
    "fromUserName": "박선생",
    "checked": false,
    "category": "수업",
    "title": "수업 안내",
    "description": "내일 오후 3시에 보충 수업이 있습니다.",
    "notificationType": "direct",
    "relatedEntity": {
      "type": "enrollment",
      "id": "507f1f77bcf86cd799439201"
    },
    "autoDeleteOnCheck": true,
    "date": "2024-03-15T09:00:00.000Z",
    "createdAt": "2024-03-15T09:00:00.000Z",
    "updatedAt": "2024-03-15T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 본인 소유가 아닌 알림 조회 시도 |
| `404` | `NOTIFICATION_NOT_FOUND` | 알림을 찾을 수 없음 |

---

## 알림 확인

알림을 확인(읽음) 처리합니다. `autoDeleteOnCheck`가 `true`인 휘발성 알림은 확인 시 자동으로 삭제되며, `false`인 알림은 `checked`가 `true`로 변경됩니다.

```
PUT /api/notifications/:_id/check
```

**권한**: `isLoggedIn` (본인 소유 알림만 확인 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 알림 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 본인 소유가 아닌 알림 확인 시도 |
| `404` | `NOTIFICATION_NOT_FOUND` | 알림을 찾을 수 없음 |

---

## 알림 삭제

알림을 삭제합니다.

```
DELETE /api/notifications/:_id
```

**권한**: `isLoggedIn` (본인 소유 알림만 삭제 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 알림 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 본인 소유가 아닌 알림 삭제 시도 |
| `404` | `NOTIFICATION_NOT_FOUND` | 알림을 찾을 수 없음 |

---

## 알림 일괄 확인

로그인한 사용자의 미확인 수신 알림을 일괄 확인 처리합니다. `autoDeleteOnCheck`가 `true`인 휘발성 알림은 삭제되고, 비휘발성 알림은 `checked`가 `true`로 변경됩니다.

```
PUT /api/notifications/bulk-check
```

**권한**: `isLoggedIn`

### 응답 (200)

```json
{
  "checkedCount": 5,
  "deletedCount": 3
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `checkedCount` | `number` | 확인 처리된 비휘발성 알림 수 |
| `deletedCount` | `number` | 삭제된 휘발성 알림 수 |

---

## 알림 설정 조회

로그인한 사용자의 알림 수신 설정을 조회합니다. 설정이 존재하지 않으면 기본값으로 자동 생성됩니다.

```
GET /api/notifications/settings
```

**권한**: `isLoggedIn`

### 응답 (200)

```json
{
  "settings": {
    "classInvitation": true,
    "classCancellation": true,
    "classApproval": true,
    "classApprovalCancel": true,
    "scheduleStart": true,
    "newPost": true,
    "directMessage": true,
    "soundEnabled": true,
    "reminder": true,
    "eventReminderDefault": 15
  }
}
```

---

## 알림 설정 수정

알림 수신 설정을 수정합니다. 전달된 필드만 변경되며, 미전달 필드는 기존 값이 유지됩니다.

```
PUT /api/notifications/settings
```

**권한**: `isLoggedIn`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `classInvitation` | `boolean` | X | 수업 초대 알림 수신 여부 |
| `classCancellation` | `boolean` | X | 수업 초대 취소 알림 수신 여부 |
| `classApproval` | `boolean` | X | 수업 승인 알림 수신 여부 |
| `classApprovalCancel` | `boolean` | X | 수업 승인 취소 알림 수신 여부 |
| `scheduleStart` | `boolean` | X | 일정 시작 알림 수신 여부 |
| `newPost` | `boolean` | X | 새 게시글 알림 수신 여부 |
| `directMessage` | `boolean` | X | 직접 메시지 알림 수신 여부 |

### 요청 예시

```json
{
  "classInvitation": true,
  "classCancellation": false,
  "directMessage": true
}
```

### 응답 (200)

```json
{
  "settings": {
    "classInvitation": true,
    "classCancellation": false,
    "classApproval": true,
    "classApprovalCancel": true,
    "scheduleStart": true,
    "newPost": true,
    "directMessage": true,
    "soundEnabled": true,
    "reminder": true,
    "eventReminderDefault": 15
  }
}
```

---

## 데이터 모델

### Notification

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | - | 자동생성 | 고유 식별자 |
| `type` | `string` | O | - | `"sent"` (발신) 또는 `"received"` (수신) |
| `user` | `ObjectId` | O | - | 알림 소유자 (발신자 또는 수신자) |
| `userId` | `string` | O | - | 소유자 사용자 ID |
| `userName` | `string` | O | - | 소유자 이름 |
| `toUserList` | `object[]` | X | - | `type=sent`일 때 수신자 목록 |
| `fromUser` | `ObjectId` | X | - | `type=received`일 때 발신자 ObjectId |
| `fromUserId` | `string` | X | - | `type=received`일 때 발신자 사용자 ID |
| `fromUserName` | `string` | X | - | `type=received`일 때 발신자 이름 |
| `checked` | `boolean` | X | `false` | `type=received`일 때 확인 여부 |
| `category` | `string` | X | - | 알림 카테고리 |
| `title` | `string` | O | - | 알림 제목 |
| `description` | `string` | X | - | 알림 내용 |
| `date` | `Date` | X | 자동설정 | `insertMany` 시 UTC 시각으로 자동 설정 |
| `notificationType` | `string` | X | `"direct"` | 알림 유형 (아래 참조) |
| `relatedEntity` | `object` | X | - | 관련 엔티티 정보 (`type`, `id`) |
| `autoDeleteOnCheck` | `boolean` | X | `true` | 확인 시 자동 삭제 여부 (휘발성 알림) |
| `createdAt` | `Date` | - | 자동생성 | 생성 일시 |
| `updatedAt` | `Date` | - | 자동생성 | 수정 일시 |

#### 인덱스

| 인덱스 | 필드 | 속성 |
|--------|------|------|
| `user_1_createdAt_-1` | `{ user: 1, createdAt: -1 }` | COMPOUND |

#### notificationType 값

| 값 | 설명 |
|----|------|
| `direct` | 직접 발송 알림 (기본값) |
| `classInvitation` | 수업 초대 알림 |
| `classCancellation` | 수업 초대 취소 알림 |
| `classApproval` | 수업 승인 알림 |
| `classApprovalCancel` | 수업 승인 취소 알림 |
| `scheduleStart` | 일정 시작 알림 |
| `newPost` | 새 게시글 알림 |
| `reminder` | 리마인더 알림 |

#### relatedEntity.type 값

| 값 | 설명 |
|----|------|
| `enrollment` | 수강 등록 |
| `syllabus` | 강의 계획 |
| `calendarEvent` | 캘린더 이벤트 |
| `post` | 게시글 |
| `reminder` | 리마인더 |

### NotificationSetting

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | - | 자동생성 | 고유 식별자 |
| `user` | `ObjectId` | O | - | 사용자 ObjectId (UNIQUE) |
| `userId` | `string` | O | - | 사용자 ID |
| `userName` | `string` | O | - | 사용자 이름 |
| `settings` | `object` | X | 기본값 객체 | 알림 설정 (아래 참조) |
| `createdAt` | `Date` | - | 자동생성 | 생성 일시 |
| `updatedAt` | `Date` | - | 자동생성 | 수정 일시 |

#### settings 기본값

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `classInvitation` | `boolean` | `true` | 수업 초대 알림 |
| `classCancellation` | `boolean` | `true` | 수업 초대 취소 알림 |
| `classApproval` | `boolean` | `true` | 수업 승인 알림 |
| `classApprovalCancel` | `boolean` | `true` | 수업 승인 취소 알림 |
| `scheduleStart` | `boolean` | `true` | 일정 시작 알림 |
| `newPost` | `boolean` | `true` | 새 게시글 알림 |
| `directMessage` | `boolean` | `true` | 직접 메시지 알림 |
| `soundEnabled` | `boolean` | `true` | 알림음 활성화 |
| `reminder` | `boolean` | `true` | 리마인더 알림 |
| `eventReminderDefault` | `number` | `15` | 이벤트 리마인더 기본값 (분) |

---

## 주요 특성

### 휘발성 알림 (autoDeleteOnCheck)

`autoDeleteOnCheck`가 `true`인 알림은 확인 시 데이터베이스에서 삭제됩니다. 기본값이 `true`이므로 대부분의 알림은 확인 후 자동 삭제됩니다. 영구적으로 보관해야 하는 알림은 생성 시 `autoDeleteOnCheck: false`로 설정합니다.

### WebSocket 실시간 알림

알림 생성 시 Socket.io를 통해 수신자에게 실시간으로 알림 이벤트가 전송됩니다. 각 사용자는 `{academyId}/{userId}` 형식의 룸에 접속하며, `listen` 이벤트로 `"update notifications"` 메시지를 수신합니다.

### 자동 알림 설정 필터링

`sendAutoNotification` 서비스를 통해 발송되는 자동 알림은 수신자의 알림 설정을 확인하여, 해당 `notificationType`을 비활성화한 사용자에게는 알림이 발송되지 않습니다.

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CNotification` | POST | `/api/notifications` | 알림 생성 |
| `RNotifications` | GET | `/api/notifications` | 알림 목록 조회 |
| `RNotification` | GET | `/api/notifications/:_id` | 알림 상세 조회 |
| `UCheckNotification` | PUT | `/api/notifications/:_id/check` | 알림 확인 |
| `DNotification` | DELETE | `/api/notifications/:_id` | 알림 삭제 |
| `UBulkCheckNotifications` | PUT | `/api/notifications/bulk-check` | 알림 일괄 확인 |
| `RNotificationSettings` | GET | `/api/notifications/settings` | 알림 설정 조회 |
| `UNotificationSettings` | PUT | `/api/notifications/settings` | 알림 설정 수정 |
