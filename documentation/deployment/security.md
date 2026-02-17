# 보안

Altsis 시스템의 보안 정책, 암호화 체계, 접근 제어 및 보안 모범 사례를 설명합니다.

---

## 개요

Altsis는 학생 개인정보와 교육 데이터를 다루는 시스템으로, 다층 보안 전략을 적용합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Altsis 보안 체계                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ 통신 보안 ────────────────────────────────────────────────┐ │
│  │  HTTPS (ACM + CloudFront/ALB)                              │ │
│  │  CORS 도메인 제한                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 인증 보안 ────────────────────────────────────────────────┐ │
│  │  Passport.js (로컬 + Google OAuth 2.0)                     │ │
│  │  Redis 기반 세션 관리 (TTL 24시간)                           │ │
│  │  미들웨어 기반 권한 체크                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 데이터 보안 ──────────────────────────────────────────────┐ │
│  │  bcrypt 비밀번호 해싱                                       │ │
│  │  mongoose-encryption 필드 암호화                             │ │
│  │  S3 Pre-signed URL (5분 만료)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ 인프라 보안 ──────────────────────────────────────────────┐ │
│  │  보안 그룹, IAM 최소 권한                                    │ │
│  │  환경 변수 암호화 관리                                       │ │
│  │  S3 버킷 접근 제어                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 데이터 암호화

### 비밀번호 해싱 (bcrypt)

사용자 비밀번호는 bcrypt 알고리즘으로 해싱되어 저장됩니다. 원문 비밀번호는 어디에도 저장되지 않습니다.

| 항목 | 설명 |
|------|------|
| 알고리즘 | bcrypt |
| Salt Rounds | 환경 변수 `saltRounts`로 설정 (권장: 10 이상) |
| 적용 시점 | 사용자 생성 및 비밀번호 변경 시 자동 적용 |
| 모델 | `User` |

#### 해싱 프로세스

```
비밀번호 입력
    │
    ▼
bcrypt.genSalt(saltRounds)  ← 랜덤 Salt 생성
    │
    ▼
bcrypt.hash(password, salt) ← Salt + 비밀번호 해싱
    │
    ▼
해싱된 값 DB에 저장
```

#### 비밀번호 검증 프로세스

```
로그인 시 비밀번호 입력
    │
    ▼
bcrypt.compare(plainPassword, hashedPassword)
    │
    ├─ true → 인증 성공
    └─ false → 인증 실패
```

> [!NOTE]
> bcrypt는 내부적으로 Salt를 해시값에 포함시키므로 별도의 Salt 저장이 필요하지 않습니다. Salt Rounds 값이 높을수록 보안이 강화되지만 연산 시간이 증가합니다.

### 평가 정보 암호화 (mongoose-encryption)

수강 등록(Enrollment) 모델의 평가(evaluation) 필드는 mongoose-encryption으로 암호화됩니다.

| 항목 | 설명 |
|------|------|
| 모델 | `Enrollment` |
| 암호화 필드 | `evaluation` |
| 암호화 키 | `ENCKEY_E` (32바이트 Base64) |
| 서명 키 | `SIGKEY_E` (64바이트 Base64) |
| 알고리즘 | AES-256-CBC (암호화) + HMAC-SHA-512 (서명) |

```javascript
// backend/src/models/Enrollment.js
enrollmentSchema.plugin(encrypt, {
  encryptionKey: process.env["ENCKEY_E"],
  signingKey: process.env["SIGKEY_E"],
  encryptedFields: ["evaluation"],
});
```

### 학생 기록 암호화 (mongoose-encryption)

학생 기록(Archive) 모델의 데이터(data) 필드는 별도의 키 쌍으로 암호화됩니다.

| 항목 | 설명 |
|------|------|
| 모델 | `Archive` |
| 암호화 필드 | `data` |
| 암호화 키 | `ENCKEY_A` (32바이트 Base64) |
| 서명 키 | `SIGKEY_A` (64바이트 Base64) |
| 알고리즘 | AES-256-CBC (암호화) + HMAC-SHA-512 (서명) |

```javascript
// backend/src/models/Archive.js
archiveSchema.plugin(encrypt, {
  encryptionKey: process.env["ENCKEY_A"],
  signingKey: process.env["SIGKEY_A"],
  encryptedFields: ["data"],
});
```

