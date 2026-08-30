# Goals API

홈/목표 위젯용 데이터입니다. 학교의 목표 표시 설정과 로그인한 사용자의 기록·필수 양식 진행 요약 등을 반환합니다. 수업 요약은 프론트엔드에서 목록 UI와 맞춰 계산합니다.

> **라우트 파일**: `backend/src/routes/goals.js`  
> **컨트롤러 파일**: `backend/src/controllers/goals.js`  
> **서비스**: `backend/src/services/goals.js`

---

## 엔드포인트 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/goals/me` | 내 목표/진행 요약 | `isLoggedIn` |

---

## 내 목표 조회

```
GET /api/goals/me?school=&season=
```

**권한**: `isLoggedIn`

### 쿼리

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `school` | `string` | O | 학교 ObjectId |
| `season` | `string` | X | 학기 ObjectId (역할·문맥 결정). 없으면 최근 등록 역할 사용 |

### 동작

1. 학교의 `goalsEnabled`가 `false`이면 `403`입니다.
2. 등록 역할(`teacher` / `student`)에 맞는 `goalDisplay`를 병합합니다.
3. 표시가 켜진 항목에 대해 기록(archive) 라벨별 건수, 필수 Alt Form 진행 등을 담아 반환합니다.
4. `board.submitted` / `board.total`은 **필수 양식** 제출 완료 수 / 대상 수입니다. 선택 양식은 넣지 않습니다.
5. `board.forms[]`는 양식별 진행입니다. 필수 양식은 제출 횟수 / 목표 횟수입니다. 응답자용 체크박스 칸이 2개 이상이면 필수 여부와 관계없이 **체크된 칸 / 전체 칸**으로 바꿉니다. 칸은 boolean `checkbox` 문항과 양식 도구 「체크박스」(`multiSelect` 선택지)를 합칩니다. 같은 `formId`면 체크 수 항목이 대체합니다. 마감(`closeAt`)이 지나도 체크박스 진행은 남고, 시작 전(`openAt`)이면 빠집니다.

### 응답 (200)

응답 필드는 학교 `goalDisplay` 설정에 따라 달라질 수 있습니다. 대표적인 형태:

```json
{
  "role": "student",
  "display": { },
  "archive": [
    { "label": "상담", "count": 2, "dataType": "object" }
  ],
  "board": {
    "submitted": 1,
    "total": 3,
    "forms": []
  }
}
```

### 오류

| 상태 | 조건 |
|------|------|
| `400` | `school` 누락 |
| `403` | 목표 기능 비활성 (`goalsEnabled === false`) |
| `404` | 학교 없음 |

---

## 관련 문서

- [학생 기록 API](./archives.md)
- [API 개요](./overview.md)
