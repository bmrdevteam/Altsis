# 보드 예약 기능 상세 설계

## 1. 개요

보드의 게시글에 예약 기능을 추가하여, 게시글 작성자가 예약 가능한 자원(장소, 상품 등)과 일정을 등록하면 참여자가 신청하고 관리자가 승인하는 시스템.

### 핵심 요구사항
1. **예약 게시글**: 게시글에 예약 가능 자원 + 일시 등록
2. **일괄 일정 생성**: 기간/요일/시간 기준으로 슬롯 일괄 생성
3. **개별/일괄 신청**: 요일·시간 기준으로 개별 또는 일괄 신청
4. **중복 방지**: 동일 슬롯 중복 신청 불가 + 정원 초과 방지
5. **승인 워크플로우**: 관리자가 신청을 승인/거절

---

## 2. 데이터 모델

### 2.1 Post 모델 확장 (기존 수정)

Post 스키마에 `postType` 필드 추가. 기존 게시글은 `"general"`, 예약 게시글은 `"reservation"`.

```javascript
// Post 스키마에 추가할 필드
{
  postType: {
    type: String,
    enum: ["general", "reservation"],
    default: "general",
  },

  // 예약 게시글 설정 (postType === "reservation"일 때만 사용)
  reservationConfig: {
    type: reservationConfigSchema,
    default: null,
  },
}
```

#### reservationConfigSchema (Post 내장)

```javascript
const reservationConfigSchema = mongoose.Schema(
  {
    // 자원 정보
    resource: {
      type: String,        // 예: "3층 회의실", "체육관", "상담실 A"
      required: true,
    },
    resourceDescription: {
      type: String,        // 자원 상세 설명
      default: "",
    },

    // 슬롯 모드: "time" = 시간 기반, "label" = 임의 텍스트 기반 (1교시, 2교시 등)
    slotMode: {
      type: String,
      enum: ["time", "label"],
      default: "time",
    },

    // 슬롯별 기본 정원 (개별 슬롯에서 override 가능)
    defaultCapacity: {
      type: Number,
      default: 1,          // 기본 1명 (1:1 예약)
    },

    // 승인 필요 여부
    requireApproval: {
      type: Boolean,
      default: true,       // true: 승인 필요, false: 자동 확정
    },

    // 1인당 최대 예약 수 (0 = 무제한)
    maxReservationsPerUser: {
      type: Number,
      default: 0,
    },

    // 예약 허용 기간 (이 기간 내에만 신청 가능)
    reservationOpenAt: Date,   // 예약 오픈 시각 (null이면 즉시)
    reservationCloseAt: Date,  // 예약 마감 시각 (null이면 제한 없음)

    // 슬롯 통계 (캐시)
    totalSlots: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);
```

### 2.2 ReservationSlot 모델 (신규)

예약 가능한 개별 시간 슬롯. 게시글 하나에 여러 슬롯이 연결됨.

```javascript
// backend/src/models/ReservationSlot.js

const reservationSlotSchema = mongoose.Schema(
  {
    // 참조
    post: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    board: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
    },

    // 일정 정보
    date: {
      type: String,          // "2026-03-15" (YYYY-MM-DD)
      required: true,
    },

    // 시간 모드 (slotMode === "time")
    startTime: String,       // "09:00" (HH:mm)
    endTime: String,         // "10:00" (HH:mm)

    // 라벨 모드 (slotMode === "label") - 임의 텍스트 (예: "1교시", "오전 A")
    label: String,

    // 요일 (일괄 조회/필터용, date에서 파생)
    dayOfWeek: {
      type: Number,          // 0(일) ~ 6(토)
      required: true,
    },

    // 정원 관리
    capacity: {
      type: Number,
      default: 1,
    },
    currentCount: {
      type: Number,
      default: 0,
    },

    // 상태
    status: {
      type: String,
      enum: ["open", "closed", "full"],
      default: "open",
    },

    // 슬롯별 메모 (선택)
    memo: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 인덱스
reservationSlotSchema.index({ post: 1, date: 1, startTime: 1 });
reservationSlotSchema.index({ post: 1, date: 1, label: 1 });
reservationSlotSchema.index({ post: 1, status: 1 });
reservationSlotSchema.index({ post: 1, dayOfWeek: 1 });
```

### 2.3 Reservation 모델 (신규)

사용자의 예약 신청 기록.