> [!CAUTION]
> **암호화 키 관리 주의사항**
>
> - 암호화 키를 분실하면 암호화된 데이터를 복구할 수 없습니다
> - 키는 반드시 안전한 곳에 별도로 백업해야 합니다
> - 평가 정보와 학생 기록에 서로 다른 키 쌍을 사용하여 격리합니다
> - 키 교체 시에는 기존 데이터를 먼저 복호화한 후 새 키로 재암호화해야 합니다

### 암호화 키 생성 방법

```bash
# 암호화 키 생성 (32바이트 Base64)
openssl rand -base64 32

# 서명 키 생성 (64바이트 Base64)
openssl rand -base64 64
```

---

## 세션 보안

### Redis 기반 세션 관리

사용자 세션은 Redis에 저장되며, 다음과 같은 보안 설정이 적용됩니다.

| 항목 | 설정 | 설명 |
|------|------|------|
| 저장소 | Redis Cloud (`connect-redis`) | 메모리 기반 빠른 세션 접근 |
| TTL | 24시간 (`86400`초) | 세션 만료 시간 |
| 세션 키 | `session_key` 환경 변수 | 세션 쿠키 서명에 사용 |
| httpOnly | `true` | JavaScript에서 쿠키 접근 차단 |
| resave | `false` | 변경되지 않은 세션 재저장 방지 |
| saveUninitialized | `false` | 초기화되지 않은 세션 저장 방지 |
| rolling | `true` | 요청마다 세션 만료 시간 갱신 |

```javascript
// backend/src/app.js
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env["session_key"].trim(),
    cookie: {
      httpOnly: true,
      secure: false,  // ALB에서 HTTPS 종료 후 HTTP로 전달되므로
    },
    rolling: true,
    store: new RedisStore({
      client: redisClient,
      ttl: 24 * 60 * 60,  // 24시간
    }),
  })
);
```

### 세션 라이프사이클

```
로그인 성공
    │
    ▼
세션 생성 → Redis에 저장 (TTL: 24시간)
    │
    ▼
세션 쿠키 클라이언트에 전달 (httpOnly)
    │
    ▼
이후 요청마다 세션 확인 + TTL 갱신 (rolling)
    │
    ├─ 24시간 미활동 → 세션 자동 만료
    └─ 로그아웃 → 세션 명시적 삭제
```

### CORS 설정

허용된 도메인에서만 API에 접근할 수 있도록 CORS를 제한합니다.

```javascript
// backend/src/app.js
app.use(
  cors({
    origin: process.env["URL"].trim(),  // 허용할 클라이언트 URL
    credentials: true,                   // 쿠키 전송 허용
  })
);
```

| 항목 | 설명 |
|------|------|
| `origin` | 환경 변수 `URL`에 설정된 클라이언트 도메인만 허용 |
| `credentials` | `true` - 세션 쿠키를 포함한 요청 허용 |

> [!IMPORTANT]
> CORS `origin`에는 정확한 클라이언트 URL을 설정해야 합니다. 와일드카드(`*`)를 사용하면 `credentials: true`와 함께 작동하지 않으며, 보안상으로도 위험합니다.

---

## 통신 보안

### HTTPS 구성

모든 클라이언트-서버 통신은 HTTPS로 암호화됩니다.

| 구간 | HTTPS 처리 | 인증서 |
|------|-----------|--------|
| 클라이언트 → CloudFront | CloudFront에서 HTTPS 종료 | ACM (us-east-1) |
| 클라이언트 → ALB | ALB에서 HTTPS 종료 | ACM (서비스 리전) |
| ALB → EC2 | HTTP (내부 네트워크) | - |

```
[클라이언트] ─── HTTPS ───→ [CloudFront/ALB] ─── HTTP ───→ [EC2]
                                    │
                              ACM 인증서로
                              TLS 종료
```

### S3 Pre-signed URL

S3에 저장된 파일은 직접 접근할 수 없으며, Pre-signed URL을 통해서만 접근합니다.

| 항목 | 설정 |
|------|------|
| 만료 시간 | 5분 (`300`초) |
| 서명 방식 | AWS Signature V4 |
| 용도 | 파일 다운로드 URL 생성 |

```javascript
// backend/src/_s3/fileBucket.js
const signedUrlExpireSeconds = 60 * 5; // 5분

export const signUrl = (key, filename, seconds = signedUrlExpireSeconds) => {
  const preSignedUrl = fileS3.getSignedUrl("getObject", {
    Bucket: fileBucket,
    Key: key,
    Expires: seconds,
    ResponseContentDisposition: `attachment; filename="${encodeURI(filename)}"`,
  });
  // ...
};
```

