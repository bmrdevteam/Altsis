# 사용자 API

사용자 인증(로그인/로그아웃) 및 사용자 계정 관리를 담당하는 API입니다. 사용자는 아카데미 내에서 `owner`, `admin`, `manager`, `member` 등급으로 구분됩니다.

> **라우트 파일**: `backend/src/routes/users.js`
> **컨트롤러 파일**: `backend/src/controllers/users.js`
> **모델 파일**: `backend/src/models/User.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/users/login/local` | 로컬 로그인 | 비인증 |
| `POST` | `/api/users/login/google` | Google 로그인 | 비인증 |
| `GET` | `/api/users/logout` | 로그아웃 | `isLoggedIn` |
| `POST` | `/api/users` | 사용자 생성 | `owner`\|`admin` |
| `GET` | `/api/users` | 사용자 목록 조회 | `isLoggedIn` |
| `GET` | `/api/users/current` | 현재 사용자 정보 | `isLoggedIn` |
| `GET` | `/api/users/:_id` | 사용자 상세 조회 | `isLoggedIn` |
| `GET` | `/api/users/:_id/profile` | 프로필 조회 | `isLoggedIn` |
| `PUT` | `/api/users/profile` | 프로필 수정 | `isLoggedIn` |
| `PUT` | `/api/users/:_id/password` | 비밀번호 변경 | `isLoggedIn` |
| `PUT` | `/api/users/:_id/email` | 이메일 변경 | `isLoggedIn` |
| `PUT` | `/api/users/:_id/tel` | 전화번호 변경 | `isLoggedIn` |
| `PUT` | `/api/users/:_id/userName` | 사용자 이름 변경 | `isLoggedIn` |
| `PUT` | `/api/users/:_id/auth` | 권한 등급 변경 | `owner`\|`admin` |
| `PUT` | `/api/users/:_id/google` | Google 계정 연결 | `admin` |
| `DELETE` | `/api/users/:_id/google` | Google 계정 해제 | `admin` |
| `POST` | `/api/users/:_id/schools` | 학교 등록 | `admin` |
| `DELETE` | `/api/users/:_id/schools` | 학교 등록 해제 | `admin` |
| `DELETE` | `/api/users/:_id` | 사용자 삭제 | `admin` |

---

## 인증

### 로컬 로그인

아카데미 ID, 사용자 ID, 비밀번호를 사용하여 로그인합니다.

```
POST /api/users/login/local
```

**권한**: 비인증 (로그인 상태이면 강제 로그아웃 후 진행)

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `academyId` | `string` | O | 아카데미 ID |
| `userId` | `string` | O | 사용자 ID |
| `password` | `string` | O | 비밀번호 |

#### 요청 예시

```json
{
  "academyId": "my-academy",
  "userId": "user01",
  "password": "mypassword123"
}
```

#### 응답 (200)

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user01",
    "userName": "홍길동",
    "auth": "member",
    "email": "user01@example.com",
    "tel": "010-1234-5678",
    "academyId": "my-academy",
    "academyName": "나의 아카데미",
    "schools": [
      {
        "school": "507f1f77bcf86cd799439012",
        "schoolId": "school01",
        "schoolName": "테스트 학교"
      }
    ],
    "snsId": {},
    "profile": "/uploads/profiles/user01.jpg"
  }
}
```

#### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `401` | `LOGIN_FAILED` | 로그인 실패 (ID 또는 비밀번호 불일치) |
| `403` | `ACADEMY_INACTIVATED` | 비활성화된 아카데미 |

---

### Google 로그인

Google OAuth를 통해 로그인합니다. 사전에 사용자 계정에 Google 계정이 연결되어 있어야 합니다.

```
POST /api/users/login/google
```

**권한**: 비인증

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `academyId` | `string` | O | 아카데미 ID |
| `credential` | `string` | O | Google OAuth 인증 토큰 |

---

### 로그아웃

현재 세션을 종료합니다.

```
GET /api/users/logout
```

**권한**: `isLoggedIn`

#### 응답 (200)

```json
{}
```

---

## 현재 사용자 정보 (RMySelf)

로그인된 현재 사용자의 정보를 조회합니다. 세션에서 사용자를 식별합니다.

```
GET /api/users/current
```

**권한**: `isLoggedIn`

#### 응답 (200)

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user01",
    "userName": "홍길동",
    "auth": "member",
    "email": "user01@example.com",
    "tel": "010-1234-5678",
    "academyId": "my-academy",
    "academyName": "나의 아카데미",
    "schools": [
      {
        "school": "507f1f77bcf86cd799439012",
        "schoolId": "school01",
        "schoolName": "테스트 학교"
      }
    ],
    "snsId": {
      "google": "user01@gmail.com"
    },
    "profile": "/uploads/profiles/user01.jpg"
  }
}
```

