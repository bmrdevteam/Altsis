# 게시판 API

게시판(Board), 게시글(Post), 댓글(Comment) API입니다. 학교별 게시판 생성, 게시글 작성/조회, 댓글 관리 기능을 제공합니다.

> **라우트 파일**: `backend/src/routes/boards.js`, `backend/src/routes/posts.js`, `backend/src/routes/comments.js`
> **컨트롤러 파일**: `backend/src/controllers/boards.js`, `backend/src/controllers/posts.js`, `backend/src/controllers/comments.js`
> **모델 파일**: `backend/src/models/Board.js`, `backend/src/models/Post.js`, `backend/src/models/Comment.js`

---

## 엔드포인트 요약

### 게시판 (Board)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/boards` | 게시판 생성 | `admin`\|`manager` |
| `GET` | `/api/boards/:_id` | 게시판 조회 | 로그인 + 읽기 권한 |
| `GET` | `/api/boards?school=` | 게시판 목록 | 로그인 |
| `PUT` | `/api/boards/:_id` | 게시판 수정 | `admin`\|`manager` |
| `PUT` | `/api/boards/:_id/permission/:type` | 권한 수정 | `admin`\|`manager` |
| `POST` | `/api/boards/:_id/permission/:type/exceptions` | 권한 예외 추가 | `admin`\|`manager` |
| `DELETE` | `/api/boards/:_id/permission/:type/exceptions?userId=` | 권한 예외 삭제 | `admin`\|`manager` |
| `DELETE` | `/api/boards/:_id` | 게시판 삭제 | `admin`\|`manager` |

### 게시글 (Post)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/posts` | 게시글 작성 | 로그인 + 쓰기 권한 |
| `GET` | `/api/posts/:_id` | 게시글 조회 | 로그인 + 읽기 권한 |
| `GET` | `/api/posts?board=&limit=&before=` | 게시글 목록 | 로그인 + 읽기 권한 |
| `PUT` | `/api/posts/:_id` | 게시글 수정 | 로그인 (작성자 또는 관리자) |
| `PUT` | `/api/posts/:_id/pin` | 게시글 고정 | `admin`\|`manager` |
| `DELETE` | `/api/posts/:_id` | 게시글 삭제 | 로그인 (작성자 또는 관리자) |

### 댓글 (Comment)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/comments` | 댓글 작성 | 로그인 + 댓글 권한 |
| `GET` | `/api/comments?post=` | 댓글 목록 | 로그인 + 읽기 권한 |
| `PUT` | `/api/comments/:_id` | 댓글 수정 | 로그인 (작성자 또는 관리자) |
| `DELETE` | `/api/comments/:_id` | 댓글 삭제 | 로그인 (작성자 또는 관리자) |

---

## 게시판 생성

게시판을 생성합니다. 게시판 이름을 기반으로 URL 슬러그가 자동 생성되며, 같은 학교 내에서 슬러그가 중복될 수 없습니다.