Pre-signed URL의 동작 방식:

```
1. 사용자가 파일 다운로드 요청
2. 서버에서 S3 Pre-signed URL 생성 (5분 유효)
3. 클라이언트에 URL 전달
4. 클라이언트가 URL로 S3에 직접 다운로드
5. 5분 후 URL 자동 만료
```

---

## 인증 보안

### Passport.js 기반 인증

Altsis는 Passport.js를 사용하여 두 가지 인증 전략을 지원합니다.

| 전략 | 파일 | 설명 |
|------|------|------|
| Local Strategy | `_passport/localStrategy2.js` | 아이디/비밀번호 로그인 |
| Google Strategy | `_passport/googleStrategy2.js` | Google OAuth 2.0 로그인 |

### 인증 흐름

#### 로컬 인증

```
사용자 → 아이디 + 비밀번호 입력
    │
    ▼
Passport Local Strategy
    │
    ├─ User 모델에서 사용자 조회
    ├─ bcrypt.compare()로 비밀번호 검증
    │
    ├─ 성공 → serializeUser → 세션 생성
    └─ 실패 → 에러 응답
```

#### Google OAuth 2.0 인증

```
사용자 → Google 로그인 버튼 클릭
    │
    ▼
Google OAuth 인증 페이지 리다이렉트
    │
    ▼
사용자 → Google 계정으로 로그인
    │
    ▼
Google → 콜백 URL로 리다이렉트 (인증 코드 포함)
    │
    ▼
Passport Google Strategy
    │
    ├─ 인증 코드로 사용자 정보 조회
    ├─ 기존 사용자와 매칭
    │
    ├─ 성공 → serializeUser → 세션 생성
    └─ 실패 → 에러 응답
```

### 세션 직렬화/역직렬화

```javascript
// 직렬화: 세션에 최소 정보만 저장
passport.serializeUser(({ user, academyId }, done) => {
  done(null, { _id: user._id, academyId });
});

// 역직렬화: 매 요청마다 세션에서 사용자 정보 복원
passport.deserializeUser(({ _id, academyId }, done) => {
  User(academyId).findOne({ _id }, (err, user) => {
    user["academyId"] = academyId;
    done(null, user);
  });
});
```

### 미들웨어 기반 권한 체크

API 요청은 사용자 역할에 따라 접근이 제한됩니다.

| 역할 | 코드 | 권한 범위 |
|------|------|-----------|
| Owner | `owner` | 시스템 전체 관리 |
| Admin | `admin` | 아카데미 관리 |
| Manager | `manager` | 학교 관리 |
| Member | `member` | 일반 사용자 기능 |
| Guest | (미인증) | 공개 API만 접근 가능 |

```
HTTP 요청
    │
    ▼
세션 확인 (req.isAuthenticated())
    │
    ├─ 미인증 → Guest 처리 또는 403 응답
    │
    └─ 인증됨 → 역할 확인 (req.user.auth)
        │
        ├─ 권한 충분 → 요청 처리
        └─ 권한 부족 → 403 Forbidden
```

---

## 파일 보안

### S3 버킷 접근 제어

| 버킷 | 접근 방식 | 설명 |
|------|-----------|------|
| 클라이언트 버킷 | Public Read | 정적 파일 서빙 (CloudFront 경유) |
| 파일 버킷 | Private | Pre-signed URL을 통한 인증된 접근만 허용 |
| 로그 버킷 | Private | 서버에서만 쓰기, 관리자만 읽기 |

### IAM 최소 권한 원칙

각 서비스에 필요한 최소한의 권한만 부여합니다.

#### CI/CD용 IAM 사용자

| 서비스 | 허용 작업 | 대상 리소스 |
|--------|-----------|-------------|
| S3 | `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` | 클라이언트 버킷 |

#### 백엔드 서버용 IAM 사용자

| 서비스 | 허용 작업 | 대상 리소스 |
|--------|-----------|-------------|
| S3 | `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` | 파일 버킷 |
| S3 | `s3:PutObject` | 로그 버킷 |

### 파일 업로드 보안

