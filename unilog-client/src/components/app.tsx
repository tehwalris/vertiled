import React, { useState } from "react";
import { State, Action, ActionType, reducer } from "unilog-shared";
import { BucketComponent } from "./bucket";
import { BallCreatorComponent } from "./ball-creator";
import { BallMoverComponent } from "./ball-mover";

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
  const [log, setLog] = useState(INITAL_LOG);
  const pushAction = (a: Action) => setLog([...log, a]);

  const state = log.reduce((a, c) => reducer(a, c), INITIAL_STATE);

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
