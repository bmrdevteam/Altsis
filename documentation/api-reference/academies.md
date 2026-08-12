# 아카데미 API

아카데미는 Altsis 시스템의 최상위 단위입니다. 각 아카데미는 독립된 데이터베이스를 가지며, 아카데미 내에 학교, 사용자, 학기 등이 구성됩니다.

> **라우트 파일**: `backend/src/routes/academies.js`
> **컨트롤러 파일**: `backend/src/controllers/academies.js`
> **모델 파일**: `backend/src/models/Academy.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/academies` | 아카데미 생성 | `owner` |
| `GET` | `/api/academies` | 아카데미 목록/상세 조회 | 인증 불요(단일) / `owner`\|`admin`(목록) |
| `PUT` | `/api/academies/:academyId/activate` | 아카데미 활성화 | `owner` |
| `PUT` | `/api/academies/:academyId/inactivate` | 아카데미 비활성화 | `owner` |
| `PUT` | `/api/academies/:academyId/email` | 이메일 변경 | `owner` |
| `PUT` | `/api/academies/:academyId/tel` | 전화번호 변경 | `owner` |
| `PUT` | `/api/academies/:academyId/chat` | 채팅 설정 | `owner` |
| `PUT` | `/api/academies/:academyId/ai` | AI 활성화/비활성화 | `owner` |
| `PUT` | `/api/academies/:academyId/ai/apikey` | AI API 키 설정 | `owner` |
| `GET` | `/api/academies/:academyId/ai/apikey` | AI API 키 존재 확인 | `owner` |
| `PUT` | `/api/academies/:academyId/ai/model` | AI 모델 설정 | `owner` |
| `POST` | `/api/academies/:academyId/backup` | 백업 생성 | `owner`\|`admin`\|`manager` |
| `GET` | `/api/academies/:academyId/backup` | 백업 목록/상세 조회 | `owner`\|`admin`\|`manager` |
| `PUT` | `/api/academies/:academyId/restore` | 백업 복원 | `owner`\|`admin`\|`manager` |
| `DELETE` | `/api/academies/:academyId/backup` | 백업 삭제 | `owner`\|`admin`\|`manager` |
| `GET` | `/api/academies/:academyId/:docType/:docId?` | 도큐먼트 조회 | `owner`\|`admin` |
| `DELETE` | `/api/academies/:academyId` | 아카데미 삭제 | `owner` |

---

## 아카데미 생성

아카데미와 해당 아카데미의 관리자 계정을 동시에 생성합니다. 아카데미 생성 시 독립적인 데이터베이스(`{academyId}-db`)가 자동으로 생성됩니다.

```
POST /api/academies
```

**권한**: `owner`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `academyId` | `string` | O | 아카데미 고유 ID (영문, 숫자, 하이픈) |
| `academyName` | `string` | O | 아카데미 이름 |
| `adminId` | `string` | O | 관리자 사용자 ID |
| `adminName` | `string` | O | 관리자 이름 |
| `email` | `string` | X | 아카데미 이메일 |
| `tel` | `string` | X | 아카데미 전화번호 |

### 요청 예시

```json
{
  "academyId": "my-academy",
  "academyName": "나의 아카데미",
  "adminId": "admin01",
  "adminName": "관리자",
  "email": "admin@example.com",
  "tel": "02-1234-5678"
}
```

### 응답 (200)

