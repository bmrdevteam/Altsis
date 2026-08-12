# API 개요

Altsis 학교 정보 시스템의 백엔드 API 설계 원칙과 공통 사항을 설명합니다.

---

## RESTful API 설계 원칙

Altsis API는 REST 아키텍처 스타일을 따르며, 다음 원칙을 준수합니다:

- **리소스 중심 URL**: URL은 리소스(명사)를 나타내며, HTTP 메서드로 행위를 표현합니다.
- **표준 HTTP 메서드**: `GET`(조회), `POST`(생성), `PUT`(수정), `DELETE`(삭제)를 사용합니다.
- **일관된 응답 형식**: 모든 응답은 JSON 형식입니다.
- **상태 코드 활용**: HTTP 상태 코드로 요청 결과를 나타냅니다.

### 기본 URL 구조

```
/api/{리소스명}
/api/{리소스명}/{리소스ID}
/api/{리소스명}/{리소스ID}/{하위리소스 또는 액션}
```

### 등록된 API 리소스

| 리소스 경로 | 설명 |
|-------------|------|
| `/api/academies` | 아카데미 관리 |
| `/api/users` | 사용자 관리 |
| `/api/schools` | 학교 관리 |
| `/api/seasons` | 학기 관리 |
| `/api/registrations` | 학기 등록 |
| `/api/syllabuses` | 강의계획서 |
| `/api/enrollments` | 수강 관리 |
| `/api/boards` | 보드 (Alt Board) |
| `/api/posts` | 게시글 |
| `/api/comments` | 댓글 |
| `/api/notifications` | 알림 |
| `/api/reminders` | 리마인더 → [reminders.md](./reminders.md) |
| `/api/goals` | 목표/진행 요약 → [goals.md](./goals.md) |
| `/api/calendar-events` | 캘린더 일정 |
| `/api/user-calendars` | 사용자 캘린더 |
| `/api/chats` | 채팅 (DM, 그룹, 보드채팅) |
| `/api/forms` | 양식 |
| `/api/archives` | 기록 |
| `/api/files` | 파일 업로드/다운로드 |
| `/api/ai` | AI / Alter → [ai.md](./ai.md) |
| `/api/theme-settings` | 테마 설정 → [theme-settings.md](./theme-settings.md) |
| `/api/memos` | 등록 시간표 메모 → [calendar.md](./calendar.md#registration-memo-api) |
| `/api/alt-forms` | Alt Form (양식 빌더) |
| `/api/alt-sheet-rows` | Alt Sheet Row (시트 행 데이터) |
| `/api/board-favorites` | 보드 즐겨찾기 |
| `/api/survey-responses` | 설문 응답 |

---

## 인증 (Authentication)

### 세션 기반 인증

Altsis API는 **세션 기반 인증(쿠키)**을 사용합니다. Passport.js를 통해 인증이 처리되며, 세션 정보는 Redis에 저장됩니다.

#### 인증 흐름

```
1. 클라이언트 --> POST /api/users/login/local (아카데미ID, 사용자ID, 비밀번호)
2. 서버: 사용자 검증 --> 세션 생성 --> 세션 쿠키 발급
3. 클라이언트: 이후 모든 요청에 쿠키 자동 포함
4. 서버: 미들웨어에서 세션 쿠키 검증
```

#### 로그인 예시

```http
POST /api/users/login/local
Content-Type: application/json

{
  "academyId": "my-academy",
  "userId": "user01",
  "password": "mypassword"
}
```

**응답 (200)**:
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user01",
    "userName": "홍길동",
    "auth": "member",
    "academyId": "my-academy",
    "academyName": "테스트 아카데미",
    "schools": [
      {
        "school": "507f1f77bcf86cd799439012",
        "schoolId": "school01",
        "schoolName": "테스트 학교"
      }
    ]
  }
}
```

### 인증 미들웨어

모든 API 엔드포인트는 인증 미들웨어를 통해 접근 권한을 제어합니다.

| 미들웨어 | 요구 권한 | 설명 |
|----------|-----------|------|
| `isLoggedIn` | 로그인된 사용자 | 인증 여부만 확인 |
| `isOwner` | `owner` | 최고 관리자만 접근 가능 |
| `isAdmin` | `admin` | 아카데미 관리자만 접근 가능 |
| `isOwAdmin` | `owner` 또는 `admin` | 최고 관리자 또는 아카데미 관리자 |
| `isAdManager` | `admin` 또는 `manager` | 관리자 또는 운영자 |
| `isOwAdManager` | `owner`, `admin` 또는 `manager` | 최고 관리자, 관리자 또는 운영자 |
| `forceNotLoggedIn` | 비인증 | 로그인 상태면 강제 로그아웃 후 진행 |

### 권한 등급 체계

```
owner (최고 관리자)
  |
  +-- admin (아카데미 관리자)
        |
        +-- manager (운영자)
              |
              +-- member (일반 사용자)
