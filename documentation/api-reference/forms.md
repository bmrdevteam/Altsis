# 양식 API

양식(Form) API입니다. 강의계획서, 시간표, 출력물 등의 양식을 관리합니다. 양식의 생성, 복사, 보관, 복원, 열람 권한 설정 기능을 제공합니다.

> **라우트 파일**: `backend/src/routes/forms.js`
> **컨트롤러 파일**: `backend/src/controllers/forms.js`
> **모델 파일**: `backend/src/models/Form.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/forms` | 양식 생성 | `admin`\|`manager` |
| `POST` | `/api/forms/:_id/copy` | 양식 복사 | `admin`\|`manager` |
| `GET` | `/api/forms` | 양식 목록 조회 | `isLoggedIn` |
| `GET` | `/api/forms/:_id` | 양식 상세 조회 | `isLoggedIn` |
| `PUT` | `/api/forms/:_id` | 양식 수정 | `admin`\|`manager` |
| `PUT` | `/api/forms/:_id/archive` | 양식 보관 | `admin`\|`manager` |
| `PUT` | `/api/forms/:_id/restore` | 양식 복원 | `admin`\|`manager` |
| `DELETE` | `/api/forms/:_id` | 양식 삭제 | `admin`\|`manager` |
| `PUT` | `/api/forms/:_id/permission` | 열람 권한 수정 | `admin`\|`manager` |
| `POST` | `/api/forms/:_id/permission/exceptions` | 열람 권한 예외 추가 | `admin`\|`manager` |
| `DELETE` | `/api/forms/:_id/permission/exceptions` | 열람 권한 예외 삭제 | `admin`\|`manager` |

---

## 데이터 모델

### Form

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `_id` | `ObjectId` | 자동생성 | 양식 고유 ID |
| `userId` | `string` | - | 생성자 사용자 ID |
| `userName` | `string` | - | 생성자 이름 |
| `type` | `string` | - | 양식 유형 (`"syllabus"`, `"timetable"`, `"print"`) |
| `title` | `string` | - | 양식 제목 |
| `data` | `object[]` | - | 양식 데이터 (에디터에 의해 설정) |
| `archived` | `boolean` | `false` | 보관 처리 여부 |
| `permissionView` | `object` | `{ teacher: true, student: false, exceptions: [] }` | 열람 권한 설정 |
| `createdAt` | `Date` | 자동생성 | 생성일시 |
| `updatedAt` | `Date` | 자동생성 | 수정일시 |

### permissionView

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `teacher` | `boolean` | `true` | 교사 열람 허용 여부 |
| `student` | `boolean` | `false` | 학생 열람 허용 여부 |
| `exceptions` | `object[]` | `[]` | 사용자별 예외 목록 |

### permissionView.exceptions[]

| 필드 | 타입 | 설명 |
|------|------|------|
| `user` | `ObjectId` | 사용자 `_id` |
| `userId` | `string` | 사용자 ID |
| `userName` | `string` | 사용자 이름 |
| `isAllowed` | `boolean` | 열람 허용 여부 |

### 열람 권한 판정 로직

1. `admin` 또는 `manager`는 항상 열람 가능
2. `permissionView.exceptions`에 해당 사용자가 있으면 `isAllowed` 값 적용
3. 사용자의 역할(`teacher`/`student`)에 대한 `permissionView` 설정값 적용
4. 위 조건에 해당하지 않으면 열람 불가

---

## 양식 생성

새로운 양식을 생성합니다. 동일 유형(`type`) 내에서 제목이 중복되면 409 에러를 반환합니다.

