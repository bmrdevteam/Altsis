FROM node:20-alpine

## Timezone 설정
RUN apk add tzdata && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime

# 이미지 내에서 명령어를 실행할 디렉토리 설정
RUN mkdir -p /app
WORKDIR /app

# 의존성 설치 (Yarn classic 사용 - lockfile이 v1 형식)
COPY package*.json ./
COPY yarn.lock ./
RUN node -e "const p=require('./package.json'); delete p.packageManager; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))"
RUN yarn install

COPY ./ ./

#컨테이너가 켜지자마자 실행할 명령어
CMD ["npx", "cross-env", "NODE_ENV=production", "node", "src/index.js"]
