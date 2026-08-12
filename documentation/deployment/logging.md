# 로깅 및 모니터링

Altsis 서버의 로그 수집, 저장, 아카이빙 및 분석 체계를 설명합니다.

---

## 개요

Altsis는 winston, morgan, s3-streamlogger-daily를 조합하여 구조화된 로그를 생성하고, 환경에 따라 로컬 파일 또는 AWS S3에 로그를 저장합니다. 프로덕션 환경에서는 AWS Lambda 스케줄러가 매일 자정에 로그를 아카이빙합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Altsis 로깅 아키텍처                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [HTTP 요청] → Morgan → Winston Logger                          │
│                             │                                   │
│              ┌──────────────┼──────────────┐                    │
│              │              │              │                    │
│              ▼              ▼              ▼                    │
│         http 레벨       info 레벨      error 레벨               │
│              │              │              │                    │
│    ┌─────────┴──────────────┴──────────────┘                    │
│    │                                                            │
│    ├─ [로컬] → backend/logs/{날짜}.log                           │
│    │                                                            │
│    └─ [배포] → S3 altsis-logs/raw/{날짜} {instanceId}.log       │
│                         │                                       │
│                         ▼ (매일 자정)                             │
│                 Lambda 스케줄러                                   │
│                         │                                       │
│                         ▼                                       │
│              S3 altsis-logs/archived/yyyy-mm-dd/                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 로깅 모듈

### 사용 라이브러리

| 모듈 | 버전 | 역할 |
|------|------|------|
| `winston` | - | 핵심 로깅 프레임워크, 다중 전송 채널 지원 |
| `winston-daily-rotate-file` | - | 일별 로그 파일 회전 (로컬/S3) |
| `morgan` | - | Express.js HTTP 요청 로깅 미들웨어 |
| `s3-streamlogger-daily` | - | S3에 직접 로그 스트리밍 (프로덕션) |
| `strftime` | - | 로그 파일명 시간 포맷팅 (KST) |

### 로거 구조

```
backend/src/log/
├── logger.js        ← 환경별 로거 선택 (진입점)
├── devLogger.js     ← 로컬 개발 환경 로거
└── prodLogger.js    ← 프로덕션 환경 로거
```

`logger.js`는 `NODE_ENV` 환경 변수에 따라 적절한 로거를 선택합니다.

```javascript
const logger = process.env.NODE_ENV === "production" ? prodLogger : devLogger;
```

---

## 로컬 환경 로깅 (devLogger)

개발 환경에서는 `backend/logs/` 폴더에 일별 로그 파일을 생성합니다.

### 로그 파일 구성

| 파일 패턴 | 로그 레벨 | 설명 |
|-----------|----------|------|
| `{YYYY-MM-DD}.log` | `http` 이상 | 모든 HTTP 요청 로그 |
| `{YYYY-MM-DD}.info.log` | `info` 이상 | 주요 정보 로그 |
| `{YYYY-MM-DD}.error.log` | `error` 이상 | 오류 로그만 기록 |

### 로그 파일 관리 정책

| 항목 | 설정 |
|------|------|
| 파일 회전 주기 | 매일 (일별 파일 생성) |
| 최대 파일 크기 | 20MB |
| 보관 기간 | 7일 |
| 압축 | 활성화 (zippedArchive) |

### 로컬 로그 파일 예시

```
backend/logs/
├── 2026-02-17.log           ← 오늘의 전체 로그
├── 2026-02-17.info.log      ← 오늘의 info 레벨 로그
├── 2026-02-17.error.log     ← 오늘의 error 레벨 로그
├── 2026-02-16.log.gz        ← 어제의 전체 로그 (압축)
├── 2026-02-16.info.log.gz
└── 2026-02-16.error.log.gz
```

---

## 배포 환경 로깅 (prodLogger)

프로덕션 환경에서는 S3 로그 버킷(`altsis-logs`)에 직접 로그를 스트리밍합니다.

### S3 로그 버킷 구조

```
altsis-logs/
├── raw/                                          ← 실시간 로그
│   ├── 2026-02-17 09:00:00 65a1b2c3d4e5f6.log
│   ├── 2026-02-17 09:00:00 65a1b2c3d4e5f6.info.log
│   ├── 2026-02-17 09:00:00 65a1b2c3d4e5f6.error.log
│   └── ...
│
└── archived/                                     ← 아카이빙된 로그
    ├── 2026-02-16/
    │   ├── 2026-02-16 09:00:00 65a1b2c3d4e5f6.log
    │   ├── 2026-02-16 09:00:00 65a1b2c3d4e5f6.info.log
    │   └── ...
    ├── 2026-02-15/
    │   └── ...
    └── ...
```

