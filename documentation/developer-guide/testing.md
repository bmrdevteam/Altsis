# 테스트

이 문서에서는 Altsis 프로젝트의 테스트 실행 방법, 작성 가이드, 디버깅 방법을 설명합니다.

---

## 목차

1. [테스트 프레임워크](#1-테스트-프레임워크)
2. [테스트 실행](#2-테스트-실행)
3. [백엔드 테스트 작성](#3-백엔드-테스트-작성)
4. [프론트엔드 테스트 작성](#4-프론트엔드-테스트-작성)
5. [테스트 디버깅](#5-테스트-디버깅)
6. [테스트 모범 사례](#6-테스트-모범-사례)

---

## 1. 테스트 프레임워크

| 영역 | 프레임워크 | 추가 도구 |
| --- | --- | --- |
| 백엔드 | Jest 29.x | `node-mocks-http` (Express req/res 모킹), `babel-jest` |
| 프론트엔드 | Jest (react-scripts) | `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |

### 백엔드 테스트 환경

백엔드 테스트는 Babel을 통해 ES Module을 CommonJS로 변환하여 실행됩니다:

- `jest.config.json` - Jest 설정
- `@babel/preset-env` + `@babel/plugin-transform-modules-commonjs` - ES Module 변환
- `NODE_ENV=test` 시 `.env.test` 환경 변수 사용

### 프론트엔드 테스트 환경

프론트엔드 테스트는 `react-scripts test`를 통해 실행됩니다:

- Create React App 내장 Jest 설정 사용
- `@testing-library/react` - React 컴포넌트 테스트 유틸리티
- `@testing-library/jest-dom` - DOM 매처 확장

---

## 2. 테스트 실행

### 백엔드 테스트

```bash
cd backend

# 전체 테스트 실행
yarn test

# 특정 테스트 파일만 실행
yarn test -- --testPathPattern="seasons"

# 프로덕션 환경 테스트
yarn test --prod
```

백엔드 `yarn test` 명령은 다음과 같이 실행됩니다:

```
jest -c ./jest.config.json --detectOpenHandles --forceExit
```

- `--detectOpenHandles`: 열려 있는 핸들(DB 연결 등) 감지
- `--forceExit`: 테스트 완료 후 강제 종료 (비동기 핸들 정리)

### 프론트엔드 테스트

```bash
cd frontend

# 전체 테스트 실행
yarn test

# 특정 테스트만 감시 모드로 실행
yarn test --watch TestName

# 커버리지 포함 실행
yarn test -- --coverage
```

### 테스트 명령어 요약

| 위치 | 명령어 | 설명 |
| --- | --- | --- |
| `backend/` | `yarn test` | 전체 백엔드 테스트 (Jest) |
| `backend/` | `yarn test --prod` | 프로덕션 환경 테스트 |
| `frontend/` | `yarn test` | 전체 프론트엔드 테스트 |
| `frontend/` | `yarn test --watch TestName` | 특정 테스트 감시 모드 |

---

## 3. 백엔드 테스트 작성

### 컨트롤러 단위 테스트

`node-mocks-http`를 사용하여 Express의 `req`/`res` 객체를 모킹합니다:

```javascript
import httpMocks from "node-mocks-http";
import { create } from "../controllers/seasons.js";

describe("SeasonController", () => {
  describe("create (CSeason)", () => {
    it("필수 필드가 없으면 400을 반환해야 한다", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/seasons",
        body: {
          // school 필드 누락
          year: "2024",
          term: "1학기",
        },
        user: {
          academyId: "testAcademy",
          auth: "admin",
        },
      });
      const res = httpMocks.createResponse();

      await create(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toBe("SCHOOL_REQUIRED");
    });

    it("유효한 요청이면 200과 season 객체를 반환해야 한다", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/seasons",
        body: {
          school: "64a1b2c3d4e5f6g7h8i9j0k1",
          year: "2024",
          term: "1학기",
          period: { start: "2024-03-01", end: "2024-07-31" },
        },
        user: {
          academyId: "testAcademy",
          auth: "admin",
        },
      });
      const res = httpMocks.createResponse();

      await create(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.season).toBeDefined();
      expect(data.season.year).toBe("2024");
    });
  });
});
```

### 모델 테스트

```javascript
import mongoose from "mongoose";
import { Season } from "../models/Season.js";

describe("Season Model", () => {
  let connection;

  beforeAll(async () => {
    // 테스트용 DB 연결
    connection = await mongoose.createConnection(process.env.TEST_DB_URL);
  });

  afterAll(async () => {
    await connection.close();
  });

  it("필수 필드가 있으면 Season을 생성할 수 있어야 한다", async () => {
    const seasonData = {
      school: new mongoose.Types.ObjectId(),
      schoolId: "testSchool",
      schoolName: "테스트 학교",
      year: "2024",
      term: "1학기",
    };

    const SeasonModel = connection.model("Season", Season.schema);
    const season = new SeasonModel(seasonData);
    const savedSeason = await season.save();

    expect(savedSeason._id).toBeDefined();
    expect(savedSeason.year).toBe("2024");
    expect(savedSeason.isActivated).toBe(false); // 기본값
  });
});
```

### 서비스 테스트

```javascript
import { SeasonService } from "../services/seasons.js";

describe("SeasonService", () => {
  it("학기 활성화 시 올바르게 처리되어야 한다", async () => {
    // Given
    const dbName = "testAcademy";
    const seasonId = "64a1b2c3d4e5f6g7h8i9j0k1";

    // When
    const result = await SeasonService.onActivate(dbName, seasonId);

    // Then
    expect(result.isActivated).toBe(true);
  });
});
```

---

## 4. 프론트엔드 테스트 작성

### 컴포넌트 렌더링 테스트

```typescript
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("제목이 올바르게 렌더링되어야 한다", () => {
    render(<MyComponent title="테스트 제목" />);

    expect(screen.getByText("테스트 제목")).toBeInTheDocument();
  });

  it("데이터가 없을 때 빈 상태 메시지를 표시해야 한다", () => {
    render(<MyComponent title="테스트" data={[]} />);

    expect(screen.getByText("데이터가 없습니다.")).toBeInTheDocument();
  });
});
```

### 사용자 상호작용 테스트

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyComponent from "./MyComponent";

describe("MyComponent 상호작용", () => {
  it("버튼 클릭 시 핸들러가 호출되어야 한다", async () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    await userEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("입력값 변경 시 상태가 업데이트되어야 한다", async () => {
    render(<MyComponent />);

    const input = screen.getByPlaceholderText("이름을 입력하세요");
    await userEvent.type(input, "홍길동");

    expect(input).toHaveValue("홍길동");
  });
});
```

