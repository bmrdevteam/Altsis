# 개발 환경 설정

이 문서에서는 Altsis 프로젝트의 로컬 개발 환경을 구축하는 방법을 설명합니다.

---

## 목차

1. [필수 도구](#1-필수-도구)
2. [저장소 클론 및 의존성 설치](#2-저장소-클론-및-의존성-설치)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [로컬 서버 실행](#4-로컬-서버-실행)
5. [개발 도구 추천](#5-개발-도구-추천)

---

## 1. 필수 도구

아래 도구들이 시스템에 설치되어 있어야 합니다.

### 필수

| 도구 | 최소 버전 | 설치 방법 |
| --- | --- | --- |
| **Node.js** | LTS (18.x 이상) | [nodejs.org](https://nodejs.org/) 또는 `nvm install --lts` |
| **Yarn** | 1.22.x 이상 | `npm install -g yarn` |
| **Git** | 2.x 이상 | [git-scm.com](https://git-scm.com/) |
| **MongoDB** | 6.x 이상 | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Redis** | 7.x 이상 | [redis.io](https://redis.io/download/) |

### 선택 (권장)

| 도구 | 용도 |
| --- | --- |
| **MongoDB Compass** | MongoDB GUI 클라이언트 - 데이터 조회/수정 시 편리 |
| **Redis CLI** / **RedisInsight** | Redis 세션 데이터 확인 |
| **Postman** | API 테스트 |
| **nvm** (Node Version Manager) | Node.js 버전 관리 |

### Node.js 설치 확인

```bash
# Node.js 버전 확인
node --version
# v18.x.x 이상이어야 합니다

# Yarn 버전 확인
yarn --version

# Git 버전 확인
git --version
```

---

## 2. 저장소 클론 및 의존성 설치

### 저장소 클론

```bash
git clone <repository-url> school-information-system
cd school-information-system
```

### 의존성 설치

프로젝트는 루트, `backend/`, `frontend/` 세 곳에 각각 `package.json`이 있습니다. 각 디렉토리에서 의존성을 설치해야 합니다.

```bash
# 루트 의존성 설치
yarn install

# 백엔드 의존성 설치
cd backend
yarn install

# 프론트엔드 의존성 설치
cd ../frontend
yarn install
```

> **참고**: 백엔드는 `"type": "module"`을 사용하여 ES Module 문법(`import`/`export`)을 사용합니다.

---

## 3. 환경 변수 설정

### 백엔드 환경 변수

백엔드는 `NODE_ENV` 값에 따라 다른 `.env` 파일을 로드합니다:

| NODE_ENV | 파일 위치 |
| --- | --- |
| `local` | `backend/.env.local` |
| `test` | `backend/.env.test` |
| 기타 (production 등) | `backend/.env` (dotenv 기본) |

`backend/.env.local` 파일을 생성하고 아래 항목을 설정합니다:

```env
# 서버 설정
PORT=4000

# 데이터베이스
DB_URL=mongodb://localhost:27017

# Redis
REDIS_URL=redis://localhost:6379

# 세션
session_key=your_session_secret_key_here

# CORS 허용 도메인 (프론트엔드 URL)
URL=http://localhost:3000

# AWS S3 (파일 업로드)
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-2
AWS_BUCKET=your_bucket_name

# Google OAuth (선택)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 프론트엔드 환경 변수

`frontend/.env` 파일을 생성합니다:

```env
# 백엔드 서버 URL
REACT_APP_SERVER_URL=http://localhost:4000
```

> **주의**: `.env` 파일은 절대 Git에 커밋하지 마십시오. `.gitignore`에 이미 포함되어 있는지 확인하십시오.

---

## 4. 로컬 서버 실행

### MongoDB 및 Redis 시작

```bash
# MongoDB 시작 (macOS - Homebrew)
brew services start mongodb-community

# Redis 시작 (macOS - Homebrew)
brew services start redis
```

### 백엔드 서버 실행

```bash
cd backend

# 개발 모드 (nodemon - 파일 변경 시 자동 재시작)
yarn dev

# 또는 로컬 모드 (.env.local 사용)
yarn local
```

정상 실행 시 아래와 같은 로그가 출력됩니다:

```
NODE_ENV is development
debug: process.env.DB_URL is mongodb://localhost:27017
Express server listening on port 4000
```

### 프론트엔드 서버 실행

```bash
cd frontend

# 개발 모드 (Hot Reload)
yarn start
```

정상 실행 시 브라우저에서 `http://localhost:3000`이 자동으로 열립니다.

### 실행 스크립트 요약

| 위치 | 명령어 | 설명 |
| --- | --- | --- |
| `backend/` | `yarn dev` | 개발 모드 (nodemon, NODE_ENV=development) |
| `backend/` | `yarn local` | 로컬 모드 (nodemon, NODE_ENV=local, .env.local 사용) |
| `backend/` | `yarn prod` | 프로덕션 모드 (NODE_ENV=production) |
| `backend/` | `yarn test` | Jest 테스트 실행 |
| `backend/` | `yarn jsdoc` | JSDoc 문서 생성 |
| `frontend/` | `yarn start` | 개발 서버 (React Scripts, Hot Reload) |
| `frontend/` | `yarn build` | 프로덕션 빌드 |
| `frontend/` | `yarn test` | 테스트 실행 |

---

## 5. 개발 도구 추천

### VS Code 확장 프로그램

| 확장 프로그램 | 용도 |
| --- | --- |
| **ESLint** | JavaScript/TypeScript 린팅 |
| **Prettier - Code formatter** | 코드 포매팅 |
| **SCSS IntelliSense** | SCSS 자동 완성 |
| **CSS Modules** | CSS Module 클래스명 자동 완성 |
| **ES7+ React/Redux/React-Native snippets** | React 코드 스니펫 |
| **GitLens** | Git 이력 추적 |
| **Thunder Client** | VS Code 내 API 테스트 |
| **MongoDB for VS Code** | MongoDB 데이터 조회 |

### VS Code 설정 권장사항

`settings.json`에 아래 설정을 추가하면 개발 경험이 향상됩니다:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "frontend/node_modules/typescript/lib",
  "css.modules.camelCase": true
}
```

### 브라우저 확장 프로그램

| 확장 프로그램 | 용도 |
| --- | --- |
| **React Developer Tools** | React 컴포넌트 트리 검사, 상태 확인, 성능 프로파일링 |
| **Redux DevTools** | Zustand 스토어 상태 디버깅 (Zustand는 Redux DevTools 호환) |

### MongoDB Compass

MongoDB Compass를 사용하면 데이터를 시각적으로 탐색할 수 있습니다:

1. MongoDB Compass 설치: [다운로드](https://www.mongodb.com/try/download/compass)
2. 연결 문자열 입력: `mongodb://localhost:27017`
3. 아카데미별 데이터베이스를 확인할 수 있습니다

> **팁**: 멀티 데이터베이스 구조이므로, 각 아카데미는 `academyId`를 이름으로 하는 별도의 데이터베이스를 사용합니다.

---

## 문제 해결

### 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
| --- | --- | --- |
| `ECONNREFUSED` (MongoDB) | MongoDB가 실행되지 않음 | `brew services start mongodb-community` |
| `ECONNREFUSED` (Redis) | Redis가 실행되지 않음 | `brew services start redis` |
| CORS 오류 | `.env`의 `URL` 값이 프론트엔드 URL과 불일치 | `URL=http://localhost:3000` 확인 |
| 세션 유지 안됨 | 쿠키 설정 문제 | 프론트엔드와 백엔드가 같은 도메인인지 확인 |
| `MODULE_NOT_FOUND` | 의존성 미설치 | 해당 디렉토리에서 `yarn install` 재실행 |
| 포트 충돌 | 이미 사용 중인 포트 | `lsof -i :4000`으로 확인 후 프로세스 종료 |

---

[목차로 돌아가기](./README.md)