### 로그 파일 명명 규칙

```
{날짜} {instanceId}.{레벨}.log
```

| 구성 요소 | 형식 | 예시 | 설명 |
|-----------|------|------|------|
| 날짜 | `YYYY-MM-DD HH:mm:ss` | `2026-02-17 09:00:00` | KST 기준 서버 시작 시각 |
| instanceId | MongoDB ObjectId | `65a1b2c3d4e5f6` | 서버 인스턴스 고유 식별자 |
| 레벨 | `info`, `error` 또는 생략 | `.info` | 생략 시 `http` 레벨 (전체 로그) |

> [!NOTE]
> `instanceId`는 서버가 시작될 때마다 새로 생성되는 MongoDB ObjectId입니다. 이를 통해 서버 재시작 전후의 로그를 구분할 수 있습니다.

### S3 로그 설정

| 항목 | 설정 |
|------|------|
| 버킷 | `altsis-logs` |
| 폴더 | `raw` |
| 회전 주기 | 매일 (`rotate_every: "day"`) |
| 최대 파일 크기 | 2GB (`max_file_size: 2000000000`) |
| 타임존 | KST (+09:00) |
| 인증 | `s3_accessKeyId2` / `s3_secretAccessKey2` |

### 로그 아카이빙 (Lambda 스케줄러)

매일 자정(KST)에 AWS Lambda 스케줄러가 실행되어 전날의 로그를 아카이빙합니다.

```
[매일 자정] Lambda 스케줄러 실행
       │
       ▼
  raw/ 폴더에서 전날 날짜의 로그 파일 검색
       │
       ▼
  archived/yyyy-mm-dd/ 폴더로 이동
       │
       ▼
  raw/ 폴더에서 원본 삭제
```

| 항목 | 설정 |
|------|------|
| 트리거 | CloudWatch Events (cron: `0 15 * * ? *`, UTC 15:00 = KST 00:00) |
| 동작 | `raw/` 폴더의 전날 로그를 `archived/yyyy-mm-dd/`로 이동 |
| 보관 정책 | 필요에 따라 S3 Lifecycle 정책 설정 |

---

## 로그 구성 필드

### Morgan 커스텀 포맷

HTTP 요청이 들어올 때 Morgan 미들웨어가 다음 필드를 CSV 형식으로 기록합니다.

```
{timestamp},{level},{HTTP버전},{IP},{academyId},{userId},{메서드},{URL},"{req.body}",{상태코드},{응답시간},"{referrer}","{user-agent}"
```

### 필드 상세

| 순서 | 필드 | 예시 | 설명 |
|------|------|------|------|
| 1 | 요청 시각 | `2026-02-17 09:30:45` | Winston 타임스탬프 (YYYY-MM-DD HH:mm:ss) |
| 2 | 로그 레벨 | `http` | Winston 로그 레벨 |
| 3 | HTTP 버전 | `HTTP/1.1` | 요청 HTTP 프로토콜 버전 |
| 4 | IP 주소 | `192.168.1.100` | 요청자 IP (프록시 경유 시 X-Forwarded-For) |
| 5 | academyId | `bmr` 또는 `undefined` | 로그인 사용자의 아카데미 ID |
| 6 | userId | `65a1b2c3...` 또는 `undefined` | 로그인 사용자의 MongoDB _id |
| 7 | HTTP 메서드 | `POST`, `GET`, `PUT`, `DELETE` | 요청 메서드 |
| 8 | URL | `/api/users/current` | 요청 경로 |
| 9 | req.body | `"{"userId":"admin"}"` | 요청 본문 (JSON 문자열, 쌍따옴표로 감싸짐) |
| 10 | 상태 코드 | `200`, `404`, `500` | HTTP 응답 상태 코드 |
| 11 | 응답 시간 | `15.234` | 요청 처리 시간 (밀리초) |
| 12 | referrer | `"https://app.altsis.com"` | 요청 referrer |
| 13 | user agent | `"Mozilla/5.0..."` | 클라이언트 브라우저 정보 |

### 로그 예시

