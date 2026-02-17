# 수업 API

수업 관련 API는 세 가지 리소스로 구성됩니다:

- **강의계획서(Syllabus)**: 수업 개설 정보 (제목, 시간, 교과목, 멘토 등)
- **수강(Enrollment)**: 학생의 수강신청 및 평가 정보
- **학기 등록(Registration)**: 사용자의 학기별 역할(학생/교사) 등록

이 세 리소스가 유기적으로 연결되어 수업의 전체 생애주기를 관리합니다.

---

## 1. 강의계획서 API (Syllabus)

> **라우트 파일**: `backend/src/routes/syllabuses.js`
> **컨트롤러 파일**: `backend/src/controllers/syllabuses.js`
> **모델 파일**: `backend/src/models/Syllabus.js`

### 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/syllabuses` | 강의계획서 생성 | `isLoggedIn` |
| `GET` | `/api/syllabuses/:_id?` | 강의계획서 조회 (목록/상세) | `isLoggedIn` |
| `POST` | `/api/syllabuses/:_id/confirmed` | 수업 승인 | `isLoggedIn` |
| `DELETE` | `/api/syllabuses/:_id/confirmed` | 수업 승인 취소 | `isLoggedIn` |
| `PUT` | `/api/syllabuses/:_id` | 강의계획서 수정 | `isLoggedIn` |
| `PUT` | `/api/syllabuses/:_id/subject` | 교과목 수정 | `isLoggedIn` |
| `PUT` | `/api/syllabuses/:_id/cover-image` | 커버 이미지 설정 | `isLoggedIn` |
| `DELETE` | `/api/syllabuses/:_id/cover-image` | 커버 이미지 삭제 | `isLoggedIn` |
| `PUT` | `/api/syllabuses/:_id/hide` | 캘린더 숨김 | `isLoggedIn` |
| `PUT` | `/api/syllabuses/:_id/show` | 캘린더 표시 | `isLoggedIn` |
| `DELETE` | `/api/syllabuses/:_id` | 강의계획서 삭제 | `isLoggedIn` |

### 강의계획서 생성

교사(멘토)가 수업을 개설합니다. 학기의 `permissionSyllabusV2` 권한 설정에 따라 개설 가능 여부가 결정됩니다.

```
POST /api/syllabuses
```

**권한**: `isLoggedIn` (학기 권한에 따라 추가 제한)

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `string` | O | 학기 ObjectId |
| `classTitle` | `string` | O | 수업 제목 |
| `time` | `object[]` | X | 수업 시간 배열 |
| `time[].label` | `string` | O | 시간 라벨 (예: "월8") |
| `time[].day` | `string` | O | 요일 (월, 화, 수, 목, 금, 토, 일) |
| `time[].start` | `string` | O | 시작 시간 (예: "10:00") |
| `time[].end` | `string` | O | 종료 시간 (예: "11:00") |
| `classroom` | `string` | X | 강의실 |
| `subject` | `string[]` | X | 교과목 분류 배열 (예: `["수학", "미적분"]`) |
| `point` | `number` | X | 학점 (기본값: 0) |
| `limit` | `number` | X | 수강 정원 (0이면 무제한, 기본값: 0) |
| `teachers` | `object[]` | O | 멘토 목록 (최소 1명) |
| `teachers[]._id` | `string` | O | 교사 ObjectId |
| `teachers[].userId` | `string` | O | 교사 사용자 ID |
| `teachers[].userName` | `string` | O | 교사 이름 |
| `info` | `object` | X | 세부 정보 (에디터 데이터) |

#### 요청 예시

```json
{
  "season": "507f1f77bcf86cd799439021",
  "classTitle": "미적분 기초반",
  "time": [
    { "label": "월3", "day": "월", "start": "10:00", "end": "10:50" },
    { "label": "수3", "day": "수", "start": "10:00", "end": "10:50" }
  ],
  "classroom": "101호",
  "subject": ["수학", "미적분"],
  "point": 2,
  "limit": 30,
  "teachers": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "teacher01",
      "userName": "김교사"
    }
  ]
}
```

#### 응답 (200)

```json
{
  "syllabus": {
    "_id": "507f1f77bcf86cd799439031",
    "season": "507f1f77bcf86cd799439021",
    "school": "507f1f77bcf86cd799439011",
    "schoolId": "highschool01",
    "schoolName": "테스트 고등학교",
    "year": "2024학년도",
    "term": "1학기",
    "user": "507f1f77bcf86cd799439011",
    "userId": "teacher01",
    "userName": "김교사",
    "classTitle": "미적분 기초반",
    "time": [
      { "label": "월3", "day": "월", "start": "10:00", "end": "10:50" },
      { "label": "수3", "day": "수", "start": "10:00", "end": "10:50" }
    ],
    "classroom": "101호",
    "subject": ["수학", "미적분"],
    "point": 2,
    "limit": 30,
    "count": 0,
    "teachers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "teacher01",
        "userName": "김교사",
        "confirmed": false,
        "isHiddenFromCalendar": false
      }
    ]
  }
}
```