```

| 등급 | 코드 | 설명 |
|------|------|------|
| 최고 관리자 | `owner` | 시스템 전체를 관리. 아카데미 생성/삭제 가능 |
| 아카데미 관리자 | `admin` | 특정 아카데미 내 사용자/학교 관리 |
| 운영자 | `manager` | 학기/수업 관리, 게시판 운영 |
| 일반 사용자 | `member` | 수업 참여, 게시글 작성 등 기본 기능 |

---

## 요청/응답 형식

### 요청 형식

모든 요청 본문(body)은 **JSON** 형식입니다.

```http
Content-Type: application/json
```

#### 쿼리 파라미터

목록 조회 시 쿼리 파라미터로 필터링합니다:

```http
GET /api/registrations?season=507f1f77bcf86cd799439011&role=student
```

#### 경로 파라미터

단일 리소스 접근 시 경로 파라미터를 사용합니다:

```http
GET /api/users/507f1f77bcf86cd799439011
GET /api/seasons/507f1f77bcf86cd799439011
```

일부 API는 경로 파라미터 없이 호출하면 목록을 반환하고, 포함하면 단일 리소스를 반환합니다:

```http
GET /api/schools          --> { schools: [...] }   (목록)
GET /api/schools/:_id     --> { school: {...} }    (단일)
```

### 응답 형식

모든 응답은 JSON 형식이며, 리소스명을 키로 사용합니다.

**단일 리소스 응답**:
```json
{
  "academy": {
    "_id": "...",
    "academyId": "my-academy",
    "academyName": "테스트 아카데미"
  }
}
```

**목록 응답**:
```json
{
  "academies": [
    { "_id": "...", "academyId": "academy1", "academyName": "아카데미 1" },
    { "_id": "...", "academyId": "academy2", "academyName": "아카데미 2" }
  ]
}
```

**에러 응답**:
```json
{
  "message": "FIELD_REQUIRED(academyId)"
}
```

---

## 에러 처리

### HTTP 상태 코드

| 상태 코드 | 의미 | 설명 |
|-----------|------|------|
| `200` | 성공 | 요청이 정상적으로 처리됨 |
| `400` | 잘못된 요청 | 필수 필드 누락, 유효성 검사 실패 |
| `401` | 인증 필요 | 로그인되지 않은 상태에서 인증이 필요한 API 호출 |
| `403` | 권한 없음 | 해당 API에 대한 권한이 부족함 |
| `404` | 리소스 없음 | 요청한 리소스를 찾을 수 없음 |
| `409` | 충돌 | 중복된 데이터 (예: 이미 사용 중인 ID) |
| `500` | 서버 오류 | 서버 내부 오류 발생 |

### 에러 메시지 형식

모든 에러 응답은 `message` 필드를 포함합니다:

```json
{
  "message": "PERMISSION_DENIED"
}
```

### 주요 에러 메시지

| 메시지 | 설명 |
|--------|------|
| `PERMISSION_DENIED` | 권한이 거부됨 |
| `FIELD_REQUIRED({필드명})` | 필수 필드가 누락됨 |
| `FIELD_INVALID({필드명})` | 필드 값이 유효하지 않음 |
| `FIELD_IN_USE({필드명})` | 해당 값이 이미 사용 중 |
| `{리소스}_NOT_FOUND` | 리소스를 찾을 수 없음 |

### 유효성 검사

서버는 `validate` 유틸리티를 통해 입력값을 검증합니다. 주요 검증 대상:

| 필드 | 검증 규칙 |
|------|-----------|
| `academyId` | 영문, 숫자, 하이픈 조합 |
| `userId` | 영문, 숫자 조합 |
| `userName` | 한글, 영문 |
| `password` | 최소 길이 요구 |
| `email` | 이메일 형식 |
| `tel` | 전화번호 형식 |
| `schoolId` | 영문, 숫자 조합 |
| `schoolName` | 한글, 영문 |

---

## useAPIv2 프론트엔드 연동

프론트엔드에서는 `useAPIv2` 커스텀 훅을 통해 API를 호출합니다. 이 훅은 axios 기반의 `useDatabase` 훅을 내부적으로 사용하며, 모든 API 함수를 CRUD 접두사 명명 규칙에 따라 제공합니다.

### 기본 사용법

```typescript
import useAPIv2 from "hooks/useAPIv2";

