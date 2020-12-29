import { produce } from "immer";
import {
  createEmptyTilemap,
  getLayer,
  isLayerRegular,
  unreachable,
} from "./util";
import { Action, ActionType } from "./interfaces/action";
import { State, User } from "./interfaces/data";
import assert from "assert";

export const initialState: State = {
  world: createEmptyTilemap(100, 100),
  users: [],
};

const requireUser = (state: State, action: { userId: string }): User => {
  const user = state.users.find((u) => u.id === action.userId);
  if (!user) {
    throw new Error(`unknown user: ${action.userId}`);
  }
  return user;
};

export const reducer = (_state: State, action: Action): State =>
  produce(_state, (state) => {
    switch (action.type) {
      case ActionType.SetTile: {
        const layer = getLayer(state.world, action.layerId);
        if (!isLayerRegular(layer)) {
          throw new Error(`layer ${action.layerId} is not an ITilelayer`);
        }
        if (layer.height * layer.width < action.index) {
          throw new Error(
            `index ${action.index} is out of bounds, Layer: ${action.layerId} w: ${layer.width}, h: ${layer.height}`,
          );
        }
        // TODO: Handle case when string encoded
        (layer.data as number[])[action.index] = action.tileId;
        break;
      }
      case ActionType.SetSelection: {
        requireUser(state, action).selection = action.selection;
        break;
      }
      case ActionType.SetCursor: {
        // TODO: validate cursor (layers exist, bounds make sense)
        requireUser(state, action).cursor = action.cursor;
        break;
      }
      case ActionType.MoveCursor: {
        const cursor = requireUser(state, action).cursor;
        if (!cursor) {
          throw new Error(
            `can't move non-existent cursor for user ${action.userId}`,
          );
        }
        cursor.frame.x = action.offset.x;
        cursor.frame.y = action.offset.y;
        break;
      }
      case ActionType.SetLayerVisibility: {
        const layer = getLayer(state.world, action.layerId);
        layer.visible = action.visibility;
        break;
      }
      case ActionType.AddUser: {
        if (state.users.find((u) => u.id === action.userId)) {
          throw new Error(`user already exists: ${action.userId}`);
        }
        state.users.push({ id: action.userId });
        break;
      }
      case ActionType.RemoveUser: {
        state.users = state.users.filter((u) => u.id !== action.userId);
        break;
      }
      default:
        unreachable(action);
    }
    for (const user of state.users) {
      assert(
        !(user.cursor && user.selection),
        "Shouldn't ever have a cursor and a selection at the same time",
      );
    }
  });
