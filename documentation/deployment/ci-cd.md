# CI/CD 파이프라인

GitHub Actions를 활용한 Altsis의 자동 빌드 및 배포 파이프라인을 설명합니다.

---

## 개요

Altsis는 프론트엔드와 백엔드를 독립적으로 배포하는 전략을 사용합니다. 각각의 전용 브랜치에 push하면 GitHub Actions 워크플로우가 자동으로 트리거되어 빌드와 배포가 수행됩니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Altsis CI/CD 파이프라인                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [프론트엔드]                    [백엔드]                        │
│                                                                 │
│  frontend 브랜치 push            backend 브랜치 push             │
│       │                              │                          │
│       ▼                              ▼                          │
│  ┌──────────┐                   ┌──────────┐                    │
│  │ CI/CD    │                   │    CI    │                    │
│  │ (빌드+S3)│                   │ (Docker) │                    │
│  └────┬─────┘                   └────┬─────┘                    │
│       │                              │                          │
│       ▼                              ▼                          │
│  S3 버킷 업로드                  GHCR에 이미지 Push               │
│       │                              │                          │
│       ▼                              ▼                          │
│  Slack 알림                     ┌──────────┐                    │
│                                 │    CD    │                    │
│                                 │ (EC2 배포)│                    │
│                                 └────┬─────┘                    │
│                                      │                          │
│                                      ▼                          │
│                                 Docker 컨테이너                  │
│                                 실행 + Slack 알림                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 배포 브랜치 규칙

| 브랜치 | 워크플로우 파일 | 배포 대상 | 트리거 |
|--------|----------------|-----------|--------|
| `frontend` | `frontend-pipeline.yml` | AWS S3 + CloudFront | push |
| `backend` | `backend-pipeline.yml` | EC2 (Docker) via GHCR | push |

---

## 사전 준비: Access Token 설정

GitHub Actions에서 GitHub Container Registry(GHCR)에 접근하려면 Personal Access Token(PAT)이 필요합니다.

### 1단계: GitHub Personal Access Token 생성

1. GitHub 프로필 > **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)** 이동
2. **Generate new token (classic)** 클릭
3. 다음 권한(scope)을 선택합니다.

| 권한 | 설명 |
|------|------|
| `write:packages` | GitHub Packages에 패키지 업로드 |
| `delete:packages` | GitHub Packages에서 패키지 삭제 |
| `workflow` | GitHub Actions 워크플로우 업데이트 |

4. **Generate token** 클릭 후 토큰 값을 복사합니다.

> [!WARNING]
> 토큰은 생성 시에만 확인할 수 있습니다. 반드시 안전한 곳에 저장해 두세요.

### 2단계: Repository Secret 등록

1. 리포지토리 > **Settings** > **Secrets and variables** > **Actions** 이동
2. **New repository secret** 클릭
3. 다음 형식으로 등록합니다.

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `GHCR_TOKEN_{GitHub_아이디}` | 생성한 PAT | 사용자별 GHCR 인증 토큰 |

> [!NOTE]
> Secret 이름에 GitHub 아이디를 포함하는 이유는 워크플로우에서 `secrets[format('GHCR_TOKEN_{0}', github.actor)]` 형태로 동적으로 참조하기 때문입니다. 이를 통해 여러 개발자가 각자의 토큰으로 배포할 수 있습니다.

### 3단계: 기타 Secret 등록

모든 환경 변수를 GitHub Secrets로 등록합니다.

```
Repository Settings > Secrets and variables > Actions > New repository secret
```

**서버 관련 Secrets:**

| Secret 이름 | 설명 |
|-------------|------|
| `DB_URL` | MongoDB Atlas 연결 문자열 |
| `REDIS_URL` | Redis Cloud 연결 문자열 |
| `SERVER_PORT_DEV` | 서버 포트 번호 |
| `SESSION_KEY` | 세션 암호화 키 |
| `SALTROUNTS` | bcrypt salt rounds |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `URL` | 클라이언트 URL (CORS 허용) |
| `ENCKEY_E` / `SIGKEY_E` | 평가 데이터 암호화/서명 키 |
| `ENCKEY_A` / `SIGKEY_A` | 학생 기록 암호화/서명 키 |
| `S3_ACCESSKEYID` / `S3_SECRETACCESSKEY` | S3 접근 키 (프로필) |
| `S3_ACCESSKEYID2` / `S3_SECRETACCESSKEY2` | S3 접근 키 (파일/로그) |
| `S3_REGION` | S3 리전 |
| `S3_BUCKET` / `S3_BUCKET2` / `S3_BUCKET3` | S3 버킷 이름 |
| `SLACK_WEBHOOK_URL` | Slack 알림 Webhook URL |

