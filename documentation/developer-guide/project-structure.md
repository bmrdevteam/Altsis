# 프로젝트 구조

이 문서에서는 Altsis 프로젝트의 전체 디렉토리 구조를 상세히 설명합니다.

---

## 목차

1. [전체 디렉토리 트리](#1-전체-디렉토리-트리)
2. [백엔드 구조 상세](#2-백엔드-구조-상세)
3. [프론트엔드 구조 상세](#3-프론트엔드-구조-상세)
4. [주요 설정 파일](#4-주요-설정-파일)

---

## 1. 전체 디렉토리 트리

```
school-information-system/
├── backend/                  # Express.js 백엔드 서버
│   ├── src/                  # 소스 코드
│   ├── package.json          # 백엔드 의존성
│   ├── jest.config.json      # Jest 테스트 설정
│   └── jsdoc.config.json     # JSDoc 문서 생성 설정
│
├── frontend/                 # React 프론트엔드 애플리케이션
│   ├── src/                  # 소스 코드
│   ├── public/               # 정적 파일
│   ├── package.json          # 프론트엔드 의존성
│   └── tsconfig.json         # TypeScript 설정
│
├── documentation/            # 프로젝트 문서
│   ├── developer-guide/      # 개발자 가이드 (현재 문서)
│   ├── api-reference/        # API 참조 문서
│   ├── architecture/         # 아키텍처 문서
│   ├── deployment/           # 배포 가이드
│   ├── getting-started/      # 시작 가이드
│   ├── admin-guide/          # 관리자 가이드
│   └── user-guide/           # 사용자 가이드
│
├── docs/                     # JSDoc 등 자동 생성 문서
├── node_modules/             # 루트 의존성
├── package.json              # 루트 패키지 설정
├── yarn.lock                 # Yarn 락 파일
├── README.md                 # 프로젝트 소개
├── CONTRIBUTING.md           # 기여 가이드
├── CODE_OF_CONDUCT.md        # 행동 강령
├── LICENSE                   # 라이선스
└── SECURITY.md               # 보안 정책
```

---

## 2. 백엔드 구조 상세

### 디렉토리 트리

```
backend/src/
├── index.js                  # 서버 진입점
├── app.js                    # Express 앱 설정
├── env.js                    # 환경 변수 로더
│
├── controllers/              # 요청 처리기 (24개)
│   ├── index.js              # 컨트롤러 통합 내보내기
│   ├── academies.js          # 아카데미 CRUD
│   ├── ai.js                 # AI 기능 (Gemini 연동)
│   ├── apps.js               # 외부 앱 연동
│   ├── archives.js           # 기록물 관리
│   ├── boards.js             # 게시판 관리
│   ├── calendarEvents.js     # 캘린더 이벤트
│   ├── chats.js              # 채팅
│   ├── comments.js           # 댓글
│   ├── enrollments.js        # 수강 등록
│   ├── files.js              # 파일 업로드/다운로드
│   ├── forms.js              # 양식 관리
│   ├── memos.js              # 메모
│   ├── notifications.js      # 알림
│   ├── posts.js              # 게시글
│   ├── registrations.js      # 학기 등록
│   ├── reminders.js          # 리마인더
│   ├── schools.js            # 학교 관리
│   ├── seasons.js            # 학기 관리
│   ├── syllabuses.js         # 강의계획서
│   ├── test.js               # 테스트용
│   ├── themeSettings.js      # 테마 설정
│   ├── userCalendars.js      # 사용자 캘린더
│   └── users.js              # 사용자 관리
│
├── routes/                   # API 엔드포인트 (24개)
│   ├── index.js              # 라우터 통합 등록
│   ├── academies.js          # /api/academies
│   ├── ai.js                 # /api/ai
│   ├── apps.js               # /api/apps
│   ├── archives.js           # /api/archives
│   ├── boards.js             # /api/boards
│   ├── calendarEvents.js     # /api/calendar-events
│   ├── chats.js              # /api/chats
│   ├── comments.js           # /api/comments
│   ├── enrollments.js        # /api/enrollments
│   ├── files.js              # /api/files
│   ├── forms.js              # /api/forms
│   ├── memos.js              # /api/memos
│   ├── notifications.js      # /api/notifications
│   ├── posts.js              # /api/posts
│   ├── registrations.js      # /api/registrations
│   ├── reminders.js          # /api/reminders
│   ├── schools.js            # /api/schools
│   ├── seasons.js            # /api/seasons
│   ├── syllabuses.js         # /api/syllabuses
│   ├── test.js               # /api/test
│   ├── themeSettings.js      # /api/theme-settings
│   ├── userCalendars.js      # /api/user-calendars
│   └── users.js              # /api/users
│
├── models/                   # MongoDB 스키마 (24개)
│   ├── index.js              # 모델 통합 내보내기
│   ├── Academy.js            # 아카데미
│   ├── Apps.js               # 외부 앱
│   ├── Archive.js            # 기록물
│   ├── Board.js              # 게시판
│   ├── CalendarEvent.js      # 캘린더 이벤트
│   ├── ChatFile.js           # 채팅 파일
│   ├── ChatMessage.js        # 채팅 메시지
│   ├── ChatRoom.js           # 채팅방
│   ├── Comment.js            # 댓글
│   ├── Enrollment.js         # 수강 등록
│   ├── Form.js               # 양식
│   ├── Notification.js       # 알림
│   ├── NotificationSetting.js # 알림 설정
│   ├── Post.js               # 게시글
│   ├── Registration.js       # 학기 등록
│   ├── Reminder.js           # 리마인더
│   ├── School.js             # 학교
│   ├── Season.js             # 학기
│   ├── Syllabus.js           # 강의계획서
│   ├── ThemeSetting.js       # 테마 설정
│   ├── TimeBlock.js          # 시간 블록
│   ├── User.js               # 사용자
│   └── UserCalendar.js       # 사용자 캘린더
│
├── services/                 # 비즈니스 로직 (7개)
│   ├── boards.js             # 게시판 서비스
│   ├── notifications.js      # 알림 발송 서비스
│   ├── registrations.js      # 등록 권한/처리 서비스
│   ├── scheduler.js          # 스케줄러 (cron 작업)
│   ├── seasons.js            # 학기 관련 비즈니스 로직
│   ├── themeSettings.js      # 테마 설정 서비스
│   └── users.js              # 사용자 서비스
│
├── middleware/               # 미들웨어 (2개)
│   ├── auth.js               # 인증/권한 검사 미들웨어
│   └── chat.js               # 채팅 미들웨어
│
├── _database/                # DB 연결 설정
│   ├── index.js              # DB 연결 통합
│   ├── mongodb/
│   │   ├── index.js          # MongoDB 연결 (멀티 DB)
│   │   └── root.js           # 루트 DB 연결
│   └── redis/
│       └── index.js          # Redis 연결
│
├── _passport/                # Passport 인증 전략
│   ├── index.js              # Passport 설정 통합
│   ├── localStrategy2.js     # 로컬 로그인 전략 (ID/PW)
│   └── googleStrategy2.js    # Google OAuth 전략
│
├── _s3/                      # AWS S3 연동 (파일 업로드)
│   ├── fileBucket.js         # 일반 파일 버킷
│   ├── profileBucket.js      # 프로필 이미지 버킷
│   ├── archiveMulter.js      # 기록물 파일 업로드
│   ├── chatMulter.js         # 채팅 파일 업로드
│   ├── courseMulter.js       # 수업 파일 업로드
│   ├── profileMulter.js      # 프로필 이미지 업로드
│   └── aiRefMulter.js        # AI 참고자료 업로드
│
├── utils/                    # 유틸리티 함수 (7개)
│   ├── date.js               # 날짜 처리
│   ├── errorHandler.js       # 에러 핸들러
│   ├── password.js           # 비밀번호 해싱 (bcrypt)
│   ├── payload.js            # 페이로드 검증
│   ├── textExtractor.js      # 텍스트 추출 (PDF, DOCX)
│   ├── validate.js           # 입력값 검증 (validator)
│   └── webSocket.js          # WebSocket 초기화 (Socket.IO)
│
├── messages/                 # API 응답 메시지 상수
│   └── index.js              # 에러/성공 메시지 상수 정의
│
└── log/                      # 로깅 설정 (Winston)
    ├── logger.js             # 로거 팩토리
    ├── devLogger.js          # 개발 환경 로거
    └── prodLogger.js         # 프로덕션 환경 로거
```

### 백엔드 핵심 파일 설명

#### `index.js` - 서버 진입점

서버를 시작하고 WebSocket과 스케줄러를 초기화합니다.

```javascript
import { app, ready } from "./app.js";
import { initializeWebSocket } from "./utils/webSocket.js";
import { initializeScheduler } from "./services/scheduler.js";

const startServer = async () => {
  await ready();
  server = app.listen(app.get("port"), function () {
    console.log(`Express server listening on port ${server.address().port}`);
  });
  initializeWebSocket(server);
  initializeScheduler();
};
```

#### `app.js` - Express 앱 설정

미들웨어 체인을 설정합니다:

1. `express.json()` / `express.urlencoded()` - 요청 바디 파싱
2. `cookieParser()` - 쿠키 파싱
3. `cors()` - CORS 설정 (프론트엔드 URL 허용)
4. `session()` - Redis 기반 세션 관리 (TTL: 24시간)
5. `passport.initialize()` / `passport.session()` - Passport 인증
6. `morgan()` - HTTP 로깅
7. 라우터 등록 - `/api/{resource}` 패턴

#### `env.js` - 환경 변수 로더

`NODE_ENV` 값에 따라 적절한 `.env` 파일을 로드합니다:
- `local` → `.env.local`
- `test` → `.env.test`
- 기타 → `.env` (기본)

---

## 3. 프론트엔드 구조 상세

### 디렉토리 트리

```
frontend/src/
├── index.tsx                 # React 진입점 (ReactDOM.render)
│
├── routes/                   # 라우터 설정
│   ├── RouterPage.tsx        # 전체 라우트 정의 (React Router v6)
│   └── UrlContextSync.tsx    # URL 파라미터와 Context 동기화
│
├── pages/                    # 페이지 컴포넌트 (20개 섹션)
│   ├── index/                # 홈 페이지
│   ├── login/                # 로그인/아카데미 선택
│   ├── Register.tsx          # 회원가입
│   ├── admin/                # 관리자 페이지
│   │   ├── users/            #   사용자 관리
│   │   ├── schools/          #   학교 관리
│   │   ├── forms/            #   양식 관리
│   │   └── Backup.tsx        #   백업
│   ├── owner/                # 시스템 소유자 페이지
│   │   └── academies/        #   아카데미 관리
│   ├── courses/              # 수업 관련
│   │   ├── Design.tsx        #   수업 설계
│   │   ├── Enroll.tsx        #   수강 신청
│   │   ├── EnrollStatus.tsx  #   수강 현황
│   │   ├── List.tsx          #   수업 목록
│   │   ├── tab/              #   수업 탭 (Created/Enrolled/Mentoring)
│   │   └── view/             #   수업 상세 뷰
│   ├── boards/               # 게시판
│   ├── notifications/        # 알림
│   ├── chat/                 # 채팅
│   ├── archive/              # 기록물 (교사용)
│   ├── archiveViewer/        # 기록물 뷰어 (학생용)
│   ├── docs/                 # 문서
│   ├── settings/             # 설정 (테마 등)
│   ├── myaccount/            # 내 계정
│   ├── teacher/              # 교사 페이지
│   ├── apps/                 # 외부 앱
│   ├── userSearchResult/     # 사용자 검색 결과
│   ├── dev/                  # 개발자 도구
│   └── error/                # 에러 페이지 (404)
│
├── components/               # 재사용 컴포넌트 (28개 카테고리)
│   ├── button/               # 버튼 컴포넌트
│   ├── calendarV2/           # 캘린더 V2 (월간/주간/일간 뷰)
│   ├── calender/             # 캘린더 (레거시)
│   ├── callout/              # 콜아웃/알림 박스
│   ├── canvas/               # 캔버스 (그리기)
│   ├── colorPicker/          # 색상 선택기
│   ├── divider/              # 구분선
│   ├── dragAndDrop/          # 드래그 앤 드롭
│   ├── fileUploader/         # 파일 업로드
│   ├── input/                # 입력 필드
│   ├── list/                 # 리스트 컴포넌트
│   ├── loading/              # 로딩 스피너/스켈레톤
│   ├── markdown/             # 마크다운 렌더러
│   ├── navigationLinks/      # 내비게이션 링크
│   ├── popup/                # 팝업/모달
│   ├── progress/             # 프로그레스 바
│   ├── quickSearch/          # 빠른 검색
│   ├── reloadwarning/        # 새로고침 경고
│   ├── schedule/             # 스케줄 뷰
│   ├── select/               # 선택 드롭다운
│   ├── skeleton/             # 스켈레톤 로딩
│   ├── tab/                  # 탭 컴포넌트
│   ├── table/                # 테이블 (레거시)
│   ├── tableV2/              # 테이블 V2 (권장)
│   ├── textarea/             # 텍스트영역
│   ├── timetable/            # 시간표
│   ├── toggleSwitch/         # 토글 스위치
│   └── tree/                 # 트리 뷰
│
├── layout/                   # 레이아웃 컴포넌트
│   ├── sidebar/              # 사이드바 (메뉴 네비게이션)
│   ├── navbar/               # 상단 네비게이션 바
│   └── footer/               # 푸터
│
├── contexts/                 # React Context
│   ├── authContext.tsx        # 인증 Context (사용자/학교/학기)
│   └── themeContext.tsx       # 테마 Context (라이트/다크/커스텀)
│
├── hooks/                    # 커스텀 훅 (13개)
│   ├── useAPIv2.ts           # API 호출 훅 (네임스페이스별 API 함수)
│   ├── useApi.ts             # API 호출 훅 (레거시)
│   ├── useDatabase.ts        # Axios 기반 CRUD 래퍼
│   ├── useAppNavigate.ts     # 앱 내 네비게이션
│   ├── useAppPrefix.ts       # URL 접두사 (academyId/schoolId)
│   ├── useFormValidation.ts  # 폼 유효성 검사
│   ├── useGenerateId.ts      # ID 생성
│   ├── useGoogleLogin.tsx    # Google 로그인
│   ├── useInterval.tsx       # 인터벌 훅
│   ├── useOutsideClick.ts    # 외부 클릭 감지
│   ├── useSearch.ts          # 검색 기능
│   ├── useSetStateFromOtherComponent.ts # 컴포넌트 간 상태 전달
│   └── _message.ts           # API 에러 메시지 매핑
│
├── editor/                   # 양식 에디터
│   ├── Editor.tsx            # 에디터 메인 컴포넌트
│   ├── EditorParser.tsx      # 에디터 파서
│   ├── editor.module.scss    # 에디터 스타일
│   ├── blocks/               # 에디터 블록 컴포넌트
│   ├── functions/            # 에디터 기능 함수
│   ├── layout/               # 에디터 레이아웃
│   ├── parser/               # 데이터 파싱
│   ├── store/
│   │   └── useEditorStore.ts # Zustand 에디터 스토어
│   └── types/                # 에디터 타입 정의
│
├── types/                    # TypeScript 타입 정의 (14개)
│   ├── academies.ts          # TAcademy
│   ├── auth.ts               # TCurrentUser, TCurrentRegistration, TCurrentSeason
│   ├── board.ts              # TBoard
│   ├── chat.ts               # TChatRoom, TChatMessage, TChatUser
│   ├── comment.ts            # TComment
│   ├── enrollments.ts        # TEnrollment
│   ├── notification.ts       # TNotification, TNotificationSettings
│   ├── post.ts               # TPost, TPostAttachment
│   ├── registrations.ts      # TRegistration
│   ├── reminder.ts           # TReminder
│   ├── schools.ts            # TSchool, TSchoolFormArchive
│   ├── seasons.ts            # TSeason, TSeasonWithRegistrations
│   ├── syllabuses.ts         # TSyllabus
│   └── users.ts              # TUser
│
├── utils/                    # 유틸리티 함수
│   └── themeGenerator.ts     # 커스텀 테마 CSS 변수 생성기
│
├── style/                    # 전역 스타일
│   ├── global.scss           # 전역 스타일 초기화
│   ├── variables.scss        # CSS 변수 정의 (테마 색상)
│   ├── fonts.scss            # 폰트 설정
│   └── pages/                # 페이지별 전역 스타일
│
├── assets/                   # 정적 자원
│   ├── svg/                  # SVG 아이콘
│   ├── img/                  # 이미지 파일
│   ├── fonts/                # 폰트 파일
│   └── audio/                # 오디오 파일
│
├── functions/                # 공통 함수
├── states-dev/               # 개발용 상태 데이터
├── global.d.ts               # 전역 타입 선언
└── global2.d.ts              # 추가 전역 타입 선언
```

### 프론트엔드 핵심 파일 설명

#### `routes/RouterPage.tsx` - 라우터 설정

React Router v6 기반의 전체 라우트를 정의합니다. URL 구조는 다음과 같습니다:

| URL 패턴 | 설명 |
| --- | --- |
| `/login` | 아카데미 선택 → 로그인 |
| `/:pid/login` | 특정 아카데미 로그인 |
| `/register` | 회원가입 |
| `/owner/...` | 시스템 소유자 페이지 |
| `/:academyId/:schoolId/` | 인증된 사용자 메인 (UrlContextSync) |
| `/:academyId/:schoolId/admin/...` | 관리자 페이지 |
| `/:academyId/:schoolId/courses/...` | 수업 관련 |
| `/:academyId/:schoolId/boards/...` | 게시판 |
| `/:academyId/:schoolId/settings` | 설정 |

#### `contexts/authContext.tsx` - 인증 Context

로그인한 사용자의 전체 컨텍스트를 관리합니다:

```typescript
useAuth(): {
  loading: boolean;
  currentUser: TCurrentUser;        // 현재 로그인 사용자
  currentSchool: TSchool;           // 현재 선택된 학교
  currentRegistration: TCurrentRegistration; // 현재 학기 등록 정보
  currentSeason: TCurrentSeason;    // 현재 학기 정보
  changeSchool: (to: string) => Promise<void>;
  changeRegistration: (rid: string) => void;
}
```

#### `hooks/useAPIv2.ts` - API 호출 훅

네임스페이스별로 구조화된 API 함수를 제공합니다:

```typescript
const { AcademyAPI, SchoolAPI, SeasonAPI, SyllabusAPI, ... } = useAPIv2();
```

---

## 4. 주요 설정 파일

| 파일 | 위치 | 설명 |
| --- | --- | --- |
| `package.json` | 루트 | 루트 의존성 (공용 패키지) |
| `package.json` | `backend/` | 백엔드 의존성 및 스크립트 |
| `package.json` | `frontend/` | 프론트엔드 의존성 및 스크립트 |
| `tsconfig.json` | `frontend/` | TypeScript 컴파일러 설정 |
| `jest.config.json` | `backend/` | Jest 테스트 설정 |
| `jsdoc.config.json` | `backend/` | JSDoc 문서 생성 설정 |
| `.env` / `.env.local` | `backend/` | 백엔드 환경 변수 |
| `.env` | `frontend/` | 프론트엔드 환경 변수 |

---

[목차로 돌아가기](./README.md)
