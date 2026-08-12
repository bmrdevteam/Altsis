# 배포 및 운영

Altsis 프로덕션 환경의 배포, 운영, 모니터링에 관한 종합 가이드입니다.

---

## 개요

Altsis는 AWS 클라우드 인프라를 기반으로 운영되며, GitHub Actions를 통한 자동화된 CI/CD 파이프라인으로 배포됩니다. 클라이언트(React SPA)는 S3 + CloudFront 조합으로, 서버(Express.js)는 EC2 + Docker 컨테이너로 각각 배포됩니다.

### 인프라 구성 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Altsis 배포 아키텍처                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [클라이언트] → CloudFront → S3 (정적 파일)                         │
│   [클라이언트] → ALB → EC2 (Docker 컨테이너)                         │
│        ↕              ↕                                             │
│   MongoDB Atlas    Redis Cloud                                      │
│        ↕                                                            │
│     AWS S3 (파일 저장)                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 핵심 기술 스택

| 구성 요소 | 기술 | 용도 |
|-----------|------|------|
| 프론트엔드 호스팅 | AWS S3 + CloudFront | React SPA 정적 파일 서빙 |
| 백엔드 호스팅 | AWS EC2 + Docker | Express.js API 서버 |
| 로드 밸런싱 | AWS ALB | HTTPS 종료, 트래픽 분산 |
| 메인 데이터베이스 | MongoDB Atlas | 문서 기반 데이터 저장 |
| 캐시/세션 저장소 | Redis Cloud | 세션 관리, 캐싱 |
| 파일 저장소 | AWS S3 | 프로필, 파일, 백업, 로그 |
| 도메인 관리 | AWS Route53 | DNS 관리 |
| SSL 인증서 | AWS ACM | HTTPS 인증서 관리 |
| CI/CD | GitHub Actions | 자동 빌드 및 배포 |
| 컨테이너 레지스트리 | GitHub Container Registry | Docker 이미지 저장 |
| 알림 | Slack Webhook | 배포 상태 알림 |

---

## 문서 목록

| 문서 | 설명 | 대상 |
|------|------|------|
| [배포 아키텍처](architecture.md) | AWS 기반 전체 배포 구성도 및 각 서비스 역할 | 시스템 관리자, DevOps |
| [CI/CD 파이프라인](ci-cd.md) | GitHub Actions 기반 자동 배포 워크플로우 | DevOps, 개발자 |
| [로깅 및 모니터링](logging.md) | 로그 수집, 저장, 분석 체계 | 시스템 관리자 |
| [백업 및 복원](backup.md) | 데이터 백업 절차 및 복구 방법 | 시스템 관리자 |
| [보안](security.md) | 보안 정책, 암호화, 접근 제어 | 시스템 관리자, 개발자 |

---

## 빠른 참조

### 배포 브랜치

| 브랜치 | 용도 | 배포 대상 |
|--------|------|-----------|
| `frontend` | 프론트엔드 배포 | S3 + CloudFront |
| `backend` | 백엔드 배포 | EC2 (Docker) |

### 배포 프로세스 요약

```
1. 기능 개발 (feature 브랜치)
2. Pull Request → 코드 리뷰
3. 배포 브랜치에 머지 (frontend 또는 backend)
4. GitHub Actions 자동 트리거
5. 빌드 → 배포 → Slack 알림
```

### 주요 AWS 서비스

| 서비스 | 리소스 | 용도 |
|--------|--------|------|
| S3 | 클라이언트 버킷 | React 빌드 파일 |
| S3 | 파일 버킷 | 사용자 파일, 백업 |
| S3 | 로그 버킷 (`altsis-logs`) | 서버 로그 |
| CloudFront | 배포 | CDN, HTTPS |
| EC2 | 인스턴스 | Docker 컨테이너 호스팅 |
| ALB | 로드 밸런서 | HTTPS 종료, 라우팅 |
| Route53 | 호스팅 영역 | DNS 관리 |
| ACM | 인증서 | SSL/TLS 인증서 |
| Lambda | 스케줄러 | 로그 아카이빙 |

---

## 사전 요구사항

배포 환경을 구성하기 위해 다음이 필요합니다.

- **AWS 계정**: S3, EC2, CloudFront, Route53, ACM, ALB, Lambda 서비스 접근 권한
- **MongoDB Atlas 계정**: 클러스터 생성 및 연결 문자열
- **Redis Cloud 계정**: Redis 인스턴스 및 연결 문자열
- **GitHub 계정**: 리포지토리 접근 권한, Personal Access Token
- **도메인**: Route53에서 관리하거나 외부 DNS에서 위임
- **Slack Workspace**: 배포 알림 수신용 Webhook URL

> [!NOTE]
> 각 서비스의 상세 설정 방법은 해당 문서에서 다룹니다.

---

## 환경 변수 일람

배포에 필요한 환경 변수 목록입니다. 모든 환경 변수는 GitHub Secrets로 관리됩니다.

### 서버 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DB_URL` | MongoDB Atlas 연결 문자열 | `mongodb+srv://...` |
| `REDIS_URL` | Redis Cloud 연결 문자열 | `redis://...` |
| `SERVER_PORT` | 서버 포트 | `3000` |
| `URL` | 클라이언트 URL (CORS) | `https://app.altsis.com` |
| `session_key` | 세션 암호화 키 | 임의 문자열 |
| `saltRounts` | bcrypt salt rounds | `10` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `...apps.googleusercontent.com` |
| `ENCKEY_E` | 평가 데이터 암호화 키 | 32바이트 Base64 |
| `SIGKEY_E` | 평가 데이터 서명 키 | 64바이트 Base64 |
| `ENCKEY_A` | 학생 기록 암호화 키 | 32바이트 Base64 |
| `SIGKEY_A` | 학생 기록 서명 키 | 64바이트 Base64 |
| `s3_accessKeyId` | S3 Access Key (프로필) | AWS Access Key |
| `s3_secretAccessKey` | S3 Secret Key (프로필) | AWS Secret Key |
| `s3_region` | S3 리전 | `ap-northeast-2` |
| `s3_bucket` | S3 버킷 (프로필) | `altsis-profiles` |
| `s3_accessKeyId2` | S3 Access Key (파일/로그) | AWS Access Key |
| `s3_secretAccessKey2` | S3 Secret Key (파일/로그) | AWS Secret Key |
| `s3_bucket2` | S3 버킷 (파일) | `altsis-files` |
| `s3_bucket3` | S3 버킷 (로그) | `altsis-logs` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 공개키 | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 비공개키 | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Web Push contact URI | `mailto:admin@example.com` |

### 클라이언트 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `PORT` | 개발 서버 포트 | `3001` |
| `REACT_APP_SERVER_URL` | API 서버 URL | `https://api.altsis.com` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `...apps.googleusercontent.com` |
| `REACT_APP_GOOGLE_CALENDAR_API_KEY` | Google Calendar API 키 | API Key |

> [!WARNING]
> 환경 변수에는 민감한 정보가 포함되어 있습니다. `.env` 파일은 반드시 `.gitignore`에 포함시키고, GitHub Secrets를 통해서만 관리하세요.

---

## 연락처

배포 및 운영과 관련된 문의 사항은 다음으로 연락해 주세요.

- **GitHub**: [@devgoodway](https://github.com/devgoodway)
- **프로젝트**: [Altsis GitHub Repository](https://github.com/bmrdevteam/altsis)
