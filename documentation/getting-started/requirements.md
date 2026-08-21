# 시스템 요구사항

Altsis를 설치하고 실행하기 위해 필요한 소프트웨어, 외부 서비스, 운영체제 환경을 설명합니다.

---

## 소프트웨어 요구사항

### 런타임 및 패키지 매니저

| 소프트웨어 | 최소 버전 | 권장 버전 | 비고 |
|-----------|----------|----------|------|
| **Node.js** | 20.x LTS | 20.x LTS | [공식 다운로드](https://nodejs.org/) |
| **Yarn** | 3.2.x | 3.2.3 (`backend/package.json`의 `packageManager`) | [yarnpkg.com](https://yarnpkg.com/) Corepack 권장: `corepack enable` |
| **Git** | 2.x | 최신 버전 | 소스 코드 클론용 |

> [!IMPORTANT]
> Node.js는 **20 LTS**를 사용하세요. Yarn 1을 `npm install -g yarn`으로 설치하면 이 저장소의 Yarn Berry(3.x)와 맞지 않을 수 있습니다.

### 전역 npm 패키지

다음 패키지는 백엔드 개발 서버 실행에 필요하며, 전역으로 설치해야 합니다.

| 패키지 | 용도 |
|--------|------|
| **cross-env** | 크로스 플랫폼 환경변수 설정 |
| **nodemon** | 파일 변경 시 서버 자동 재시작 |

---

## 외부 서비스

Altsis는 다음 외부 클라우드 서비스에 의존합니다. 각 서비스의 계정과 자격 증명을 사전에 준비하세요.

### 데이터베이스

| 서비스 | 용도 | 필요 정보 |
|--------|------|----------|
| **MongoDB Atlas** | 메인 데이터베이스 | 연결 URI (`mongodb+srv://...`) |
| **Redis Cloud** | 세션 저장소 | 연결 URI (`redis://...`) |

> [!TIP]
> MongoDB Atlas와 Redis Cloud는 모두 무료 티어를 제공합니다. 개발 및 소규모 운영에는 무료 티어로 충분합니다.
>
> - MongoDB Atlas 무료 클러스터: [atlas.mongodb.com](https://www.mongodb.com/atlas)
> - Redis Cloud 무료 플랜: [redis.com/cloud](https://redis.com/cloud/)

### AWS 서비스

| 서비스 | 용도 | 필요 정보 |
|--------|------|----------|
| **S3** (버킷 1) | 프로필 사진 저장 | 리전, 버킷명, Access Key, Secret Key |
| **S3** (버킷 2) | 파일 저장 및 로그 | 버킷명, Access Key, Secret Key |
| **EC2** | 서버 호스팅 (프로덕션) | 인스턴스 |
| **CloudFront** | CDN (프로덕션) | 배포 도메인 |
| **Route 53** | DNS 관리 (프로덕션) | 호스팅 영역 |
| **ACM** | SSL 인증서 (프로덕션) | 인증서 ARN |
| **ALB** | 로드 밸런서 (프로덕션) | 대상 그룹 |

> [!TIP]
> 로컬 개발 환경에서는 **S3만 필수**입니다. EC2, CloudFront, Route 53, ACM, ALB는 프로덕션 배포 시에만 필요합니다.

### Google Cloud

| 서비스 | 용도 | 필요 정보 |
|--------|------|----------|
| **OAuth Client ID** | Google 소셜 로그인 | Client ID |

Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성해야 합니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보** 이동
3. **OAuth 2.0 클라이언트 ID** 생성
4. 승인된 자바스크립트 원본에 프론트엔드 URL 추가 (예: `http://localhost:3030`)

---

## 운영체제

Altsis는 다음 운영체제에서 실행할 수 있습니다.

| 운영체제 | 지원 상태 | 비고 |
|---------|----------|------|
| **macOS** | 지원 | 12 (Monterey) 이상 권장 |
| **Windows** | 지원 | Windows 10 이상 권장 |
| **Linux** | 지원 | Ubuntu 20.04 LTS 이상 권장 |

> [!TIP]
> 개발 환경으로는 macOS 또는 Linux를 권장합니다. Windows에서는 WSL2(Windows Subsystem for Linux)를 사용하면 더 안정적인 개발 경험을 얻을 수 있습니다.

---

## 브라우저 지원

Altsis 클라이언트는 다음 최신 브라우저에서 동작합니다.

| 브라우저 | 최소 버전 |
|---------|----------|
| Chrome | 최신 1개 버전 |
| Firefox | 최신 1개 버전 |
| Safari | 최신 1개 버전 |

---

## 네트워크

| 항목 | 설명 |
|------|------|
| 인터넷 연결 | MongoDB Atlas, Redis Cloud, AWS S3 접속에 필요 |
| 포트 개방 | 백엔드 기본 포트 `8080`, 프론트엔드 기본 포트 `3030` |

---

## 요구사항 점검 체크리스트

설치를 시작하기 전에 다음 항목을 확인하세요.

- [ ] Node.js LTS 설치 완료 (`node -v`로 확인)
- [ ] Yarn 설치 완료 (`yarn -v`로 확인)
- [ ] Git 설치 완료 (`git --version`으로 확인)
- [ ] MongoDB Atlas 클러스터 생성 및 연결 URI 확보
- [ ] Redis Cloud 인스턴스 생성 및 연결 URI 확보
- [ ] AWS S3 버킷 2개 생성 및 자격 증명 확보
- [ ] Google OAuth Client ID 생성 완료

모든 항목을 확인했다면 [설치 가이드](installation.md)로 진행하세요.
