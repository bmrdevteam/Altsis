# 수강 API

수강(Enrollment)은 학생이 수업에 등록하는 기능입니다. 수강신청, 평가 입력, 메모, 캘린더 표시 설정 등을 관리합니다.

> **라우트 파일**: `backend/src/routes/enrollments.js`
> **컨트롤러 파일**: `backend/src/controllers/enrollments.js`
> **모델 파일**: `backend/src/models/Enrollment.js`

> **참고**: `evaluation` 필드는 `mongoose-encryption`으로 암호화되어 저장됩니다 (`ENCKEY_E`, `SIGKEY_E`). 특정 API 이외에는 응답값에 evaluation을 포함하지 않습니다.

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/enrollments` | 수강신청 | `isLoggedIn` |
| `GET` | `/api/enrollments` | 수강 목록 조회 | `isLoggedIn` |
| `GET` | `/api/enrollments/:_id` | 수강 상세 조회 | `isLoggedIn` |
| `GET` | `/api/enrollments/evaluation` | 평가 포함 수강 조회 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/evaluation` | 평가 수정 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/memo` | 메모 수정 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/hide` | 캘린더에서 숨김 | `isLoggedIn` |
| `PUT` | `/api/enrollments/:_id/show` | 캘린더에서 표시 | `isLoggedIn` |
| `DELETE` | `/api/enrollments/:_id` | 수강 취소 | `isLoggedIn` |

---

## 수강신청

학생이 수업(syllabus)에 수강신청합니다. 동시 요청을 처리하기 위해 내부적으로 작업 큐(PQueue, concurrency: 1)를 사용하며, 대기 순서가 10을 초과하면 WebSocket으로 대기 순서를 전달합니다.

```
POST /api/enrollments
```

**권한**: `isLoggedIn` (학생 본인 또는 담당 멘토/매니저)

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `syllabus` | `string` | O | 수업(Syllabus)의 ObjectId |
| `registration` | `string` | O | 학기등록(Registration)의 ObjectId |
| `socketId` | `string` | X | WebSocket ID (대기 순서 알림용) |

### 요청 예시

```json
{
  "syllabus": "507f1f77bcf86cd799439011",
  "registration": "507f1f77bcf86cd799439012",
  "socketId": "abc123"
}
```

### 응답 (200)

```json
{}
```

### 처리 과정

1. 수업(syllabus) 존재 여부 확인
2. 학기등록(registration) 존재 여부 확인
3. 이미 신청한 수업인지 중복 확인
4. 수강 정원 초과 여부 확인 (`limit !== 0`이고 `count >= limit`이면 거부)
5. 시간표 충돌 여부 확인
6. 수업의 모든 담당 교사가 승인(confirmed)했는지 확인
7. 권한 검사 (`permissionEnrollmentV2`)
   - 학생 본인이 직접 신청하는 경우: 본인의 registration 권한 확인
   - 멘토가 학생을 초대하는 경우: 멘토의 registration 권한 확인
8. Enrollment 생성 (syllabus 정보 복사)
9. 동일 과목 수강 이력이 있으면 evaluation 동기화 (`combineBy` 규칙에 따라 "term" 또는 "year" 단위)
10. 멘토 초대인 경우 학생에게 알림 발송

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 필드 누락 (`syllabus`, `registration`) |
| `403` | `PERMISSION_DENIED` | 수강신청 권한 없음 |
| `404` | `SYLLABUS_NOT_FOUND` | 수업을 찾을 수 없음 |
| `404` | `REGISTRATION_NOT_FOUND` | 학기등록을 찾을 수 없음 |
| `409` | `FIELD_IN_USE(enrollment)` | 이미 수강신청한 수업 |
| `409` | `STUDENTS_FULL` | 수강 정원 초과 |
| `409` | `TIME_DUPLICATED` | 시간표 충돌 |
| `409` | `SYLLABUS_NOT_CONFIRMED` | 담당 교사 미승인 수업 |

---

## 수강 목록 조회

수강 목록을 조회합니다. `evaluation` 필드는 응답에서 제외됩니다.

```
GET /api/enrollments
```

**권한**: `isLoggedIn`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `syllabus` | `string` | X | 수업(Syllabus) ObjectId로 필터링 |
| `season` | `string` | X | 학기(Season) ObjectId로 필터링 |
| `student` | `string` | X | 학생(User) ObjectId로 필터링 |

### 응답 (200)

