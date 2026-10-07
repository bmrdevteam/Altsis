# 의존 경계 기준선

`npm run lint:deps`의 알려진 위반은 0건이다. 새 위반은 실패다. 기계가 읽는 목록은 `backend/.dependency-cruiser-known-violations.json`이고 지금은 빈 배열이다. P3에서 마스킹 1건을 뺐고(24→23), P4에서 `alter/eval/serviceChecks.js` → `models/AlterSchedule.js` 1건을 뺐다(23→22), P5에서 `alter/eval/run.js` → `models/Academy.js` 1건을 뺐다(22→21). P6은 도구 힌트만 옮겼다. P7에서 `services/aiProvider.js` → `services/alterAgentScriptedProvider.js` 1건을 뺐다(21→20). P8에서 채팅 컨트롤러 3건, 예약 컨트롤러 2건, 스케줄러 1건, `aiSkills.js` → `alterAgent.js` 1건을 뺐다(20→13). P9에서 도메인이 `alterEvent.js`를 부르던 5건을 뺐다(13→8). P10은 오류 계약만 맞춰 8건을 유지했다. N1은 스킬 프레임만 추가하고 검색 import는 빼지 않아 8건을 유지했다. N2에서 그 8건을 뺐다(8→0).

N3는 읽기 도구 4개를 `tools`에서 도메인 서비스로만 불러 0건을 유지했다. 예약·이벤트도 이 도구를 고른다.

N2가 뺀 간선은 구현 파일을 다른 이름으로 바꾼 것이 아니다. `services/aiAlterPublic.js`가 `alterAttachments`, `alterCorePrompt`, `alterGuideRetrieve`, `alterGuideLinks`를 그대로 다시 내보내고, `aiSkills.js`·`aiChat.js`·`formAiChat.js`·`refineAlterPrompt.js`는 그 이음새만 부른다. `aiSafety.js`, `seasonAiAccess.js`와 같이 `domain-not-to-alter`의 `pathNot`에 있다. 검색은 에이전트와 같다. `routes/index.js`가 `school-search` 스킬 정의를 확인한 뒤 `executeSearchSkill`을 `registerAlterSearchRunner`로 연결하므로 `aiSkills.js`는 `alterSearch.js`를 import하지 않는다. HTTP 검색 응답 모양은 그대로다.

규칙은 `backend/.dependency-cruiser.cjs`다. `core`는 다른 소스를 부르지 않는다. 도메인 `services`·`models`·`controllers`는 `tools`와 `policy`만 부른다. `tools`·`skills`·`providers`는 `agent`·`runners`를 부르지 않고, `tools`와 `providers`는 서로를 부르지 않는다. `controllers`와 Alter 밖 `services`는 `src/alter/**`와 `src/services/alter*`를 부르지 않는다. `await import()`도 포함한다.

| 파일 | 부르는 곳 | 규칙 | 제거 |
|---|---|---|---|
| (없음) | | | N2에서 0건 |

`core`는 `backend/src/alter/core/`에 있다. node 기본 모듈과 다른 `core` 파일만 부른다. `policy/access.js`의 `resolveAlterContext`가 접근 검사다. `policy`는 도메인 모델과 서비스를 부를 수 있다. `tools/`는 P5에서 생겼다. 등록된 도구는 도메인 서비스를 여기서만 부른다. 이벤트 실행 문구는 `runners/event/prompt.js`다. `providers/`는 P7에서 생겼다. OpenAI·Anthropic·Gemini·scripted가 같은 `generate` 계약을 쓴다. `agent/runAlterAgent.js`와 `runners/chat`, `runners/schedule`, `runners/event`는 P8에서 생겼다. 채팅 SSE·예약 claim·이벤트 한도는 기존 서비스가 맡고, 러너는 입력을 만들어 `runAlterAgent`를 부른다. `src/events/domainEvents.js`는 P9에서 생겼다. 도메인은 이 버스로만 발행하고 `runners/event`가 구독한다. `AlterError`는 P10에서 HTTP·SSE `{ code, message }`로 맞췄다. `skills/`는 N1에서 생겼다. N2에서 `school-search`, `credit-rules`, `screen-summary`를 더했다. `runners/skill`이 그 스킬의 도구만 `runAlterAgent`에 넘긴다.
