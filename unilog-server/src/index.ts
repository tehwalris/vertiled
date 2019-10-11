import WebSocket from "ws";
import { Action, ActionType } from "unilog-shared";

const INITAL_LOG: Action[] = [
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
];

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", ws => {
  console.log("ws connect");

  ws.on("message", msg => {
    console.log("ws receive", msg);
  });

  ws.send("something");
});