```
POST /api/forms
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `type` | `string` | O | 양식 유형 (`"syllabus"`, `"timetable"`, `"print"`) |
| `title` | `string` | O | 양식 제목 |
| `data` | `object[]` | O | 양식 데이터 배열 |

### 요청 예시

```json
{
  "type": "syllabus",
  "title": "2024학년도 강의계획서",
  "data": [
    {
      "label": "교과목명",
      "type": "input"
    },
    {
      "label": "담당교사",
      "type": "input"
    }
  ]
}
```

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "data": [
      {
        "label": "교과목명",
        "type": "input"
      },
      {
        "label": "담당교사",
        "type": "input"
      }
    ],
    "userId": "admin01",
    "userName": "관리자",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-01T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`title`, `type`, `data`) |
| `409` | `FIELD_IN_USE(title)` | 동일 유형 내 제목 중복 |

---

## 양식 복사

기존 양식을 복사하여 새로운 양식을 생성합니다. 복사된 양식의 제목은 원본 제목에 `"의 사본"`이 추가됩니다.

```
POST /api/forms/:_id/copy
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 복사할 양식의 ObjectId |

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439012",
    "type": "syllabus",
    "title": "2024학년도 강의계획서의 사본",
    "data": [
      {
        "label": "교과목명",
        "type": "input"
      },
      {
        "label": "담당교사",
        "type": "input"
      }
    ],
    "userId": "admin01",
    "userName": "관리자",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `FORM_NOT_FOUND` | 원본 양식을 찾을 수 없음 |

---

## 양식 목록 조회

양식 목록을 조회합니다. `admin`/`manager`는 모든 양식을 조회할 수 있으며, 일반 사용자는 열람 권한(`permissionView`)에 따라 필터링된 결과를 받습니다. 목록 조회 시 `data` 필드는 제외됩니다.

```
GET /api/forms
```

**권한**: `isLoggedIn` (로그인 필요)

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | `string` | X | 양식 유형 필터 (`"syllabus"`, `"timetable"`, `"print"`) |
| `archived` | `string` | X | 보관 여부 필터 (`"true"` 또는 `"false"`) |

### 응답 (200)

```json
{
  "forms": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "syllabus",
      "title": "2024학년도 강의계획서",
      "userId": "admin01",
      "userName": "관리자",
      "archived": false,
      "permissionView": {
        "teacher": true,
        "student": false,
        "exceptions": []
      },
      "createdAt": "2024-03-01T09:00:00.000Z",
      "updatedAt": "2024-03-01T09:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "type": "timetable",
      "title": "주간 시간표",
      "userId": "admin01",
      "userName": "관리자",
      "archived": false,
      "permissionView": {
        "teacher": true,
        "student": true,
        "exceptions": []
      },
      "createdAt": "2024-03-02T09:00:00.000Z",
      "updatedAt": "2024-03-02T09:00:00.000Z"
    }
  ]
}
```

> **참고**: 응답에 `data` 필드가 포함되지 않습니다. 양식 데이터를 조회하려면 양식 상세 조회 API를 사용하세요.

---

## 양식 상세 조회

특정 양식의 전체 정보를 조회합니다. `data` 필드를 포함한 전체 양식 데이터를 반환합니다. `admin`/`manager`는 항상 조회 가능하며, 일반 사용자는 열람 권한에 따라 접근이 제한됩니다.

```
GET /api/forms/:_id
```

**권한**: `isLoggedIn` (로그인 필요)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "data": [
      {
        "label": "교과목명",
        "type": "input"
      },
      {
        "label": "담당교사",
        "type": "input"
      }
    ],
    "userId": "admin01",
    "userName": "관리자",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-01T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 열람 권한 없음 |
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 양식 수정

양식의 제목과 데이터를 수정합니다.

```
PUT /api/forms/:_id
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `title` | `string` | O | 수정할 양식 제목 |
| `data` | `object[]` | O | 수정할 양식 데이터 배열 |

### 요청 예시

```json
{
  "title": "2024학년도 강의계획서 (수정)",
  "data": [
    {
      "label": "교과목명",
      "type": "input"
    },
    {
      "label": "담당교사",
      "type": "input"
    },
    {
      "label": "수업 목표",
      "type": "textarea"
    }
  ]
}
```

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서 (수정)",
    "data": [
      {
        "label": "교과목명",
        "type": "input"
      },
      {
        "label": "담당교사",
        "type": "input"
      },
      {
        "label": "수업 목표",
        "type": "textarea"
      }
    ],
    "userId": "admin01",
    "userName": "관리자",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-05T14:30:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`title`, `data`) |
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 양식 보관

양식을 보관 처리합니다. `archived` 필드를 `true`로 설정하는 소프트 보관 방식입니다.

```
PUT /api/forms/:_id/archive
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "archived": true,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-06-01T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 양식 복원