```json
{
  "enrollments": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "syllabus": "507f1f77bcf86cd799439011",
      "season": "507f1f77bcf86cd799439030",
      "school": "507f1f77bcf86cd799439040",
      "schoolId": "school-01",
      "schoolName": "테스트 학교",
      "year": "2024학년도",
      "term": "1학기",
      "user": "507f1f77bcf86cd799439050",
      "userId": "teacher01",
      "userName": "김교사",
      "classTitle": "수학 기초반",
      "time": [
        { "label": "월1" },
        { "label": "월2" }
      ],
      "classroom": "301호",
      "subject": ["수학"],
      "point": 3,
      "limit": 30,
      "teachers": [
        {
          "_id": "507f1f77bcf86cd799439050",
          "userId": "teacher01",
          "userName": "김교사",
          "confirmed": true
        }
      ],
      "student": "507f1f77bcf86cd799439060",
      "studentId": "student01",
      "studentName": "이학생",
      "studentGrade": "1학년",
      "memo": "",
      "isHiddenFromCalendar": false,
      "createdAt": "2024-03-01T09:00:00.000Z",
      "updatedAt": "2024-03-01T09:00:00.000Z"
    }
  ]
}
```

---

## 수강 상세 조회

특정 수강 정보를 조회합니다. 학생 본인만 조회할 수 있으며, `evaluation` 필드는 학생에게 열람 권한이 있는 항목만 필터링되어 반환됩니다.

```
GET /api/enrollments/:_id
```

**권한**: `isLoggedIn` (학생 본인만 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 수강(Enrollment) ObjectId |

### 응답 (200)

```json
{
  "enrollment": {
    "_id": "507f1f77bcf86cd799439020",
    "syllabus": "507f1f77bcf86cd799439011",
    "season": "507f1f77bcf86cd799439030",
    "school": "507f1f77bcf86cd799439040",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "year": "2024학년도",
    "term": "1학기",
    "classTitle": "수학 기초반",
    "student": "507f1f77bcf86cd799439060",
    "studentId": "student01",
    "studentName": "이학생",
    "studentGrade": "1학년",
    "evaluation": {
      "자기평가": "성실히 참여함"
    },
    "memo": "중간고사 범위 확인 필요",
    "isHiddenFromCalendar": false,
    "createdAt": "2024-03-01T09:00:00.000Z",
    "updatedAt": "2024-03-15T14:30:00.000Z"
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 본인의 수강 정보가 아님 |
| `404` | `ENROLLMENT_NOT_FOUND` | 수강 정보를 찾을 수 없음 |
| `404` | `REGISTRATION_NOT_FOUND` | 학기등록 정보를 찾을 수 없음 |

---

## 평가 포함 수강 조회

평가(evaluation) 데이터를 포함한 수강 목록을 조회합니다. 두 가지 조회 방식을 지원합니다.

```
GET /api/enrollments/evaluation
```

**권한**: `isLoggedIn`

### 조회 방식 1: 수업 기준 조회

담당 교사 또는 매니저가 특정 수업의 전체 수강생 평가를 조회합니다.

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `syllabus` | `string` | O | 수업(Syllabus) ObjectId |

#### 응답 (200)

```json
{
  "syllabus": {
    "syllabus": "507f1f77bcf86cd799439011",
    "season": "507f1f77bcf86cd799439030",
    "school": "507f1f77bcf86cd799439040",
    "schoolId": "school-01",
    "schoolName": "테스트 학교",
    "year": "2024학년도",
    "term": "1학기",
    "classTitle": "수학 기초반",
    "subject": ["수학"],
    "teachers": [
      {
        "_id": "507f1f77bcf86cd799439050",
        "userId": "teacher01",
        "userName": "김교사",
        "confirmed": true
      }
    ]
  },
  "enrollments": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "student": "507f1f77bcf86cd799439060",
      "studentId": "student01",
      "studentName": "이학생",
      "studentGrade": "1학년",
      "evaluation": {
        "멘토평가": "우수",
        "자기평가": "성실히 참여함"
      },
      "createdAt": "2024-03-01T09:00:00.000Z",
      "updatedAt": "2024-03-15T14:30:00.000Z"
    }
  ]
}
```

### 조회 방식 2: 학교 + 학생 기준 조회

특정 학교에서 특정 학생의 전체 수강 평가를 조회합니다. 본인 데이터가 아닌 경우 교사(teacher) 역할이 필요합니다.

#### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `school` | `string` | O | 학교(School) ObjectId |
| `student` | `string` | O | 학생(User) ObjectId |

#### 응답 (200)

```json
{
  "enrollments": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "syllabus": "507f1f77bcf86cd799439011",
      "season": "507f1f77bcf86cd799439030",
      "school": "507f1f77bcf86cd799439040",
      "year": "2024학년도",
      "term": "1학기",
      "classTitle": "수학 기초반",
      "student": "507f1f77bcf86cd799439060",
      "studentId": "student01",
      "studentName": "이학생",
      "evaluation": {
        "멘토평가": "우수",
        "자기평가": "성실히 참여함"
      },
      "createdAt": "2024-03-01T09:00:00.000Z",
      "updatedAt": "2024-03-15T14:30:00.000Z"
    }
  ]
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 조회 권한 없음 (담당 교사/매니저가 아니거나, 본인 데이터가 아닌데 교사 역할이 아닌 경우) |
| `404` | `SYLLABUS_NOT_FOUND` | 수업을 찾을 수 없음 |

