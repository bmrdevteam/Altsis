# 개발자 가이드

Altsis 학교 정보 시스템(School Information System)의 개발자를 위한 종합 가이드입니다. 이 문서는 프로젝트에 새로 합류하는 개발자부터 기존 개발자까지 모두를 대상으로 합니다.

---

## 목차

| 문서 | 설명 |
| --- | --- |
| [개발 환경 설정](./dev-environment.md) | 필수 도구 설치, 저장소 클론, 환경 변수 설정, 로컬 서버 실행 |
| [프로젝트 구조](./project-structure.md) | 전체 디렉토리 트리, 백엔드/프론트엔드 구조 상세 설명 |
| [프론트엔드 개발 가이드](./frontend.md) | React + TypeScript 기반 프론트엔드 아키텍처, 라우팅, 상태 관리, API 호출, 테마 시스템 |
| [백엔드 개발 가이드](./backend.md) | Express.js REST API, 계층 구조, 모델/컨트롤러/서비스 작성법, 디버깅 프로세스 |
| [코딩 스타일 가이드](./coding-style.md) | 명명 규칙, TypeScript 규칙, Prettier/Linter 설정, Airbnb Style Guide |
| [테스트](./testing.md) | Jest 기반 테스트 실행, 작성 가이드, 디버깅 방법 |

### 참고 설계 노트

공식 가이드에 포함되기 전·밖의 설계 문서입니다.

| 문서 | 설명 |
| --- | --- |
| [예약 기능 설계](../../docs/reservation-feature-design.md) | 예약 기능 설계 노트 |
| [Alt Board 양식 매뉴얼](../../docs/alt-board-form-manual.md) | Alt Board 양식 사용 매뉴얼 |

---

## 기술 스택 요약

### 프론트엔드

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| React | 18.3.x | UI 라이브러리 |
| TypeScript | 4.9.x | 정적 타입 검사 |
| React Router | 6.x | SPA 라우팅 |
| Zustand | 4.x | 경량 상태 관리 (에디터) |
| SCSS Modules | - | 컴포넌트 스코프 스타일링 |
| Axios | 0.27.x | HTTP 클라이언트 |
| Socket.IO Client | 4.x | 실시간 통신 |

### 백엔드

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Express.js | 4.21.x | REST API 서버 |
| Mongoose | 6.x | MongoDB ODM |
| Passport | 0.6.x | 인증 (Local, Google) |
| Redis | 4.x | 세션 저장소 |
| Socket.IO | 4.x | WebSocket 서버 |
| AWS S3 | - | 파일 저장소 |
| Winston | 3.x | 로깅 |
| Jest | 29.x | 테스트 프레임워크 |

### 데이터베이스

| 기술 | 용도 |
| --- | --- |
| MongoDB | 메인 데이터베이스 (멀티 데이터베이스 구조) |
| Redis | 세션 저장소, 캐싱 |

---

## 시스템 아키텍처 개요

```
[클라이언트 (React SPA)]
        |
        | HTTP / WebSocket
        v
[Express.js 서버]
   |         |         |
   v         v         v
[MongoDB] [Redis]   [AWS S3]
(데이터)  (세션)    (파일)
```

Altsis는 **멀티 테넌시(Multi-Tenancy)** 구조를 사용합니다. 각 아카데미(학원/교육기관)는 독립된 MongoDB 데이터베이스를 가지며, `conn[academyId].model()` 패턴으로 접근합니다.

---

## 사용자 권한 체계

시스템은 다음과 같은 권한 레벨을 지원합니다:

| 권한 | 설명 | 접근 범위 |
| --- | --- | --- |
| `owner` | 시스템 소유자 | 전체 아카데미 관리 |
| `admin` | 아카데미 관리자 | 아카데미 내 전체 관리 |
| `manager` | 매니저 | 학교/학기 관리 |
| `teacher` | 교사 | 수업 개설, 강의계획서, 평가 |
| `student` | 학생 | 수강신청, 수업 참여 |

---

## 핵심 도메인 개념

- **아카데미(Academy)**: 최상위 조직 단위 (학원/교육기관)
- **학교(School)**: 아카데미 하위의 학교 단위
- **학기(Season)**: 학교의 학년도/학기 단위, 교과목/시간표/양식/권한 설정 포함
- **등록(Registration)**: 사용자와 학기의 연결 (역할: teacher/student)
- **강의계획서(Syllabus)**: 교사가 개설하는 수업 정보
- **수강(Enrollment)**: 학생의 수업 수강 기록
- **양식(Form)**: 관리자 출력·시간표·강의계획서 양식. 보드 활동 양식은 Alt Form
- **캘린더(Calendar)**: 사이드바 **일정**. 수동 입력 + 수업/강의계획서 동기화
- **보드(Board)**: Alt Board (활동·문서·채팅). 학교/시즌 범위, 수업 연결
- **목표(Goals)**: 사이드바 진행 요약
- **채팅(Chat)**: 상단바 DM/그룹 + 보드 채팅. Alter는 Navbar
- **AltForm**: 보드 활동 양식 (시트 행, 설문, 평가 모드)

---

## 시작하기

1. [개발 환경 설정](./dev-environment.md)부터 시작하여 로컬 개발 환경을 구축합니다.
2. [프로젝트 구조](./project-structure.md)를 참고하여 코드베이스의 전체적인 레이아웃을 파악합니다.
3. 담당 영역에 따라 [프론트엔드](./frontend.md) 또는 [백엔드](./backend.md) 가이드를 숙지합니다.
4. [코딩 스타일](./coding-style.md)을 준수하여 일관된 코드를 작성합니다.
5. [테스트](./testing.md) 가이드에 따라 변경 사항을 검증합니다.

---

## 문서 유지보수 체크리스트

기능·API·UX를 바꿀 때 공식 문서(`documentation/`)가 코드와 어긋나지 않도록 아래를 확인합니다.

- [ ] 새 `backend/src/routes/*`를 추가·변경했다면 `documentation/api-reference/`에 문서(또는 기존 문서의 절)를 추가하고 [API 개요](../api-reference/overview.md) 리소스 표·[api-reference README](../api-reference/README.md)·[INDEX](../INDEX.md)에 링크한다.
- [ ] 사용자에게 보이는 메뉴·흐름·권한이 바뀌면 `user-guide/` 또는 `admin-guide/`를 갱신한다.
- [ ] 문서 묶음을 의미 있게 손봤다면 [INDEX 버전 정보](../INDEX.md)의 **최종 업데이트** 날짜를 갱신한다.
- [ ] 설계 초안만 있는 내용은 `docs/`에 두고, INDEX/개발자 가이드의「참고 설계 노트」로만 링크한다.
