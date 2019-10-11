import * as R from "ramda";
import React, { useEffect, useRef, useState } from "react";
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
import { BallCreatorComponent } from "./ball-creator";
import { BallMoverComponent } from "./ball-mover";
import { BucketComponent } from "./bucket";

const INITIAL_STATE: State = {
  buckets: [
    {
      id: "philippes-bucket",
      name: "Philippe's bucket",
      balls: [],
    },
    {
      id: "other-bucket",
      name: "Other bucket",
      balls: [],
    },
  ],
};

function testConnection() {
  const ws = new WebSocket("ws://localhost:8080");
  ws.onopen = () => {
    console.log("ws open");
    ws.send("bla");
  };
  ws.onmessage = msg => console.log("ws receive", msg.data);
}
testConnection();

export const AppComponent: React.FC = () => {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onmessage = _msg => {
      const msg = JSON.parse(_msg.data) as ServerMessage;
      switch (msg.type) {
        case MessageType.LogEntryServer: {
          setRemoteLog(old =>
            R.sortBy(
              (e: LogEntry) => e.id,
              R.uniqBy(e => e.id, [...old, msg.entry]),
            ),
          );
          break;
        }
        case MessageType.RemapEntryServer: {
          console.log("TODO remap");
          break;
        }
        default:
          unreachable(msg);
      }
    };

    ws.onclose = () => {
      wsRef.current = undefined;
    };

    return () => {
      ws.close();
    };
  }, []);

  const pushAction = (a: Action) => {
    if (!wsRef.current) {
      return;
    }
    const localEntry = { id: nextLocalId.current, action: a };
    setLocalLog(old => [...old, localEntry]);
    nextLocalId.current--;
    const msg: ClientMessage = {
      type: MessageType.SubmitEntryClient,
      entry: localEntry,
    };
    wsRef.current.send(JSON.stringify(msg));
  };

  const state = [...remoteLog, ...localLog].reduce(
    (a, c) => reducer(a, c.action),
    INITIAL_STATE,
  );

  return (
    <div>
      <BallCreatorComponent
        buckets={state.buckets}
        onCreateAction={pushAction}
      />
      <BallMoverComponent buckets={state.buckets} onCreateAction={pushAction} />
      {state.buckets.map(b => (
        <BucketComponent key={b.id} bucket={b} />
      ))}
    </div>
  );
};
