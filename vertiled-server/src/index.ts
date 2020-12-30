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
import WebSocket, { errorMonitor } from "ws";
import express from "express";
import { v4 as genId } from "uuid";
import { readFileSync } from "fs";
import cors from "cors";
import * as R from "ramda";

interface UndoPoint {
  firstEntryId: number;
  stateBeforeEntry: State;
}

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
const undoneUndoKeys = new Set<string>();
const undoPoints = new Map<string, UndoPoint>();

function pushToLog(action: Action, undoKey: string | undefined): LogEntry {
  const nextState = reducer(state, action); // test if the reducer throws when the action is applied
  const newEntry: LogEntry = { id: log.length + 1, action, undoKey };
  log.push(newEntry);
  if (undoKey && !undoPoints.has(undoKey)) {
    undoPoints.set(undoKey, {
      firstEntryId: newEntry.id,
      stateBeforeEntry: state,
    });
  }
  state = nextState;
  return newEntry;
}

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
    entry: pushToLog({ type: ActionType.AddUser, userId }, undefined),
  });

  sendToSelf({
    type: MessageType.InitialServer,
    initialState: state,
    userId,
  });

  ws.on("close", () => {
    sendToOthers({
      type: MessageType.LogEntryServer,
      entry: pushToLog({ type: ActionType.RemoveUser, userId }, undefined),
    });
  });

  ws.on("message", (_msg) => {
    const msg: ClientMessage = JSON.parse(_msg.toString());
    console.log(msg);
    switch (msg.type) {
      case MessageType.SubmitEntryClient: {
        let newEntry: LogEntry;
        try {
          newEntry = pushToLog(msg.entry.action, msg.entry.undoKey);
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
      case MessageType.RequestUndoClient: {
        if (undoneUndoKeys.has(msg.undoKey)) {
          console.warn(`${msg.undoKey} has already been undone`);
          return;
        }
        const undoPoint = undoPoints.get(msg.undoKey);
        if (!undoPoint) {
          console.warn(
            `${msg.undoKey} ocurred too long ago to be undone (or never ocurred)`,
          );
          return;
        }

        undoneUndoKeys.add(msg.undoKey);

        state = undoPoint.stateBeforeEntry;
        for (let i = undoPoint.firstEntryId - 1; i < log.length; i++) {
          const logEntry = log[i];

          if (logEntry.undoKey) {
            const oldUndoPoint = undoPoints.get(logEntry.undoKey);
            if (!oldUndoPoint) {
              throw new Error("expected undo point to exist");
            }
            if (oldUndoPoint.firstEntryId === logEntry.id) {
              undoPoints.set(logEntry.undoKey, {
                ...oldUndoPoint,
                stateBeforeEntry: state,
              });
            }
          }

          if (logEntry.undoKey && undoneUndoKeys.has(logEntry.undoKey)) {
            continue;
          }

          try {
            state = reducer(state, logEntry.action);
          } catch (err) {
            console.warn(
              `action from entry ${logEntry.id} failed after undo: ${err}`,
            );
          }
        }

        const finalLogEntry = R.last(log);
        if (!finalLogEntry) {
          throw new Error("unexpected empty log");
        }

        const outMsg: ServerMessage = {
          type: MessageType.ReportUndoServer,
          undoKey: msg.undoKey,
          finalEntryId: finalLogEntry.id,
          finalState: state,
        };
        sendToSelf(outMsg);
        sendToOthers(outMsg);

        break;
      }
      default:
        unreachable(msg);
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
