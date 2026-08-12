# 배포 아키텍처

Altsis의 AWS 기반 프로덕션 배포 아키텍처를 상세히 설명합니다.

---

## 전체 배포 구성도

```
                              ┌──────────────┐
                              │   Route53    │
                              │  (DNS 관리)   │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                                  │
                    ▼                                  ▼
          ┌─────────────────┐                ┌─────────────────┐
          │   CloudFront    │                │      ALB        │
          │  (CDN + HTTPS)  │                │ (로드 밸런서)    │
          │  ACM 인증서      │                │  ACM 인증서      │
          └────────┬────────┘                └────────┬────────┘
                   │                                  │
                   ▼                                  ▼
          ┌─────────────────┐                ┌─────────────────┐
          │    AWS S3       │                │    AWS EC2      │
          │ (정적 파일 호스팅) │                │ (Docker 컨테이너) │
          │                 │                │                 │
          │  React 빌드     │                │  Express.js     │
          │  HTML/JS/CSS    │                │  Node.js 20     │
          └─────────────────┘                └────────┬────────┘
                                                      │
                                      ┌───────────────┼───────────────┐
                                      │               │               │
                                      ▼               ▼               ▼
                              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                              │ MongoDB Atlas│ │ Redis Cloud  │ │   AWS S3     │
                              │  (메인 DB)   │ │ (캐시/세션)   │ │ (파일 저장)   │
                              └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 클라이언트 배포

React SPA(Single Page Application)를 정적 파일로 빌드하여 S3에 호스팅하고, CloudFront를 통해 전 세계에 배포합니다.

### 구성 요소

```
사용자 → Route53 (app.altsis.com)
            → CloudFront (CDN + HTTPS)
               → S3 버킷 (정적 파일)
