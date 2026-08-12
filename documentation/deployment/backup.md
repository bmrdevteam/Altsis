# 백업 및 복원

Altsis 시스템의 데이터 백업 절차, 복원 방법, 권장 백업 정책을 설명합니다.

---

## 개요

Altsis는 두 가지 백업 메커니즘을 제공합니다.

1. **애플리케이션 백업**: 관리자 화면에서 아카데미 데이터를 S3에 백업
2. **데이터베이스 백업**: MongoDB Atlas의 자체 백업 기능

```
┌─────────────────────────────────────────────────────────────────┐
│                     Altsis 백업 체계                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │  애플리케이션 백업 │        │ MongoDB Atlas   │                │
│  │  (관리자 화면)    │        │  자체 백업       │                │
│  └────────┬────────┘        └────────┬────────┘                │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │   AWS S3        │        │  Atlas Backup   │                │
│  │   파일 버킷      │        │  (스냅샷)       │                │
│  │                 │        │                 │                │
│  │ {academyId}/    │        │ 자동/수동 백업   │                │
│  │   backup/       │        │ Point-in-time   │                │
│  │     {timestamp}/│        │ 복원 지원        │                │
│  └─────────────────┘        └─────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 아카데미 백업

### 백업 대상 모델

아카데미 백업은 다음 데이터 모델을 JSON 형식으로 S3에 저장합니다.

| 모델 | 파일명 | 설명 |
|------|--------|------|
| `users` | `users.json` | 사용자 계정 정보 |
| `schools` | `schools.json` | 학교 정보 |
| `seasons` | `seasons.json` | 학기 정보 |
| `registrations` | `registrations.json` | 등록 정보 |
| `syllabuses` | `syllabuses.json` | 강의계획서 |
| `enrollments` | `enrollments.json` | 수강 정보 (평가 데이터 포함, 암호화됨) |
| `archives` | `archives.json` | 학생 기록 (암호화됨) |
| `forms` | `forms.json` | 양식 정보 |
| `notifications` | `notifications.json` | 알림 |
| `chatRooms` | `chatRooms.json` | 채팅방 |
| `chatMessages` | `chatMessages.json` | 채팅 메시지 |

### 백업 실행 방법

#### 1단계: 관리자 화면 접속

시스템 관리자(Owner) 또는 아카데미 관리자(Admin) 권한이 필요합니다.

| 항목 | 설명 |
|------|------|
| API 엔드포인트 | `POST /api/academies/:academyId/backup` |
| 필요 권한 | Owner 또는 Admin |
| 요청 본문 | 백업할 모델 목록 |

#### 2단계: 백업 모델 선택

백업할 데이터 모델을 선택합니다. 전체 백업을 권장합니다.

```json
{
  "models": [
    { "title": "users" },
    { "title": "schools" },
    { "title": "seasons" },
    { "title": "registrations" },
    { "title": "syllabuses" },
    { "title": "enrollments" },
    { "title": "archives" },
    { "title": "forms" },
    { "title": "notifications" },
    { "title": "chatRooms" },
    { "title": "chatMessages" }
  ]
}
```

#### 3단계: 백업 실행 및 확인

백업이 실행되면 각 모델에 대해 순차적으로 데이터를 읽고 S3에 업로드합니다.

### 백업 프로세스 상세

```
백업 시작
  │
  ├─ 타임스탬프 생성 (yyyy-MM-dd_HH:mm:ss.SSS)
  │
  ├─ 모델별 백업 (순차 처리)
  │   ├─ MongoDB 커서로 데이터 읽기 (batchSize: 1000)
  │   ├─ JSON 문자열 변환
  │   ├─ S3에 업로드: {academyId}/backup/{timestamp}/{model}.json
  │   └─ 소요 시간 기록
  │
  ├─ 백업 로그 저장
  │   └─ S3에 업로드: {academyId}/backup/{timestamp}/log.txt
  │
  └─ 완료 (로그 반환)
```

### 백업 파일 저장 구조

```
s3://{파일 버킷}/
└── {academyId}/
    └── backup/
        ├── 2026-02-17_09:30:45.123/
        │   ├── users.json
        │   ├── schools.json
        │   ├── seasons.json
        │   ├── registrations.json
        │   ├── syllabuses.json
        │   ├── enrollments.json
        │   ├── archives.json
        │   ├── forms.json
        │   ├── notifications.json
        │   ├── chatRooms.json
        │   ├── chatMessages.json
        │   └── log.txt               ← 백업 실행 로그
        │
        ├── 2026-02-10_14:20:30.456/
        │   └── ...
        └── ...
