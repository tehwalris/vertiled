import {
  Action,
  ClientMessage,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "unilog-shared";
import WebSocket from "ws";
import { FAKE_ACTIONS } from "./fake";
import { readFileSync } from "fs";

const log: LogEntry[] = [];
let state: State = JSON.parse(
  readFileSync("../test-world/main.json", { encoding: "utf-8" }),
);

function pushToLog(action: Action): LogEntry {
  const nextState = reducer(state, action); // test if the reducer throws when the action is applied
  const newEntry: LogEntry = { id: log.length + 1, action };
  log.push(newEntry);
  state = nextState;
  return newEntry;
}

FAKE_ACTIONS.forEach((a) => pushToLog(a));

const wss = new WebSocket.Server({ port: 8080, clientTracking: true });

wss.on("connection", (ws) => {
  console.log("ws connect");

  function send(msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  for (const e of log) {
    const msg: ServerMessage = { type: MessageType.LogEntryServer, entry: e };
    ws.send(JSON.stringify(msg));
  }

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
        unreachable(msg as never); // TODO not sure why this type is not working
    }
  });
});