```
POST /api/boards
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `school` | `string` | O | 학교 `_id` |
| `name` | `string` | O | 게시판 이름 |
| `description` | `string` | X | 게시판 설명 |
| `permissionWrite` | `object` | X | 쓰기 권한 설정 (기본: 관리자+교사) |
| `permissionRead` | `object` | X | 읽기 권한 설정 (기본: 전체) |

### 요청 예시

```json
{
  "school": "507f1f77bcf86cd799439011",
  "name": "자유게시판",
  "description": "자유롭게 글을 작성할 수 있는 게시판입니다.",
  "permissionWrite": {
    "manager": true,
    "teacher": true,
    "student": true,
    "exceptions": []
  },
  "permissionRead": {
    "manager": true,
    "teacher": true,
    "student": true,
    "exceptions": []
  }
}
```

### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439022",
    "school": "507f1f77bcf86cd799439011",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "name": "자유게시판",
    "slug": "자유게시판",
    "description": "자유롭게 글을 작성할 수 있는 게시판입니다.",
    "creator": "507f1f77bcf86cd799439033",
    "creatorId": "admin01",
    "creatorName": "관리자",
    "permissionWrite": {
      "manager": true,
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "permissionRead": {
      "manager": true,
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "permissionComment": {
      "manager": true,
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "isDefault": false,
    "isActive": true,
    "order": 0,
    "postCount": 0,
    "createdAt": "2024-03-15T09:00:00.000Z",
    "updatedAt": "2024-03-15T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`school`, `name`) |
| `404` | `__NOT_FOUND(school)` | 학교를 찾을 수 없음 |
| `409` | `FIELD_IN_USE(board)` | 같은 학교 내 중복 슬러그 |

---

## 게시판 조회

게시판을 단일 또는 목록으로 조회합니다. 목록 조회 시 기본 게시판(공지사항)이 없으면 자동 생성됩니다.

### 단일 조회

```
GET /api/boards/:_id
```

**권한**: 로그인 (`isLoggedIn`) + 읽기 권한 확인

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |

#### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439022",
    "school": "507f1f77bcf86cd799439011",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "name": "공지사항",
    "slug": "announcements",
    "description": "학교 공지사항입니다.",
    "permissionWrite": {
      "manager": true,
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "permissionRead": {
      "manager": true,
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "permissionComment": {
      "manager": true,
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "isDefault": true,
    "isActive": true,
    "order": 0,
    "postCount": 15,
    "createdAt": "2024-01-01T09:00:00.000Z",
    "updatedAt": "2024-03-15T09:00:00.000Z"
  }
}
```

### 목록 조회

```
GET /api/boards?school={school._id}
```

**권한**: 로그인 (`isLoggedIn`)

> **참고**: 해당 학교에 기본 게시판(공지사항)이 없는 경우 자동으로 생성됩니다. 읽기 권한이 있는 게시판만 반환됩니다.

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `school` | `string` | O | 학교 `_id` |

#### 응답 (200)

```json
{
  "boards": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "name": "공지사항",
      "slug": "announcements",
      "description": "학교 공지사항입니다.",
      "isDefault": true,
      "isActive": true,
      "order": 0,
      "postCount": 15,
      "permissionWrite": { "manager": true, "teacher": true, "student": false, "exceptions": [] },
      "permissionRead": { "manager": true, "teacher": true, "student": true, "exceptions": [] },
      "permissionComment": { "manager": true, "teacher": true, "student": true, "exceptions": [] }
    },
    {
      "_id": "507f1f77bcf86cd799439023",
      "name": "자유게시판",
      "slug": "자유게시판",
      "description": "",
      "isDefault": false,
      "isActive": true,
      "order": 1,
      "postCount": 42,
      "permissionWrite": { "manager": true, "teacher": true, "student": true, "exceptions": [] },
      "permissionRead": { "manager": true, "teacher": true, "student": true, "exceptions": [] },
      "permissionComment": { "manager": true, "teacher": true, "student": true, "exceptions": [] }
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(school)` | 목록 조회 시 `school` 파라미터 누락 |
| `403` | `PERMISSION_DENIED` | 읽기 권한 없음 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |
| `404` | `__NOT_FOUND(school)` | 학교를 찾을 수 없음 |

---

## 게시판 수정

게시판의 이름, 설명, 정렬 순서를 수정합니다. 기본 게시판(공지사항)의 이름은 변경할 수 없습니다.

```
PUT /api/boards/:_id
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | `string` | X | 게시판 이름 (기본 게시판은 변경 불가) |
| `description` | `string` | X | 게시판 설명 |
| `order` | `number` | X | 정렬 순서 |

### 요청 예시

```json
{
  "name": "자유게시판",
  "description": "수정된 설명입니다.",
  "order": 2
}
```

### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439023",
    "name": "자유게시판",
    "description": "수정된 설명입니다.",
    "order": 2
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `기본 게시판의 이름은 변경할 수 없습니다.` | 기본 게시판 이름 변경 시도 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시판 권한 수정

게시판의 역할별 권한(읽기/쓰기/댓글)을 수정합니다.

```
PUT /api/boards/:_id/permission/:type
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |
| `type` | `string` | 권한 유형: `read`, `write`, `comment` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `manager` | `boolean` | X | 관리자 권한 |
| `teacher` | `boolean` | X | 교사 권한 |
| `student` | `boolean` | X | 학생 권한 |

