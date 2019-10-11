import React, { useState, useEffect, useRef } from "react";
import { State, Action, ActionType, reducer, LogEntry } from "unilog-shared";
import { BucketComponent } from "./bucket";
import { BallCreatorComponent } from "./ball-creator";
import { BallMoverComponent } from "./ball-mover";
import * as R from "ramda";

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

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = msg => {
      setRemoteLog(old =>
        R.sortBy(
          (e: LogEntry) => e.id,
          R.uniqBy(e => e.id, [...old, JSON.parse(msg.data) as LogEntry]),
        ),
      );
    };

    return () => {
      ws.close();
    };
  }, []);

  const pushAction = (a: Action) => {
    setLocalLog(old => [...old, { id: nextLocalId.current, action: a }]);
    nextLocalId.current--;
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
