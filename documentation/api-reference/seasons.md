# 학기 API

학기(Season)는 학교 내의 교육 기간 단위입니다. 학기에는 기간, 교과목, 강의실, 양식(시간표/강의계획서/평가), 권한 설정, AI 설정 등이 포함됩니다. 학기를 활성화해야 수업 개설 및 수강신청이 가능합니다.

> **라우트 파일**: `backend/src/routes/seasons.js`
> **컨트롤러 파일**: `backend/src/controllers/seasons.js`
> **모델 파일**: `backend/src/models/Season.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/seasons` | 학기 생성 | `admin`\|`manager` |
| `GET` | `/api/seasons/:_id?` | 학기 조회 (목록/상세) | `isLoggedIn` |
| `PUT` | `/api/seasons/:_id/activate` | 학기 활성화 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/inactivate` | 학기 비활성화 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/period` | 기간 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/classrooms` | 강의실 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/subjects` | 교과목 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/form/timetable` | 시간표 양식 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/form/syllabus` | 강의계획서 양식 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/form/evaluation` | 평가 양식 설정 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/ai` | AI 설정 | `admin`\|`manager` |
| `POST` | `/api/seasons/:_id/ai/reference/upload` | AI 참고자료 업로드 | `admin`\|`manager` |
| `GET` | `/api/seasons/:_id/ai/reference/:index/download` | AI 참고자료 다운로드 | `admin`\|`manager` |
| `DELETE` | `/api/seasons/:_id/ai/reference/:index` | AI 참고자료 삭제 | `admin`\|`manager` |
| `PUT` | `/api/seasons/:_id/permission/:type` | 권한 설정 | `admin`\|`manager` |
| `POST` | `/api/seasons/:_id/permission/:type/exceptions` | 권한 예외 추가 | `admin`\|`manager` |
| `DELETE` | `/api/seasons/:_id/permission/:type/exceptions` | 권한 예외 삭제 | `admin`\|`manager` |
| `DELETE` | `/api/seasons/:_id` | 학기 삭제 | `admin`\|`manager` |

---

## 학기 생성

새로운 학기를 생성합니다. 동일 학교 내에서 학년도(`year`)와 학기(`term`)의 조합은 고유해야 합니다.

