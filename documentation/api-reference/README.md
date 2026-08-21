# API 레퍼런스

Altsis 학교 정보 시스템의 백엔드 RESTful API에 대한 종합 문서입니다.

## 목차

| 문서 | 설명 |
|------|------|
| [API 개요](./overview.md) | RESTful 설계 원칙, 인증, 에러 처리, 프론트엔드 연동 패턴 |
| [아카데미 API](./academies.md) | 아카데미 생성, 조회, 설정, 백업/복원 |
| [사용자 API](./users.md) | 로그인/로그아웃, 사용자 CRUD, 프로필 관리 |
| [학교 API](./schools.md) | 학교 생성, 조회, 기록 양식 관리 |
| [학기 API](./seasons.md) | 학기 생성, 활성화, 교과목/강의실/양식/권한 설정 |
| [수업 API](./courses.md) | 강의계획서, 수강신청, 평가, 학기 등록 |
| [등록 API](./registrations.md) | 학기 등록 생성, 복사, 조회, 수정, 삭제 |
| [수강 API](./enrollments.md) | 수강 등록, 평가 입력, 메모, 캘린더 동기화 |
| [보드 API](./boards.md) | Alt Board, 게시글, 댓글, 즐겨찾기 |
| [캘린더 API](./calendar.md) | 일정 생성/조회, 반복 일정, 사용자 캘린더 |
| [채팅 API](./chat.md) | 채팅방, 메시지, 파일 업로드, 실시간 이벤트 |
| [알림 API](./notifications.md) | 알림 생성/조회/확인, 알림 설정 |
| [리마인더 API](./reminders.md) | 독립 리마인더, upcoming 통합 조회 |
| [Goals API](./goals.md) | 홈/목표 위젯 진행 요약 |
| [테마 설정 API](./theme-settings.md) | 사용자 테마·커스텀 색상 |
| [AI API](./ai.md) | Alter(전역 어시스턴트), 강의계획서 검토, 모델/키 관리 |
| [양식 API](./forms.md) | 양식 CRUD, 복사, 보관/복원, 열람 권한 |
| [학생 기록 API](./archives.md) | 학생 기록 조회, 수정, 파일 첨부 |
| [파일 API](./files.md) | S3 파일 업로드/다운로드, Pre-Signed URL |
| [데이터 모델](./data-models.md) | MongoDB 스키마 전체 명세 |

등록 시간표 메모(`/api/memos`)는 [캘린더 API — Registration Memo](./calendar.md#registration-memo-api)에 포함되어 있습니다.

## 시스템 구성

```
클라이언트 (React + TypeScript)
    |
    |  useAPIv2() 훅 --- axios (세션 쿠키)
    |
    v
Express.js 서버
    |
    |  라우트 --> 미들웨어(인증) --> 컨트롤러
    |
    v
MongoDB (Mongoose) + Redis (세션) + S3 (파일)
```

## 빠른 시작

### 기본 URL

모든 API는 다음 경로를 기본으로 합니다:

```
/api/{리소스명}
```

### 인증

세션 기반 인증을 사용합니다. 로그인 후 발급되는 세션 쿠키가 모든 요청에 자동으로 포함됩니다.

```
POST /api/users/login/local
Content-Type: application/json

{
  "academyId": "my-academy",
  "userId": "admin",
  "password": "password123"
}
```

### 사용자 권한 체계

| 권한 등급 | 설명 | 주요 기능 |
|-----------|------|-----------|
| `owner` | 최고 관리자 | 아카데미 생성/삭제, 전체 시스템 관리 |
| `admin` | 아카데미 관리자 | 사용자/학교 관리, 백업/복원 |
| `manager` | 운영자 | 학기/수업 관리, 보드 관리 |
| `member` | 일반 사용자 | 수업 참여, 게시글 작성 |

### API 명명 규칙

프론트엔드 `useAPIv2` 훅에서 사용하는 함수명은 CRUD 접두사를 따릅니다:

| 접두사 | HTTP 메서드 | 의미 | 예시 |
|--------|-------------|------|------|
| `C` | POST | Create (생성) | `CAcademy`, `CUser` |
| `R` | GET | Read (조회) | `RAcademies`, `RUser` |
| `U` | PUT | Update (수정) | `UActivateAcademy` |
| `D` | DELETE | Delete (삭제) | `DAcademy`, `DUser` |

## API 문서 생성

백엔드 소스 코드의 JSDoc 주석으로부터 API 문서를 자동 생성할 수 있습니다:

```bash
cd backend
npm run jsdoc
```

## 관련 문서

- 데이터 모델의 상세 필드 명세는 [데이터 모델](./data-models.md) 문서를 참고하세요.
- 프론트엔드에서의 API 호출 패턴은 [API 개요](./overview.md)의 `useAPIv2` 섹션을 참고하세요.
