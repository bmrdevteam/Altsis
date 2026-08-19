# 채팅 API

실시간 채팅 기능의 REST API입니다. 채팅방 관리, 메시지 송수신, 파일 업로드/다운로드, 사용자 검색 기능을 제공합니다. 모든 엔드포인트는 `isChatEnabled` 미들웨어를 통해 아카데미의 채팅 활성화 여부를 확인합니다.

> **라우트 파일**: `backend/src/routes/chats.js`
> **컨트롤러 파일**: `backend/src/controllers/chats.js`
> **모델 파일**: `backend/src/models/ChatRoom.js`, `backend/src/models/ChatMessage.js`, `backend/src/models/ChatFile.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/chats/rooms` | 채팅방 생성 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/rooms` | 채팅방 목록 조회 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/rooms/:roomId` | 채팅방 상세 조회 | `isLoggedIn` + `isChatEnabled` |
| `PUT` | `/api/chats/rooms/:roomId` | 채팅방 수정 | `isLoggedIn` + `isChatEnabled` |
| `DELETE` | `/api/chats/rooms/:roomId` | 채팅방 나가기/삭제 | `isLoggedIn` + `isChatEnabled` |
| `DELETE` | `/api/chats/rooms/:roomId/creator` | 채팅방 삭제 (방장 전용) | `isLoggedIn` + `isChatEnabled` |
| `POST` | `/api/chats/rooms/:roomId/participants` | 참가자 추가 | `isLoggedIn` + `isChatEnabled` |
| `DELETE` | `/api/chats/rooms/:roomId/participants/:participantId` | 참가자 제거 | `isLoggedIn` + `isChatEnabled` |
| `POST` | `/api/chats/rooms/:roomId/messages` | 메시지 전송 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/rooms/:roomId/messages` | 메시지 목록 조회 | `isLoggedIn` + `isChatEnabled` |
| `PUT` | `/api/chats/rooms/:roomId/messages/:messageId/reactions` | 이모지 리액션 토글 | `isLoggedIn` + `isChatEnabled` |
| `PUT` | `/api/chats/rooms/:roomId/read` | 읽음 처리 | `isLoggedIn` + `isChatEnabled` |
| `POST` | `/api/chats/rooms/:roomId/upload` | 파일 업로드 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/files` | 내 파일 목록 조회 | `isLoggedIn` + `isChatEnabled` |
| `DELETE` | `/api/chats/files/:fileId` | 파일 삭제 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/files/:fileId/signed` | 다운로드 URL 조회 | `isLoggedIn` + `isChatEnabled` |
| `GET` | `/api/chats/users` | 사용자 검색 | `isLoggedIn` + `isChatEnabled` |

---

## 채팅방 생성

새로운 채팅방을 생성합니다. 1:1 채팅(`direct`)의 경우 동일한 참가자 조합의 채팅방이 이미 존재하면 기존 채팅방을 반환합니다.

```
POST /api/chats/rooms
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | `string` | O | 채팅방 유형 (`"direct"` \| `"group"`) |
| `participants` | `object[]` | O | 참가자 목록 (현재 사용자 제외) |
| `participants[].user` | `string` | O | 참가자 ObjectId |
| `participants[].userId` | `string` | O | 참가자 사용자 ID |
| `participants[].userName` | `string` | O | 참가자 이름 |
| `participants[].profile` | `string` | X | 참가자 프로필 이미지 URL |
| `name` | `string` | 그룹 시 O | 채팅방 이름 (그룹 채팅 전용) |

> **참고**: `direct` 채팅 시 `participants` 배열에는 정확히 1명의 참가자만 포함해야 합니다. 현재 로그인한 사용자는 자동으로 참가자에 추가됩니다.

### 요청 예시 (1:1 채팅)

```json
{
  "type": "direct",
  "participants": [
    {
      "user": "507f1f77bcf86cd799439011",
      "userId": "user01",
      "userName": "홍길동"
    }
  ]
}
```

### 요청 예시 (그룹 채팅)

```json
{
  "type": "group",
  "name": "프로젝트 회의방",
  "participants": [
    {
      "user": "507f1f77bcf86cd799439011",
      "userId": "user01",
      "userName": "홍길동"
    },
    {
      "user": "507f1f77bcf86cd799439012",
      "userId": "user02",
      "userName": "김철수",
      "profile": "https://example.com/profile.jpg"
    }
  ]
}
```

