# 학교 API

학교는 아카데미 내의 교육 기관 단위입니다. 학교 아래에 학기(Season)가 구성되고, 기록 양식(FormArchive)과 외부 링크를 관리할 수 있습니다.

> **라우트 파일**: `backend/src/routes/schools.js`
> **컨트롤러 파일**: `backend/src/controllers/schools.js`
> **모델 파일**: `backend/src/models/School.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/schools` | 학교 생성 | `admin` |
| `GET` | `/api/schools/:_id?` | 학교 조회 (목록/상세) | `isLoggedIn` |
| `PUT` | `/api/schools/:_id/formArchive` | 기록 양식 수정 | `admin`\|`manager` |
| `PUT` | `/api/schools/:_id/links` | 링크 수정 | `admin`\|`manager` |
| `PUT` | `/api/schools/:_id/deletedFormArchive/:label/restore` | 삭제된 양식 복원 | `admin`\|`manager` |
| `DELETE` | `/api/schools/:_id/deletedFormArchive/:label` | 삭제된 양식 영구 삭제 | `admin`\|`manager` |
| `DELETE` | `/api/schools/:_id` | 학교 삭제 | `admin` |

---

## 학교 생성

새로운 학교를 생성합니다.

```
POST /api/schools
```

**권한**: `admin`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `schoolId` | `string` | O | 학교 고유 ID (영문, 숫자) |
| `schoolName` | `string` | O | 학교 이름 |

### 요청 예시

```json
{
  "schoolId": "highschool01",
  "schoolName": "테스트 고등학교"
}
```

### 응답 (200)

```json
{
  "school": {
    "_id": "507f1f77bcf86cd799439011",
    "schoolId": "highschool01",
    "schoolName": "테스트 고등학교",
    "formArchive": [],
    "deletedFormArchive": [],
    "links": [],
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `400` | `FIELD_INVALID(...)` | 유효성 검사 실패 |
| `409` | `FIELD_IN_USE(schoolId)` | 이미 사용 중인 학교 ID |

---

## 학교 조회

학교를 목록 또는 개별로 조회합니다. 경로 파라미터 `_id` 유무에 따라 동작이 달라집니다.

```
GET /api/schools/:_id?
```

**권한**: `isLoggedIn`

### 목록 조회

```
GET /api/schools
```

#### 응답 (200)

```json
{
  "schools": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "schoolId": "highschool01",
      "schoolName": "테스트 고등학교",
      "formArchive": [...],
      "links": [...]
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "schoolId": "middleschool01",
      "schoolName": "테스트 중학교",
      "formArchive": [...],
      "links": [...]
    }
  ]
}
```

### 상세 조회

```
GET /api/schools/507f1f77bcf86cd799439011
```

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학교 ObjectId |

#### 응답 (200)

```json
{
  "school": {
    "_id": "507f1f77bcf86cd799439011",
    "schoolId": "highschool01",
    "schoolName": "테스트 고등학교",
    "formArchive": [
      {
        "label": "인적 사항",
        "dataType": "object",
        "fields": [
          { "label": "이름", "type": "input", "options": [] },
          { "label": "학년", "type": "select", "options": ["1학년", "2학년", "3학년"] }
        ],
        "authTeacher": "viewAndEditStudents",
        "authStudent": "view",
        "authManager": "viewAndEdit"
      },
      {
        "label": "성적 기록",
        "dataType": "array",
        "fields": [
          { "label": "과목", "type": "input", "options": [] },
          { "label": "점수", "type": "input-number", "options": [], "runningTotal": false, "total": true }
        ],
        "authTeacher": "viewAndEditMyStudents",
        "authStudent": "view",
        "authManager": "viewAndEdit"
      }
    ],
    "deletedFormArchive": [],
    "links": [
      { "url": "https://www.example.com", "title": "학교 홈페이지" }
    ]
  }
}
```

---

## 기록 양식 수정

학교의 기록 양식(FormArchive)을 수정합니다. 기록 양식은 학생 기록(Archive)의 구조를 정의합니다.

```
PUT /api/schools/:_id/formArchive
```

**권한**: `admin` 또는 `manager`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학교 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `formArchive` | `object[]` | O | 기록 양식 배열 |

### 기록 양식 항목 구조

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `string` | - | 양식 이름 (예: "인적 사항", "성적 기록") |
| `dataType` | `string` | `"array"` | 데이터 타입 (`"array"`: 행 배열, `"object"`: 단일 객체) |
| `fields` | `object[]` | - | 필드 정의 배열 |
| `authTeacher` | `string` | `"undefined"` | 교사 권한 |
| `authStudent` | `string` | `"undefined"` | 학생 권한 |
| `authManager` | `string` | `"undefined"` | 운영자 권한 |

### 필드 정의 구조

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `string` | - | 필드 이름 |
| `type` | `string` | `"input"` | 필드 타입 (`input`, `input-number`, `select`, `file`, `file-image`) |
| `options` | `string[]` | `[]` | 선택지 (`type`이 `select`인 경우) |
| `runningTotal` | `boolean` | `false` | 누적 합계 표시 여부 |
| `total` | `boolean` | `false` | 합계 표시 여부 |

### 권한 옵션

**교사 권한 (`authTeacher`)**:

| 값 | 설명 |
|----|------|
| `"undefined"` | 권한 없음 |
| `"viewAndEditStudents"` | 모든 학생 열람 및 수정 |
| `"viewAndEditMyStudents"` | 담당 학생만 열람 및 수정 |

**학생 권한 (`authStudent`)**:

| 값 | 설명 |
|----|------|
| `"undefined"` | 권한 없음 |
| `"view"` | 본인 기록 열람만 가능 |
| `"viewAndEdit"` | 본인 기록 열람 및 수정 가능 |

**운영자 권한 (`authManager`)**:

| 값 | 설명 |
|----|------|
| `"undefined"` | 권한 없음 |
| `"viewAndEdit"` | 모든 학생 열람 및 수정 |

### 요청 예시

```json
{
  "formArchive": [
    {
      "label": "인적 사항",
      "dataType": "object",
      "fields": [
        { "label": "이름", "type": "input" },
        { "label": "생년월일", "type": "input" },
        { "label": "학년", "type": "select", "options": ["1학년", "2학년", "3학년"] }
      ],
      "authTeacher": "viewAndEditStudents",
      "authStudent": "view",
      "authManager": "viewAndEdit"
    }
  ]
}
```

---

## 링크 수정

학교에 연관된 외부 링크 목록을 수정합니다.

```
PUT /api/schools/:_id/links
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `links` | `object[]` | O | 링크 배열 |
| `links[].url` | `string` | O | URL (예: `https://www.example.com`) |
| `links[].title` | `string` | O | 링크 제목 (예: "학교 홈페이지") |