```

### AWS S3 (정적 파일 호스팅)

| 항목 | 설명 |
|------|------|
| 용도 | React 빌드 파일 호스팅 |
| 파일 구성 | `index.html`, `static/js/*`, `static/css/*`, `asset-manifest.json` 등 |
| 접근 제어 | Public Read (CloudFront 경유) |
| 버저닝 | 비활성화 (CI/CD에서 `--delete` 플래그로 동기화) |

### 캐시 전략

파일 유형에 따라 차별화된 캐시 정책을 적용합니다.

| 파일 유형 | Cache-Control | 이유 |
|-----------|---------------|------|
| `*.html`, `*.json` | `private, max-age=0, must-revalidate` | 항상 최신 버전 제공 |
| 그 외 (`*.js`, `*.css` 등) | `private, max-age=31536000` | 파일명에 해시 포함, 장기 캐싱 |

> [!NOTE]
> React의 빌드 시스템은 JS/CSS 파일에 콘텐츠 해시를 포함하므로(`main.a1b2c3d4.js`), 파일이 변경되면 파일명도 변경됩니다. 따라서 이러한 파일은 1년간 캐싱해도 안전합니다. 반면 `index.html`은 항상 최신 버전을 반환해야 합니다.

### CloudFront 설정

| 항목 | 설정 |
|------|------|
| 오리진 | S3 버킷 |
| 기본 루트 객체 | `index.html` |
| 에러 페이지 | 403/404 → `index.html` (SPA 라우팅 지원) |
| HTTPS | ACM 인증서 연결 (us-east-1 리전) |
| 가격 등급 | 필요에 따라 설정 |
| 압축 | 자동 Gzip/Brotli 압축 활성화 |

### Route53 설정 (클라이언트)

| 레코드 타입 | 호스트명 | 값 |
|-------------|---------|-----|
| A (Alias) | `app.altsis.com` | CloudFront 배포 도메인 |
| AAAA (Alias) | `app.altsis.com` | CloudFront 배포 도메인 |

### ACM 인증서 (클라이언트)

| 항목 | 설정 |
|------|------|
| 리전 | **us-east-1** (CloudFront 필수 조건) |
| 도메인 | `app.altsis.com` |
| 검증 방법 | DNS 검증 (Route53 자동) |

> [!IMPORTANT]
> CloudFront에 연결하는 ACM 인증서는 반드시 **us-east-1 (버지니아 북부)** 리전에서 생성해야 합니다. 다른 리전의 인증서는 사용할 수 없습니다.

---

## 서버 배포

Express.js 서버를 Docker 컨테이너로 패키징하여 EC2 인스턴스에 배포하고, ALB를 통해 외부에 노출합니다.

### 구성 요소

```
사용자 → Route53 (api.altsis.com)
            → ALB (HTTPS 종료 + 로드 밸런싱)
               → EC2 인스턴스
                  → Docker 컨테이너 (Express.js)
```

### Docker 컨테이너

Dockerfile 구성:

```dockerfile
FROM node:20-alpine

## Timezone 설정
RUN apk add tzdata && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime

# 작업 디렉토리 설정
RUN mkdir -p /app
WORKDIR /app

# 의존성 설치
COPY package*.json ./
COPY yarn.lock ./
RUN node -e "const p=require('./package.json'); delete p.packageManager; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))"
RUN yarn install

COPY ./ ./

# 서버 실행
CMD ["npx", "cross-env", "NODE_ENV=production", "node", "src/index.js"]
```

| 항목 | 설정 |
|------|------|
| 베이스 이미지 | `node:20-alpine` |
| 타임존 | `Asia/Seoul` (KST) |
| 패키지 매니저 | Yarn Classic (v1) |
| 실행 환경 | `NODE_ENV=production` |
| 재시작 정책 | `--restart on-failure` |
| 포트 매핑 | `80:${SERVER_PORT}` |

### AWS EC2

| 항목 | 권장 사양 |
|------|-----------|
| 인스턴스 타입 | t3.medium 이상 |
| OS | Amazon Linux 2 또는 Ubuntu |
| 스토리지 | 최소 20GB (Docker 이미지 저장) |
| 보안 그룹 | ALB에서의 HTTP(80) 인바운드 허용 |
| IAM 역할 | ECR/S3 접근 권한 |

> [!NOTE]
> EC2 인스턴스에는 GitHub Actions Self-hosted Runner가 설치되어 있어 CD 단계에서 직접 Docker 명령을 실행할 수 있습니다.

### AWS ALB (Application Load Balancer)

| 항목 | 설정 |
|------|------|
| 스킴 | Internet-facing |
| 리스너 | HTTPS (443) → HTTP (80) 대상 그룹 |
| 대상 그룹 | EC2 인스턴스 (포트 80) |
| 헬스 체크 | HTTP, 경로 `/` |
| ACM 인증서 | `api.altsis.com` 도메인 |
| 보안 그룹 | 인바운드: HTTPS(443), HTTP(80) |

### Route53 설정 (서버)

| 레코드 타입 | 호스트명 | 값 |
|-------------|---------|-----|
| A (Alias) | `api.altsis.com` | ALB DNS 이름 |

### ACM 인증서 (서버)

| 항목 | 설정 |
|------|------|
| 리전 | ALB와 동일한 리전 (예: `ap-northeast-2`) |
| 도메인 | `api.altsis.com` |
| 검증 방법 | DNS 검증 (Route53 자동) |

---

## 데이터베이스

### MongoDB Atlas (메인 데이터베이스)

| 항목 | 설정 |
|------|------|
| 용도 | 아카데미, 사용자, 수업, 평가 등 모든 핵심 데이터 |
| 클러스터 티어 | M10 이상 (프로덕션 권장) |
| 리전 | `ap-northeast-2` (서울) |
| 복제 | 3-노드 복제 세트 (Atlas 기본) |
| 자동 백업 | Atlas 자체 백업 활성화 권장 |
| 네트워크 접근 | EC2 IP 허용 목록에 등록 |

Altsis는 아카데미별 멀티 데이터베이스 아키텍처를 사용합니다.

```
MongoDB Atlas 클러스터
├── altsis_root         ← 시스템 관리 DB (아카데미 목록, 소유자 계정)
├── altsis_{academyId}  ← 아카데미 A의 데이터
├── altsis_{academyId}  ← 아카데미 B의 데이터
└── ...
```

### Redis Cloud (캐시/세션 저장소)

| 항목 | 설정 |
|------|------|
| 용도 | 사용자 세션 저장, 캐시 |
| 세션 TTL | 24시간 (`86400`초) |
| 연결 방식 | `connect-redis` 미들웨어 |
| 리전 | `ap-northeast-2` (서울) 권장 |

---

## 파일 저장소

AWS S3를 사용하여 다양한 유형의 파일을 관리합니다.

### S3 버킷 구성

| 버킷 | 환경 변수 | 용도 | 접근 방식 |
|-------|-----------|------|-----------|
| 프로필 버킷 | `s3_bucket` | 사용자 프로필 이미지 | 직접 URL |
| 파일 버킷 | `s3_bucket2` | 파일, 백업 데이터 | Pre-signed URL (5분 만료) |
| 로그 버킷 | `s3_bucket3` | 서버 로그 | S3 Stream Logger |

### 파일 버킷 디렉토리 구조

```
s3_bucket2/
├── {academyId}/
│   ├── backup/
│   │   └── {yyyy-MM-dd_HH:mm:ss.SSS}/
│   │       ├── users.json
│   │       ├── schools.json
│   │       ├── seasons.json
│   │       ├── enrollments.json
│   │       ├── ...
│   │       └── log.txt
│   ├── archive/
│   │   └── {파일들}
│   └── profile/
│       └── {프로필 이미지들}
```

### 로그 버킷 디렉토리 구조

```
altsis-logs/
├── raw/
│   └── {날짜} {instanceId}.log        ← 실시간 로그
└── archived/
    └── yyyy-mm-dd/
        └── {아카이빙된 로그 파일들}     ← Lambda 스케줄러에 의해 이동
```

---

## 도메인 및 HTTPS

### 도메인 구조

```
altsis.com (Route53 호스팅 영역)
├── app.altsis.com    → CloudFront (클라이언트)
├── api.altsis.com    → ALB (서버)
└── ...
```

### HTTPS 인증서 관리

| 대상 | 서비스 | 리전 | 인증서 도메인 |
|------|--------|------|---------------|
| 클라이언트 | CloudFront | us-east-1 (필수) | `app.altsis.com` |
| 서버 | ALB | 서비스 리전 | `api.altsis.com` |

ACM 인증서는 DNS 검증 방식을 사용하며, Route53에서 CNAME 레코드를 자동으로 생성하여 검증할 수 있습니다. 인증서는 자동으로 갱신됩니다.

---

## 네트워크 보안 구성

### 보안 그룹 규칙

#### ALB 보안 그룹

| 방향 | 프로토콜 | 포트 | 소스/대상 | 설명 |
|------|---------|------|-----------|------|
| 인바운드 | HTTPS | 443 | 0.0.0.0/0 | 외부 HTTPS 트래픽 |
| 인바운드 | HTTP | 80 | 0.0.0.0/0 | HTTP → HTTPS 리다이렉트 |
| 아웃바운드 | HTTP | 80 | EC2 보안 그룹 | 대상 그룹 트래픽 |

#### EC2 보안 그룹

| 방향 | 프로토콜 | 포트 | 소스/대상 | 설명 |
|------|---------|------|-----------|------|
| 인바운드 | HTTP | 80 | ALB 보안 그룹 | ALB에서의 트래픽만 허용 |
| 인바운드 | SSH | 22 | 관리자 IP | 서버 관리용 |
| 아웃바운드 | 전체 | 전체 | 0.0.0.0/0 | 외부 서비스 접근 |

---

## 아키텍처 의사결정 기록

### S3 + CloudFront를 선택한 이유

- **비용 효율**: 서버리스 호스팅으로 서버 관리 불필요
- **성능**: CloudFront CDN을 통한 글로벌 엣지 캐싱
- **확장성**: 트래픽 증가에 자동 대응
- **안정성**: S3 99.999999999% 내구성

### Docker 컨테이너를 선택한 이유

- **환경 일관성**: 개발/스테이징/프로덕션 환경 동일
- **배포 간소화**: 이미지 빌드 후 pull/run으로 즉시 배포
- **롤백 용이**: 이전 이미지로 빠른 롤백 가능
- **격리**: 시스템 의존성과 분리

### MongoDB Atlas를 선택한 이유

- **관리형 서비스**: 모니터링, 백업, 보안 자동화
- **자동 확장**: 필요에 따라 스케일업/다운
- **복제 세트**: 기본 3-노드 복제로 고가용성
- **글로벌 클러스터**: 리전 간 데이터 복제 지원
