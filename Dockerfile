FROM node:15-alpine3.12

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY gl-tiled/package.json ./gl-tiled/
COPY vertiled-client/package.json ./vertiled-client/
COPY vertiled-server/package.json ./vertiled-server/
COPY vertiled-shared/package.json ./vertiled-shared/

RUN yarn 

COPY . .

RUN yarn workspaces run build

EXPOSE 80

WORKDIR /usr/src/app/vertiled-server

ENV PORT=80

CMD [ "node", "dist/index.js" ]



