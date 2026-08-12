# 파일 저장소

Altsis의 AWS S3 기반 파일 저장소 아키텍처를 설명합니다. 프로필 사진, 학생 기록 파일, 채팅 파일, 수업 커버 이미지, 로그 등 다양한 종류의 파일을 관리합니다.

---

## 아키텍처 개요

Altsis는 **3개의 AWS S3 버킷**을 용도별로 분리하여 운영합니다.

```
┌────────────────────────────────────────────────────────────────┐
│                       클라이언트 (브라우저)                       │
└─────────┬──────────────────┬──────────────────┬───────────────┘
          │ 업로드            │ 다운로드           │ 이미지 표시
          │ (Multer)         │ (Pre-signed URL) │ (CloudFront)
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  Express 서버    │  │  Express 서버    │  │    CloudFront CDN   │
│  (Multer-S3)    │  │  (URL 서명)     │  │                     │
└────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌────────────────────────────────────────────────────────────────┐
│                        AWS S3 버킷                              │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ 프로필 버킷    │  │  파일 버킷    │  │   로그 버킷       │     │
│  │ (이미지)      │  │ (문서/파일)   │  │  (서버 로그)      │     │
│  └──────┬───────┘  └──────────────┘  └────────┬─────────┘     │
│         │                                      │               │
│         ▼                                      ▼               │
│  ┌──────────────┐                       ┌──────────────────┐  │
│  │ AWS Lambda   │                       │   AWS Lambda     │  │
│  │ (리사이징)    │                       │  (로그 아카이빙)  │  │
│  └──────────────┘                       └──────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## S3 버킷 구조

### 1. 프로필 버킷 (이미지)

프로필 사진과 수업 커버 이미지를 저장합니다. Lambda 트리거를 통해 자동으로 썸네일이 생성됩니다.

```
프로필 버킷/
├── original/                           # 원본 이미지
│   ├── {academyId}/
│   │   ├── {userId}/                   # 사용자 프로필 사진
│   │   │   └── {objectId}{ext}         #   예: 65a1b2c3d4e5.jpg
│   │   └── courses/
│   │       └── {syllabusId}/           # 수업 커버 이미지
│   │           └── {objectId}.{ext}    #   예: 65f6g7h8i9j0.png
│   └── ...
│
└── thumb/                              # 썸네일 (Lambda 자동 생성)
    ├── {academyId}/
    │   ├── {userId}/                   # 리사이징된 프로필 사진
    │   │   └── {objectId}{ext}
    │   └── courses/
    │       └── {syllabusId}/           # 리사이징된 커버 이미지
    │           └── {objectId}.{ext}
    └── ...
```

**Lambda 트리거 동작:**

```
원본 업로드                      Lambda 트리거                  썸네일 생성
/original/{path}/{file}  ──►  이미지 리사이징 함수  ──►  /thumb/{path}/{file}
```

> [!NOTE]
> `original/` 디렉토리에 파일이 업로드되면 AWS Lambda가 자동으로 트리거되어 `thumb/` 디렉토리에 리사이징된 버전을 생성합니다. 클라이언트는 목록 조회 시 썸네일을, 상세 조회 시 원본을 사용합니다.

### 2. 파일 버킷 (문서/파일)

학생 기록 파일, 채팅 파일, AI 참고자료 등 일반 파일을 저장합니다.

```
파일 버킷/
├── {academyId}/
│   ├── archive/                        # 학생 기록 첨부파일
│   │   └── {timestamp}_{random}.{ext}  #   예: 1708142400000_aB3cD4eF5gH6.pdf
│   │
│   ├── chat/                           # 채팅 파일
│   │   └── {roomId}/
│   │       └── {timestamp}_{random}.{ext}
│   │
│   ├── ai-ref/                         # AI 참고자료
│   │   └── {seasonId}/
│   │       └── {timestamp}_{random}.{ext}
│   │
│   └── backup/                         # 백업 파일
│       └── ...
└── ...
```

### 3. 로그 버킷 (서버 로그)

서버의 HTTP 요청 로그를 저장합니다. Lambda를 통해 날짜별로 아카이빙됩니다.

```
로그 버킷/
├── raw/                                # 실시간 로그 (서버에서 직접 업로드)
│   └── {logfile}
│
└── {yyyy-mm-dd}/                       # 아카이빙된 로그 (Lambda 처리)
    └── {logfile}                       #   예: 2024-03-15/access.log