function MyComponent() {
  const {
    CAcademy,    // 아카데미 생성
    RAcademies,  // 아카데미 목록 조회
    UAcademy,    // 아카데미 수정
    DAcademy,    // 아카데미 삭제
  } = useAPIv2();

  // API 호출 예시
  const handleCreate = async () => {
    const { academy, admin } = await CAcademy({
      data: {
        academyId: "new-academy",
        academyName: "새 아카데미",
        adminId: "admin01",
        adminName: "관리자",
      },
    });
  };
}
```

### 명명 규칙

| 접두사 | HTTP 메서드 | 의미 | 예시 |
|--------|-------------|------|------|
| `C` | `POST` | Create (생성) | `CAcademy`, `CUser`, `CSyllabus` |
| `R` | `GET` | Read (조회) | `RAcademies`, `RUser`, `RMySelf` |
| `U` | `PUT` | Update (수정) | `UActivateAcademy`, `UPassword` |
| `D` | `DELETE` | Delete (삭제) | `DAcademy`, `DUser`, `DEnrollment` |

### 내부 구현 패턴

`useAPIv2`는 내부적으로 `useDatabase` 훅의 `C`, `R`, `U`, `D` 메서드를 호출합니다:

```typescript
// useDatabase 훅 메서드
database.C({ location, data })      // POST   /api/{location}
database.R({ location, params })    // GET    /api/{location}?{params}
database.U({ location, data })      // PUT    /api/{location}
database.D({ location, params })    // DELETE /api/{location}?{params}
```

### 에러 처리

프론트엔드에서는 `ALERT_ERROR` 유틸리티를 사용하여 API 에러를 사용자에게 표시합니다:

```typescript
import { ALERT_ERROR } from "hooks/useAPIv2";

try {
  await CAcademy({ data: { ... } });
} catch (err) {
  ALERT_ERROR(err);
  // 서버의 에러 메시지를 한국어로 변환하여 alert() 표시
}
```

에러 메시지 매핑은 `_message.ts` 파일에서 관리됩니다. 서버로부터 전달받은 영문 에러 코드가 한국어 메시지로 변환되어 사용자에게 표시됩니다.

### 쿼리 빌더

`useAPIv2` 내부에서는 `QUERY_BUILDER` 유틸리티를 사용하여 객체를 쿼리 스트링으로 변환합니다:

```typescript
// 입력
QUERY_BUILDER({ season: "abc123", role: "student" })

// 출력
"?season=abc123&role=student&"
```

---

## API 문서 자동 생성

백엔드 소스 코드에는 JSDoc 형식의 주석이 포함되어 있으며, 이를 기반으로 API 문서를 자동 생성할 수 있습니다.

### JSDoc 실행

```bash
cd backend
npm run jsdoc
```

### JSDoc 주석 예시

```javascript
/**
 * @memberof APIs.AcademyAPI
 * @function CAcademy API
 * @description 아카데미 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/academies"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.academyId
 * @param {string} req.body.academyName
 *
 * @param {Object} res
 * @param {TAcademy} res.academy - 생성된 아카데미
 *
 * @throws {}
 * | status | message          | description               |
 * | :----- | :--------------- | :------------------------ |
 * | 409    | ACADEMYID_IN_USE | academyId가 이미 사용 중  |
 */
```

### 네임스페이스 구조

JSDoc 문서는 다음 네임스페이스로 구성됩니다:

- **`Models.*`**: 데이터 모델 (예: `Models.Academy`, `Models.User`)
- **`APIs.*`**: API 컨트롤러 (예: `APIs.AcademyAPI`, `APIs.UserAPI`)

---

## 데이터베이스 구조

Altsis는 **멀티 데이터베이스 아키텍처**를 사용합니다.

### 루트 DB

아카데미 정보를 저장하는 최상위 데이터베이스입니다.

- `Academy` 컬렉션만 포함

### 아카데미 DB

각 아카데미마다 독립적인 데이터베이스가 생성됩니다. 데이터베이스 이름은 `{academyId}-db` 형식입니다.

- `User`, `School`, `Season`, `Registration`, `Syllabus`, `Enrollment` 등 모든 도메인 컬렉션 포함
- 아카데미 간 데이터가 완전히 분리됨

### 암호화

민감한 데이터는 `mongoose-encryption` 플러그인으로 암호화되어 저장됩니다:

| 모델 | 암호화 필드 | 설명 |
|------|-------------|------|
| `Enrollment` | `evaluation` | 학생 평가 데이터 |
| `Archive` | `data` | 학생 기록 데이터 |

비밀번호는 `bcrypt`로 해시화되어 저장됩니다:

| 모델 | 해시 필드 | 설명 |
|------|-----------|------|
| `User` | `password` | 사용자 비밀번호 (API 응답에서 제외) |