```javascript
// backend/src/models/Reservation.js

const reservationSchema = mongoose.Schema(
  {
    // 참조
    slot: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    post: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    board: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
    },

    // 신청자 정보 (비정규화)
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },

    // 슬롯 정보 스냅샷 (비정규화 - 조회 편의)
    date: String,
    startTime: String,     // 시간 모드
    endTime: String,       // 시간 모드
    label: String,         // 라벨 모드

    // 상태
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    // 승인/거절 정보
    processedBy: mongoose.Types.ObjectId,     // 처리자
    processedByName: String,
    processedAt: Date,
    rejectReason: String,                     // 거절 사유

    // 신청 메모
    memo: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 인덱스
reservationSchema.index({ slot: 1, user: 1 }, { unique: true });   // 중복 신청 방지
reservationSchema.index({ post: 1, user: 1 });                     // 사용자별 예약 조회
reservationSchema.index({ post: 1, status: 1 });                   // 상태별 조회
reservationSchema.index({ user: 1, school: 1, status: 1 });        // 내 예약 목록
```

---

## 3. API 엔드포인트

### 3.1 ReservationSlot API

| Method | Route | 설명 | 권한 |
|--------|-------|------|------|
| POST | `/reservation-slots` | 슬롯 개별 생성 | 게시글 작성자/관리자 |
| POST | `/reservation-slots/bulk` | 슬롯 일괄 생성 | 게시글 작성자/관리자 |
| GET | `/reservation-slots?post=:postId` | 게시글의 슬롯 목록 | 보드 멤버 |
| PUT | `/reservation-slots/:_id` | 슬롯 수정 | 게시글 작성자/관리자 |
| DELETE | `/reservation-slots/:_id` | 슬롯 삭제 | 게시글 작성자/관리자 |
| DELETE | `/reservation-slots/bulk` | 슬롯 일괄 삭제 | 게시글 작성자/관리자 |

#### 일괄 생성 요청 형식

시간 모드 (slotMode === "time"):
```json
POST /reservation-slots/bulk
{
  "post": "게시글_id",
  "rule": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "days": [1, 3, 5],
    "timeSlots": [
      { "startTime": "09:00", "endTime": "10:00" },
      { "startTime": "10:00", "endTime": "11:00" },
      { "startTime": "14:00", "endTime": "15:00" }
    ],
    "capacity": 2,
    "excludeDates": ["2026-03-01"]
  }
}
```

라벨 모드 (slotMode === "label"):
```json
POST /reservation-slots/bulk
{
  "post": "게시글_id",
  "rule": {
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "days": [1, 3, 5],
    "labels": ["1교시", "2교시", "3교시", "점심", "4교시"],
    "capacity": 2,
    "excludeDates": ["2026-03-01"]
  }
}
```

**일괄 생성 로직:**
1. `startDate` ~ `endDate` 범위에서 `days`에 해당하는 날짜 추출
2. `excludeDates` 제외
3. 각 날짜 x `timeSlots` 조합으로 슬롯 생성
4. 기존 슬롯과 겹치는 것은 skip
5. `post.reservationConfig.totalSlots` 업데이트

### 3.2 Reservation API

| Method | Route | 설명 | 권한 |
|--------|-------|------|------|
| POST | `/reservations` | 개별 예약 신청 | 보드 멤버 |
| POST | `/reservations/bulk` | 일괄 예약 신청 | 보드 멤버 |
| GET | `/reservations?post=:postId` | 게시글 예약 목록 | 작성자/관리자: 전체, 일반: 본인만 |
| GET | `/reservations/my?school=:schoolId` | 내 예약 목록 | 본인 |
| PUT | `/reservations/:_id/approve` | 승인 | 게시글 작성자/관리자 |
| PUT | `/reservations/:_id/reject` | 거절 | 게시글 작성자/관리자 |
| PUT | `/reservations/bulk-approve` | 일괄 승인 | 게시글 작성자/관리자 |
| PUT | `/reservations/bulk-reject` | 일괄 거절 | 게시글 작성자/관리자 |
| DELETE | `/reservations/:_id` | 예약 취소 | 본인 (pending 상태만) |

#### 일괄 예약 신청

```json
POST /reservations/bulk
{
  "slots": ["슬롯_id1", "슬롯_id2", "슬롯_id3"],
  "memo": "매주 월수금 오전 신청합니다"
}
```

---

## 4. 비즈니스 로직

### 4.1 예약 신청 플로우

```
신청자가 슬롯 선택 -> 유효성 검증 -> Reservation 생성
                                    |
                     requireApproval === true?
                     +- YES -> status: "pending" (승인 대기)
                     +- NO  -> status: "approved" + slot.currentCount++
```

#### 유효성 검증 항목

