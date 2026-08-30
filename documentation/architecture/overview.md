# 시스템 개요

Altsis(Alternative School Information System)의 프로젝트 역사, 기술 스택, 핵심 특징, 그리고 전체 디렉토리 구조를 설명합니다.

---

## 프로젝트 소개

**Altsis**는 대안학교에서 만든 대안교육을 위한 학교 정보 시스템입니다. 수업 개설부터 수강신청, 평가, 학생 기록, 출력까지 학교 운영의 전 과정을 하나의 시스템에서 관리할 수 있도록 설계되었습니다.

### 프로젝트 역사

| 시기 | 내용 |
|------|------|
| 2016년 | 별무리학교 학습관리시스템(BLMS, Byeolmuri Learning Management System) 개발 시작 |
| 2016~2021년 | 별무리학교 교내 시스템으로 운영 및 발전 |
| 2022년 | **Altsis**(Alternative School Information System)로 리브랜딩, 다중 학교 지원 아키텍처로 전환 |
| 현재 | 오픈소스 프로젝트로 공개, 복수의 대안학교에서 활용 |

> [!NOTE]
> "Altsis"라는 이름은 **Alt**ernative School Information **S**ystem의 약자로, 대안(Alternative)교육을 위한 시스템이라는 정체성을 담고 있습니다.

---

## 기술 스택

### 프론트엔드

| 기술 | 용도 | 비고 |
|------|------|------|
| **React 18** | UI 라이브러리 | 함수형 컴포넌트, Hooks 패턴 |
| **TypeScript** | 타입 안전성 | `frontend/src` 기준. 신규 코드는 TypeScript |
| **SCSS Modules** | 스타일링 | `.module.scss` 확장자, CSS 변수 기반 테마 |
| **Zustand** | 전역 상태 관리 | 경량 상태 관리 라이브러리 |
| **React Router v6** | 라우팅 | 중첩 라우트, 인증 보호 라우트 |
| **Socket.io-client** | 실시간 통신 | 알림, 수강신청, 채팅 |
| **Axios** | HTTP 클라이언트 | `useAPIv2` 커스텀 훅으로 래핑 |
| **TipTap** | WYSIWYG 에디터 | 게시글·문서 작성에 사용 |

### 백엔드

| 기술 | 용도 | 비고 |
|------|------|------|
| **Node.js 20 LTS** | 런타임 | JavaScript 서버 실행 환경 |
| **Express.js** | 웹 프레임워크 | REST API 서버 |
| **Mongoose** | ODM | MongoDB 객체 모델링 |
| **Passport.js** | 인증 | Local 전략 + Google OAuth 2.0 |
| **Socket.io** | 실시간 통신 | 3개 네임스페이스 운영 |
| **node-cron** | 스케줄러 | 정기 작업 실행 |
| **Morgan** | 로깅 | HTTP 요청 로깅 |

### 데이터베이스 및 인프라

| 기술 | 용도 | 비고 |
|------|------|------|
| **MongoDB Atlas** | 주 데이터베이스 | 멀티 데이터베이스 아키텍처 |
| **Redis Cloud** | 세션/캐시 | 세션 저장, 소켓 매핑, 대기열 |
| **AWS S3** | 파일 저장소 | 프로필, 파일, 로그 (3개 버킷) |
| **AWS EC2** | 서버 호스팅 | Docker 컨테이너 실행 |
| **AWS Lambda** | 서버리스 함수 | 이미지 리사이징, 로그 아카이빙 |
| **AWS CloudFront** | CDN | 정적 자산 배포 |
| **AWS ALB** | 로드 밸런서 | 트래픽 분산 |
| **AWS Route53** | DNS | 도메인 관리 |
| **Docker** | 컨테이너화 | 배포 환경 통일 |

### 기술 스택 다이어그램

```
┌──────────────────────────────────────────────────────────────────┐
│                        프론트엔드 계층                             │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌───────────────┐  │
│  │ React 18 │  │ TypeScript │  │ Zustand │  │ React Router  │  │
│  │          │  │            │  │         │  │     v6        │  │
│  └──────────┘  └────────────┘  └─────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐     │
│  │ SCSS Modules │  │ Socket.io-cli │  │     Axios        │     │
│  └──────────────┘  └───────────────┘  └──────────────────┘     │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                    HTTP / WebSocket
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                         백엔드 계층                               │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Express.js│  │ Passport.js│  │ Socket.io  │  │ node-cron │  │
│  └───────────┘  └────────────┘  └────────────┘  └───────────┘  │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Mongoose  │  │   Multer   │  │   Morgan   │                 │
│  └───────────┘  └────────────┘  └────────────┘                 │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐
  │ MongoDB │   │  Redis  │   │  AWS S3 │   │  Lambda  │
  │  Atlas  │   │  Cloud  │   │ (3버킷) │   │(리사이징)│
  └─────────┘   └─────────┘   └─────────┘   └──────────┘
```

