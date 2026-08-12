# 학생 기록 API

학생 기록(Archive) API입니다. 학교별 학생의 개인 기록 데이터를 조회하고 수정하는 기능을 제공합니다. 기록 데이터는 학교 관리자가 정의한 양식(formArchive)에 따라 구조화됩니다.

> **라우트 파일**: `backend/src/routes/archives.js`
> **컨트롤러 파일**: `backend/src/controllers/archives.js`
> **모델 파일**: `backend/src/models/Archive.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/archives` | 학생 기록 조회 | `isLoggedIn` |
| `PUT` | `/api/archives/:_id` | 학생 기록 수정 | `isLoggedIn` |

---

## 학생 기록 조회

학생의 기록을 조회합니다. `label` 파라미터 유무에 따라 전체 기록 또는 특정 양식 섹션을 조회합니다. 해당 학생의 기록이 존재하지 않으면 자동으로 생성합니다.

```
GET /api/archives
```

**권한**: `isLoggedIn`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `registration` | `string` | O | 학생 등록(Registration)의 ObjectId |
| `label` | `string` | X | 조회할 양식 섹션 라벨 (예: `"인적 사항"`) |

### 권한 모델

`label` 파라미터가 제공된 경우, 학교의 `formArchive` 설정에 따라 세분화된 권한 검사가 수행됩니다.

| 역할 | 조건 | 설명 |
|------|------|------|
| 관리자 (`manager`) | `authManager === "viewAndEdit"` | 해당 양식 섹션에 대한 관리자 접근 허용 |
| 학생 (본인) | `authStudent === "view"` 또는 `"viewAndEdit"` | 본인의 기록만 조회 가능 |
| 교사 (전체) | `authTeacher === "viewAndEditStudents"` | 같은 학기에 교사로 등록된 경우 모든 학생 기록 조회 가능 |
| 교사 (담당) | `authTeacher === "viewAndEditMyStudents"` | 등록(Registration)의 `teacher` 또는 `subTeacher`로 지정된 학생만 조회 가능 |

`label` 파라미터가 없는 경우, 본인의 기록이거나 같은 학기에 교사로 등록된 경우 전체 기록을 조회할 수 있습니다.

### label 없이 조회 (전체 기록)

학생 본인 또는 해당 학기의 교사가 전체 기록을 조회합니다.

#### 요청 예시

```
GET /api/archives?registration=507f1f77bcf86cd799439011
```

#### 응답 (200)

```json
{
  "archive": {
    "_id": "60a7b2c3d4e5f6a7b8c9d0e1",
    "user": "507f1f77bcf86cd799439022",
    "school": "507f1f77bcf86cd799439033",
    "schoolId": "school01",
    "schoolName": "한국고등학교",
    "userId": "student01",
    "userName": "홍길동",
    "data": {
      "인적 사항": {
        "이름": { "value": "홍길동" },
        "주민등록번호": { "value": "010101-3123456" },
        "주소": { "value": "서울특별시 강남구" },
        "성명(부)": { "value": "홍아버지" },
        "생년월일(부)": { "value": "1975년03월15일" },
        "성명(모)": { "value": "김어머니" },
        "생년월일(모)": { "value": "1978년07월22일" }
      },
      "학업 기록": {
        "비고": { "value": "우수 학생" }
      }
    }
  }
}
```

### label로 조회 (특정 양식 섹션)

특정 양식 섹션만 조회합니다. 권한 모델에 따라 접근이 제한됩니다.

#### 요청 예시

```
GET /api/archives?registration=507f1f77bcf86cd799439011&label=인적 사항
```

#### 응답 (200)