> **참고**: `time` 배열은 저장 시 요일+시작시간 순으로 자동 정렬됩니다. 요일 순서: 월(0) ~ 일(6).

### 강의계획서 조회

```
GET /api/syllabuses/:_id?
```

**권한**: `isLoggedIn`

#### 목록 조회 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `season` | `string` | X | 학기 ObjectId로 필터링 |
| `school` | `string` | X | 학교 ObjectId로 필터링 |
| `user` | `string` | X | 개설자 ObjectId로 필터링 |

#### 목록 응답 (200)

```json
{
  "syllabuses": [
    {
      "_id": "...",
      "classTitle": "미적분 기초반",
      "subject": ["수학", "미적분"],
      "time": [...],
      "classroom": "101호",
      "count": 15,
      "limit": 30,
      "teachers": [...]
    }
  ]
}
```

### 수업 승인 / 승인 취소

멘토(교사)가 자신이 포함된 수업을 승인합니다.

#### 승인

```
POST /api/syllabuses/:_id/confirmed
```

#### 승인 취소

```
DELETE /api/syllabuses/:_id/confirmed
```

### 강의계획서 수정

```
PUT /api/syllabuses/:_id
```

**권한**: `isLoggedIn`

#### 요청 본문

생성 시와 동일한 필드를 수정 가능합니다 (`classTitle`, `time`, `classroom`, `subject`, `point`, `limit`, `teachers`, `info` 등).

### 교과목 수정

```
PUT /api/syllabuses/:_id/subject
```

**권한**: `isLoggedIn`

### 커버 이미지

#### 커버 이미지 설정

```
PUT /api/syllabuses/:_id/cover-image
```

#### 커버 이미지 삭제

```
DELETE /api/syllabuses/:_id/cover-image
```

### 캘린더 표시 설정

멘토가 자신의 캘린더에서 해당 수업의 표시 여부를 설정합니다.

#### 캘린더에서 숨기기

```
PUT /api/syllabuses/:_id/hide
```

#### 캘린더에 표시하기

```
PUT /api/syllabuses/:_id/show
```

### 강의계획서 삭제

```
DELETE /api/syllabuses/:_id
```

**권한**: `isLoggedIn`

> **주의**: 수강생이 있는 수업을 삭제하면 해당 수강(Enrollment) 데이터도 함께 삭제됩니다.

---

## 2. 수강 API (Enrollment)

> **라우트 파일**: `backend/src/routes/enrollments.js`
> **컨트롤러 파일**: `backend/src/controllers/enrollments.js`
> **모델 파일**: `backend/src/models/Enrollment.js`

### 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/enrollments` | 수강신청 | `isLoggedIn` |
| `GET` | `/api/enrollments/:_id?` | 수강 조회 (목록/상세) | `isLoggedIn` |
| `GET` | `/api/enrollments/evaluation` | 평가 데이터 조회 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/evaluation` | 평가 입력 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/memo` | 메모 수정 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/hide` | 캘린더 숨김 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/show` | 캘린더 표시 | `isLoggedIn` |
| `DELETE` | `/api/enrollments/:_id` | 수강 취소 | `isLoggedIn` |

### 수강신청

학생이 수업에 수강신청합니다. 학기의 `permissionEnrollmentV2` 권한 설정에 따라 신청 가능 여부가 결정됩니다.

```
POST /api/enrollments
```

**권한**: `isLoggedIn` (학기 권한에 따라 추가 제한)

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `syllabus` | `string` | O | 강의계획서 ObjectId |
| `student` | `string` | O | 학생(사용자) ObjectId |
| `studentId` | `string` | O | 학생 사용자 ID |
| `studentName` | `string` | O | 학생 이름 |

#### 요청 예시

```json
{
  "syllabus": "507f1f77bcf86cd799439031",
  "student": "507f1f77bcf86cd799439041",
  "studentId": "student01",
  "studentName": "이학생"
}
```

#### 응답 (200)

```json
{
  "enrollment": {
    "_id": "507f1f77bcf86cd799439051",
    "syllabus": "507f1f77bcf86cd799439031",
    "season": "507f1f77bcf86cd799439021",
    "school": "507f1f77bcf86cd799439011",
    "year": "2024학년도",
    "term": "1학기",
    "classTitle": "미적분 기초반",
    "time": [...],
    "classroom": "101호",
    "subject": ["수학", "미적분"],
    "teachers": [...],
    "student": "507f1f77bcf86cd799439041",
    "studentId": "student01",
    "studentName": "이학생",
    "studentGrade": "2",
    "memo": "",
    "isHiddenFromCalendar": false
  }
}
```

#### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(...)` | 필수 필드 누락 |
| `409` | 중복 인덱스 에러 | 이미 수강신청한 수업 |
| `409` | `ENROLLMENT_LIMIT_EXCEEDED` | 수강 정원 초과 |
| `409` | `TIME_OVERLAPPED` | 시간표 충돌 |

> **참고**: 수강신청 시 강의계획서의 `count`가 자동으로 1 증가합니다.

### 수강 조회

```
GET /api/enrollments/:_id?
```

**권한**: `isLoggedIn`

#### 목록 조회 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `season` | `string` | X | 학기 ObjectId |
| `syllabus` | `string` | X | 강의계획서 ObjectId |
| `student` | `string` | X | 학생 ObjectId |

#### 목록 응답 (200)

```json
{
  "enrollments": [
    {
      "_id": "...",
      "classTitle": "미적분 기초반",
      "studentId": "student01",
      "studentName": "이학생",
      "time": [...],
      "classroom": "101호"
    }
  ]
}
```

> **참고**: 일반 조회 시 `evaluation` 필드는 암호화되어 있어 응답에 포함되지 않습니다.

### 평가 데이터 조회

수강 목록과 함께 복호화된 평가 데이터를 조회합니다.

```
GET /api/enrollments/evaluation
```

**권한**: `isLoggedIn`

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `syllabus` | `string` | X | 강의계획서 ObjectId |
| `student` | `string` | X | 학생 ObjectId |
| `season` | `string` | X | 학기 ObjectId |

#### 응답 (200)

```json
{
  "enrollments": [
    {
      "_id": "...",
      "classTitle": "미적분 기초반",
      "studentId": "student01",
      "studentName": "이학생",
      "evaluation": {
        "멘토평가": "수업 참여도가 높고 성실합니다.",
        "자기평가": "미적분 개념을 잘 이해했습니다.",
        "출석등급": "A"
      }
    }
  ]
}
```

### 평가 입력

학생 또는 교사가 평가를 입력합니다. 학기의 `permissionEvaluationV2` 권한 설정과 평가 항목의 `authOption`에 따라 입력 권한이 결정됩니다.

```
PUT /api/enrollments/:_id/evaluation
```

**권한**: `isLoggedIn` (평가 항목별 권한에 따라 추가 제한)

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `evaluation` | `object` | O | 평가 데이터 (키: 평가 항목 라벨, 값: 입력값) |

#### 요청 예시

```json
{
  "evaluation": {
    "멘토평가": "수업 참여도가 높고 성실합니다.",
    "출석등급": "A"
  }
}
```

> **참고**: `evaluation` 데이터는 `mongoose-encryption`으로 암호화되어 MongoDB에 저장됩니다.

### 메모 수정

```
PUT /api/enrollments/:_id/memo
```

**권한**: `isLoggedIn`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `memo` | `string` | O | 메모 내용 |

### 캘린더 표시 설정

수강 일정의 캘린더 표시 여부를 설정합니다.

#### 캘린더에서 숨기기

```
PUT /api/enrollments/:_id/hide
```

#### 캘린더에 표시하기

```
PUT /api/enrollments/:_id/show
```

### 수강 취소

```
DELETE /api/enrollments/:_id
```

**권한**: `isLoggedIn`

> **참고**: 수강 취소 시 강의계획서의 `count`가 자동으로 1 감소합니다.

---

## 3. 학기 등록 API (Registration)

> **라우트 파일**: `backend/src/routes/registrations.js`
> **컨트롤러 파일**: `backend/src/controllers/registrations.js`
> **모델 파일**: `backend/src/models/Registration.js`

### 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/registrations` | 학기 등록 | `admin`\|`manager` |
| `POST` | `/api/registrations/copy` | 학기 복사 등록 | `admin`\|`manager` |
| `GET` | `/api/registrations/:_id?` | 등록 조회 (목록/상세) | `isLoggedIn` |
| `PUT` | `/api/registrations/:_id` | 등록 수정 | `admin`\|`manager` |
| `DELETE` | `/api/registrations/:_id` | 등록 삭제 | `admin`\|`manager` |

### 학기 등록

사용자를 특정 학기에 학생 또는 교사로 등록합니다.

