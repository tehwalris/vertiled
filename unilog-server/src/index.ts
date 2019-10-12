import {
  Action,
  ClientMessage,
  initialState,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  State,
  unreachable,
} from "unilog-shared";
import WebSocket from "ws";
import { FAKE_ACTIONS } from "./fake";

const log: LogEntry[] = [];
const state: State = initialState;

function pushToLog(action: Action): LogEntry {
  reducer(state, action); // test if the reducer throws when the action is applied
  const newEntry: LogEntry = { id: log.length + 1, action };
  log.push(newEntry);
  return newEntry;
}

FAKE_ACTIONS.forEach(a => pushToLog(a));

const wss = new WebSocket.Server({ port: 8080, clientTracking: true });

wss.on("connection", ws => {
  console.log("ws connect");

  for (const e of log) {
    const msg: ServerMessage = { type: MessageType.LogEntryServer, entry: e };
    ws.send(JSON.stringify(msg));
  }

  ws.on("message", _msg => {
    const msg: ClientMessage = JSON.parse(_msg.toString());
    switch (msg.type) {
      case MessageType.SubmitEntryClient: {
        const newEntry = pushToLog(msg.entry.action);
        const remapMsg: ServerMessage = {
          type: MessageType.RemapEntryServer,
          oldId: msg.entry.id,
          entry: newEntry,
        };
        ws.send(JSON.stringify(remapMsg));
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
