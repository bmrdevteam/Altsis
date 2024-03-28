# 기여하는 방법
Altsis는 [별무리학교](http://bmrschool.net)에서 만든 대안적인 학교 정보 시스템(Alternative School Infomation System)으로서 오픈 소스 프로젝트로 전환하여 많은 학교와 교육기관에 도움을 주고자 하고 있습니다. 이 프로젝트에 최대한 쉽고 간편하게 기여할 수 있도록 노력하고 있지만, 아직 부족한 상태입니다. 이 문서를 통해 여러분이 프로젝트에 기여하는 절차에 대해 명확하게 인지하고 궁금한 점들을 해결할 수 있기를 바랍니다.

## 행동 강령
Altsis은 [Contributor Covenant](https://github.com/bmrdevteam/school-information-system/blob/document/CONTRIBUTOR_COVENANT.md)를 행동 강령으로 채택했으며 모든 프로젝트 참여자가 준수하기를 기대합니다. 전문을 읽고 어떤 행동이 허용되고 허용되지 않는지 이해할 수 있습니다.

## 오픈소스
Altsis에 대한 모든 개발 작업은 GitHub에서 이루어집니다. 코어 팀 구성원과 외부 기여자가 모두 동일한 검토 과정을 통해 풀 리퀘스트를 제출합니다.

## 유의적 버전
Altsis는 [유의적 버전](https://semver.org/lang/ko/)을 따릅니다. 중요한 버그 수정은 수 버전으로, 핵심적이지 않은 변화나 새로운 기능은 부 버전으로 그리고 호환성이 유지되지 않는 변경은 주 버전으로 배포합니다. 호환성이 유지되지 않는 변경을 만들 때, 부 버전에서 사용을 권장하지 않는 주의 메세지를 통해 Altsis를 사용하는 개발자가 다가올 변화를 알아차리고 미리 코드를 변경할 수 있게 합니다.

모든 중요한 변화는 [releases](https://github.com/bmrdevteam/school-information-system/releases)에 기록되어 있습니다.

## 브랜치 구성
모든 변화는 [dev 브랜치](https://github.com/bmrdevteam/school-information-system/tree/dev)로 제출해주세요. 개발이나 다가오는 배포를 위해 따로 브랜치를 관리하지는 않습니다.

dev에 반영된 코드는 가장 최근의 안정된 배포와 반드시 호환돼야 합니다. 추가적인 기능을 포함할 수 있지만, 호환되지 않는 변화는 포함되면 안 됩니다. 언제든 dev의 가장 최근 커밋으로부터 새로운 부 버전을 배포할 수 있어야 합니다.

## 버그
###알려진 이슈는 어디서 찾아야 할까요?
공개 버그 관리에 [GitHub Issues](https://github.com/bmrdevteam/school-information-system/issues)를 사용하고 있습니다. 이슈에 주의를 기울이고 내부 수정이 진행 중이라면 이슈를 해결하려고 노력합니다. 새로운 이슈를 등록하기 전에, 이미 등록된 이슈가 아닌지 확인해주세요.

### 새로운 이슈 보고
버그가 발생하는 작은 테스트 케이스를 제공하는 게 버그를 수정하기 위한 가장 좋은 방법입니다. 이때 [JSFiddle](https://jsfiddle.net/) 템플릿이 좋은 시작점입니다.

## 연락 방법
Altsis에 대한 도움이 필요한 경우 [Discussion](https://github.com/bmrdevteam/school-information-system/discussions)을 이용하여 사용자 커뮤니티에 의견을 게시 할 수 있습니다.

## 변경 제안
Public API를 변경하거나 구현을 간단하게 변경하려 할 때 [이슈](https://github.com/bmrdevteam/school-information-system/issues)를 먼저 제출하길 권장합니다. 수정하려고 많은 노력을 기울이기 전에 제안에 대한 합의에 도달할 수 있도록 해줍니다.

버그만 수정할 경우, 곧바로 [풀 리퀘스트](https://github.com/bmrdevteam/school-information-system/pulls)를 제출해도 괜찮지만, 여전히 수정하려는 사항을 자세히 설명하는 이슈를 제출하는 것이 좋습니다. 받아들여지지 않은 특정 변화가 있지만, 이슈를 추적하기 원할 때 도움이 됩니다.

## 첫 번째 풀 리퀘스트
풀 리퀘스트를 처음 해보시나요? 무료 영상 시리즈를 통해 다음과 같이 기여하는 방법을 배울 수도 있습니다.

[GitHub에서 오픈 소스 프로젝트에 기여하는 방법](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

처음 발을 디딜 때 기여 과정에 익숙해질 수 있도록 비교적 영향력이 적은 버그를 포함하는 [good first issues](https://github.com/facebook/react/issues?q=is:open+is:issue+label:%22good+first+issue%22) 목록은 기여 입문에 최적입니다.

이슈를 해결하려는 경우, 다른 누군가 이미 수정 작업을 진행 중일 수도 있으므로 코멘트 쓰레드를 꼭 확인해 주세요. 아무도 작업하고 있지 않은 경우 다른 사람이 실수로 중복 작업을 하지 않도록 작업할 예정이라고 코멘트를 남겨주세요.

누군가 하겠다고 선언한 이슈가 2주 이상 방치된 경우 다른 사람이 넘겨받는 것은 상관없지만 그러한 경우에도 코멘트를 남겨야 합니다.

## 풀 리퀘스트 보내기
코어 팀은 풀 리퀘스트를 모니터링하고 있습니다. 여러분이 요청한 풀 리퀘스트를 리뷰, 병합, 변경 요청을 하거나 설명과 함께 풀 리퀘스트를 닫을 것입니다. Altsis 내부에서 사용법 검토가 필요한 API 변경은 시간이 더 걸릴 수 있습니다. 코어 팀은 프로세스 전반에 걸쳐 최신 정보 업데이트와 피드백을 제공하도록 최선을 다할 것입니다.

**풀 리퀘스트를 보내기 전에**, 다음 사항을 확인해 주세요.

1. [저장소](https://github.com/bmrdevteam/school-information-system/tree/dev)를 포크하고 dev로부터 새로운 브랜치를 생성합니다.
2. 저장소 루트에서 yarn 명령을 실행합니다.
3. 버그를 수정했거나 테스트가 필요한 코드를 추가했다면 테스트를 추가해 주세요.
4. 테스트가 통과하는지 확인해 주세요(yarn test). Tip : yarn test --watch TestName 명령은 개발할 때 도움이 됩니다.
5. yarn test --prod 명령을 실제 환경에서 테스트하기 위해 실행합니다.
6. 디버거가 필요한 경우 yarn debug-test --watch TestName 을 실행하고 chrome://inspect을 열어 “Inspect”를 누르세요.
7. prettier로 코드를 포맷하세요. (yarn prettier).
8. 코드를 린트하세요 (yarn lint). Tip: yarn linc 는 변경된 파일만 확인할 수 있습니다.
9. Flow 타입 검사를 실행하세요. (yarn flow).

## 기여 선행 조건
Node LTS와 Yarn이 설치되어 있어야 합니다.
Git 사용에 익숙해야 합니다.

## 개발 워크플로우
Altsis 저장소를 복사한 후 yarn 명령을 사용하면 다음과 같은 여러 명령을 실행할 수 있습니다.

## 스타일 가이드
[Prettier](https://prettier.io/)라고 불리는 자동 코드 포맷터를 사용합니다. 코드를 변경한 뒤 yarn prettier를 실행해주세요.

그러면 linter는 코드에 존재할 수 있는 문제를 잡아냅니다. 단순히 변경한 코드의 스타일을 점검하고 싶을 땐 yarn linc를 사용해주세요.

그러나, 아직 linter에서도 점검할 수 없는 스타일이 존재합니다. 모르는 것이 있다면 [Airbnb’s Style Guide](https://github.com/airbnb/javascript)에서 적절한 방법을 안내받을 수 있습니다.

## 라이선스
Altsis에 기여할 때, 여러분은 그 기여가 MIT 라이선스에 따라 라이선스가 부여되는 것에 동의했다고 간주합니다.
