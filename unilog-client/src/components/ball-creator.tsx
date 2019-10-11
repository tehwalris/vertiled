import React, { useState } from "react";
import { Action, Bucket, ActionType } from "../interfaces";
import { v4 as genId } from "uuid";
import * as R from "ramda";

interface Props {
  buckets: Bucket[];
  onCreateAction: (action: Action) => void;
}

function randomColor() {
  return (
    "#" +
    R.times(
      () =>
        Math.round(Math.random() * 255)
          .toString(16)
          .padStart(2, "0"),
      3,
    ).join("")
  );
}

export const BallCreatorComponent: React.FC<Props> = ({
  buckets,
  onCreateAction,
}) => {
  const [selectedBucketId, setSelectedBucketId] = useState<string>();

  function onClick() {
    if (!selectedBucketId) {
      return;
    }
    onCreateAction({
      type: ActionType.CreateBall,
      id: genId(),
      color: randomColor(),
      bucketId: selectedBucketId,
    });
  }

  return (
    <label>
      Bucket
      <select
        value={selectedBucketId}
        onChange={ev => setSelectedBucketId(ev.target.value)}
      >
        {buckets.map(bu => (
          <option key={bu.id} value={bu.id}>
            {bu.name}
          </option>
        ))}
      </select>
      <button onClick={onClick}>Add ball</button>
    </label>
  );
};
