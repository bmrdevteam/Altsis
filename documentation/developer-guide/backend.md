# 백엔드 개발 가이드

Altsis 백엔드는 **Express.js** 기반의 REST API 서버입니다. 이 문서에서는 백엔드 개발에 필요한 핵심 개념과 패턴을 설명합니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [아키텍처 계층 구조](#2-아키텍처-계층-구조)
3. [라우트 작성](#3-라우트-작성)
4. [컨트롤러 작성](#4-컨트롤러-작성)
5. [모델 작성](#5-모델-작성)
6. [서비스 계층](#6-서비스-계층)
7. [인증 미들웨어](#7-인증-미들웨어)
8. [에러 처리](#8-에러-처리)
9. [파일 업로드 (S3)](#9-파일-업로드-s3)
10. [WebSocket](#10-websocket)
11. [로깅](#11-로깅)
12. [API 버그 해결 프로세스](#12-api-버그-해결-프로세스)

---

## 1. 기술 스택

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Express.js | 4.21.x | REST API 서버 |
| Mongoose | 6.x | MongoDB ODM |
| Passport | 0.6.x | 인증 (Local + Google OAuth) |
| Redis | 4.x | 세션 저장소 |
| Socket.IO | 4.x | WebSocket 실시간 통신 |
| AWS SDK | 2.x | S3 파일 스토리지 |
| Winston | 3.x | 로깅 |
| Multer | 1.4.x | 파일 업로드 미들웨어 |
| bcrypt | 5.x | 비밀번호 해싱 |
| node-cron | 4.x | 스케줄러 (cron) |
| mongoose-encryption | 2.x | 필드 암호화 |

AI 기능(OpenAI / Anthropic / Google Gemini)은 별도 SDK 없이 Node.js 내장 `fetch`로 각 제공자의 REST API를 직접 호출합니다 (`src/services/aiProvider.js`).

관련 모듈:
- `src/services/aiPromptPolicy.js` — 프롬프트 한도, 작업별 프로필(`syllabusReview`/`chat`), JSON 파싱
- `src/services/aiSkills.js` — Alter Skill 라우터 (`chat`, `syllabus-review`)
- `src/services/aiSafety.js` — 개인정보 패턴 마스킹
- `src/services/aiUsage.js` — `AIUsageLog` 기록 헬퍼 (`provider`, `feature`, `success`, `errorCode`)
- 강의계획서 생성은 JSON 검증 실패 시 1회 재시도하며, 빈 응답/`raw` 성공 처리는 하지 않습니다.

> **참고**: 백엔드는 ES Module (`"type": "module"`)을 사용합니다. `import`/`export` 문법을 사용하십시오.

---

## 2. 아키텍처 계층 구조

백엔드는 다음과 같은 계층 구조를 따릅니다:

```
클라이언트 요청
    ↓
[Route]          라우트 정의 + 미들웨어 체이닝
    ↓
[Middleware]      인증/권한 검사 (isLoggedIn, isAdmin 등)
    ↓
[Controller]     요청 처리, 응답 반환
    ↓
[Service]        비즈니스 로직 (선택적)
    ↓
[Model]          MongoDB 데이터 접근
```

### 데이터 흐름 예시

학기 생성 API (`POST /api/seasons`)의 전체 흐름:

```
1. 클라이언트: POST /api/seasons { school, year, term, period }
2. Route:      router.post("/", isAdManager, seasons.create)
3. Middleware:  isAdManager → admin 또는 manager 권한 확인
4. Controller:  seasons.create → 요청 검증, School 조회, Season 생성
5. Service:     SeasonService → 추가 비즈니스 로직
6. Model:       Season(dbName).create({...}) → MongoDB 저장
7. 응답:        res.status(200).send({ season })
```

---

## 3. 라우트 작성

### 기본 구조

라우트 파일은 `backend/src/routes/`에 위치하며, 리소스별로 분리됩니다.

```javascript
// routes/seasons.js
import express from "express";
const router = express.Router();
import * as seasons from "../controllers/seasons.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";

// CREATE
router.post("/", isAdManager, seasons.create);

// READ (단건/목록)
router.get("/:_id?", isLoggedIn, seasons.find);

// UPDATE
router.put("/:_id/activate", isAdManager, seasons.activate);
router.put("/:_id/inactivate", isAdManager, seasons.inactivate);
router.put("/:_id/period", isAdManager, seasons.updatePeriod);
router.put("/:_id/classrooms", isAdManager, seasons.updateClassrooms);

// DELETE
router.delete("/:_id", isAdManager, seasons.remove);

export { router };
```

### URL 패턴

모든 API는 `/api/{resource}` 패턴을 따릅니다:

| 패턴 | HTTP 메서드 | 설명 |
| --- | --- | --- |
| `/api/seasons` | POST | 학기 생성 |
| `/api/seasons` | GET | 학기 목록 조회 |
| `/api/seasons/:_id` | GET | 학기 단건 조회 |
| `/api/seasons/:_id/period` | PUT | 학기 기간 수정 |
| `/api/seasons/:_id` | DELETE | 학기 삭제 |

하위 리소스나 특정 동작은 URL 경로로 표현합니다:

```
PUT /api/seasons/:_id/activate        # 학기 활성화
PUT /api/seasons/:_id/permission/:type # 권한 수정
POST /api/seasons/:_id/permission/:type/exceptions  # 권한 예외 추가
```

### 라우터 등록

모든 라우터는 `routes/index.js`에서 통합됩니다:

```javascript
// routes/index.js
export const routers = [
  { label: "academies", routes: academies },
  { label: "seasons", routes: seasons },
  { label: "syllabuses", routes: syllabuses },
  { label: "enrollments", routes: enrollments },
  // ...
];
```

`app.js`에서 라우터를 `/api/{label}` 경로에 등록합니다.

---

## 4. 컨트롤러 작성

### CRUD 명명 규칙

컨트롤러 함수는 다음 명명 규칙을 따릅니다:

| 함수명 패턴 | HTTP 메서드 | 설명 | 예시 |
| --- | --- | --- | --- |
| `CResource` | POST | 생성 | `CSeason`, `CSyllabus` |
| `RResources` | GET | 목록 조회 | `RSeasons`, `RSyllabuses` |
| `RResource` | GET | 단건 조회 | `RSeason`, `RSyllabus` |
| `UResource` | PUT | 수정 | `USeason`, `USyllabus` |
| `DResource` | DELETE | 삭제 | `DSeason`, `DSyllabus` |

> **참고**: 라우트 파일에서는 `create`, `find`, `update`, `remove` 같은 이름을 사용하는 경우도 있습니다. 이는 레거시 패턴이므로, 새로운 컨트롤러 작성 시에는 위의 명명 규칙을 따르십시오.

### JSDoc 문서화

모든 컨트롤러 함수는 JSDoc으로 문서화해야 합니다:

```javascript
/**
 * @memberof APIs.SeasonAPI
 * @function CSeason API
 * @description 학기 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/seasons"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.school - ObjectId of school(sid)
 * @param {string} req.body.year
 * @param {string} req.body.term
 * @param {Object} req.body.period
 * @param {string} req.body.period.start - "YYYY-MM-DD"
 * @param {string} req.body.period.end - "YYYY-MM-DD"
 *
 * @param {Object} res
 * @param {Object} res.season - created season
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | SCHOOL_NOT_FOUND | if school is not found            |
 * | 409    | FIELD_IN_USE     | if year+term already exists       |
 */
export const create = async (req, res) => {
  try {
    // 구현...
    return res.status(200).send({ season });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
```

### 컨트롤러 작성 패턴

```javascript
// controllers/seasons.js
import { Season, School } from "../models/index.js";
import { FIELD_REQUIRED, FIELD_INVALID, __NOT_FOUND } from "../messages/index.js";
import { validate } from "../utils/validate.js";

export const create = async (req, res) => {
  try {
    // 1. 요청 검증
    if (!req.body.school) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    // 2. 관련 데이터 조회 (멀티 DB 패턴)
    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // 3. 데이터 생성
    const season = await Season(req.user.academyId).create({
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      year: req.body.year,
      term: req.body.term,
      period: req.body.period,
    });

    // 4. 응답 반환
    return res.status(200).send({ season });
  } catch (err) {
    if (err.code === 11000) {
      // MongoDB 중복 키 에러
      return res.status(409).send({ message: "SEASON_IN_USE" });
    }
    return res.status(500).send({ message: err.message });
  }
};
```

---

## 5. 모델 작성

### 기본 구조

Mongoose 스키마를 정의하고, 멀티 데이터베이스 패턴으로 내보냅니다:

```javascript
// models/Season.js
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

// 서브 스키마 정의
const periodSchema = mongoose.Schema(
  {
    start: String, // "YYYY-MM-DD"
    end: String,
  },
  { _id: false }  // 서브 스키마에서 _id 비활성화
);

// 메인 스키마 정의
const seasonSchema = mongoose.Schema(
  {
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    schoolId: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      required: true,
    },
    period: {
      type: periodSchema,
      default: { start: "", end: "" },
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }  // createdAt, updatedAt 자동 추가
);

// 인덱스 설정
seasonSchema.index(
  { school: 1, year: -1, term: 1 },
  { unique: true }  // 복합 유니크 인덱스
);

// 인스턴스 메서드
seasonSchema.methods.getSubdocument = function () {
  return {
    season: this._id,
    school: this.school,
    year: this.year,
    term: this.term,
  };
};

// 멀티 데이터베이스 패턴: 아카데미별 DB에서 모델 생성
export const Season = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
```

### 멀티 데이터베이스 패턴

Altsis는 아카데미별로 독립된 MongoDB 데이터베이스를 사용합니다. 모든 모델은 팩토리 함수로 내보내며, `dbName` (= `academyId`)을 매개변수로 받습니다:

```javascript
// 모델 내보내기 패턴
export const Season = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};

// 컨트롤러에서 사용
const seasons = await Season(req.user.academyId).find({ school: schoolId });
```

`conn`은 `_database/mongodb/index.js`에서 관리되는 연결 객체로, 아카데미별 데이터베이스 연결을 캐싱합니다.

### 인덱스 설정

성능을 위해 적절한 인덱스를 설정합니다:

```javascript
// 단일 인덱스
seasonSchema.index({ school: 1 });

// 복합 유니크 인덱스
seasonSchema.index(
  { school: 1, year: -1, term: 1 },
  { unique: true }
);
```

### 암호화 필드

민감한 데이터는 `mongoose-encryption`을 사용하여 암호화합니다:

```javascript
import encrypt from "mongoose-encryption";

userSchema.plugin(encrypt, {
  encryptionKey: process.env.ENCRYPTION_KEY,
  signingKey: process.env.SIGNING_KEY,
  encryptedFields: ["sensitiveField"],
});
```

### JSDoc 타입 정의

모델 스키마에는 JSDoc으로 타입을 문서화합니다:

```javascript
/**
 * @memberof Models.Season
 * @typedef TSeason
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} school - school._id
 * @prop {string} schoolId - school.schoolId
 * @prop {string} year - 학년도
 * @prop {string} term - 학기
 * @prop {TPeriod} period - 기간
 * @prop {boolean} isActivated - 활성화 상태
 */
```

---

## 6. 서비스 계층

비즈니스 로직이 복잡하거나 여러 컨트롤러에서 공유되는 경우 서비스 계층으로 분리합니다.

### 현재 서비스 목록

| 서비스 | 역할 |
| --- | --- |
| `scheduler.js` | cron 기반 스케줄러 (정기 작업) |
| `notifications.js` | 알림 발송 로직 |
| `registrations.js` | 학기 등록 권한/처리 |
| `seasons.js` | 학기 비즈니스 로직 (권한 예외 처리 등) |
| `boards.js` | 게시판 서비스 |
| `users.js` | 사용자 관련 서비스 |
| `themeSettings.js` | 테마 설정 CRUD |

### 서비스 작성 패턴

```javascript
// services/seasons.js
import { Season, Registration } from "../models/index.js";

export const SeasonService = {
  /**
   * 학기 활성화 시 추가 처리
   */
  async onActivate(dbName, seasonId) {
    const season = await Season(dbName).findById(seasonId);
    // 비즈니스 로직...
    return season;
  },
};

// 개별 함수 내보내기도 가능
export const addSeasonPermissionException = async (dbName, seasonId, data) => {
  // ...
};
```

### 스케줄러

`node-cron`을 사용하여 정기 작업을 실행합니다:

```javascript
// services/scheduler.js
import cron from "node-cron";

export const initializeScheduler = () => {
  // 매일 자정에 실행
  cron.schedule("0 0 * * *", async () => {
    // 정기 작업 (예: 만료된 세션 정리, 알림 발송 등)
  });
};
```

---

## 7. 인증 미들웨어

`middleware/auth.js`에 정의된 인증 미들웨어입니다:

| 미들웨어 | 설명 | 사용 예시 |
| --- | --- | --- |
| `isLoggedIn` | 로그인 여부 확인 | 일반 API |
| `isNotLoggedIn` | 비로그인 상태 확인 | 로그인/회원가입 API |
| `forceNotLoggedIn` | 로그인 상태면 강제 로그아웃 | 특수 상황 |
| `isOwner` | owner 권한 확인 | 시스템 관리 API |
| `isAdmin` | admin 권한 확인 | 아카데미 관리 API |
| `isAdManager` | admin 또는 manager 권한 확인 | 학교/학기 관리 API |
| `isOwAdManager` | owner, admin, manager 중 하나 | 고급 관리 API |
| `isOwAdmin` | owner 또는 admin | 아카데미 + 시스템 관리 |
| `ownerToAdmin` | owner가 특정 아카데미에 접근 | 아카데미 위임 관리 |

### 미들웨어 체이닝 예시

```javascript
// admin 또는 manager만 접근 가능
router.post("/", isAdManager, seasons.create);

// 로그인한 모든 사용자 접근 가능
router.get("/:_id?", isLoggedIn, seasons.find);

// admin만 접근 가능
router.delete("/:_id", isAdmin, seasons.remove);
```

### 인증 흐름

```
요청 → Express 세션 → Passport deserializeUser → req.user 설정
    → 미들웨어 (isLoggedIn 등) → 컨트롤러
```

세션은 Redis에 저장됩니다 (TTL: 24시간, rolling 갱신).

---

## 8. 에러 처리

### 메시지 상수

`messages/index.js`에 정의된 상수를 사용하여 일관된 에러 메시지를 반환합니다:

```javascript
import {
  FIELD_REQUIRED,       // (field) => `${FIELD}_REQUIRED`
  FIELD_INVALID,        // (field) => `${FIELD}_INVALID`
  FIELD_IN_USE,         // (field) => `${FIELD}_IN_USE`
  __NOT_FOUND,          // (field) => `${FIELD}_NOT_FOUND`
  PERMISSION_DENIED,    // "PERMISSION_DENIED"
  CONNECTED_ALREADY,    // (field) => `${FIELD}_CONNECTED_ALREADY`
  DISCONNECTED_ALREADY, // (field) => `${FIELD}_DISCONNECTED_ALREADY`
} from "../messages/index.js";
```

### HTTP 상태 코드 규칙

| 상태 코드 | 용도 | 메시지 예시 |
| --- | --- | --- |
| 200 | 성공 | `{ season: {...} }` |
| 400 | 잘못된 요청 (필드 누락/무효) | `FIELD_REQUIRED("school")` |
| 401 | 인증 실패 | `PASSWORD_INCORRECT` |
| 403 | 권한 없음 | `PERMISSION_DENIED` |
| 404 | 리소스 없음 | `__NOT_FOUND("season")` |
| 409 | 충돌 (중복, 제한 초과) | `FIELD_IN_USE("season")`, `STUDENTS_FULL` |
| 500 | 서버 에러 | `err.message` |

### 에러 처리 패턴

```javascript
export const create = async (req, res) => {
  try {
    // 1. 필수 필드 검증 → 400
    if (!req.body.school) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    // 2. 리소스 존재 확인 → 404
    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // 3. 비즈니스 규칙 검증 → 409
    if (someCondition) {
      return res.status(409).send({ message: SYLLABUS_CONFIRMED_ALREADY });
    }

    // 4. 데이터 처리
    const result = await Model(req.user.academyId).create({...});

    // 5. 성공 응답
    return res.status(200).send({ result });
  } catch (err) {
    // 6. MongoDB 중복 키 에러 → 409
    if (err.code === 11000) {
      return res.status(409).send({ message: FIELD_IN_USE("resource") });
    }
    // 7. 기타 에러 → 500
    return res.status(500).send({ message: err.message });
  }
};
```

---

## 9. 파일 업로드 (S3)

### Multer + S3 패턴

AWS S3에 파일을 업로드하기 위해 `multer` + `multer-s3`를 사용합니다:

```
backend/src/_s3/
├── fileBucket.js         # 파일 버킷 설정 (S3 클라이언트, 서명 URL)
├── profileBucket.js      # 프로필 이미지 버킷
├── archiveMulter.js      # 기록물 업로드 설정
├── chatMulter.js         # 채팅 파일 업로드 설정
├── courseMulter.js        # 수업 파일 업로드 설정
├── profileMulter.js      # 프로필 이미지 업로드 설정
└── aiRefMulter.js        # AI 참고자료 업로드 설정
```

각 Multer 설정은 허용 파일 크기, MIME 타입, S3 저장 경로를 정의합니다.

---

## 10. WebSocket

Socket.IO를 사용하여 실시간 통신을 지원합니다:

```javascript
// utils/webSocket.js
import { Server } from "socket.io";

export const initializeWebSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: process.env.URL },
  });

  io.on("connection", (socket) => {
    // 연결 처리
    socket.on("join", (room) => socket.join(room));
    socket.on("message", (data) => io.to(data.room).emit("message", data));
  });
};
```

주요 실시간 기능:
- 채팅 메시지 송수신
- 알림 실시간 전달

---

## 11. 로깅

Winston 기반 로깅 시스템을 사용합니다:

| 파일 | 용도 |
| --- | --- |
| `log/logger.js` | 환경별 로거 팩토리 |
| `log/devLogger.js` | 개발 환경: 콘솔 출력 |
| `log/prodLogger.js` | 프로덕션 환경: 파일 + S3 로깅 |

HTTP 요청은 `morgan`으로 로깅되며, 커스텀 포맷으로 아카데미 ID, 사용자 ID 등을 함께 기록합니다.

---

## 12. API 버그 해결 프로세스

API 관련 버그를 효율적으로 해결하기 위한 단계별 프로세스입니다.

### 1단계: 클라이언트에서 사용하는 API 이름 확인

프론트엔드 코드에서 호출하는 API 함수명을 확인합니다:

```typescript
// 프론트엔드 코드에서
const { SeasonAPI } = useAPIv2();
const result = await SeasonAPI.CSeason({ data: {...} });
//                             ^^^^^^^ 이 함수명 확인
```

### 2단계: useAPIv2에서 해당 API 찾기

`frontend/src/hooks/useAPIv2.ts`에서 해당 함수를 찾아 호출하는 API 엔드포인트를 확인합니다:

```typescript
// useAPIv2.ts 내부
async function CSeason(props) {
  const { season } = await database.C({
    location: `seasons`,  // → POST /api/seasons
    data: props.data,
  });
  return { season };
}
```

### 3단계: 백엔드에서 해당 엔드포인트 검색

백엔드 `routes/` 디렉토리에서 해당 엔드포인트를 찾습니다:

```bash
# 라우트 파일에서 검색
grep -r "seasons" backend/src/routes/
```

```javascript
// routes/seasons.js
router.post("/", isAdManager, seasons.create);  // → controllers/seasons.js의 create
```

### 4단계: 에러 메시지로 원인 파악

컨트롤러에서 반환하는 에러 메시지를 추적합니다:

```javascript
// controllers/seasons.js
return res.status(404).send({ message: __NOT_FOUND("school") });
// → 프론트엔드에서 "SCHOOL_NOT_FOUND" 메시지 수신
```

### 5단계: 수정 후 검증

1. 에러 원인이 되는 코드를 수정합니다.
2. `yarn dev`로 서버를 재시작합니다.
3. 프론트엔드에서 동일한 동작을 수행하여 수정을 검증합니다.
4. 관련 테스트가 있다면 `yarn test`로 확인합니다.

### 디버깅 팁

| 상황 | 확인 방법 |
| --- | --- |
| API 응답 확인 | 브라우저 개발자 도구 Network 탭 |
| 요청 본문 확인 | `morgan` 로그 (req.body 포함) |
| DB 쿼리 확인 | MongoDB Compass에서 데이터 확인 |
| 세션 확인 | Redis CLI로 세션 데이터 확인 |
| 권한 문제 | `req.user.auth` 값과 미들웨어 조건 확인 |

---

[목차로 돌아가기](./README.md)