```

### 백업 로그 형식

백업 실행 시 생성되는 로그는 다음과 같은 형식입니다.

```
┌ [Backup] bmr/backup/2026-02-17_09:30:45.123
├ requested by admin(bmr)
│┌ backup users...
│├ reading users... 150
│├ writing users...
│└ backup users is done(1234ms)
│┌ backup schools...
│├ reading schools... 3
│├ writing schools...
│└ backup schools is done(456ms)
│┌ backup enrollments...
│├ reading enrollments... 1000
│├ reading enrollments... 2000
│├ reading enrollments... 2345
│├ writing enrollments...
│└ backup enrollments is done(5678ms)
...
└ [Backup] bmr/backup/2026-02-17_09:30:45.123 is done(15000ms)
```

### 백업 목록 조회

저장된 백업 목록을 조회할 수 있습니다.

| 항목 | 설명 |
|------|------|
| API 엔드포인트 | `GET /api/academies/:academyId/backup` |
| 필요 권한 | Owner 또는 Admin |
| 응답 | 백업 타이틀 및 S3 키 목록 |

### 백업 상세 조회

특정 백업의 파일 목록을 조회합니다.

| 항목 | 설명 |
|------|------|
| API 엔드포인트 | `GET /api/academies/:academyId/backup?title={타이틀}` |
| 필요 권한 | Owner 또는 Admin |
| 응답 | 파일별 제목, 크기, 키, 최종 수정 시각 |

### 백업 파일 다운로드

백업 파일은 S3 Pre-signed URL을 통해 다운로드할 수 있습니다.

| 항목 | 설명 |
|------|------|
| 다운로드 방식 | Pre-signed URL (5분 만료) |
| 파일 형식 | JSON |
| 인코딩 | UTF-8 |

### 백업 삭제

더 이상 필요하지 않은 백업을 삭제할 수 있습니다.

| 항목 | 설명 |
|------|------|
| API 엔드포인트 | `DELETE /api/academies/:academyId/backup?title={타이틀}` |
| 필요 권한 | Owner 또는 Admin |
| 동작 | 해당 백업 폴더의 모든 파일 삭제 |

> [!WARNING]
> 백업 삭제는 되돌릴 수 없습니다. 삭제 전에 반드시 해당 백업이 불필요한지 확인하세요.

---

## 백업 복원

### 복원 프로세스

백업 파일을 선택하여 아카데미 데이터를 복원합니다.

```
복원 시작
  │
  ├─ 백업 파일 선택 (모델 + JSON 데이터)
  │
  ├─ 기존 데이터 삭제 (deleteMany)
  │
  ├─ 새 데이터 삽입
  │   ├─ archives, enrollments → 개별 save (암호화 처리)
  │   └─ 그 외 모델 → insertMany (일괄 삽입)
  │
  └─ 완료
```

| 항목 | 설명 |
|------|------|
| API 엔드포인트 | `PUT /api/academies/:academyId/restore` |
| 필요 권한 | Owner 또는 Admin |
| 요청 본문 | `model` (모델명), `documents` (복원할 문서 배열) |

### 복원 요청 예시

```json
{
  "model": "users",
  "documents": [
    { "_id": "65a1b2c3...", "userId": "admin", "userName": "관리자", ... },
    { "_id": "65a1b2c4...", "userId": "teacher1", "userName": "김교사", ... }
  ]
}
```

> [!CAUTION]
> **복원 시 주의사항**
>
> 복원 작업은 해당 모델의 **기존 데이터를 모두 삭제**한 후 백업 데이터로 교체합니다. 이 작업은 되돌릴 수 없으므로 다음 사항을 반드시 확인하세요.
>
> 1. 복원하려는 백업이 올바른 시점의 데이터인지 확인
> 2. 현재 데이터의 백업을 먼저 수행
> 3. 가능하면 사용자가 적은 시간대에 복원 작업 수행
> 4. 복원 후 데이터 정합성 확인

### 암호화된 데이터의 복원

`archives`와 `enrollments` 모델은 `mongoose-encryption`으로 암호화되어 있습니다. 복원 시 개별 `save()`를 통해 암호화를 재적용합니다.

| 모델 | 암호화 필드 | 암호화 키 |
|------|------------|-----------|
| `enrollments` | `evaluation` | `ENCKEY_E` + `SIGKEY_E` |
| `archives` | `data` | `ENCKEY_A` + `SIGKEY_A` |

> [!IMPORTANT]
> 복원 시 사용하는 서버의 암호화 키(`ENCKEY_*`, `SIGKEY_*`)가 백업 시점과 동일해야 합니다. 키가 다르면 암호화된 데이터를 복호화할 수 없습니다.

### 복원 절차 가이드

#### 전체 복원 절차

```
1. 현재 데이터 백업 (안전장치)
   ↓
2. 백업 목록에서 복원할 백업 선택
   ↓
3. 백업 상세에서 파일별 확인
   ↓