### 요청 예시

```json
{
  "manager": true,
  "teacher": true,
  "student": false
}
```

### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439023",
    "permissionWrite": {
      "manager": true,
      "teacher": true,
      "student": false,
      "exceptions": []
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `Invalid permission type` | 잘못된 권한 유형 (`read`, `write`, `comment` 이외의 값) |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시판 권한 예외 추가

특정 사용자에 대한 권한 예외를 추가합니다. 역할 기반 권한과 별도로 개별 사용자를 허용하거나 차단할 수 있습니다. 이미 등록된 사용자의 경우 `isAllowed` 값이 업데이트됩니다.

```
POST /api/boards/:_id/permission/:type/exceptions
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |
| `type` | `string` | 권한 유형: `read`, `write`, `comment` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `user` | `string` | O | 사용자 `_id` |
| `userId` | `string` | O | 사용자 로그인 ID |
| `userName` | `string` | O | 사용자 이름 |
| `isAllowed` | `boolean` | O | 허용 여부 (`true`: 예외 허용, `false`: 예외 차단) |

### 요청 예시

```json
{
  "user": "507f1f77bcf86cd799439044",
  "userId": "student01",
  "userName": "홍길동",
  "isAllowed": true
}
```

### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439023",
    "permissionWrite": {
      "manager": true,
      "teacher": true,
      "student": false,
      "exceptions": [
        {
          "user": "507f1f77bcf86cd799439044",
          "userId": "student01",
          "userName": "홍길동",
          "isAllowed": true
        }
      ]
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`user`, `userId`, `userName`, `isAllowed`) |
| `400` | `Invalid permission type` | 잘못된 권한 유형 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시판 권한 예외 삭제

특정 사용자에 대한 권한 예외를 삭제합니다.

```
DELETE /api/boards/:_id/permission/:type/exceptions?userId={userId}
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |
| `type` | `string` | 권한 유형: `read`, `write`, `comment` |

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `userId` | `string` | O | 삭제할 사용자의 로그인 ID |

### 응답 (200)

```json
{
  "board": {
    "_id": "507f1f77bcf86cd799439023",
    "permissionWrite": {
      "manager": true,
      "teacher": true,
      "student": false,
      "exceptions": []
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(userId)` | `userId` 파라미터 누락 |
| `400` | `Invalid permission type` | 잘못된 권한 유형 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시판 삭제

게시판을 비활성화합니다 (소프트 삭제). 기본 게시판(공지사항)은 삭제할 수 없습니다.

```
DELETE /api/boards/:_id
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시판 `_id` |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `기본 게시판은 삭제할 수 없습니다.` | 기본 게시판 삭제 시도 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

> **참고**: 삭제된 게시판은 `isActive=false`로 설정되며, 게시판 목록 조회 시 반환되지 않습니다.

---

## 게시글 작성

게시글을 작성합니다. 작성 시 대상 사용자에게 자동으로 알림이 발송됩니다 (최대 100명).

```
POST /api/posts
```

**권한**: 로그인 (`isLoggedIn`) + 게시판 쓰기 권한

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `board` | `string` | O | 게시판 `_id` |
| `title` | `string` | O | 제목 |
| `content` | `string` | O | 내용 (Markdown) |
| `category` | `string` | X | 카테고리 |
| `attachments` | `object[]` | X | 첨부파일 목록 |
| `attachments[].url` | `string` | X | 파일 URL |
| `attachments[].fileName` | `string` | X | 파일명 |
| `attachments[].fileSize` | `number` | X | 파일 크기 (bytes) |
| `attachments[].mimeType` | `string` | X | MIME 타입 |
| `attachments[].key` | `string` | X | S3 키 |
| `targetAudience` | `object` | X | 대상 지정 (기본: `{ type: "all" }`) |
| `targetAudience.type` | `string` | X | `all`, `manager`, `teacher`, `student`, `custom` |
| `targetAudience.users` | `object[]` | X | `custom`인 경우 사용자 목록 |
| `targetAudience.grade` | `number` | X | 학년 지정 (옵션) |

### 요청 예시

```json
{
  "board": "507f1f77bcf86cd799439022",
  "title": "3월 학교 행사 안내",
  "content": "## 3월 학교 행사\n\n다음과 같이 행사가 진행됩니다.\n\n- 3/5 입학식\n- 3/15 학부모 상담\n- 3/20 체육대회",
  "category": "행사",
  "attachments": [
    {
      "url": "https://s3.example.com/files/schedule.pdf",
      "fileName": "3월_행사일정.pdf",
      "fileSize": 102400,
      "mimeType": "application/pdf",
      "key": "files/schedule.pdf"
    }
  ],
  "targetAudience": {
    "type": "all"
  }
}
```

### 응답 (200)

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439055",
    "board": "507f1f77bcf86cd799439022",
    "author": "507f1f77bcf86cd799439033",
    "authorId": "admin01",
    "authorName": "관리자",
    "authorProfile": "https://s3.example.com/profiles/admin01.jpg",
    "title": "3월 학교 행사 안내",
    "content": "## 3월 학교 행사\n\n다음과 같이 행사가 진행됩니다.\n\n- 3/5 입학식\n- 3/15 학부모 상담\n- 3/20 체육대회",
    "category": "행사",
    "isPinned": false,
    "isActive": true,
    "viewCount": 0,
    "attachments": [
      {
        "url": "https://s3.example.com/files/schedule.pdf",
        "fileName": "3월_행사일정.pdf",
        "fileSize": 102400,
        "mimeType": "application/pdf",
        "key": "files/schedule.pdf"
      }
    ],
    "targetAudience": {
      "type": "all"
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-01T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`board`, `title`, `content`) |
| `403` | `PERMISSION_DENIED` | 쓰기 권한 없음 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시글 조회

게시글을 단일 또는 목록으로 조회합니다. 단일 조회 시 조회수가 1 증가합니다.

### 단일 조회

```
GET /api/posts/:_id
```

**권한**: 로그인 (`isLoggedIn`) + 읽기 권한 + targetAudience 확인

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시글 `_id` |

#### 응답 (200)

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439055",
    "board": "507f1f77bcf86cd799439022",
    "author": "507f1f77bcf86cd799439033",
    "authorId": "admin01",
    "authorName": "관리자",
    "authorProfile": "https://s3.example.com/profiles/admin01.jpg",
    "title": "3월 학교 행사 안내",
    "content": "## 3월 학교 행사\n\n다음과 같이 행사가 진행됩니다.",
    "category": "행사",
    "isPinned": false,
    "isActive": true,
    "viewCount": 16,
    "attachments": [],
    "targetAudience": { "type": "all" },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-01T09:00:00.000Z"
  },
  "board": {
    "_id": "507f1f77bcf86cd799439022",
    "name": "공지사항",
    "slug": "announcements"
  }
}
```

> **참고**: 게시글을 찾지 못하면 기존 알림(Notification)에서 검색합니다. 레거시 알림으로 조회된 경우 `isLegacyNotification: true` 필드가 포함됩니다.

### 목록 조회

게시글 목록을 커서 기반 페이지네이션으로 조회합니다. 고정된 게시글이 먼저 표시되고, 이후 최신순으로 정렬됩니다.

```
GET /api/posts?board={board._id}&limit={limit}&before={before}
```

**권한**: 로그인 (`isLoggedIn`) + 읽기 권한

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `board` | `string` | O | 게시판 `_id` |
| `limit` | `number` | X | 페이지 크기 (기본: `20`) |
| `before` | `string` | X | 커서 (이전 페이지의 마지막 게시글 `createdAt`, ISO 8601) |

#### 응답 (200)

```json
{
  "posts": [
    {
      "_id": "507f1f77bcf86cd799439066",
      "board": "507f1f77bcf86cd799439022",
      "authorId": "admin01",
      "authorName": "관리자",
      "title": "[중요] 학사일정 변경 안내",
      "category": "공지",
      "isPinned": true,
      "isActive": true,
      "viewCount": 120,
      "targetAudience": { "type": "all" },
      "createdAt": "2024-02-20T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439055",
      "board": "507f1f77bcf86cd799439022",
      "authorId": "teacher01",
      "authorName": "김선생",
      "title": "3월 학교 행사 안내",
      "category": "행사",
      "isPinned": false,
      "isActive": true,
      "viewCount": 15,
      "targetAudience": { "type": "all" },
      "createdAt": "2024-03-01T09:00:00.000Z"
    }
  ],
  "board": {
    "_id": "507f1f77bcf86cd799439022",
    "name": "공지사항"
  }
}
```

> **참고**: 목록 조회 시 `content` 필드는 제외됩니다. 기본 게시판(공지사항)인 경우 기존 알림(Notification)도 함께 반환됩니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(board)` | 목록 조회 시 `board` 파라미터 누락 |
| `403` | `PERMISSION_DENIED` | 읽기 권한 없음 또는 targetAudience 대상 아님 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 게시글 수정

게시글을 수정합니다. 작성자 본인 또는 관리자(`admin`, `manager`)만 수정할 수 있습니다.

```
PUT /api/posts/:_id
```

**권한**: 로그인 (`isLoggedIn`), 작성자 또는 관리자

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시글 `_id` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | X | 제목 |
| `content` | `string` | X | 내용 (Markdown) |
| `category` | `string` | X | 카테고리 |
| `attachments` | `object[]` | X | 첨부파일 목록 |
| `targetAudience` | `object` | X | 대상 지정 |

### 요청 예시

```json
{
  "title": "3월 학교 행사 안내 (수정)",
  "content": "## 3월 학교 행사 (수정)\n\n일정이 변경되었습니다.",
  "category": "행사"
}
```

### 응답 (200)

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439055",
    "title": "3월 학교 행사 안내 (수정)",
    "content": "## 3월 학교 행사 (수정)\n\n일정이 변경되었습니다.",
    "category": "행사",
    "updatedAt": "2024-03-02T10:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 작성자도 아니고 관리자도 아님 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |

---

## 게시글 고정

게시글을 상단에 고정하거나 해제합니다. 고정된 게시글은 목록 조회 시 항상 먼저 표시됩니다.

```
PUT /api/posts/:_id/pin
```

**권한**: `admin` 또는 `manager` (`isAdManager`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시글 `_id` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `isPinned` | `boolean` | O | `true`(고정) / `false`(해제) |

### 요청 예시

```json
{
  "isPinned": true
}
```

### 응답 (200)

```json
{
  "post": {
    "_id": "507f1f77bcf86cd799439055",
    "isPinned": true,
    "updatedAt": "2024-03-02T10:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(isPinned)` | `isPinned` 필드 누락 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |

---

## 게시글 삭제

게시글을 비활성화합니다 (소프트 삭제). 작성자 본인 또는 관리자(`admin`, `manager`)만 삭제할 수 있습니다. 삭제 시 게시판의 `postCount`가 감소합니다.

```
DELETE /api/posts/:_id
```

**권한**: 로그인 (`isLoggedIn`), 작성자 또는 관리자

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 게시글 `_id` |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 작성자도 아니고 관리자도 아님 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |

> **참고**: 레거시 알림(`Notification`)인 경우에는 소프트 삭제가 아닌 실제 삭제(`deleteOne`)가 수행됩니다.

---

## 댓글 작성

게시글에 댓글을 작성합니다. `parentComment`를 지정하면 대댓글(답글)로 작성됩니다. 부모 댓글은 같은 게시글에 속해야 합니다.

```
POST /api/comments
```

**권한**: 로그인 (`isLoggedIn`) + 게시판 댓글 권한

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `post` | `string` | O | 게시글 `_id` |
| `content` | `string` | O | 댓글 내용 |
| `parentComment` | `string` | X | 부모 댓글 `_id` (대댓글인 경우) |

### 요청 예시

```json
{
  "post": "507f1f77bcf86cd799439055",
  "content": "행사 일정 확인했습니다. 감사합니다!"
}
```

### 대댓글 요청 예시

```json
{
  "post": "507f1f77bcf86cd799439055",
  "content": "저도 참석하겠습니다.",
  "parentComment": "507f1f77bcf86cd799439077"
}
```

### 응답 (200)

```json
{
  "comment": {
    "_id": "507f1f77bcf86cd799439077",
    "post": "507f1f77bcf86cd799439055",
    "author": "507f1f77bcf86cd799439044",
    "authorId": "teacher01",
    "authorName": "김선생",
    "authorProfile": "https://s3.example.com/profiles/teacher01.jpg",
    "content": "행사 일정 확인했습니다. 감사합니다!",
    "parentComment": null,
    "isActive": true,
    "createdAt": "2024-03-01T10:30:00.000Z",
    "updatedAt": "2024-03-01T10:30:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`post`, `content`) |
| `400` | `Parent comment is not in the same post` | 부모 댓글이 다른 게시글에 속함 |
| `403` | `PERMISSION_DENIED` | 댓글 작성 권한 없음 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |
| `404` | `__NOT_FOUND(parentComment)` | 부모 댓글을 찾을 수 없음 |

---

## 댓글 목록 조회

특정 게시글의 댓글 목록을 조회합니다. 작성 시간 오름차순(오래된 순)으로 정렬됩니다.

```
GET /api/comments?post={post._id}
```

**권한**: 로그인 (`isLoggedIn`) + 게시판 읽기 권한

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `post` | `string` | O | 게시글 `_id` |

### 응답 (200)

```json
{
  "comments": [
    {
      "_id": "507f1f77bcf86cd799439077",
      "post": "507f1f77bcf86cd799439055",
      "author": "507f1f77bcf86cd799439044",
      "authorId": "teacher01",
      "authorName": "김선생",
      "authorProfile": "https://s3.example.com/profiles/teacher01.jpg",
      "content": "행사 일정 확인했습니다. 감사합니다!",
      "parentComment": null,
      "isActive": true,
      "createdAt": "2024-03-01T10:30:00.000Z",
      "updatedAt": "2024-03-01T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439078",
      "post": "507f1f77bcf86cd799439055",
      "author": "507f1f77bcf86cd799439045",
      "authorId": "student01",
      "authorName": "홍길동",
      "content": "저도 참석하겠습니다.",
      "parentComment": "507f1f77bcf86cd799439077",
      "isActive": true,
      "createdAt": "2024-03-01T11:00:00.000Z",
      "updatedAt": "2024-03-01T11:00:00.000Z"
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(post)` | `post` 파라미터 누락 |
| `403` | `PERMISSION_DENIED` | 읽기 권한 없음 |
| `404` | `__NOT_FOUND(post)` | 게시글을 찾을 수 없음 |
| `404` | `__NOT_FOUND(board)` | 게시판을 찾을 수 없음 |

---

## 댓글 수정

댓글을 수정합니다. 작성자 본인 또는 관리자(`admin`, `manager`)만 수정할 수 있습니다.

```
PUT /api/comments/:_id
```

**권한**: 로그인 (`isLoggedIn`), 작성자 또는 관리자

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 댓글 `_id` |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `content` | `string` | X | 댓글 내용 |

### 요청 예시

```json
{
  "content": "행사 일정 확인했습니다. 수정된 일정 반영 부탁드립니다."
}
```

### 응답 (200)

```json
{
  "comment": {
    "_id": "507f1f77bcf86cd799439077",
    "content": "행사 일정 확인했습니다. 수정된 일정 반영 부탁드립니다.",
    "updatedAt": "2024-03-01T12:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 작성자도 아니고 관리자도 아님 |
| `404` | `__NOT_FOUND(comment)` | 댓글을 찾을 수 없음 |

---

## 댓글 삭제

댓글을 비활성화합니다 (소프트 삭제). 작성자 본인 또는 관리자(`admin`, `manager`)만 삭제할 수 있습니다.

```
DELETE /api/comments/:_id
```

**권한**: 로그인 (`isLoggedIn`), 작성자 또는 관리자

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 댓글 `_id` |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 작성자도 아니고 관리자도 아님 |
| `404` | `__NOT_FOUND(comment)` | 댓글을 찾을 수 없음 |

---

## 주요 개념

### 권한 시스템

게시판은 역할 기반 권한 시스템을 사용합니다. 각 게시판에 대해 읽기(`read`), 쓰기(`write`), 댓글(`comment`) 권한을 역할별로 설정할 수 있습니다.

| 역할 | 설명 |
|------|------|
| `manager` | 관리자 (학교 매니저) |
| `teacher` | 교사 |
| `student` | 학생 |

- `admin` 권한을 가진 사용자는 모든 게시판에 접근할 수 있습니다.
- `exceptions` 배열을 통해 특정 사용자에 대한 예외를 설정할 수 있습니다 (`isAllowed: true`는 예외 허용, `false`는 예외 차단).

### targetAudience (대상 지정)

게시글 작성 시 열람 대상을 지정할 수 있습니다.

| 타입 | 설명 |
|------|------|
| `all` | 전체 공개 (기본값) |
| `manager` | 관리자만 |
| `teacher` | 교사만 |
| `student` | 학생만 |
| `custom` | 특정 사용자 지정 (`users` 배열 필수) |

### 소프트 삭제

모든 삭제 작업은 소프트 삭제(`isActive=false`)로 처리됩니다. 삭제된 데이터는 목록 조회에서 제외되지만 데이터베이스에는 유지됩니다.

### 기본 게시판 (공지사항)

학교별로 하나의 기본 게시판(공지사항)이 자동 생성됩니다. 기본 게시판은 다음 특성을 갖습니다:
- `isDefault: true`
- 이름 변경 불가
- 삭제 불가
- 기존 알림(Notification)도 게시글로 함께 표시 (레거시 지원)

### 커서 기반 페이지네이션

게시글 목록은 커서 기반 페이지네이션을 사용합니다. `before` 파라미터에 이전 페이지 마지막 게시글의 `createdAt` 값을 전달하면 해당 시점 이전의 게시글을 조회합니다.

---

## 프론트엔드 API 함수 (useAPIv2)

### BoardAPI

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CBoard` | POST | `/api/boards` | 게시판 생성 |
| `RBoards` | GET | `/api/boards?school=` | 게시판 목록 조회 |
| `RBoard` | GET | `/api/boards/:_id` | 게시판 단일 조회 |
| `UBoard` | PUT | `/api/boards/:_id` | 게시판 수정 |
| `UBoardPermission` | PUT | `/api/boards/:_id/permission/:type` | 게시판 권한 수정 |
| `CBoardPermissionException` | POST | `/api/boards/:_id/permission/:type/exceptions` | 권한 예외 추가 |
| `DBoardPermissionException` | DELETE | `/api/boards/:_id/permission/:type/exceptions` | 권한 예외 삭제 |
| `DBoard` | DELETE | `/api/boards/:_id` | 게시판 삭제 |

### PostAPI

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CPost` | POST | `/api/posts` | 게시글 작성 |
| `RPosts` | GET | `/api/posts?board=&limit=&before=` | 게시글 목록 조회 |
| `RPost` | GET | `/api/posts/:_id` | 게시글 단일 조회 |
| `UPost` | PUT | `/api/posts/:_id` | 게시글 수정 |
| `UPostPin` | PUT | `/api/posts/:_id/pin` | 게시글 고정/해제 |
| `DPost` | DELETE | `/api/posts/:_id` | 게시글 삭제 |

### CommentAPI

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CComment` | POST | `/api/comments` | 댓글 작성 |
| `RComments` | GET | `/api/comments?post=` | 댓글 목록 조회 |
| `UComment` | PUT | `/api/comments/:_id` | 댓글 수정 |
| `DComment` | DELETE | `/api/comments/:_id` | 댓글 삭제 |