```json
{
  "archive": {
    "_id": "60a7b2c3d4e5f6a7b8c9d0e1",
    "user": "507f1f77bcf86cd799439022",
    "data": {
      "인적 사항": {
        "이름": { "value": "홍길동" },
        "주민등록번호": { "value": "010101-3123456" },
        "주소": { "value": "서울특별시 강남구" },
        "성명(부)": { "value": "홍아버지" },
        "생년월일(부)": { "value": "1975년03월15일" },
        "성명(모)": { "value": "김어머니" },
        "생년월일(모)": { "value": "1978년07월22일" }
      }
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED(registration)` | `registration` 파라미터 누락 |
| `400` | (빈 응답) | `registration` ObjectId 형식 오류 |
| `403` | `PERMISSION_DENIED` | 해당 양식 섹션에 대한 접근 권한 없음 |
| `404` | `__NOT_FOUND(registration(student))` | 학생 등록 정보를 찾을 수 없음 |
| `404` | `__NOT_FOUND(registration(teacher))` | 교사 등록 정보를 찾을 수 없음 (label 없이 조회 시) |
| `404` | `__NOT_FOUND(school)` | 학교를 찾을 수 없음 |
| `404` | `__NOT_FOUND(formArchive_item)` | 해당 라벨의 양식 항목을 찾을 수 없음 |

---

## 학생 기록 수정

학생 기록의 특정 양식 섹션 데이터를 수정합니다. 기존 데이터에 새로운 데이터를 병합(merge)합니다.

```
PUT /api/archives/:_id
```

**권한**: `isLoggedIn`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 기록(Archive)의 ObjectId |

### 요청 본문

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `registration` | `string` | O | 학생 등록(Registration)의 ObjectId |
| `label` | `string` | O | 수정할 양식 섹션 라벨 |
| `data` | `object` | O | 수정할 데이터 |

### 권한 모델

학교의 `formArchive` 설정에 따라 세분화된 권한 검사가 수행됩니다. 조회(GET)와 동일한 역할 모델이지만, 수정 권한이 필요합니다.

| 역할 | 조건 | 설명 |
|------|------|------|
| 관리자 (`manager`) | `authManager === "viewAndEdit"` | 해당 양식 섹션에 대한 관리자 수정 허용 |
| 학생 (본인) | `authStudent === "viewAndEdit"` | 본인의 기록만 수정 가능 (`"view"`만으로는 수정 불가) |
| 교사 (전체) | `authTeacher === "viewAndEditStudents"` | 같은 학기에 교사로 등록된 경우 모든 학생 기록 수정 가능 |
| 교사 (담당) | `authTeacher === "viewAndEditMyStudents"` | 등록(Registration)의 `teacher` 또는 `subTeacher`로 지정된 학생만 수정 가능 |

### 요청 예시

```json
{
  "registration": "507f1f77bcf86cd799439011",
  "label": "인적 사항",
  "data": {
    "이름": { "value": "홍길동" },
    "주소": { "value": "서울특별시 서초구" },
    "성명(부)": { "value": "홍아버지" },
    "생년월일(부)": { "value": "1975년03월15일" }
  }
}
```

### 응답 (200)

```json
{
  "archive": {
    "_id": "60a7b2c3d4e5f6a7b8c9d0e1",
    "user": "507f1f77bcf86cd799439022",
    "data": {
      "인적 사항": {
        "이름": { "value": "홍길동" },
        "주소": { "value": "서울특별시 서초구" },
        "성명(부)": { "value": "홍아버지" },
        "생년월일(부)": { "value": "1975년03월15일" }
      }
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_INVALID(_id)` | `_id` 경로 파라미터 ObjectId 형식 오류 |
| `400` | `FIELD_REQUIRED(label)` | `label` 필드 누락 |
| `400` | `FIELD_REQUIRED(data)` | `data` 필드 누락 |
| `400` | `FIELD_REQUIRED(registration)` | `registration` 필드 누락 |
| `400` | (빈 응답) | 권한 조건에 해당하지 않는 경우 |
| `403` | `PERMISSION_DENIED` | 해당 양식 섹션에 대한 수정 권한 없음 |
| `404` | `__NOT_FOUND(archive)` | 기록을 찾을 수 없음 |
| `404` | `__NOT_FOUND(school)` | 학교를 찾을 수 없음 |
| `404` | `__NOT_FOUND(formArchive_Item)` | 해당 라벨의 양식 항목을 찾을 수 없음 |

