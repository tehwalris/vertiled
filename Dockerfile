FROM node:14

WORKDIR /usr/src/app

COPY package.json yarn.lock ./
COPY gl-tiled/package.json ./gl-tiled/
COPY unilog-client/package.json ./unilog-client/
COPY unilog-server/package.json ./unilog-server/
COPY unilog-shared/package.json ./unilog-shared/


RUN yarn 

COPY . .

RUN yarn workspaces run build

EXPOSE 80

WORKDIR /usr/src/app/unilog-server

ENV PORT=80

CMD [ "node", "dist/index.js" ]



