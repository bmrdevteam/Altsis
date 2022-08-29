FROM node:alpine as build
RUN mkdir -p /app
WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install
COPY . .
RUN yarn build

RUN yarn global add serve

CMD PORT=3030 serve -s build