### 비동기 테스트

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import MyComponent from "./MyComponent";

describe("MyComponent 비동기", () => {
  it("데이터 로딩 후 목록이 표시되어야 한다", async () => {
    render(<MyComponent />);

    // 로딩 상태 확인
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();

    // 데이터 로딩 완료 대기
    await waitFor(() => {
      expect(screen.getByText("항목 1")).toBeInTheDocument();
    });

    expect(screen.queryByText("로딩 중...")).not.toBeInTheDocument();
  });
});
```

---

## 5. 테스트 디버깅

### Chrome Inspector를 이용한 디버깅

Node.js의 `--inspect` 플래그를 사용하여 Chrome DevTools에서 테스트를 디버깅할 수 있습니다.

#### 실행 방법

```bash
cd frontend

# 디버거 연동 테스트 (감시 모드)
yarn debug-test --watch TestName
```

#### Chrome DevTools 연결

1. 위 명령어를 실행합니다.
2. Chrome 브라우저에서 `chrome://inspect`를 엽니다.
3. "Remote Target" 섹션에서 Node.js 프로세스를 찾아 "inspect"를 클릭합니다.
4. DevTools가 열리면 Sources 탭에서 브레이크포인트를 설정할 수 있습니다.

#### 코드 내 브레이크포인트

테스트 코드에 `debugger` 문을 추가하면 해당 지점에서 실행이 멈춥니다:

```typescript
it("디버깅이 필요한 테스트", async () => {
  const result = await someFunction();
  debugger; // 여기서 실행이 멈춤
  expect(result).toBe(expected);
});
```

### VS Code 디버거

VS Code에서 직접 테스트를 디버깅할 수도 있습니다. `.vscode/launch.json`에 다음 설정을 추가합니다:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests (Backend)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "yarn",
      "runtimeArgs": ["test", "--runInBand"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Jest Tests (Frontend)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "yarn",
      "runtimeArgs": [
        "test",
        "--runInBand",
        "--no-cache",
        "--watchAll=false"
      ],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## 6. 테스트 모범 사례

### 테스트 구조 (AAA 패턴)

```typescript
it("설명적인 테스트 이름", async () => {
  // Arrange (준비)
  const input = { year: "2024", term: "1학기" };

  // Act (실행)
  const result = await createSeason(input);

  // Assert (검증)
  expect(result.year).toBe("2024");
  expect(result.isActivated).toBe(false);
});
```

### describe 블록으로 그룹화

```typescript
describe("SeasonController", () => {
  describe("create", () => {
    it("유효한 데이터로 학기를 생성할 수 있어야 한다", () => { ... });
    it("필수 필드가 없으면 400을 반환해야 한다", () => { ... });
    it("중복 학기 생성 시 409를 반환해야 한다", () => { ... });
  });

  describe("find", () => {
    it("학기 목록을 조회할 수 있어야 한다", () => { ... });
    it("특정 학기를 ID로 조회할 수 있어야 한다", () => { ... });
  });

  describe("remove", () => {
    it("학기를 삭제할 수 있어야 한다", () => { ... });
    it("존재하지 않는 학기 삭제 시 404를 반환해야 한다", () => { ... });
  });
});
```

### 테스트 격리

각 테스트는 독립적이어야 합니다. 테스트 간 상태 공유를 피하십시오:

```typescript
describe("UserService", () => {
  // 각 테스트 전에 데이터 초기화
  beforeEach(async () => {
    await clearTestData();
  });

  // 모든 테스트 후 연결 정리
  afterAll(async () => {
    await closeConnections();
  });

  it("테스트 1", () => { ... });
  it("테스트 2", () => { ... }); // 테스트 1의 영향을 받지 않음
});
```

### 의미 있는 테스트 이름

테스트 이름은 한국어로 작성하며, **무엇을 테스트하는지** 명확하게 표현합니다:

```typescript
// 올바른 예시 - 구체적이고 명확한 이름
it("관리자가 학기를 생성하면 비활성화 상태로 저장되어야 한다", () => { ... });
it("필수 필드(school)가 누락되면 SCHOOL_REQUIRED 에러를 반환해야 한다", () => { ... });
it("이미 존재하는 년도/학기 조합으로 생성 시 409를 반환해야 한다", () => { ... });

// 잘못된 예시 - 모호한 이름
it("테스트 1", () => { ... });
it("정상 동작", () => { ... });
it("에러 처리", () => { ... });
```

### 테스트 커버리지 확인

```bash
# 프론트엔드 커버리지 리포트
cd frontend
yarn test -- --coverage --watchAll=false

# 백엔드 커버리지 리포트
cd backend
yarn test -- --coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다. `coverage/lcov-report/index.html`을 브라우저에서 열어 시각적으로 확인할 수 있습니다.

---

[목차로 돌아가기](./README.md)
