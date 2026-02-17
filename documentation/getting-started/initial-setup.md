# 초기 설정

이 문서는 Altsis를 설치한 후 첫 번째 아카데미를 생성하고 관리자 계정으로 로그인하는 과정을 단계별로 설명합니다. [설치 가이드](installation.md)를 먼저 완료하세요.

---

## 목차

1. [아카데미 Document 생성](#1-아카데미-document-생성)
2. [아카데미 입장 확인](#2-아카데미-입장-확인)
3. [소유자 계정 생성](#3-소유자-계정-생성)
4. [비밀번호 우회 로그인](#4-비밀번호-우회-로그인)
5. [비밀번호 설정 및 보안 복원](#5-비밀번호-설정-및-보안-복원)
6. [초기 설정 완료 확인](#6-초기-설정-완료-확인)

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

아카데미에 입장했지만 아직 로그인할 수 있는 사용자가 없습니다. MongoDB에서 소유자(Owner) 계정을 직접 생성합니다.

### 3.1 users 컬렉션에 Document 삽입

1. MongoDB Atlas에서 `root` 데이터베이스의 `users` 컬렉션을 선택합니다.
2. **INSERT DOCUMENT** 버튼을 클릭합니다.
3. `{}` (JSON 보기)로 전환한 후 다음 내용을 입력합니다.

```json
{
  "academyId": "root",
  "academyName": "root",
  "auth": "owner",
  "userId": "admin",
  "userName": "관리자",
  "password": ""
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
| `password` | `""` | 비밀번호 (빈 문자열 -- 다음 단계에서 설명) |

**Insert** 버튼을 클릭하여 Document를 저장합니다.

> [!TIP]
> `userId`와 `userName`은 원하는 값으로 변경할 수 있습니다. 단, `auth`는 반드시 `"owner"`여야 합니다.

---

## 4. 비밀번호 우회 로그인

비밀번호를 빈 문자열로 생성했기 때문에 정상적인 로그인이 불가능합니다. 첫 로그인을 위해 **일시적으로** 비밀번호 검증 코드를 우회해야 합니다.

### 4.1 localStrategy2.js 수정

다음 파일을 텍스트 에디터로 엽니다.

```
backend/src/_passport/localStrategy2.js
```

**35번째 줄부터 39번째 줄**의 비밀번호 검증 코드를 주석 처리합니다.

수정 **전**:

```javascript
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error(PASSWORD_INCORRECT);
        return done(err, null, null);
      }
```

수정 **후**:

```javascript
      // const isMatch = await user.comparePassword(password);
      // if (!isMatch) {
      //   const err = new Error(PASSWORD_INCORRECT);
      //   return done(err, null, null);
      // }
```

> [!WARNING]
> 이 수정은 **반드시 일시적**이어야 합니다. 비밀번호 검증을 비활성화한 상태에서는 어떤 비밀번호로도 로그인이 가능합니다. 5단계에서 반드시 원래대로 복원하세요.

### 4.2 서버 재시작

`nodemon`이 실행 중이면 파일 변경을 감지하여 자동으로 서버가 재시작됩니다. 자동 재시작이 되지 않으면 백엔드 서버를 수동으로 재시작하세요.

```bash
# 기존 서버 종료 (Ctrl+C) 후 재실행
cd backend
yarn dev
```

### 4.3 로그인

1. 브라우저에서 로그인 화면으로 돌아갑니다.
2. 다음 정보로 로그인합니다.

| 필드 | 값 |
|------|-----|
| 아이디 | `admin` |
| 비밀번호 | (아무 값이나 입력) |

3. 로그인에 성공하면 Altsis 대시보드가 표시됩니다.

---

## 5. 비밀번호 설정 및 보안 복원

### 5.1 비밀번호 변경

1. 로그인 후 우측 상단의 **프로필** 또는 **설정** 메뉴로 이동합니다.
2. **비밀번호 변경** 기능을 찾아 새 비밀번호를 설정합니다.
3. 비밀번호가 정상적으로 변경되었는지 확인합니다.

> [!IMPORTANT]
> 비밀번호는 `bcrypt`로 해싱되어 데이터베이스에 저장됩니다. 한 번 설정하면 원문을 알 수 없으므로 안전한 비밀번호를 설정하고 기억하세요.

### 5.2 비밀번호 검증 코드 복원

4단계에서 주석 처리한 코드를 **반드시 원래대로 복원**합니다.

`backend/src/_passport/localStrategy2.js` 파일의 35-39번째 줄을 다시 활성화합니다.

수정 **후** (원래 코드로 복원):

```javascript
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error(PASSWORD_INCORRECT);
        return done(err, null, null);
      }
```

### 5.3 서버 재시작

파일 저장 후 서버가 자동으로 재시작됩니다. 자동 재시작이 되지 않으면 수동으로 재시작하세요.

### 5.4 로그인 재확인

1. 브라우저를 새로고침하거나 로그아웃합니다.
2. 5.1에서 설정한 새 비밀번호로 로그인을 시도합니다.
3. 정상적으로 로그인되는지 확인합니다.

> [!WARNING]
> 비밀번호 검증 코드를 복원하지 않으면 누구든 아무 비밀번호로 로그인할 수 있는 **심각한 보안 취약점**이 발생합니다. 반드시 코드를 복원하고 서버를 재시작하세요.

---

## 6. 초기 설정 완료 확인

다음 항목이 모두 완료되었는지 확인합니다.

- [ ] MongoDB에 `root` 아카데미 Document가 존재하고 `isActivated: true`
- [ ] MongoDB에 소유자(Owner) 계정 Document가 존재
- [ ] `localStrategy2.js`의 비밀번호 검증 코드가 원래대로 복원됨
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