### 요청 예시

```json
{
  "links": [
    { "url": "https://www.school.ac.kr", "title": "학교 홈페이지" },
    { "url": "https://lms.school.ac.kr", "title": "학습관리시스템" }
  ]
}
```

---

## 삭제된 기록 양식 관리

기록 양식을 삭제하면 휴지통(`deletedFormArchive`)으로 이동합니다. 휴지통에서 복원하거나 영구 삭제할 수 있습니다.

### 삭제된 양식 복원

```
PUT /api/schools/:_id/deletedFormArchive/:label/restore
```

**권한**: `admin` 또는 `manager`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학교 ObjectId |
| `label` | `string` | 복원할 양식의 라벨 |

### 삭제된 양식 영구 삭제

```
DELETE /api/schools/:_id/deletedFormArchive/:label
```

**권한**: `admin` 또는 `manager`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학교 ObjectId |
| `label` | `string` | 영구 삭제할 양식의 라벨 |

---

## 학교 삭제

학교를 삭제합니다.

```
DELETE /api/schools/:_id
```

**권한**: `admin`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 삭제할 학교 ObjectId |

#### 응답 (200)

```json
{}
```

> **주의**: 학교 삭제 시 해당 학교에 연결된 학기, 수업, 등록 정보 등의 참조가 끊어질 수 있습니다.

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CSchool` | POST | `/api/schools` | 학교 생성 |
| `RSchools` | GET | `/api/schools` | 학교 목록 조회 |
| `RSchool` | GET | `/api/schools/:_id` | 학교 상세 조회 |
| `USchoolFormArchive` | PUT | `/api/schools/:_id/formArchive` | 기록 양식 수정 |
| `USchoolLinks` | PUT | `/api/schools/:_id/links` | 링크 수정 |
| `URestoreFormArchive` | PUT | `/api/schools/:_id/deletedFormArchive/:label/restore` | 양식 복원 |
| `DFormArchive` | DELETE | `/api/schools/:_id/deletedFormArchive/:label` | 양식 영구 삭제 |
| `DSchool` | DELETE | `/api/schools/:_id` | 학교 삭제 |