```

**Lambda 아카이빙 동작:**

```
실시간 로그               Lambda 스케줄                날짜별 아카이빙
/raw/{logfile}  ──►  일별 아카이빙 함수  ──►  /{yyyy-mm-dd}/{logfile}
```

---

## Multer 업로드 설정

Altsis는 **Multer** + **Multer-S3**를 사용하여 파일을 S3에 직접 업로드합니다. 용도별로 5개의 Multer 인스턴스가 정의되어 있습니다.

### Multer 인스턴스 요약

| Multer | 대상 버킷 | 저장 경로 | 최대 크기 | 허용 파일 |
|--------|----------|-----------|-----------|-----------|
| `profileMulter` | 프로필 버킷 | `original/{academyId}/{userId}/` | 2MB | 이미지 (PNG, JPEG, WebP) |
| `courseMulter` | 프로필 버킷 | `original/{academyId}/courses/{syllabusId}/` | 2MB | 이미지 (PNG, JPEG, WebP) |
| `archiveMulter` | 파일 버킷 | `{academyId}/archive/` | 5MB | 이미지, PDF, HWP, XLSX, DOCX, ZIP |
| `chatMulter` | 파일 버킷 | `{academyId}/chat/{roomId}/` | 20MB | 이미지, PDF, HWP, XLSX, DOCX, ZIP, TXT |
| `aiRefMulter` | 파일 버킷 | `{academyId}/ai-ref/{seasonId}/` | 10MB | PDF, HWP, DOCX, TXT |

### 허용 MIME 타입 상세

#### 이미지 전용 (프로필, 수업 커버)

| MIME 타입 | 확장자 |
|-----------|--------|
| `image/png` | .png |
| `image/jpeg` | .jpeg, .jpg |
| `image/webp` | .webp |

#### 문서 포함 (기록, 채팅, AI 참고자료)

| MIME 타입 | 확장자 | 설명 |
|-----------|--------|------|
| `image/png` | .png | PNG 이미지 |
| `image/jpeg` | .jpeg, .jpg | JPEG 이미지 |
| `image/webp` | .webp | WebP 이미지 |
| `image/gif` | .gif | GIF 이미지 (채팅만) |
| `application/pdf` | .pdf | PDF 문서 |
| `application/vnd.hancom.hwp` | .hwp | 한컴오피스 한글 |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | .xlsx | Excel 스프레드시트 |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | .docx | Word 문서 |
| `application/zip` | .zip | ZIP 압축 파일 |
| `text/plain` | .txt | 텍스트 파일 (채팅, AI만) |
| `application/octet-stream` | - | 바이너리 파일 |

### 파일 이름 생성 규칙

보안과 충돌 방지를 위해 원본 파일 이름 대신 고유한 키를 생성합니다.

| Multer | 키 생성 규칙 | 예시 |
|--------|-------------|------|
| `profileMulter` | `original/{academyId}/{userId}/{ObjectId}{ext}` | `original/bmr/user01/65a1b2c3d4e5jpg` |
| `courseMulter` | `original/{academyId}/courses/{syllabusId}/{ObjectId}.{ext}` | `original/bmr/courses/syl01/65f6g7h8.png` |
| `archiveMulter` | `{academyId}/archive/{timestamp}_{random}.{ext}` | `bmr/archive/1708142400000_aB3cD4eF.pdf` |
| `chatMulter` | `{academyId}/chat/{roomId}/{timestamp}_{random}.{ext}` | `bmr/chat/room01/1708142400000_xY9z.jpg` |
| `aiRefMulter` | `{academyId}/ai-ref/{seasonId}/{timestamp}_{random}.{ext}` | `bmr/ai-ref/season01/1708142400000_kL2m.pdf` |

---

## Pre-signed URL 다운로드

파일 다운로드는 **Pre-signed URL** 방식을 사용합니다. 서버가 제한된 유효 시간을 가진 서명된 URL을 생성하여 클라이언트에 전달하고, 클라이언트는 이 URL로 S3에서 직접 다운로드합니다.

### 동작 흐름

```
┌──────────┐   1. 다운로드 요청    ┌──────────┐
│          ├─────────────────────►│          │
│          │                      │          │  2. Pre-signed URL 생성
│ 클라이언트│   3. URL 응답        │  Express │     (5분 만료)
│          │◄─────────────────────┤  서버    │
│          │                      │          │
│          │   4. URL로 직접 다운로드│          │
│          ├──────────────────────────────────────────►┌─────────┐
│          │                      │          │        │  AWS S3  │
│          │◄─────────────────────────────────────────┤         │
│          │   5. 파일 데이터      │          │        └─────────┘
└──────────┘                      └──────────┘
```

### Pre-signed URL 생성 코드

```javascript
// backend/src/_s3/fileBucket.js
const signedUrlExpireSeconds = 60 * 5;  // 5분

