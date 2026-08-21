# 인증 및 권한 체계

Altsis의 사용자 인증 방식, 세션 관리, 역할 기반 권한 모델, 그리고 프론트엔드/백엔드의 인증 구현을 설명합니다.

---

## 인증 방식

Altsis는 **Passport.js**를 사용하여 두 가지 인증 전략을 지원합니다.

### 1. 로컬 인증 (Local Strategy)

사용자 ID와 비밀번호를 이용한 기본 인증 방식입니다.

```
┌─────────┐    academyId     ┌──────────┐    root DB     ┌──────────┐
│         │    userId        │          │   아카데미 조회  │          │
│ 클라이언트├───password──────►│  Express ├──────────────►│ MongoDB  │
│         │                  │  Server  │                │  Atlas   │
│         │◄──세션 쿠키──────┤          │◄─아카데미 확인──┤          │
└─────────┘                  │          │                └──────────┘
                             │          │   {academyId}-db
                             │          ├──사용자 조회──►┌──────────┐
                             │          │               │ 아카데미  │
                             │          │◄─비밀번호 검증─┤   DB     │
                             └──────────┘               └──────────┘
```

**인증 흐름:**

1. 클라이언트가 `academyId`, `userId`, `password`를 전송
2. 루트 DB에서 아카데미 존재 여부 및 활성화 상태 확인
3. 아카데미 DB에서 사용자 조회
4. `bcrypt`로 비밀번호 해시 비교
5. 인증 성공 시 세션 생성 및 쿠키 발급

```javascript
// backend/src/_passport/localStrategy2.js (핵심 로직)
passport.use("local2", new CustomStrategy(async function (req, done) {
  const { academyId, userId, password } = req.body;

  // 1. 아카데미 확인
  const academy = await Academy.findOne({ academyId });
  if (!academy || !academy.isActivated) return done(err);

  // 2. 사용자 조회 및 비밀번호 검증
  const user = await User(academyId).findOne({ userId }).select("+password");
  const isMatch = await user.comparePassword(password);  // bcrypt
  if (!isMatch) return done(err);

  return done(null, user, academyId);
}));
```

### 2. Google OAuth 2.0

Google 계정을 이용한 소셜 로그인 방식입니다.

**인증 흐름:**

1. 클라이언트가 `academyId`와 Google `credential`(JWT 토큰)을 전송
2. Google API로 토큰을 검증하여 이메일(payload) 추출
3. 루트 DB에서 아카데미 확인
4. 아카데미 DB에서 `snsId.google` 필드가 해당 이메일과 일치하는 사용자 조회
5. 인증 성공 시 세션 생성

> [!NOTE]
> Google OAuth를 사용하려면 사전에 관리자가 해당 사용자 계정의 `snsId.google` 필드에 Google 이메일을 등록해야 합니다.

### 인증 전략 비교

| 항목 | 로컬 인증 | Google OAuth |
|------|-----------|-------------|
| 입력 | academyId + userId + password | academyId + Google credential |
| 비밀번호 | bcrypt 해시 비교 | 불필요 (Google 토큰 검증) |
| 사전 설정 | 계정 생성 시 자동 | `snsId.google` 이메일 등록 필요 |
| Passport 전략 | `passport-custom` (`local2`) | `passport-custom` (`google2`) |

---

## 세션 관리

### Redis 기반 세션 저장

세션 데이터는 **Redis**에 저장되어 서버 재시작 시에도 로그인 상태가 유지됩니다.

```javascript
// backend/src/app.js
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env["session_key"],
  cookie: {
    httpOnly: true,   // 브라우저 JavaScript에서 쿠키 접근 차단
    secure: false,    // HTTPS 환경에서는 true로 변경 권장
  },
  rolling: true,       // 매 요청마다 세션 만료 시간 갱신
  store: new RedisStore({
    client: redisClient,
    ttl: 24 * 60 * 60, // 24시간 후 세션 만료
  }),
}));
```

### 세션 설정 요약

