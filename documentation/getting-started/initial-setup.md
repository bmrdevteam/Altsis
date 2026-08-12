# 초기 설정

이 문서는 Altsis를 설치한 후 첫 번째 아카데미를 생성하고 관리자 계정으로 로그인하는 과정을 단계별로 설명합니다. [설치 가이드](installation.md)를 먼저 완료하세요.

---

## 목차

1. [아카데미 Document 생성](#1-아카데미-document-생성)
2. [아카데미 입장 확인](#2-아카데미-입장-확인)
3. [소유자 계정 생성](#3-소유자-계정-생성)
4. [로그인 확인](#4-로그인-확인)
5. [초기 설정 완료 확인](#5-초기-설정-완료-확인)

---

## 개요

Altsis는 **멀티 아카데미** 구조로 설계되어 있습니다. 시스템을 처음 시작하려면 최상위 `root` 아카데미를 MongoDB에 수동으로 생성해야 합니다. 이 `root` 아카데미의 소유자(Owner)가 시스템 전체를 관리하게 됩니다.

```
root 아카데미 (최상위)
├── 아카데미 A
│   ├── 학교 A-1
│   └── 학교 A-2
└── 아카데미 B
    └── 학교 B-1
```

---

## 1. 아카데미 Document 생성

### 1.1 MongoDB Atlas에 접속

1. [MongoDB Atlas](https://cloud.mongodb.com/)에 로그인합니다.
2. 좌측 메뉴에서 **Database** (또는 **Clusters**)를 클릭합니다.
3. 사용 중인 클러스터의 **Browse Collections** 버튼을 클릭합니다.

### 1.2 root 데이터베이스 및 academies 컬렉션 확인

1. 좌측 데이터베이스 목록에서 `root` 데이터베이스를 찾습니다.

> [!TIP]
> 처음 실행 시 백엔드 서버가 `root` 데이터베이스를 자동으로 생성합니다. 만약 `root` 데이터베이스가 보이지 않으면 백엔드 서버를 한 번 실행했다가 종료한 후 새로고침하세요.

2. `root` 데이터베이스 아래 `academies` 컬렉션을 선택합니다.
3. 컬렉션이 비어있는 것이 정상입니다.

### 1.3 Academy Document 삽입

**INSERT DOCUMENT** 버튼을 클릭하고, 보기 모드를 `{}` (JSON 보기)로 전환한 후 다음 내용을 입력합니다.

```json
{
  "academyId": "root",
  "academyName": "root",
  "dbName": "root",
  "isActivated": true
}
```

각 필드의 의미는 다음과 같습니다.

| 필드 | 설명 |
|------|------|
| `academyId` | 아카데미 고유 식별자 (로그인 시 입력) |
| `academyName` | 아카데미 표시 이름 |
| `dbName` | 아카데미 전용 데이터베이스 이름 |
| `isActivated` | 아카데미 활성화 상태 (`true` 필수) |

**Insert** 버튼을 클릭하여 Document를 저장합니다.

> [!WARNING]
> `isActivated` 값을 반드시 `true`(Boolean)로 설정하세요. `"true"`(문자열)로 입력하면 아카데미에 입장할 수 없습니다.

---

## 2. 아카데미 입장 확인

1. 백엔드 서버와 프론트엔드 서버가 모두 실행 중인지 확인합니다.
2. 브라우저에서 `http://localhost:3030`에 접속합니다.
3. **아카데미 입장** 화면이 표시됩니다.
4. 입력란에 `root`를 입력하고 입장합니다.

정상적으로 설정되었다면 로그인 화면으로 이동합니다.

> [!IMPORTANT]
> 아카데미 입장 화면에서 "아카데미를 찾을 수 없습니다"라는 메시지가 나타나면 1단계에서 생성한 Document의 `academyId` 값과 입력한 값이 정확히 일치하는지 확인하세요.

---

## 3. 소유자 계정 생성

아카데미에 입장했지만 아직 로그인할 수 있는 사용자가 없습니다. MongoDB에서 소유자(Owner) 계정을 직접 생성합니다. MongoDB에 넣는 `password`는 **평문이 아니라 bcrypt 해시**여야 합니다. (Atlas Insert는 Mongoose `pre("save")` 훅을 거치지 않습니다.)

### 3.1 비밀번호 해시 생성

백엔드 디렉터리에서 원하는 초기 비밀번호의 해시를 만듭니다. `saltRounds`는 `.env`의 값(기본 예시 `10`)과 맞춥니다.

```bash
cd backend
node --input-type=module -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash('여기에-비밀번호', 10))"
```

출력된 `$2b$...` 문자열 전체를 복사합니다.

> [!WARNING]
> 예시에 넣은 비밀번호는 즉시 안전한 값으로 바꾸고, 해시 생성에 사용한 평문 비밀번호를 기억해 두세요. 프로덕션에서는 임시 비밀번호를 쓰고 로그인 후 설정에서 다시 변경하는 것을 권장합니다.

### 3.2 users 컬렉션에 Document 삽입

1. MongoDB Atlas에서 `root` 데이터베이스의 `users` 컬렉션을 선택합니다.
2. **INSERT DOCUMENT** 버튼을 클릭합니다.
3. `{}` (JSON 보기)로 전환한 후 다음 내용을 입력합니다. `password`에는 위에서 생성한 해시를 넣습니다.

```json
{
  "academyId": "root",
  "academyName": "root",
  "auth": "owner",
  "userId": "admin",
  "userName": "관리자",
  "password": "$2b$10$......................................................"
}
```

각 필드의 의미는 다음과 같습니다.

| 필드 | 값 | 설명 |
|------|-----|------|
| `academyId` | `"root"` | 소속 아카데미 ID |
| `academyName` | `"root"` | 소속 아카데미 이름 |
| `auth` | `"owner"` | 권한 수준 (최고 관리자) |
| `userId` | `"admin"` | 로그인에 사용할 사용자 ID |
| `userName` | `"관리자"` | 화면에 표시될 이름 |
| `password` | bcrypt 해시 | 평문 비밀번호가 아닌 해시 문자열 |

**Insert** 버튼을 클릭하여 Document를 저장합니다.

> [!TIP]
> `userId`와 `userName`은 원하는 값으로 변경할 수 있습니다. 단, `auth`는 반드시 `"owner"`여야 합니다.

> [!IMPORTANT]
> 인증 코드를 주석 처리하거나 비밀번호 검증을 우회하지 마세요. 해시가 올바르면 바로 로그인할 수 있습니다.

---

## 4. 로그인 확인

1. 브라우저에서 아카데미 ID `root`로 입장합니다.
2. 아이디 `admin`(또는 설정한 `userId`)과 **해시 생성 시 사용한 평문 비밀번호**로 로그인합니다.
3. 로그인에 성공하면 Altsis 대시보드가 표시됩니다.
4. (권장) 우측 상단 프로필·설정에서 비밀번호를 다시 변경합니다. UI에서 변경하면 bcrypt로 다시 해싱되어 저장됩니다.

로그인에 실패하면 다음을 확인하세요.

- Document의 `password`가 해시 전체인지 (따옴표·줄바꿈 잘림 없는지)
- `saltRounds`와 해시 생성 시 사용한 rounds가 같은지
- `auth`가 `"owner"`인지, `academyId`가 `"root"`인지

---

## 5. 초기 설정 완료 확인

다음 항목이 모두 완료되었는지 확인합니다.

- [ ] MongoDB에 `root` 아카데미 Document가 존재하고 `isActivated: true`
- [ ] MongoDB에 소유자(Owner) 계정 Document가 존재하고 `password`가 bcrypt 해시
- [ ] 설정한 비밀번호로 정상 로그인 가능
- [ ] 로그인 후 Altsis 대시보드가 정상 표시

---

## 다음 단계

초기 설정이 완료되었습니다. 이제 다음 작업을 진행할 수 있습니다.

| 작업 | 참고 문서 |
|------|----------|
| 새 아카데미 생성 | [관리자 가이드 - 아카데미 관리](../admin-guide/academy-management.md) |
| 학교 생성 및 설정 | [관리자 가이드 - 학교 관리](../admin-guide/school-management.md) |
| 사용자 등록 및 관리 | [관리자 가이드 - 사용자 관리](../admin-guide/user-management.md) |
| 학기 생성 | [관리자 가이드 - 학기 관리](../admin-guide/season-management.md) |

> [!TIP]
> `root` 아카데미의 소유자(Owner) 계정은 시스템 전체의 최고 관리자입니다. 이 계정으로 새로운 아카데미를 생성하고 각 아카데미의 관리자(Admin)를 지정할 수 있습니다.