---

## 사용자 생성

새로운 사용자 계정을 생성합니다. 비밀번호는 자동 생성되어 응답에 포함됩니다.

```
POST /api/users
```

**권한**: `owner` 또는 `admin`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | O | 사용자 고유 ID |
| `userName` | `string` | O | 사용자 이름 |
| `auth` | `string` | X | 권한 등급 (`admin`, `manager`, `member`). 기본값: `member` |
| `email` | `string` | X | 이메일 |
| `tel` | `string` | X | 전화번호 |
| `schools` | `object[]` | X | 등록할 학교 목록 |

#### 요청 예시

```json
{
  "userId": "newuser01",
  "userName": "김신입",
  "auth": "member",
  "email": "newuser@example.com"
}
```

#### 응답 (200)

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439013",
    "userId": "newuser01",
    "userName": "김신입",
    "auth": "member",
    "password": "자동생성된비밀번호",
    "academyId": "my-academy",
    "academyName": "나의 아카데미"
  }
}
```

#### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `400` | `FIELD_INVALID(...)` | 유효성 검사 실패 |
| `409` | `FIELD_IN_USE(userId)` | 이미 사용 중인 사용자 ID |

---

## 사용자 목록 조회

아카데미 내의 사용자 목록을 조회합니다.

```
GET /api/users
```

**권한**: `isLoggedIn`

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `userId` | `string` | X | 사용자 ID로 필터링 |
| `userName` | `string` | X | 사용자 이름으로 필터링 |
| `auth` | `string` | X | 권한 등급으로 필터링 |

#### 응답 (200)

```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "user01",
      "userName": "홍길동",
      "auth": "member",
      "email": "user01@example.com",
      "schools": [
        {
          "school": "507f1f77bcf86cd799439012",
          "schoolId": "school01",
          "schoolName": "테스트 학교"
        }
      ]
    }
  ]
}
```

> **참고**: `password` 필드는 스키마 레벨에서 `select: false`로 설정되어 있어 조회 응답에 포함되지 않습니다.

---

## 사용자 상세 조회

특정 사용자의 상세 정보를 조회합니다.

```
GET /api/users/:_id
```

**권한**: `isLoggedIn`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 사용자 ObjectId |

#### 응답 (200)

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user01",
    "userName": "홍길동",
    "auth": "member",
    "email": "user01@example.com",
    "tel": "010-1234-5678",
    "schools": [...],
    "snsId": { "google": "user01@gmail.com" },
    "profile": "/uploads/profiles/user01.jpg"
  }
}
```

---

## 프로필 조회

```
GET /api/users/:_id/profile
```

**권한**: `isLoggedIn`

---

## 프로필 수정

현재 로그인된 사용자의 프로필(사진)을 수정합니다.

```
PUT /api/users/profile
```

**권한**: `isLoggedIn`

---

## 비밀번호 변경

사용자의 비밀번호를 변경합니다. 본인 또는 관리자가 변경할 수 있습니다.

```
PUT /api/users/:_id/password
```

**권한**: `isLoggedIn`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 사용자 ObjectId |

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `password` | `string` | O | 현재 비밀번호 (본인 변경 시) |
| `newPassword` | `string` | O | 새 비밀번호 |