| 설정 | 값 | 설명 |
|------|-----|------|
| `ttl` | 24시간 (86,400초) | 세션 유효 기간 |
| `rolling` | `true` | 요청 시마다 TTL 리셋 |
| `httpOnly` | `true` | XSS 공격으로부터 쿠키 보호 |
| `resave` | `false` | 불필요한 세션 재저장 방지 |
| `saveUninitialized` | `false` | 빈 세션 저장 방지 |

### Serialize / Deserialize

Passport의 직렬화/역직렬화 과정에서 아카데미 ID가 함께 저장되어, 세션 복원 시 올바른 아카데미 DB에서 사용자를 조회합니다.

```javascript
// Serialize: 세션에 저장할 최소 정보
passport.serializeUser(({ user, academyId }, done) => {
  done(null, { _id: user._id, academyId });
});

// Deserialize: 세션에서 사용자 복원
passport.deserializeUser(({ _id, academyId }, done) => {
  User(academyId).findOne({ _id }, (err, user) => {
    user["academyId"] = academyId;
    done(null, user);
  });
});
```

---

## 사용자 역할 체계

Altsis는 4단계 역할 체계를 사용합니다. 각 역할은 접근 가능한 기능의 범위가 다릅니다.

### 역할 계층 구조

```
┌────────────────────────────────────────────────────────────────┐
│  ⚫ owner (시스템 소유자)                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔴 admin (아카데미 관리자)                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  🔵 manager (학교 관리자)                            │  │  │
│  │  │  ┌──────────────────────────────────────────────┐  │  │  │
│  │  │  │  ⚪ member (일반 사용자: teacher / student)    │  │  │  │
│  │  │  └──────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 역할별 권한 상세

| 역할 | 기호 | 저장 위치 | 주요 권한 |
|------|------|-----------|-----------|
| **owner** | ⚫ | 루트 DB `users` | 아카데미 생성/삭제, 전체 시스템 관리 |
| **admin** | 🔴 | 아카데미 DB `users` | 학교/사용자 관리, 데이터 백업, 아카데미 설정 |
| **manager** | 🔵 | 아카데미 DB `users` | 학기/양식/권한 관리, 등록 관리 |
| **member** | ⚪ | 아카데미 DB `users` | 수업, 평가, 기록 등 일반 기능 (teacher/student) |

> [!NOTE]
> `member` 역할의 사용자는 학기 등록(registration) 시 `teacher` 또는 `student`로 세분화됩니다. 이는 사용자 계정의 `auth` 필드가 아닌 등록 정보의 `role` 필드로 관리됩니다.

### 역할별 접근 범위

```
owner ──► 루트 대시보드
          ├── 아카데미 목록 관리
          ├── 아카데미 생성/삭제
          └── 특정 아카데미에 admin 권한으로 접근 가능 (ownerToAdmin)

admin ──► 아카데미 대시보드
          ├── 학교 생성/관리
          ├── 사용자 계정 생성/관리
          ├── 데이터 백업/복원
          └── 아카데미 설정

manager ─► 학교 관리
           ├── 학기 생성/복사/활성화
           ├── 양식 편집
           ├── 권한 설정
           └── 등록 관리

member ──► 일반 기능
           ├── 수업 (개설/수강신청)
           ├── 평가 (입력/조회)
           ├── 기록 (조회/관리)
           ├── 일정, 보드, 채팅
           └── 알림, 설정
