# 학기 등록 API

학기 등록(Registration)은 사용자를 학기에 등록하는 기능입니다. 각 등록에는 역할(교사/학생), 학년, 반, 담당 교사 정보가 포함됩니다.

> **라우트 파일**: `backend/src/routes/registrations.js`
> **컨트롤러 파일**: `backend/src/controllers/registrations.js`
> **모델 파일**: `backend/src/models/Registration.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/registrations` | 학기 등록 생성 | `admin`\|`manager` |
| `POST` | `/api/registrations/copy` | 학기 등록 복사 | `admin`\|`manager` |
| `GET` | `/api/registrations` | 학기 등록 목록 조회 | 로그인 사용자 |
| `GET` | `/api/registrations/:_id` | 학기 등록 상세 조회 | 로그인 사용자 |
| `PUT` | `/api/registrations/:_id` | 학기 등록 수정 | `admin`\|`manager` |
| `DELETE` | `/api/registrations/:_id` | 학기 등록 삭제 | `admin`\|`manager` |

---

## 학기 등록 생성

사용자를 특정 학기에 등록합니다. 등록 시 학기(season)와 사용자(user) 정보를 기반으로 학교, 학년도, 학기 등의 정보가 자동으로 설정됩니다.

```
POST /api/registrations
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `string` | O | 학기 ObjectId |
| `user` | `string` | O | 사용자 ObjectId |
| `role` | `string` | O | 역할 (`"teacher"` 또는 `"student"`) |
| `grade` | `string` | X | 학년 |
| `group` | `string` | X | 반 |
| `teacher` | `string` | X | 담당 교사 ObjectId |
| `subTeacher` | `string` | X | 부담당 교사 ObjectId |

### 요청 예시

```json
{
  "season": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439022",
  "role": "student",
  "grade": "1",
  "group": "A",
  "teacher": "507f1f77bcf86cd799439033"
}
```

### 응답 (200)

```json
{
  "registration": {
    "_id": "507f1f77bcf86cd799439044",
    "season": "507f1f77bcf86cd799439011",
    "school": "507f1f77bcf86cd799439055",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "year": "2024학년도",
    "term": "1학기",
    "period": {
      "start": "2024-03-01",
      "end": "2024-08-31"
    },
    "user": "507f1f77bcf86cd799439022",
    "userId": "student01",
    "userName": "홍길동",
    "role": "student",
    "grade": "1",
    "group": "A",
    "teacher": "507f1f77bcf86cd799439033",
    "teacherId": "teacher01",
    "teacherName": "김교사",
    "isActivated": true,
    "memos": [],
    "permissionSyllabusV2": false,
    "permissionEnrollmentV2": false,
    "permissionEvaluationV2": false,
    "formEvaluation": []
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`season`, `user`, `role`) |
| `400` | `FIELD_INVALID({필드명})` | ObjectId 형식이 올바르지 않음 (`season`, `user`, `teacher`, `subTeacher`) |
| `404` | `__NOT_FOUND(season)` | 학기를 찾을 수 없음 |
| `404` | `__NOT_FOUND(user)` | 사용자를 찾을 수 없음 |
| `404` | `__NOT_FOUND(teacher)` | 담당 교사의 학기 등록 정보를 찾을 수 없음 |
| `404` | `__NOT_FOUND(subTeacher)` | 부담당 교사의 학기 등록 정보를 찾을 수 없음 |
| `409` | `REGISTRATION_IN_USE` | 해당 학기에 이미 등록된 사용자 |

---

## 학기 등록 복사

기존 학기의 모든 등록 정보를 다른 학기로 복사합니다. 대상 학기에 이미 등록 정보가 존재하면 복사할 수 없습니다.

```
POST /api/registrations/copy
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `fromSeason` | `string` | O | 복사 원본 학기 ObjectId |
| `toSeason` | `string` | O | 복사 대상 학기 ObjectId |

### 요청 예시

```json
{
  "fromSeason": "507f1f77bcf86cd799439011",
  "toSeason": "507f1f77bcf86cd799439066"
}
```

### 응답 (200)

```json
{
  "registerations": [
    {
      "_id": "507f1f77bcf86cd799439077",
      "season": "507f1f77bcf86cd799439066",
      "school": "507f1f77bcf86cd799439055",
      "schoolId": "school-01",
      "schoolName": "테스트 학교",
      "year": "2024학년도",
      "term": "2학기",
      "user": "507f1f77bcf86cd799439022",
      "userId": "student01",
      "userName": "홍길동",
      "role": "student",
      "grade": "1",
      "group": "A",
      "teacher": "507f1f77bcf86cd799439033",
      "teacherId": "teacher01",
      "teacherName": "김교사"
    }
  ]
}
```

> **참고**: 응답 키가 `registerations`(오타)로 반환됩니다. 이는 백엔드 코드의 기존 동작입니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`fromSeason`, `toSeason`) |
| `404` | `__NOT_FOUND(toSeason)` | 대상 학기를 찾을 수 없음 |
| `409` | `REGISTRATION_IN_USE` | 대상 학기에 이미 등록 정보가 존재함 |

---

## 학기 등록 목록 조회

학기 등록 목록을 조회합니다. 쿼리 파라미터를 사용하여 필터링할 수 있습니다.

```
GET /api/registrations
```

**권한**: 로그인 사용자 (`isLoggedIn`)

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `user` | `string` | X | 사용자 ObjectId로 필터링 |
| `school` | `string` | X | 학교 ObjectId로 필터링 |
| `season` | `string` | X | 학기 ObjectId로 필터링 |
| `role` | `string` | X | 역할로 필터링 (`"teacher"` 또는 `"student"`) |

### 응답 (200)

```json
{
  "registrations": [
    {
      "_id": "507f1f77bcf86cd799439044",
      "season": "507f1f77bcf86cd799439011",
      "school": "507f1f77bcf86cd799439055",
      "schoolId": "school-01",
      "schoolName": "테스트 학교",
      "year": "2024학년도",
      "term": "1학기",
      "period": {
        "start": "2024-03-01",
        "end": "2024-08-31"
      },
      "user": "507f1f77bcf86cd799439022",
      "userId": "student01",
      "userName": "홍길동",
      "role": "student",
      "grade": "1",
      "group": "A",
      "teacher": "507f1f77bcf86cd799439033",
      "teacherId": "teacher01",
      "teacherName": "김교사",
      "isActivated": true,
      "memos": [],
      "permissionSyllabusV2": false,
      "permissionEnrollmentV2": false,
      "permissionEvaluationV2": false,
      "formEvaluation": []
    }
  ]
}
```

> **참고**: 프론트엔드(`useAPIv2`)에서는 결과를 `period.end` 내림차순, `role` 오름차순, `grade` 오름차순, `userName` 오름차순, `userId` 오름차순으로 정렬하여 반환합니다.

---

## 학기 등록 상세 조회

특정 학기 등록 정보를 조회합니다.

```
GET /api/registrations/:_id
```

**권한**: 로그인 사용자 (`isLoggedIn`)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 등록 ObjectId |

### 응답 (200)

```json
{
  "registration": {
    "_id": "507f1f77bcf86cd799439044",
    "season": "507f1f77bcf86cd799439011",
    "school": "507f1f77bcf86cd799439055",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "year": "2024학년도",
    "term": "1학기",
    "period": {
      "start": "2024-03-01",
      "end": "2024-08-31"
    },
    "user": "507f1f77bcf86cd799439022",
    "userId": "student01",
    "userName": "홍길동",
    "role": "student",
    "grade": "1",
    "group": "A",
    "teacher": "507f1f77bcf86cd799439033",
    "teacherId": "teacher01",
    "teacherName": "김교사",
    "isActivated": true,
    "memos": [],
    "permissionSyllabusV2": false,
    "permissionEnrollmentV2": false,
    "permissionEvaluationV2": false,
    "formEvaluation": []
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `__NOT_FOUND(registration)` | 등록 정보를 찾을 수 없음 |

---

## 학기 등록 수정

학기 등록 정보의 역할, 학년, 반, 담당 교사를 수정합니다.

```
PUT /api/registrations/:_id
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 등록 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `role` | `string` | O | 역할 (`"teacher"` 또는 `"student"`) |
| `grade` | `string` | X | 학년 |
| `group` | `string` | X | 반 |
| `teacher` | `string` | X | 담당 교사 ObjectId |
| `subTeacher` | `string` | X | 부담당 교사 ObjectId |

### 요청 예시

```json
{
  "role": "student",
  "grade": "2",
  "group": "B",
  "teacher": "507f1f77bcf86cd799439033"
}
```

### 응답 (200)

```json
{
  "registration": {
    "_id": "507f1f77bcf86cd799439044",
    "season": "507f1f77bcf86cd799439011",
    "school": "507f1f77bcf86cd799439055",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "year": "2024학년도",
    "term": "1학기",
    "period": {
      "start": "2024-03-01",
      "end": "2024-08-31"
    },
    "user": "507f1f77bcf86cd799439022",
    "userId": "student01",
    "userName": "홍길동",
    "role": "student",
    "grade": "2",
    "group": "B",
    "teacher": "507f1f77bcf86cd799439033",
    "teacherId": "teacher01",
    "teacherName": "김교사",
    "isActivated": true,
    "memos": [],
    "permissionSyllabusV2": false,
    "permissionEnrollmentV2": false,
    "permissionEvaluationV2": false,
    "formEvaluation": []
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(role)` | `role` 필드 누락 |
| `400` | `FIELD_INVALID(role)` | `role` 값이 `"teacher"` 또는 `"student"`가 아님 |
| `404` | `__NOT_FOUND(teacher)` | 담당 교사를 찾을 수 없음 |
| `404` | `__NOT_FOUND(subTeacher)` | 부담당 교사를 찾을 수 없음 |

---

## 학기 등록 삭제

학기 등록 정보를 삭제합니다. 삭제 시 해당 학기의 권한 예외 목록에서도 사용자가 제거됩니다.

```
DELETE /api/registrations/:_id
```

**권한**: `admin` 또는 `manager`

> **주의**: 등록 삭제 시 관련된 수강 신청(enrollment), 수업 계획(syllabus), 메모(memo) 등의 연관 데이터가 함께 삭제될 수 있습니다.

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 등록 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `__NOT_FOUND(registration)` | 등록 정보를 찾을 수 없음 |

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CRegistration` | POST | `/api/registrations` | 학기 등록 생성 |
| `CCopyRegistrations` | POST | `/api/registrations/copy` | 학기 등록 복사 |
| `RRegistrations` | GET | `/api/registrations` | 학기 등록 목록 조회 |
| `RRegistration` | GET | `/api/registrations/:_id` | 학기 등록 상세 조회 |
| `URegistration` | PUT | `/api/registrations/:_id` | 학기 등록 수정 |
| `DRegistration` | DELETE | `/api/registrations/:_id` | 학기 등록 삭제 |