보관된 양식을 복원합니다. `archived` 필드를 `false`로 설정합니다.

```
PUT /api/forms/:_id/restore
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-06-15T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 양식 삭제

양식을 영구 삭제합니다.

```
DELETE /api/forms/:_id
```

**권한**: `admin` 또는 `manager`

> **주의**: 이 작업은 되돌릴 수 없습니다. 양식 데이터가 영구적으로 삭제됩니다.

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 열람 권한 수정

양식의 역할별 열람 권한을 수정합니다. 기존 예외 목록(`exceptions`)은 유지됩니다.

```
PUT /api/forms/:_id/permission
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `teacher` | `boolean` | X | 교사 열람 허용 여부 |
| `student` | `boolean` | X | 학생 열람 허용 여부 |

### 요청 예시

```json
{
  "teacher": true,
  "student": true
}
```

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": true,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-10T11:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 열람 권한 예외 추가

특정 사용자에 대한 열람 권한 예외를 추가합니다. 이미 등록된 사용자의 예외는 덮어씁니다.

```
POST /api/forms/:_id/permission/exceptions
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `user` | `string` | O | 사용자 `_id` (ObjectId) |
| `userId` | `string` | O | 사용자 ID |
| `userName` | `string` | O | 사용자 이름 |
| `isAllowed` | `boolean` | O | 열람 허용 여부 (`true`: 허용, `false`: 차단) |

### 요청 예시

```json
{
  "user": "507f1f77bcf86cd799439099",
  "userId": "teacher01",
  "userName": "김교사",
  "isAllowed": false
}
```

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": [
        {
          "user": "507f1f77bcf86cd799439099",
          "userId": "teacher01",
          "userName": "김교사",
          "isAllowed": false
        }
      ]
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-10T11:30:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`user`, `userId`, `userName`, `isAllowed`) |
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 열람 권한 예외 삭제

특정 사용자에 대한 열람 권한 예외를 삭제합니다.

```
DELETE /api/forms/:_id/permission/exceptions?userId={userId}
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 양식 ObjectId |

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `userId` | `string` | O | 삭제할 예외의 사용자 ID |

### 응답 (200)

```json
{
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "syllabus",
    "title": "2024학년도 강의계획서",
    "archived": false,
    "permissionView": {
      "teacher": true,
      "student": false,
      "exceptions": []
    },
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-10T12:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(userId)` | `userId` 쿼리 파라미터 누락 |
| `404` | `FORM_NOT_FOUND` | 양식을 찾을 수 없음 |

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CForm` | POST | `/api/forms` | 양식 생성 |
| `CCopyForm` | POST | `/api/forms/:_id/copy` | 양식 복사 |
| `RForms` | GET | `/api/forms` | 양식 목록 조회 |
| `RForm` | GET | `/api/forms/:_id` | 양식 상세 조회 |
| `UForm` | PUT | `/api/forms/:_id` | 양식 수정 |
| `UArchiveForm` | PUT | `/api/forms/:_id/archive` | 양식 보관 |
| `URestoreForm` | PUT | `/api/forms/:_id/restore` | 양식 복원 |
| `DForm` | DELETE | `/api/forms/:_id` | 양식 삭제 |
| `UFormPermission` | PUT | `/api/forms/:_id/permission` | 열람 권한 수정 |
| `CFormPermissionException` | POST | `/api/forms/:_id/permission/exceptions` | 열람 권한 예외 추가 |
| `DFormPermissionException` | DELETE | `/api/forms/:_id/permission/exceptions` | 열람 권한 예외 삭제 |
