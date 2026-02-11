# Git Hooks

이 디렉토리는 팀원들이 공유하는 Git hooks를 포함합니다.

## 설치 방법

프로젝트를 클론한 후 다음 명령어를 실행하세요:

```bash
bash .githooks/install.sh
```

이 스크립트는 `.githooks` 폴더의 모든 hook들을 `.git/hooks`로 복사하고 실행 권한을 설정합니다.

## 포함된 Hooks

### post-checkout

브랜치 전환 시 자동으로 실행되는 hook입니다.

**기능:**
- 패키지 파일 변경사항 감지 (package.json, yarn.lock, package-lock.json)
- 변경 감지 시 자동으로 `yarn install` 실행
- 빌드 캐시 자동 정리 (node_modules/.cache, build, .cache)
- Root, Frontend, Backend 디렉토리 각각 처리

**동작 과정:**
1. 브랜치 전환 감지
2. 이전 커밋과 새 커밋 간 패키지 파일 차이 확인
3. 변경사항이 있는 경우:
   - yarn install 실행
   - 캐시 디렉토리 삭제
   - 완료 메시지 출력

**이점:**
- 브랜치 간 패키지 버전 충돌 방지
- TypeScript/Webpack 캐시 문제 자동 해결
- 수동으로 패키지 재설치할 필요 없음

## 참고사항

- Hook 설치 후 브랜치를 전환하면 자동으로 동작합니다
- 패키지 변경이 없으면 추가 작업을 수행하지 않습니다
- 캐시 정리는 자동으로 진행되지만, 개발 서버는 수동으로 재시작해야 합니다
