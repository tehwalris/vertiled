import React from "react";
import { State } from "../interfaces";
import { BucketComponent } from "./bucket";

const FAKE_STATE: State = {
  buckets: [
    {
      id: "philippes-bucket",
      name: "Philippe's bucket",
      balls: [{ id: "1", color: "red" }, { id: "2", color: "green" }],
    },
    {
      id: "other-bucket",
      name: "Other bucket",
      balls: [{ id: "4", color: "green" }, { id: "6", color: "blue" }],
    },
  ],
};

export const AppComponent: React.FC = () => (
  <div>
    {FAKE_STATE.buckets.map(b => (
      <BucketComponent key={b.id} bucket={b} />
    ))}
  </div>
);