**클라이언트 관련 Secrets:**

| Secret 이름 | 설명 |
|-------------|------|
| `CLIENT_PORT_DEV` | 클라이언트 포트 번호 |
| `SERVER_URL` | API 서버 URL |
| `S3_BUCKET_CLIENT` | 클라이언트 S3 버킷 (`s3://버킷명`) |
| `REACT_APP_GOOGLE_CALENDAR_API_KEY` | Google Calendar API 키 |

---

## 프론트엔드 배포 파이프라인

### 워크플로우 파일

`.github/workflows/frontend-pipeline.yml`

### 트리거 조건

```yaml
on:
  push:
    branches: [frontend]
```

`frontend` 브랜치에 push가 발생하면 자동으로 실행됩니다.

### 실행 환경

| 항목 | 값 |
|------|-----|
| 실행 환경 | `ubuntu-22.04` (GitHub 호스팅 러너) |
| CI 변수 | `false` (빌드 경고를 에러로 처리하지 않음) |

### 파이프라인 단계

```
┌─ 1. Checkout ──────────────────────────────────────────────────┐
│  소스 코드 체크아웃 (actions/checkout@v3)                        │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 2. Cache node modules ───────────────────────────────────────┐
│  yarn.lock 해시 기반 node_modules 캐시 복원 (actions/cache@v3)  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 3. Set .env File ─────────────────────────────────────────────┐
│  GitHub Secrets에서 환경 변수를 읽어 .env 파일 생성               │
│  - PORT, REACT_APP_SERVER_URL                                  │
│  - REACT_APP_GOOGLE_CLIENT_ID                                  │
│  - REACT_APP_GOOGLE_CALENDAR_API_KEY                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 4. Install & Build ──────────────────────────────────────────┐
│  cd frontend && yarn && yarn build                             │
│  → frontend/build 디렉토리에 정적 파일 생성                      │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 5. Deploy to S3 ─────────────────────────────────────────────┐
│  aws s3 sync로 빌드 파일을 S3 버킷에 업로드                      │
│  - HTML/JSON: max-age=0, must-revalidate                       │
│  - 그 외: max-age=31536000 (1년)                                │
│  - --delete 플래그로 기존 파일 정리                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 6. Slack Notification ───────────────────────────────────────┐
│  배포 결과를 Slack 채널에 알림 (성공/실패 무관하게 실행)           │
└────────────────────────────────────────────────────────────────┘
```

### S3 배포 명령어 상세

```bash
# 1단계: HTML/JSON 파일 업로드 (캐시 비활성화)
aws s3 sync \
  --acl public-read \
  --cache-control private,max-age=0,must-revalidate \
  --include "*.html" --include "*.json" \
  --delete \
  ./build s3://클라이언트-버킷

# 2단계: 나머지 파일 업로드 (장기 캐싱)
aws s3 sync \
  --acl public-read \
  --cache-control private,max-age=31536000 \
  --exclude "*.html" --exclude "*.json" \
  --delete \
  ./build s3://클라이언트-버킷
```

---

## 백엔드 배포 파이프라인

### 워크플로우 파일

`.github/workflows/backend-pipeline.yml`

### 트리거 조건

```yaml
on:
  push:
    branches: [backend]
```

`backend` 브랜치에 push가 발생하면 자동으로 실행됩니다.

### 파이프라인 구조

백엔드 파이프라인은 **CI**와 **CD** 두 단계로 나뉩니다. CD 단계는 CI 단계가 성공한 후에만 실행됩니다.

