# 실시간 통신

Altsis의 Socket.io 기반 실시간 통신 아키텍처를 설명합니다. 알림, 수강신청 대기열, 채팅의 세 가지 네임스페이스로 구성되어 있습니다.

---

## 아키텍처 개요

Altsis는 **Socket.io**를 사용하여 3개의 독립된 네임스페이스(path)로 실시간 통신을 제공합니다.

```
┌───────────────────────────────────────────────────────────────┐
│                      클라이언트 (브라우저)                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ 알림 소켓    │  │ 수강신청 소켓 │  │   채팅 소켓       │     │
│  │ Socket.io   │  │ Socket.io    │  │   Socket.io      │     │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘     │
└─────────┼────────────────┼───────────────────┼───────────────┘
          │                │                   │
   /io/notification  /io/enrollment      /io/chat
          │                │                   │
┌─────────▼────────────────▼───────────────────▼───────────────┐
│                   Express HTTP 서버                            │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ioNotification│  │ioEnrollment  │  │    ioChat         │     │
│  │  (Server)   │  │  (Server)    │  │   (Server)       │     │
│  └──────┬──────┘  └──────────────┘  └────────┬─────────┘     │
└─────────┼────────────────────────────────────┼───────────────┘
          │                                    │
          ▼                                    ▼
    ┌───────────┐                        ┌───────────┐
    │   Redis   │                        │   Redis   │
    │(알림 상태) │                        │(소켓 매핑) │
    └───────────┘                        └───────────┘
```

### 네임스페이스 요약

| 네임스페이스 | 경로 | 용도 | Redis 연동 |
|-------------|------|------|------------|
| **Notification** | `/io/notification` | 실시간 알림 전송 | 알림 수신 상태 저장 |
| **Enrollment** | `/io/enrollment` | 수강신청 대기번호 | 미사용 |
| **Chat** | `/io/chat` | 실시간 채팅 | 소켓-사용자 매핑 |

---

## 초기화

모든 소켓 서버는 `backend/src/utils/webSocket.js`에서 HTTP 서버를 공유하여 초기화됩니다.

```javascript
// backend/src/utils/webSocket.js
import { Server } from "socket.io";

const initializeWebSocket = (_server) => {
  // 3개의 Socket.io 서버를 동일한 HTTP 서버 위에 생성
  ioNotification = new Server(_server, { path: "/io/notification", cors: {...} });
  ioEnrollment   = new Server(_server, { path: "/io/enrollment",   cors: {...} });
  ioChat         = new Server(_server, { path: "/io/chat",         cors: {...} });

  // 각 네임스페이스별 이벤트 핸들러 등록
  // ...
};
```

> [!NOTE]
> 각 네임스페이스는 `path` 옵션으로 구분됩니다. Socket.io의 `namespace`가 아닌 별도의 `Server` 인스턴스로 구현되어 있어 완전히 독립된 연결을 유지합니다.

---

## 1. 알림 네임스페이스 (/io/notification)

사용자에게 실시간으로 알림을 전송하는 네임스페이스입니다.

### Room 구조

```
Room: {academyId}/{userId}
예시: academy-bmr/user123
```

각 사용자는 자신의 고유 Room에 참여하여, 해당 Room으로 전송되는 알림을 수신합니다.

### 이벤트 흐름

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ 클라이언트 │                    │   서버   │                    │  Redis   │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  connect                      │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │  emit("listening",            │                               │
     │    {academyId, userId})       │                               │
     ├──────────────────────────────►│                               │
     │                               │  socket.join(room)            │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │          ... (대기 중) ...      │                               │
     │                               │                               │
     │                               │ (다른 사용자의 액션으로         │
     │                               │  알림 생성 트리거)              │
     │                               │                               │
     │   emit("notification", data)  │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
```

### 클라이언트 이벤트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `connect` | Client -> Server | - | 소켓 연결 |
| `listening` | Client -> Server | `{ academyId, userId }` | Room 참여 |
| `disconnect` | Client -> Server | - | 연결 해제 |

### 서버 이벤트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `notification` | Server -> Client | 알림 데이터 | 새 알림 전송 |

### Redis 연동

알림 수신 상태를 Redis에 저장하여 중복 조회를 방지합니다.

```
키 패턴: isReceivedNotifications/{academyId}/{userId}
용도:   클라이언트의 알림 수신 여부를 캐싱하여 불필요한 DB 조회 방지
```

---

## 2. 수강신청 네임스페이스 (/io/enrollment)

수강신청 시 대기번호를 실시간으로 제공하는 네임스페이스입니다. 다수의 학생이 동시에 수강신청을 할 때, 순차 처리되는 대기열의 현재 위치를 알려줍니다.

### 이벤트 흐름

```
┌──────────┐                    ┌──────────────────────────┐
│ 클라이언트 │                    │          서버             │
└────┬─────┘                    │  ┌────────────────────┐  │
     │                          │  │ 수강신청 대기열      │  │
     │  connect                 │  │ taskRequested: 150  │  │
     ├─────────────────────────►│  │ taskCompleted: 142  │  │
     │                          │  └────────────────────┘  │
     │  emit("requestWaitingOrder",                        │
     │    {taskIdx: 148})       │                          │
     ├─────────────────────────►│                          │
     │                          │  대기순번 계산:            │
     │                          │  waitingOrder = 148-142 = 6
     │                          │  waitingBehind = 150-148 = 2
     │  emit("responseWaitingOrder",                       │
     │    {waitingOrder: 6,     │                          │
     │     waitingBehind: 2})   │                          │
     │◄─────────────────────────┤                          │
     │                          └──────────────────────────┘
