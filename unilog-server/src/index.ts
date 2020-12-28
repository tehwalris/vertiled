import {
  Action,
  ClientMessage,
  InitialServerMessage,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "unilog-shared";
import WebSocket from "ws";
import express from "express";

import { FAKE_ACTIONS } from "./fake";
import { readFileSync } from "fs";

const app = express();
app.use(express.static("../test-world"));

const log: LogEntry[] = [];
let state: State = {
  users: [],
  world: JSON.parse(
    readFileSync("../test-world/main.json", { encoding: "utf-8" }),
  ),
};

function pushToLog(action: Action): LogEntry {
  const nextState = reducer(state, action); // test if the reducer throws when the action is applied
  const newEntry: LogEntry = { id: log.length + 1, action };
  log.push(newEntry);
  state = nextState;
  return newEntry;
}

FAKE_ACTIONS.forEach((a) => pushToLog(a));

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  console.log("ws connect");

  function send(msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  // Send initial state to
  const initMsg: InitialServerMessage = {
    type: MessageType.InitialServer,
    initialState: state,
  };
  send(initMsg);

  ws.on("message", (_msg) => {
    const msg: ClientMessage = JSON.parse(_msg.toString());
    switch (msg.type) {
      case MessageType.SubmitEntryClient: {
        let newEntry: LogEntry;
        try {
          newEntry = pushToLog(msg.entry.action);
        } catch (err) {
          send({
            type: MessageType.RejectEntryServer,
            entryId: msg.entry.id,
            error: err.toString(),
          });
          return;
        }
        send({
          type: MessageType.RemapEntryServer,
          oldId: msg.entry.id,
          entry: newEntry,
        });
        const logMsg: ServerMessage = {
          type: MessageType.LogEntryServer,
          entry: newEntry,
        };
        const logMsgString = JSON.stringify(logMsg);
        for (const otherWs of wss.clients) {
          if (otherWs !== ws) {
            otherWs.send(logMsgString);
          }
        }
        break;
      }
      default:
        unreachable(msg as never); // HACK: because this is not Union
    }
  });
});

// `server` is a vanilla Node.js HTTP server, so use
// the same ws upgrade process described here:
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
const server = app.listen(8080);
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit("connection", socket, request);
  });
});