1. **슬롯 상태**: `status === "open"` (closed/full이면 거부)
2. **정원 확인**: `slot.currentCount < slot.capacity`
3. **중복 확인**: 유니크 인덱스 `{ slot: 1, user: 1 }` (MongoDB 레벨)
4. **1인당 최대 예약 수**: `maxReservationsPerUser > 0`이면 검증
5. **예약 기간 확인**: `reservationOpenAt` ~ `reservationCloseAt` 범위 내
6. **보드 멤버 여부**: `isBoardMember(board, user, role)`

### 4.2 승인 플로우

```
관리자가 승인 -> reservation.status = "approved"
             -> slot.currentCount++
             -> currentCount >= capacity이면 slot.status = "full"
             -> 신청자에게 알림 발송

관리자가 거절 -> reservation.status = "rejected"
             -> reservation.rejectReason 기록
             -> 신청자에게 알림 발송
```

### 4.3 취소 플로우

```
신청자가 취소 (pending 상태)  -> reservation.status = "cancelled"
                               (currentCount 변동 없음)

신청자가 취소 (approved 상태) -> reservation.status = "cancelled"
                               -> slot.currentCount--
                               -> slot.status === "full"이면 "open"으로 복원
```

### 4.4 동시성 제어

수강신청(Enrollment)과 동일한 PQueue 패턴 사용:

```javascript
const reservationQueue = new PQueue({ concurrency: 1 });

async function queueReservation(req) {
  return reservationQueue.add(() => execReservation(req));
}
```

### 4.5 슬롯 삭제 시 처리

- `approved` 상태 예약이 있으면 삭제 차단 (관리자 확인 필요)
- `pending` 상태 예약만 있으면 자동 취소 후 삭제

---

## 5. 프론트엔드 설계

### 5.1 타입 정의

```typescript
// frontend/src/types/reservation.ts

export type TSlotMode = "time" | "label";

export type TReservationConfig = {
  resource: string;
  resourceDescription: string;
  slotMode: TSlotMode;
  defaultCapacity: number;
  requireApproval: boolean;
  maxReservationsPerUser: number;
  reservationOpenAt: string | null;
  reservationCloseAt: string | null;
  totalSlots: number;
};

export type TPostType = "general" | "reservation";

export type TReservationSlotStatus = "open" | "closed" | "full";

export type TReservationSlot = {
  _id: string;
  post: string;
  board: string;
  school: string;
  date: string;
  startTime?: string;    // 시간 모드
  endTime?: string;      // 시간 모드
  label?: string;        // 라벨 모드
  dayOfWeek: number;
  capacity: number;
  currentCount: number;
  status: TReservationSlotStatus;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TReservationStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TReservation = {
  _id: string;
  slot: string;
  post: string;
  board: string;
  school: string;
  user: string;
  userId: string;
  userName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  label?: string;
  status: TReservationStatus;
  processedBy?: string;
  processedByName?: string;
  processedAt?: string;
  rejectReason?: string;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TSlotBulkRule = {
  startDate: string;
  endDate: string;
  days: number[];
  timeSlots?: { startTime: string; endTime: string }[];  // 시간 모드
  labels?: string[];                                      // 라벨 모드
  capacity: number;
  excludeDates?: string[];
};
```

### 5.2 API 훅 (useAPIv2 추가)

```typescript
// ReservationSlotAPI
CReservationSlot: (data) => POST /reservation-slots
CReservationSlotsBulk: (data: { post, rule }) => POST /reservation-slots/bulk
RReservationSlots: (query: { post }) => GET /reservation-slots
UReservationSlot: (params: { _id }, data) => PUT /reservation-slots/:_id
DReservationSlot: (params: { _id }) => DELETE /reservation-slots/:_id
DReservationSlotsBulk: (data: { ids }) => DELETE /reservation-slots/bulk

// ReservationAPI
CReservation: (data: { slot, memo? }) => POST /reservations
CReservationsBulk: (data: { slots, memo? }) => POST /reservations/bulk
RReservations: (query: { post, status? }) => GET /reservations
RMyReservations: (query: { school, status? }) => GET /reservations/my
UReservationApprove: (params: { _id }) => PUT /reservations/:_id/approve
UReservationReject: (params: { _id }, data: { reason? }) => PUT /reservations/:_id/reject
UReservationsBulkApprove: (data: { ids }) => PUT /reservations/bulk-approve
UReservationsBulkReject: (data: { ids, reason? }) => PUT /reservations/bulk-reject
DReservation: (params: { _id }) => DELETE /reservations/:_id
```

### 5.3 컴포넌트 구조

