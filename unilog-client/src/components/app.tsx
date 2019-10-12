import * as R from "ramda";
import React, { useRef, useState } from "react";
import {
  Action,
  ClientMessage,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  unreachable,
  initialState,
} from "unilog-shared";
import { useWebSocket } from "../use-web-socket";
import { BallCreatorComponent } from "./ball-creator";
import { BallMoverComponent } from "./ball-mover";
import { BucketComponent } from "./bucket";

export const AppComponent: React.FC = () => {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);

  function addToRemoteLog(entry: LogEntry) {
    setRemoteLog(old =>
      R.sortBy((e: LogEntry) => e.id, R.uniqBy(e => e.id, [...old, entry])),
    );
  }

  const wsRef = useWebSocket(["ws://localhost:8080"], _msg => {
    const msg = JSON.parse(_msg.data) as ServerMessage;
    switch (msg.type) {
      case MessageType.LogEntryServer: {
        addToRemoteLog(msg.entry);
        break;
      }
      case MessageType.RemapEntryServer: {
        setLocalLog(old => old.filter(e => e.id !== msg.oldId));
        addToRemoteLog(msg.entry);
        break;
      }
      default:
        unreachable(msg);
    }
  });

  const runAction = (a: Action) => {
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
    initialState,
  );

  return (
    <div>
      <BallCreatorComponent
        buckets={state.buckets}
        onCreateAction={runAction}
      />
      <BallMoverComponent buckets={state.buckets} onCreateAction={runAction} />
      {state.buckets.map(b => (
        <BucketComponent key={b.id} bucket={b} />
      ))}
      <div>Remote log length: {remoteLog.length}</div>
      <div>Local log length: {localLog.length}</div>
    </div>
  );
};
