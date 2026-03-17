FROM node:22-alpine

# node-gyp needs this
RUN apk update && \
    apk upgrade && \
    apk add --no-cache python3 make gcc g++

ENV NODE_ENV production

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

USER node

COPY . .

CMD npm run serve
