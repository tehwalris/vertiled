import * as R from "ramda";
import React, { useState } from "react";
import { Action, ActionType, Bucket } from "../interfaces";

interface Props {
  buckets: Bucket[];
  onCreateAction: (action: Action) => void;
}

export const BallMoverComponent: React.FC<Props> = ({
  buckets,
  onCreateAction,
}) => {
  const [selectedBallId, setSelectedBallId] = useState<string>();
  const [selectedBucketId, setSelectedBucketId] = useState<string>();

  const balls = R.chain(bu => bu.balls, buckets);

  if (!selectedBallId && balls.length) {
    setSelectedBallId(balls[0].id);
  }
  if (!selectedBucketId && buckets.length) {
    setSelectedBucketId(buckets[0].id);
  }

  function onClick() {
    if (!selectedBallId || !selectedBucketId) {
      return;
    }
    onCreateAction({
      type: ActionType.MoveBall,
      id: selectedBallId,
      bucketId: selectedBucketId,
    });
  }

  return (
    <div>
      <label>
        Move ball
        <select
          value={selectedBallId}
          onChange={ev => setSelectedBallId(ev.target.value)}
        >
          {balls.map(ba => (
            <option key={ba.id} value={ba.id}>
              {ba.id} ({ba.color})
            </option>
          ))}
        </select>
      </label>
      <label>
        to bucket
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
      <button onClick={onClick}>Move</button>
    </div>
  );
};