#### 요청 예시

```json
{
  "password": "현재비밀번호",
  "newPassword": "새비밀번호123"
}
```

#### 응답 (200)

```json
{}
```

#### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `401` | `PASSWORD_INCORRECT` | 현재 비밀번호 불일치 |

> **참고**: 비밀번호는 `bcrypt`로 해시화되어 저장됩니다. API 응답에 평문 비밀번호가 포함되지 않습니다.

---

## 이메일 변경

```
PUT /api/users/:_id/email
```

**권한**: `isLoggedIn`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | `string` | X | 새 이메일 주소 |

---

## 전화번호 변경

```
PUT /api/users/:_id/tel
```

**권한**: `isLoggedIn`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `tel` | `string` | X | 새 전화번호 |

---

## 사용자 이름 변경

```
PUT /api/users/:_id/userName
```

**권한**: `isLoggedIn`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userName` | `string` | O | 새 사용자 이름 |

---

## 권한 등급 변경

사용자의 권한 등급을 변경합니다.

```
PUT /api/users/:_id/auth
```

**권한**: `owner` 또는 `admin`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `auth` | `string` | O | 새 권한 등급 (`admin`, `manager`, `member`) |

#### 요청 예시

```json
{
  "auth": "manager"
}
```

---

## Google 계정 관리

### Google 계정 연결

사용자 계정에 Google 이메일을 연결하여 Google 로그인을 활성화합니다.

```
PUT /api/users/:_id/google
```

**권한**: `admin`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | `string` | O | 연결할 Google 이메일 |

### Google 계정 연결 해제

```
DELETE /api/users/:_id/google
```

**권한**: `admin`

---

## 학교 등록/해제

### 학교 등록

사용자를 특정 학교에 등록합니다.

```
POST /api/users/:_id/schools
```

**권한**: `admin`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `school` | `string` | O | 학교 ObjectId |
| `schoolId` | `string` | O | 학교 ID |
| `schoolName` | `string` | O | 학교 이름 |

### 학교 등록 해제

```
DELETE /api/users/:_id/schools
```

**권한**: `admin`

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `school` | `string` | O | 해제할 학교 ObjectId |

---

## 사용자 삭제

사용자 계정을 삭제합니다.

```
DELETE /api/users/:_id
```

**권한**: `admin`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 삭제할 사용자 ObjectId |

#### 응답 (200)

```json
{}
```

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `LoginLocal` | POST | `/api/users/login/local` | 로컬 로그인 |
| `LoginGoogle` | POST | `/api/users/login/google` | Google 로그인 |
| `Logout` | GET | `/api/users/logout` | 로그아웃 |
| `RMySelf` | GET | `/api/users/current` | 현재 사용자 정보 |
| `CUser` | POST | `/api/users` | 사용자 생성 |
| `RUsers` | GET | `/api/users` | 사용자 목록 |
| `RUser` | GET | `/api/users/:_id` | 사용자 상세 |
| `RUserProfile` | GET | `/api/users/:_id/profile` | 프로필 조회 |
| `UUserProfile` | PUT | `/api/users/profile` | 프로필 수정 |
| `UPassword` | PUT | `/api/users/:_id/password` | 비밀번호 변경 |
| `UEmail` | PUT | `/api/users/:_id/email` | 이메일 변경 |
| `UTel` | PUT | `/api/users/:_id/tel` | 전화번호 변경 |
| `UUserName` | PUT | `/api/users/:_id/userName` | 이름 변경 |
| `UAuth` | PUT | `/api/users/:_id/auth` | 권한 변경 |
| `UConnectGoogle` | PUT | `/api/users/:_id/google` | Google 연결 |
| `DDisconnectGoogle` | DELETE | `/api/users/:_id/google` | Google 해제 |
| `CUserSchool` | POST | `/api/users/:_id/schools` | 학교 등록 |
| `DUserSchool` | DELETE | `/api/users/:_id/schools` | 학교 해제 |
| `DUser` | DELETE | `/api/users/:_id` | 사용자 삭제 |