```csv
2026-02-17 09:30:45,http,HTTP/1.1,203.0.113.50,bmr,65a1b2c3d4e5f6a7b8c9d0e1,POST,/api/enrollments,"{"syllabusId":"65f1a2b3..."}",200,45.123,"https://app.altsis.com/courses","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
2026-02-17 09:31:02,http,HTTP/1.1,203.0.113.50,bmr,65a1b2c3d4e5f6a7b8c9d0e1,GET,/api/users/current,"{}",200,12.456,"https://app.altsis.com","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
2026-02-17 09:31:15,http,HTTP/1.1,198.51.100.25,undefined,undefined,GET,/api/academies?academyId=bmr,"{}",200,8.321,"https://app.altsis.com/login","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
```

### 로그 필터링 규칙

| 규칙 | 설명 |
|------|------|
| `/index.html` 요청 제외 | 헬스 체크 등 불필요한 요청 필터링 |

```javascript
morgan(combined, {
  skip: (req, res) => req.url === "/index.html",
  stream: logger.stream,
});
```

---

## 로그 레벨

Winston의 로그 레벨 체계를 사용합니다.

| 레벨 | 우선순위 | 용도 | 저장 위치 |
|------|---------|------|-----------|
| `error` | 0 (최고) | 에러, 예외 상황 | `*.error.log` |
| `warn` | 1 | 경고 | `*.log` |
| `info` | 2 | 주요 이벤트, 상태 변경 | `*.info.log`, `*.log` |
| `http` | 3 | HTTP 요청/응답 | `*.log` |

> [!NOTE]
> `http` 레벨이 기본 로그 레벨로 설정되어 있어, 모든 HTTP 요청이 기록됩니다. `info` 로그 파일에는 `info` 이상의 레벨만, `error` 파일에는 `error` 레벨만 기록됩니다.

---

## 로그 분석 및 활용

### 일반적인 분석 시나리오

#### 1. 특정 사용자의 활동 추적

특정 academyId와 userId로 필터링하여 사용자의 모든 요청을 추적할 수 있습니다.

```bash
# S3에서 로그 파일 다운로드 후 검색
aws s3 cp s3://altsis-logs/archived/2026-02-17/ ./logs/ --recursive
grep "bmr,65a1b2c3d4e5f6a7b8c9d0e1" ./logs/*.log
```

#### 2. 오류 패턴 분석

에러 로그 파일을 통해 반복적인 오류 패턴을 식별합니다.

```bash
# error 로그만 분석
aws s3 cp s3://altsis-logs/raw/ ./logs/ --recursive --exclude "*" --include "*.error.log"
```

#### 3. API 응답 시간 모니터링

응답 시간 필드를 분석하여 느린 API 엔드포인트를 식별합니다.

```bash
# 응답 시간이 1000ms 이상인 요청 검색
awk -F',' '$11 > 1000' ./logs/2026-02-17*.log
```

#### 4. 비인증 접근 시도 탐지

`undefined` academyId/userId와 비정상 상태 코드의 조합으로 탐지합니다.

```bash
# 인증되지 않은 상태에서 403/401 응답을 받은 요청
grep "undefined,undefined" ./logs/*.log | grep -E ",40[13],"
```

### 로그 보관 정책 권장사항

| 구분 | 보관 기간 | 설정 방법 |
|------|-----------|-----------|
| 실시간 로그 (`raw/`) | 1일 | Lambda 스케줄러로 자동 이동 |
| 아카이빙 로그 (`archived/`) | 90일 | S3 Lifecycle 정책 |
| 장기 보관 | 1년 이상 | S3 Glacier 전환 |

### S3 Lifecycle 정책 예시

```json
{
  "Rules": [
    {
      "ID": "Archive old logs",
      "Filter": { "Prefix": "archived/" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

## 모니터링 체크리스트

### 일일 점검 항목

- [ ] S3 `raw/` 폴더에 당일 로그 파일이 정상 생성되고 있는지 확인
- [ ] `error.log` 파일에 새로운 심각한 오류가 없는지 확인
- [ ] Lambda 스케줄러가 전날 로그를 정상 아카이빙했는지 확인

### 주간 점검 항목

- [ ] 평균 API 응답 시간이 정상 범위인지 확인
- [ ] 비정상 접근 시도(401/403 응답)의 패턴 분석
- [ ] S3 로그 버킷의 스토리지 사용량 확인
- [ ] 반복적인 에러 패턴 식별 및 조치

### 월간 점검 항목

- [ ] 로그 보관 정책이 올바르게 적용되고 있는지 확인
- [ ] S3 Lifecycle 정책에 의한 Glacier 전환 확인
- [ ] 로그 분석 결과 기반 시스템 최적화 검토
