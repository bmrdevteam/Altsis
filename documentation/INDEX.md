<p align="center">
  <img width="100px" src="https://github.com/user-attachments/assets/5ca2ed76-8aca-400c-900e-97d065690102" alt="Altsis Logo" />
  <h1 align="center">Altsis Documentation</h1>
  <p align="center">모든 학교를 위한 대안적인 학교 정보 시스템 — 공식 문서</p>
</p>

---

# Altsis 공식 문서

**Altsis(Alternative School Information System)**는 대안학교에서 만든 대안교육을 위한 학교 정보 시스템입니다. 이 문서는 Altsis의 설치, 운영, 개발에 필요한 모든 정보를 체계적으로 정리한 공식 가이드입니다.

---

## 문서 구성

### 1. [시작하기](getting-started/README.md)
Altsis를 처음 접하는 사용자를 위한 가이드입니다.

| 문서 | 설명 |
|------|------|
| [시스템 요구사항](getting-started/requirements.md) | 서버 및 클라이언트 실행에 필요한 환경 |
| [설치 가이드](getting-started/installation.md) | 프로젝트 클론부터 실행까지 단계별 설명 |
| [초기 설정](getting-started/initial-setup.md) | 아카데미 생성 및 관리자 계정 설정 |
| [빠른 시작](getting-started/quick-start.md) | 10분 안에 시스템을 구동하는 요약 가이드 |

### 2. [시스템 아키텍처](architecture/README.md)
시스템의 전체 구조와 설계 원리를 설명합니다.

| 문서 | 설명 |
|------|------|
| [시스템 개요](architecture/overview.md) | 프로젝트 전체 구조 및 기술 스택 |
| [데이터베이스 설계](architecture/database.md) | MongoDB 멀티 데이터베이스 아키텍처 |
| [인증 및 권한](architecture/authentication.md) | 사용자 인증 체계와 권한 모델 |
| [실시간 통신](architecture/realtime.md) | WebSocket 기반 실시간 기능 |
| [파일 저장소](architecture/file-storage.md) | AWS S3 기반 파일 관리 체계 |

### 3. [관리자 가이드](admin-guide/README.md)
시스템 관리자를 위한 운영 가이드입니다.

| 문서 | 설명 |
|------|------|
| [아카데미 관리](admin-guide/academy-management.md) | 아카데미 생성, 설정, 백업 |
| [학교 관리](admin-guide/school-management.md) | 학교 생성 및 설정 |
| [사용자 관리](admin-guide/user-management.md) | 계정 생성, 역할 할당, 등록 |
| [학기 관리](admin-guide/season-management.md) | 학기 생성, 복사, 활성화 |
| [양식 관리](admin-guide/form-management.md) | 평가, 기록, 시간표, 출력 양식 |
| [권한 설정](admin-guide/permission-settings.md) | 수업 개설, 수강신청, 평가 권한 |

### 4. [사용자 가이드](user-guide/README.md)
교사와 학생을 위한 기능별 사용 가이드입니다.

| 문서 | 설명 |
|------|------|
| [수업 관리](user-guide/courses.md) | 강의계획서, 수강신청, 수업 관리 |
| [평가](user-guide/evaluation.md) | 평가 입력, 동기화, 조회 |
| [학생 기록](user-guide/archive.md) | 누적 기록, 단일 기록 관리 |
| [캘린더](user-guide/calendar.md) | 일정 관리, 이벤트, 캘린더 설정 |
| [게시판](user-guide/boards.md) | 게시판, 게시글, 댓글 |
| [채팅](user-guide/chat.md) | 실시간 채팅, 파일 공유 |
| [알림](user-guide/notifications.md) | 알림 수신, 설정, 관리 |
| [설정](user-guide/settings.md) | 개인 설정, 테마, 보안 |

### 5. [개발자 가이드](developer-guide/README.md)
Altsis 개발에 참여하고자 하는 개발자를 위한 가이드입니다.

