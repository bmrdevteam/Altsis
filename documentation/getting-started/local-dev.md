# 로컬 실행 (Alter 에이전트)

클라우드 MongoDB·Redis·LLM 키 없이, 이 저장소에서 Alter **에이전트** 스킬을 끝까지 확인하는 방법입니다. 스크립트 응답은 `NODE_ENV=production` 에서는 동작하지 않습니다. 그 외에는 아카데미 `aiApiKey` 가 `scripted-local-dev` 인 경우만 에이전트 호출을 대신합니다. 같은 프로세스의 다른 아카데미에 실제 키가 있으면 그 학원은 실제 모델을 탑니다. 데모 학원은 OpenAI라서 스크립트 응답이 네이티브 `get_my_todos` 호출을 돌려줍니다. Gemini는 alter 펜스 프로토콜을 유지합니다. 실제 키로 보려면 그 학원의 `aiProvider`를 `openai` 또는 `anthropic`으로 두세요.

## English

Run Alter's agent skill locally without Atlas, Redis Cloud, or a real model key. The scripted provider never runs in production. Otherwise it answers only when that academy's `aiApiKey` is `scripted-local-dev`, so a second academy on the same process can keep a real key. The demo academy uses OpenAI, so the scripted stand-in returns a native `get_my_todos` tool call and then a plain final answer. Gemini keeps the alter fence protocol. A real key on the same process is used only for that academy: set `aiProvider` to `openai` or `anthropic`.

## 1. MongoDB and Redis

Redis:

```bash
sudo apt-get update
sudo apt-get install -y redis-server
redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --protected-mode yes
```

Ubuntu 24.04 apt does not ship MongoDB. Start a local `mongod` on port 27017 with MongoDB Memory Server (the binary stays outside the repo):

```bash
mkdir -p "$HOME/local-mongo" && cd "$HOME/local-mongo"
npm init -y
npm install mongodb-memory-server@10
node --input-type=module -e '
import { MongoMemoryServer } from "mongodb-memory-server";
const mongod = await MongoMemoryServer.create({ instance: { port: 27017, ip: "127.0.0.1" } });
console.log(mongod.getUri());
setInterval(() => {}, 1 << 30);
'
```

Leave that process running. `DB_URL` is `mongodb://127.0.0.1:27017` (no trailing database name; the app appends `/root` and `/{academy}-db`).

## 2. Env

`backend/.env` (gitignored):

```env
URL=http://localhost:3030
SERVER_PORT=8080
DB_URL=mongodb://127.0.0.1:27017
REDIS_URL=redis://127.0.0.1:6379
session_key=local-dev-session-key
GOOGLE_CLIENT_ID=local-dev.apps.googleusercontent.com
saltRounds=10
s3_region=ap-northeast-2
s3_bucket=local-profile
s3_accessKeyId=local-access
s3_secretAccessKey=local-secret
s3_bucket2=local-files
s3_accessKeyId2=local-access-2
s3_secretAccessKey2=local-secret-2
ENCKEY_E=RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=
SIGKEY_E=DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==
ENCKEY_A=RN03obPgAsUqaeCuz2dkpF37smKvADf/MWhyDhELhtQ=
SIGKEY_A=DgLeAel1//lEAMtabB2FiVII0N+d48VJ7ZFC3n2msvJ8w4TO48mTy0//gF0AX5msnzt+x1L2UJCNB2IyUFnWaw==
ALTER_AGENT_SCRIPTED_DELAY_MS=2000
```

`frontend/.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=local-dev.apps.googleusercontent.com
REACT_APP_SERVER_URL=http://localhost:8080
PORT=3030
BROWSER=none
```

시드가 데모 학원의 `aiApiKey` 를 `scripted-local-dev` 로 넣습니다. 이 값이 스크립트 응답의 스위치입니다. `ALTER_AGENT_SCRIPTED_DELAY_MS` 는 그 학원의 에이전트 호출만 늦춰 도구 단계가 화면에 남게 합니다. `0` 이면 API 확인이 바로 끝납니다.

## 3. Seed and servers

From `backend/` (dependencies already installed):

```bash
node scripts/seedLocalAgentDemo.js
NODE_ENV=development node src/index.js
```

Seed prints `seasonId` plus:

| | userId | password |
|--|--|--|
| teacher | `teacher1` | `Teacher1!` |
| student | `student1` | `Student1!` |

Academy id is `demo`. The teacher has an unsubmitted required form **출석 점검** and an unconfirmed course **문학 탐구**.

Frontend, from `frontend/`:

```bash
yarn start
```

Open `http://localhost:3030/demo/login`.

## 4. API check

```bash
SEASON=<seasonId from seed>
curl -s -c /tmp/altsis.cj -H 'Content-Type: application/json' \
  -d '{"academyId":"demo","userId":"teacher1","password":"Teacher1!"}' \
  http://localhost:8080/api/users/login/local

curl -N -b /tmp/altsis.cj -H 'Content-Type: application/json' \
  -d "{\"season\":\"$SEASON\",\"skill\":\"agent\",\"message\":\"오늘 내 할 일\",\"autoDetectSkill\":false,\"persist\":false}" \
  http://localhost:8080/api/ai/alter
```

Expect SSE events `tool` (`get_my_todos`, running then done) and `done` with the scripted final text. The same call as `student1` / `Student1!` has no tool events. The stream is an `error` event with `PERMISSION_DENIED`. Headers are flushed before the access check, so the HTTP status is 200.

In the UI, open Alter, choose **에이전트**, and send `오늘 내 할 일`. The step list shows the to-do lookup, then the scripted answer.