---

## 평가 수정

수강생의 평가 데이터를 수정합니다. 담당 교사/매니저 또는 학생 본인이 수정할 수 있으며, 각 평가 항목의 `auth.edit` 설정에 따라 수정 권한이 결정됩니다. 수정된 평가는 `combineBy` 규칙에 따라 동일 과목의 다른 수강에도 동기화됩니다.

```
PUT /api/enrollments/:_id/evaluation
```

**권한**: `isLoggedIn` (담당 교사/매니저 또는 학생 본인, `permissionEvaluationV2` 필요)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 수강(Enrollment) ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `evaluation` | `object` | O | 수정할 평가 데이터 (키-값 쌍) |

### 요청 예시

```json
{
  "evaluation": {
    "멘토평가": "매우 우수",
    "자기평가": "열심히 노력함"
  }
}
```

### 응답 (200)

```json
{}
```

### 동기화 규칙

평가 항목의 `combineBy` 설정에 따라 관련 수강의 평가가 자동 동기화됩니다:

- `"term"`: 같은 학기(season) + 같은 과목(subject)의 수강에 동기화
- `"year"`: 같은 학년도(year) + 같은 과목(subject)의 전체 수강에 동기화 (다른 학기 포함)

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(evaluation)` | `evaluation` 필드 누락 |
| `403` | `PERMISSION_DENIED` | 평가 수정 권한 없음 (담당 교사/학생 본인이 아니거나 `permissionEvaluationV2` 없음) |
| `404` | `ENROLLMENT_NOT_FOUND` | 수강 정보를 찾을 수 없음 |
| `404` | `REGISTRATION_NOT_FOUND` | 학기등록 정보를 찾을 수 없음 |

---

## 메모 수정

학생이 수강 정보에 개인 메모를 수정합니다.

```
PUT /api/enrollments/:_id/memo
```

**권한**: `isLoggedIn` (학생 본인만 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 수강(Enrollment) ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `memo` | `string` | O | 메모 내용 |

### 요청 예시

```json
{
  "memo": "기말고사 범위: 1~5단원"
}
```

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(memo)` | `memo` 필드 누락 |
| `403` | `PERMISSION_DENIED` | 본인의 수강 정보가 아님 |
| `404` | `ENROLLMENT_NOT_FOUND` | 수강 정보를 찾을 수 없음 |

---

## 캘린더에서 숨김/표시

수강 중인 수업을 캘린더에서 숨기거나 다시 표시합니다. 학생 본인만 설정할 수 있습니다.

### 캘린더에서 숨김

```
PUT /api/enrollments/:_id/hide
```

**권한**: `isLoggedIn` (학생 본인만 가능)

### 캘린더에서 표시

```
PUT /api/enrollments/:_id/show
```

**권한**: `isLoggedIn` (학생 본인만 가능)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 수강(Enrollment) ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 본인의 수강 정보가 아님 |
| `404` | `ENROLLMENT_NOT_FOUND` | 수강 정보를 찾을 수 없음 |

---

## 수강 취소

수강을 취소합니다. 학생 본인, 담당 교사, 또는 매니저가 취소할 수 있습니다. 취소 시 수업(syllabus)의 수강 인원(`count`)이 1 감소하고, 관련 캘린더 이벤트가 삭제됩니다. 멘토가 취소한 경우 학생에게 알림이 발송됩니다.

```
DELETE /api/enrollments/:_id
```

