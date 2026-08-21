# 프론트엔드 개발 가이드

Altsis 프론트엔드는 **React 18 + TypeScript** 기반의 SPA(Single Page Application)입니다. 이 문서에서는 프론트엔드 개발에 필요한 핵심 개념과 패턴을 설명합니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [라우팅](#2-라우팅)
3. [컴포넌트 작성 패턴](#3-컴포넌트-작성-패턴)
4. [상태 관리](#4-상태-관리)
5. [API 호출 (useAPIv2)](#5-api-호출-useapiv2)
6. [스타일링](#6-스타일링)
7. [테마 시스템](#7-테마-시스템)
8. [주요 컴포넌트](#8-주요-컴포넌트)

---

## 1. 기술 스택

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| React | 18.3.x | UI 라이브러리 |
| TypeScript | 4.9.x | 정적 타입 검사 |
| React Router | 6.x | SPA 라우팅 |
| Zustand | 4.x | 경량 상태 관리 (에디터 스토어) |
| SCSS (Sass) | 1.83.x | CSS 전처리기 |
| Axios | 0.27.x | HTTP 요청 |
| Socket.IO Client | 4.x | 실시간 통신 |
| Lodash | 4.x | 유틸리티 함수 |
| react-cookie | 4.x | 쿠키 관리 |
| xlsx | 0.18.x | Excel 내보내기 |
| react-markdown | 8.x | 마크다운 렌더링 |

---

## 2. 라우팅

### React Router v6 기반

프론트엔드 라우팅은 `frontend/src/routes/RouterPage.tsx`에서 정의됩니다.

### URL 구조

인증된 사용자의 URL은 아카데미 ID와 학교 ID가 접두사로 포함됩니다:

```
/:academyId/:schoolId/[path]
```

예시:

| URL | 설명 |
| --- | --- |
| `/login` | 아카데미 선택 화면 |
| `/myAcademy/login` | 특정 아카데미 로그인 |
| `/register` | 회원가입 |
| `/myAcademy/mySchool/` | 홈 (**일정**) |
| `/myAcademy/mySchool/courses` | 수업 홈 (시간표·수강·개설·담당) |
| `/myAcademy/mySchool/courses/design` | 수업 개설 |
| `/myAcademy/mySchool/courses/enroll` | 수강 신청 |
| `/myAcademy/mySchool/courses/list` | 전체 목록 |
| `/myAcademy/mySchool/courses/classrooms` | 강의실 현황 |
| `/myAcademy/mySchool/docs` | 출력 문서 |
| `/myAcademy/mySchool/boards` | 보드 |
| `/myAcademy/mySchool/goals` | 목표 |
| `/myAcademy/mySchool/admin/schools/list` | 학교 관리 |
| `/myAcademy/mySchool/settings` | 설정 |
| `/guide` | 앱 안 안내 (documentation 동기화) |

### UrlContextSync

`UrlContextSync.tsx`는 URL의 `:academyId`와 `:schoolId` 파라미터를 AuthContext와 동기화하는 래퍼 컴포넌트입니다. `/:academyId/:schoolId` 하위의 모든 라우트에서 동작합니다.

### RequireAuth 래퍼

인증이 필요한 라우트는 `RequireAuth` 컴포넌트로 감싸져 있습니다:

```tsx
// 모든 인증된 사용자 허용
<RequireAuth>
  <Home />
</RequireAuth>

// 특정 권한만 허용
<RequireAuth auth={["admin", "manager"]}>
  <Admin />
</RequireAuth>

// owner 전용
<RequireAuth auth={["owner"]}>
  <Academies />
</RequireAuth>
```

`auth` prop이 없으면 로그인한 모든 사용자를 허용합니다. `auth` 배열이 있으면 해당 권한을 가진 사용자만 접근할 수 있습니다. 권한이 없는 경우 "잘못된 접근입니다." 알림과 함께 리다이렉트됩니다.

### 레거시 URL 호환

접두사 없는 레거시 URL(`/courses/*`, `/boards/*` 등)은 `LegacyRedirect` 컴포넌트를 통해 자동으로 새 URL 형식(`/:academyId/:schoolId/...`)으로 리다이렉트됩니다.

---

## 3. 컴포넌트 작성 패턴

### SCSS 모듈 사용

모든 컴포넌트는 `.module.scss` 파일을 사용하여 스타일 스코프를 분리합니다:

```tsx
// MyComponent.tsx
import style from "./myComponent.module.scss";

const MyComponent = () => {
  return (
    <div className={style.container}>
      <h1 className={style.title}>제목</h1>
      <p className={style.description}>설명</p>
    </div>
  );
};
```

```scss
// myComponent.module.scss
.container {
  padding: 24px;
  background-color: var(--background-color);
  border: var(--border-default);
}

.title {
  color: var(--accent-1);
  font-size: 18px;
}

.description {
  color: var(--accent-3);
}
```

> **중요**: 색상값은 반드시 CSS 변수를 사용합니다. `#ffffff`나 `rgb(0,0,0)` 같은 하드코딩은 금지합니다.

### 팝업 컴포넌트 패턴

팝업은 `setState` prop 패턴을 사용합니다:

```tsx
// 부모 컴포넌트
const [isPopupOpen, setIsPopupOpen] = useState(false);

return (
  <div>
    <button onClick={() => setIsPopupOpen(true)}>팝업 열기</button>
    {isPopupOpen && (
      <MyPopup
        setState={setIsPopupOpen}   // 닫기 제어
        data={someData}             // 전달 데이터
        onConfirm={handleConfirm}   // 확인 콜백
      />
    )}
  </div>
);
```

```tsx
// MyPopup.tsx
interface IMyPopupProps {
  setState: React.Dispatch<React.SetStateAction<boolean>>;
  data: SomeType;
  onConfirm: () => void;
}

const MyPopup = ({ setState, data, onConfirm }: IMyPopupProps) => {
  return (
    <div className={style.popup}>
      <div className={style.overlay} onClick={() => setState(false)} />
      <div className={style.content}>
        {/* 팝업 내용 */}
        <button onClick={() => setState(false)}>닫기</button>
        <button onClick={onConfirm}>확인</button>
      </div>
    </div>
  );
};
```

### 테이블 컴포넌트 사용

데이터 테이블은 `tableV2` 컴포넌트를 사용합니다 (구 `table`은 레거시):

```tsx
import Table from "components/tableV2/Table";

<Table
  data={dataList}
  header={[
    { text: "이름", key: "name", type: "text" },
    { text: "학년", key: "grade", type: "text" },
    { text: "상태", key: "status", type: "status" },
  ]}
  onClick={(item) => handleRowClick(item)}
/>
```

---

## 4. 상태 관리

Altsis는 여러 계층의 상태 관리를 사용합니다:

### AuthContext (useAuth)

현재 로그인한 사용자의 전체 컨텍스트를 제공합니다:

```tsx
import { useAuth } from "contexts/authContext";

const MyComponent = () => {
  const {
    currentUser,          // 현재 사용자 정보 (TCurrentUser)
    currentSchool,        // 현재 학교 정보 (TSchool)
    currentRegistration,  // 현재 학기 등록 정보 (TCurrentRegistration)
    currentSeason,        // 현재 학기 정보 (TCurrentSeason)
    changeSchool,         // 학교 전환 함수
    changeRegistration,   // 학기 전환 함수
  } = useAuth();

  // 사용 예시
  console.log(currentUser.auth);        // "admin" | "teacher" | "student" 등
  console.log(currentUser.academyId);   // 아카데미 ID
  console.log(currentSchool.schoolId);  // 학교 ID
  console.log(currentRegistration.role); // "teacher" | "student"
};
```

`AuthContext`는 앱 최상위에서 제공되며, 로그인 시 자동으로 다음을 수행합니다:
1. 사용자 정보 로드 (`UserAPI.RMySelf()`)
2. 쿠키 기반 학교 복원 (`cookies.currentSchool`)
3. 학기 등록 정보 로드
4. 학기 정보 로드

### ThemeContext (useTheme)

테마 상태를 관리합니다:

```tsx
import { useTheme } from "contexts/themeContext";

const MyComponent = () => {
  const {
    theme,           // 현재 테마 모드 ("light" | "dark" | "system" | ...)
    resolvedTheme,   // 실제 적용된 테마 ("light" | "dark" | "custom" 등)
    darkModeActive,  // 다크 모드 활성 여부
    customColors,    // 커스텀 테마 색상 객체
    setTheme,        // 테마 변경 함수
    setCustomColors, // 커스텀 색상 변경 함수
  } = useTheme();
};
```

### Zustand (에디터 스토어)

양식 에디터는 Zustand로 상태를 관리합니다:

```tsx
import { useEditorStore } from "editor/store/useEditorStore";

const EditorComponent = () => {
  const { blocks, addBlock, updateBlock, removeBlock } = useEditorStore();
  // ...
};
```

### 쿠키 (react-cookie)

세션 영속성을 위해 쿠키를 사용합니다:

```tsx
import { useCookies } from "react-cookie";

const [cookies, setCookie, removeCookie] = useCookies([
  "currentSchool",       // 현재 선택된 학교 ID
  "currentRegistration", // 현재 선택된 학기 등록 ID
]);
```

---

## 5. API 호출 (useAPIv2)

### 개요

`useAPIv2` 훅은 백엔드 API를 네임스페이스별로 구조화된 함수로 제공합니다. 내부적으로 `useDatabase` 훅의 Axios 기반 CRUD 래퍼를 사용합니다.

### 기본 사용법

```tsx
import useAPIv2 from "hooks/useAPIv2";

const MyComponent = () => {
  const {
    AcademyAPI,
    SchoolAPI,
    SeasonAPI,
    SyllabusAPI,
    EnrollmentAPI,
    RegistrationAPI,
    UserAPI,
    NotificationAPI,
    BoardAPI,
    PostAPI,
    // ...
  } = useAPIv2();

  // API 호출 예시
  const loadData = async () => {
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: { season: seasonId },
      });
      setSyllabuses(syllabuses);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };
};
```

### CRUD 명명 규칙

모든 API 함수는 일관된 명명 규칙을 따릅니다:

| 접두사 | HTTP 메서드 | 의미 | 예시 |
| --- | --- | --- | --- |
| `C` | POST | **C**reate (생성) | `CAcademy`, `CSeason`, `CSyllabus` |
| `R` | GET | **R**ead (조회) | `RAcademy`, `RSeasons`, `RSyllabus` |
| `U` | PUT | **U**pdate (수정) | `UAcademyEmail`, `USeasonPeriod` |
| `D` | DELETE | **D**elete (삭제) | `DAcademy`, `DSeason` |

단수(`RSeason`) vs 복수(`RSeasons`)로 단건/목록 조회를 구분합니다.

### API 함수 시그니처 패턴

```typescript
// 생성 (Create) - data 필수
async function CSeason(props: {
  data: {
    school: string;
    year: string;
    term: string;
    period: { start: string; end: string };
  };
}): Promise<{ season: TSeason }>

// 목록 조회 (Read List) - query 선택
async function RSeasons(props?: {
  query?: {
    school?: string;
  };
}): Promise<{ seasons: TSeason[] }>

// 단건 조회 (Read One) - params 필수
async function RSeason(props: {
  params: {
    _id: string;
  };
}): Promise<{ season: TSeason }>

// 수정 (Update) - params + data 필수
async function UAcademyEmail(props: {
  params: {
    academyId: string;
  };
  data: {
    email?: string;
  };
}): Promise<{ academy: TAcademy }>

// 삭제 (Delete) - params 필수
async function DSeason(props: {
  params: {
    _id: string;
  };
}): Promise<void>
```

### 에러 처리

`ALERT_ERROR` 유틸리티를 사용하여 사용자에게 에러 메시지를 표시합니다:

```tsx
import { ALERT_ERROR } from "hooks/useAPIv2";

try {
  await SyllabusAPI.CSyllabus({ data: syllabusData });
} catch (err) {
  ALERT_ERROR(err);
  // 또는 직접 처리
  if (err.response?.status === 409) {
    // 충돌 처리
  }
}
```

`ALERT_ERROR`는 백엔드의 메시지 코드를 한국어 메시지로 변환합니다 (`_message.ts` 매핑 사용).

### 내부 동작 원리

```
useAPIv2 (API 함수 제공)
    ↓ 호출
useDatabase (Axios CRUD 래퍼)
    ↓ HTTP 요청
    C() → axios.post(`/api/{location}`)
    R() → axios.get(`/api/{location}`)
    U() → axios.put(`/api/{location}`)
    D() → axios.delete(`/api/{location}`)
    ↓ 응답
백엔드 Express 서버
```

---

## 6. 스타일링

### SCSS 모듈

모든 컴포넌트는 `.module.scss` 파일을 사용하여 스타일 스코프를 분리합니다. 이렇게 하면 클래스명 충돌이 방지됩니다.

```scss
// component.module.scss

// 올바른 예시 - CSS 변수 사용
.container {
  background-color: var(--background-color);
  color: var(--accent-1);
  border: var(--border-default);
}

// 잘못된 예시 - 하드코딩 금지
.container {
  background-color: #ffffff;  // 사용 금지
  color: black;               // 사용 금지
  border: 1px solid #e6e6e6;  // 사용 금지
}
```

### CSS 변수 (variables.scss)

`frontend/src/style/variables.scss`에 정의된 전역 CSS 변수를 사용합니다:

| 변수 카테고리 | 예시 | 설명 |
| --- | --- | --- |
| 기본 색상 | `--primary-color`, `--primary-text-color` | 브랜드 색상 |
| 배경 | `--background-color`, `--background-hover-color` | 배경 색상 |
| 컴포넌트 | `--component-color`, `--component-hover-color` | 컴포넌트 배경 |
| 악센트 | `--accent-1` ~ `--accent-6` | 흑(1)에서 백(6)까지 6단계 |
| 테두리 | `--border-default`, `--border-default-color` | 테두리 |
| 버튼 | `--btn-color-1`, `--btn-text-color-1` | 버튼 색상 |
| 상태 | `--status-success`, `--status-error` 등 | 상태 표시 색상 |
| 캔버스 | `--canvas-color` | 에디터 캔버스 배경 |

### 전역 스타일

| 파일 | 용도 |
| --- | --- |
| `style/global.scss` | HTML 리셋, 전역 클래스 |
| `style/variables.scss` | CSS 변수 정의 (테마별 오버라이드) |
| `style/fonts.scss` | 폰트 로딩 |

---

## 7. 테마 시스템

### 프리셋 테마

총 6가지 테마 모드를 지원합니다:

| 모드 | 설명 |
| --- | --- |
| `light` | 라이트 모드 (기본값) |
| `dark` | 다크 모드 |
| `high-contrast` | 고대비 모드 |
| `sepia` | 세피아 모드 (눈 보호) |
| `system` | 시스템 설정 따름 (`prefers-color-scheme`) |
| `custom` | 사용자 정의 색상 |

### 테마 적용 방식

프리셋 테마는 `document.documentElement.dataset.theme` 속성으로 적용됩니다:

```html
<!-- 라이트 모드 -->
<html data-theme="light">

<!-- 다크 모드 -->
<html data-theme="dark">
```

SCSS에서는 `[data-theme]` 선택자로 테마별 변수를 오버라이드합니다.

### 커스텀 테마

사용자가 7가지 키 컬러를 선택하면 `themeGenerator.ts`가 50개 이상의 CSS 변수를 자동 생성합니다:

```typescript
// 7가지 키 컬러
interface CustomThemeColors {
  primaryColor: string;      // 기본 색상
  backgroundColor: string;   // 배경 색상
  componentColor: string;    // 컴포넌트 색상
  textColor: string;         // 텍스트 색상
  accentColor: string;       // 강조 색상
  successColor: string;      // 성공 상태 색상
  errorColor: string;        // 에러 상태 색상
}
```

이 7가지 색상에서 밝기/채도 변형을 자동으로 계산하여 전체 CSS 변수 세트를 생성합니다.

### 테마 저장소

테마 설정은 두 곳에 저장됩니다:

| 저장소 | 키 | 용도 |
| --- | --- | --- |
| `localStorage` | `appTheme` | 테마 모드 (빠른 로딩) |
| `localStorage` | `customThemeColors` | 커스텀 색상 (빠른 로딩) |
| 백엔드 DB | `ThemeSetting` 모델 | 기기 간 동기화 |

### 테마 API

```typescript
const { ThemeSettingsAPI } = useAPIv2();

// 테마 설정 조회
const { themeSettings } = await ThemeSettingsAPI.RThemeSettings();

// 테마 설정 업데이트
await ThemeSettingsAPI.UThemeSettings({
  data: {
    theme: "dark",
    customColors: { ... },
  },
});
```

### 시스템 테마 감지

`system` 모드에서는 `prefers-color-scheme` 미디어 쿼리를 감지하여 자동으로 라이트/다크를 전환합니다:

```typescript
// themeContext.tsx 내부
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", (e) => {
  // 시스템 테마 변경 시 자동 반영
});
```

### 테마 관련 파일

| 파일 | 역할 |
| --- | --- |
| `contexts/themeContext.tsx` | ThemeProvider, useTheme() 훅 |
| `utils/themeGenerator.ts` | 7가지 키 컬러 → 50+ CSS 변수 생성 |
| `style/variables.scss` | 테마별 CSS 변수 정의 |
| `pages/settings/tab/ThemeSettings.tsx` | 테마 설정 UI |

---

## 8. 주요 컴포넌트

### 캘린더 V2

`components/calendarV2/`에 위치한 캘린더 시스템은 월간/주간/일간 뷰를 지원합니다.

| 파일 | 역할 |
| --- | --- |
| `Calendar.tsx` | 메인 캘린더 컴포넌트 |
| `calendarData.ts` | 데이터 계층 (DateItem, EventItem, Calendar 클래스) |
| `MonthlyViewer.tsx` | 월간 뷰 |
| `WeeklyViewer.tsx` | 주간/일간 뷰 |
| `EventPopup.tsx` | 이벤트 상세 팝업 |
| `EventFormPopup.tsx` | 이벤트 생성/수정 팝업 |
| `SettingPopup.tsx` | 캘린더 설정 팝업 |

이벤트는 `sourceType`으로 출처를 구분합니다:

| sourceType | 출처 |
| --- | --- |
| `manual` | 수동 입력 |
| `enrollment` | 수강 정보 자동 동기화 |
| `syllabus` | 강의계획서 자동 동기화 |
| `memo` | 메모 자동 동기화 |

### 양식 에디터

`editor/`에 위치한 블록 기반 양식 에디터는 시간표, 강의계획서 등의 양식을 설계합니다:

| 디렉토리 | 역할 |
| --- | --- |
| `Editor.tsx` | 에디터 메인 컴포넌트 |
| `blocks/` | 에디터 블록 컴포넌트 (텍스트, 테이블, 이미지 등) |
| `store/useEditorStore.ts` | Zustand 기반 에디터 상태 관리 |
| `parser/` | 에디터 데이터 파싱 |

---

[목차로 돌아가기](./README.md)