```json
{
  "academy": {
    "_id": "507f1f77bcf86cd799439011",
    "academyId": "my-academy",
    "academyName": "나의 아카데미",
    "email": "admin@example.com",
    "tel": "02-1234-5678",
    "adminId": "admin01",
    "adminName": "관리자",
    "isActivated": true,
    "chatEnabled": false,
    "aiEnabled": false,
    "aiModel": "gemini-3.6-flash",
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  },
  "admin": {
    "userId": "admin01",
    "userName": "관리자",
    "password": "자동생성된비밀번호"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 |
| `400` | `FIELD_INVALID({필드명})` | 필드 값 유효성 검사 실패 |
| `409` | `FIELD_IN_USE(academyId)` | 이미 사용 중인 아카데미 ID |

---

## 아카데미 조회

아카데미를 단일 또는 목록으로 조회합니다.

```
GET /api/academies
```

**권한**: 단일 조회 시 인증 불요 (게스트 접근 가능), 목록 조회 시 `owner` 또는 `admin`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `academyId` | `string` | X | 특정 아카데미 ID로 조회 |

### 단일 조회 응답 (200)

```json
{
  "academy": {
    "_id": "507f1f77bcf86cd799439011",
    "academyId": "my-academy",
    "academyName": "나의 아카데미",
    "isActivated": true,
    "chatEnabled": false,
    "aiEnabled": false,
    "aiModel": "gemini-3.6-flash"
  }
}
```

### 목록 조회 응답 (200)

```json
{
  "academies": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "academyId": "academy-a",
      "academyName": "아카데미 A",
      "isActivated": true
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "academyId": "academy-b",
      "academyName": "아카데미 B",
      "isActivated": false
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(academyID)` | 게스트 접근 시 `academyId` 파라미터 누락 |
| `403` | `PERMISSION_DENIED` | 권한 부족 |
| `404` | `ACADEMY_NOT_FOUND` | 아카데미를 찾을 수 없음 |

---

## 아카데미 활성화/비활성화

아카데미의 활성화 상태를 변경합니다. 비활성화된 아카데미에는 로그인할 수 없습니다.

### 활성화

```
PUT /api/academies/:academyId/activate
```

**권한**: `owner`

### 비활성화

```
PUT /api/academies/:academyId/inactivate
```

**권한**: `owner`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `academyId` | `string` | 아카데미 ID |

### 응답 (200)

```json
{
  "academy": {
    "_id": "507f1f77bcf86cd799439011",
    "academyId": "my-academy",
    "isActivated": true
  }
}
```

---

## 이메일 변경

```
PUT /api/academies/:academyId/email
```

**권한**: `owner`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | `string` | X | 새 이메일 주소 (빈 값이면 삭제) |

### 요청 예시

```json
{
  "email": "new-email@example.com"
}
```

### 응답 (200)

```json
{
  "academy": {
    "_id": "...",
    "email": "new-email@example.com"
  }
}
```

---

## 전화번호 변경

```
PUT /api/academies/:academyId/tel
```

**권한**: `owner`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `tel` | `string` | X | 새 전화번호 (빈 값이면 삭제) |

---

## 채팅 설정

아카데미의 채팅 기능 활성화 상태를 설정합니다.

```
PUT /api/academies/:academyId/chat
```

**권한**: `owner`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `chatEnabled` | `boolean` | X | `true`(활성화) / `false`(비활성화). 미제공 시 토글 |

### 요청 예시

```json
{
  "chatEnabled": true
}
```

### 응답 (200)

```json
{
  "academy": {
    "_id": "...",
    "chatEnabled": true
  }
}
```

---

## AI 설정

### AI 활성화/비활성화

```
PUT /api/academies/:academyId/ai
```

**권한**: `owner`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `aiEnabled` | `boolean` | X | `true`(활성화) / `false`(비활성화). 미제공 시 토글 |

### AI API 키 설정

```
PUT /api/academies/:academyId/ai/apikey
```

**권한**: `owner`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `apiKey` | `string` | O | AI 서비스 API 키 |
| `aiModel` | `string` | X | AI 모델명 |
| `aiProvider` | `string` | X | AI 제공자 (`openai` / `anthropic` / `gemini`) |

#### 응답 (200)

```json
{
  "success": true
}
```

> **참고**: `aiApiKey`는 보안을 위해 API 조회 응답에 포함되지 않습니다 (`select: false`).

### AI API 키 존재 확인

```
GET /api/academies/:academyId/ai/apikey
```

**권한**: `owner`

#### 응답 (200)

```json
{
  "hasApiKey": true,
  "apiKeyHint": "AIza••••••••Kzuw",
  "aiProvider": "gemini",
  "aiModel": "gemini-3.6-flash"
}
```

> **참고**: 전체 API 키는 반환하지 않습니다. `apiKeyHint`는 앞·뒤 일부만 남긴 마스킹 문자열입니다.

### AI 모델 설정

```
PUT /api/academies/:academyId/ai/model
```

**권한**: `owner`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `aiModel` | `string` | O | 사용할 AI 모델명 (예: `gemini-3.6-flash`) |

### AI 사용량 한도 설정

```
PUT /api/academies/:academyId/ai/usage-limits
```

**권한**: `owner`, `admin`, `manager` (`admin`/`manager`는 본인 아카데미만)

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `enabled` | `boolean` | O | 1인 일일 Alt 한도 사용 여부 |
| `dailyUserAlts` | `number` | 조건부 | 1인당 일(UTC) Alt 한도. `1 Alt = 10,000` 토큰. `enabled=true`이면 0보다 커야 함 |

---

## 백업 관리

### 백업 생성

지정한 모델의 도큐먼트를 전체 조회하여 S3에 JSON 파일로 업로드합니다.

```
POST /api/academies/:academyId/backup
```

**권한**: `owner`, `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `models` | `object[]` | O | 백업할 모델 목록 |
| `models[].title` | `string` | O | 모델명 (`users`, `schools`, `seasons`, `registrations`, `syllabuses`, `enrollments`, `forms`, `notifications`, `archives`, `chatRooms`, `chatMessages`) |

#### 요청 예시

```json
{
  "models": [
    { "title": "users" },
    { "title": "schools" },
    { "title": "seasons" },
    { "title": "registrations" }
  ]
}
```

#### 응답 (200)

```json
{
  "logs": [
    "┌ [Backup] my-academy/backup/2024-01-15_09:00:00.000",
    "├ requested by admin01(my-academy)",
    "│┌ backup users...",
    "│├ reading users... 150",
    "│├ writing users...",
    "│└ backup users is done(1234ms)",
    "└ [Backup] my-academy/backup/2024-01-15_09:00:00.000 is done(5678ms)"
  ]
}
```

### 백업 목록 조회

```
GET /api/academies/:academyId/backup
```

**권한**: `owner`, `admin` 또는 `manager`

#### 응답 (200)

```json
{
  "backupList": [
    {
      "title": "2024-01-15_09:00:00.000",
      "key": "my-academy/backup/2024-01-15_09:00:00.000/"
    },
    {
      "title": "2024-01-14_18:30:00.000",
      "key": "my-academy/backup/2024-01-14_18:30:00.000/"
    }
  ]
}
```

### 백업 상세 조회

```
GET /api/academies/:academyId/backup?title={백업제목}
```

**권한**: `owner`, `admin` 또는 `manager`

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `title` | `string` | O | 백업 제목 (타임스탬프) |

#### 응답 (200)

```json
{
  "backup": [
    {
      "title": "users.json",
      "size": 102400,
      "key": "my-academy/backup/2024-01-15_09:00:00.000/users.json",
      "lastModified": "2024-01-15T09:00:05.000Z"
    },
    {
      "title": "schools.json",
      "size": 8192,
      "key": "my-academy/backup/2024-01-15_09:00:00.000/schools.json",
      "lastModified": "2024-01-15T09:00:03.000Z"
    }
  ]
}
```

### 백업 복원

특정 모델의 도큐먼트를 전부 교체하여 복원합니다.

```
PUT /api/academies/:academyId/restore
```

**권한**: `owner`, `admin` 또는 `manager`

> **주의**: 복원 시 해당 모델의 기존 데이터가 모두 삭제된 후 백업 데이터로 대체됩니다.

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `model` | `string` | O | 복원할 모델명 |
| `documents` | `object[]` | O | 복원할 도큐먼트 배열 |

### 백업 삭제

```
DELETE /api/academies/:academyId/backup?title={백업제목}
```

**권한**: `owner`, `admin` 또는 `manager`

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `title` | `string` | O | 삭제할 백업 제목 |

---

## 도큐먼트 조회

아카데미 데이터베이스 내의 임의 컬렉션을 직접 조회합니다. 관리 및 디버깅 용도로 사용됩니다.

```
GET /api/academies/:academyId/:docType/:docId?
```

**권한**: `owner` 또는 `admin`

### 경로 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `academyId` | `string` | O | 아카데미 ID |
| `docType` | `string` | O | 컬렉션 타입 (`users`, `schools`, `seasons` 등) |
| `docId` | `string` | X | 도큐먼트 ObjectId (미제공 시 목록 조회) |

### 목록 조회 응답 (200)

```json
{
  "documents": [
    { "_id": "...", "userId": "user01", "userName": "홍길동" },
    { "_id": "...", "userId": "user02", "userName": "김철수" }
  ]
}
```

### 단일 조회 응답 (200)

```json
{
  "document": {
    "_id": "...",
    "userId": "user01",
    "userName": "홍길동"
  }
}
```

---

## 아카데미 삭제

아카데미 문서와 해당 아카데미의 전체 데이터베이스를 삭제합니다.

```
DELETE /api/academies/:academyId
```

**권한**: `owner`

> **주의**: 이 작업은 되돌릴 수 없습니다. 아카데미에 속한 모든 데이터(사용자, 학교, 학기, 수업 등)가 영구 삭제됩니다.

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `academyId` | `string` | 삭제할 아카데미 ID |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `ACADEMY_NOT_FOUND` | 아카데미를 찾을 수 없음 |

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CAcademy` | POST | `/api/academies` | 아카데미 생성 |
| `RAcademies` | GET | `/api/academies` | 아카데미 목록 조회 |
| `RAcademy` | GET | `/api/academies?academyId=...` | 아카데미 단일 조회 |
| `UActivateAcademy` | PUT | `/api/academies/:academyId/activate` | 활성화 |
| `UInactivateAcademy` | PUT | `/api/academies/:academyId/inactivate` | 비활성화 |
| `UAcademyEmail` | PUT | `/api/academies/:academyId/email` | 이메일 변경 |
| `UAcademyTel` | PUT | `/api/academies/:academyId/tel` | 전화번호 변경 |
| `UAcademyChatEnabled` | PUT | `/api/academies/:academyId/chat` | 채팅 설정 |
| `UAcademyAiEnabled` | PUT | `/api/academies/:academyId/ai` | AI 활성화 설정 |
| `UAcademyAiApiKey` | PUT | `/api/academies/:academyId/ai/apikey` | AI API 키 설정 |
| `RAcademyAiApiKey` | GET | `/api/academies/:academyId/ai/apikey` | AI API 키 확인 |
| `CAcademyBackup` | POST | `/api/academies/:academyId/backup` | 백업 생성 |
| `RAcademyBackup` | GET | `/api/academies/:academyId/backup` | 백업 조회 |
| `URestoreAcademy` | PUT | `/api/academies/:academyId/restore` | 백업 복원 |
| `DAcademyBackup` | DELETE | `/api/academies/:academyId/backup` | 백업 삭제 |
| `DAcademy` | DELETE | `/api/academies/:academyId` | 아카데미 삭제 |
