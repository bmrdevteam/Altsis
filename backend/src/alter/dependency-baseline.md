# 의존 경계 기준선

`npm run lint:deps`는 아래 23건만 넘어간다. 새 위반은 실패다. 기계가 읽는 목록은 `backend/.dependency-cruiser-known-violations.json`이다. P3에서 `alter/eval/run.js` → `services/aiSafety.js` 1건을 뺐다(24→23). `services/aiSafety.js`는 `alter/core/safety.js` 재수출만 하는 기존 공개 경로라 `domain-not-to-alter`의 `pathNot`에 있다. 그 밖의 도메인 파일은 `alter`를 부르지 못한다.

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
| `alter/eval/run.js` | `models/Academy.js` | only-tools-and-policy-touch-domain | P7 |
| `alter/eval/serviceChecks.js` | `models/AlterSchedule.js` | only-tools-and-policy-touch-domain | P4 |

`core`는 `backend/src/alter/core/`에 있다. node 기본 모듈과 다른 `core` 파일만 부른다. `tools`·`skills`·`providers`·`agent`·`runners` 폴더는 아직 없다. 그 규칙을 깨는 현재 위반은 0건이고, 폴더가 생기는 이전 PR부터 적용된다.