**권한**: `isLoggedIn` (학생 본인, 담당 교사, 또는 매니저, `permissionEnrollmentV2` 필요)

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 수강(Enrollment) ObjectId |

### 응답 (200)

```json
{}
```

### 처리 과정

1. 수강 정보 존재 여부 확인
2. 권한 확인 (학생 본인 / 담당 교사 / 매니저)
3. `permissionEnrollmentV2` 권한 확인
4. 수강(enrollment) 삭제
5. 수업(syllabus)의 `count` 1 감소
6. 관련 캘린더 이벤트 삭제 (`sourceType: "enrollment"`)
7. 멘토가 취소한 경우 학생에게 수업 취소 알림 발송

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 취소 권한 없음 (본인/담당 교사/매니저가 아니거나 `permissionEnrollmentV2` 없음) |
| `404` | `ENROLLMENT_NOT_FOUND` | 수강 정보를 찾을 수 없음 |
| `404` | `REGISTRATION_NOT_FOUND` | 학기등록 정보를 찾을 수 없음 |

---

## 데이터 모델

### Enrollment 스키마

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `_id` | `ObjectId` | - | 자동 | 고유 ID |
| `syllabus` | `ObjectId` | O | - | 수업(Syllabus) ID |
| `season` | `ObjectId` | X | - | 학기(Season) ID |
| `school` | `ObjectId` | X | - | 학교(School) ID |
| `schoolId` | `string` | X | - | 학교 고유 ID |
| `schoolName` | `string` | X | - | 학교 이름 |
| `year` | `string` | X | - | 학년도 (예: "2024학년도") |
| `term` | `string` | X | - | 학기 (예: "1학기") |
| `user` | `ObjectId` | X | - | 수업 개설자(교사) ID |
| `userId` | `string` | X | - | 수업 개설자 사용자 ID |
| `userName` | `string` | X | - | 수업 개설자 이름 |
| `classTitle` | `string` | X | - | 수업 제목 |
| `coverImage` | `string` | X | - | 커버 이미지 |
| `coverColor` | `string` | X | - | 커버 색상 |
| `time` | `array` | X | - | 시간표 배열 |
| `classroom` | `string` | X | - | 강의실 |
| `subject` | `string[]` | X | - | 과목 목록 |
| `point` | `number` | X | - | 학점 |
| `limit` | `number` | X | - | 수강 정원 (0이면 무제한) |
| `count_limit` | `string` | X | - | 수강 인원/정원 표시 |
| `info` | `object` | X | - | 수업 상세 정보 |
| `teachers` | `object[]` | X | - | 담당 교사 목록 (`_id`, `userId`, `userName`, `confirmed`) |
| `student` | `ObjectId` | O | - | 수강생(학생) ID |
| `studentId` | `string` | X | - | 수강생 사용자 ID |
| `studentName` | `string` | X | - | 수강생 이름 |
| `studentGrade` | `string` | X | - | 수강생 학년 |
| `evaluation` | `object` | X | - | 평가 데이터 (암호화 저장) |
| `memo` | `string` | X | - | 학생 개인 메모 |
| `isHiddenFromCalendar` | `boolean` | X | `false` | 캘린더 숨김 여부 |
| `createdAt` | `Date` | - | 자동 | 생성일시 |
| `updatedAt` | `Date` | - | 자동 | 수정일시 |

### 인덱스

| 인덱스 | 필드 | 속성 |
|--------|------|------|
| 복합 유니크 인덱스 | `syllabus` + `student` | UNIQUE |
| 복합 인덱스 | `student` + `season` | - |

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CEnrollment` | POST | `/api/enrollments` | 수강신청 |
| `REnrollments` | GET | `/api/enrollments` | 수강 목록 조회 |
| `REnrollment` | GET | `/api/enrollments/:_id` | 수강 상세 조회 |
| `REnrollmentsWithEvaluation` | GET | `/api/enrollments/evaluation` | 평가 포함 수강 조회 |
| `UEvaluation` | PUT | `/api/enrollments/:_id/evaluation` | 평가 수정 |
| `UEnrollmentMemo` | PUT | `/api/enrollments/:_id/memo` | 메모 수정 |
| `UHideEnrollmentFromCalendar` | PUT | `/api/enrollments/:_id/hide` | 캘린더에서 숨김 |
| `UShowEnrollmentOnCalendar` | PUT | `/api/enrollments/:_id/show` | 캘린더에서 표시 |
| `DEnrollment` | DELETE | `/api/enrollments/:_id` | 수강 취소 |