export const signUrl = (key, filename, seconds = signedUrlExpireSeconds) => {
  const preSignedUrl = fileS3.getSignedUrl("getObject", {
    Bucket: fileBucket,
    Key: key,
    Expires: seconds,
    ResponseContentDisposition: `attachment; filename="${encodeURI(filename)}"`,
  });

  // 만료 시간 계산
  const params = new URL(preSignedUrl).searchParams;
  const creationDate = parseISO(params.get("X-Amz-Date"));
  const expiresInSecs = Number(params.get("X-Amz-Expires"));
  const expiryDate = addSeconds(creationDate, expiresInSecs);

  return { preSignedUrl, expiryDate };
};
```

### URL 유형

| 함수 | 용도 | Content-Disposition | 만료 시간 |
|------|------|---------------------|-----------|
| `signUrl` | 파일 다운로드 | `attachment` (강제 다운로드) | 5분 |
| `signUrlForView` | 인라인 보기 | 없음 (브라우저 표시) | 5분 |

> [!IMPORTANT]
> Pre-signed URL은 생성 후 5분이 지나면 만료됩니다. 클라이언트는 만료 시간(`expiryDate`)을 함께 받아 URL 갱신 시점을 판단할 수 있습니다.

---

## 파일 업로드 보안

### 파일 검증

모든 Multer 인스턴스는 `fileFilter`를 통해 업로드 전에 MIME 타입을 검증합니다.

```javascript
fileFilter: async (req, file, cb) => {
  if (!whitelist.includes(file.mimetype)) {
    const err = new Error(FIELD_INVALID("file"));
    err.code = "INVALID_FILE_TYPE";
    return cb(err);  // 업로드 거부
  }
  cb(null, true);    // 업로드 허용
};
```

### 보안 정책 요약

| 항목 | 정책 |
|------|------|
| 파일 크기 제한 | Multer별 `limits.fileSize` 설정 |
| 파일 수 제한 | 요청당 1개 (`limits.files: 1`) |
| MIME 타입 검증 | 화이트리스트 기반 허용 |
| 파일 이름 | 원본 이름 대신 고유 키 생성 |
| 다운로드 URL | 5분 만료 Pre-signed URL |
| 파일 이름 인코딩 | `latin1` -> `utf8` 변환 (한글 파일명 지원) |
| 접근 제어 | `acl: "public-read"` (S3 버킷 정책으로 제어) |

---

## 소스 파일 참조

| 파일 | 설명 |
|------|------|
| `backend/src/_s3/profileBucket.js` | 프로필 버킷 S3 클라이언트 |
| `backend/src/_s3/fileBucket.js` | 파일 버킷 S3 클라이언트 + Pre-signed URL 생성 |
| `backend/src/_s3/profileMulter.js` | 프로필 이미지 업로드 설정 |
| `backend/src/_s3/courseMulter.js` | 수업 커버 이미지 업로드 설정 |
| `backend/src/_s3/archiveMulter.js` | 기록 파일 업로드 설정 |
| `backend/src/_s3/chatMulter.js` | 채팅 파일 업로드 설정 |
| `backend/src/_s3/aiRefMulter.js` | AI 참고자료 업로드 설정 |

---

## 다음 단계

- [시스템 개요](overview.md) - 전체 기술 스택 및 아키텍처
- [데이터베이스 설계](database.md) - 파일 메타데이터가 저장되는 DB 구조
