FROM node:16-alpine

# 이미지 내에서 명령어를 실행할 디렉토리 설정
RUN mkdir -p /app
WORKDIR /app

# 의존성 설치
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install

COPY ./ ./

ARG DB_URL
ARG REDIS_URL
ARG s3_accessKeyId
ARG s3_secretAccessKey
ARG s3_region
ARG s3_bucket
ARG saltRounts
ARG session_key
ARG GOOGLE_CLIENT_ID
ARG URL
ARG SERVER_PORT
ARG CLIENT_PORT

ENV DB_URL $DB_URL
ENV REDIS_URL $REDIS_URL
ENV s3_accessKeyId $s3_accessKeyId
ENV s3_secretAccessKey $s3_secretAccessKey
ENV s3_region $s3_region
ENV s3_bucket $s3_bucket 
ENV saltRounts $saltRounts
ENV session_key $session_key
ENV GOOGLE_CLIENT_ID $GOOGLE_CLIENT_ID
ENV URL $URL
ENV SERVER_PORT $SERVER_PORT
ENV CLIENT_PORT $CLIENT_PORT


#컨테이너가 켜지자마자 실행할 명령어 
CMD ["yarn", "start"]

# 이미지 생성
# docker build -t {img} .

# 컨테이너 생성 & 실행 명령어
# docker run --name {con} -p 5000:5000 -d {img}