```
frontend/src/pages/boards/
+-- BoardPid.tsx                    (기존)
+-- PostCreate.tsx                  (기존 수정 - postType 선택 추가)
+-- PostPid.tsx                     (기존 수정 - 예약 게시글이면 예약 UI 표시)
|
+-- reservation/                    (신규 디렉토리)
    +-- ReservationPostForm.tsx     * 예약 게시글 작성/수정 폼
    +-- SlotBulkCreateForm.tsx      * 일괄 슬롯 생성 폼
    +-- SlotCalendarView.tsx        * 슬롯 캘린더 뷰 (월간)
    +-- SlotListView.tsx              슬롯 목록 뷰 (표)
    +-- SlotTimeGrid.tsx            * 주간/일간 시간 그리드 뷰
    +-- ReservationApplyPanel.tsx   * 신청 패널 (개별/일괄)
    +-- ReservationManagePanel.tsx  * 관리 패널 (승인/거절)
    +-- ReservationStatusBadge.tsx    상태 뱃지 컴포넌트
    +-- MyReservations.tsx            내 예약 목록 페이지
    +-- reservation.module.scss
```

### 5.4 주요 화면 설계

#### 화면 1: 예약 게시글 작성 (ReservationPostForm)

```
+--------------------------------------------------+
| 예약 게시글 작성                                    |
+--------------------------------------------------+
| 제목: [________________________]                   |
| 내용: [WYSIWYG 에디터]                             |
|                                                    |
| -- 예약 설정 --                                     |
| 자원명:    [________] (예: 3층 회의실)               |
| 설명:     [________________________]                |
| 기본 정원: [2]명                                    |
| 승인 필요: [v]                                     |
| 1인당 최대: [0] (0=무제한)                          |
| 예약 오픈:  [____-__-__ __:__]                     |
| 예약 마감:  [____-__-__ __:__]                     |
|                                                    |
| -- 일정 슬롯 등록 --                                |
| [일괄 등록] [개별 추가]                             |
|                                                    |
| (일괄 등록 폼)                                     |
| 기간: [2026-03-01] ~ [2026-03-31]                  |
| 요일: [v월] [ 화] [v수] [ 목] [v금] [ 토]          |
| 시간:                                              |
|   09:00 ~ 10:00  [x삭제]                           |
|   10:00 ~ 11:00  [x삭제]                           |
|   [+ 시간 추가]                                    |
| 제외일: [2026-03-01] [+ 추가]                      |
|                                                    |
| -> 생성될 슬롯: 36개 (12일 x 3시간)                |
|                                                    |
| [미리보기]  [등록]                                  |
+--------------------------------------------------+
```

#### 화면 2: 예약 신청 화면 (SlotCalendarView + ReservationApplyPanel)

게시글 상세 페이지에서 예약 게시글일 때 표시됨.

```
+-------------------------------------------------------+
| [게시글 제목] - 3층 회의실 예약                          |
| (게시글 본문...)                                        |
+-------------------------------------------------------+
|                                                        |
| < 2026년 3월 >               [월간] [주간] [목록]       |
| +---+---+---+---+---+---+---+                          |
| | 일| 월| 화| 수| 목| 금| 토|                          |
| +---+---+---+---+---+---+---+                          |
| |   | 1 | 2 | 3 | 4 | 5 | 6 |                         |
| |   |3/3|   |2/3|   |1/3|   |  <- 슬롯 현황            |
| +---+---+---+---+---+---+---+                          |
|                                                        |
| 3월 15일 (월) 슬롯:                                    |
| +--------------------------------------------+         |
| | 09:00~10:00  정원 2/2  [마감]               |         |
| | 10:00~11:00  정원 1/2  [신청]               |         |
| | 14:00~15:00  정원 0/2  [신청]               |         |
| +--------------------------------------------+         |
|                                                        |
| -- 일괄 신청 --                                        |
| [v] 매주 월요일 10:00~11:00 (4회)                      |
| [v] 매주 월요일 14:00~15:00 (4회)                      |
| [일괄 신청하기]                                        |
+-------------------------------------------------------+
```

#### 화면 3: 예약 관리 화면 (ReservationManagePanel)

```
+-------------------------------------------------------+
| 예약 관리 - 3층 회의실                                  |
+-------------------------------------------------------+
| [전체] [대기중 (12)] [승인됨 (8)] [거절됨 (2)]          |
|                                                        |
| 필터: 날짜 [____~____]  시간 [__:__]                   |
|                                                        |
| +--+---------+-----------+-------+------+------+       |
| |  | 신청자  | 일시       | 시간  | 상태 | 처리 |       |
| +--+---------+-----------+-------+------+------+       |
| |  | 김학생  | 3/15(월)  | 09-10 | 대기 |[v][x]|       |
| |  | 이학생  | 3/15(월)  | 09-10 | 대기 |[v][x]|       |
| |  | 박학생  | 3/15(월)  | 10-11 | 승인 |      |       |
| |  | 최학생  | 3/17(수)  | 09-10 | 거절 |      |       |
| +--+---------+-----------+-------+------+------+       |
|                                                        |
| 선택된 항목: [일괄 승인] [일괄 거절]                     |
+-------------------------------------------------------+
```

