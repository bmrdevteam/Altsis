# 빠른 시작 가이드

이 문서는 Altsis를 **10분 안에** 로컬 환경에서 구동하는 요약 가이드입니다. 각 단계의 상세한 설명은 개별 문서를 참고하세요.

> [!IMPORTANT]
> 이 가이드를 시작하기 전에 다음 항목이 준비되어야 합니다.
>
> - Node.js (LTS), Yarn, Git 설치 완료
> - MongoDB Atlas 클러스터 연결 URI
> - Redis Cloud 연결 URI
> - AWS S3 버킷 2개 및 자격 증명
> - Google OAuth Client ID
>
> 자세한 요구사항은 [시스템 요구사항](requirements.md)을 참고하세요.

---

## 1단계: 소스 코드 클론 (1분)

```bash
git clone https://github.com/bmrdevteam/Altsis.git
cd Altsis
```

---

## 2단계: 백엔드 설정 (3분)

```bash
cd backend
yarn install
yarn global add cross-env && yarn global add nodemon
```

`backend/.env` 파일을 생성합니다.

```env
URL=http://localhost:3030
SERVER_PORT=8080
DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
REDIS_URL=redis://<username>:<password>@<host>:<port>
session_key=your-session-secret-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
saltRounds=10
s3_region=ap-northeast-2
s3_bucket=your-profile-bucket
s3_accessKeyId=YOUR_ACCESS_KEY
s3_secretAccessKey=YOUR_SECRET_KEY
s3_bucket2=your-file-bucket
s3_accessKeyId2=YOUR_ACCESS_KEY_2
s3_secretAccessKey2=YOUR_SECRET_KEY_2
ENCKEY_E=<32바이트-Base64-키>
SIGKEY_E=<64바이트-Base64-키>
ENCKEY_A=<32바이트-Base64-키>
SIGKEY_A=<64바이트-Base64-키>
```

> [!TIP]
> 암호화 키는 다음 명령으로 생성할 수 있습니다.
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # ENCKEY용
> node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"  # SIGKEY용
> ```

백엔드 서버를 실행합니다.

```bash
yarn dev
```

`Express server listening on port 8080` 메시지가 출력되면 성공입니다.

---

## 3단계: 프론트엔드 설정 (2분)

새 터미널 창을 열고 다음을 실행합니다.

```bash
cd frontend
yarn install
```

`frontend/.env` 파일을 생성합니다.

```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_SERVER_URL=http://localhost:8080
PORT=3030
```

프론트엔드 개발 서버를 실행합니다.

```bash
yarn start
```

브라우저에 `http://localhost:3030`이 자동으로 열립니다.

---

## 4단계: 아카데미 및 관리자 생성 (3분)

### 4.1 MongoDB Atlas에서 아카데미 생성

[MongoDB Atlas](https://cloud.mongodb.com/)에 접속하여 `root` 데이터베이스 > `academies` 컬렉션에 다음 Document를 삽입합니다.

```json
{
  "academyId": "root",
  "academyName": "root",
  "dbName": "root",
  "isActivated": true
}
```

### 4.2 관리자 계정 생성

`root` 데이터베이스 > `users` 컬렉션에 다음 Document를 삽입합니다.

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

### 4.3 비밀번호 우회 → 로그인 → 복원

1. `backend/src/_passport/localStrategy2.js`의 **35-39번째 줄**을 주석 처리합니다.

   ```javascript
   // const isMatch = await user.comparePassword(password);
   // if (!isMatch) {
   //   const err = new Error(PASSWORD_INCORRECT);
   //   return done(err, null, null);
   // }
   ```

2. 브라우저에서 아카데미 ID `root`로 입장 후 `admin` / 아무 비밀번호로 로그인합니다.

3. 설정에서 비밀번호를 변경합니다.

4. 주석 처리한 코드를 **원래대로 복원**하고 서버를 재시작합니다.

> [!WARNING]
> 비밀번호 검증 코드를 반드시 복원하세요. 복원하지 않으면 아무 비밀번호로도 로그인이 가능한 보안 취약점이 발생합니다.

---

## 완료

축하합니다! Altsis가 로컬 환경에서 실행되고 있습니다.

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | `http://localhost:3030` |
| 백엔드 API | `http://localhost:8080` |

### 다음 단계

- [관리자 가이드](../admin-guide/README.md)를 참고하여 학교와 사용자를 설정하세요.
- 각 단계의 상세한 설명이 필요하면 [설치 가이드](installation.md)와 [초기 설정](initial-setup.md)을 참고하세요.