```
POST /api/seasons
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `school` | `string` | O | 학교 ObjectId |
| `schoolId` | `string` | O | 학교 ID |
| `schoolName` | `string` | O | 학교 이름 |
| `year` | `string` | O | 학년도 (예: "2024학년도") |
| `term` | `string` | O | 학기 (예: "1학기", "2학기") |

### 요청 예시

```json
{
  "school": "507f1f77bcf86cd799439011",
  "schoolId": "highschool01",
  "schoolName": "테스트 고등학교",
  "year": "2024학년도",
  "term": "1학기"
}
```

### 응답 (200)

```json
{
  "season": {
    "_id": "507f1f77bcf86cd799439021",
    "school": "507f1f77bcf86cd799439011",
    "schoolId": "highschool01",
    "schoolName": "테스트 고등학교",
    "year": "2024학년도",
    "term": "1학기",
    "period": { "start": "", "end": "" },
    "classrooms": [],
    "subjects": { "label": [], "data": [] },
    "formTimetable": null,
    "formSyllabus": null,
    "formEvaluation": [],
    "permissionSyllabusV2": { "teacher": false, "student": false, "exceptions": [] },
    "permissionEnrollmentV2": { "teacher": false, "student": false, "exceptions": [] },
    "permissionEvaluationV2": { "teacher": false, "student": false, "exceptions": [] },
    "aiSettings": {
      "enabled": false,
      "permission": { "teacher": false, "student": false },
      "guidelines": "",
      "references": []
    },
    "isActivated": false,
    "isActivatedFirst": false,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `409` | 중복 인덱스 에러 | 동일 학교/학년도/학기 조합이 이미 존재 |

---

## 학기 조회

학기를 목록 또는 개별로 조회합니다.

```
GET /api/seasons/:_id?
```

**권한**: `isLoggedIn`

### 목록 조회

```
GET /api/seasons
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `school` | `string` | X | 학교 ObjectId로 필터링 |
| `year` | `string` | X | 학년도로 필터링 |

#### 응답 (200)

```json
{
  "seasons": [
    {
      "_id": "507f1f77bcf86cd799439021",
      "schoolName": "테스트 고등학교",
      "year": "2024학년도",
      "term": "1학기",
      "isActivated": true,
      "period": { "start": "2024-03-04", "end": "2024-07-19" }
    }
  ]
}
```

### 상세 조회

```
GET /api/seasons/507f1f77bcf86cd799439021
```

#### 응답 (200)

전체 학기 데이터가 반환됩니다 (교과목, 강의실, 양식, 권한 등 포함).

---

## 학기 활성화/비활성화

학기를 활성화하면 수업 개설, 수강신청 등의 기능이 사용 가능해집니다.

### 활성화

```
PUT /api/seasons/:_id/activate
```

**권한**: `admin` 또는 `manager`

### 비활성화

```
PUT /api/seasons/:_id/inactivate
```

**권한**: `admin` 또는 `manager`

### 응답 (200)

```json
{
  "season": {
    "_id": "507f1f77bcf86cd799439021",
    "isActivated": true,
    "isActivatedFirst": true
  }
}
```

> **참고**: 최초 활성화 시 `isActivatedFirst`가 `true`로 설정됩니다. 이 값은 이후 변경되지 않습니다.

---

## 기간 설정

학기의 시작일과 종료일을 설정합니다.

```
PUT /api/seasons/:_id/period
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `period` | `object` | O | 기간 객체 |
| `period.start` | `string` | O | 시작일 (`YYYY-MM-DD` 형식) |
| `period.end` | `string` | O | 종료일 (`YYYY-MM-DD` 형식) |

### 요청 예시

```json
{
  "period": {
    "start": "2024-03-04",
    "end": "2024-07-19"
  }
}
```

---

## 강의실 설정

학기에서 사용할 강의실 목록을 설정합니다.

```
PUT /api/seasons/:_id/classrooms
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `classrooms` | `string[]` | O | 강의실 이름 배열 |

### 요청 예시

```json
{
  "classrooms": ["101호", "102호", "과학실", "음악실", "체육관"]
}
```

---

## 교과목 설정

학기에서 사용할 교과목 체계를 설정합니다. 교과목은 다단계 분류를 지원합니다.

```
PUT /api/seasons/:_id/subjects
```

**권한**: `admin` 또는 `manager`

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `subjects` | `object` | O | 교과목 객체 |
| `subjects.label` | `string[]` | O | 분류 라벨 (예: `["교과", "과목"]`) |
| `subjects.data` | `string[][]` | O | 교과목 데이터 |

### 요청 예시

```json
{
  "subjects": {
    "label": ["교과", "과목"],
    "data": [
      ["국어", "현대문학"],
      ["국어", "고전문학"],
      ["수학", "미적분"],
      ["수학", "확률과통계"],
      ["영어", "영어회화"],
      ["과학", "물리학"],
      ["과학", "화학"]
    ]
  }
}
```

---

## 양식 설정

### 시간표 양식

```
PUT /api/seasons/:_id/form/timetable
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `formTimetable` | `object` | O | 시간표 양식 |
| `formTimetable.title` | `string` | O | 양식 제목 |
| `formTimetable.data` | `object[]` | O | 에디터에 의해 설정된 양식 데이터 |

### 강의계획서 양식

```
PUT /api/seasons/:_id/form/syllabus
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `formSyllabus` | `object` | O | 강의계획서 양식 |
| `formSyllabus.title` | `string` | O | 양식 제목 |
| `formSyllabus.data` | `object[]` | O | 에디터에 의해 설정된 양식 데이터 |

### 평가 양식

학생 평가 항목의 구조를 정의합니다.

```
PUT /api/seasons/:_id/form/evaluation
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `formEvaluation` | `object[]` | O | 평가 항목 배열 |

#### 평가 항목 구조

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `string` | - | 평가 항목명 (예: "멘토평가", "자기평가") |
| `type` | `string` | `"input"` | 입력 타입 (`input`, `input-number`, `select`) |
| `options` | `string[]` | `[]` | 선택지 (`type`이 `select`인 경우) |
| `combineBy` | `string` | `"term"` | 평가 동기화 단위 (`"term"`: 학기별, `"year"`: 학년도별) |
| `authOption` | `string` | `"editByTeacher"` | 권한 옵션 |

#### 평가 권한 옵션 (`authOption`)

| 값 | 설명 |
|----|------|
| `"editByStudent"` | 학생이 직접 입력 |
| `"editByTeacher"` | 교사만 입력 |
| `"editByTeacherAndStudentCanView"` | 교사가 입력하고 학생은 열람만 가능 |

#### 요청 예시

```json
{
  "formEvaluation": [
    {
      "label": "멘토평가",
      "type": "input",
      "authOption": "editByTeacher",
      "combineBy": "term"
    },
    {
      "label": "자기평가",
      "type": "input",
      "authOption": "editByStudent",
      "combineBy": "term"
    },
    {
      "label": "출석등급",
      "type": "select",
      "options": ["A", "B", "C", "D", "F"],
      "authOption": "editByTeacher",
      "combineBy": "term"
    }
  ]
}
```

---

## AI 설정

학기별 AI 기능을 설정합니다.

### AI 설정 수정

```
PUT /api/seasons/:_id/ai
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `aiSettings` | `object` | O | AI 설정 객체 |
| `aiSettings.enabled` | `boolean` | X | AI 활성화 여부 |
| `aiSettings.permission` | `object` | X | AI 사용 권한 |
| `aiSettings.permission.teacher` | `boolean` | X | 교사 AI 사용 허용 |
| `aiSettings.permission.student` | `boolean` | X | 학생 AI 사용 허용 |
| `aiSettings.guidelines` | `string` | X | AI 생성 시 기본 지침 |

### AI 참고자료 업로드

```
POST /api/seasons/:_id/ai/reference/upload
```

**권한**: `admin` 또는 `manager`

### AI 참고자료 다운로드

```
GET /api/seasons/:_id/ai/reference/:index/download
```

**권한**: `admin` 또는 `manager`

### AI 참고자료 삭제

```
DELETE /api/seasons/:_id/ai/reference/:index
```

**권한**: `admin` 또는 `manager`

---

## 권한 설정

학기별 수업 개설, 수강신청, 평가 관련 권한을 설정합니다.

### 권한 설정 수정

```
PUT /api/seasons/:_id/permission/:type
```

**권한**: `admin` 또는 `manager`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학기 ObjectId |
| `type` | `string` | 권한 유형 (`syllabus`, `enrollment`, `evaluation`) |

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `teacher` | `boolean` | X | 교사 역할 허용 여부 |
| `student` | `boolean` | X | 학생 역할 허용 여부 |

#### 요청 예시

```json
{
  "teacher": true,
  "student": false
}
```

#### 권한 유형별 설명

| `type` | 저장 필드 | 설명 |
|--------|-----------|------|
| `syllabus` | `permissionSyllabusV2` | 수업 개설 권한 |
| `enrollment` | `permissionEnrollmentV2` | 수강신청 권한 |
| `evaluation` | `permissionEvaluationV2` | 평가 입력 권한 |

### 권한 예외 추가

특정 사용자에 대한 권한 예외를 추가합니다.

```
POST /api/seasons/:_id/permission/:type/exceptions
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `registration` | `string` | O | 등록 ObjectId |
| `role` | `string` | O | 역할 (`student`, `teacher`) |
| `user` | `string` | O | 사용자 ObjectId |
| `userId` | `string` | O | 사용자 ID |
| `userName` | `string` | O | 사용자 이름 |
| `isAllowed` | `boolean` | O | 허용 여부 |

### 권한 예외 삭제

```
DELETE /api/seasons/:_id/permission/:type/exceptions
```

**권한**: `admin` 또는 `manager`

---

## 학기 삭제

학기를 삭제합니다.

```
DELETE /api/seasons/:_id
```

**권한**: `admin` 또는 `manager`

#### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 삭제할 학기 ObjectId |

#### 응답 (200)

```json
{}
```

> **주의**: 학기 삭제 시 해당 학기에 연결된 등록(Registration), 강의계획서(Syllabus), 수강(Enrollment) 데이터의 참조가 끊어질 수 있습니다.

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CSeason` | POST | `/api/seasons` | 학기 생성 |
| `RSeasons` | GET | `/api/seasons` | 학기 목록 조회 |
| `RSeason` | GET | `/api/seasons/:_id` | 학기 상세 조회 |
| `UActivateSeason` | PUT | `/api/seasons/:_id/activate` | 학기 활성화 |
| `UInactivateSeason` | PUT | `/api/seasons/:_id/inactivate` | 학기 비활성화 |
| `USeasonPeriod` | PUT | `/api/seasons/:_id/period` | 기간 설정 |
| `USeasonClassrooms` | PUT | `/api/seasons/:_id/classrooms` | 강의실 설정 |
| `USeasonSubjects` | PUT | `/api/seasons/:_id/subjects` | 교과목 설정 |
| `USeasonFormTimetable` | PUT | `/api/seasons/:_id/form/timetable` | 시간표 양식 |
| `USeasonFormSyllabus` | PUT | `/api/seasons/:_id/form/syllabus` | 강의계획서 양식 |
| `USeasonFormEvaluation` | PUT | `/api/seasons/:_id/form/evaluation` | 평가 양식 |
| `USeasonAiSettings` | PUT | `/api/seasons/:_id/ai` | AI 설정 |
| `USeasonPermission` | PUT | `/api/seasons/:_id/permission/:type` | 권한 설정 |
| `CSeasonPermissionException` | POST | `/api/seasons/:_id/permission/:type/exceptions` | 권한 예외 추가 |
| `DSeasonPermissionException` | DELETE | `/api/seasons/:_id/permission/:type/exceptions` | 권한 예외 삭제 |
| `DSeason` | DELETE | `/api/seasons/:_id` | 학기 삭제 |