| 문서 | 설명 |
|------|------|
| [개발 환경 설정](developer-guide/dev-environment.md) | 로컬 개발 환경 구성 |
| [프로젝트 구조](developer-guide/project-structure.md) | 디렉토리 구조 및 파일 설명 |
| [프론트엔드 개발](developer-guide/frontend.md) | React 컴포넌트, 훅, 상태 관리 |
| [백엔드 개발](developer-guide/backend.md) | Express 라우트, 컨트롤러, 모델 |
| [코딩 스타일](developer-guide/coding-style.md) | 명명 규칙, 파일 구조, 스타일 가이드 |
| [테스트](developer-guide/testing.md) | 테스트 작성 및 실행 |

### 6. [API 레퍼런스](api-reference/README.md)
백엔드 REST API의 상세 명세입니다.

| 문서 | 설명 |
|------|------|
| [API 개요](api-reference/overview.md) | API 설계 원칙, 인증, 오류 처리 |
| [아카데미 API](api-reference/academies.md) | 아카데미 관련 엔드포인트 |
| [사용자 API](api-reference/users.md) | 사용자 인증 및 관리 |
| [학교 API](api-reference/schools.md) | 학교 CRUD |
| [학기 API](api-reference/seasons.md) | 학기 관리 |
| [수업 API](api-reference/courses.md) | 강의계획서 및 수강 |
| [등록 API](api-reference/registrations.md) | 학기 등록 관리 |
| [수강 API](api-reference/enrollments.md) | 수강 등록, 평가, 메모 |
| [게시판 API](api-reference/boards.md) | 게시판, 게시글, 댓글 |
| [캘린더 API](api-reference/calendar.md) | 일정 및 사용자 캘린더 |
| [채팅 API](api-reference/chat.md) | 실시간 채팅, 파일 공유 |
| [알림 API](api-reference/notifications.md) | 알림 및 알림 설정 |
| [양식 API](api-reference/forms.md) | 양식 관리 및 권한 설정 |
| [학생 기록 API](api-reference/archives.md) | 학생 기록 조회 및 수정 |
| [파일 API](api-reference/files.md) | 파일 업로드, 다운로드, Pre-Signed URL |
| [데이터 모델](api-reference/data-models.md) | MongoDB 스키마 정의 |

### 7. [배포 및 운영](deployment/README.md)
프로덕션 환경의 배포와 운영에 관한 가이드입니다.

| 문서 | 설명 |
|------|------|
| [배포 아키텍처](deployment/architecture.md) | AWS 기반 배포 구성 |
| [CI/CD 파이프라인](deployment/ci-cd.md) | GitHub Actions 자동 배포 |
| [로깅 및 모니터링](deployment/logging.md) | 로그 수집, 저장, 분석 |
| [백업 및 복원](deployment/backup.md) | 데이터 백업 및 복구 절차 |
| [보안](deployment/security.md) | 보안 정책 및 모범 사례 |

---

## 대상 독자

| 독자 | 권장 문서 |
|------|-----------|
| 처음 설치하는 관리자 | 시작하기 → 관리자 가이드 |
| 교사/학생 사용자 | 사용자 가이드 |
| 시스템 관리자 | 관리자 가이드 → 배포 및 운영 |
| 개발자 | 시스템 아키텍처 → 개발자 가이드 → API 레퍼런스 |
| AEG 관리자 연수생 | 시작하기 → 관리자 가이드 → 사용자 가이드 |

---

## 규칙

이 문서에서는 다음과 같은 기호를 사용합니다.

| 기호 | 의미 |
|------|------|
| ⚫ | 시스템 관리자(Owner) 권한 필요 |
| 🔴 | 아카데미 관리자(Admin) 권한 필요 |
| 🔵 | 학교 관리자(Manager) 권한 필요 |
| ⚪ | 일반 사용자(Member) 사용 가능 |

---

## 버전 정보

- **문서 버전**: 2.0
- **대상 시스템 버전**: Altsis v2.0
- **최종 업데이트**: 2026년 2월
- **라이선스**: MIT

---

<p align="center">
  <sub>Altsis는 <a href="http://bmrschool.net">별무리학교</a>에서 개발한 오픈소스 프로젝트입니다.</sub>
</p>