| 항목 | 설정 |
|------|------|
| 파일 크기 제한 | Multer 설정에 따름 |
| 파일 타입 검증 | MIME 타입 체크 |
| 저장 경로 | 아카데미 ID로 격리 (`{academyId}/archive/...`) |

---

## 환경 변수 관리

### .env 파일 보안

| 규칙 | 설명 |
|------|------|
| `.gitignore` 포함 | `.env` 파일이 Git에 커밋되지 않도록 보장 |
| 로컬 관리 | 개발자가 로컬에서 직접 생성 및 관리 |
| 공유 금지 | 슬랙, 이메일 등으로 환경 변수 공유 금지 |

### GitHub Secrets 활용

| 특성 | 설명 |
|------|------|
| 암호화 저장 | GitHub이 Secrets을 암호화하여 저장 |
| 워크플로우에서만 접근 | GitHub Actions 실행 시에만 복호화 |
| 로그 마스킹 | 워크플로우 로그에서 자동으로 마스킹 처리 |
| 접근 제한 | 리포지토리 관리자만 설정 가능 |

### 민감 정보 분류

| 등급 | 환경 변수 | 유출 시 영향 |
|------|-----------|-------------|
| 최고 | `ENCKEY_*`, `SIGKEY_*` | 암호화된 학생 데이터 복호화 가능 |
| 높음 | `DB_URL`, `REDIS_URL` | 데이터베이스 직접 접근 가능 |
| 높음 | `s3_secretAccessKey*` | S3 버킷 접근 가능 |
| 중간 | `session_key` | 세션 위조 가능성 |
| 중간 | `GOOGLE_CLIENT_ID` | OAuth 인증 악용 가능성 |
| 낮음 | `SERVER_PORT`, `S3_REGION` | 시스템 구성 정보 노출 |

---

## 보안 체크리스트

### 배포 전 체크리스트

- [ ] 모든 환경 변수가 GitHub Secrets에 등록되어 있는가
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가
- [ ] HTTPS가 클라이언트와 서버 모두에 적용되어 있는가
- [ ] CORS origin이 정확한 클라이언트 URL로 설정되어 있는가
- [ ] MongoDB Atlas 네트워크 접근이 EC2 IP로 제한되어 있는가
- [ ] S3 버킷 정책이 최소 권한으로 설정되어 있는가
- [ ] IAM 사용자에 최소 권한만 부여되어 있는가
- [ ] bcrypt salt rounds가 10 이상으로 설정되어 있는가
- [ ] 암호화 키가 안전하게 백업되어 있는가

### 정기 보안 점검 항목

- [ ] GitHub Personal Access Token 만료 여부 확인
- [ ] AWS IAM 접근 키 교체 (90일 주기 권장)
- [ ] S3 버킷 퍼블릭 접근 설정 확인
- [ ] MongoDB Atlas 네트워크 접근 목록 검토
- [ ] 사용하지 않는 사용자 계정 비활성화
- [ ] 서버 로그에서 비정상 접근 패턴 확인
- [ ] Node.js 의존성 보안 취약점 스캔 (`npm audit`)
- [ ] Docker 이미지 보안 스캔

### 인시던트 대응 체크리스트

환경 변수나 키가 유출된 경우:

1. - [ ] 유출된 키/토큰 즉시 무효화
2. - [ ] 새 키/토큰 생성 및 교체
3. - [ ] GitHub Secrets 업데이트
4. - [ ] 서버 재배포
5. - [ ] 접근 로그 분석 (유출 기간 동안의 비정상 접근 확인)
6. - [ ] 영향받은 데이터 범위 파악
7. - [ ] 필요 시 사용자 비밀번호 강제 변경
8. - [ ] 인시던트 보고서 작성

---

## 보안 취약점 보고

Altsis의 보안 취약점을 발견한 경우, 다음 채널로 보고해 주세요.

| 항목 | 연락처 |
|------|--------|
| GitHub | [@devgoodway](https://github.com/devgoodway) |
| 보고 방식 | GitHub Issue (Private) 또는 직접 연락 |

### 보고 시 포함할 내용

- 취약점 유형 (예: XSS, CSRF, 인증 우회 등)
- 재현 절차 (단계별)
- 영향 범위
- 가능한 경우, 개선 방안 제안

> [!WARNING]
> 보안 취약점은 공개 Issue로 등록하지 마세요. 반드시 비공개 채널을 통해 보고해 주세요. 취약점이 수정될 때까지 공개를 자제해 주시면 감사하겠습니다.
