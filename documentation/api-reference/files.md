# 파일 API

파일 업로드 및 다운로드 API입니다. AWS S3를 사용하여 아카이브 파일, 문서, 백업 파일, 강의계획서 커버 이미지, AI 참고자료 등의 업로드/다운로드를 관리합니다. Pre-Signed URL을 통해 보안된 파일 접근을 제공합니다.

> **라우트 파일**: `backend/src/routes/files.js`
> **컨트롤러 파일**: `backend/src/controllers/files.js`
> **S3 설정 파일**: `backend/src/_s3/fileBucket.js`, `backend/src/_s3/profileBucket.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/files/archive` | 아카이브 파일 업로드 | `isLoggedIn` |
| `GET` | `/api/files/archive/signed` | 아카이브 파일 서명 URL 조회 | `isLoggedIn` |
| `GET` | `/api/files/document/signed` | 문서 파일 서명 URL 조회 | `isLoggedIn` |
| `GET` | `/api/files/backup/signed` | 백업 파일 서명 URL 조회 | `owner`\|`admin` |

### 관련 파일 엔드포인트 (다른 라우트)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `PUT` | `/api/syllabuses/:_id/cover-image` | 강의계획서 커버 이미지 업로드 | `isLoggedIn` |
| `DELETE` | `/api/syllabuses/:_id/cover-image` | 강의계획서 커버 이미지 삭제 | `isLoggedIn` |
| `POST` | `/api/seasons/:_id/ai/reference/upload` | AI 참고자료 업로드 | `admin`\|`manager` |
| `GET` | `/api/seasons/:_id/ai/reference/:index/download` | AI 참고자료 다운로드 | `admin`\|`manager` |
| `DELETE` | `/api/seasons/:_id/ai/reference/:index` | AI 참고자료 삭제 | `admin`\|`manager` |

---

## S3 버킷 구성

시스템은 두 개의 S3 버킷을 사용합니다.

| 버킷 | 환경변수 | 용도 |
|-------|----------|------|
| fileBucket | `s3_bucket2` | 아카이브, 채팅 파일, AI 참고자료 |
| profileBucket | `s3_bucket` | 프로필 이미지, 강의계획서 커버 이미지 (Lambda 썸네일 생성) |

- 모든 업로드에 `ACL: public-read` 적용
- Pre-Signed URL을 통해 보안된 임시 다운로드 접근 제공

### S3 키 패턴

| 유형 | 패턴 | 예시 |
|------|------|------|
| 아카이브 | `{academyId}/archive/{timestamp}_{random}.{ext}` | `my-academy/archive/1697012345_aBcDeFgHiJkL.pdf` |
| 채팅 | `{academyId}/chat/{roomId}/{timestamp}_{random}.{ext}` | `my-academy/chat/room01/1697012345_aBcDeFgHiJkL.jpg` |
| AI 참고자료 | `{academyId}/ai-ref/{seasonId}/{timestamp}_{random}.{ext}` | `my-academy/ai-ref/507f1f77bcf8/1697012345_aBcDeFgHiJkL.pdf` |
| 커버 이미지 | `original/{academyId}/courses/{syllabusId}/{filename}` | `original/my-academy/courses/507f1f77bcf8/507f1f77bcf86cd7.jpg` |
| 프로필 이미지 | `original/{academyId}/{userId}/{filename}` | `original/my-academy/507f1f77bcf8/507f1f77bcf86cd7.jpg` |

> **참고**: 커버 이미지의 경우, `original/` 경로에 업로드하면 AWS Lambda가 자동으로 `thumb/` 경로에 썸네일을 생성합니다.

---

## 아카이브 파일 업로드

아카이브에 파일을 업로드합니다. `multipart/form-data` 형식으로 파일을 전송하며, S3에 업로드 후 Pre-Signed URL과 함께 결과를 반환합니다.

```
POST /api/files/archive
```

**권한**: `isLoggedIn` (로그인 필요)

**Content-Type**: `multipart/form-data`

### 요청 본문 (FormData)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | `File` | O | 업로드할 파일 |