---

## 핵심 특징

### 1. 아카데미 시스템

하나의 Altsis 인스턴스에서 **복수의 학교(아카데미)**를 독립적으로 운영할 수 있습니다.

```
Altsis 시스템
├── 아카데미 A ─── 학교 A-1, 학교 A-2
├── 아카데미 B ─── 학교 B-1
└── 아카데미 C ─── 학교 C-1, 학교 C-2, 학교 C-3
```

각 아카데미는 독립된 데이터베이스를 가지며, 사용자, 학교, 학기, 수업 등 모든 데이터가 완전히 분리됩니다. 자세한 내용은 [데이터베이스 설계](database.md)를 참고하세요.

### 2. 맞춤형 시스템

양식 에디터를 통해 학교별로 다양한 양식을 커스터마이징할 수 있습니다.

| 양식 유형 | 설명 |
|-----------|------|
| 강의계획서 양식 | 수업 개설 시 작성하는 강의계획서의 항목과 형식 |
| 시간표 양식 | 시간표의 교시 구성과 표시 방식 |
| 평가 양식 | 학생 평가 항목의 구조와 입력 방식 |
| 기록 양식 | 학생별 누적 기록의 항목과 형식 |
| 출력 양식 | 기록 출력 시의 레이아웃과 서식 |

양식 데이터는 MongoDB의 유연한 스키마를 활용하여 객체(Object) 형태로 저장됩니다. 이는 학교마다 서로 다른 구조의 양식을 하나의 시스템에서 지원할 수 있는 핵심 설계입니다.

### 3. 학생 중심 설계

일반적인 학교 정보 시스템과 달리, Altsis는 학생의 능동적 참여를 지원합니다.

- **수업 개설**: 권한 설정에 따라 학생도 수업을 개설할 수 있음
- **수강신청**: 학생이 직접 수강신청을 진행
- **평가 참여**: 자기 평가, 동료 평가 등 다양한 평가 방식 지원

### 4. 통합 시스템

수업의 전체 생애주기를 하나의 시스템에서 관리합니다.

```
수업 개설 → 수강신청 → 수업 진행 → 평가 → 기록 → 출력
   │           │          │        │      │      │
   ▼           ▼          ▼        ▼      ▼      ▼
강의계획서  수강 등록   시간표/    성적   학생   생활
  작성      처리      캘린더    입력   기록   기록부
                        │
                        ▼
                   Alt Board
                (과제/설문/채팅)
```

### 5. Alt Board 시스템

Alt Board는 수업 활동의 중심 허브로, 문서(Docs)·양식(Form)·시트(Sheet)·채팅을 통합 관리합니다.

| 모듈 | 설명 |
|------|------|
| Alt Docs | 게시글 + 머지 문법({{변수}}) 기반 동적 문서 |
| Alt Form | 양식 빌더 (17+ 필드 타입, 퀴즈, 중복 검사, 조건부 표시) |
| Alt Sheet | Form 응답 데이터의 테이블 뷰/편집 |
| 보드 채팅 | 보드 멤버 간 그룹 채팅 |
| 설문 | 게시글 내 임베디드 설문 |

### 6. AI 통합

OpenAI, Anthropic, Google Gemini(테스트용) API를 활용한 AI 기능을 제공합니다. 제공자별 REST API를 직접 호출하는 추상화 계층(`services/aiProvider.js`)을 통해 통합됩니다.

- AI 강의계획서·평가·기록·문서·양식 초안 및 문서 점검 (SSE)
- Alter — 상단 네비 전역 작성·점검 도우미 (보드 채팅과 분리)
- 아카데미별 AI 제공자·모델 선택 및 API 키 관리 (BYOK)
- 학교 지침·학습정보 라이브러리와 페이지 스냅샷을 통한 컨텍스트 제공

### 7. 기능 활성화 시스템

아카데미 단위로 기능을 선택적으로 활성화할 수 있습니다.