4. 모델별 순차 복원
   ├─ users.json → 사용자 복원
   ├─ schools.json → 학교 복원
   ├─ seasons.json → 학기 복원
   ├─ forms.json → 양식 복원
   ├─ registrations.json → 등록 복원
   ├─ syllabuses.json → 강의계획서 복원
   ├─ enrollments.json → 수강/평가 복원
   ├─ archives.json → 학생 기록 복원
   ├─ notifications.json → 알림 복원
   ├─ chatRooms.json → 채팅방 복원
   └─ chatMessages.json → 채팅 메시지 복원
   ↓
5. 데이터 정합성 확인
   ↓
6. 서비스 정상 동작 확인
```

> [!TIP]
> 복원 순서는 데이터 의존성을 고려하여 위의 순서를 따르는 것을 권장합니다. 예를 들어, `enrollments`는 `syllabuses`에 의존하므로 `syllabuses`를 먼저 복원해야 합니다.

---

## 정기 백업 권장 주기

### 권장 백업 스케줄

| 주기 | 대상 | 보관 기간 | 설명 |
|------|------|-----------|------|
| 매일 | 전체 모델 | 7일 | 일상적인 데이터 보호 |
| 매주 (주말) | 전체 모델 | 1개월 | 주간 스냅샷 |
| 매월 (월초) | 전체 모델 | 6개월 | 월간 아카이브 |
| 학기 종료 시 | 전체 모델 | 영구 | 학기별 데이터 보존 |

### 특별 백업 시점

다음 이벤트 전에는 반드시 백업을 수행하세요.

| 시점 | 이유 |
|------|------|
| 시스템 업데이트 전 | 업데이트 실패 시 롤백용 |
| 학기 전환 전 | 이전 학기 데이터 보존 |
| 대규모 데이터 변경 전 | 일괄 처리 실패 대비 |
| 데이터 마이그레이션 전 | 스키마 변경 대비 |

---

## MongoDB Atlas 자체 백업

MongoDB Atlas는 클러스터 레벨의 자동 백업 기능을 제공합니다.

### Atlas 자동 백업

| 항목 | 설정 |
|------|------|
| 스냅샷 주기 | 6시간마다 |
| 스냅샷 보관 | 2일 |
| 일별 스냅샷 | 7일 보관 |
| 주별 스냅샷 | 4주 보관 |
| 월별 스냅샷 | 12개월 보관 |

### Point-in-Time 복원

Atlas M10 이상 클러스터에서는 특정 시점으로의 복원이 가능합니다.

| 항목 | 설명 |
|------|------|
| 복원 가능 범위 | 최근 24시간 이내 |
| 복원 단위 | 1초 단위 |
| 복원 방식 | 새 클러스터로 복원 또는 기존 클러스터 교체 |

### Atlas 백업 설정 방법

1. MongoDB Atlas 콘솔 접속
2. 클러스터 선택 > **Backup** 탭
3. **Backup Policy** 설정에서 원하는 백업 주기 설정
4. **Point-in-Time Restore** 활성화

> [!NOTE]
> Atlas 자체 백업은 데이터베이스 전체를 대상으로 합니다. 아카데미별 선택적 백업이 필요한 경우 애플리케이션 백업 기능을 사용하세요.

---

## 백업 모범 사례

### 백업 체크리스트

- [ ] 정기 백업 스케줄이 설정되어 있는가
- [ ] 백업 파일의 무결성을 주기적으로 검증하는가
- [ ] 복원 절차를 테스트해 본 적이 있는가
- [ ] 백업 파일의 보관 기간 정책이 수립되어 있는가
- [ ] 암호화 키(`ENCKEY_*`, `SIGKEY_*`)가 안전하게 보관되어 있는가
- [ ] MongoDB Atlas 자동 백업이 활성화되어 있는가
- [ ] 백업 담당자가 지정되어 있는가
- [ ] 재해 복구 계획(DRP)이 수립되어 있는가

### 보관 정책

| 백업 유형 | 보관 위치 | 보관 기간 | 삭제 정책 |
|-----------|-----------|-----------|-----------|
| 애플리케이션 백업 | S3 파일 버킷 | 최소 6개월 | 수동 삭제 |
| Atlas 스냅샷 | Atlas Cloud | Atlas 정책에 따름 | 자동 만료 |
| 학기 종료 백업 | S3 파일 버킷 | 영구 | 삭제 금지 |

### 복원 테스트

분기별로 백업 복원 테스트를 수행하여 백업의 유효성을 검증하는 것을 권장합니다.

**테스트 절차:**

1. 테스트용 아카데미 생성
2. 실제 백업 파일로 복원 수행
3. 복원된 데이터의 정합성 확인
4. 암호화된 데이터(평가, 기록)의 복호화 확인
5. 테스트 아카데미 삭제
