# Theme Settings API

사용자별 UI 테마(라이트/다크/고대비/세피아/시스템/커스텀)와 커스텀 색상 팔레트를 조회·수정합니다.

> **라우트 파일**: `backend/src/routes/themeSettings.js`  
> **컨트롤러 파일**: `backend/src/controllers/themeSettings.js`  
> **서비스**: `backend/src/services/themeSettings.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/theme-settings/settings` | 테마 설정 조회(없으면 생성) | `isLoggedIn` |
| `PUT` | `/api/theme-settings/settings` | 테마 설정 수정 | `isLoggedIn` |

---

## 조회

```
GET /api/theme-settings/settings
```

### 응답 (200)

```json
{
  "selectedTheme": "light",
  "colors": {
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "componentColor": "#f8fafc",
    "textColor": "#0f172a",
    "accentColor": "#0ea5e9",
    "successColor": "#16a34a",
    "errorColor": "#dc2626"
  }
}
```

허용 `selectedTheme`: `light` | `dark` | `high-contrast` | `sepia` | `system` | `custom`

---

## 수정

```
PUT /api/theme-settings/settings
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `selectedTheme` | `string` | X | 위 허용 값 중 하나 |
| `colors` | `object` | X | 아래 키만 갱신. 값은 `#RRGGBB` |

색상 키: `primaryColor`, `backgroundColor`, `componentColor`, `textColor`, `accentColor`, `successColor`, `errorColor`

### 요청 예시

```json
{
  "selectedTheme": "custom",
  "colors": {
    "primaryColor": "#0f766e"
  }
}
```

### 응답 (200)

수정된 `selectedTheme`와 `colors`를 반환합니다. 잘못된 테마/색상 형식이면 `400`입니다.

---

## 관련 문서

- [사용자 가이드 — 설정](../user-guide/settings.md)
- [API 개요](./overview.md)
