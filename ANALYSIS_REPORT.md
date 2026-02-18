# Altsis 시스템 분석 보고서

> **작성일**: 2026-02-18
> **대상 시스템**: Altsis (Alternative School Information System)
> **라이선스**: MIT

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [백엔드 분석](#4-백엔드-분석)
5. [프론트엔드 분석](#5-프론트엔드-분석)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [인증 및 권한 체계](#7-인증-및-권한-체계)
8. [실시간 통신](#8-실시간-통신)
9. [파일 관리](#9-파일-관리)
10. [배포 아키텍처](#10-배포-아키텍처)
11. [보안 분석](#11-보안-분석)
12. [개선 제안](#12-개선-제안)

---

## 1. 시스템 개요

### 1.1 프로젝트 소개

Altsis는 **대안학교 정보 시스템**(Alternative School Information System)으로, 대안학교 및 교육기관의 통합 운영을 위한 웹 기반 플랫폼입니다. 2016년 BLMS 시스템에서 발전하여 2023년에 오픈소스로 공개되었습니다.

### 1.2 주요 기능

| 기능 영역 | 설명 |
|-----------|------|
| **수업 관리** | 강의계획서 생성, 시간표, 수강신청, 멘토링 |
| **수강 신청** | 실시간 대기열 기반 수강신청, 정원 관리 |
| **평가 시스템** | 암호화된 평가 데이터, 자기평가/멘토평가 |
| **학생 기록** | 암호화된 학적 기록, 커스텀 양식 |
| **실시간 채팅** | 그룹/1:1 채팅, 파일 공유 |
| **알림 시스템** | 실시간 WebSocket 알림 |
| **양식 빌더** | 블록 기반 양식 편집기 |
| **관리자 대시보드** | 학교/사용자/양식 관리, 백업/복원 |

### 1.3 멀티 테넌시

시스템은 멀티 테넌시 아키텍처를 채택하여, 각 학원(Academy)이 독립된 데이터베이스를 사용합니다.

```
Root DB ("root")
├── academies 컬렉션
└── users 컬렉션 (시스템 소유자)

Academy DB ("{academyId}-db")
├── users, schools, seasons, registrations
├── syllabuses, enrollments, archives
├── forms, notifications
├── chatRooms, chatMessages, chatFiles
└── apps
```

---

## 2. 기술 스택

### 2.1 백엔드

| 분류 | 기술 | 버전 |
|------|------|------|
| 런타임 | Node.js | v16 (Alpine) |
| 프레임워크 | Express.js | ^4.18.1 |
| 데이터베이스 | MongoDB (Mongoose) | ^6.4.2 |
| 세션 저장소 | Redis | ^4.3.0 |
| 인증 | Passport.js | ^0.6.0 |
| 실시간 통신 | Socket.IO | ^4.5.4 |
| 파일 저장소 | AWS S3 (multer-s3) | ^2.1206.0 |
| 암호화 | mongoose-encryption | ^2.1.2 |
| 비밀번호 | bcrypt | ^5.1.0 |
| 로깅 | Winston + Morgan | ^3.8.2 |
| 테스팅 | Jest | ^29.5.0 |

### 2.2 프론트엔드

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React | ^18.2.0 |
| 언어 | TypeScript | ^4.4.2 |
| 라우팅 | React Router | ^6.3.0 |
| HTTP 클라이언트 | Axios | ^0.27.2 |
| 상태 관리 | Zustand | ^4.1.1 |
| 스타일링 | SCSS/Sass | ^1.53.0 |
| 빌드 도구 | Create React App | 5.0.1 |
| 데이터 내보내기 | xlsx | ^0.18.5 |

### 2.3 인프라

| 분류 | 기술 |
|------|------|
| 컨테이너 | Docker |
| CI/CD | GitHub Actions |
| 프론트엔드 호스팅 | AWS S3 + CloudFront |
| 백엔드 호스팅 | AWS EC2 |
| CDN/SSL | AWS CloudFront + ACM |
| DNS | AWS Route53 |
| 컨테이너 레지스트리 | GitHub Container Registry |

---

## 3. 시스템 아키텍처

### 3.1 전체 아키텍처

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│              │     │      AWS CloudFront       │     │              │
│   브라우저    │────▶│  (CDN, SSL Termination)   │────▶│   AWS S3     │
│              │     │                          │     │  (Frontend)  │
└──────┬───────┘     └──────────────────────────┘     └──────────────┘
       │
       │ API 요청 (HTTPS)
       ▼
┌──────────────────────────────────────┐
│          AWS ALB (HTTPS)             │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       AWS EC2 (Docker Container)     │
│  ┌────────────────────────────────┐  │
│  │   Express.js + Socket.IO       │  │
│  │   ┌──────────┐ ┌──────────┐   │  │
│  │   │ REST API │ │ WebSocket│   │  │
│  │   └────┬─────┘ └────┬─────┘   │  │
│  └────────┼─────────────┼────────┘  │
└───────────┼─────────────┼───────────┘
            │             │
     ┌──────┴──────┐  ┌──┴───────┐
     │  MongoDB    │  │  Redis   │
     │ (Multi-DB)  │  │ (Session)│
     └─────────────┘  └──────────┘
```

### 3.2 디렉터리 구조

```
/Altsis
├── backend/
│   └── src/
│       ├── _database/      # MongoDB, Redis 연결 관리
│       ├── _passport/      # 인증 전략 (Local, Google)
│       ├── _s3/            # AWS S3 파일 업로드
│       ├── controllers/    # 비즈니스 로직 (16개)
│       ├── models/         # Mongoose 스키마 (15개)
│       ├── routes/         # API 라우트 (16개)
│       ├── middleware/     # 인증/권한 미들웨어
│       ├── services/       # 재사용 서비스
│       ├── utils/          # 유틸리티 (WebSocket, 검증)
│       ├── messages/       # 에러/응답 메시지
│       ├── log/            # 로깅 설정 (Winston)
│       ├── app.js          # Express 앱 설정
│       └── index.js        # 서버 진입점
├── frontend/
│   └── src/
│       ├── components/     # 재사용 UI 컴포넌트 (27개)
│       ├── pages/          # 페이지 컴포넌트 (16개)
│       ├── hooks/          # 커스텀 React 훅 (12개)
│       ├── contexts/       # Context Provider (Auth, Theme)
│       ├── routes/         # 라우터 설정
│       ├── types/          # TypeScript 타입 (32개+)
│       ├── editor/         # 블록 기반 양식 편집기
│       ├── layout/         # 레이아웃 (Sidebar, Navbar)
│       ├── states-dev/     # Zustand 상태 저장소
│       ├── style/          # SCSS 스타일시트
│       └── functions/      # 유틸리티 함수
└── .github/workflows/      # CI/CD 파이프라인
```

---

## 4. 백엔드 분석

### 4.1 API 엔드포인트 요약

총 **16개 라우트 그룹**, **100개 이상의 API 엔드포인트**가 존재합니다.

| 라우트 | 경로 | 주요 기능 | 엔드포인트 수 |
|--------|------|-----------|:------------:|
| Users | `/api/users` | 로그인, 사용자 CRUD, 권한 | 20 |
| Academies | `/api/academies` | 학원 관리, 백업/복원 | 13 |
| Schools | `/api/schools` | 학교 CRUD, 설정 | 7 |
| Seasons | `/api/seasons` | 학기 관리, 권한, 양식 | 15 |
| Registrations | `/api/registrations` | 수강등록, 복사 | 6 |
| Syllabuses | `/api/syllabuses` | 강의계획서 CRUD | 9 |
| Enrollments | `/api/enrollments` | 수강신청, 평가 | 8 |
| Forms | `/api/forms` | 양식 템플릿 관리 | 8 |
| Archives | `/api/archives` | 학적 기록 (암호화) | 2 |
| Notifications | `/api/notifications` | 알림 발송/조회 | 5 |
| Chats | `/api/chats` | 채팅방, 메시지, 파일 | 15 |
| Files | `/api/files` | 파일 업로드/다운로드 | 4 |
| Memos | `/api/memos` | 메모 CRUD | 3 |
| Apps | `/api/apps` | 커스텀 앱 | - |
| Test | `/api/test` | 개발/테스트용 | - |

### 4.2 컨트롤러 패턴

모든 컨트롤러는 `errorHandler` 래퍼를 사용하여 일관된 에러 처리를 수행합니다.

```javascript
// backend/src/utils/errorHandler.js
const errorHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
```

### 4.3 응답 형식

```javascript
// 성공
res.status(200).send({ result, message })

// 에러
res.status(400).send({ message: "에러 메시지" })
res.status(401).send({ message: "인증 실패" })
res.status(403).send({ message: "권한 없음" })
res.status(404).send({ message: "리소스 없음" })
res.status(409).send({ message: "충돌/중복" })
```

### 4.4 입력 검증 규칙

```
userId:       ^[a-z|A-Z|0-9]{4,20}$
userName:     ^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$
password:     ^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$
email:        @ 포함 여부
tel:          ^[0-9]{3}-[0-9]{4}-[0-9]{4}$
academyId:    ^[a-z|A-Z|0-9]{2,20}$
schoolId:     ^[a-z|A-Z|0-9]{2,20}$
```

---

## 5. 프론트엔드 분석

### 5.1 라우팅 구조

#### 공개 라우트
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/login` | ChooseAcademy | 학원 선택 |
| `/:pid/login` | Login | 학원별 로그인 |
| `/register` | Register | 회원가입 (비활성) |

#### 사용자 라우트 (인증 필요)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 대시보드 (일정, 캘린더) |
| `/courses` | Courses | 수업 허브 |
| `/courses/design` | Design | 강의 설계 (교사) |
| `/courses/enroll` | Enroll | 수강 신청 (학생) |
| `/courses/enrolled/:pid` | EnrolledView | 수강 중 상세 |
| `/courses/created/:pid` | CreatedView | 개설 수업 상세 |
| `/archive` | Archive | 학적 관리 (교사) |
| `/myArchive` | MyArchive | 내 학적 (학생) |
| `/notifications` | Notifications | 알림 센터 |
| `/settings` | Settings | 설정 |
| `/myaccount` | MyAccount | 내 계정 |

#### 관리자 라우트 (admin/manager)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/admin` | Admin | 관리자 대시보드 |
| `/admin/users` | Users | 사용자 관리 |
| `/admin/schools/list` | Schools | 학교 관리 |
| `/admin/forms` | Forms | 양식 관리 |
| `/admin/backup` | Backup | 백업/복원 |

#### 소유자 라우트 (owner)
| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/owner` | Owner | 소유자 대시보드 |
| `/owner/academies` | Academies | 학원 목록 관리 |
| `/owner/academies/:pid` | AcademyDetail | 학원 상세 |

### 5.2 상태 관리

프론트엔드는 세 가지 상태 관리 방식을 혼합 사용합니다:

```
┌─────────────────────────────────────────┐
│            상태 관리 계층                 │
├─────────────────────────────────────────┤
│  Context API (전역)                      │
│  ├── AuthContext                         │
│  │   ├── currentUser                    │
│  │   ├── currentSchool                  │
│  │   ├── currentRegistration            │
│  │   └── currentSeason                  │
│  ├── ThemeContext                        │
│  │   └── darkModeActive                 │
│  └── EditorContext                       │
│      └── blocks, cells, selection       │
├─────────────────────────────────────────┤
│  Zustand (경량 전역)                     │
│  ├── useReloadState                     │
│  ├── useSeasonStore                     │
│  └── useEditorStore                     │
├─────────────────────────────────────────┤
│  Local State (컴포넌트)                  │
│  ├── useState (폼 데이터, 로딩)          │
│  └── useRef (비제어 컴포넌트)            │
├─────────────────────────────────────────┤
│  영속 저장소                             │
│  ├── Cookies (학교/등록 선택)            │
│  └── localStorage (테마, 사이드바)       │
└─────────────────────────────────────────┘
```

### 5.3 API 서비스 레이어

`useAPIv2` 훅 (2,634줄)이 모든 백엔드 API 호출을 래핑합니다:

```typescript
// 엔티티별 API 함수
CAcademy, RAcademy, UAcademy, DAcademy   // 학원
CUser, RUser, RUsers, UUser, DUser       // 사용자
CSchool, RSchool, USchool, DSchool       // 학교
CSeason, RSeason, USeason                // 학기
CRegistration, RRegistration, ...         // 등록
CSyllabus, RSyllabus, USyllabus, ...     // 강의계획서
CEnrollment, REnrollment, ...             // 수강
CForm, RForm, UForm, DForm               // 양식
RChatRooms, CChatRoom, CChatMessage, ... // 채팅
CNotification, RNotifications, ...        // 알림
```

### 5.4 UI 컴포넌트

커스텀 디자인 시스템을 사용하며, 외부 UI 라이브러리를 사용하지 않습니다.

| 분류 | 컴포넌트 |
|------|----------|
| **레이아웃** | Sidebar, Navbar, Footer |
| **입력** | Input, Textarea, Select, ToggleSwitch, FileUploader |
| **표시** | Table, TableV2, List, Tab, Progress, Calendar, Schedule |
| **컨트롤** | Button, Popup, Callout, NavigationLinks |
| **특수** | Timetable, DragAndDrop, Tree, QuickSearch, Loading, Skeleton |

**테마 시스템:**
- CSS 변수 기반 라이트/다크 모드
- 기본 컬러: `rgb(49, 55, 117)` (딥블루)
- `data-theme="dark"` 속성으로 전환

---

## 6. 데이터베이스 설계

### 6.1 모델 목록 및 관계

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Academy   │     │    User     │     │   School    │
│  (Root DB)  │     │             │────▶│             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       │         ┌─────────┼─────────┐          │
       │         │         │         │          │
       ▼         ▼         ▼         ▼          ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│   Season    │  │ Registration │  │   Archive   │
│ (학기/기간) │◀─│  (수강등록)   │  │  (학적기록)  │
└──────┬──────┘  └──────────────┘  └─────────────┘
       │                                  🔒 암호화
       ▼
┌─────────────┐     ┌─────────────┐
│  Syllabus   │────▶│ Enrollment  │
│ (강의계획서) │     │  (수강신청)  │
└─────────────┘     └─────────────┘
                          🔒 암호화 (evaluation)

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Form     │     │ Notification│     │  ChatRoom   │
│  (양식 템플릿)│    │   (알림)     │     │  (채팅방)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────┴──────┐
                                        │ ChatMessage │
                                        │  (메시지)    │
                                        └─────────────┘
```

### 6.2 주요 모델 상세

#### User 모델
| 필드 | 타입 | 설명 |
|------|------|------|
| userId | String (UNIQUE) | 사용자 ID |
| userName | String | 이름 |
| password | String | bcrypt 해시 |
| auth | Enum | owner/admin/manager/member |
| email | String | 이메일 |
| tel | String | 전화번호 |
| snsId | Object | 소셜 로그인 (Google) |
| schools | Array | 소속 학교 목록 |
| profile | String | 프로필 이미지 URL |

#### Season 모델
| 필드 | 타입 | 설명 |
|------|------|------|
| school | ObjectId | 소속 학교 |
| year | String | 학년도 |
| term | String | 학기 |
| period | Object | 시작/종료일 |
| classrooms | Array | 교실 목록 |
| subjects | Object | 과목 목록 |
| permissionSyllabusV2 | Object | 강의계획 권한 |
| permissionEnrollmentV2 | Object | 수강신청 권한 |
| permissionEvaluationV2 | Object | 평가 권한 |
| formEvaluation | Array | 평가 양식 |
| isActivated | Boolean | 활성화 상태 |

#### Enrollment 모델 (암호화)
| 필드 | 타입 | 설명 |
|------|------|------|
| syllabus | ObjectId | 강의계획서 |
| student | ObjectId | 수강 학생 |
| evaluation | Object | **암호화됨** (ENCKEY_E) |
| time | Array | 수업 시간 |
| teachers | Array | 교사 목록 |

#### Archive 모델 (암호화)
| 필드 | 타입 | 설명 |
|------|------|------|
| user | ObjectId | 학생 |
| school | ObjectId | 학교 |
| data | Object | **암호화됨** (ENCKEY_A) |

### 6.3 인덱스 전략

| 모델 | 인덱스 | 타입 |
|------|--------|------|
| User | `userId` | UNIQUE |
| Academy | `academyId` | UNIQUE |
| School | `schoolId` | UNIQUE |
| Season | `school + year + term` | UNIQUE COMPOUND |
| Registration | `season + user` | UNIQUE COMPOUND |
| Enrollment | `syllabus + student` | UNIQUE COMPOUND |
| Enrollment | `student + season` | COMPOUND |
| Archive | `school + user` | UNIQUE COMPOUND |
| Notification | `user + createdAt` | COMPOUND |
| ChatRoom | `participants.user` | SINGLE |
| ChatMessage | `room + createdAt` | COMPOUND |

---

## 7. 인증 및 권한 체계

### 7.1 인증 전략

#### 로컬 인증 (Passport Local)
```
사용자 입력 (academyId, userId, password)
    │
    ▼
학원 존재 및 활성화 확인
    │
    ▼
사용자 조회 (userId)
    │
    ▼
bcrypt 비밀번호 비교
    │
    ▼
세션 생성 (Redis, TTL: 24시간)
```

#### Google OAuth 2.0
```
Google 자격증명 (JWT)
    │
    ▼
JWT 페이로드 디코딩
    │
    ▼
학원 존재 및 활성화 확인
    │
    ▼
snsId.google 이메일로 사용자 조회
    │
    ▼
세션 생성
```

### 7.2 세션 관리

- **저장소**: Redis (connect-redis)
- **TTL**: 24시간
- **옵션**: `rolling: true` (요청마다 TTL 갱신)
- **쿠키**: HttpOnly (XSS 방지)
- **직렬화**: `{_id, academyId}`

### 7.3 권한 레벨

```
owner (시스템 관리자)
  └── 모든 학원 관리, 시스템 설정
      │
admin (학원 관리자)
  └── 학원 내 모든 관리 기능
      │
manager (학교 매니저)
  └── 학교 관리, 학기/양식 설정
      │
member (일반 사용자)
  └── 학생/교사로서 기본 기능
```

### 7.4 미들웨어 체인

| 미들웨어 | 파일 위치 | 기능 |
|----------|----------|------|
| `isLoggedIn` | `middleware/auth.js:5` | 인증된 사용자 확인 |
| `isOwner` | `middleware/auth.js:32` | owner 권한 확인 |
| `isAdmin` | `middleware/auth.js:55` | admin 권한 확인 |
| `isAdManager` | `middleware/auth.js:64` | admin 또는 manager 확인 |
| `isOwAdmin` | `middleware/auth.js:91` | owner 또는 admin 확인 |
| `ownerToAdmin` | `middleware/auth.js:40` | owner를 admin 컨텍스트로 변환 |
| `isChatEnabled` | `middleware/chat.js:7` | 채팅 활성화 확인 |

---

## 8. 실시간 통신

### 8.1 Socket.IO 네임스페이스

#### `/io/notification` - 알림 채널
```
클라이언트 → listening(academyId/userId)
    │
    ▼
Redis에 소켓 매핑 저장
  - sid-user: socketId → userId
  - user-sidList: userId → [socketId, ...]
    │
서버 → notification(data) // 교사가 학생에게 알림 발송
```

#### `/io/enrollment` - 수강신청 대기열
```
클라이언트 → requestWaitingOrder(taskId)
    │
    ▼
대기 순번 계산
    │
서버 → waitingOrder(순번)
서버 → waitingBehind(뒤 대기 인원)
```

#### `/io/chat` - 채팅
```
클라이언트 → join(academyId, userId)
클라이언트 → join_room(roomId)
클라이언트 → leave_room(roomId)
클라이언트 → typing(roomId, userName)
    │
서버 → new_message(메시지)
서버 → typing(누가 입력 중)
```

### 8.2 Redis 기반 소켓 관리

- 사용자별 소켓 ID 목록 관리
- 서버 재시작 시 오래된 매핑 자동 정리
- 다중 탭/기기 지원 (하나의 사용자 → 여러 소켓)

---

## 9. 파일 관리

### 9.1 AWS S3 버킷 구조

```
S3 Bucket 1 (프로필)
├── /original/   원본 이미지
└── /thumb/      썸네일 (Lambda 자동 생성)

S3 Bucket 2 (파일/채팅)
├── /{academyId}/archive/    학적 첨부파일
├── /{academyId}/chat/{roomId}/  채팅 파일
└── /{academyId}/backup/     백업 파일
```

### 9.2 업로드 제한

| 용도 | 최대 크기 | 허용 형식 |
|------|----------|----------|
| 프로필 이미지 | - | PNG, JPG, JPEG, WebP |
| 학적 파일 | 5MB | PNG, JPG, WebP, HWP, PDF, XLSX, DOCX, ZIP |
| 채팅 이미지 | 10MB | PNG, JPG, JPEG, WebP, GIF |
| 채팅 파일 | 20MB | 이미지 + PDF, HWP, XLSX, DOCX, ZIP, TXT |

### 9.3 서명된 URL

파일 다운로드 시 5분 유효기간의 Pre-signed URL을 생성하여 보안 접근을 제공합니다.

---

## 10. 배포 아키텍처

### 10.1 CI/CD 파이프라인

```
GitHub Push
    │
    ├── frontend-pipeline.yml
    │   ├── yarn install & build
    │   └── S3 업로드 → CloudFront 무효화
    │
    └── backend-pipeline.yml
        ├── Docker 이미지 빌드
        ├── GitHub Container Registry 푸시
        └── EC2 배포 (docker pull & run)
```

### 10.2 환경 변수

| 변수 | 용도 |
|------|------|
| `DB_URL` | MongoDB 연결 문자열 |
| `REDIS_URL` | Redis 연결 (프로덕션) |
| `SERVER_PORT` | Express 서버 포트 |
| `URL` | 프론트엔드 URL (CORS) |
| `session_key` | 세션 암호화 키 |
| `ENCKEY_E`, `SIGKEY_E` | 수강 평가 암호화 키 |
| `ENCKEY_A`, `SIGKEY_A` | 학적 데이터 암호화 키 |
| `s3_accessKeyId`, `s3_secretAccessKey` | S3 프로필 버킷 키 |
| `s3_accessKeyId2`, `s3_secretAccessKey2` | S3 파일 버킷 키 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |

---

## 11. 보안 분석

### 11.1 현재 보안 체계

| 항목 | 구현 상태 | 설명 |
|------|----------|------|
| 비밀번호 해싱 | ✅ 구현됨 | bcrypt 사용 |
| 세션 관리 | ✅ 구현됨 | Redis + HttpOnly 쿠키 |
| 데이터 암호화 | ✅ 구현됨 | 평가/학적 데이터 mongoose-encryption |
| CORS | ✅ 구현됨 | 특정 URL 제한 |
| 역할 기반 접근 제어 | ✅ 구현됨 | 4단계 권한 레벨 |
| 입력 검증 | ✅ 구현됨 | 정규식 기반 유효성 검사 |
| 파일 업로드 검증 | ✅ 구현됨 | 확장자/크기 제한 |
| HTTP 로깅 | ✅ 구현됨 | Morgan + Winston |

### 11.2 잠재적 개선 사항

| 항목 | 현재 상태 | 제안 |
|------|----------|------|
| HTTPS 쿠키 | `secure: false` | 프로덕션에서 `secure: true` 설정 |
| Rate Limiting | 미구현 | express-rate-limit 도입 |
| CSRF 보호 | 미구현 | csurf 미들웨어 도입 검토 |
| 요청 크기 | JSON 500MB | 실제 필요 수준으로 하향 |
| Helmet | 미구현 | HTTP 보안 헤더 추가 |
| 의존성 감사 | - | 정기적 `npm audit` 실행 |

---

## 12. 개선 제안

### 12.1 아키텍처 개선

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| 높음 | **API 응답 표준화** | 일관된 응답 래퍼 도입 (status, data, message, pagination) |
| 높음 | **에러 처리 강화** | 중앙 에러 핸들러, 커스텀 에러 클래스 도입 |
| 높음 | **Rate Limiting** | 로그인 시도, API 요청에 대한 속도 제한 |
| 중간 | **API 버전 관리** | `/api/v1/`, `/api/v2/` 등 버전 체계 도입 |
| 중간 | **테스트 커버리지** | Jest 테스트 파일 확충 (현재 설정만 존재) |
| 중간 | **TypeScript 마이그레이션** | 백엔드 TypeScript 전환 |
| 낮음 | **API 문서화** | Swagger/OpenAPI 자동 생성 도입 |

### 12.2 성능 개선

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| 높음 | **Redis 캐싱 확장** | 자주 조회되는 데이터에 캐싱 적용 |
| 중간 | **DB 쿼리 최적화** | population 최소화, 필요한 필드만 선택 |
| 중간 | **페이지네이션** | 대량 데이터 목록에 커서 기반 페이지네이션 |
| 낮음 | **CDN 캐싱** | CloudFront 캐싱 전략 최적화 |

### 12.3 프론트엔드 개선

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| 높음 | **코드 스플리팅** | React.lazy, Suspense 활용한 번들 분할 |
| 중간 | **상태 관리 통합** | Context + Zustand 혼용을 정리 |
| 중간 | **접근성** | ARIA 속성, 키보드 네비게이션 강화 |
| 낮음 | **i18n** | 다국어 지원 (현재 한국어 중심) |

### 12.4 DevOps 개선

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| 높음 | **헬스체크** | `/health` 엔드포인트 및 모니터링 |
| 중간 | **컨테이너 오케스트레이션** | Docker Compose 또는 ECS 도입 |
| 중간 | **환경 분리** | staging 환경 구성 |
| 낮음 | **로그 수집** | ELK 또는 CloudWatch 통합 |

---

## 코드 통계 요약

| 항목 | 수량 |
|------|------|
| 백엔드 소스 코드 | ~11,578줄 (JavaScript) |
| 프론트엔드 소스 코드 | ~30,000줄+ (TypeScript/TSX) |
| MongoDB 모델 | 15개 |
| API 컨트롤러 | 16개 |
| API 라우트 그룹 | 16개 |
| API 엔드포인트 | 100개+ |
| React 컴포넌트 디렉터리 | 27개 |
| 페이지 카테고리 | 16개 |
| 커스텀 React 훅 | 12개 |
| TypeScript 타입 정의 | 32개+ |

---

> 이 보고서는 Altsis 코드베이스의 정적 분석을 기반으로 작성되었습니다.