```

---

## 백엔드 미들웨어

### 인증/권한 미들웨어 목록

`backend/src/middleware/auth.js`에 정의된 미들웨어 함수들입니다.

| 미들웨어 | 허용 역할 | 설명 |
|----------|-----------|------|
| `isLoggedIn` | 모든 인증 사용자 | 로그인 여부 확인 |
| `isNotLoggedIn` | 미인증 사용자만 | 비로그인 상태 확인 |
| `forceNotLoggedIn` | 모두 | 로그인 상태면 강제 로그아웃 후 진행 |
| `isOwner` | owner | 시스템 소유자만 허용 |
| `ownerToAdmin` | owner | owner가 특정 아카데미에 admin으로 접근 |
| `isAdmin` | admin | 아카데미 관리자만 허용 |
| `isAdManager` | admin, manager | 관리자 또는 학교 관리자 허용 |
| `isOwAdManager` | owner, admin, manager | 소유자/관리자/학교 관리자 허용 |
| `isOwAdmin` | owner, admin | 소유자 또는 아카데미 관리자 허용 |

### 미들웨어 사용 예시

```javascript
// 라우트에서 미들웨어 적용
router.get("/api/users",     isLoggedIn,   listUsers);     // 로그인 필수
router.post("/api/schools",  isAdmin,      createSchool);  // admin만 가능
router.put("/api/seasons",   isAdManager,  updateSeason);  // admin 또는 manager
router.post("/api/academies", isOwner,     createAcademy); // owner만 가능
```

### 미들웨어 동작 흐름

```
HTTP 요청 수신
      │
      ▼
  isLoggedIn?  ──(No)──► 403 Forbidden
      │
     (Yes)
      │
      ▼
  역할 검사     ──(불일치)──► 403 Forbidden
  (isAdmin 등)
      │
     (일치)
      │
      ▼
  컨트롤러 실행
```

---

## 프론트엔드 인증

### AuthContext

`frontend/src/contexts/authContext.tsx`에서 전역 인증 상태를 관리합니다.

```typescript
// AuthContext가 제공하는 값
export function useAuth(): {
  loading: boolean;                          // 인증 상태 로딩 중
  setLoading: React.Dispatch<...>;
  currentUser: TCurrentUser;                 // 현재 로그인 사용자
  setCurrentUser: React.Dispatch<...>;
  currentSchool: TSchool;                    // 현재 선택된 학교
  changeSchool: (to: string) => Promise<void>;  // 학교 변경
  currentRegistration: TCurrentRegistration; // 현재 학기 등록 정보
  changeRegistration: (rid: string) => void; // 등록 변경
  reloadRegistration: () => void;            // 등록 정보 갱신
  currentSeason: TCurrentSeason;             // 현재 학기 정보
};
```

### RequireAuth 래퍼 컴포넌트

라우트 수준에서 역할 기반 접근 제어를 수행합니다.

```tsx
// frontend/src/routes/RouterPage.tsx
const RequireAuth = ({ children, auth }: { children: JSX.Element; auth: string[] }) => {
  // auth 배열에 포함된 역할만 접근 가능
  // 미인증 시 로그인 페이지로 리디렉트
};

// 사용 예시
<Route path="" element={
  <RequireAuth auth={["owner"]}>
    <Owner />
  </RequireAuth>
} />

<Route path="admin/*" element={
  <RequireAuth auth={["admin"]}>
    <Admin />
  </RequireAuth>
} />
```

### 인증 상태 관리 흐름

```
앱 초기화
    │
    ▼
AuthProvider 마운트
    │
    ▼
서버에 현재 사용자 조회 (GET /api/users/current)
    │
    ├── 세션 유효 → currentUser 설정 → 학교/학기 정보 로드
    │
    └── 세션 만료 → 로그인 페이지로 리디렉트
```

---

## 보안 고려사항

| 항목 | 구현 방식 |
|------|-----------|
| 비밀번호 저장 | bcrypt 해시 (salt round 포함) |
| 세션 쿠키 | `httpOnly: true`로 JavaScript 접근 차단 |
| 비밀번호 필드 | `select: false`로 기본 조회 시 제외 |
| CORS | 지정된 origin만 허용 (`credentials: true`) |
| 인증 실패 | 403 Forbidden 반환, 구체적 오류 메시지 최소화 |
| 아카데미 비활성화 | `isActivated: false`인 아카데미 로그인 차단 |

---

## 다음 단계

- [실시간 통신](realtime.md) - 인증된 사용자의 실시간 소켓 연결
- [데이터베이스 설계](database.md) - 사용자 및 세션 데이터 저장 구조
