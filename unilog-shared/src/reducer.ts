import { produce } from "immer";
import { unreachable } from "./util";
import * as R from "ramda";
import { Action, ActionType } from "./interfaces/action";
import { State, Bucket, Ball } from "./interfaces/data";

export const initialState: State = {
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

export const reducer = (_state: State, action: Action): State =>
  produce(_state, state => {
    const ballIds = new Set(
      R.chain(bu => bu.balls.map(ba => ba.id), state.buckets),
    );

    function getBucket(id: string): Bucket {
      const bucket = state.buckets.find(b => b.id === action.bucketId);
      if (!bucket) {
        throw new Error(`bucket with id ${action.bucketId} not found`);
      }
      return bucket;
    }

    switch (action.type) {
      case ActionType.CreateBall: {
        if (ballIds.has(action.id)) {
          throw new Error(`ball with id ${action.id} already exists`);
        }
        getBucket(action.bucketId).balls.push({
          id: action.id,
          color: action.color,
        });
        break;
      }
      case ActionType.MoveBall: {
        if (!ballIds.has(action.id)) {
          throw new Error(`ball with id ${action.id} not found`);
        }
        let ball: Ball | undefined;
        for (const bu of state.buckets) {
          ball = ball || bu.balls.find(ba => ba.id === action.id);
          bu.balls = bu.balls.filter(ba => ba.id !== action.id);
        }
        getBucket(action.bucketId).balls.push(ball!);
        break;
      }
      default:
        unreachable(action);
    }
  });
