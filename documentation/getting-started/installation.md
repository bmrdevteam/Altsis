# 설치 가이드

이 문서는 Altsis를 로컬 환경에 설치하고 실행하는 전체 과정을 단계별로 설명합니다. [시스템 요구사항](requirements.md)을 먼저 확인하세요.

---

## 목차

1. [소스 코드 클론](#1-소스-코드-클론)
2. [백엔드 설정](#2-백엔드-설정)
3. [프론트엔드 설정](#3-프론트엔드-설정)
4. [실행 확인](#4-실행-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. 소스 코드 클론

GitHub에서 Altsis 저장소를 클론합니다.

```bash
git clone https://github.com/bmrdevteam/Altsis.git
cd Altsis
```

클론이 완료되면 다음과 같은 디렉토리 구조를 확인할 수 있습니다.

```
Altsis/
├── backend/          # Express.js 백엔드 서버
├── frontend/         # React 프론트엔드 클라이언트
├── documentation/    # 프로젝트 문서
└── ...
```

---

## 2. 백엔드 설정

### 2.1 의존성 설치

백엔드 디렉토리로 이동하여 의존성을 설치합니다.

```bash
cd backend
yarn install
```

### 2.2 전역 패키지 설치

개발 서버 실행에 `cross-env`와 `nodemon`이 필요합니다. `cross-env`는 백엔드 의존성에 포함되어 있습니다. `nodemon`은 백엔드 `package.json`에 없으므로 전역 설치하거나 `npx nodemon`을 사용합니다.

```bash
yarn global add nodemon
```

Yarn 3 환경에서는 전역 설치 대신 `yarn dlx`/`npx`를 쓸 수도 있습니다. `yarn dev`가 `nodemon`을 찾지 못하면 위 전역 설치를 확인하세요.

### 2.3 환경변수 파일 생성

백엔드 루트 디렉토리(`backend/`)에 `.env` 파일을 생성합니다.

```bash
touch .env
```

> [!IMPORTANT]
> `.env` 파일은 민감한 정보를 포함합니다. 절대 Git에 커밋하지 마세요. 이 파일은 `.gitignore`에 이미 등록되어 있습니다.

아래 내용을 `.env` 파일에 작성합니다. 각 변수의 값을 자신의 환경에 맞게 입력하세요.

```env
# ──────────────────────────────────────────────
# 서버 기본 설정
# ──────────────────────────────────────────────

# 프론트엔드 URL (CORS 허용 출처)
# 개발 환경에서는 프론트엔드 개발 서버 주소를 입력합니다.
URL=http://localhost:3030

# 백엔드 서버 포트
SERVER_PORT=8080

# ──────────────────────────────────────────────
# 데이터베이스
# ──────────────────────────────────────────────

# MongoDB Atlas 연결 URI
# MongoDB Atlas > Cluster > Connect > Drivers에서 복사합니다.
# <password> 부분을 실제 데이터베이스 사용자 비밀번호로 교체하세요.
DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net

# Redis Cloud 연결 URI
# Redis Cloud > Database > Connect에서 복사합니다.
REDIS_URL=redis://<username>:<password>@<host>:<port>

# ──────────────────────────────────────────────
# 세션 및 인증
# ──────────────────────────────────────────────

# 세션 암호키 (mongoose-encryption용)
# 임의의 긴 문자열을 입력합니다. 운영 환경에서는 충분히 긴 무작위 값을 사용하세요.
session_key=your-session-secret-key-here

# Google OAuth Client ID
# Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서 생성합니다.
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# ──────────────────────────────────────────────
# Web Push (VAPID) — 잠금화면 알림 (옵트인)
# ──────────────────────────────────────────────
# 키 생성: npx web-push generate-vapid-keys
# 미설정 시 인앱 알림만 동작하고 Web Push는 비활성입니다.
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@example.com

# 비밀번호 해싱 라운드 (bcrypt salt rounds)
# 값이 높을수록 보안은 강화되지만 처리 시간이 증가합니다.
# 개발 환경: 10 권장 / 운영 환경: 12 이상 권장
saltRounds=10

# ──────────────────────────────────────────────
# AWS S3 - 프로필 사진 버킷
# ──────────────────────────────────────────────

# S3 리전 (예: ap-northeast-2 = 서울)
s3_region=ap-northeast-2

# 프로필 사진 저장용 S3 버킷명
s3_bucket=your-profile-bucket-name

# 프로필 사진 버킷 IAM Access Key
s3_accessKeyId=YOUR_S3_PROFILE_ACCESS_KEY

# 프로필 사진 버킷 IAM Secret Key
s3_secretAccessKey=YOUR_S3_PROFILE_SECRET_KEY

# ──────────────────────────────────────────────
# AWS S3 - 파일 저장 버킷
# ──────────────────────────────────────────────

# 일반 파일 저장용 S3 버킷명
s3_bucket2=your-file-bucket-name

# 파일 버킷 IAM Access Key
s3_accessKeyId2=YOUR_S3_FILE_ACCESS_KEY

# 파일 버킷 IAM Secret Key
s3_secretAccessKey2=YOUR_S3_FILE_SECRET_KEY

# ──────────────────────────────────────────────
# 데이터 암호화 키
# ──────────────────────────────────────────────

# 수강 평가 정보 암호화 키 (mongoose-encryption용)
# ENCKEY_E: 32바이트 Base64 인코딩 문자열
# SIGKEY_E: 64바이트 Base64 인코딩 문자열
ENCKEY_E=your-32byte-base64-enrollment-encryption-key
SIGKEY_E=your-64byte-base64-enrollment-signing-key

# 학생 기록(Archive) 정보 암호화 키 (mongoose-encryption용)
# ENCKEY_A: 32바이트 Base64 인코딩 문자열
# SIGKEY_A: 64바이트 Base64 인코딩 문자열
ENCKEY_A=your-32byte-base64-archive-encryption-key
SIGKEY_A=your-64byte-base64-archive-signing-key
```

#### 환경변수 상세 설명

아래 표는 각 환경변수의 역할과 형식을 정리한 것입니다.

| 변수명 | 설명 | 형식/예시 | 필수 |
|--------|------|----------|:----:|
| `URL` | CORS에 허용할 프론트엔드 URL | `http://localhost:3030` | O |
| `SERVER_PORT` | 백엔드 서버 포트 번호 | `8080` | O |
| `DB_URL` | MongoDB Atlas 연결 URI | `mongodb+srv://user:pass@cluster.mongodb.net` | O |
| `REDIS_URL` | Redis Cloud 연결 URI | `redis://user:pass@host:port` | O |
| `session_key` | 세션 암호화 시크릿 키 | 임의 문자열 | O |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `xxxx.apps.googleusercontent.com` | O |
| `saltRounds` | bcrypt 해싱 라운드 수 | `10` | O |
| `s3_region` | AWS S3 리전 | `ap-northeast-2` | O |
| `s3_bucket` | 프로필 사진 S3 버킷명 | 버킷 이름 | O |
| `s3_accessKeyId` | 프로필 버킷 Access Key | AWS IAM Access Key | O |
| `s3_secretAccessKey` | 프로필 버킷 Secret Key | AWS IAM Secret Key | O |
| `s3_bucket2` | 파일 저장 S3 버킷명 | 버킷 이름 | O |
| `s3_accessKeyId2` | 파일 버킷 Access Key | AWS IAM Access Key | O |
| `s3_secretAccessKey2` | 파일 버킷 Secret Key | AWS IAM Secret Key | O |
| `ENCKEY_E` | 수강 평가 암호화 키 | 32바이트 Base64 문자열 | O |
| `SIGKEY_E` | 수강 평가 서명 키 | 64바이트 Base64 문자열 | O |
| `ENCKEY_A` | 학생 기록 암호화 키 | 32바이트 Base64 문자열 | O |
| `SIGKEY_A` | 학생 기록 서명 키 | 64바이트 Base64 문자열 | O |

#### 암호화 키 생성 방법

`ENCKEY`와 `SIGKEY`는 Node.js에서 다음 명령으로 생성할 수 있습니다.

```bash
# 32바이트 암호화 키 생성 (ENCKEY용)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 64바이트 서명 키 생성 (SIGKEY용)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

> [!WARNING]
> 암호화 키는 한 번 설정한 후 변경하면 기존에 암호화된 데이터를 복호화할 수 없게 됩니다. 키를 안전한 곳에 반드시 백업하세요.

### 2.4 백엔드 서버 실행

```bash
yarn dev
```

정상적으로 실행되면 터미널에 다음과 같은 메시지가 출력됩니다.

```
✅ NODE_ENV is development
✅ Express server listening on port 8080
```

> [!TIP]
> `yarn dev` 대신 `yarn local` 명령을 사용하면 `.env.local` 파일의 환경변수를 로드합니다. 로컬 전용 설정이 필요한 경우 `.env.local` 파일을 별도로 생성하여 사용할 수 있습니다.

---

## 3. 프론트엔드 설정

### 3.1 의존성 설치

프론트엔드 디렉토리로 이동하여 의존성을 설치합니다.

```bash
cd frontend
yarn install
```

### 3.2 환경변수 파일 생성

프론트엔드 루트 디렉토리(`frontend/`)에 `.env` 파일을 생성합니다.

```bash
touch .env
```

아래 내용을 `.env` 파일에 작성합니다.

```env
# Google OAuth Client ID (백엔드와 동일한 값)
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# 백엔드 서버 URL
REACT_APP_SERVER_URL=http://localhost:8080

# 프론트엔드 개발 서버 포트
PORT=3030
```

#### 프론트엔드 환경변수 상세 설명

| 변수명 | 설명 | 형식/예시 | 필수 |
|--------|------|----------|:----:|
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | 백엔드 `GOOGLE_CLIENT_ID`와 동일한 값 | O |
| `REACT_APP_SERVER_URL` | 백엔드 API 서버 URL | `http://localhost:8080` | O |
| `PORT` | 프론트엔드 개발 서버 포트 | `3030` | O |

> [!IMPORTANT]
> `REACT_APP_SERVER_URL`의 값과 백엔드 `.env`의 `URL` 값, `PORT`의 값과 백엔드 `URL`의 포트가 서로 올바르게 대응하는지 확인하세요.
>
> - 백엔드 `.env`의 `URL` = `http://localhost:3030` (프론트엔드 주소)
> - 프론트엔드 `.env`의 `REACT_APP_SERVER_URL` = `http://localhost:8080` (백엔드 주소)

### 3.3 프론트엔드 개발 서버 실행

```bash
yarn start
```

정상적으로 실행되면 브라우저가 자동으로 열리고 `http://localhost:3030`에서 Altsis 클라이언트 화면을 확인할 수 있습니다.

---

## 4. 실행 확인

백엔드와 프론트엔드가 모두 실행 중인 상태에서 다음을 확인합니다.

| 확인 항목 | 방법 | 기대 결과 |
|-----------|------|----------|
| 백엔드 서버 | 터미널 로그 확인 | `Express server listening on port 8080` 출력 |
| 프론트엔드 서버 | 브라우저에서 `http://localhost:3030` 접속 | Altsis 로그인 화면 표시 |
| API 연결 | 브라우저 개발자 도구 > Network 탭 확인 | CORS 오류 없음 |

> [!TIP]
> 두 서버를 동시에 실행하려면 터미널 창을 2개 열어 각각 `backend/`와 `frontend/` 디렉토리에서 서버를 실행하세요.

---

## 5. 문제 해결

### `cross-env` 또는 `nodemon` 명령을 찾을 수 없는 경우

전역 패키지가 PATH에 등록되지 않은 경우 발생합니다.

```bash
# Yarn 전역 바이너리 경로 확인
yarn global bin

# 해당 경로를 PATH에 추가 (bash 기준)
export PATH="$(yarn global bin):$PATH"
```

### MongoDB 연결 실패

```
MongoServerError: bad auth : Authentication failed.
```

- `DB_URL`의 사용자 이름과 비밀번호를 확인하세요.
- MongoDB Atlas > Network Access에서 현재 IP 주소가 허용 목록에 있는지 확인하세요.
- 비밀번호에 특수문자가 포함된 경우 URL 인코딩이 필요합니다 (예: `@` -> `%40`).

### Redis 연결 실패

```
Error: connect ECONNREFUSED
```

- `REDIS_URL`의 호스트, 포트, 비밀번호를 확인하세요.
- Redis Cloud 인스턴스가 활성 상태인지 확인하세요.

### CORS 오류

```
Access to XMLHttpRequest has been blocked by CORS policy
```

- 백엔드 `.env`의 `URL` 값이 프론트엔드 서버 주소(`http://localhost:3030`)와 정확히 일치하는지 확인하세요.
- 후행 슬래시(`/`)가 없어야 합니다.

### 포트 충돌

이미 사용 중인 포트가 있으면 `.env` 파일에서 포트 번호를 변경하세요.

```bash
# 포트 사용 여부 확인 (macOS/Linux)
lsof -i :8080
lsof -i :3030
```

---

## 다음 단계

설치가 완료되었다면 [초기 설정](initial-setup.md)으로 진행하여 첫 번째 아카데미와 관리자 계정을 생성하세요.