```

### 이벤트 상세

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `requestWaitingOrder` | Client -> Server | `{ taskIdx }` | 대기 순번 요청 |
| `responseWaitingOrder` | Server -> Client | `{ waitingOrder, waitingBehind }` | 대기 순번 응답 |

### 응답 데이터 설명

| 필드 | 계산식 | 설명 |
|------|--------|------|
| `waitingOrder` | `taskIdx - taskCompleted` | 내 앞에 남은 대기 수 |
| `waitingBehind` | `taskRequested - taskIdx` | 내 뒤에 있는 대기 수 |

---

## 3. 채팅 네임스페이스 (/io/chat)

실시간 채팅 기능을 제공하는 네임스페이스입니다. 사용자별 Room과 채팅방별 Room 두 가지 레벨의 Room을 사용합니다.

### Room 구조

```
사용자 Room:   chat:{academyId}:{userId}    ← 사용자별 알림 수신용
채팅방 Room:   room:{roomId}                ← 채팅방별 메시지 수신용
```

### 이벤트 흐름

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ 클라이언트 │                    │   서버   │                    │  Redis   │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  connect                      │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │  emit("join",                 │                               │
     │    {academyId, userId})       │                               │
     ├──────────────────────────────►│  hSet("io/chat/sid-user",    │
     │                               │    socketId, userRoom)        │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │  emit("join_room",            │                               │
     │    {roomId})                  │                               │
     ├──────────────────────────────►│  socket.join(room:{roomId})  │
     │                               │                               │
     │  emit("typing",               │                               │
     │    {roomId, userId, ...})     │                               │
     ├──────────────────────────────►│                               │
     │                               │  broadcast to room:{roomId}  │
     │   emit("user_typing", data)   │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │  emit("leave_room",           │                               │
     │    {roomId})                  │                               │
     ├──────────────────────────────►│  socket.leave(room:{roomId}) │
     │                               │                               │
     │  disconnect                   │                               │
     ├──────────────────────────────►│  hDel("io/chat/sid-user",   │
     │                               │    socketId)                  │
     │                               ├──────────────────────────────►│
     │                               │                               │
```

### 이벤트 상세

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `join` | Client -> Server | `{ academyId, userId }` | 사용자 Room 참여 |
| `join_room` | Client -> Server | `{ roomId }` | 채팅방 Room 참여 |
| `leave_room` | Client -> Server | `{ roomId }` | 채팅방 Room 퇴장 |
| `typing` | Client -> Server | `{ roomId, userId, userName, isTyping }` | 입력 중 상태 전송 |
| `user_typing` | Server -> Client | `{ roomId, userId, userName, isTyping }` | 입력 중 상태 수신 (해당 Room 브로드캐스트) |
| `disconnect` | Client -> Server | - | 연결 해제 |

### Redis 연동

채팅 네임스페이스는 Redis 해시를 사용하여 소켓 ID와 사용자의 매핑을 관리합니다.

```
Redis Hash Key: io/chat/sid-user
┌─────────────────┬──────────────────────────┐
│ Field (socketId)│ Value (userRoom)         │
├─────────────────┼──────────────────────────┤
│ abc123          │ chat:academy-bmr:user001 │
│ def456          │ chat:academy-bmr:user002 │
│ ghi789          │ chat:academy-xyz:user003 │
└─────────────────┴──────────────────────────┘
```

| 시점 | 동작 |
|------|------|
| `join` 이벤트 | `hSet("io/chat/sid-user", socketId, userRoom)` |
| `disconnect` 이벤트 | `hDel("io/chat/sid-user", socketId)` |

---

## CORS 설정

모든 소켓 서버는 동일한 CORS 정책을 적용합니다.

```javascript
cors: {
  origin: process.env["URL"],  // 허용된 클라이언트 URL
  credentials: true,            // 쿠키/인증 정보 전송 허용
}
```

---

## 에러 처리

모든 네임스페이스에서 `unauthorized event` 오류 발생 시 소켓 연결을 강제로 끊습니다.

```javascript
socket.on("error", (err) => {
  if (err && err.message === "unauthorized event") {
    socket.disconnect();
  }
});
```

---

## 소스 파일 참조

| 파일 | 설명 |
|------|------|
| `backend/src/utils/webSocket.js` | Socket.io 서버 초기화 및 이벤트 핸들러 |
| `backend/src/services/notifications.js` | 알림 생성 시 소켓으로 전송하는 서비스 |
| `backend/src/controllers/enrollments.js` | 수강신청 대기열 관리 함수 |
| `backend/src/controllers/chats.js` | 채팅 관련 REST API + 소켓 이벤트 발송 |
| `backend/src/_database/redis/index.js` | Redis 연결 설정 |

---

## 다음 단계

- [파일 저장소](file-storage.md) - 채팅 파일 업로드를 포함한 파일 관리 체계
- [인증 및 권한](authentication.md) - 소켓 연결에 필요한 인증 체계
