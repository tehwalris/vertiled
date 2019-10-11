import WebSocket from "ws";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", ws => {
  console.log("ws connect");

  ws.on("message", msg => {
    console.log("ws receive", msg);
  });

  ws.send("something");
});
