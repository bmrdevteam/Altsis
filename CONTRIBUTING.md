# 기여하는 방법

Altsis는 [별무리학교](http://bmrschool.net)에서 만든 대안적인 학교 정보 시스템(Alternative School Information System)으로서 오픈 소스 프로젝트로 전환하여 많은 학교와 교육기관에 도움을 주고자 하고 있습니다. 이 문서를 통해 기여 절차를 명확히 안내합니다.

공식 문서는 [`documentation/INDEX.md`](./documentation/INDEX.md)에서 시작합니다.

## 행동 강령

Altsis는 [Contributor Covenant](./CODE_OF_CONDUCT.md)를 행동 강령으로 채택했으며 모든 프로젝트 참여자가 준수하기를 기대합니다. 전문을 읽고 어떤 행동이 허용되고 허용되지 않는지 이해해 주세요.

## 오픈소스

Altsis에 대한 모든 개발 작업은 GitHub([bmrdevteam/Altsis](https://github.com/bmrdevteam/Altsis))에서 이루어집니다. 코어 팀 구성원과 외부 기여자가 모두 동일한 검토 과정을 통해 풀 리퀘스트를 제출합니다.

## 유의적 버전

Altsis는 [유의적 버전](https://semver.org/lang/ko/)을 따릅니다. 중요한 버그 수정은 수 버전으로, 핵심적이지 않은 변화나 새로운 기능은 부 버전으로, 호환성이 유지되지 않는 변경은 주 버전으로 배포합니다.

모든 중요한 변화는 [releases](https://github.com/bmrdevteam/Altsis/releases)에 기록되어 있습니다.

## 브랜치 구성

모든 변화는 [dev 브랜치](https://github.com/bmrdevteam/Altsis/tree/dev)로 제출해 주세요. 개발이나 다가오는 배포를 위해 따로 브랜치를 관리하지는 않습니다.

dev에 반영된 코드는 가장 최근의 안정된 배포와 반드시 호환돼야 합니다. 추가 기능을 포함할 수 있지만, 호환되지 않는 변화는 포함되면 안 됩니다. 언제든 dev의 가장 최근 커밋으로부터 새로운 부 버전을 배포할 수 있어야 합니다.

## 버그

### 알려진 이슈는 어디서 찾아야 할까요?

공개 버그 관리에 [GitHub Issues](https://github.com/bmrdevteam/Altsis/issues)를 사용하고 있습니다. 새로운 이슈를 등록하기 전에 이미 등록된 이슈가 아닌지 확인해 주세요.

### 새로운 이슈 보고

재현 단계, 기대 동작, 실제 동작, 환경(브라우저/OS, academy 설정 등)을 가능한 한 구체적으로 적어 주세요.

## 연락 방법

도움이 필요하면 [Discussion](https://github.com/bmrdevteam/Altsis/discussions)에 의견을 게시할 수 있습니다.

## 변경 제안

Public API를 변경하거나 큰 구현을 바꾸려 할 때 [이슈](https://github.com/bmrdevteam/Altsis/issues)를 먼저 제출하길 권장합니다. 버그만 수정할 경우 곧바로 [풀 리퀘스트](https://github.com/bmrdevteam/Altsis/pulls)를 제출해도 괜찮지만, 이슈로 맥락을 남기는 것이 좋습니다.

## 첫 번째 풀 리퀘스트

풀 리퀘스트를 처음 해보시나요? [GitHub에서 오픈 소스 프로젝트에 기여하는 방법](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)을 참고할 수 있습니다.

입문용 이슈는 [Altsis Issues](https://github.com/bmrdevteam/Altsis/issues)에서 `good first issue` 등 라벨이 붙은 항목을 확인해 주세요.

이슈를 해결하려는 경우, 다른 사람이 이미 작업 중일 수 있으니 코멘트 스레드를 확인한 뒤 작업 예정이라고 남겨 주세요. 2주 이상 방치된 이슈는 다른 사람이 넘겨받아도 되지만, 그 경우에도 코멘트를 남겨야 합니다.

## 풀 리퀘스트 보내기

코어 팀은 풀 리퀘스트를 모니터링합니다. 리뷰·병합·변경 요청·종료가 있을 수 있으며, API 변경은 더 오래 걸릴 수 있습니다.

**풀 리퀘스트를 보내기 전에** 다음을 확인해 주세요.

1. [저장소](https://github.com/bmrdevteam/Altsis/tree/dev)를 포크하고 `dev`에서 새 브랜치를 만듭니다.
2. `backend`와 `frontend` 각각에서 의존성을 설치합니다 (`yarn` / `yarn install`).
3. 버그를 고치거나 테스트가 필요한 코드를 추가했다면 테스트를 추가해 주세요.
4. 관련 테스트를 실행합니다.
   - 백엔드: `cd backend && yarn test`
   - 프론트엔드: `cd frontend && yarn test --watchAll=false`
5. Prettier 등 저장소 포맷 규칙을 따릅니다.
6. 사용자·운영자·개발자에게 보이는 동작이 바뀌면 [`documentation/`](./documentation/INDEX.md)도 함께 갱신합니다 (아래「문서 기여」).

## 문서 기여

- 진입점: [`documentation/INDEX.md`](./documentation/INDEX.md)
- 기능 PR에는 가능하면 관련 사용자/관리자/API 문서를 같이 수정합니다.
- 새 `backend/src/routes/*`를 추가하면 `documentation/api-reference/`와 [API 개요](./documentation/api-reference/overview.md) 리소스 표에 반영합니다.
- 자세한 체크리스트는 [개발자 가이드](./documentation/developer-guide/README.md#문서-유지보수-체크리스트)를 참고하세요.

## 기여 선행 조건

- Node.js 20 LTS
- Yarn 3.x (프로젝트에 맞는 버전)
- Git 사용에 익숙할 것

## 스타일 가이드

[Prettier](https://prettier.io/)로 포맷합니다. 그 외 스타일은 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)와 저장소의 [코딩 스타일](./documentation/developer-guide/coding-style.md)을 참고하세요.

## 라이선스

Altsis에 기여할 때, 그 기여가 MIT 라이선스에 따라 라이선스가 부여되는 것에 동의했다고 간주합니다.