```
backend 브랜치 push
       │
       ▼
  ┌─────────┐     성공      ┌─────────┐
  │ CI 단계  │─────────────→│ CD 단계  │
  │ (빌드)  │              │ (배포)   │
  └─────────┘              └─────────┘
  ubuntu-latest            EC2 (Self-hosted Runner)
```

---

### CI 단계 (backend-CI)

| 항목 | 값 |
|------|-----|
| 실행 환경 | `ubuntu-latest` (GitHub 호스팅 러너) |
| Job 이름 | `backend-CI` |

#### CI 파이프라인 단계

```
┌─ 1. Checkout ──────────────────────────────────────────────────┐
│  소스 코드 체크아웃 (actions/checkout@v3)                        │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 2. Docker Setup Buildx ──────────────────────────────────────┐
│  Docker Buildx 설정 (docker/setup-buildx-action@v2.0.0)       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 3. Cache Docker layers ──────────────────────────────────────┐
│  Docker 빌드 캐시 복원/저장 (actions/cache@v3)                  │
│  - 경로: /tmp/.buildx-cache                                    │
│  - 키: ${{ runner.os }}-buildx-${{ github.sha }}               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 4. Login to GHCR ────────────────────────────────────────────┐
│  GitHub Container Registry 로그인                               │
│  - Registry: ghcr.io/bmrdevteam                                │
│  - 사용자별 동적 토큰: GHCR_TOKEN_{github.actor}                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 5. Set .env File ─────────────────────────────────────────────┐
│  GitHub Secrets에서 환경 변수를 읽어 backend/.env 파일 생성       │
│  - DB_URL, REDIS_URL, S3 관련, 암호화 키 등 전체                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 6. Build and Push ───────────────────────────────────────────┐
│  Docker 이미지 빌드 → GHCR에 Push                               │
│  - Context: backend                                            │
│  - Dockerfile: ./backend/Dockerfile                            │
│  - Tag: ghcr.io/bmrdevteam/bsis-dev_backend:latest             │
│  - BuildKit 캐시 활용                                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 7. Move cache ───────────────────────────────────────────────┐
│  이전 Docker 빌드 캐시 정리 및 갱신                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 8. Slack Notification ───────────────────────────────────────┐
│  CI 결과를 Slack 채널에 알림                                     │
└────────────────────────────────────────────────────────────────┘
```

---

### CD 단계 (backend-CD)

| 항목 | 값 |
|------|-----|
| 실행 환경 | EC2 인스턴스 (Self-hosted Runner, 라벨: `L0`) |
| Job 이름 | `backend-CD` |
| 의존성 | `backend-CI` 성공 필수 (`needs: backend-CI`) |

#### CD 파이프라인 단계

```
┌─ 1. Checkout ──────────────────────────────────────────────────┐
│  소스 코드 체크아웃                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 2. Login to GHCR ────────────────────────────────────────────┐
│  EC2에서 GitHub Container Registry 로그인                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 3. Docker Pull ──────────────────────────────────────────────┐
│  GHCR에서 최신 Docker 이미지 Pull                               │
│  docker pull ghcr.io/bmrdevteam/bsis-dev_backend:latest        │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 4. Docker Run ───────────────────────────────────────────────┐
│  기존 컨테이너 제거 후 새 컨테이너 실행                           │
│  docker rm -f bsis-dev_backend_1                               │
│  docker run --name bsis-dev_backend_1                          │
│    --restart on-failure                                        │
│    -p 80:${SERVER_PORT}                                        │
│    -d ghcr.io/bmrdevteam/bsis-dev_backend:latest               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 5. Prune images ─────────────────────────────────────────────┐
│  사용하지 않는 이전 Docker 이미지 정리                            │
│  docker image prune -f                                         │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ 6. Slack Notification ───────────────────────────────────────┐
│  CD 결과를 Slack 채널에 알림                                     │
└────────────────────────────────────────────────────────────────┘
```

### Docker 실행 명령어 상세

```bash
# 기존 컨테이너 제거 (존재하는 경우)
docker rm -f bsis-dev_backend_1 &>/dev/null && echo 'Removed old container'

# 새 컨테이너 실행
docker run \
  --name bsis-dev_backend_1 \
  --restart on-failure \
  -p 80:${SERVER_PORT} \
  -d ghcr.io/bmrdevteam/bsis-dev_backend:latest
```