---

## 데이터 구조

### archive.data

`archive.data`는 양식 라벨을 키로, 각 필드 라벨과 값을 중첩 객체로 가지는 구조입니다.

```json
{
  "[양식 라벨]": {
    "[필드 라벨]": {
      "value": "값",
      "key": "필드 키 (선택)"
    }
  }
}
```

#### 예시

```json
{
  "인적 사항": {
    "이름": { "value": "홍길동" },
    "주민등록번호": { "value": "010101-3123456" },
    "주소": { "value": "서울특별시 강남구" },
    "성명(부)": { "value": "홍아버지" },
    "생년월일(부)": { "value": "1975년03월15일" },
    "성명(모)": { "value": "김어머니" },
    "생년월일(모)": { "value": "1978년07월22일" }
  },
  "학업 기록": {
    "비고": { "value": "우수 학생" }
  }
}
```

---

## 데이터베이스 모델

### Archive 스키마

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `_id` | `ObjectId` | 자동 | 기록 고유 ID |
| `school` | `ObjectId` | O | 학교 ID (`School._id`) |
| `schoolId` | `string` | X | 학교 식별자 |
| `schoolName` | `string` | X | 학교 이름 |
| `user` | `ObjectId` | O | 사용자 ID (`User._id`) |
| `userId` | `string` | X | 사용자 식별자 |
| `userName` | `string` | X | 사용자 이름 |
| `data` | `Object` | X | 기록 데이터 (기본값: `{}`) |
| `createdAt` | `Date` | 자동 | 생성 시각 |
| `updatedAt` | `Date` | 자동 | 수정 시각 |

### 인덱스

| 인덱스 | 필드 | 속성 |
|--------|------|------|
| `_id` | `_id` | UNIQUE |
| `school_1_user_1` | `{ school: 1, user: 1 }` | UNIQUE, COMPOUND |

### 암호화

`data` 필드는 `mongoose-encryption` 플러그인을 사용하여 암호화되어 저장됩니다.

- **암호화 키**: `ENCKEY_A` (환경 변수)
- **서명 키**: `SIGKEY_A` (환경 변수)
- **암호화 대상 필드**: `data`

### clean() 메서드

`clean()` 인스턴스 메서드는 민감한 개인정보를 더미 데이터로 대체합니다. 백업/테스트 용도로 사용됩니다.

| 필드 | 대체 값 |
|------|---------|
| `인적 사항.주민등록번호` | `"000000-111111"` |
| `인적 사항.주소` | `"아름다운 이땅에 금수강산에"` |
| `인적 사항.성명(부)` | `"아버지"` |
| `인적 사항.생년월일(부)` | `"2022년11월16일"` |
| `인적 사항.성명(모)` | `"어머니"` |
| `인적 사항.생년월일(모)` | `"2022년11월16일"` |

---

## 파일 업로드/다운로드

기록에 첨부 파일을 업로드하거나 다운로드하는 기능은 별도의 파일 API를 통해 제공됩니다. 자세한 내용은 `files.md`를 참조하세요.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/files/archive` | 기록 첨부 파일 업로드 (`CUploadFileArchive`) |
| `GET` | `/api/files/archive/signed` | 기록 첨부 파일 서명된 URL 조회 (`RSignedUrlArchive`) |

> **참고**: 파일 API의 권한 모델은 기록 조회/수정과 동일한 `formArchive` 기반 권한 검사를 수행합니다.

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `RArchiveByRegistration` | GET | `/api/archives` | 학생 기록 조회 |
| `UArchiveByRegistration` | PUT | `/api/archives/:_id` | 학생 기록 수정 |