### 응답 (200) - 신규 생성

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "group",
    "name": "프로젝트 회의방",
    "creator": "507f1f77bcf86cd799439000",
    "creatorId": "admin01",
    "creatorName": "관리자",
    "participants": [
      {
        "user": "507f1f77bcf86cd799439000",
        "userId": "admin01",
        "userName": "관리자",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      },
      {
        "user": "507f1f77bcf86cd799439011",
        "userId": "user01",
        "userName": "홍길동",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      },
      {
        "user": "507f1f77bcf86cd799439012",
        "userId": "user02",
        "userName": "김철수",
        "profile": "https://example.com/profile.jpg",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

### 응답 (200) - 기존 1:1 채팅방 반환

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "direct",
    "participants": [
      {
        "user": "507f1f77bcf86cd799439000",
        "userId": "admin01",
        "userName": "관리자",
        "joinedAt": "2024-01-14T10:00:00.000Z"
      },
      {
        "user": "507f1f77bcf86cd799439011",
        "userId": "user01",
        "userName": "홍길동",
        "joinedAt": "2024-01-14T10:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-14T10:00:00.000Z",
    "updatedAt": "2024-01-14T10:00:00.000Z"
  },
  "existing": true
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(type)` | `type` 필드 누락 |
| `400` | `FIELD_REQUIRED(participants)` | `participants` 필드 누락 또는 빈 배열 |
| `400` | `FIELD_INVALID(participants)` | 1:1 채팅 시 참가자가 1명이 아닌 경우 |

---

## 채팅방 목록 조회

현재 사용자가 참가 중인 활성 채팅방 목록을 조회합니다. 마지막 메시지 시간 기준 내림차순으로 정렬됩니다.

```
GET /api/chats/rooms
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 응답 (200)

```json
{
  "rooms": [
    {
      "_id": "60a1b2c3d4e5f6789012abcd",
      "type": "group",
      "name": "프로젝트 회의방",
      "creator": "507f1f77bcf86cd799439000",
      "creatorId": "admin01",
      "creatorName": "관리자",
      "participants": [
        {
          "user": "507f1f77bcf86cd799439000",
          "userId": "admin01",
          "userName": "관리자",
          "joinedAt": "2024-01-15T09:00:00.000Z",
          "lastReadAt": "2024-01-15T12:00:00.000Z"
        },
        {
          "user": "507f1f77bcf86cd799439011",
          "userId": "user01",
          "userName": "홍길동",
          "joinedAt": "2024-01-15T09:00:00.000Z"
        }
      ],
      "lastMessage": {
        "content": "회의 시간이 변경되었습니다.",
        "sender": "507f1f77bcf86cd799439000",
        "senderName": "관리자",
        "sentAt": "2024-01-15T12:00:00.000Z"
      },
      "isActive": true,
      "settings": {
        "allowInvites": true,
        "allowChat": true
      },
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    },
    {
      "_id": "60a1b2c3d4e5f6789012abce",
      "type": "direct",
      "participants": [
        {
          "user": "507f1f77bcf86cd799439000",
          "userId": "admin01",
          "userName": "관리자",
          "joinedAt": "2024-01-14T10:00:00.000Z"
        },
        {
          "user": "507f1f77bcf86cd799439012",
          "userId": "user02",
          "userName": "김철수",
          "joinedAt": "2024-01-14T10:00:00.000Z"
        }
      ],
      "lastMessage": {
        "content": "안녕하세요!",
        "sender": "507f1f77bcf86cd799439012",
        "senderName": "김철수",
        "sentAt": "2024-01-14T15:30:00.000Z"
      },
      "isActive": true,
      "createdAt": "2024-01-14T10:00:00.000Z",
      "updatedAt": "2024-01-14T15:30:00.000Z"
    }
  ]
}
```

---

## 채팅방 상세 조회

특정 채팅방의 상세 정보를 조회합니다. 채팅방 참가자만 조회할 수 있습니다.

```
GET /api/chats/rooms/:roomId
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 응답 (200)

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "group",
    "name": "프로젝트 회의방",
    "creator": "507f1f77bcf86cd799439000",
    "creatorId": "admin01",
    "creatorName": "관리자",
    "participants": [
      {
        "user": "507f1f77bcf86cd799439000",
        "userId": "admin01",
        "userName": "관리자",
        "joinedAt": "2024-01-15T09:00:00.000Z",
        "lastReadAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "lastMessage": {
      "content": "회의 시간이 변경되었습니다.",
      "sender": "507f1f77bcf86cd799439000",
      "senderName": "관리자",
      "sentAt": "2024-01-15T12:00:00.000Z"
    },
    "isActive": true,
    "settings": {
      "allowInvites": true,
      "allowChat": true
    },
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 채팅방 참가자가 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

---

## 채팅방 수정

그룹 채팅방의 이름 또는 설정을 변경합니다. 이름은 모든 참가자가 변경할 수 있으나, 설정(`settings`)은 방장만 변경할 수 있습니다.

```
PUT /api/chats/rooms/:roomId
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | X | 새 채팅방 이름 (그룹 채팅 전용, 모든 참가자 변경 가능) |
| `settings` | `object` | X | 채팅방 설정 (방장만 변경 가능) |
| `settings.allowInvites` | `boolean` | X | 일반 참가자의 초대 허용 여부 |
| `settings.allowChat` | `boolean` | X | 일반 참가자의 메시지 전송 허용 여부 |

### 요청 예시

```json
{
  "name": "프로젝트 회의방 (수정)",
  "settings": {
    "allowInvites": false,
    "allowChat": true
  }
}
```

### 응답 (200)

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "group",
    "name": "프로젝트 회의방 (수정)",
    "settings": {
      "allowInvites": false,
      "allowChat": true
    },
    "participants": [ ... ],
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T14:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 채팅방 참가자가 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

---

## 채팅방 나가기/삭제

채팅방을 나가거나 삭제합니다. 유형에 따라 동작이 다릅니다.

- **1:1 채팅** (`direct`): 소프트 삭제 (`isActive = false`)
- **그룹 채팅** (`group`): 참가자 목록에서 현재 사용자 제거. 참가자가 0명이 되면 소프트 삭제

```
DELETE /api/chats/rooms/:roomId
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 채팅방 참가자가 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

---

## 채팅방 삭제 (방장 전용)

방장이 채팅방을 강제 삭제합니다. 소프트 삭제(`isActive = false`) 처리되며, 모든 참가자에게 `room_deleted` 소켓 이벤트가 발송됩니다.

```
DELETE /api/chats/rooms/:roomId/creator
```

**권한**: `isLoggedIn` + `isChatEnabled` (방장만 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 방장이 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

### WebSocket 이벤트

| 이벤트 | 대상 | 페이로드 |
|--------|------|----------|
| `room_deleted` | 모든 참가자 | `{ room, deletedBy }` |

---

## 참가자 추가

그룹 채팅방에 새로운 참가자를 추가합니다. 이미 참가 중인 사용자는 중복 추가되지 않습니다. `allowInvites`가 `false`인 경우 방장만 초대할 수 있습니다.

```
POST /api/chats/rooms/:roomId/participants
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `participants` | `object[]` | O | 추가할 참가자 목록 |
| `participants[].user` | `string` | O | 참가자 ObjectId |
| `participants[].userId` | `string` | O | 참가자 사용자 ID |
| `participants[].userName` | `string` | O | 참가자 이름 |
| `participants[].profile` | `string` | X | 참가자 프로필 이미지 URL |

### 요청 예시

```json
{
  "participants": [
    {
      "user": "507f1f77bcf86cd799439013",
      "userId": "user03",
      "userName": "이영희"
    }
  ]
}
```

### 응답 (200)

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "group",
    "name": "프로젝트 회의방",
    "participants": [
      {
        "user": "507f1f77bcf86cd799439000",
        "userId": "admin01",
        "userName": "관리자",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      },
      {
        "user": "507f1f77bcf86cd799439011",
        "userId": "user01",
        "userName": "홍길동",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      },
      {
        "user": "507f1f77bcf86cd799439013",
        "userId": "user03",
        "userName": "이영희",
        "joinedAt": "2024-01-15T14:30:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(participants)` | `participants` 필드 누락 또는 빈 배열 |
| `400` | `FIELD_INVALID(room.type)` | 1:1 채팅방에 참가자 추가 시도 |
| `403` | `PERMISSION_DENIED` | 참가자가 아니거나, `allowInvites=false`에서 방장이 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

### WebSocket 이벤트

| 이벤트 | 대상 | 페이로드 |
|--------|------|----------|
| `participants_added` | 모든 참가자 | `{ room, newParticipants, addedBy }` |

---

## 참가자 제거

그룹 채팅방에서 참가자를 강제 제거합니다. 방장만 사용할 수 있으며, 자기 자신은 제거할 수 없습니다 (대신 채팅방 나가기를 사용).

```
DELETE /api/chats/rooms/:roomId/participants/:participantId
```

**권한**: `isLoggedIn` + `isChatEnabled` (방장만 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |
| `participantId` | `string` | 제거할 참가자의 user ObjectId |

### 응답 (200)

```json
{
  "room": {
    "_id": "60a1b2c3d4e5f6789012abcd",
    "type": "group",
    "name": "프로젝트 회의방",
    "participants": [
      {
        "user": "507f1f77bcf86cd799439000",
        "userId": "admin01",
        "userName": "관리자",
        "joinedAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T15:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_INVALID(room.type)` | 1:1 채팅방에서 참가자 제거 시도 |
| `400` | `FIELD_INVALID(participantId)` | 자기 자신을 제거하려는 경우 |
| `403` | `PERMISSION_DENIED` | 방장이 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |
| `404` | `__NOT_FOUND(participant)` | 해당 참가자를 찾을 수 없음 |

### WebSocket 이벤트

| 이벤트 | 대상 | 페이로드 |
|--------|------|----------|
| `participant_removed` | 제거된 사용자 + 남은 참가자 | `{ room, removedUserId, removedBy }` |

---

## 메시지 전송

채팅방에 메시지를 전송합니다. 전송 시 채팅방의 `lastMessage`가 자동 갱신되며, 발신자의 읽음 처리가 자동으로 수행됩니다. 그룹 채팅에서 `allowChat`이 `false`인 경우 방장만 메시지를 보낼 수 있습니다.

```
POST /api/chats/rooms/:roomId/messages
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `content` | `string` | O | 메시지 내용 |
| `messageType` | `string` | X | 메시지 유형 (`"text"` \| `"image"` \| `"file"` \| `"system"`). 기본값: `"text"` |
| `attachment` | `object` | 이미지/파일 시 O | 첨부 파일 정보 |
| `attachment.url` | `string` | O | 파일 URL |
| `attachment.fileName` | `string` | O | 파일 이름 |
| `attachment.fileSize` | `number` | O | 파일 크기 (바이트) |
| `attachment.mimeType` | `string` | O | MIME 타입 |
| `attachment.key` | `string` | O | S3 키 (서명 URL 생성용) |

### 요청 예시 (텍스트 메시지)

```json
{
  "content": "안녕하세요!"
}
```

### 요청 예시 (이미지 메시지)

```json
{
  "content": "이미지를 보냈습니다.",
  "messageType": "image",
  "attachment": {
    "url": "https://s3.example.com/chat/image.png",
    "fileName": "image.png",
    "fileSize": 1048576,
    "mimeType": "image/png",
    "key": "chat/rooms/60a1b2c3/image.png"
  }
}
```

### 요청 예시 (파일 메시지)

```json
{
  "content": "파일을 보냈습니다.",
  "messageType": "file",
  "attachment": {
    "url": "https://s3.example.com/chat/report.pdf",
    "fileName": "report.pdf",
    "fileSize": 2097152,
    "mimeType": "application/pdf",
    "key": "chat/rooms/60a1b2c3/report.pdf"
  }
}
```

### 응답 (200)

```json
{
  "message": {
    "_id": "60b1c2d3e4f5a6789012bcde",
    "room": "60a1b2c3d4e5f6789012abcd",
    "sender": "507f1f77bcf86cd799439000",
    "senderId": "admin01",
    "senderName": "관리자",
    "content": "안녕하세요!",
    "messageType": "text",
    "readBy": [
      {
        "user": "507f1f77bcf86cd799439000",
        "readAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "isDeleted": false,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

> **참고**: `lastMessage.content`는 이미지 메시지의 경우 `"[이미지]"`, 파일 메시지의 경우 `"[파일] {파일명}"` 으로 저장됩니다. 텍스트 메시지는 최대 100자까지 저장됩니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(content)` | 메시지 내용 누락 |
| `400` | `FIELD_REQUIRED(attachment)` | 이미지/파일 메시지에서 첨부 파일 누락 |
| `403` | `PERMISSION_DENIED` | 참가자가 아니거나, `allowChat=false`에서 방장이 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

### WebSocket 이벤트

| 이벤트 | 대상 | 페이로드 |
|--------|------|----------|
| `new_message` | 발신자를 제외한 모든 참가자 | `{ room, roomType, message }` |
| `message_reaction` | 토글한 사용자를 제외한 참가자 | `{ room, messageId, reactions }` |

리액션은 `new_message`로 보내지 않습니다(미읽음 뱃지·알림음 방지).

---

## 메시지 목록 조회

채팅방의 메시지를 조회합니다. 커서 기반 페이지네이션을 지원하며, 시간순(오래된 순)으로 정렬하여 반환합니다. 삭제된 메시지는 제외됩니다. 첨부 파일 URL은 1시간 유효한 서명 URL로 자동 변환됩니다.

```
GET /api/chats/rooms/:roomId/messages
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `limit` | `number` | X | 조회할 메시지 수 (기본값: `50`) |
| `before` | `string` | X | 이 시간 이전의 메시지 조회 (ISO 8601 형식, 커서 페이지네이션) |

### 요청 예시

```
GET /api/chats/rooms/60a1b2c3d4e5f6789012abcd/messages?limit=20&before=2024-01-15T12:00:00.000Z
```

### 응답 (200)

```json
{
  "messages": [
    {
      "_id": "60b1c2d3e4f5a6789012bcd1",
      "room": "60a1b2c3d4e5f6789012abcd",
      "sender": "507f1f77bcf86cd799439011",
      "senderId": "user01",
      "senderName": "홍길동",
      "content": "안녕하세요!",
      "messageType": "text",
      "readBy": [
        {
          "user": "507f1f77bcf86cd799439011",
          "readAt": "2024-01-15T11:00:00.000Z"
        }
      ],
      "isDeleted": false,
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    },
    {
      "_id": "60b1c2d3e4f5a6789012bcd2",
      "room": "60a1b2c3d4e5f6789012abcd",
      "sender": "507f1f77bcf86cd799439000",
      "senderId": "admin01",
      "senderName": "관리자",
      "content": "이미지를 보냈습니다.",
      "messageType": "image",
      "attachment": {
        "url": "https://signed-url.example.com/chat/image.png?signature=...",
        "fileName": "image.png",
        "fileSize": 1048576,
        "mimeType": "image/png",
        "key": "chat/rooms/60a1b2c3/image.png"
      },
      "readBy": [
        {
          "user": "507f1f77bcf86cd799439000",
          "readAt": "2024-01-15T11:30:00.000Z"
        }
      ],
      "isDeleted": false,
      "createdAt": "2024-01-15T11:30:00.000Z",
      "updatedAt": "2024-01-15T11:30:00.000Z"
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 채팅방 참가자가 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

---

## 읽음 처리

채팅방의 현재 사용자 참가자 정보에서 `lastReadAt`을 현재 시간으로 갱신합니다.

```
PUT /api/chats/rooms/:roomId/read
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 채팅방 참가자가 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |

### WebSocket 이벤트

| 이벤트 | 대상 | 페이로드 |
|--------|------|----------|
| `room_read` | 읽음 처리한 사용자를 제외한 참가자 | `{ room, userId, lastReadAt }` |

---

## 메시지 리액션 토글

참여자가 메시지에 유니코드 이모지 리액션을 추가하거나 취소합니다. 같은 이모지를 다시 보내면 취소됩니다. 삭제·시스템 메시지에는 사용할 수 없습니다.

```
PUT /api/chats/rooms/:roomId/messages/:messageId/reactions
```

**권한**: `isLoggedIn` + `isChatEnabled`

보드 채팅은 `PUT /api/boards/:_id/chat/rooms/:roomId/messages/:messageId/reactions` 입니다.

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `emoji` | `string` | O | 그래핌 1개의 이모지 |

### 응답 (200)

```json
{
  "reactions": [
    {
      "emoji": "👍",
      "users": [
        { "user": "507f1f77bcf86cd799439000", "userId": "admin01", "userName": "관리자" }
      ]
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_INVALID(emoji)` | 이모지가 아니거나 메시지당 종류 한도(24) 초과 |
| `403` | `PERMISSION_DENIED` | 참가자가 아니거나 삭제/시스템 메시지 |
| `404` | `__NOT_FOUND(room\|message)` | 방 또는 메시지 없음 |

---

## 파일 업로드

채팅방에 파일을 업로드합니다. `multipart/form-data` 형식으로 전송하며, `chatMulter` 미들웨어를 통해 S3에 저장됩니다. 업로드된 파일은 `ChatFile` 컬렉션에 기록됩니다.

```
POST /api/chats/rooms/:roomId/upload
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `roomId` | `string` | 채팅방 ObjectId |

### 요청 본문 (`multipart/form-data`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | `File` | O | 업로드할 파일 |

> **파일 크기 제한**: 이미지 파일 최대 10MB, 일반 파일 최대 20MB

### 응답 (200)

```json
{
  "attachment": {
    "url": "https://s3.example.com/chat/rooms/60a1b2c3/document.pdf",
    "fileName": "document.pdf",
    "fileSize": 2097152,
    "mimeType": "application/pdf",
    "key": "chat/rooms/60a1b2c3/document.pdf"
  }
}
```

> **참고**: 응답으로 받은 `attachment` 객체를 그대로 메시지 전송 API의 `attachment` 필드에 전달하여 파일 메시지를 전송할 수 있습니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(file)` | 파일 미첨부 |
| `403` | `PERMISSION_DENIED` | 참가자가 아니거나, `allowChat=false`에서 방장이 아닌 경우 |
| `404` | `__NOT_FOUND(room)` | 채팅방을 찾을 수 없음 |
| `409` | `LIMIT_FILE_SIZE` | 파일 크기 초과 |
| `409` | `INVALID_FILE_TYPE` | 허용되지 않은 파일 형식 |

---

## 내 파일 목록 조회

현재 사용자가 업로드한 채팅 파일 목록을 조회합니다. 커서 기반 페이지네이션을 지원하며, 파일 URL은 1시간 유효한 서명 URL로 자동 변환됩니다.

```
GET /api/chats/files
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `fileType` | `string` | X | 파일 유형 필터 (`"image"` \| `"file"`) |
| `limit` | `number` | X | 조회할 파일 수 (기본값: `20`) |
| `before` | `string` | X | 이 시간 이전의 파일 조회 (ISO 8601 형식, 커서 페이지네이션) |

### 요청 예시

```
GET /api/chats/files?fileType=image&limit=10
```

### 응답 (200)

```json
{
  "files": [
    {
      "_id": "60c1d2e3f4a5b6789012cdef",
      "user": "507f1f77bcf86cd799439000",
      "userId": "admin01",
      "room": "60a1b2c3d4e5f6789012abcd",
      "message": "60b1c2d3e4f5a6789012bcde",
      "fileName": "screenshot.png",
      "fileSize": 524288,
      "mimeType": "image/png",
      "key": "chat/rooms/60a1b2c3/screenshot.png",
      "url": "https://signed-url.example.com/chat/screenshot.png?signature=...",
      "fileType": "image",
      "isDeleted": false,
      "createdAt": "2024-01-15T11:30:00.000Z",
      "updatedAt": "2024-01-15T11:30:00.000Z"
    },
    {
      "_id": "60c1d2e3f4a5b6789012cdf0",
      "user": "507f1f77bcf86cd799439000",
      "userId": "admin01",
      "room": "60a1b2c3d4e5f6789012abcd",
      "fileName": "photo.jpg",
      "fileSize": 1048576,
      "mimeType": "image/jpeg",
      "key": "chat/rooms/60a1b2c3/photo.jpg",
      "url": "https://signed-url.example.com/chat/photo.jpg?signature=...",
      "fileType": "image",
      "isDeleted": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## 파일 삭제

업로드한 파일을 소프트 삭제합니다. 파일 소유자만 삭제할 수 있습니다.

```
DELETE /api/chats/files/:fileId
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `fileId` | `string` | 파일 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 파일 소유자가 아닌 경우 |
| `404` | `__NOT_FOUND(file)` | 파일을 찾을 수 없음 |

---

## 다운로드 URL 조회

파일의 다운로드용 Pre-Signed URL을 생성합니다. 파일 소유자 또는 해당 파일이 공유된 채팅방의 참가자가 접근할 수 있습니다. URL 유효 시간은 5분입니다.

```
GET /api/chats/files/:fileId/signed
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `fileId` | `string` | 파일 ObjectId |

### 응답 (200)

```json
{
  "preSignedUrl": "https://s3.example.com/chat/rooms/60a1b2c3/document.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&...",
  "expiryDate": "2024-01-15T12:05:00.000Z"
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 파일 소유자도 아니고 채팅방 참가자도 아닌 경우 |
| `404` | `__NOT_FOUND(file)` | 파일을 찾을 수 없거나 삭제된 경우 |

---

## 사용자 검색

채팅 가능한 사용자를 검색합니다. `userId` 또는 `userName`으로 검색하며, 학교별 필터링이 가능합니다. 현재 로그인한 사용자는 결과에서 제외됩니다.

```
GET /api/chats/users
```

**권한**: `isLoggedIn` + `isChatEnabled`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `q` | `string` | X | 검색어 (`userId` 또는 `userName` 대소문자 무관 부분 일치) |
| `sid` | `string` | X | 학교 ObjectId로 필터링 |

### 요청 예시

```
GET /api/chats/users?q=홍길&sid=507f1f77bcf86cd799439099
```

### 응답 (200)

```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user01",
      "userName": "홍길동",
      "profile": "https://example.com/profile.jpg",
      "schools": [
        {
          "school": "507f1f77bcf86cd799439099"
        }
      ]
    }
  ]
}
```

> **참고**: 최대 20명까지 반환됩니다.

---

## WebSocket 이벤트 요약

채팅 API는 실시간 통신을 위해 Socket.io 이벤트를 발생시킵니다. 각 사용자는 `chat:{academyId}:{userId}` 형식의 룸에 참가하여 이벤트를 수신합니다.

| 이벤트 | 발생 시점 | 페이로드 |
|--------|-----------|----------|
| `new_message` | 메시지 전송 시 (발신자 제외) | `{ room, roomType, message }` |
| `participants_added` | 참가자 추가 시 | `{ room, newParticipants, addedBy }` |
| `participant_removed` | 참가자 제거 시 | `{ room, removedUserId, removedBy }` |
| `room_deleted` | 방장이 채팅방 삭제 시 | `{ room, deletedBy }` |

---

## 데이터 모델

### ChatRoom

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | 고유 ID |
| `type` | `string` | O | - | `"direct"` \| `"group"` |
| `name` | `string` | X | - | 채팅방 이름 (그룹 전용) |
| `creator` | `ObjectId` | X | - | 방장 ObjectId |
| `creatorId` | `string` | X | - | 방장 사용자 ID |
| `creatorName` | `string` | X | - | 방장 이름 |
| `participants` | `TChatParticipant[]` | O | - | 참가자 목록 |
| `lastMessage` | `TLastMessage` | X | - | 마지막 메시지 미리보기 |
| `isActive` | `boolean` | X | `true` | 활성 상태 |
| `settings` | `TChatRoomSettings` | X | - | 채팅방 설정 |
| `createdAt` | `Date` | 자동 | - | 생성 시간 |
| `updatedAt` | `Date` | 자동 | - | 수정 시간 |

#### TChatParticipant

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `user` | `ObjectId` | O | 사용자 ObjectId |
| `userId` | `string` | O | 사용자 ID |
| `userName` | `string` | O | 사용자 이름 |
| `profile` | `string` | X | 프로필 이미지 URL |
| `joinedAt` | `Date` | X | 참가 시간 (기본: 현재 시간) |
| `lastReadAt` | `Date` | X | 마지막 읽음 시간 |

#### TLastMessage

| 필드 | 타입 | 설명 |
|------|------|------|
| `content` | `string` | 메시지 내용 (최대 100자) |
| `sender` | `ObjectId` | 발신자 ObjectId |
| `senderName` | `string` | 발신자 이름 |
| `sentAt` | `Date` | 전송 시간 |

#### TChatRoomSettings

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `allowInvites` | `boolean` | `true` | 일반 참가자의 초대 허용 여부 |
| `allowChat` | `boolean` | `true` | 일반 참가자의 메시지 전송 허용 여부 |

### ChatMessage

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | 고유 ID |
| `room` | `ObjectId` | O | - | 채팅방 ObjectId |
| `sender` | `ObjectId` | O | - | 발신자 ObjectId |
| `senderId` | `string` | O | - | 발신자 사용자 ID |
| `senderName` | `string` | O | - | 발신자 이름 |
| `content` | `string` | O | - | 메시지 내용 |
| `messageType` | `string` | X | `"text"` | `"text"` \| `"image"` \| `"file"` \| `"system"` |
| `attachment` | `TAttachment` | X | - | 첨부 파일 정보 |
| `readBy` | `TReadBy[]` | X | - | 읽은 사용자 목록 |
| `isDeleted` | `boolean` | X | `false` | 소프트 삭제 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시간 |
| `updatedAt` | `Date` | 자동 | - | 수정 시간 |

#### TAttachment

| 필드 | 타입 | 설명 |
|------|------|------|
| `url` | `string` | 파일 URL (서명 URL) |
| `fileName` | `string` | 파일 이름 |
| `fileSize` | `number` | 파일 크기 (바이트) |
| `mimeType` | `string` | MIME 타입 |
| `key` | `string` | S3 키 (서명 URL 생성용) |

#### TReadBy

| 필드 | 타입 | 설명 |
|------|------|------|
| `user` | `ObjectId` | 읽은 사용자 ObjectId |
| `readAt` | `Date` | 읽은 시간 |

### ChatFile

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | 자동 | - | 고유 ID |
| `user` | `ObjectId` | O | - | 업로더 ObjectId |
| `userId` | `string` | O | - | 업로더 사용자 ID |
| `room` | `ObjectId` | O | - | 채팅방 ObjectId |
| `message` | `ObjectId` | X | - | 연관 메시지 ObjectId |
| `fileName` | `string` | O | - | 원본 파일 이름 |
| `fileSize` | `number` | O | - | 파일 크기 (바이트) |
| `mimeType` | `string` | O | - | MIME 타입 |
| `key` | `string` | O | - | S3 키 |
| `url` | `string` | O | - | 파일 URL |
| `fileType` | `string` | O | - | `"image"` \| `"file"` |
| `isDeleted` | `boolean` | X | `false` | 소프트 삭제 여부 |
| `createdAt` | `Date` | 자동 | - | 생성 시간 |
| `updatedAt` | `Date` | 자동 | - | 수정 시간 |

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CChatRoom` | POST | `/api/chats/rooms` | 채팅방 생성 |
| `RChatRooms` | GET | `/api/chats/rooms` | 채팅방 목록 조회 |
| `RChatRoom` | GET | `/api/chats/rooms/:roomId` | 채팅방 상세 조회 |
| `UChatRoom` | PUT | `/api/chats/rooms/:roomId` | 채팅방 수정 |
| `DChatRoom` | DELETE | `/api/chats/rooms/:roomId` | 채팅방 나가기/삭제 |
| `CChatRoomParticipants` | POST | `/api/chats/rooms/:roomId/participants` | 참가자 추가 |
| `DChatRoomParticipant` | DELETE | `/api/chats/rooms/:roomId/participants/:participantId` | 참가자 제거 |
| `CChatMessage` | POST | `/api/chats/rooms/:roomId/messages` | 메시지 전송 |
| `UChatMessageReaction` | PUT | `/api/chats/rooms/:roomId/messages/:messageId/reactions` | 리액션 토글 |
| `RChatMessages` | GET | `/api/chats/rooms/:roomId/messages` | 메시지 목록 조회 |
| `UChatRoomRead` | PUT | `/api/chats/rooms/:roomId/read` | 읽음 처리 |
| `CChatFileUpload` | POST | `/api/chats/rooms/:roomId/upload` | 파일 업로드 |
| `RChatFiles` | GET | `/api/chats/files` | 내 파일 목록 조회 |
| `DChatFile` | DELETE | `/api/chats/files/:fileId` | 파일 삭제 |
| `RChatFileSignedUrl` | GET | `/api/chats/files/:fileId/signed` | 다운로드 URL 조회 |
| `RChatUsers` | GET | `/api/chats/users` | 사용자 검색 |