| 옵션 | 설명 |
|------|------|
| `--name` | 컨테이너 이름 지정 (교체 시 동일 이름 사용) |
| `--restart on-failure` | 비정상 종료 시 자동 재시작 |
| `-p 80:${SERVER_PORT}` | 호스트 80 포트를 컨테이너 포트에 매핑 |
| `-d` | 백그라운드(detached) 모드로 실행 |

---

## Slack 알림

모든 배포 단계는 완료 후(성공/실패 모두) Slack 알림을 발송합니다.

### 알림 구성

| 워크플로우 | Job | 알림 내용 |
|-----------|-----|-----------|
| frontend-pipeline | frontend-CI/CD | repo, commit, message, author, action, took |
| backend-pipeline | backend-CI | workflow, job, author, message, took |
| backend-pipeline | backend-CD | workflow, job, author, message, took |

### Slack Webhook 설정

1. Slack 앱에서 **Incoming Webhooks** 활성화
2. 알림을 받을 채널 선택 후 Webhook URL 생성
3. 생성된 URL을 GitHub Secret `SLACK_WEBHOOK_URL`에 등록

---

## 배포 절차 가이드

### 프론트엔드 배포 방법

```bash
# 1. 기능 개발 완료 후 frontend 브랜치에 머지
git checkout frontend
git merge feature/my-feature

# 2. Push (자동 배포 트리거)
git push origin frontend

# 3. GitHub Actions에서 배포 상태 확인
# 4. Slack 알림으로 배포 결과 확인
```

### 백엔드 배포 방법

```bash
# 1. 기능 개발 완료 후 backend 브랜치에 머지
git checkout backend
git merge feature/my-feature

# 2. Push (자동 배포 트리거)
git push origin backend

# 3. GitHub Actions에서 CI → CD 순서로 배포 상태 확인
# 4. Slack 알림으로 배포 결과 확인
```

---

## 문제 해결

### GHCR 로그인 실패

```
Error: Login failed - unauthorized
```

**원인**: Personal Access Token이 만료되었거나 권한이 부족합니다.

**해결**:
1. GitHub에서 새 PAT 생성 (write:packages, delete:packages, workflow 권한)
2. Repository Secret `GHCR_TOKEN_{아이디}` 업데이트

### Docker 빌드 실패

```
Error: failed to solve: process "/bin/sh -c yarn install" did not complete successfully
```

**원인**: 패키지 의존성 문제 또는 Dockerfile 오류입니다.

**해결**:
1. 로컬에서 `cd backend && yarn install` 실행하여 의존성 문제 확인
2. `yarn.lock` 파일이 최신 상태인지 확인
3. Docker 빌드 캐시 문제라면, 캐시 무효화 후 재시도

### S3 업로드 실패

```
Error: An error occurred (AccessDenied) when calling the PutObject operation
```

**원인**: AWS 인증 정보가 잘못되었거나 S3 버킷 정책이 올바르지 않습니다.

**해결**:
1. `S3_ACCESSKEYID`, `S3_SECRETACCESSKEY` Secret 값 확인
2. IAM 사용자의 S3 접근 권한 확인
3. S3 버킷 정책에서 PutObject 권한 확인

### CD 단계 실행 안 됨

```
Waiting for a self-hosted runner to pick up this job...
```

**원인**: EC2 Self-hosted Runner가 오프라인 상태입니다.

**해결**:
1. EC2 인스턴스 상태 확인 (AWS 콘솔)
2. EC2에 SSH 접속 후 Runner 서비스 상태 확인
3. Runner 재시작: `sudo systemctl restart actions.runner.*`

### Docker 컨테이너 비정상 종료

```bash
# 컨테이너 로그 확인
docker logs bsis-dev_backend_1

# 컨테이너 상태 확인
docker ps -a | grep bsis-dev_backend_1
```

**일반적 원인**:
- 환경 변수 누락 (`.env` 파일 생성 단계 확인)
- MongoDB/Redis 연결 실패 (네트워크 접근 제한 확인)
- 포트 충돌 (다른 프로세스가 80 포트 사용 중)