### 파일 제한

| 항목 | 제한 |
|------|------|
| 최대 크기 | 5MB |
| 최대 파일 수 | 1개 |
| 허용 MIME 타입 | `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `application/pdf`, `application/vnd.hancom.hwp`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx), `application/zip`, `application/octet-stream` |

### 응답 (200)

```json
{
  "originalName": "보고서.pdf",
  "type": "application/pdf",
  "key": "my-academy/archive/1697012345_aBcDeFgHiJkL.pdf",
  "url": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/archive/1697012345_aBcDeFgHiJkL.pdf",
  "preSignedUrl": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/archive/1697012345_aBcDeFgHiJkL.pdf?X-Amz-Algorithm=...",
  "expiryDate": "2024-01-15T09:05:00.000Z"
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `409` | `LIMIT_FILE_SIZE` | 파일 크기가 5MB를 초과 |
| `409` | `INVALID_FILE_TYPE` | 허용되지 않는 파일 타입 |

---

## 아카이브 파일 서명 URL 조회

아카이브 파일의 다운로드를 위한 Pre-Signed URL을 생성합니다. 아카이브 데이터의 존재 여부와 사용자의 접근 권한을 검증한 후 URL을 반환합니다.

```
GET /api/files/archive/signed
```

**권한**: `isLoggedIn` (로그인 필요)

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `key` | `string` | O | S3 파일 키 (`archive/`로 시작해야 함) |
| `archive` | `string` | O | 아카이브 ObjectId |
| `label` | `string` | O | 아카이브 데이터의 라벨 (양식 항목명) |
| `fieldLabel` | `string` | O | 아카이브 필드 라벨 (필드 항목명) |
| `fileName` | `string` | O | 다운로드 시 파일명 |

### 권한 검증 로직

아카이브 파일 접근 시, 해당 학교의 양식(formArchive) 설정에 따라 역할별 권한을 검증합니다.

| 역할 | 조건 | 설명 |
|------|------|------|
| `manager` | `authManager === "viewAndEdit"` | 매니저 권한으로 바로 접근 가능 |
| 본인(학생) | `authStudent === "view"` 또는 `"viewAndEdit"` | 자신의 아카이브 데이터 접근 가능 |
| 교사 (전체) | `authTeacher === "viewAndEditStudents"` | 같은 학교에 등록된 교사인 경우 접근 가능 |
| 교사 (담당) | `authTeacher === "viewAndEditMyStudents"` | 해당 학생의 담당 교사 또는 부담당 교사인 경우만 접근 가능 |

### 요청 예시

```
GET /api/files/archive/signed?key=my-academy/archive/1697012345_aBcDeFgHiJkL.pdf&archive=507f1f77bcf86cd799439011&label=성적표&fieldLabel=첨부파일&fileName=성적표_첨부.pdf
```

### 응답 (200)

```json
{
  "preSignedUrl": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/archive/1697012345_aBcDeFgHiJkL.pdf?X-Amz-Algorithm=...",
  "expiryDate": "2024-01-15T09:01:00.000Z"
}
```

> **참고**: URL 유효 기간은 60초입니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 쿼리 파라미터 누락 |
| `400` | `FIELD_INVALID(key)` | 키가 `archive/`로 시작하지 않음 |
| `403` | `PERMISSION_DENIED` | 접근 권한 없음 |
| `404` | `ARCHIVE_NOT_FOUND` | 아카이브를 찾을 수 없음 |
| `404` | `SCHOOL_NOT_FOUND` | 학교를 찾을 수 없음 |
| `404` | `FORMITEM_NOT_FOUND` | 양식 항목을 찾을 수 없음 |
| `404` | `FORMITEMFIELD_NOT_FOUND` | 양식 필드를 찾을 수 없음 |

---

## 문서 파일 서명 URL 조회

문서 파일의 다운로드를 위한 Pre-Signed URL을 생성합니다. 별도의 문서 존재 검증 없이 키와 파일명만으로 서명된 URL을 반환합니다.

```
GET /api/files/document/signed
```

**권한**: `isLoggedIn` (로그인 필요)

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `key` | `string` | O | S3 파일 키 |
| `fileName` | `string` | O | 다운로드 시 파일명 |

### 요청 예시

```
GET /api/files/document/signed?key=my-academy/document/report.pdf&fileName=보고서.pdf
```

### 응답 (200)

```json
{
  "preSignedUrl": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/document/report.pdf?X-Amz-Algorithm=...",
  "expiryDate": "2024-01-15T09:01:00.000Z"
}
```

> **참고**: URL 유효 기간은 60초입니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 쿼리 파라미터 누락 (`key` 또는 `fileName`) |

---

## 백업 파일 서명 URL 조회

백업 파일의 다운로드를 위한 Pre-Signed URL을 생성합니다. `owner` 또는 `admin` 권한이 필요하며, 키가 `backup/`으로 시작하는지 검증합니다.

```
GET /api/files/backup/signed
```

**권한**: `owner` 또는 `admin`

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `key` | `string` | O | S3 파일 키 (`backup/`으로 시작해야 함) |
| `fileName` | `string` | O | 다운로드 시 파일명 |

### 요청 예시

```
GET /api/files/backup/signed?key=my-academy/backup/2024-01-15_09:00:00.000/users.json&fileName=users.json
```

### 응답 (200)

```json
{
  "preSignedUrl": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/backup/2024-01-15_09:00:00.000/users.json?X-Amz-Algorithm=...",
  "expiryDate": "2024-01-15T09:01:00.000Z"
}
```

> **참고**: URL 유효 기간은 60초입니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `FIELD_REQUIRED({필드명})` | 필수 쿼리 파라미터 누락 (`key` 또는 `fileName`) |
| `400` | `FIELD_INVALID(key)` | 키가 `backup/`으로 시작하지 않음 |
| `403` | `PERMISSION_DENIED` | `owner` 또는 `admin` 권한 없음 |

---

## 강의계획서 커버 이미지 업로드

강의계획서의 커버 이미지를 업로드합니다. profileBucket의 `original/` 경로에 업로드되며, AWS Lambda가 자동으로 `thumb/` 경로에 썸네일을 생성합니다.

```
PUT /api/syllabuses/:_id/cover-image
```

**권한**: `isLoggedIn` (로그인 필요) - 강의계획서 생성자, 담당 교사, 또는 `manager`

**Content-Type**: `multipart/form-data`

> **라우트 파일**: `backend/src/routes/syllabuses.js`
> **컨트롤러 파일**: `backend/src/controllers/syllabuses.js`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 강의계획서 ObjectId |

### 요청 본문 (FormData)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `img` | `File` | O | 업로드할 이미지 파일 |

### 파일 제한

| 항목 | 제한 |
|------|------|
| 최대 크기 | 2MB |
| 최대 파일 수 | 1개 |
| 허용 MIME 타입 | `image/png`, `image/jpeg`, `image/jpg`, `image/webp` |

### 응답 (200)

```json
{
  "coverImage": "https://s3.ap-northeast-2.amazonaws.com/bucket/thumb/my-academy/courses/507f1f77bcf86cd799439011/507f1f77bcf86cd7.jpg"
}
```

> **참고**: 응답의 `coverImage`는 `thumb/` 경로의 썸네일 URL입니다. `original/` 경로에 업로드된 원본 이미지에서 자동 변환됩니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 생성자, 담당 교사, 매니저가 아닌 경우 |
| `404` | `SYLLABUS_NOT_FOUND` | 강의계획서를 찾을 수 없음 |
| `409` | `LIMIT_FILE_SIZE` | 파일 크기가 2MB를 초과 |
| `409` | `INVALID_FILE_TYPE` | 허용되지 않는 파일 타입 (이미지 외) |

---

## 강의계획서 커버 이미지 삭제

강의계획서의 커버 이미지를 삭제합니다.

```
DELETE /api/syllabuses/:_id/cover-image
```

**권한**: `isLoggedIn` (로그인 필요) - 강의계획서 생성자, 담당 교사, 또는 `manager`

> **라우트 파일**: `backend/src/routes/syllabuses.js`
> **컨트롤러 파일**: `backend/src/controllers/syllabuses.js`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 강의계획서 ObjectId |

### 응답 (200)

```json
{}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `403` | `PERMISSION_DENIED` | 생성자, 담당 교사, 매니저가 아닌 경우 |
| `404` | `SYLLABUS_NOT_FOUND` | 강의계획서를 찾을 수 없음 |

---

## AI 참고자료 업로드

학기(Season)의 AI 설정에 참고자료 파일을 업로드합니다. 파일은 S3에 저장되며, 업로드 후 텍스트 내용을 자동 추출하여 AI 컨텍스트로 활용합니다.

```
POST /api/seasons/:_id/ai/reference/upload
```

**권한**: `admin` 또는 `manager`

**Content-Type**: `multipart/form-data`

> **라우트 파일**: `backend/src/routes/seasons.js`
> **컨트롤러 파일**: `backend/src/controllers/seasons.js`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학기 ObjectId |

### 요청 본문 (FormData)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | `File` | O | 업로드할 참고자료 파일 |
| `title` | `string` | X | 참고자료 제목 (미제공 시 파일명 사용) |

### 파일 제한

| 항목 | 제한 |
|------|------|
| 최대 크기 | 10MB |
| 최대 파일 수 | 1개 |
| 허용 MIME 타입 | `application/pdf`, `application/vnd.hancom.hwp`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (docx), `text/plain`, `application/octet-stream` |

### 응답 (200)

```json
{
  "season": {
    "_id": "507f1f77bcf86cd799439011",
    "aiSettings": {
      "enabled": true,
      "permission": {
        "teacher": true,
        "student": false
      },
      "guidelines": "학생 성적 분석에 참고하세요.",
      "references": [
        {
          "title": "교육과정 가이드",
          "content": "추출된 텍스트 내용...",
          "fileName": "교육과정_가이드.pdf",
          "fileKey": "my-academy/ai-ref/507f1f77bcf86cd799439011/1697012345_aBcDeFgHiJkL.pdf",
          "fileSize": 1048576,
          "mimeType": "application/pdf"
        }
      ]
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `400` | `파일 크기는 10MB를 초과할 수 없습니다.` | 파일 크기 초과 |
| `400` | `지원하지 않는 파일 형식입니다. PDF, DOCX, TXT, HWP 파일만 업로드할 수 있습니다.` | 허용되지 않는 파일 타입 |
| `400` | `FIELD_REQUIRED(file)` | 파일이 첨부되지 않음 |
| `404` | `SEASON_NOT_FOUND` | 학기를 찾을 수 없음 |

---

## AI 참고자료 다운로드

학기에 등록된 AI 참고자료 파일의 다운로드를 위한 Pre-Signed URL을 생성합니다.

```
GET /api/seasons/:_id/ai/reference/:index/download
```

**권한**: `admin` 또는 `manager`

> **라우트 파일**: `backend/src/routes/seasons.js`
> **컨트롤러 파일**: `backend/src/controllers/seasons.js`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학기 ObjectId |
| `index` | `number` | 참고자료 배열 인덱스 (0부터 시작) |

### 응답 (200)

```json
{
  "url": "https://s3.ap-northeast-2.amazonaws.com/bucket/my-academy/ai-ref/507f1f77bcf8/1697012345_aBcDeFgHiJkL.pdf?X-Amz-Algorithm=..."
}
```

> **참고**: URL 유효 기간은 300초(5분)입니다.

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `SEASON_NOT_FOUND` | 학기를 찾을 수 없음 |
| `404` | `REFERENCE FILE_NOT_FOUND` | 해당 인덱스의 참고자료를 찾을 수 없음 |

---

## AI 참고자료 삭제

학기에 등록된 AI 참고자료를 삭제합니다. S3의 파일과 학기 데이터에서 모두 삭제됩니다.

```
DELETE /api/seasons/:_id/ai/reference/:index
```

**권한**: `admin` 또는 `manager`

> **라우트 파일**: `backend/src/routes/seasons.js`
> **컨트롤러 파일**: `backend/src/controllers/seasons.js`

### 경로 파라미터

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `_id` | `string` | 학기 ObjectId |
| `index` | `number` | 참고자료 배열 인덱스 (0부터 시작) |

### 응답 (200)

```json
{
  "season": {
    "_id": "507f1f77bcf86cd799439011",
    "aiSettings": {
      "enabled": true,
      "permission": {
        "teacher": true,
        "student": false
      },
      "guidelines": "학생 성적 분석에 참고하세요.",
      "references": []
    }
  }
}
```

### 에러 응답

| 상태 코드 | 메시지 | 설명 |
|-----------|--------|------|
| `404` | `SEASON_NOT_FOUND` | 학기를 찾을 수 없음 |
| `404` | `REFERENCE_NOT_FOUND` | 해당 인덱스의 참고자료를 찾을 수 없음 |

---

## Pre-Signed URL 메커니즘

Pre-Signed URL은 S3 파일에 대한 임시 접근 권한을 제공합니다.

### URL 생성 방식

```
signUrl(key, filename, seconds)
```

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `key` | - | S3 파일 키 |
| `filename` | - | 다운로드 시 파일명 (Content-Disposition 헤더에 사용) |
| `seconds` | 300 | URL 유효 기간 (초) |

### 엔드포인트별 URL 유효 기간

| 엔드포인트 | 유효 기간 |
|------------|-----------|
| `POST /files/archive` (업로드 응답) | 300초 (5분, 기본값) |
| `GET /files/archive/signed` | 60초 |
| `GET /files/document/signed` | 60초 |
| `GET /files/backup/signed` | 60초 |
| `GET /seasons/:_id/ai/reference/:index/download` | 300초 (5분) |

### 응답 구조

Pre-Signed URL 응답에는 다음이 포함됩니다:

- `preSignedUrl`: 서명된 S3 URL (다운로드 시 `Content-Disposition: attachment` 헤더 포함)
- `expiryDate`: URL 만료 시각 (ISO 8601 형식)

---

## 프론트엔드 API 함수 (useAPIv2)

| 함수명 | 메서드 | 경로 | 설명 |
|--------|--------|------|------|
| `CUploadFileArchive` | POST | `/api/files/archive` | 아카이브 파일 업로드 |
| `RSignedUrlArchive` | GET | `/api/files/archive/signed` | 아카이브 서명 URL 조회 |
| `RSignedUrlDocument` | GET | `/api/files/document/signed` | 문서 서명 URL 조회 |
| `RSignedUrlBackup` | GET | `/api/files/backup/signed` | 백업 서명 URL 조회 |

### 사용 예시

```typescript
const { FileAPI } = useAPIv2();

// 아카이브 파일 업로드
const formData = new FormData();
formData.append("file", file);
const result = await FileAPI.CUploadFileArchive({ data: formData });
// result: { originalName, key, url, preSignedUrl, expiryDate }

// 아카이브 파일 서명 URL 조회
const { preSignedUrl, expiryDate } = await FileAPI.RSignedUrlArchive({
  query: {
    key: "my-academy/archive/1697012345_aBcDeFgHiJkL.pdf",
    archive: "507f1f77bcf86cd799439011",
    label: "성적표",
    fieldLabel: "첨부파일",
    fileName: "성적표_첨부.pdf",
  },
});

// 문서 파일 서명 URL 조회
const { preSignedUrl, expiryDate } = await FileAPI.RSignedUrlDocument({
  query: {
    key: "my-academy/document/report.pdf",
    fileName: "보고서.pdf",
  },
});

// 백업 파일 서명 URL 조회
const { preSignedUrl, expiryDate } = await FileAPI.RSignedUrlBackup({
  query: {
    key: "my-academy/backup/2024-01-15_09:00:00.000/users.json",
    fileName: "users.json",
  },
});
```
