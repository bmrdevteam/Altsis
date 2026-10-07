# 의존 경계 기준선

`npm run lint:deps`는 아래 21건만 넘어간다. 새 위반은 실패다. 기계가 읽는 목록은 `backend/.dependency-cruiser-known-violations.json`이다. P3에서 마스킹 1건을 뺐고(24→23), P4에서 `alter/eval/serviceChecks.js` → `models/AlterSchedule.js` 1건을 뺐다(23→22), P5에서 `alter/eval/run.js` → `models/Academy.js` 1건을 뺐다(22→21). real 모드의 학원 키 조회는 `policy/access.js`의 `loadAcademyProviderSettings`다. `services/aiSafety.js`와 `services/seasonAiAccess.js`는 core·policy를 재수출만 하는 공개 경로라 `domain-not-to-alter`의 `pathNot`에 있다. 그 밖의 도메인 파일은 `alter`를 부르지 못한다.

규칙은 `backend/.dependency-cruiser.cjs`다. `core`는 다른 소스를 부르지 않는다. 도메인 `services`·`models`·`controllers`는 `tools`와 `policy`만 부른다. `tools`·`skills`·`providers`는 `agent`·`runners`를 부르지 않고, `tools`와 `providers`는 서로를 부르지 않는다. `controllers`와 Alter 밖 `services`는 `src/alter/**`와 `src/services/alter*`를 부르지 않는다. `await import()`도 포함한다.

| 파일 | 부르는 곳 | 규칙 | 제거 |
|---|---|---|---|
| `controllers/ai.js` | `services/alterAttachments.js` | domain-not-to-alter | P8 |
| `controllers/ai.js` | `services/alterConversations.js` | domain-not-to-alter | P8 |
| `controllers/ai.js` | `services/alterSearchCatalog.js` | domain-not-to-alter | P8 |
| `controllers/alterSchedule.js` | `services/alterScheduleRunner.js` | domain-not-to-alter | P8 |
| `controllers/alterSchedule.js` | `services/alterScheduleService.js` | domain-not-to-alter | P8 |
| `services/scheduler.js` | `services/alterScheduleRunner.js` | domain-not-to-alter | P8 |
| `controllers/altForms.js` | `services/alterEvent.js` | domain-not-to-alter | P9 |
| `controllers/altSheetRows.js` | `services/alterEvent.js` | domain-not-to-alter | P9 |
| `controllers/calendarEvents.js` | `services/alterEvent.js` | domain-not-to-alter | P9 |
| `controllers/chats.js` | `services/alterEvent.js` | domain-not-to-alter | P9 |
| `services/notifications.js` | `services/alterEvent.js` | domain-not-to-alter | P9 |
| `services/aiProvider.js` | `services/alterAgentScriptedProvider.js` | domain-not-to-alter | P7 |
| `services/aiSkills.js` | `services/alterAgent.js` | domain-not-to-alter | P8 |
| `services/aiSkills.js` | `services/alterSearch.js` | domain-not-to-alter | N1 |
| `services/aiSkills.js` | `services/alterAttachments.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterGuideLinks.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterGuideRetrieve.js` | domain-not-to-alter | N2 |
| `services/aiChat.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/formAiChat.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/refineAlterPrompt.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |

`core`는 `backend/src/alter/core/`에 있다. node 기본 모듈과 다른 `core` 파일만 부른다. `policy/access.js`의 `resolveAlterContext`가 접근 검사다. `policy`는 도메인 모델과 서비스를 부를 수 있다. `tools/`는 P5에서 생겼다. 등록된 도구는 도메인 서비스를 여기서만 부른다. `skills`·`providers`·`agent`·`runners` 폴더는 아직 없다.
