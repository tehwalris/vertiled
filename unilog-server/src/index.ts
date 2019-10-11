import WebSocket from "ws";
import { Action, ActionType, LogEntry } from "unilog-shared";

const LOG = [
  {
    type: ActionType.CreateBall,
    id: "1",
    color: "red",
    bucketId: "philippes-bucket",
  },
  {
    type: ActionType.CreateBall,
    id: "2",
    color: "green",
    bucketId: "philippes-bucket",
  },
  {
    type: ActionType.CreateBall,
    id: "4",
    color: "green",
    bucketId: "other-bucket",
  },
  {
    type: ActionType.CreateBall,
    id: "6",
    color: "blue",
    bucketId: "other-bucket",
  },
].map((a: Action, i): LogEntry => ({ id: i + 1, action: a }));

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", ws => {
  console.log("ws connect");

  for (const e of LOG) {
    ws.send(JSON.stringify(e));
  }

  ws.on("message", msg => {
    console.log("ws receive", msg);
  });
});
