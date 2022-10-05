FROM node:16-alpine

# 이미지 내에서 명령어를 실행할 디렉토리 설정
RUN mkdir -p /app
WORKDIR /app

# 의존성 설치
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install

COPY ./ ./


#컨테이너가 켜지자마자 실행할 명령어 
CMD ["yarn", "start"]

# 이미지 생성
# docker build -t {img} .

# 컨테이너 생성 & 실행 명령어
# docker run --name {con} -p 5000:5000 -d {img}