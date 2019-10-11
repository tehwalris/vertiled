import React, { useState } from "react";
import { Action, Bucket, ActionType } from "unilog-shared";
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

  if (!selectedBucketId && buckets.length) {
    setSelectedBucketId(buckets[0].id);
  }

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
    <div>
      <label>
        Add ball to bucket
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
      </label>
      <button onClick={onClick}>Add ball</button>
    </div>
  );
};
