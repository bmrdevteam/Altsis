# 의존 경계 기준선

`npm run lint:deps`는 아래 8건만 넘어간다. 새 위반은 실패다. 기계가 읽는 목록은 `backend/.dependency-cruiser-known-violations.json`이다. P3에서 마스킹 1건을 뺐고(24→23), P4에서 `alter/eval/serviceChecks.js` → `models/AlterSchedule.js` 1건을 뺐다(23→22), P5에서 `alter/eval/run.js` → `models/Academy.js` 1건을 뺐다(22→21). P6은 도구 힌트만 옮겼다. P7에서 `services/aiProvider.js` → `services/alterAgentScriptedProvider.js` 1건을 뺐다(21→20). P8에서 채팅 컨트롤러 3건, 예약 컨트롤러 2건, 스케줄러 1건, `aiSkills.js` → `alterAgent.js` 1건을 뺐다(20→13). P9에서 도메인이 `alterEvent.js`를 부르던 5건을 뺐다(13→8). real 모드의 학원 키 조회는 `policy/access.js`의 `loadAcademyProviderSettings`다. `services/aiSafety.js`와 `services/seasonAiAccess.js`는 core·policy를 재수출만 하는 공개 경로라 `domain-not-to-alter`의 `pathNot`에 있다. 그 밖의 도메인 파일은 `alter`를 부르지 못한다.

규칙은 `backend/.dependency-cruiser.cjs`다. `core`는 다른 소스를 부르지 않는다. 도메인 `services`·`models`·`controllers`는 `tools`와 `policy`만 부른다. `tools`·`skills`·`providers`는 `agent`·`runners`를 부르지 않고, `tools`와 `providers`는 서로를 부르지 않는다. `controllers`와 Alter 밖 `services`는 `src/alter/**`와 `src/services/alter*`를 부르지 않는다. `await import()`도 포함한다.

| 파일 | 부르는 곳 | 규칙 | 제거 |
|---|---|---|---|
| `services/aiSkills.js` | `services/alterSearch.js` | domain-not-to-alter | N1 |
| `services/aiSkills.js` | `services/alterAttachments.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterGuideLinks.js` | domain-not-to-alter | N2 |
| `services/aiSkills.js` | `services/alterGuideRetrieve.js` | domain-not-to-alter | N2 |
| `services/aiChat.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/formAiChat.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |
| `services/refineAlterPrompt.js` | `services/alterCorePrompt.js` | domain-not-to-alter | N2 |

`core`는 `backend/src/alter/core/`에 있다. node 기본 모듈과 다른 `core` 파일만 부른다. `policy/access.js`의 `resolveAlterContext`가 접근 검사다. `policy`는 도메인 모델과 서비스를 부를 수 있다. `tools/`는 P5에서 생겼다. 등록된 도구는 도메인 서비스를 여기서만 부른다. 이벤트 실행 문구는 `runners/event/prompt.js`다. `providers/`는 P7에서 생겼다. OpenAI·Anthropic·Gemini·scripted가 같은 `generate` 계약을 쓴다. `agent/runAlterAgent.js`와 `runners/chat`, `runners/schedule`, `runners/event`는 P8에서 생겼다. 채팅 SSE·예약 claim·이벤트 한도는 기존 서비스가 맡고, 러너는 입력을 만들어 `runAlterAgent`를 부른다. `src/events/domainEvents.js`는 P9에서 생겼다. 도메인은 이 버스로만 발행하고 `runners/event`가 구독한다. `skills` 폴더는 아직 없다.
