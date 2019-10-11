import WebSocket from "ws";
import {
  Action,
  ActionType,
  LogEntry,
  ServerMessage,
  MessageType,
  ClientMessage,
  unreachable,
} from "unilog-shared";

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
    const msg: ServerMessage = { type: MessageType.LogEntryServer, entry: e };
    ws.send(JSON.stringify(msg));
  }

  ws.on("message", _msg => {
    const msg: ClientMessage = JSON.parse(_msg.toString());
    switch (msg.type) {
      case MessageType.SubmitEntryClient: {
        const newEntry = { ...msg.entry, id: LOG.length + 1 };
        LOG.push(newEntry);
        const remapMsg: ServerMessage = {
          type: MessageType.RemapEntryServer,
          oldId: msg.entry.id,
          entry: newEntry,
        };
        ws.send(JSON.stringify(remapMsg));
        // TODO Notify all other clients
        break;
      }
      default:
        unreachable(msg as never); // TODO not sure why this type is not working
    }
  });
});