```
POST /api/registrations
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `season` | `string` | O | 학기 ObjectId |
| `user` | `string` | O | 사용자 ObjectId |
| `userId` | `string` | O | 사용자 ID |
| `userName` | `string` | O | 사용자 이름 |
| `role` | `string` | O | 역할 (`"student"` 또는 `"teacher"`) |
| `grade` | `string` | X | 학년 (학생인 경우) |
| `group` | `string` | X | 그룹 |
| `teacher` | `string` | X | 담당 교사 ObjectId (학생인 경우) |

#### 요청 예시

```json
{
  "season": "507f1f77bcf86cd799439021",
  "user": "507f1f77bcf86cd799439041",
  "userId": "student01",
  "userName": "이학생",
  "role": "student",
  "grade": "2"
}
```

#### 응답 (200)

```json
{
  "registration": {
    "_id": "507f1f77bcf86cd799439061",
    "season": "507f1f77bcf86cd799439021",
    "school": "507f1f77bcf86cd799439011",
    "schoolId": "highschool01",
    "schoolName": "테스트 고등학교",
    "year": "2024학년도",
    "term": "1학기",
    "period": { "start": "2024-03-04", "end": "2024-07-19" },
    "user": "507f1f77bcf86cd799439041",
    "userId": "student01",
    "userName": "이학생",
    "role": "student",
    "grade": "2",
    "isActivated": true,
    "permissionSyllabusV2": false,
    "permissionEnrollmentV2": true,
    "permissionEvaluationV2": false,
    "formEvaluation": [...]
  }
}
```

#### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `409` | 중복 인덱스 에러 | 동일 학기에 이미 등록됨 (`season` + `user` 고유) |

### 학기 복사 등록

이전 학기의 등록 정보를 새 학기로 복사합니다.

```
POST /api/registrations/copy
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `fromSeason` | `string` | O | 원본 학기 ObjectId |
| `toSeason` | `string` | O | 대상 학기 ObjectId |

### 등록 조회

```
GET /api/registrations/:_id?
```

**권한**: `isLoggedIn`

#### 목록 조회 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `season` | `string` | X | 학기 ObjectId |
| `user` | `string` | X | 사용자 ObjectId |
| `school` | `string` | X | 학교 ObjectId |
| `role` | `string` | X | 역할 필터 (`student`, `teacher`) |

#### 응답 (200)

```json
{
  "registrations": [
    {
      "_id": "...",
      "userId": "student01",
      "userName": "이학생",
      "role": "student",
      "grade": "2",
      "year": "2024학년도",
      "term": "1학기",
      "isActivated": true
    }
  ]
}
```

### 등록 수정

```
PUT /api/registrations/:_id
```

**권한**: `admin` 또는 `manager`

#### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `role` | `string` | X | 역할 변경 |
| `grade` | `string` | X | 학년 변경 |
| `group` | `string` | X | 그룹 변경 |
| `teacher` | `string` | X | 담당 교사 변경 |

### 등록 삭제

```
DELETE /api/registrations/:_id
```

**권한**: `admin` 또는 `manager`

> **주의**: 등록 삭제 시 해당 등록에 연결된 수강(Enrollment) 데이터가 영향을 받을 수 있습니다.

---

## 프론트엔드 API 함수 (useAPIv2)

### 강의계획서 (Syllabus)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CSyllabus` | POST | `/api/syllabuses` | 강의계획서 생성 |
| `RSyllabuses` | GET | `/api/syllabuses` | 강의계획서 목록 |
| `RSyllabus` | GET | `/api/syllabuses/:_id` | 강의계획서 상세 |
| `USyllabus` | PUT | `/api/syllabuses/:_id` | 강의계획서 수정 |
| `CConfirmSyllabus` | POST | `/api/syllabuses/:_id/confirmed` | 수업 승인 |
| `DCancelConfirmSyllabus` | DELETE | `/api/syllabuses/:_id/confirmed` | 수업 승인 취소 |
| `DSyllabus` | DELETE | `/api/syllabuses/:_id` | 강의계획서 삭제 |

### 수강 (Enrollment)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CEnrollment` | POST | `/api/enrollments` | 수강신청 |
| `REnrollments` | GET | `/api/enrollments` | 수강 목록 |
| `REnrollment` | GET | `/api/enrollments/:_id` | 수강 상세 |
| `REnrollmentEvaluation` | GET | `/api/enrollments/evaluation` | 평가 데이터 조회 |
| `UEvaluation` | PUT | `/api/enrollments/:_id/evaluation` | 평가 입력 |
| `UEnrollmentMemo` | PUT | `/api/enrollments/:_id/memo` | 메모 수정 |
| `DEnrollment` | DELETE | `/api/enrollments/:_id` | 수강 취소 |

### 학기 등록 (Registration)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CRegistration` | POST | `/api/registrations` | 학기 등록 |
| `CRegistrationCopy` | POST | `/api/registrations/copy` | 학기 복사 등록 |
| `RRegistrations` | GET | `/api/registrations` | 등록 목록 |
| `RRegistration` | GET | `/api/registrations/:_id` | 등록 상세 |
| `URegistration` | PUT | `/api/registrations/:_id` | 등록 수정 |
| `DRegistration` | DELETE | `/api/registrations/:_id` | 등록 삭제 |
