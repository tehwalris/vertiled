import {
  Action,
  ActionType,
  ClientMessage,
  InitialServerMessage,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "vertiled-shared";
import WebSocket from "ws";
import express from "express";
import { v4 as genId } from "uuid";

import { FAKE_ACTIONS } from "./fake";
import { readFileSync } from "fs";
import cors from "cors";

const app = express();
app.use(cors());

app.use("/world", express.static("../test-world"));
app.use("/", express.static("../vertiled-client/build"));

const log: LogEntry[] = [];
let state: State = {
  users: [],
  world: JSON.parse(
    // TODO: validate json, write importer
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

  function sendToSelf(msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }
  function sendToOthers(msg: ServerMessage) {
    for (const otherWs of wss.clients) {
      if (otherWs !== ws) {
        otherWs.send(JSON.stringify(msg));
      }
    }
  }
  const userId = genId();
  sendToOthers({
    type: MessageType.LogEntryServer,
    entry: pushToLog({ type: ActionType.AddUser, userId }),
  });

  sendToSelf({
    type: MessageType.InitialServer,
    initialState: state,
    userId,
  });

  ws.on("close", () => {
    sendToOthers({
      type: MessageType.LogEntryServer,
      entry: pushToLog({ type: ActionType.RemoveUser, userId }),
    });
  });

  ws.on("message", (_msg) => {
    const msg: ClientMessage = JSON.parse(_msg.toString());
    console.log(msg);
    switch (msg.type) {
      case MessageType.SubmitEntryClient: {
        let newEntry: LogEntry;
        try {
          newEntry = pushToLog(msg.entry.action);
        } catch (err) {
          sendToSelf({
            type: MessageType.RejectEntryServer,
            entryId: msg.entry.id,
            error: err.toString(),
          });
          return;
        }
        sendToSelf({
          type: MessageType.RemapEntryServer,
          oldId: msg.entry.id,
          entry: newEntry,
        });
        sendToOthers({
          type: MessageType.LogEntryServer,
          entry: newEntry,
        });
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
const server = app.listen(process.env.PORT || 8088);
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit("connection", socket, request);
  });
});
