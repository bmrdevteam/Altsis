# 코딩 스타일 가이드

이 문서에서는 Altsis 프로젝트에서 따르는 코딩 스타일과 규칙을 정의합니다. 일관된 코드 스타일은 가독성을 높이고 협업을 원활하게 합니다.

---

## 목차

1. [일반 규칙](#1-일반-규칙)
2. [명명 규칙](#2-명명-규칙)
3. [TypeScript 규칙](#3-typescript-규칙)
4. [React 컴포넌트 규칙](#4-react-컴포넌트-규칙)
5. [SCSS 규칙](#5-scss-규칙)
6. [백엔드 JavaScript 규칙](#6-백엔드-javascript-규칙)
7. [Prettier 설정](#7-prettier-설정)
8. [Linter 설정](#8-linter-설정)
9. [참고 자료](#9-참고-자료)

---

## 1. 일반 규칙

### 파일 확장자

| 파일 유형 | 확장자 | 사용 시점 |
| --- | --- | --- |
| React 컴포넌트 | `.tsx` | JSX를 포함하는 파일 |
| TypeScript 모듈 | `.ts` | JSX 없는 유틸/타입/훅 |
| 스타일 | `.module.scss` | 컴포넌트 스코프 스타일 |
| 전역 스타일 | `.scss` | 전역 스타일 (variables, global 등) |
| 백엔드 | `.js` | ES Module 문법 사용 |

### ES6+ 문법 사용

```javascript
// 화살표 함수 사용 (컴포넌트, HTML 반환 함수)
const MyComponent = () => {
  return <div>내용</div>;
};

// 비구조화 할당
const { currentUser, currentSchool } = useAuth();

// 템플릿 리터럴
const message = `${user.name}님, 환영합니다.`;

// Optional Chaining
const schoolName = currentUser?.schools?.[0]?.schoolName;

// Nullish Coalescing
const name = user.name ?? "이름 없음";
```

### import 순서

```typescript
// 1. 외부 라이브러리
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import _ from "lodash";

// 2. 내부 컴포넌트/모듈
import Table from "components/tableV2/Table";
import Loading from "components/loading/Loading";

// 3. Context / Hooks
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";

// 4. 타입
import { TSeason } from "types/seasons";

// 5. 스타일
import style from "./myComponent.module.scss";
```

---

## 2. 명명 규칙

### 변수/함수

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 변수 | camelCase | `currentUser`, `seasonList`, `isLoading` |
| 함수 | camelCase | `loadData`, `handleSubmit`, `formatDate` |
| 상수 | SCREAMING_SNAKE_CASE | `PERMISSION_DENIED`, `MAX_FILE_SIZE` |
| 불리언 변수 | `is`/`has`/`can` 접두사 | `isActive`, `hasPermission`, `canEdit` |

### 컴포넌트

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| React 컴포넌트 | PascalCase | `MyComponent`, `CourseList`, `EventPopup` |
| 페이지 컴포넌트 | PascalCase | `Index`, `Pid`, `Design` |
| 컴포넌트 파일명 | PascalCase | `MyComponent.tsx`, `EventPopup.tsx` |
| 스타일 파일명 | camelCase | `myComponent.module.scss` |

### 이벤트 핸들러

이벤트 핸들러는 `handle` 접두사를 사용합니다:

```typescript
// 올바른 예시
const handleOnClick = () => { ... };
const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
const handleSubmit = () => { ... };
const handleDelete = (id: string) => { ... };

// 잘못된 예시
const onClick = () => { ... };     // handle 접두사 누락
const deleteItem = () => { ... };  // handle 접두사 누락
```

### 백엔드 명명

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 컨트롤러 함수 | C/R/U/D + 리소스명 | `CSeason`, `RSeasons`, `USeason`, `DSeason` |
| 라우트 파일 | 소문자 복수형 | `seasons.js`, `syllabuses.js` |
| 모델 파일 | PascalCase 단수형 | `Season.js`, `Syllabus.js` |
| 모델 내보내기 | PascalCase 단수형 | `export const Season = (dbName) => {...}` |
| 서비스 | camelCase | `SeasonService`, `addSeasonPermissionException` |

---

## 3. TypeScript 규칙

### 인터페이스와 타입

| 접두사 | 용도 | 예시 |
| --- | --- | --- |
| `I` | 인터페이스 | `IMyComponentProps`, `IDatabaseQuery` |
| `T` | 타입 별칭 | `TUser`, `TSeason`, `TEnrollment` |

```typescript
// 인터페이스 - I 접두사
interface IMyComponentProps {
  title: string;
  data: TSeason[];
  onSelect: (season: TSeason) => void;
}

// 타입 별칭 - T 접두사
type TUser = {
  _id: string;
  userId: string;
  userName: string;
  auth: "owner" | "admin" | "manager" | "teacher" | "student";
};

type TCurrentUser = TUser & {
  academyId: string;
  academyName: string;
  schools: Array<{
    school: string;
    schoolId: string;
    schoolName: string;
  }>;
};
```

### 타입 정의 위치

| 위치 | 용도 |
| --- | --- |
| `frontend/src/types/*.ts` | 도메인 모델 타입 (API 응답 데이터) |
| 컴포넌트 파일 내부 | 해당 컴포넌트 전용 Props/State 타입 |
| `frontend/src/global.d.ts` | 전역 타입 선언 |

### 타입 사용 예시

```typescript
// types/seasons.ts
export type TSeason = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  year: string;
  term: string;
  period: {
    start: string;
    end: string;
  };
  isActivated: boolean;
};

// 컴포넌트에서 사용
import { TSeason } from "types/seasons";

interface ISeasonListProps {
  seasons: TSeason[];
  onSelect: (season: TSeason) => void;
}

const SeasonList = ({ seasons, onSelect }: ISeasonListProps) => {
  return (
    <ul>
      {seasons.map((season) => (
        <li key={season._id} onClick={() => onSelect(season)}>
          {season.year} {season.term}
        </li>
      ))}
    </ul>
  );
};
```

---

## 4. React 컴포넌트 규칙

### 컴포넌트 선언

화살표 함수를 사용합니다:

```typescript
// 올바른 예시 - 화살표 함수
const MyComponent = ({ title, data }: IMyComponentProps) => {
  return (
    <div className={style.container}>
      <h1>{title}</h1>
    </div>
  );
};

export default MyComponent;
```

### 상태와 훅 순서

```typescript
const MyComponent = () => {
  // 1. Context 훅
  const { currentUser } = useAuth();
  const { SeasonAPI } = useAPIv2();

  // 2. State 선언
  const [seasons, setSeasons] = useState<TSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // 3. Effect 훅
  useEffect(() => {
    loadData();
  }, []);

  // 4. 이벤트 핸들러
  const handleOnClick = (season: TSeason) => {
    // ...
  };

  // 5. 데이터 로드 함수
  const loadData = async () => {
    try {
      setIsLoading(true);
      const { seasons } = await SeasonAPI.RSeasons();
      setSeasons(seasons);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. 조건부 렌더링
  if (isLoading) return <Loading />;

  // 7. JSX 반환
  return (
    <div className={style.container}>
      {/* ... */}
    </div>
  );
};
```

### 조건부 렌더링

```typescript
// 삼항 연산자 (짧은 경우)
{isActive ? <ActiveBadge /> : <InactiveBadge />}

// && 연산자 (한쪽만 렌더링)
{isPopupOpen && <MyPopup setState={setIsPopupOpen} />}

// 조기 반환 (전체 컴포넌트)
if (isLoading) return <Loading />;
if (!data) return <div>데이터가 없습니다.</div>;
```

---

## 5. SCSS 규칙

### CSS 변수 사용 필수

```scss
// 올바른 예시
.container {
  background-color: var(--background-color);
  color: var(--accent-1);
  border: var(--border-default);
  box-shadow: var(--component-box-shadow);
}

.button {
  background-color: var(--btn-color-1);
  color: var(--btn-text-color-1);

  &:hover {
    background-color: var(--background-hover-color);
  }
}

// 잘못된 예시 - 하드코딩 절대 금지
.container {
  background-color: #ffffff;
  color: black;
  border: 1px solid #e6e6e6;
}
```

### 네이밍

```scss
// 클래스명: camelCase
.container { }
.headerTitle { }
.actionButton { }
.listItem { }
.emptyMessage { }

// BEM 스타일도 허용
.card { }
.card__header { }
.card__body { }
.card--active { }
```

### 중첩과 구조

```scss
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 18px;
      font-weight: 600;
      color: var(--accent-1);
    }
  }

  .content {
    padding: 16px;
    background-color: var(--component-color);
    border-radius: 8px;
  }
}
```

---

## 6. 백엔드 JavaScript 규칙

### ES Module 사용

백엔드는 `"type": "module"`로 ES Module을 사용합니다:

```javascript
// 올바른 예시 - ES Module
import express from "express";
import { Season, School } from "../models/index.js";
export const create = async (req, res) => { ... };
export { router };

// 잘못된 예시 - CommonJS (사용 금지)
const express = require("express");
module.exports = { create };
```

> **주의**: import 경로에 `.js` 확장자를 반드시 포함해야 합니다.

### 비동기 처리

```javascript
// async/await 사용 (권장)
export const find = async (req, res) => {
  try {
    const seasons = await Season(req.user.academyId).find({});
    return res.status(200).send({ seasons });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
```

### JSDoc 주석

모든 컨트롤러 함수에 JSDoc 주석을 작성합니다:

```javascript
/**
 * @memberof APIs.SeasonAPI
 * @function CSeason API
 * @description 학기 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/seasons"} req.url
 * @param {Object} req.user - "admin"|"manager"
 * @param {Object} req.body
 * @param {string} req.body.school - ObjectId of school
 *
 * @param {Object} res
 * @param {Object} res.season - created season
 *
 * @throws {}
 * | status | message          | description             |
 * | :----- | :--------------- | :---------------------- |
 * | 400    | SCHOOL_REQUIRED  | school field is missing  |
 */
```

---

## 7. Prettier 설정

프로젝트 전체에서 Prettier를 사용하여 코드 포매팅을 통일합니다.

### 실행 방법

```bash
# 전체 코드 포매팅
yarn prettier

# 특정 파일 포매팅
npx prettier --write "src/components/MyComponent.tsx"
```

### 주요 설정

| 설정 | 값 | 설명 |
| --- | --- | --- |
| `printWidth` | 80 | 한 줄 최대 길이 |
| `tabWidth` | 2 | 탭 크기 |
| `useTabs` | false | 스페이스 사용 |
| `semi` | true | 세미콜론 사용 |
| `singleQuote` | false | 쌍따옴표 사용 |
| `trailingComma` | "es5" | ES5 호환 후행 쉼표 |

---

## 8. Linter 설정

### ESLint 실행

```bash
# 전체 파일 린팅
yarn lint

# 변경된 파일만 린팅 (Git diff 기반)
yarn linc
```

`yarn linc`는 Git에서 변경된 파일만 검사하므로 PR 전 빠른 검증에 유용합니다.

### ESLint 설정

프론트엔드는 `react-app` 프리셋을 기반으로 합니다:

```json
{
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  }
}
```

### 일반적인 린트 규칙

| 규칙 | 설명 |
| --- | --- |
| `no-unused-vars` | 사용하지 않는 변수 금지 |
| `no-console` | `console.log` 제거 (프론트엔드) |
| `react-hooks/exhaustive-deps` | 훅 의존성 배열 검사 |
| `react-hooks/rules-of-hooks` | 훅 사용 규칙 검사 |

---

## 9. 참고 자료

### Airbnb JavaScript Style Guide

프로젝트는 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)를 참고합니다. 주요 규칙:

- **const 우선**: 재할당이 필요한 경우에만 `let` 사용, `var`는 사용 금지
- **화살표 함수 선호**: 콜백 함수에 화살표 함수 사용
- **비구조화 할당**: 객체/배열에서 값을 추출할 때 사용
- **템플릿 리터럴**: 문자열 연결 대신 템플릿 리터럴 사용
- **배열 메서드**: `for` 루프 대신 `map`, `filter`, `reduce` 사용

### 코드 리뷰 체크리스트

PR을 올리기 전에 다음 항목을 확인합니다:

- [ ] `yarn lint` 또는 `yarn linc`가 통과하는가?
- [ ] `yarn prettier`로 포매팅했는가?
- [ ] 하드코딩된 색상값이 없는가? (CSS 변수 사용)
- [ ] TypeScript 타입이 정의되어 있는가?
- [ ] JSDoc 주석이 작성되어 있는가? (백엔드 컨트롤러)
- [ ] 이벤트 핸들러에 `handle` 접두사가 있는가?
- [ ] 컴포넌트 이름이 PascalCase인가?
- [ ] 불필요한 `console.log`가 남아 있지 않은가?

---

[목차로 돌아가기](./README.md)
