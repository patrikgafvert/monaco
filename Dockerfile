ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}
RUN apk add --no-cache nodejs npm
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY ./app.js ./
COPY ./welcome.txt ./
COPY ./monaco_config.json ./
COPY ./public/style.css ./public/style.css
COPY ./public/script.js ./public/script.js
COPY ./views/index.ejs ./views/index.ejs
CMD [ "node", "app.js" ]