| 기능 | 설명 |
|------|------|
| `chatEnabled` | 채팅 기능 ON/OFF |
| `boardEnabled` | 보드 기능 ON/OFF |
| `aiEnabled` | AI 기능 ON/OFF |

---

## 프로젝트 디렉토리 구조

### 최상위 구조

```
school-information-system/
├── backend/              # Express.js REST API 서버
├── frontend/             # React + TypeScript 클라이언트
├── .github/              # GitHub Actions CI/CD 워크플로우
├── docs/                 # JSDoc으로 자동 생성된 API 문서
├── documentation/        # 이 문서 (공식 문서)
├── package.json          # 루트 패키지 설정
├── README.md             # 프로젝트 소개
├── CONTRIBUTING.md       # 기여 가이드
├── CODE_OF_CONDUCT.md    # 행동 강령
├── SECURITY.md           # 보안 정책
├── LICENSE               # MIT 라이선스
└── AUTHORS               # 저자 목록
```

### 백엔드 구조

```
backend/src/
├── _database/            # 데이터베이스 연결 관리
│   ├── mongodb/          #   MongoDB 연결 (root + 아카데미별 연결)
│   └── redis/            #   Redis 연결
├── _passport/            # Passport.js 인증 전략
│   ├── localStrategy2.js #   로컬 인증 (userId + password)
│   └── googleStrategy2.js#   Google OAuth 2.0
├── _s3/                  # AWS S3 파일 업로드 설정
│   ├── profileBucket.js  #   프로필/수업 이미지 버킷
│   ├── fileBucket.js     #   파일 버킷 (기록, 채팅, AI 참고자료)
│   ├── profileMulter.js  #   프로필 이미지 업로드
│   ├── archiveMulter.js  #   기록 파일 업로드
│   ├── chatMulter.js     #   채팅 파일 업로드
│   ├── courseMulter.js   #   수업 커버 이미지 업로드
│   └── aiRefMulter.js    #   AI 참고자료 업로드
├── controllers/          # 라우트 핸들러 (비즈니스 로직)
├── models/               # Mongoose 스키마 및 모델
├── routes/               # Express 라우터 정의
├── services/             # 비즈니스 서비스 계층
├── middleware/            # Express 미들웨어
│   ├── auth.js           #   인증/권한 미들웨어
│   └── chat.js           #   채팅 미들웨어
├── utils/                # 유틸리티 함수
│   └── webSocket.js      #   Socket.io 초기화 및 관리
├── messages/             # 응답 메시지 상수
├── log/                  # 로깅 설정
├── app.js                # Express 앱 설정 (미들웨어, 세션, CORS)
├── index.js              # 서버 진입점
└── env.js                # 환경 변수 로드
```

### 프론트엔드 구조

```
frontend/src/
├── assets/               # 정적 자산 (이미지, 아이콘)
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── calendarV2/       #   캘린더 V2 컴포넌트
│   ├── loading/          #   로딩 컴포넌트
│   └── ...               #   기타 공용 컴포넌트
├── contexts/             # React Context
│   ├── authContext.tsx    #   인증 컨텍스트 (useAuth)
│   └── themeContext.tsx   #   테마 컨텍스트 (useTheme)
├── editor/               # 양식 에디터 관련
├── hooks/                # 커스텀 훅
│   ├── useAPIv2.ts       #   API 호출 훅
│   └── ...               #   기타 훅
├── layout/               # 레이아웃 컴포넌트 (사이드바, 헤더)
├── pages/                # 페이지 컴포넌트 (라우트별)
├── routes/               # 라우트 정의
├── states-dev/           # Zustand 스토어
├── style/                # 전역 스타일
│   └── variables.scss    #   CSS 변수 (테마)
├── types/                # TypeScript 타입 정의
├── utils/                # 유틸리티 함수
│   └── themeGenerator.ts #   테마 CSS 변수 생성기
├── index.tsx             # 앱 진입점
├── global.d.ts           # 전역 타입 선언
└── global2.d.ts          # 추가 전역 타입 선언
```

---

## 다음 단계

- [데이터베이스 설계](database.md) - MongoDB 멀티 데이터베이스 아키텍처의 상세 구조
- [인증 및 권한](authentication.md) - 사용자 인증과 역할 기반 접근 제어
- [실시간 통신](realtime.md) - Socket.io 기반 실시간 기능
- [파일 저장소](file-storage.md) - AWS S3 파일 관리 체계