---

## 6. 라우트 구조

### 6.1 백엔드 라우트

```javascript
// backend/src/routes/reservationSlots.js
router.post("/", isLoggedIn, reservationSlots.create);
router.post("/bulk", isLoggedIn, reservationSlots.createBulk);
router.get("/:_id?", isLoggedIn, reservationSlots.find);
router.put("/:_id", isLoggedIn, reservationSlots.update);
router.delete("/:_id", isLoggedIn, reservationSlots.remove);
router.delete("/bulk", isLoggedIn, reservationSlots.removeBulk);

// backend/src/routes/reservations.js
router.post("/", isLoggedIn, reservations.create);
router.post("/bulk", isLoggedIn, reservations.createBulk);
router.get("/:_id?", isLoggedIn, reservations.find);
router.get("/my", isLoggedIn, reservations.findMy);
router.put("/:_id/approve", isLoggedIn, reservations.approve);
router.put("/:_id/reject", isLoggedIn, reservations.reject);
router.put("/bulk-approve", isLoggedIn, reservations.bulkApprove);
router.put("/bulk-reject", isLoggedIn, reservations.bulkReject);
router.delete("/:_id", isLoggedIn, reservations.cancel);

// backend/src/routes/index.js 에 등록
app.use("/api/reservation-slots", reservationSlotRouter);
app.use("/api/reservations", reservationRouter);
```

### 6.2 프론트엔드 라우트

```
기존 라우트 내에서 처리 (별도 라우트 불필요)
- /boards/:boardId/create       -> PostCreate에서 postType 선택
- /boards/:boardId/post/:postId -> PostPid에서 예약 UI 렌더링
- /boards/my-reservations       -> (선택) 내 예약 목록 페이지
```

---

## 7. 구현 단계

### Phase 1: 기반 (백엔드 모델 + API)
1. `ReservationSlot` 모델 생성
2. `Reservation` 모델 생성
3. `Post` 모델에 `postType`, `reservationConfig` 필드 추가
4. `reservationSlots` 컨트롤러 + 라우트
5. `reservations` 컨트롤러 + 라우트
6. `models/index.js`에 모델 등록
7. `routes/index.js`에 라우트 등록

### Phase 2: 슬롯 관리 (프론트엔드)
8. 타입 정의 (`types/reservation.ts`)
9. API 훅 등록 (`useAPIv2.ts`)
10. `PostCreate` 수정 - `postType` 선택 UI
11. `ReservationPostForm` - 예약 설정 폼
12. `SlotBulkCreateForm` - 일괄 슬롯 생성 폼

### Phase 3: 신청 UI (프론트엔드)
13. `PostPid` 수정 - 예약 게시글 감지 + 예약 UI 렌더링
14. `SlotCalendarView` - 캘린더 뷰
15. `SlotListView` - 목록 뷰
16. `ReservationApplyPanel` - 개별/일괄 신청 패널

### Phase 4: 관리 UI (프론트엔드)
17. `ReservationManagePanel` - 승인/거절 관리
18. `ReservationStatusBadge` - 상태 뱃지
19. 알림 연동 (기존 `sendAutoNotification` 활용)

### Phase 5: 마무리
20. `MyReservations` - 내 예약 목록
21. 보드 목록에서 예약 게시글 표시 구분
22. 에지 케이스 처리 + 테스트

---

## 8. 에지 케이스 및 고려사항

| 케이스 | 처리 방안 |
|--------|-----------|
| 동시 신청 (정원 1자리) | PQueue 패턴으로 직렬 처리 |
| 승인 후 취소 -> 정원 복원 | `currentCount--` + `status: "full"->"open"` |
| 슬롯 삭제 시 기존 예약 | approved 예약 있으면 삭제 차단, pending만 있으면 자동 취소 |
| 게시글 삭제 | `isActive: false` -> 예약도 비활성화 (soft delete) |
| 1인당 최대 예약 수 초과 | 신청 시 해당 post의 active 예약 수 카운트 |
| 예약 기간 밖 신청 | `reservationOpenAt`/`reservationCloseAt` 서버 검증 |
| 보드 멤버 변경 후 예약 | 기존 예약은 유지, 새 신청만 제한 |
